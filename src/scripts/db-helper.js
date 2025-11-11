const DB_NAME = 'berbagi-cerita-db';
const DB_VERSION = 1;

class DBHelper {
  constructor() {
    this.db = null;
  }

  openDB() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store untuk favorit stories
        if (!db.objectStoreNames.contains('favorites')) {
          const favStore = db.createObjectStore('favorites', { keyPath: 'id' });
          favStore.createIndex('createdAt', 'createdAt', { unique: false });
          favStore.createIndex('favoritedAt', 'favoritedAt', { unique: false });
        }

        // Store untuk pending stories (offline sync)
        // PENTING: Gunakan nama 'pending' agar konsisten dengan sw.js
        if (!db.objectStoreNames.contains('pending')) {
          const pendingStore = db.createObjectStore('pending', { 
            keyPath: 'id'
          });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store untuk cached stories
        if (!db.objectStoreNames.contains('cached-stories')) {
          const cacheStore = db.createObjectStore('cached-stories', { keyPath: 'id' });
          cacheStore.createIndex('name', 'name', { unique: false });
          cacheStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // === FAVORITES OPERATIONS ===
  
  async addFavorite(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      
      const favoriteStory = {
        ...story,
        favoritedAt: new Date().toISOString()
      };
      
      const request = store.add(favoriteStory);
      
      request.onsuccess = () => {
        console.log('[DBHelper] Favorite added:', story.id);
        resolve(favoriteStory);
      };
      request.onerror = () => {
        console.error('[DBHelper] Add favorite error:', request.error);
        reject(new Error('Failed to add favorite'));
      };
    });
  }

  async getAllFavorites() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readonly');
      const store = tx.objectStore('favorites');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('[DBHelper] Retrieved favorites:', request.result.length);
        resolve(request.result);
      };
      request.onerror = () => reject(new Error('Failed to get favorites'));
    });
  }

  async getFavoriteById(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readonly');
      const store = tx.objectStore('favorites');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get favorite'));
    });
  }

  async deleteFavorite(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('[DBHelper] Favorite deleted:', id);
        resolve(true);
      };
      request.onerror = () => reject(new Error('Failed to delete favorite'));
    });
  }

  async isFavorite(id) {
    const favorite = await this.getFavoriteById(id);
    return !!favorite;
  }

  async searchFavorites(query) {
    const favorites = await this.getAllFavorites();
    const lowerQuery = query.toLowerCase();
    
    return favorites.filter(story => 
      story.name.toLowerCase().includes(lowerQuery) ||
      story.description.toLowerCase().includes(lowerQuery)
    );
  }

  async sortFavorites(sortBy = 'createdAt', order = 'desc') {
    const favorites = await this.getAllFavorites();
    
    return favorites.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === 'favoritedAt') {
        comparison = new Date(a.favoritedAt) - new Date(b.favoritedAt);
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
  }

  // === PENDING STORIES (OFFLINE SYNC) ===
  // UPDATED: Menggunakan store name 'pending' agar konsisten dengan sw.js
  
  async addPendingStory(storyData) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      
      // Generate unique ID
      const uniqueId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const pendingStory = {
        id: uniqueId,
        ...storyData,
        timestamp: Date.now(),
        synced: false
      };
      
      const request = store.add(pendingStory);
      
      request.onsuccess = () => {
        console.log('[DBHelper] Story saved for offline sync:', uniqueId);
        
        // Register background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('sync-stories');
          }).then(() => {
            console.log('[DBHelper] Background sync registered');
          }).catch(err => {
            console.error('[DBHelper] Background sync registration failed:', err);
          });
        } else {
          console.log('[DBHelper] Background sync not supported, will sync on next online event');
        }
        
        resolve(pendingStory);
      };
      
      request.onerror = () => {
        console.error('[DBHelper] Failed to save pending story:', request.error);
        reject(new Error('Failed to save pending story'));
      };
    });
  }

  async getAllPendingStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const stories = request.result || [];
        console.log('[DBHelper] Retrieved pending stories:', stories.length);
        resolve(stories);
      };
      request.onerror = () => {
        console.error('[DBHelper] Get pending stories error:', request.error);
        reject(new Error('Failed to get pending stories'));
      };
    });
  }

  async getPendingStoryById(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get pending story'));
    });
  }

  async deletePendingStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('[DBHelper] Pending story deleted:', id);
        resolve(true);
      };
      request.onerror = () => {
        console.error('[DBHelper] Delete pending story error:', request.error);
        reject(new Error('Failed to delete pending story'));
      };
    });
  }

  async clearPendingStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('[DBHelper] All pending stories cleared');
        resolve(true);
      };
      request.onerror = () => reject(new Error('Failed to clear pending stories'));
    });
  }

  // === CACHED STORIES ===
  
  async cacheStories(stories) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached-stories', 'readwrite');
      const store = tx.objectStore('cached-stories');
      
      // Clear old cache
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add new stories
        let successCount = 0;
        
        stories.forEach(story => {
          const addRequest = store.add(story);
          addRequest.onsuccess = () => {
            successCount++;
            if (successCount === stories.length) {
              console.log('[DBHelper] Cached stories:', successCount);
            }
          };
        });
      };
      
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('[DBHelper] Cache stories error:', tx.error);
        reject(new Error('Failed to cache stories'));
      };
    });
  }

  async getCachedStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached-stories', 'readonly');
      const store = tx.objectStore('cached-stories');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('[DBHelper] Retrieved cached stories:', request.result.length);
        resolve(request.result);
      };
      request.onerror = () => reject(new Error('Failed to get cached stories'));
    });
  }

  async clearAllData() {
    const db = await this.openDB();
    const stores = ['favorites', 'pending', 'cached-stories'];
    
    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log(`[DBHelper] Cleared ${storeName}`);
          resolve();
        };
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    });
    
    return Promise.all(promises);
  }

  // === HELPER METHODS ===

  waitForTransaction(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Alias untuk compatibility dengan nama lama (jika ada kode yang masih pakai)
  async getPending() {
    return this.getAllPendingStories();
  }
}

export default new DBHelper();