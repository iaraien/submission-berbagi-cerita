import StoryAPI from '../../data/api';
import { Toast } from '../../utils/index';
import Auth from '../../utils/auth';

export default class LoginPage {
  async render() {
    if (Auth.isAuthenticated()) {
      window.location.hash = '#/';
      return '';
    }

    return `
      <section class="auth-container container">
        <div class="auth-card">
          <h1 class="auth-title">Masuk ke Akun</h1>
          <p class="auth-subtitle">Selamat datang kembali!</p>
          
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                class="form-input" 
                placeholder="contoh@email.com"
                required
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                class="form-input" 
                placeholder="Masukkan password Anda"
                required
                aria-required="true"
              />
            </div>

            <button type="submit" class="btn btn-primary">Masuk</button>
          </form>

          <p class="auth-footer">
            Belum punya akun? <button type="button" id="register-link" class="auth-link-btn">Daftar di sini</button>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (Auth.isAuthenticated()) {
      return;
    }

    // Setup register link button
    const registerLink = document.getElementById('register-link');
    registerLink?.addEventListener('click', () => {
      window.location.hash = '#/register';
    });

    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Memproses...';

      try {
        const response = await StoryAPI.login(email, password);
        Auth.saveToken(response.loginResult.token);
        Toast.show('Login berhasil!', 'success');
        window.location.hash = '#/';
      } catch (error) {
        Toast.show(error.message || 'Login gagal', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Masuk';
      }
    });
  }
}