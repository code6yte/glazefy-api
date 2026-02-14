// AR Cafe Menu - Client Side JavaScript

class ARMenuApp {
  constructor() {
    this.cafe = null;
    this.menuItems = [];
    this.categories = [];
    this.activeCategory = 'all';
    this.currentItem = null;

    this.init();
  }

  async init() {
    const slug = this.getSlugFromUrl();

    if (!slug) {
      this.showError('Invalid menu URL');
      return;
    }

    await this.fetchMenu(slug);
    this.setupEventListeners();
  }

  getSlugFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/menu\/([^\/]+)/);
    return match ? match[1] : null;
  }

  async fetchMenu(slug) {
    try {
      const response = await fetch(`/api/menu/public/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          this.showError('Cafe not found');
        } else {
          this.showError('Failed to load menu');
        }
        return;
      }

      const data = await response.json();
      this.cafe = data.cafe;
      this.menuItems = data.menuItems;
      this.categories = this.extractCategories(data.menuItems);

      this.render();
    } catch (err) {
      console.error('Fetch error:', err);
      this.showError('Failed to connect to server');
    }
  }

  extractCategories(items) {
    const cats = new Set();
    items.forEach(item => cats.add(item.category));
    return ['all', ...Array.from(cats)];
  }

  showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
  }

  render() {
    // Hide loading, show content
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('menu-content').classList.remove('hidden');

    // Render cafe info
    document.getElementById('cafe-name').textContent = this.cafe.name;
    document.getElementById('cafe-description').textContent = this.cafe.description || '';

    // Render categories
    this.renderCategories();

    // Render menu items
    this.renderMenuItems();
  }

  renderCategories() {
    const container = document.getElementById('category-tabs');

    container.innerHTML = this.categories.map(cat => `
      <button class="category-tab ${cat === this.activeCategory ? 'active' : ''}" data-category="${cat}">
        ${cat === 'all' ? 'All Items' : cat}
      </button>
    `).join('');
  }

  renderMenuItems() {
    const container = document.getElementById('menu-grid');
    const filteredItems = this.activeCategory === 'all'
      ? this.menuItems
      : this.menuItems.filter(item => item.category === this.activeCategory);

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍽️</div>
          <h3>No menu items yet</h3>
          <p>Check back soon for delicious offerings!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredItems.map(item => this.createMenuItemCard(item)).join('');
  }

  createMenuItemCard(item) {
    const rawImg = item.processed_image && !item.is_processing
      ? item.processed_image
      : item.original_image;
    const imageSrc = rawImg.startsWith('http') ? rawImg : `/${rawImg}`;

    const badge = item.is_processing
      ? '<span class="processing-badge">Processing...</span>'
      : '<span class="ar-badge">AR Ready</span>';

    return `
      <article class="menu-card" data-item-id="${item.id}">
        <div class="menu-card-image">
          <img src="${imageSrc}" alt="${item.name}" loading="lazy">
          ${badge}
        </div>
        <div class="menu-card-info">
          <h3>${this.escapeHtml(item.name)}</h3>
          <p>${this.escapeHtml(item.description || '')}</p>
          <div class="menu-card-footer">
            <span class="menu-card-price">$${parseFloat(item.price).toFixed(2)}</span>
            <button class="view-ar-btn" data-item-id="${item.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              View in AR
            </button>
          </div>
        </div>
      </article>
    `;
  }

  setupEventListeners() {
    // Category tabs
    document.getElementById('category-tabs').addEventListener('click', (e) => {
      if (e.target.classList.contains('category-tab')) {
        this.activeCategory = e.target.dataset.category;
        this.renderCategories();
        this.renderMenuItems();
      }
    });

    // Menu card clicks
    document.getElementById('menu-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.menu-card');
      const arBtn = e.target.closest('.view-ar-btn');

      if (arBtn || card) {
        const itemId = arBtn ? arBtn.dataset.itemId : card.dataset.itemId;
        const item = this.menuItems.find(i => i.id == itemId);
        if (item) {
          this.openARModal(item);
        }
      }
    });

    // AR Modal
    document.getElementById('ar-close').addEventListener('click', () => this.closeARModal());
    document.getElementById('ar-modal').addEventListener('click', (e) => {
      if (e.target.id === 'ar-modal') this.closeARModal();
    });

    // AR Controls
    document.getElementById('ar-fullscreen').addEventListener('click', () => this.openFullscreenAR());
    document.getElementById('ar-place').addEventListener('click', () => this.openFullscreenAR());

    // Fullscreen AR
    document.getElementById('fullscreen-close').addEventListener('click', () => this.closeFullscreenAR());
    document.getElementById('fullscreen-ar').addEventListener('click', (e) => {
      if (e.target.id === 'fullscreen-ar') this.closeFullscreenAR();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeFullscreenAR();
        this.closeARModal();
      }
    });
  }

  openARModal(item) {
    this.currentItem = item;

    const rawImg2 = item.processed_image && !item.is_processing
      ? item.processed_image
      : item.original_image;
    const imageSrc = rawImg2.startsWith('http') ? rawImg2 : `/${rawImg2}`;

    document.getElementById('ar-item-name').textContent = item.name;
    document.getElementById('ar-item-price').textContent = `$${parseFloat(item.price).toFixed(2)}`;
    document.getElementById('ar-item-description').textContent = item.description || '';
    document.getElementById('ar-image').src = imageSrc;

    document.getElementById('ar-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeARModal() {
    document.getElementById('ar-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  openFullscreenAR() {
    if (!this.currentItem) return;

    const rawImg3 = this.currentItem.processed_image && !this.currentItem.is_processing
      ? this.currentItem.processed_image
      : this.currentItem.original_image;
    const imageSrc = rawImg3.startsWith('http') ? rawImg3 : `/${rawImg3}`;

    document.getElementById('fullscreen-image').src = imageSrc;
    document.getElementById('fullscreen-name').textContent = this.currentItem.name;
    document.getElementById('fullscreen-price').textContent = `$${parseFloat(this.currentItem.price).toFixed(2)}`;

    document.getElementById('fullscreen-ar').classList.remove('hidden');
    this.closeARModal();
  }

  closeFullscreenAR() {
    document.getElementById('fullscreen-ar').classList.add('hidden');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ARMenuApp();
});