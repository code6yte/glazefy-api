// Dashboard JavaScript

class DashboardApp {
  constructor() {
    this.token = localStorage.getItem('token');
    this.cafe = null;
    this.menuItems = [];
    this.currentPage = 'overview';

    this.init();
  }

  async init() {
    if (this.token) {
      await this.fetchProfile();
    }

    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));

    // Auth page switching
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('register-page').classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-page').classList.add('hidden');
      document.getElementById('login-page').classList.remove('hidden');
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchPage(item.dataset.page);
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // Mobile menu
    document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });

    // Menu items
    document.getElementById('add-menu-item').addEventListener('click', () => this.openItemModal());
    document.getElementById('add-item-btn').addEventListener('click', () => this.openItemModal());
    document.getElementById('view-qr-btn').addEventListener('click', () => this.switchPage('qrcode'));

    // Item modal
    document.getElementById('close-modal').addEventListener('click', () => this.closeItemModal());
    document.getElementById('cancel-item').addEventListener('click', () => this.closeItemModal());
    document.getElementById('item-form').addEventListener('submit', (e) => this.handleItemSubmit(e));
    document.getElementById('item-image').addEventListener('change', (e) => this.handleImagePreview(e));

    // QR Code
    document.getElementById('copy-url').addEventListener('click', () => this.copyMenuUrl());
    document.getElementById('download-qr').addEventListener('click', () => this.downloadQRCode());

    // Settings
    document.getElementById('settings-form').addEventListener('submit', (e) => this.handleSettingsSave(e));
  }

  updateUI() {
    if (this.token && this.cafe) {
      document.getElementById('auth-container').classList.add('hidden');
      document.getElementById('dashboard-container').classList.remove('hidden');
      document.getElementById('cafe-name-display').textContent = this.cafe.name;
      this.loadDashboardData();
    } else {
      document.getElementById('auth-container').classList.remove('hidden');
      document.getElementById('dashboard-container').classList.add('hidden');
    }
  }

  async fetchProfile() {
    try {
      const response = await this.apiRequest('/api/auth/profile');

      if (response.ok) {
        const data = await response.json();
        this.cafe = data.cafe;
      } else {
        this.logout();
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      this.logout();
    }
  }

  async loadDashboardData() {
    await Promise.all([
      this.fetchMenuItems(),
      this.fetchQRCode()
    ]);
    this.updateStats();
    this.loadSettingsForm();
  }

  async fetchMenuItems() {
    try {
      const response = await this.apiRequest('/api/menu');

      if (response.ok) {
        const data = await response.json();
        this.menuItems = data.menuItems;
        this.renderMenuItems();
      }
    } catch (err) {
      console.error('Menu fetch error:', err);
    }
  }

  async fetchQRCode() {
    try {
      const response = await this.apiRequest('/api/qrcode');

      if (response.ok) {
        const data = await response.json();
        document.getElementById('qr-image').src = data.qrCode;
        document.getElementById('menu-url').value = data.menuUrl;
      }
    } catch (err) {
      console.error('QR fetch error:', err);
    }
  }

  updateStats() {
    const totalItems = this.menuItems.length;
    const categories = new Set(this.menuItems.map(item => item.category));
    const arReady = this.menuItems.filter(item => !item.is_processing).length;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-categories').textContent = categories.size;
    document.getElementById('ar-ready').textContent = arReady;
  }

  renderMenuItems() {
    const container = document.getElementById('menu-items-list');

    if (this.menuItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍽️</div>
          <h3>No menu items yet</h3>
          <p>Add your first menu item to get started</p>
          <button class="btn btn-primary" onclick="app.openItemModal()">Add Menu Item</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.menuItems.map(item => this.createMenuItemHTML(item)).join('');
  }

  createMenuItemHTML(item) {
    const rawImage = item.processed_image && !item.is_processing
      ? item.processed_image
      : item.original_image;
    const imageSrc = rawImage.startsWith('http') ? rawImage : `/${rawImage}`;

    const statusClass = item.is_processing ? 'processing' : 'ready';
    const statusText = item.is_processing ? 'Processing...' : 'AR Ready';

    return `
      <div class="menu-item-card" data-item-id="${item.id}">
        <div class="menu-item-image">
          <img src="${imageSrc}" alt="${this.escapeHtml(item.name)}">
        </div>
        <div class="menu-item-info">
          <h3>${this.escapeHtml(item.name)}</h3>
          <p>${this.escapeHtml(item.description || 'No description')}</p>
          <div class="menu-item-meta">
            <span class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</span>
            <span class="menu-item-category">${this.escapeHtml(item.category)}</span>
            <span class="menu-item-status ${statusClass}">${statusText}</span>
          </div>
        </div>
        <div class="menu-item-actions">
          <button class="btn-icon" onclick="app.editItem(${item.id})" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon delete" onclick="app.deleteItem(${item.id})" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  loadSettingsForm() {
    if (this.cafe) {
      document.getElementById('settings-name').value = this.cafe.name || '';
      document.getElementById('settings-description').value = this.cafe.description || '';
      document.getElementById('settings-slug').textContent = this.cafe.slug || '';
    }
  }

  switchPage(pageName) {
    this.currentPage = pageName;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // Update page title
    const titles = {
      overview: 'Overview',
      menu: 'Menu Items',
      qrcode: 'QR Code',
      settings: 'Settings'
    };
    document.getElementById('page-title').textContent = titles[pageName] || 'Dashboard';

    // Show correct page
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(`${pageName}-page`).classList.remove('hidden');

    // Close mobile menu
    document.querySelector('.sidebar').classList.remove('open');
  }

  openItemModal(item = null) {
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('item-form');

    if (item) {
      title.textContent = 'Edit Menu Item';
      document.getElementById('item-id').value = item.id;
      document.getElementById('item-name').value = item.name;
      document.getElementById('item-description').value = item.description || '';
      document.getElementById('item-price').value = item.price;
      document.getElementById('item-category').value = item.category;
      document.getElementById('item-image').removeAttribute('required');
    } else {
      title.textContent = 'Add Menu Item';
      form.reset();
      document.getElementById('item-id').value = '';
      document.getElementById('item-image').setAttribute('required', '');
    }

    // Reset image preview
    const preview = document.getElementById('image-preview');
    preview.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <p>Click to upload image</p>
    `;

    modal.classList.remove('hidden');
  }

  closeItemModal() {
    document.getElementById('item-modal').classList.add('hidden');
  }

  handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  }

  async handleItemSubmit(e) {
    e.preventDefault();

    const itemId = document.getElementById('item-id').value;
    const formData = new FormData();

    formData.append('name', document.getElementById('item-name').value);
    formData.append('description', document.getElementById('item-description').value);
    formData.append('price', document.getElementById('item-price').value);
    formData.append('category', document.getElementById('item-category').value || 'General');

    const imageFile = document.getElementById('item-image').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      let response;

      if (itemId) {
        // Update existing item
        response = await this.apiRequest(`/api/menu/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.get('name'),
            description: formData.get('description'),
            price: formData.get('price'),
            category: formData.get('category')
          })
        });
      } else {
        // Create new item
        response = await this.apiRequest('/api/menu/upload', {
          method: 'POST',
          body: formData
        });
      }

      if (response.ok) {
        this.showToast(itemId ? 'Item updated successfully!' : 'Item added! Processing image...', 'success');
        this.closeItemModal();
        await this.fetchMenuItems();
        this.updateStats();
      } else {
        const error = await response.json();
        this.showToast(error.error || 'Failed to save item', 'error');
      }
    } catch (err) {
      console.error('Item save error:', err);
      this.showToast('Failed to save item', 'error');
    }
  }

  editItem(itemId) {
    const item = this.menuItems.find(i => i.id === itemId);
    if (item) {
      this.openItemModal(item);
    }
  }

  async deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await this.apiRequest(`/api/menu/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.showToast('Item deleted', 'success');
        await this.fetchMenuItems();
        this.updateStats();
      } else {
        const error = await response.json();
        this.showToast(error.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      this.showToast('Failed to delete item', 'error');
    }
  }

  copyMenuUrl() {
    const urlInput = document.getElementById('menu-url');
    urlInput.select();
    document.execCommand('copy');
    this.showToast('URL copied to clipboard!', 'success');
  }

  async downloadQRCode() {
    try {
      const response = await this.apiRequest('/api/qrcode/download');

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.cafe.name.replace(/\s+/g, '-')}-qrcode.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Download error:', err);
      this.showToast('Failed to download QR code', 'error');
    }
  }

  async handleSettingsSave(e) {
    e.preventDefault();

    const name = document.getElementById('settings-name').value;
    const description = document.getElementById('settings-description').value;

    try {
      const response = await this.apiRequest('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });

      if (response.ok) {
        const data = await response.json();
        this.cafe = data.cafe;
        document.getElementById('cafe-name-display').textContent = this.cafe.name;
        this.showToast('Settings saved!', 'success');
      } else {
        const error = await response.json();
        this.showToast(error.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error('Settings save error:', err);
      this.showToast('Failed to save settings', 'error');
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.cafe = data.cafe;
        localStorage.setItem('token', this.token);
        this.updateUI();
        this.showToast('Welcome back!', 'success');
      } else {
        this.showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      this.showToast('Login failed. Please try again.', 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const description = document.getElementById('register-description').value;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, description })
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.cafe = data.cafe;
        localStorage.setItem('token', this.token);
        this.updateUI();
        this.showToast('Account created! Welcome to AR Cafe Menu!', 'success');
      } else {
        this.showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error('Register error:', err);
      this.showToast('Registration failed. Please try again.', 'error');
    }
  }

  handleLogout() {
    this.logout();
    this.showToast('Logged out successfully', 'success');
  }

  logout() {
    this.token = null;
    this.cafe = null;
    this.menuItems = [];
    localStorage.removeItem('token');
    this.updateUI();
  }

  async apiRequest(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.token}`
    };

    // Don't set Content-Type for FormData
    if (options.body && options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    return fetch(endpoint, {
      ...options,
      headers
    });
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app
const app = new DashboardApp();