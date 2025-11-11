import StoryModel from '../models/story-model';
import AddStoryView from '../views/add-story-view';
import AuthModel from '../models/auth-model';
import { Toast } from '../utils/index';

class AddStoryPresenter {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
    this._view = new AddStoryView();
  }

  async init() {
    if (!this._authModel.isAuthenticated()) {
      window.location.hash = '#/login';
      return '';
    }

    return this._view.getTemplate();
  }

  async afterRender() {
    if (!this._authModel.isAuthenticated()) {
      return;
    }

    this._view.initializeMap();
    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Camera button
    const useCameraBtn = document.getElementById('use-camera-btn');
    useCameraBtn?.addEventListener('click', () => {
      this._view.startCamera();
    });

    // File button
    const useFileBtn = document.getElementById('use-file-btn');
    useFileBtn?.addEventListener('click', () => {
      this._view.showFileInput();
    });

    // Capture photo
    const captureBtn = document.getElementById('capture-btn');
    captureBtn?.addEventListener('click', () => {
      this._view.capturePhoto();
    });

    // Close camera
    const closeCameraBtn = document.getElementById('close-camera-btn');
    closeCameraBtn?.addEventListener('click', () => {
      this._view.stopCamera();
    });

    // File input
    const photoInput = document.getElementById('photo');
    photoInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this._view.handleFilePreview(file);
      }
    });

    // Remove photo
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    removePhotoBtn?.addEventListener('click', () => {
      this._view.removePhoto();
    });

    // Clear location
    const clearLocationBtn = document.getElementById('clear-location');
    clearLocationBtn?.addEventListener('click', () => {
      this._view.clearLocation();
    });

    // Form submit
    const form = document.getElementById('add-story-form');
    form?.addEventListener('submit', (e) => this._handleSubmit(e));
  }

  async _handleSubmit(event) {
    event.preventDefault();

    const description = document.getElementById('description').value;
    const photo = this._view.getCapturedImage();

    if (!photo) {
      Toast.show('Silakan pilih atau ambil foto terlebih dahulu', 'error');
      return;
    }

    this._view.setSubmitButtonState(true, 'Mengirim...');

    try {
      const location = this._view.getSelectedLocation();
      const storyData = {
        description,
        photo,
        lat: location?.lat || null,
        lon: location?.lon || null,
      };

      await this._storyModel.addStory(storyData);
      Toast.show('Cerita berhasil ditambahkan!', 'success');
      
      // Wait a bit before redirect to show toast
      setTimeout(() => {
        window.location.hash = '#/';
      }, 500);
    } catch (error) {
      Toast.show(error.message, 'error');
      this._view.setSubmitButtonState(false, 'Kirim Cerita');
    }
  }

  destroy() {
    this._view.destroy();
  }
}

export default AddStoryPresenter;