import StoryAPI from '../../data/api';
import { Toast } from '../../utils/index';
import Auth from '../../utils/auth';

export default class RegisterPage {
  async render() {
    if (Auth.isAuthenticated()) {
      window.location.hash = '#/';
      return '';
    }

    return `
      <section class="auth-container container">
        <div class="auth-card">
          <h1 class="auth-title">Daftar Akun Baru</h1>
          <p class="auth-subtitle">Bergabunglah dengan komunitas berbagi cerita</p>
          
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="name" class="form-label">Nama Lengkap</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                class="form-input" 
                placeholder="Masukkan nama lengkap Anda"
                required
                aria-required="true"
              />
            </div>

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
                placeholder="Minimal 8 karakter"
                minlength="8"
                required
                aria-required="true"
              />
            </div>

            <button type="submit" class="btn btn-primary">Daftar</button>
          </form>

          <p class="auth-footer">
            Sudah punya akun? <button type="button" id="login-link" class="auth-link-btn">Masuk di sini</button>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (Auth.isAuthenticated()) {
      return;
    }

    // Setup login link button
    const loginLink = document.getElementById('login-link');
    loginLink?.addEventListener('click', () => {
      window.location.hash = '#/login';
    });

    const form = document.getElementById('register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Mendaftar...';

      try {
        await StoryAPI.register(name, email, password);
        Toast.show('Pendaftaran berhasil! Silakan login.', 'success');
        window.location.hash = '#/login';
      } catch (error) {
        Toast.show(error.message || 'Pendaftaran gagal', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Daftar';
      }
    });
  }
}