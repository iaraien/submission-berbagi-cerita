class Auth {
  static saveToken(token) {
    localStorage.setItem('token', token);
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static removeToken() {
    localStorage.removeItem('token');
  }

  static isAuthenticated() {
    return !!this.getToken();
  }

  static logout() {
    this.removeToken();
    window.location.hash = '#/login';
  }
}

export default Auth;