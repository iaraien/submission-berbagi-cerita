import StoryModel from '../models/story-model';
import HomeView from '../views/home-view';
import AuthModel from '../models/auth-model';

class HomePresenter {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
    this._view = new HomeView();
  }

  async init() {
    // Check authentication
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

    try {
      const stories = await this._storyModel.fetchStories();
      this._view.renderStories(stories);
      this._view.initializeMap(stories);
    } catch (error) {
      this._view.renderError(error.message);
    }
  }

  destroy() {
    this._view.destroyMap();
  }
}

export default HomePresenter;