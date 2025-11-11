import StoryAPI from '../../data/api';
import Auth from '../../utils/auth';
import { Toast } from '../../utils/index';

export default class AddStoryPage {
  constructor() {
    this._selectedLocation = null;
    this._map = null;
    this._marker = null;
  }

  async render() {
    if (!Auth.isAuthenticated()) {
      window.location.hash = '#/login';
      return '';
    }

    return `
      <section class="container add-story-container">
        <div class="add-story-card">
          <h1 class="page-title">Tambah Cerita Baru</h1>
          
          <form id="add-story-form" class="add-story-form">
            <div class="form-group">
              <label for="description" class="form-label">Deskripsi Cerita</label>
              <textarea 
                id="description" 
                name="description" 
                class="form-textarea" 
                placeholder="Ceritakan pengalaman Anda..."
                rows="5"
                required
                aria-required="true"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="photo" class="form-label">Foto Cerita</label>
              <div class="file-input-wrapper">
                <input 
                  type="file" 
                  id="photo" 
                  name="photo" 
                  class="form-file" 
                  accept="image/*"
                  required
                  aria-required="true"
                />
                <div id="preview-container" class="preview-container" style="display: none;">
                  <img id="preview-image" src="" alt="Preview foto cerita" class="preview-image" />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Lokasi Cerita (Opsional)</label>
              <p class="form-hint">Klik pada peta untuk memilih lokasi cerita Anda</p>
              <div id="form-map" class="form-map" role="application" aria-label="Peta untuk memilih lokasi"></div>
              <div id="location-info" class="location-info" style="display: none;">
                <p>📍 Lokasi terpilih:</p>
                <p>Latitude: <span id="selected-lat">-</span></p>
                <p>Longitude: <span id="selected-lon">-</span></p>
                <button type="button" id="clear-location" class="btn btn-secondary-small">Hapus Lokasi</button>
              </div>
            </div>

            <div class="form-actions">
              <a href="#/" class="btn btn-secondary">Batal</a>
              <button type="submit" class="btn btn-primary">Kirim Cerita</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (!Auth.isAuthenticated()) {
      return;
    }

    this._initializeFormMap();
    this._handlePhotoPreview();
    this._handleFormSubmit();
    this._handleClearLocation();
  }

  _initializeFormMap() {
    // Initialize map centered on Indonesia
    this._map = L.map('form-map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this._map);

    // Add click event to select location
    this._map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      // Remove previous marker if exists
      if (this._marker) {
        this._map.removeLayer(this._marker);
      }

      // Add new marker
      this._marker = L.marker([lat, lng]).addTo(this._map);
      this._selectedLocation = { lat, lon: lng };

      // Update location info
      document.getElementById('selected-lat').textContent = lat.toFixed(6);
      document.getElementById('selected-lon').textContent = lng.toFixed(6);
      document.getElementById('location-info').style.display = 'block';
    });
  }

  _handlePhotoPreview() {
    const photoInput = document.getElementById('photo');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImage.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  _handleClearLocation() {
    const clearButton = document.getElementById('clear-location');
    clearButton.addEventListener('click', () => {
      if (this._marker) {
        this._map.removeLayer(this._marker);
        this._marker = null;
      }
      this._selectedLocation = null;
      document.getElementById('location-info').style.display = 'none';
    });
  }

  _handleFormSubmit() {
    const form = document.getElementById('add-story-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const description = document.getElementById('description').value;
      const photo = document.getElementById('photo').files[0];

      if (!photo) {
        Toast.show('Silakan pilih foto terlebih dahulu', 'error');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Mengirim...';

      try {
        const lat = this._selectedLocation?.lat || null;
        const lon = this._selectedLocation?.lon || null;

        await StoryAPI.addStory(description, photo, lat, lon);
        Toast.show('Cerita berhasil ditambahkan!', 'success');
        window.location.hash = '#/';
      } catch (error) {
        Toast.show(error.message || 'Gagal menambahkan cerita', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Kirim Cerita';
      }
    });
  }
}