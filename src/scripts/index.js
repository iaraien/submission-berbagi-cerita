import '../styles/styles.css';
import DBHelper from './db-helper.js';
import PushHelper from './push-helper.js';

const API_BASE_URL = 'https://story-api.dicoding.dev/v1';
let authToken = null;
let map = null;
let markers = [];
let currentPage = 'home';

// ===== UTILITY FUNCTIONS =====

const showLoading = (show = true) => {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
};

const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

const checkOnlineStatus = () => {
  return navigator.onLine;
};

// ===== API FUNCTIONS =====

const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }
    
    authToken = data.loginResult.token;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userName', data.loginResult.name);
    
    return data.loginResult;
  } catch (error) {
    throw error;
  }
};

const register = async (name, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

const getStories = async (location = 1) => {
  try {
    if (!authToken) throw new Error('Token tidak ditemukan. Silakan login ulang.');

    const response = await fetch(`${API_BASE_URL}/stories?location=${location}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    // Debug info
    console.log('Response status:', response.status);

    // Cegah parsing HTML
    if (!response.ok) {
      const text = await response.text();
      console.error('Server Response:', text);
      throw new Error(`Gagal memuat cerita (${response.status})`);
    }

    const data = await response.json();

    if (data.error) throw new Error(data.message || 'Gagal memuat cerita');

    console.log('Stories loaded:', data.listStory?.length || 0);

    if (typeof DBHelper !== 'undefined') {
      await DBHelper.cacheStories(data.listStory);
    }

    return data.listStory;
  } catch (error) {
    console.error('getStories error:', error);

    if (!checkOnlineStatus() && typeof DBHelper !== 'undefined') {
      console.log('Offline: Loading cached stories');
      const cachedStories = await DBHelper.getCachedStories();
      if (cachedStories.length > 0) {
        showNotification('Menampilkan data dari cache (offline)', 'warning');
        return cachedStories;
      }
    }

    throw error;
  }
};

const addStory = async (description, photo, lat, lon) => {
  try {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('lat', lat);
    formData.append('lon', lon);
    
    if (photo) {
      formData.append('photo', photo);
    }
    
    // Check if online
    if (!checkOnlineStatus()) {
      // Save for later sync
      await DBHelper.addPendingStory({
        description,
        photo,
        lat,
        lon,
        token: authToken
      });
      
      showNotification('Story disimpan dan akan diupload saat online', 'info');
      return { offline: true };
    }
    
    const response = await fetch(`${API_BASE_URL}/stories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// ===== UI RENDERING =====

const renderLoginPage = () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Berbagi Cerita</h1>
        <p class="subtitle">Bagikan pengalaman Anda dengan dunia</p>
        
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              autocomplete="email"
              aria-required="true"
              placeholder="nama@email.com"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              autocomplete="current-password"
              aria-required="true"
              minlength="8"
              placeholder="Minimal 8 karakter"
            >
          </div>
          
          <button type="submit" class="btn btn-primary">
            Masuk
          </button>
        </form>
        
        <div class="auth-switch">
          <p>Belum punya akun? <button id="switchToRegister" class="link-button">Daftar di sini</button></p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('switchToRegister').addEventListener('click', renderRegisterPage);
};

const renderRegisterPage = () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Daftar Akun</h1>
        <p class="subtitle">Buat akun untuk mulai berbagi cerita</p>
        
        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label for="name">Nama Lengkap</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              autocomplete="name"
              aria-required="true"
              placeholder="Nama Anda"
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              autocomplete="email"
              aria-required="true"
              placeholder="nama@email.com"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              autocomplete="new-password"
              aria-required="true"
              minlength="8"
              placeholder="Minimal 8 karakter"
            >
          </div>
          
          <button type="submit" class="btn btn-primary">
            Daftar
          </button>
        </form>
        
        <div class="auth-switch">
          <p>Sudah punya akun? <button id="switchToLogin" class="link-button">Masuk di sini</button></p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('switchToLogin').addEventListener('click', renderLoginPage);
};

const renderMainPage = () => {
  const userName = localStorage.getItem('userName') || 'User';
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <header class="app-header">
      <div class="container">
        <h1>Berbagi Cerita</h1>
        <div class="header-actions">
          <span class="user-name">Halo, ${userName}</span>
          <button id="notifToggle" class="btn btn-icon" aria-label="Toggle Notifikasi" title="Notifikasi">
            <span id="notifIcon">🔕</span>
          </button>
          <button id="logoutBtn" class="btn btn-secondary">Keluar</button>
        </div>
      </div>
    </header>
    
    <nav class="app-nav" role="navigation" aria-label="Main navigation">
      <div class="container">
        <button id="navHome" class="nav-item active" data-page="home">
          <span aria-hidden="true">📝</span> Cerita
        </button>
        <button id="navMap" class="nav-item" data-page="map">
          <span aria-hidden="true">🗺️</span> Peta
        </button>
        <button id="navFavorites" class="nav-item" data-page="favorites">
          <span aria-hidden="true">⭐</span> Favorit
        </button>
        <button id="navAdd" class="nav-item" data-page="add">
          <span aria-hidden="true">➕</span> Tambah
        </button>
      </div>
    </nav>
    
    <main class="app-main">
      <div class="container" id="mainContent">
        <!-- Content will be loaded here -->
      </div>
    </main>
    
    <div id="loading" class="loading" style="display: none;">
      <div class="spinner"></div>
      <p>Memuat...</p>
    </div>
  `;
  
  // Event listeners
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('notifToggle').addEventListener('click', handleNotificationToggle);
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = e.currentTarget.dataset.page;
      navigateTo(page);
    });
  });
  
  // Load home page by default
  navigateTo('home');
  
  // Initialize push notification status - LOAD FROM LOCALSTORAGE
  //loadNotificationStatus();
};

const renderStoriesPage = async () => {
  const content = document.getElementById('mainContent');
  
  // Pastikan element ada
  if (!content) {
    console.error('mainContent element not found!');
    showLoading(false); // Hide loading
    return;
  }
  
  content.innerHTML = `
    <div class="page-header">
      <h2>Daftar Cerita</h2>
      <div class="search-box">
        <input 
          type="search" 
          id="searchStories" 
          placeholder="Cari cerita..." 
          aria-label="Cari cerita"
        >
      </div>
    </div>
    <div id="storiesList" class="stories-grid">
      <p>Memuat cerita...</p>
    </div>
  `;
  
  try {
    showLoading(true);
    const stories = await getStories(1);
    displayStories(stories);
    
    // Search functionality
    const searchInput = document.getElementById('searchStories');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = stories.filter(story => 
          story.name.toLowerCase().includes(query) ||
          story.description.toLowerCase().includes(query)
        );
        displayStories(filtered);
      });
    }
  } catch (error) {
    console.error('Error loading stories:', error);
    const storiesList = document.getElementById('storiesList');
    if (storiesList) {
      storiesList.innerHTML = `
        <div class="error">
          <p>Gagal memuat cerita: ${error.message}</p>
          <button onclick="location.reload()" class="btn btn-primary">Coba Lagi</button>
        </div>
      `;
    }
  } finally {
    showLoading(false); // PENTING: Selalu hide loading
  }
};

// ===== IMPROVED FAVORITE SYSTEM =====

const displayStories = async (stories) => {
  const storiesList = document.getElementById('storiesList');
  
  if (!storiesList) {
    console.error('storiesList element not found');
    return;
  }
  
  if (!stories || stories.length === 0) {
    storiesList.innerHTML = '<p class="empty-state">Tidak ada cerita ditemukan</p>';
    return;
  }
  
  // Check which stories are favorited (jika DBHelper tersedia)
  let favoritedIds = [];
  if (typeof DBHelper !== 'undefined') {
    try {
      const favorites = await DBHelper.getAllFavorites();
      favoritedIds = favorites.map(f => f.id);
    } catch (error) {
      console.log('Could not load favorites:', error);
    }
  }
  
  storiesList.innerHTML = stories.map(story => {
    const isFavorited = favoritedIds.includes(story.id);
    return `
      <article class="story-card">
        <img 
          src="${story.photoUrl}" 
          alt="Foto cerita ${story.name}"
          class="story-image"
          loading="lazy"
        >
        <div class="story-content">
          <h3>${story.name}</h3>
          <p class="story-description">${story.description}</p>
          <div class="story-meta">
            <span class="story-date">${new Date(story.createdAt).toLocaleDateString('id-ID')}</span>
            <button 
              class="btn-favorite ${isFavorited ? 'favorited' : ''}" 
              data-story='${JSON.stringify(story).replace(/'/g, "&apos;")}'
              aria-label="${isFavorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
              title="${isFavorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
            >
              ${isFavorited ? '⭐' : '☆'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  // Add favorite button listeners
  storiesList.querySelectorAll('.btn-favorite').forEach(btn => {
    btn.addEventListener('click', handleFavoriteToggle);
  });
};

const handleFavoriteToggle = async (event) => {
  const button = event.currentTarget;
  const story = JSON.parse(button.dataset.story);
  const isFavorited = button.classList.contains('favorited');
  
  // Check if DBHelper available
  if (typeof DBHelper === 'undefined') {
    showNotification('Fitur favorit belum tersedia (DBHelper not loaded)', 'warning');
    return;
  }
  
  try {
    if (isFavorited) {
      // Remove from favorites
      await DBHelper.deleteFavorite(story.id);
      button.classList.remove('favorited');
      button.textContent = '☆';
      button.setAttribute('aria-label', 'Tambah ke favorit');
      button.setAttribute('title', 'Tambah ke favorit');
      showNotification('Dihapus dari favorit', 'info');
    } else {
      // Add to favorites
      await DBHelper.addFavorite(story);
      button.classList.add('favorited');
      button.textContent = '⭐';
      button.setAttribute('aria-label', 'Hapus dari favorit');
      button.setAttribute('title', 'Hapus dari favorit');
      showNotification('Ditambahkan ke favorit!', 'success');
    }
  } catch (error) {
    console.error('Favorite toggle error:', error);
    showNotification(`Gagal: ${error.message}`, 'error');
  }
};

// BAGIAN 2: MAP, FAVORITES, ADD STORY, dan EVENT HANDLERS

const renderMapPage = async () => {
  const content = document.getElementById('mainContent');
  
  // Check if offline
  if (!checkOnlineStatus()) {
    content.innerHTML = `
      <div class="page-header">
        <h2>Peta Cerita</h2>
        <p>Lihat lokasi semua cerita di peta</p>
      </div>
      <div class="offline-map-notice">
        <div class="offline-icon">🗺️</div>
        <h3>Peta Tidak Tersedia Offline</h3>
        <p>Peta memerlukan koneksi internet untuk menampilkan tile dari OpenStreetMap.</p>
        <p><strong>Alternatif:</strong> Koordinat lokasi tetap tersimpan dan akan ditampilkan saat online.</p>
        <button onclick="location.reload()" class="btn btn-primary">
          🔄 Coba Lagi
        </button>
      </div>
    `;
    return;
  }
  
  content.innerHTML = `
    <div class="page-header">
      <h2>Peta Cerita</h2>
      <p>Lihat lokasi semua cerita di peta</p>
    </div>
    <div id="map" style="height: 600px; border-radius: 8px;"></div>
  `;
  
  try {
    showLoading(true);
    const stories = await getStories(1);
    initializeMap(stories);
  } catch (error) {
    content.innerHTML += `<p class="error">Gagal memuat peta: ${error.message}</p>`;
  } finally {
    showLoading(false);
  }
};

const initializeMap = (stories) => {
  // Clear existing map
  if (map) {
    map.remove();
  }
  
  // Initialize Leaflet map
  map = L.map('map').setView([-2.5, 118], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Clear markers
  markers.forEach(marker => marker.remove());
  markers = [];
  
  // Add markers for each story
  stories.forEach(story => {
    if (story.lat && story.lon) {
      const marker = L.marker([story.lat, story.lon]).addTo(map);
      
      marker.bindPopup(`
        <div class="map-popup">
          <img src="${story.photoUrl}" alt="${story.name}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px;">
          <h4 style="margin: 8px 0;">${story.name}</h4>
          <p style="margin: 4px 0; font-size: 0.9em;">${story.description.substring(0, 100)}...</p>
          <small style="color: #666;">${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
        </div>
      `);
      
      markers.push(marker);
    }
  });
  
  // Fit bounds if there are markers
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
};

const renderFavoritesPage = async () => {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="page-header">
      <h2>Cerita Favorit</h2>
      <div class="favorites-controls">
        <input 
          type="search" 
          id="searchFavorites" 
          placeholder="Cari favorit..." 
          aria-label="Cari favorit"
        >
        <select id="sortFavorites" aria-label="Urutkan favorit">
          <option value="favoritedAt-desc">Terbaru ditambahkan</option>
          <option value="favoritedAt-asc">Terlama ditambahkan</option>
          <option value="name-asc">Nama A-Z</option>
          <option value="name-desc">Nama Z-A</option>
          <option value="createdAt-desc">Cerita terbaru</option>
          <option value="createdAt-asc">Cerita terlama</option>
        </select>
      </div>
    </div>
    <div id="favoritesList" class="stories-grid">
      <p>Memuat favorit...</p>
    </div>
  `;
  
  try {
    showLoading(true);
    const favorites = await DBHelper.getAllFavorites();
    displayFavorites(favorites);
    
    // Search
    document.getElementById('searchFavorites').addEventListener('input', async (e) => {
      const query = e.target.value;
      const filtered = await DBHelper.searchFavorites(query);
      displayFavorites(filtered);
    });
    
    // Sort
    document.getElementById('sortFavorites').addEventListener('change', async (e) => {
      const [sortBy, order] = e.target.value.split('-');
      const sorted = await DBHelper.sortFavorites(sortBy, order);
      displayFavorites(sorted);
    });
  } catch (error) {
    content.innerHTML += `<p class="error">Gagal memuat favorit: ${error.message}</p>`;
  } finally {
    showLoading(false);
  }
};

const displayFavorites = (favorites) => {
  const favoritesList = document.getElementById('favoritesList');
  
  if (!favorites || favorites.length === 0) {
    favoritesList.innerHTML = '<p class="empty-state">Belum ada cerita favorit. Tambahkan dari halaman Cerita!</p>';
    return;
  }
  
  favoritesList.innerHTML = favorites.map(story => `
    <article class="story-card">
      <img 
        src="${story.photoUrl}" 
        alt="Foto cerita ${story.name}"
        class="story-image"
        loading="lazy"
      >
      <div class="story-content">
        <h3>${story.name}</h3>
        <p class="story-description">${story.description}</p>
        <div class="story-meta">
          <span class="story-date">Ditambahkan: ${new Date(story.favoritedAt).toLocaleDateString('id-ID')}</span>
          <button 
            class="btn-remove-favorite" 
            data-story-id="${story.id}"
            aria-label="Hapus dari favorit"
            title="Hapus dari favorit"
          >
            🗑️ Hapus
          </button>
        </div>
      </div>
    </article>
  `).join('');
  
  // Add remove button listeners
  favoritesList.querySelectorAll('.btn-remove-favorite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const storyId = e.target.dataset.storyId;
      await handleRemoveFavorite(storyId);
    });
  });
};

// ===== ENHANCED ADD STORY PAGE =====

let addStoryMap = null;
let selectedMarker = null;
let selectedLocation = { lat: -6.200000, lon: 106.816666 }; // Default: Jakarta

const renderAddStoryPage = () => {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="page-header">
      <h2>Tambah Cerita Baru</h2>
      <p>Bagikan pengalaman Anda dengan lokasi</p>
    </div>
    
    <form id="addStoryForm" class="add-story-form">
      <div class="form-group">
        <label for="storyDescription">Cerita Anda *</label>
        <textarea 
          id="storyDescription" 
          name="description" 
          rows="5" 
          required
          aria-required="true"
          placeholder="Ceritakan pengalaman Anda..."
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="storyPhoto">Foto *</label>
        <div class="photo-input-group">
          <input 
            type="file" 
            id="storyPhoto" 
            name="photo" 
            accept="image/*"
            aria-label="Upload foto cerita"
            style="display: none;"
          >
          <button type="button" id="uploadPhotoBtn" class="btn btn-secondary">
            📁 Pilih dari Galeri
          </button>
          <button type="button" id="capturePhotoBtn" class="btn btn-secondary">
            📷 Ambil Foto
          </button>
        </div>
        <div id="photoPreview" class="photo-preview"></div>
      </div>
      
      <div class="form-group">
        <label>Lokasi *</label>
        <div class="location-controls">
          <button type="button" id="getCurrentLocation" class="btn btn-secondary">
            📍 Gunakan Lokasi Saya
          </button>
          <button type="button" id="pickFromMap" class="btn btn-secondary">
            🗺️ Pilih di Peta
          </button>
        </div>
        
        <div class="form-row" style="margin-top: 1rem;">
          <div class="form-group">
            <label for="storyLat">Latitude *</label>
            <input 
              type="number" 
              id="storyLat" 
              name="lat" 
              step="any" 
              required
              aria-required="true"
              placeholder="-6.200000"
              value="${selectedLocation.lat}"
              readonly
            >
          </div>
          
          <div class="form-group">
            <label for="storyLon">Longitude *</label>
            <input 
              type="number" 
              id="storyLon" 
              name="lon" 
              step="any" 
              required
              aria-required="true"
              placeholder="106.816666"
              value="${selectedLocation.lon}"
              readonly
            >
          </div>
        </div>
      </div>
      
      <div id="mapContainer" style="display: none;">
        <div id="addStoryMap" style="height: 400px; border-radius: 8px; margin-top: 1rem;"></div>
        <p style="text-align: center; margin-top: 0.5rem; color: #666;">
          Klik pada peta untuk memilih lokasi
        </p>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          📤 Bagikan Cerita
        </button>
      </div>
    </form>
    
    <div id="pendingStoriesSection" class="pending-stories" style="display: none;">
      <h3>⏳ Cerita Pending (Offline)</h3>
      <p style="color: #856404; margin-bottom: 1rem;">
        Cerita ini akan otomatis di-upload saat koneksi internet kembali normal.
      </p>
      <div id="pendingStoriesList"></div>
    </div>
  `;
  
  // Event listeners
  document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
    document.getElementById('storyPhoto').click();
  });
  
  document.getElementById('storyPhoto').addEventListener('change', handlePhotoSelect);
  document.getElementById('capturePhotoBtn').addEventListener('click', handleCapturePhoto);
  document.getElementById('getCurrentLocation').addEventListener('click', handleGetCurrentLocation);
  document.getElementById('pickFromMap').addEventListener('click', handleShowMapPicker);
  document.getElementById('addStoryForm').addEventListener('submit', handleAddStory);
  
  // Load pending stories
  loadPendingStories();
};

// ===== PHOTO HANDLERS =====

const handlePhotoSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    displayPhotoPreview(file);
  }
};

const handleCapturePhoto = async () => {
  try {
    // Check if camera supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showNotification('Kamera tidak didukung di browser ini', 'error');
      return;
    }
    
    // Request camera permission
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } // Use back camera on mobile
    });
    
    // Create video preview modal
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-container">
        <video id="cameraVideo" autoplay playsinline></video>
        <canvas id="cameraCanvas" style="display: none;"></canvas>
        <div class="camera-controls">
          <button id="captureBtn" class="btn btn-primary">📷 Ambil Foto</button>
          <button id="cancelCameraBtn" class="btn btn-secondary">Batal</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const video = document.getElementById('cameraVideo');
    video.srcObject = stream;
    
    // Capture button
    document.getElementById('captureBtn').addEventListener('click', () => {
      const canvas = document.getElementById('cameraCanvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        
        // Set to file input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('storyPhoto').files = dataTransfer.files;
        
        displayPhotoPreview(file);
        
        // Stop camera and close modal
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
        
        showNotification('Foto berhasil diambil!', 'success');
      }, 'image/jpeg', 0.9);
    });
    
    // Cancel button
    document.getElementById('cancelCameraBtn').addEventListener('click', () => {
      stream.getTracks().forEach(track => track.stop());
      modal.remove();
    });
    
  } catch (error) {
    console.error('Camera error:', error);
    showNotification(`Gagal mengakses kamera: ${error.message}`, 'error');
  }
};

const displayPhotoPreview = (file) => {
  const preview = document.getElementById('photoPreview');
  const reader = new FileReader();
  
  reader.onload = (e) => {
    preview.innerHTML = `
      <div class="preview-container">
        <img src="${e.target.result}" alt="Preview" class="preview-image">
        <button type="button" class="btn-remove-photo" onclick="this.closest('.photo-preview').innerHTML = ''; document.getElementById('storyPhoto').value = '';">
          ❌ Hapus Foto
        </button>
      </div>
    `;
  };
  
  reader.readAsDataURL(file);
};

// ===== LOCATION HANDLERS =====

const handleGetCurrentLocation = () => {
  if (!navigator.geolocation) {
    showNotification('Geolocation tidak didukung browser Anda', 'error');
    return;
  }
  
  showLoading(true);
  showNotification('Mendapatkan lokasi Anda...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      selectedLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      
      document.getElementById('storyLat').value = selectedLocation.lat;
      document.getElementById('storyLon').value = selectedLocation.lon;
      
      showNotification('Lokasi berhasil didapatkan!', 'success');
      showLoading(false);
      
      // Update map if visible
      if (addStoryMap) {
        updateMapMarker(selectedLocation.lat, selectedLocation.lon);
      }
    },
    (error) => {
      showNotification(`Gagal mendapatkan lokasi: ${error.message}`, 'error');
      showLoading(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

const handleShowMapPicker = () => {
  const mapContainer = document.getElementById('mapContainer');
  const isVisible = mapContainer.style.display !== 'none';
  
  if (isVisible) {
    mapContainer.style.display = 'none';
    return;
  }
  
  mapContainer.style.display = 'block';
  
  // Initialize map if not exists
  if (!addStoryMap) {
    setTimeout(() => {
      initAddStoryMap();
    }, 100);
  }
};

const initAddStoryMap = () => {
  if (addStoryMap) {
    addStoryMap.remove();
  }
  
  const lat = parseFloat(document.getElementById('storyLat').value) || selectedLocation.lat;
  const lon = parseFloat(document.getElementById('storyLon').value) || selectedLocation.lon;
  
  addStoryMap = L.map('addStoryMap').setView([lat, lon], 13);
  
  // Add tile layer with error handling
  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });
  
  tileLayer.on('tileerror', function() {
    // Tile failed to load (offline)
    const mapContainer = document.getElementById('addStoryMap');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; flex-direction: column; gap: 1rem; padding: 2rem;">
          <p style="color: #666; font-size: 1.1rem;">⚠️ Peta tidak tersedia offline</p>
          <small style="color: #999;">Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}</small>
          <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 1rem;">🔄 Refresh</button>
        </div>
      `;
    }
  });
  
  tileLayer.addTo(addStoryMap);
  
  selectedMarker = L.marker([lat, lon], { draggable: true }).addTo(addStoryMap);
  
  selectedMarker.on('dragend', function(e) {
    const position = e.target.getLatLng();
    updateLocationInputs(position.lat, position.lng);
  });
  
  addStoryMap.on('click', function(e) {
    updateMapMarker(e.latlng.lat, e.latlng.lng);
  });
};

const updateMapMarker = (lat, lon) => {
  if (selectedMarker) {
    selectedMarker.setLatLng([lat, lon]);
  } else {
    selectedMarker = L.marker([lat, lon], { draggable: true }).addTo(addStoryMap);
  }
  
  addStoryMap.setView([lat, lon], 13);
  updateLocationInputs(lat, lon);
};

const updateLocationInputs = (lat, lon) => {
  selectedLocation = { lat, lon };
  document.getElementById('storyLat').value = lat;
  document.getElementById('storyLon').value = lon;
};

// ===== EVENT HANDLERS =====

const handleLogin = async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    showLoading(true);
    await login(email, password);
    showNotification('Login berhasil!', 'success');
    renderMainPage();
  } catch (error) {
    showNotification(`Login gagal: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
};

const handleRegister = async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    showLoading(true);
    await register(name, email, password);
    showNotification('Registrasi berhasil! Silakan login.', 'success');
    renderLoginPage();
  } catch (error) {
    showNotification(`Registrasi gagal: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
};

// ===== LOGOUT HANDLER WITH CONFIRMATION =====

const handleLogout = () => {
  // Show custom confirmation dialog
  const confirmLogout = confirm('Yakin ingin keluar dari aplikasi?');
  
  if (confirmLogout) {
    // Clear all data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    authToken = null;
    
    // Show notification
    showNotification('Berhasil logout', 'info');
    
    // Redirect to login page
    setTimeout(() => {
      renderLoginPage();
    }, 500);
  }
};

const handleAddFavorite = async (story) => {
  try {
    const isFav = await DBHelper.isFavorite(story.id);
    
    if (isFav) {
      showNotification('Cerita sudah ada di favorit', 'info');
      return;
    }
    
    await DBHelper.addFavorite(story);
    showNotification('Ditambahkan ke favorit!', 'success');
  } catch (error) {
    showNotification(`Gagal menambah favorit: ${error.message}`, 'error');
  }
};

const handleRemoveFavorite = async (storyId) => {
  try {
    await DBHelper.deleteFavorite(storyId);
    showNotification('Dihapus dari favorit', 'success');
    // Reload favorites
    renderFavoritesPage();
  } catch (error) {
    showNotification(`Gagal menghapus favorit: ${error.message}`, 'error');
  }
};

const handlePhotoPreview = (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('photoPreview');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
};

const handleGetLocation = () => {
  if (!navigator.geolocation) {
    showNotification('Geolocation tidak didukung browser Anda', 'error');
    return;
  }
  
  showLoading(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.getElementById('storyLat').value = position.coords.latitude;
      document.getElementById('storyLon').value = position.coords.longitude;
      showNotification('Lokasi berhasil didapatkan!', 'success');
      showLoading(false);
    },
    (error) => {
      showNotification(`Gagal mendapatkan lokasi: ${error.message}`, 'error');
      showLoading(false);
    }
  );
};

const handleAddStory = async (e) => {
  e.preventDefault();
  
  const description = document.getElementById('storyDescription').value;
  const photo = document.getElementById('storyPhoto').files[0];
  const lat = parseFloat(document.getElementById('storyLat').value);
  const lon = parseFloat(document.getElementById('storyLon').value);
  
  try {
    showLoading(true);
    const result = await addStory(description, photo, lat, lon);
    
    if (result.offline) {
      showNotification('Cerita disimpan untuk di-sync saat online', 'warning');
      loadPendingStories();
    } else {
      showNotification('Cerita berhasil dibagikan!', 'success');
    }
    
    // Reset form
    e.target.reset();
    document.getElementById('photoPreview').innerHTML = '';
    
    // Navigate to home
    navigateTo('home');
  } catch (error) {
    showNotification(`Gagal menambah cerita: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
};

const loadPendingStories = async () => {
  try {
    const pending = await DBHelper.getAllPendingStories();
    const list = document.getElementById('pendingStoriesList');
    
    if (!list) return;
    
    if (pending.length === 0) {
      list.innerHTML = '<p class="empty-state">Tidak ada cerita pending</p>';
      document.getElementById('pendingStoriesSection').style.display = 'none';
      return;
    }
    
    document.getElementById('pendingStoriesSection').style.display = 'block';
    list.innerHTML = pending.map(story => `
      <div class="pending-story">
        <p><strong>Cerita:</strong> ${story.description.substring(0, 50)}...</p>
        <small>Waktu: ${new Date(story.timestamp).toLocaleString('id-ID')}</small>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load pending stories:', error);
  }
};

// ===== PUSH NOTIFICATION HANDLER - FIXED WITH LOCALSTORAGE =====

const handleNotificationToggle = async () => {
  try {
    // Check if Push API supported
    if (!('PushManager' in window)) {
      showNotification('Browser Anda tidak mendukung Push Notification', 'error');
      return;
    }

    // Check notification permission
    if (Notification.permission === 'denied') {
      showNotification('Notifikasi diblokir. Aktifkan di pengaturan browser.', 'error');
      return;
    }

    // Request permission if default
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showNotification('Izin notifikasi ditolak', 'warning');
        return;
      }
    }

    // Check current subscription status
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Already subscribed - Unsubscribe
      const confirmUnsubscribe = confirm('Nonaktifkan notifikasi push?');
      if (confirmUnsubscribe) {
        await subscription.unsubscribe();
        
        // SAVE TO LOCALSTORAGE
        localStorage.setItem('notification-subscribed', 'false');
        
        showNotification('Notifikasi dinonaktifkan', 'info');
        updateNotificationButton(false);
      }
    } else {
      // Not subscribed - Subscribe
      showNotification('Mengaktifkan notifikasi...', 'info');
      
      // VAPID key from Dicoding API
      const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // SAVE TO LOCALSTORAGE
      localStorage.setItem('notification-subscribed', 'true');
      
      console.log('Push subscription:', newSubscription);
      showNotification('Notifikasi diaktifkan!', 'success');
      updateNotificationButton(true);
      
      // Test notification
      setTimeout(() => {
        registration.showNotification('Berbagi Cerita', {
          body: 'Notifikasi berhasil diaktifkan! 🎉',
          icon: '/images/icon-192.png',
          badge: '/images/icon-192.png'
        });
      }, 1000);
    }
  } catch (error) {
    console.error('Notification toggle error:', error);
    showNotification(`Gagal: ${error.message}`, 'error');
  }
};

const updateNotificationButton = (isSubscribed) => {
  const icon = document.getElementById('notifIcon');
  const btn = document.getElementById('notifToggle');
  
  if (icon) {
    icon.textContent = isSubscribed ? '🔔' : '🔕';
  }
  
  if (btn) {
    btn.title = isSubscribed ? 'Notifikasi Aktif - Klik untuk Nonaktifkan' : 'Notifikasi Nonaktif - Klik untuk Aktifkan';
  }
};

// LOAD NOTIFICATION STATUS FROM LOCALSTORAGE
const loadNotificationStatus = async () => {
  try {
    // Get saved status from localStorage
    const savedStatus = localStorage.getItem('notification-subscribed');
    
    if (savedStatus === 'true') {
      updateNotificationButton(true);
    } else {
      updateNotificationButton(false);
    }
    
    // Sync with actual subscription status
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const actualStatus = !!subscription;
      
      // If mismatch, update localStorage to match actual
      if (savedStatus !== actualStatus.toString()) {
        localStorage.setItem('notification-subscribed', actualStatus.toString());
        updateNotificationButton(actualStatus);
      }
      
      console.log('[Notification] Status loaded:', actualStatus);
    }
  } catch (error) {
    console.error('Load notification status error:', error);
    updateNotificationButton(false);
  }
};

// Helper function untuk convert VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Check notification status on load - DEPRECATED, use loadNotificationStatus instead
const checkNotificationStatus = async () => {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const isSubscribed = !!subscription;
      
      console.log('[Notification] Subscription status:', isSubscribed);
      updateNotificationButton(isSubscribed);
      
      return isSubscribed;
    }
  } catch (error) {
    console.error('Check notification status error:', error);
  }
  return false;
};

// ===== NAVIGATION =====

const navigateTo = (page) => {
  currentPage = page;
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === page) {
      btn.classList.add('active');
    }
  });
  
  // Route to appropriate page
  switch(page) {
    case 'home':
      renderStoriesPage();
      break;
    case 'map':
      renderMapPage();
      break;
    case 'favorites':
      renderFavoritesPage();
      break;
    case 'add':
      renderAddStoryPage();
      break;
  }
};

// ===== INITIALIZATION =====

const initApp = async () => {
  console.log('App initializing...');
  
  // Check auth token
  authToken = localStorage.getItem('authToken');
  
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration.scope);
      
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
  
  // Render appropriate page
  if (authToken) {
    renderMainPage();
    
    // Check and sync pending stories
    setTimeout(() => {
      checkAndSyncOnLoad();
    }, 1000);
  } else {
    renderLoginPage();
  }
};

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
  
// ONLINE/OFFLINE SYNC 

// Listen for online event
window.addEventListener('online', async () => {
  console.log('✅ Back online! Starting sync...');
  showNotification('Kembali online! Sedang sync data...', 'info');
  
  // Wait a bit for connection to stabilize
  setTimeout(async () => {
    try {
      await triggerBackgroundSync();
    } catch (error) {
      console.error('Background sync failed, using manual sync:', error);
      await manualSyncPendingStories();
    }
  }, 1000);
});

// Listen for offline event
window.addEventListener('offline', () => {
  console.log('❌ Offline mode');
  showNotification('Mode offline aktif. Perubahan akan disimpan lokal.', 'warning');
});

// Trigger background sync
async function triggerBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in self.registration) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-stories');
      console.log('🔄 Background sync registered');
      return true;
    } catch (error) {
      console.error('Sync registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Background sync not supported');
  }
}

// Manual sync fallback
async function manualSyncPendingStories() {
  console.log('📤 Starting manual sync...');
  
  try {
    const pendingStories = await DBHelper.getAllPendingStories();
    
    if (pendingStories.length === 0) {
      console.log('✅ No pending stories');
      return;
    }

    console.log(`📊 Found ${pendingStories.length} pending stories`);
    let successCount = 0;
    let failCount = 0;

    for (const story of pendingStories) {
      try {
        await uploadPendingStory(story);
        await DBHelper.deletePendingStory(story.id);
        successCount++;
        console.log(`✅ Uploaded: ${story.id}`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to upload: ${story.id}`, error);
      }
    }

    // Refresh UI
    if (currentPage === 'add') {
      await loadPendingStories();
    }
    if (currentPage === 'home') {
      await renderStoriesPage();
    }

    // Show result
    if (successCount > 0) {
      showNotification(`${successCount} cerita berhasil di-upload!`, 'success');
    }
    
    if (failCount > 0) {
      showNotification(`${failCount} cerita gagal di-upload. Coba lagi nanti.`, 'error');
    }

  } catch (error) {
    console.error('Manual sync failed:', error);
    showNotification('Gagal sync data. Coba lagi nanti.', 'error');
  }
}

// Upload single pending story
async function uploadPendingStory(story) {
  const formData = new FormData();
  formData.append('description', story.description);
  formData.append('lat', story.lat);
  formData.append('lon', story.lon);

  // Handle photo
  if (story.photo) {
    let photoBlob;
    
    if (story.photo instanceof Blob || story.photo instanceof File) {
      photoBlob = story.photo;
    } else if (typeof story.photo === 'string') {
      // Convert base64 to blob
      const response = await fetch(story.photo);
      photoBlob = await response.blob();
    }
    
    if (photoBlob) {
      formData.append('photo', photoBlob, 'photo.jpg');
    }
  }

  const response = await fetch(`${API_BASE_URL}/stories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${story.token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  return await response.json();
}

// Listen for sync completion from Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      console.log('✅ Sync complete from SW:', event.data);
      
      const { successCount, failCount } = event.data;
      
      // Refresh UI
      if (currentPage === 'add') {
        await loadPendingStories();
      }
      if (currentPage === 'home') {
        await renderStoriesPage();
      }
      
      // Show notification
      if (successCount > 0) {
        showNotification(`${successCount} cerita berhasil di-upload!`, 'success');
      }
      if (failCount > 0) {
        showNotification(`${failCount} cerita gagal di-upload`, 'warning');
      }
    }
  });
}

// Check and sync on app load
async function checkAndSyncOnLoad() {
  if (!navigator.onLine) {
    console.log('❌ App loaded offline');
    showNotification('Mode offline. Koneksi internet tidak tersedia.', 'warning');
    return;
  }
  
  console.log('✅ App loaded online');
  
  // Check for pending stories
  try {
    const pending = await DBHelper.getAllPendingStories();
    if (pending.length > 0) {
      console.log(`📊 Found ${pending.length} pending stories on startup`);
      showNotification(`Ditemukan ${pending.length} cerita pending. Syncing...`, 'info');
      
      setTimeout(async () => {
        try {
          await triggerBackgroundSync();
        } catch (error) {
          console.log('Using manual sync fallback');
          await manualSyncPendingStories();
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Check pending stories failed:', error);
  }
}

// Manual sync button handler (untuk tombol sync di UI)
async function handleManualSync() {
  const syncButton = document.getElementById('sync-button');
  if (syncButton) {
    syncButton.disabled = true;
    syncButton.textContent = 'Syncing...';
  }

  try {
    await manualSyncPendingStories();
  } finally {
    if (syncButton) {
      syncButton.disabled = false;
      syncButton.textContent = '🔄 Sync Sekarang';
    }
  }
}

// FORCE HIDE LOADING (temporary debug)
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
    console.log('Loading force hidden');
  }
}, 2000);