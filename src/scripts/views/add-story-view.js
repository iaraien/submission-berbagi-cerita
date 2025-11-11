class AddStoryView {
  constructor() {
    this._map = null;
    this._marker = null;
    this._selectedLocation = null;
    this._mediaStream = null;
    this._capturedImage = null;
  }

  getTemplate() {
    return `
      <section class="container add-story-container fade-in">
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
              <label class="form-label">Foto Cerita</label>
              
              <div class="photo-options">
                <button type="button" id="use-camera-btn" class="btn btn-secondary">
                  📷 Gunakan Kamera
                </button>
                <button type="button" id="use-file-btn" class="btn btn-secondary">
                  📁 Pilih dari File
                </button>
              </div>

              <!-- Camera Section -->
              <div id="camera-section" class="camera-section" style="display: none;">
                <video id="camera-preview" class="camera-preview" autoplay playsinline></video>
                <div class="camera-controls">
                  <button type="button" id="capture-btn" class="btn btn-primary">📸 Ambil Foto</button>
                  <button type="button" id="close-camera-btn" class="btn btn-secondary">❌ Tutup Kamera</button>
                </div>
              </div>

              <!-- File Input Section -->
              <div id="file-section" class="file-input-wrapper" style="display: none;">
                <input 
                  type="file" 
                  id="photo" 
                  name="photo" 
                  class="form-file" 
                  accept="image/*"
                  aria-label="Upload foto cerita"
                />
              </div>

              <!-- Preview Section -->
              <div id="preview-container" class="preview-container" style="display: none;">
                <img id="preview-image" src="" alt="Preview foto cerita" class="preview-image" />
                <button type="button" id="remove-photo-btn" class="btn btn-secondary-small">
                  🗑️ Hapus Foto
                </button>
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
              <button type="button" id="cancel-btn" class="btn btn-secondary">Batal</button>
              <button type="submit" class="btn btn-primary" id="submit-btn" disabled>Kirim Cerita</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  initializeMap() {
    const mapElement = document.getElementById('form-map');
    if (!mapElement) return;

    this._map = L.map('form-map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this._map);

    this._map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      if (this._marker) {
        this._map.removeLayer(this._marker);
      }

      this._marker = L.marker([lat, lng]).addTo(this._map);
      this._selectedLocation = { lat, lon: lng };

      document.getElementById('selected-lat').textContent = lat.toFixed(6);
      document.getElementById('selected-lon').textContent = lng.toFixed(6);
      document.getElementById('location-info').style.display = 'block';
    });
  }

  clearLocation() {
    if (this._marker) {
      this._map.removeLayer(this._marker);
      this._marker = null;
    }
    this._selectedLocation = null;
    document.getElementById('location-info').style.display = 'none';
  }

  getSelectedLocation() {
    return this._selectedLocation;
  }

  async startCamera() {
    try {
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      const video = document.getElementById('camera-preview');
      video.srcObject = this._mediaStream;

      document.getElementById('camera-section').style.display = 'block';
      document.getElementById('file-section').style.display = 'none';
      document.getElementById('preview-container').style.display = 'none';
    } catch (error) {
      alert('Tidak dapat mengakses kamera: ' + error.message);
    }
  }

  stopCamera() {
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => track.stop());
      this._mediaStream = null;
    }

    const video = document.getElementById('camera-preview');
    if (video) {
      video.srcObject = null;
    }

    document.getElementById('camera-section').style.display = 'none';
  }

  capturePhoto() {
    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      this._capturedImage = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
      
      const preview = document.getElementById('preview-image');
      preview.src = URL.createObjectURL(blob);
      
      document.getElementById('preview-container').style.display = 'block';
      document.getElementById('submit-btn').disabled = false;
      
      this.stopCamera();
    }, 'image/jpeg', 0.9);
  }

  showFileInput() {
    document.getElementById('file-section').style.display = 'block';
    document.getElementById('camera-section').style.display = 'none';
    document.getElementById('preview-container').style.display = 'none';
    this.stopCamera();
  }

  handleFilePreview(file) {
    if (file) {
      this._capturedImage = file;
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('preview-image').src = event.target.result;
        document.getElementById('preview-container').style.display = 'block';
        document.getElementById('submit-btn').disabled = false;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this._capturedImage = null;
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('submit-btn').disabled = true;
    
    const fileInput = document.getElementById('photo');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getCapturedImage() {
    return this._capturedImage;
  }

  setSubmitButtonState(disabled, text) {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = disabled;
      submitBtn.textContent = text;
    }
  }

  destroy() {
    this.stopCamera();
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  }
}

export default AddStoryView;