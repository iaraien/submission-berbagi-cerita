import { showFormattedDate } from '../utils/index';

class HomeView {
  constructor() {
    this._map = null;
  }

  getTemplate() {
    return `
      <section class="container home-container">
        <div class="home-header">
          <h1 class="page-title slide-in-left">Cerita Terbaru</h1>
          <button id="add-story-btn" class="btn btn-primary slide-in-right" type="button">+ Tambah Cerita</button>
        </div>

        <div id="stories-content">
          <div class="loading fade-in">Memuat cerita...</div>
        </div>

        <div class="map-section fade-in-up">
          <h2 class="section-title">Peta Lokasi Cerita</h2>
          <div id="map" class="map-container" role="application" aria-label="Peta lokasi cerita"></div>
        </div>
      </section>
    `;
  }

  renderStories(stories) {
    const storiesContent = document.getElementById('stories-content');
    
    if (stories.length === 0) {
      storiesContent.innerHTML = `
        <div class="empty-state fade-in">
          <p>Belum ada cerita. Yuk, bagikan cerita pertama Anda!</p>
        </div>
      `;
      return;
    }

    storiesContent.innerHTML = `
      <div class="stories-grid">
        ${stories.map((story, index) => `
          <article class="story-card fade-in-up" style="animation-delay: ${index * 0.1}s">
            <img 
              src="${story.photoUrl}" 
              alt="${story.description}"
              class="story-image"
              loading="lazy"
            />
            <div class="story-content">
              <h3 class="story-name">${story.name}</h3>
              <p class="story-description">${story.description}</p>
              <time class="story-date" datetime="${story.createdAt}">
                ${showFormattedDate(story.createdAt, 'id-ID')}
              </time>
              ${story.lat && story.lon ? `
                <p class="story-location">
                  📍 Lat: ${story.lat.toFixed(4)}, Lon: ${story.lon.toFixed(4)}
                </p>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderError(message) {
    const storiesContent = document.getElementById('stories-content');
    storiesContent.innerHTML = `
      <div class="error-message fade-in">
        <p>Gagal memuat cerita: ${message}</p>
      </div>
    `;
  }

  initializeMap(stories) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Initialize Leaflet map
    this._map = L.map('map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this._map);

    // Add markers for stories with location
    stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(this._map);
        
        marker.bindPopup(`
          <div class="map-popup">
            <img 
              src="${story.photoUrl}" 
              alt="${story.description}"
              class="popup-image"
            />
            <h4>${story.name}</h4>
            <p>${story.description}</p>
            <small>${showFormattedDate(story.createdAt, 'id-ID')}</small>
          </div>
        `);
      }
    });
  }

  destroyMap() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  }
}

export default HomeView;