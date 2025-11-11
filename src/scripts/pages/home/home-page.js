import StoryAPI from '../../data/api';
import Auth from '../../utils/auth';
import { showFormattedDate } from '../../utils/index';

export default class HomePage {
  async render() {
    if (!Auth.isAuthenticated()) {
      window.location.hash = '#/login';
      return '';
    }

    return `
      <section class="container home-container">
        <div class="home-header">
          <h1 class="page-title">Cerita Terbaru</h1>
          <a href="#/add-story" class="btn btn-primary">+ Tambah Cerita</a>
        </div>

        <div id="stories-content">
          <div class="loading">Memuat cerita...</div>
        </div>

        <div class="map-section">
          <h2 class="section-title">Peta Lokasi Cerita</h2>
          <div id="map" class="map-container" role="application" aria-label="Peta lokasi cerita"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (!Auth.isAuthenticated()) {
      return;
    }

    try {
      const stories = await StoryAPI.getStories();
      this._renderStories(stories);
      this._initializeMap(stories);
    } catch (error) {
      document.getElementById('stories-content').innerHTML = `
        <div class="error-message">
          <p>Gagal memuat cerita: ${error.message}</p>
        </div>
      `;
    }
  }

  _renderStories(stories) {
    const storiesContent = document.getElementById('stories-content');
    
    if (stories.length === 0) {
      storiesContent.innerHTML = `
        <div class="empty-state">
          <p>Belum ada cerita. Yuk, bagikan cerita pertama Anda!</p>
        </div>
      `;
      return;
    }

    storiesContent.innerHTML = `
      <div class="stories-grid">
        ${stories.map(story => `
          <article class="story-card">
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

  _initializeMap(stories) {
    // Initialize Leaflet map
    const map = L.map('map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add markers for stories with location
    stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(map);
        
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
}