const CACHE_NAME = 'berbagi-cerita-v1';
const API_CACHE = 'api-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';
const API_URL = 'https://story-api.dicoding.dev/v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/app.bundle.js',
  '/manifest.json'
];

const optionalAssets = [
  '/images/icon-192.png',
  '/images/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// INSTALL SERVICE WORKER
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[SW] Critical assets cached');
            return Promise.allSettled(
              optionalAssets.map(url => {
                return cache.add(url).catch(err => {
                  console.warn('[SW] Failed to cache optional asset:', url, err);
                });
              })
            );
          })
          .then(() => {
            console.log('[SW] Optional assets cached');
          });
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// ACTIVATE SERVICE WORKER
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        return self.clients.claim();
      })
  );
});

// FETCH STRATEGIES
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // ========== API REQUESTS - Network First ==========
  if (url.origin === new URL(API_URL).origin) {
  // Untuk GET requests (Ambil Cerita/Login): Gunakan Network First dengan Fallback Cache
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Caching hanya untuk respons 200 OK
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.log('[SW] API GET failed, trying cache:', error);
          // Fallback ke cache jika gagal/offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({ error: true, message: 'Offline - data not cached' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
  } else {
    // Untuk non-GET requests (POST, PUT, DELETE): Gunakan Network Only
    // Ini mencegah SW mengintervensi method yang tidak boleh di-cache atau dibaca offline.
    event.respondWith(
      fetch(request).catch(() => {
        // Hanya tampilkan pesan error generik untuk operasi yang gagal saat offline
        return new Response(
          JSON.stringify({ error: true, message: 'Cannot perform this action offline' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
  }
  return;
}

  // ========== IMAGE CACHING - Cache First ==========
  if (request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Image from cache:', url.pathname);
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (response && response.ok) {
                const responseClone = response.clone();
                caches.open(IMAGE_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                  console.log('[SW] Image cached:', url.pathname);
                });
              }
              return response;
            })
            .catch(() => {
              return new Response(
                '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="16">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }

  // ========== STATIC ASSETS - Cache First ==========
  // ✅ SKIP non-GET requests untuk static assets juga
  if (request.method !== 'GET') {
    return; // Let browser handle non-GET requests normally
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type !== 'error') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed:', request.url, error);
            
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncPendingStories());
  }
});

async function syncPendingStories() {
  console.log('[SW] Starting background sync...');
  
  try {
    const db = await openDB();
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const pendingStories = await getAllFromStore(store);
    
    console.log('[SW] Found pending stories:', pendingStories.length);
    
    if (pendingStories.length === 0) {
      console.log('[SW] No pending stories to sync');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const story of pendingStories) {
      try {
        await uploadStory(story);
        
        const deleteTx = db.transaction('pending', 'readwrite');
        const deleteStore = deleteTx.objectStore('pending');
        await deleteStore.delete(story.id);
        await waitForTransaction(deleteTx);
        
        successCount++;
        console.log('[SW] Story uploaded successfully:', story.id);
        
      } catch (error) {
        failCount++;
        console.error('[SW] Upload error for story:', story.id, error);
      }
    }
    
    console.log(`[SW] Sync complete: ${successCount} success, ${failCount} failed`);
    
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        successCount,
        failCount,
        totalCount: pendingStories.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

async function uploadStory(story) {
  console.log('[SW] Uploading story:', story.id);
  
  const formData = new FormData();
  formData.append('description', story.description);
  formData.append('lat', story.lat);
  formData.append('lon', story.lon);
  
  if (story.photo) {
    let photoBlob;
    
    if (story.photo instanceof Blob) {
      photoBlob = story.photo;
    } else if (typeof story.photo === 'string') {
      photoBlob = await base64ToBlob(story.photo);
    }
    
    if (photoBlob) {
      formData.append('photo', photoBlob, 'photo.jpg');
    }
  }

  const response = await fetch(`${API_URL}/stories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${story.token}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Upload failed: ${response.status}`);
  }

  return await response.json();
}

// MANUAL SYNC TRIGGER
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(
      syncPendingStories()
        .then(() => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        })
        .catch((error) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: error.message });
          }
        })
    );
  }
  
  if (event.data && event.data.type === 'MANAGE_CACHE') {
    event.waitUntil(manageImageCache());
  }
});

// PUSH NOTIFICATION
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Berbagi Cerita',
    body: 'Ada cerita baru!',
    icon: '/images/icon-192.png',
    badge: '/images/icon-96.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: {
          url: payload.url || '/',
          storyId: payload.storyId
        }
      };
    } catch (e) {
      console.log('[SW] Using text data:', event.data.text());
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: [
      { action: 'view', title: 'Lihat Cerita' },
      { action: 'close', title: 'Tutup' }
    ],
    vibrate: [200, 100, 200],
    tag: 'story-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// HELPER FUNCTIONS

async function base64ToBlob(base64String) {
  try {
    if (base64String.startsWith('data:')) {
      const response = await fetch(base64String);
      return await response.blob();
    }
    
    const parts = base64String.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  } catch (error) {
    console.error('[SW] base64ToBlob error:', error);
    throw error;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('berbagi-cerita-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached-stories')) {
        db.createObjectStore('cached-stories', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function manageImageCache() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate();
      const percentUsed = (usage / quota) * 100;
      
      console.log(`[SW] Cache usage: ${percentUsed.toFixed(2)}%`);
      
      if (percentUsed > 80) {
        console.log('[SW] Cache nearly full, cleaning old images...');
        const imageCache = await caches.open(IMAGE_CACHE);
        const requests = await imageCache.keys();
        
        const toDelete = Math.floor(requests.length * 0.2);
        for (let i = 0; i < toDelete; i++) {
          await imageCache.delete(requests[i]);
        }
        
        console.log(`[SW] Deleted ${toDelete} old images`);
      }
    }
  } catch (error) {
    console.error('[SW] Cache management error:', error);
  }
}