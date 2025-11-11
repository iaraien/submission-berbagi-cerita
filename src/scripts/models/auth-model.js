// src/scripts/models/auth-model.js
import Auth from '../utils/auth';

class AuthModel {
  constructor() {
    this._auth = Auth;
  }

  saveToken(token) {
    this._auth.saveToken(token);
  }

  getToken() {
    return this._auth.getToken();
  }

  removeToken() {
    this._auth.removeToken();
  }

  isAuthenticated() {
    return this._auth.isAuthenticated();
  }

  logout() {
    this._auth.logout();
  }
}

export default AuthModel;
