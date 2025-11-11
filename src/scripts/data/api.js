import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
};

class StoryAPI {
  static async register(name, email, password) {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!data.error) {
      return data;
    }
    throw new Error(data.message);
  }

  static async login(email, password) {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!data.error) {
      return data;
    }
    throw new Error(data.message);
  }

  static async getStories() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${ENDPOINTS.STORIES}?location=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!data.error) {
      return data.listStory;
    }
    throw new Error(data.message);
  }

  static async addStory(description, photo, lat, lon) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    
    if (lat && lon) {
      formData.append('lat', lat);
      formData.append('lon', lon);
    }

    const response = await fetch(ENDPOINTS.ADD_STORY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.error) {
      return data;
    }
    throw new Error(data.message);
  }
}

export default StoryAPI;