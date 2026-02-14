// Glazefy AR Menu — Customer-facing
// Uses the new category-grouped public API + model-viewer for real AR

class ARMenuApp {
  constructor() {
    this.cafe = null;
    this.categories = []; // Array of { id, name, icon, items: [] }
    this.allItems = [];
    this.currentItem = null;
    this.init();
  }

  async init() {
    const slug = this.getSlug();
    if (!slug) return this.showError('Invalid menu URL');
    await this.fetchMenu(slug);
    this.setupListeners();
  }

  getSlug() {
    const m = window.location.pathname.match(/\/menu\/([^/]+)/);
    return m ? m[1] : null;
  }

  // ─── Fetch menu (grouped by category) ───

  async fetchMenu(slug) {
    try {
      const res = await fetch(`/api/menu/public/${slug}`);
      if (!res.ok) return this.showError(res.status === 404 ? 'Business not found' : 'Failed to load menu');

      const data = await res.json();
      this.cafe = data.cafe;
      this.categories = data.categories || [];
      this.allItems = this.categories.flatMap(c => c.items || []);

      this.render();
    } catch (err) {
      console.error(err);
      this.showError('Failed to connect to server');
    }
  }

  showError(msg) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = msg;
  }

  // ─── Render ───

  render() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('menu-content').classList.remove('hidden');

    // Header
    document.getElementById('cafe-name').textContent = this.cafe.name;
    document.getElementById('cafe-description').textContent = this.cafe.description || '';
    document.title = `${this.cafe.name} — Glazefy`;

    // Category pills (scrollable)
    this.renderCategoryNav();

    // Menu sections grouped by category
    this.renderSections();
  }

  renderCategoryNav() {
    const nav = document.getElementById('category-nav');
    if (this.categories.length <= 1) {
      nav.classList.add('hidden');
      return;
    }

    nav.innerHTML = this.categories.map(cat => `
      <a href="#cat-${cat.id || 'other'}" class="cat-pill">
        ${cat.icon ? `<span class="cat-icon">${cat.icon}</span>` : ''}
        <span>${this.esc(cat.name)}</span>
        <span class="cat-count">${(cat.items || []).length}</span>
      </a>
    `).join('');
  }

  renderSections() {
    const main = document.getElementById('menu-sections');
    const noItems = this.allItems.length === 0;

    if (noItems) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🍽️</div>
          <h3>Menu coming soon!</h3>
          <p>Check back shortly for products.</p>
        </div>`;
      return;
    }

    main.innerHTML = this.categories.map(cat => {
      const items = cat.items || [];
      if (items.length === 0) return '';

      return `
        <section class="menu-section" id="cat-${cat.id || 'other'}">
          <div class="section-header">
            ${cat.icon ? `<span class="section-icon">${cat.icon}</span>` : ''}
            <div>
              <h2 class="section-title">${this.esc(cat.name)}</h2>
              ${cat.description ? `<p class="section-desc">${this.esc(cat.description)}</p>` : ''}
            </div>
          </div>
          <div class="items-grid">
            ${items.map(item => this.renderCard(item, cat.name)).join('')}
          </div>
        </section>`;
    }).join('');
  }

  renderCard(item, categoryName) {
    const img = this.getImageUrl(item);
    const has3D = !!item.model_3d_url;
    const processing = item.is_processing;

    return `
      <article class="item-card" data-id="${item.id}">
        <div class="card-image">
          ${img ? `<img src="${img}" alt="${this.esc(item.name)}" loading="lazy">` : '<div class="no-img">📷</div>'}
          ${has3D ? '<span class="badge-3d">3D</span>' : ''}
          ${processing ? '<span class="badge-processing">⏳</span>' : ''}
        </div>
        <div class="card-body">
          <h3 class="card-title">${this.esc(item.name)}</h3>
          ${item.description ? `<p class="card-desc">${this.esc(item.description)}</p>` : ''}
          <div class="card-footer">
            <span class="card-price">$${parseFloat(item.price).toFixed(2)}</span>
            ${has3D
        ? '<button class="ar-btn" data-id="' + item.id + '">📱 View in AR</button>'
        : '<button class="preview-btn" data-id="' + item.id + '">👁️ Preview</button>'
      }
          </div>
        </div>
      </article>`;
  }

  getImageUrl(item) {
    const raw = item.processed_image && !item.is_processing ? item.processed_image : item.original_image;
    if (!raw) return null;
    return raw.startsWith('http') ? raw : `/${raw}`;
  }

  // ─── Event Listeners ───

  setupListeners() {
    // Card clicks
    document.getElementById('menu-sections').addEventListener('click', (e) => {
      const btn = e.target.closest('.ar-btn, .preview-btn');
      const card = e.target.closest('.item-card');
      const id = btn ? btn.dataset.id : (card ? card.dataset.id : null);

      if (id) {
        const item = this.allItems.find(i => String(i.id) === String(id));
        if (item) this.openDetail(item);
      }
    });

    // Close modal
    document.getElementById('modal-close').addEventListener('click', () => this.closeDetail());
    document.getElementById('ar-modal').addEventListener('click', (e) => {
      if (e.target.id === 'ar-modal') this.closeDetail();
    });

    // Launch AR from detail
    document.getElementById('launch-ar-btn').addEventListener('click', () => {
      const mv = document.getElementById('model-viewer');
      if (mv && mv.canActivateAR) {
        mv.activateAR();
      } else {
        alert('AR is not supported on this device/browser. Try Chrome on Android or Safari on iOS.');
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDetail();
    });
  }

  // ─── Detail Modal ───

  openDetail(item) {
    this.currentItem = item;
    const has3D = !!item.model_3d_url;
    const img = this.getImageUrl(item);

    // Find category name
    let catName = 'Uncategorized';
    for (const cat of this.categories) {
      if ((cat.items || []).some(i => i.id === item.id)) {
        catName = cat.name;
        break;
      }
    }

    // Item info
    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-description').textContent = item.description || '';
    document.getElementById('detail-price').textContent = `$${parseFloat(item.price).toFixed(2)}`;
    document.getElementById('detail-category').textContent = catName;

    // 3D viewer
    const viewer3d = document.getElementById('viewer-3d');
    const viewerImg = document.getElementById('viewer-image');

    if (has3D) {
      const mv = document.getElementById('model-viewer');
      mv.src = item.model_3d_url;
      // If there's a poster image, set it
      if (img) mv.poster = img;
      viewer3d.classList.remove('hidden');
      viewerImg.classList.add('hidden');
      document.getElementById('launch-ar-btn').classList.remove('hidden');
      document.getElementById('no-ar-badge').classList.add('hidden');
    } else {
      viewer3d.classList.add('hidden');
      viewerImg.classList.remove('hidden');
      document.getElementById('detail-image').src = img || '';
      document.getElementById('launch-ar-btn').classList.add('hidden');
      document.getElementById('no-ar-badge').classList.remove('hidden');
    }

    // Show modal
    document.getElementById('ar-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeDetail() {
    document.getElementById('ar-modal').classList.add('hidden');
    document.body.style.overflow = '';
    // Stop model-viewer loading
    const mv = document.getElementById('model-viewer');
    if (mv) mv.src = '';
  }

  esc(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => new ARMenuApp());