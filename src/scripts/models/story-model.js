import StoryAPI from '../data/api';

class StoryModel {
  constructor() {
    this._stories = [];
  }

  async fetchStories() {
    try {
      this._stories = await StoryAPI.getStories();
      return this._stories;
    } catch (error) {
      throw new Error(`Failed to fetch stories: ${error.message}`);
    }
  }

  async addStory(storyData) {
    try {
      const { description, photo, lat, lon } = storyData;
      const result = await StoryAPI.addStory(description, photo, lat, lon);
      return result;
    } catch (error) {
      throw new Error(`Failed to add story: ${error.message}`);
    }
  }

  getStories() {
    return this._stories;
  }

  getStoryById(id) {
    return this._stories.find(story => story.id === id);
  }
}

export default StoryModel;