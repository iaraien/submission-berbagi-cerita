import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import Auth from '../utils/auth';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #logoutButton = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#logoutButton = document.querySelector('#logout-button');

    this._setupDrawer();
    this._setupLogout();
    this._setupBrandLink();
    this._updateNavigation();
  }

  _setupBrandLink() {
    const brandLink = document.getElementById('brand-link');
    brandLink?.addEventListener('click', () => {
      window.location.hash = '#/';
    });
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      })
    });
  }

  _setupLogout() {
    if (this.#logoutButton) {
      this.#logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  }

  _updateNavigation() {
    const navList = document.getElementById('nav-list');
    const isAuthenticated = Auth.isAuthenticated();

    if (isAuthenticated) {
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li><a href="#/logout" id="logout-button">Keluar</a></li>
      `;
      this.#logoutButton = document.querySelector('#logout-button');
      this._setupLogout();
    } else {
      navList.innerHTML = `
        <li><a href="#/login">Masuk</a></li>
        <li><a href="#/register">Daftar</a></li>
      `;
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    if (!page) {
      this.#content.innerHTML = '<div class="container"><h1>404 - Halaman tidak ditemukan</h1></div>';
      return;
    }

    // Cleanup previous page if it has destroy method
    if (this.#currentPage && typeof this.#currentPage.destroy === 'function') {
      this.#currentPage.destroy();
    }

    // Custom view transition with animations
    if (document.startViewTransition) {
      await document.startViewTransition(async () => {
        await this._renderPageContent(page);
      }).finished;
    } else {
      // Fallback for browsers without View Transition API
      this.#content.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, 150));
      await this._renderPageContent(page);
      this.#content.style.opacity = '1';
    }

    this.#currentPage = page;
    this._updateNavigation();
  }

  async _renderPageContent(page) {
    // Call init method (for Presenters) or render (for old Pages)
    const content = await (page.init ? page.init() : page.render());
    this.#content.innerHTML = content;
    
    // Call afterRender
    if (page.afterRender) {
      await page.afterRender();
    }
  }
}

export default App;