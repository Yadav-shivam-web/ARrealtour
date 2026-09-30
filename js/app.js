/**
 * ============================================================================
 * AR-REALTOUR PLATFORM - MAIN APPLICATION CONTROLLER
 * Properties Catalog, Dynamic Filter/Search, 3D/AR Modals, and Tour Bookings
 * ============================================================================
 */

const App = {
  currentCategory: 'all',
  currentFilter: {
    location: '',
    type: 'all',
    maxPrice: 999999999,
    minBeds: 0
  },

  init() {
    this.renderProperties();
    this.initCategoryFilters();
    this.initSearchTabs();
    this.initSearchForm();
    this.initBookingModal();
    this.initPropertyDetailModal();
    this.initArchitectureModal();
    this.initNavigation();

    // Re-render when MongoDB properties are fetched
    window.addEventListener('db-ready', () => this.renderProperties());
    window.addEventListener('db-properties-updated', () => this.renderProperties());
  },

  /* ==========================================================================
     PROPERTIES RENDERING & FILTERING
     ========================================================================== */
  getFilteredProperties() {
    if (!window.DB) return [];
    let props = DB.getProperties();

    // Filter by Category tab
    if (this.currentCategory !== 'all') {
      props = props.filter(p => p.category === this.currentCategory);
    }

    // Filter by Search Form
    if (this.currentFilter.type !== 'all') {
      props = props.filter(p => p.category === this.currentFilter.type);
    }

    if (this.currentFilter.location) {
      const loc = this.currentFilter.location.toLowerCase();
      props = props.filter(p => 
        p.location.toLowerCase().includes(loc) || 
        p.title.toLowerCase().includes(loc) ||
        (p.address && p.address.toLowerCase().includes(loc))
      );
    }

    if (this.currentFilter.maxPrice) {
      props = props.filter(p => (p.price || 0) <= this.currentFilter.maxPrice);
    }

    if (this.currentFilter.minBeds > 0) {
      props = props.filter(p => (p.beds || 0) >= this.currentFilter.minBeds);
    }

    return props;
  },

  renderProperties() {
    const grid = document.getElementById('properties-grid');
    if (!grid) return;

    const properties = this.getFilteredProperties();

    if (properties.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(18, 26, 44, 0.4); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
          <i class="fa-solid fa-building-circle-xmark" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
          <h3 style="font-size: 1.4rem; color: #fff; margin-bottom: 8px;">No matching 3D properties found</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Try adjusting your filters or category tabs.</p>
          <button class="btn btn-primary" onclick="App.resetFilters()"><i class="fa-solid fa-rotate-left"></i> Reset All Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = properties.map(prop => `
      <div class="property-card" data-category="${prop.category}">
        <div class="property-img-box">
          <img src="${prop.image}" alt="${prop.title}" class="property-img" loading="lazy">
          <div class="property-badges">
            <span class="badge badge-3d"><i class="fa-solid fa-vr-cardboard"></i> 3D Tour</span>
            ${prop.arReady ? '<span class="badge badge-ar" style="background: rgba(168, 85, 247, 0.85);"><i class="fa-solid fa-expand"></i> WebXR AR</span>' : ''}
          </div>
          <div class="property-overlay-actions">
            <button class="btn-card-action" onclick="App.openPropertyDetails('${prop.id}')" title="Inspect Full Specifications">
              <i class="fa-solid fa-info"></i> View Details
            </button>
            <button class="btn-card-action" data-launch-ar="${prop.id}" title="Launch Augmented Reality">
              <i class="fa-solid fa-expand"></i> AR View
            </button>
          </div>
        </div>

        <div class="property-content">
          <div class="property-header">
            <h3 class="property-title" onclick="App.openPropertyDetails('${prop.id}')" style="cursor: pointer;">${prop.title}</h3>
            <p class="property-location"><i class="fa-solid fa-location-dot"></i> ${prop.location}</p>
          </div>

          <div class="property-specs">
            <div class="spec-item"><i class="fa-solid fa-bed"></i> <strong>${prop.beds}</strong> Beds</div>
            <div class="spec-item"><i class="fa-solid fa-bath"></i> <strong>${prop.baths}</strong> Baths</div>
            <div class="spec-item"><i class="fa-solid fa-ruler-combined"></i> <strong>${prop.sqft.toLocaleString()}</strong> sqft</div>
          </div>

          <div class="property-footer">
            <div class="property-price">
              <span class="price-label">Acquisition Price</span>
              <span class="price-val">${prop.priceFormatted || '$' + (prop.price || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" data-launch-ar="${prop.id}" title="Experience in Augmented Reality">
                <i class="fa-solid fa-expand"></i> AR
              </button>
              <button class="btn btn-primary btn-sm" onclick="App.openBookingModal('${prop.id}')">
                <i class="fa-solid fa-calendar-check"></i> Book Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  initCategoryFilters() {
    const filterBtns = document.querySelectorAll('.cat-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.getAttribute('data-category') || 'all';
        this.renderProperties();
      });
    });
  },

  initSearchTabs() {
    document.querySelectorAll('[data-search-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-search-category]').forEach(tab => tab.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.searchCategory;
        const typeSelect = document.getElementById('search-type');
        if (typeSelect) typeSelect.value = category;

        this.currentCategory = 'all';
        this.currentFilter.type = category;
        this.renderProperties();
      });
    });
  },

  initSearchForm() {
    const form = document.getElementById('hero-search-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const locInput = document.getElementById('search-location');
      const typeSelect = document.getElementById('search-type');
      const priceSelect = document.getElementById('search-price');
      const bedsSelect = document.getElementById('search-beds');

      this.currentFilter.location = locInput ? locInput.value.trim() : '';
      this.currentFilter.type = typeSelect ? typeSelect.value : 'all';
      this.currentFilter.maxPrice = priceSelect ? Number(priceSelect.value) : 999999999;
      this.currentFilter.minBeds = bedsSelect && bedsSelect.value !== 'all' ? Number(bedsSelect.value) : 0;
      this.currentCategory = 'all';

      const selectedCategory = this.currentFilter.type === 'all' ? null : this.currentFilter.type;
      document.querySelectorAll('[data-search-category]').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.searchCategory === selectedCategory);
      });

      this.renderProperties();

      const propsSection = document.getElementById('properties-section');
      if (propsSection) {
        propsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  },

  resetFilters() {
    this.currentCategory = 'all';
    this.currentFilter = { location: '', type: 'all', maxPrice: 999999999, minBeds: 0 };
    document.querySelectorAll('.cat-btn').forEach(b => {
      if (b.dataset.category === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });
    const form = document.getElementById('hero-search-form');
    if (form) form.reset();
    this.renderProperties();
  },

  /* ==========================================================================
     PROPERTY DETAILS MODAL WITH 3D LAUNCH & MORTGAGE CALCULATOR
     ========================================================================== */
  initPropertyDetailModal() {
    // Dynamic modal setup
    if (!document.getElementById('property-detail-modal')) {
      const modal = document.createElement('div');
      modal.id = 'property-detail-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-dialog property-detail-dialog">
          <button class="modal-close-btn" onclick="App.closePropertyDetails()"><i class="fa-solid fa-xmark"></i></button>
          
          <div class="prop-detail-header">
            <span class="badge badge-3d" id="pdetail-badge"><i class="fa-solid fa-vr-cardboard"></i> 3D Virtual Tour Ready</span>
            <h2 id="pdetail-title" style="font-size: 1.8rem; color: var(--text-main); margin: 6px 0;">Aura Bay Luxury Compact Studio</h2>
            <p id="pdetail-address" style="color: var(--text-muted); font-size: 0.95rem;"><i class="fa-solid fa-location-dot"></i> Bandra West, Mumbai</p>
          </div>

          <div class="prop-detail-gallery-hero">
            <img id="pdetail-hero-img" src="" alt="Property Feature" class="prop-detail-main-img">
            <div class="prop-gallery-thumbs" id="pdetail-thumbs"></div>
          </div>

          <div class="prop-detail-grid">
            <div class="prop-detail-main">
              <h3 style="font-size: 1.25rem; color: var(--text-main); margin-bottom: 12px;">Architectural Overview</h3>
              <p id="pdetail-desc" style="color: var(--text-muted); line-height: 1.7; margin-bottom: 24px;"></p>

              <h4 style="color: var(--text-main); margin-bottom: 14px;"><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> Key Specifications</h4>
              <div class="prop-specs-table-grid" id="pdetail-specs-grid"></div>

              <h4 style="color: var(--text-main); margin: 24px 0 14px;"><i class="fa-solid fa-gem" style="color: var(--accent-gold);"></i> Luxury Amenities</h4>
              <div class="prop-amenities-tags" id="pdetail-amenities"></div>

              <!-- Interactive Mortgage Estimator -->
              <div class="mortgage-calc-box">
                <h4><i class="fa-solid fa-calculator" style="color: var(--primary);"></i> Acquisition Estimator (Monthly EMI)</h4>
                <div style="display: flex; align-items: baseline; gap: 8px; margin: 8px 0 14px;">
                  <span style="font-size: 1.8rem; font-weight: 800; color: #db2777;" id="pdetail-monthly-est">₹1,24,500 / mo</span>
                  <span style="color: var(--text-muted); font-size: 0.85rem;">Est. 20% down, 20yr fixed @ 8.4%</span>
                </div>
              </div>
            </div>

            <div class="prop-detail-sidebar">
              <div class="prop-sidebar-price-card">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Acquisition Price</span>
                <h3 id="pdetail-price" style="font-size: 2rem; color: #db2777; font-weight: 800; margin: 4px 0 16px;">₹1.85 Cr</h3>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <button id="pdetail-btn-launch3d" class="btn btn-primary" style="text-align: center; width: 100%;">
                    <i class="fa-solid fa-vr-cardboard"></i> Launch in 3D Studio
                  </button>
                  <button id="pdetail-btn-ar" class="btn btn-secondary" style="text-align: center; width: 100%;">
                    <i class="fa-solid fa-expand"></i> Experience in AR
                  </button>
                  <button id="pdetail-btn-book" class="btn btn-primary" style="text-align: center; width: 100%;">
                    <i class="fa-solid fa-calendar-check"></i> Schedule VIP Tour
                  </button>
                </div>
              </div>

              <div class="prop-agent-card" id="pdetail-agent-box">
                <!-- Agent details populated dynamically -->
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  },

  openPropertyDetails(propId) {
    if (!window.DB) return;
    const prop = DB.getPropertyById(propId);
    if (!prop) return;

    const modal = document.getElementById('property-detail-modal');
    if (!modal) return;

    document.getElementById('pdetail-title').textContent = prop.title;
    document.getElementById('pdetail-address').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${prop.address || prop.location}`;
    document.getElementById('pdetail-price').textContent = prop.priceFormatted || '₹' + (prop.price||0).toLocaleString('en-IN');
    document.getElementById('pdetail-desc').textContent = prop.description;
    document.getElementById('pdetail-hero-img').src = prop.image;

    // Badge
    const badgeEl = document.getElementById('pdetail-badge');
    if (badgeEl) badgeEl.innerHTML = `<i class="fa-solid fa-vr-cardboard"></i> ${prop.badge || '3D Virtual Tour'}`;

    // Gallery Thumbs
    const thumbsContainer = document.getElementById('pdetail-thumbs');
    const gallery = prop.gallery || [prop.image];
    thumbsContainer.innerHTML = gallery.map(imgUrl => `
      <img src="${imgUrl}" class="prop-gallery-thumb" onclick="document.getElementById('pdetail-hero-img').src = '${imgUrl}'" alt="Gallery preview">
    `).join('');

    // Specs Grid
    const specsGrid = document.getElementById('pdetail-specs-grid');
    specsGrid.innerHTML = `
      <div class="spec-cell"><span>Scale / BHK</span><strong>${prop.beds} BHK (${prop.homeType || 'Luxury'})</strong></div>
      <div class="spec-cell"><span>Bathrooms</span><strong>${prop.baths} Baths</strong></div>
      <div class="spec-cell"><span>Living Area</span><strong>${prop.sqft.toLocaleString('en-IN')} SqFt</strong></div>
      <div class="spec-cell"><span>City Location</span><strong>${prop.city || prop.location}</strong></div>
      <div class="spec-cell"><span>Year Built</span><strong>${prop.yearBuilt || 2024}</strong></div>
      <div class="spec-cell"><span>3D Model ID</span><strong>${prop.modelId}</strong></div>
    `;

    // Amenities
    const amenitiesBox = document.getElementById('pdetail-amenities');
    const amList = prop.amenities || ['Smart Home', 'Italian Kitchen', 'Balcony Deck', 'Parking'];
    amenitiesBox.innerHTML = amList.map(a => `<span class="amenity-pill"><i class="fa-solid fa-check"></i> ${a}</span>`).join('');

    // Monthly estimate (Indian EMI estimation)
    const monthlyVal = Math.round((prop.price * 0.8 * 0.0075));
    document.getElementById('pdetail-monthly-est').textContent = `₹${monthlyVal.toLocaleString('en-IN')} / mo`;

    // Agent box
    const agentBox = document.getElementById('pdetail-agent-box');
    const agent = prop.agent || { name: 'Aarav Mehta', title: 'Mumbai Luxury Director', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' };
    agentBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <img src="${agent.avatar}" alt="${agent.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
        <div>
          <h4 style="color: var(--text-main); font-size: 0.95rem;">${agent.name}</h4>
          <span style="color: var(--text-muted); font-size: 0.8rem;">${agent.title}</span>
        </div>
      </div>
      <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
        <span><i class="fa-solid fa-phone" style="color: var(--primary);"></i> ${agent.phone || '+91 98200 12345'}</span>
        <span><i class="fa-solid fa-envelope" style="color: var(--primary);"></i> ${agent.email || 'concierge@arrealtour.in'}</span>
      </div>
    `;

    // Bind action buttons
    document.getElementById('pdetail-btn-launch3d').onclick = () => {
      this.launchPropertyIn3D(prop.id, prop.modelId);
    };

    document.getElementById('pdetail-btn-ar').onclick = () => {
      this.closePropertyDetails();
      if (window.AREngine) window.AREngine.openARModal(prop.id);
    };

    document.getElementById('pdetail-btn-book').onclick = () => {
      this.closePropertyDetails();
      this.openBookingModal(prop.id);
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  launchPropertyIn3D(propId, modelId) {
    this.closePropertyDetails();
    const targetModel = modelId || propId;
    if (window.Villa3D && window.Villa3D.loadPropertyModel) {
      window.Villa3D.loadPropertyModel(targetModel);
    }
    const tourSection = document.getElementById('tour-studio');
    if (tourSection) {
      tourSection.scrollIntoView({ behavior: 'smooth' });
    }
  },

  closePropertyDetails() {
    const modal = document.getElementById('property-detail-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* ==========================================================================
     BOOKING MODAL & INQUIRY SUBMISSION
     ========================================================================== */
  initBookingModal() {
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    if (!modal || !form) return;

    // Close button
    modal.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const propId = modal.getAttribute('data-prop-id') || 'prop-1';
      const propTitle = document.getElementById('booking-prop-name').textContent;
      const name = document.getElementById('book-name').value;
      const email = document.getElementById('book-email').value;
      const date = document.getElementById('book-date').value;
      const tourType = document.getElementById('book-tour-type').value;
      const notes = document.getElementById('book-notes').value;

      if (window.DB) {
        await DB.addInquiry({
          propertyId: propId,
          propertyTitle: propTitle,
          userName: name,
          userEmail: email,
          preferredDate: date,
          tourType: tourType === 'virtual-3d' ? 'Guided 3D Virtual Tour' : (tourType === 'vr-headset' ? 'Live WebXR AR Tour' : 'Private In-Person Viewing'),
          notes: notes
        });
      }

      alert(`Thank you, ${name}! Your VIP 3D Tour request for "${propTitle}" has been saved to MongoDB. An executive concierge agent will contact you shortly.`);
      form.reset();
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
  },

  openBookingModal(propId) {
    let prop = null;
    if (window.DB) prop = DB.getPropertyById(propId);
    if (!prop) {
      prop = { id: 'prop-1', title: 'The Solstice Glass Villa', priceFormatted: '$8,450,000' };
    }

    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    modal.setAttribute('data-prop-id', prop.id);
    document.getElementById('booking-prop-name').textContent = prop.title;
    document.getElementById('booking-prop-price').textContent = prop.priceFormatted || `$${(prop.price||0).toLocaleString()}`;
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('book-date');
    if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  /* ==========================================================================
     INTERACTIVE ARCHITECTURE BLUEPRINT MODAL
     (Replicates the exact Conceptual Model Diagram)
     ========================================================================== */
  initArchitectureModal() {
    if (!document.getElementById('arch-blueprint-modal')) {
      const modal = document.createElement('div');
      modal.id = 'arch-blueprint-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-dialog arch-modal-dialog">
          <button class="modal-close-btn" onclick="App.closeArchitectureModal()"><i class="fa-solid fa-xmark"></i></button>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span class="section-tag"><i class="fa-solid fa-diagram-project"></i> System Architecture</span>
            <h2 style="font-size: 1.8rem; color: #fff; margin: 4px 0 8px;">CONCEPTUAL MODEL &ndash; AR-REALTOUR</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem;">Interactive 3D &amp; AR Based Real Estate Visualization Platform</p>
          </div>

          <!-- Architecture Visual Diagram Grid -->
          <div class="arch-diagram-canvas">
            <!-- Left: USER -->
            <div class="arch-node-box arch-user-node">
              <div class="arch-node-header">
                <i class="fa-solid fa-users"></i>
                <h4>USER</h4>
              </div>
              <ul class="arch-node-list">
                <li><i class="fa-solid fa-house"></i> Browse Properties</li>
                <li><i class="fa-solid fa-cube"></i> View 3D Model</li>
                <li><i class="fa-solid fa-expand"></i> View in AR</li>
                <li><i class="fa-solid fa-list-check"></i> Property Details</li>
                <li><i class="fa-solid fa-envelope"></i> Contact / Inquiry</li>
              </ul>
              <div class="arch-node-action">
                <button class="btn btn-primary btn-sm" onclick="App.closeArchitectureModal(); window.location.href='#tour-studio';">Explore User Portal</button>
              </div>
            </div>

            <!-- Center: SYSTEM (AR-REALTOUR PLATFORM) -->
            <div class="arch-node-box arch-system-node">
              <div class="arch-system-badge">
                <i class="fa-solid fa-server"></i>
                <h4>SYSTEM (AR-REALTOUR PLATFORM)</h4>
              </div>

              <div class="arch-modules-grid">
                <div class="arch-module-chip">
                  <i class="fa-solid fa-window-maximize"></i>
                  <span>User Interface Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-list-ul"></i>
                  <span>Property Listing Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-house-chimney"></i>
                  <span>Property Details Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-cube"></i>
                  <span>3D Visualization Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-expand"></i>
                  <span>Augmented Reality Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-user-check"></i>
                  <span>User / Inquiry Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-shield-halved"></i>
                  <span>Admin Module</span>
                </div>
                <div class="arch-module-chip">
                  <i class="fa-solid fa-database"></i>
                  <span>Database Module</span>
                </div>
              </div>

              <!-- External Tech Badges -->
              <div class="arch-tech-bar">
                <span class="tech-chip"><i class="fa-brands fa-react"></i> React / JS</span>
                <span class="tech-chip"><i class="fa-solid fa-cube"></i> Three.js</span>
                <span class="tech-chip"><i class="fa-solid fa-vr-cardboard"></i> WebXR</span>
                <span class="tech-chip"><i class="fa-brands fa-node-js"></i> Node (Express)</span>
                <span class="tech-chip"><i class="fa-solid fa-file-code"></i> .glb / .gltf</span>
              </div>
            </div>

            <!-- Right: ADMIN -->
            <div class="arch-node-box arch-admin-node">
              <div class="arch-node-header" style="background: rgba(168, 85, 247, 0.2); color: #d8b4fe;">
                <i class="fa-solid fa-user-gear"></i>
                <h4>ADMIN</h4>
              </div>
              <ul class="arch-node-list">
                <li><i class="fa-solid fa-plus-circle"></i> Add / Edit Properties</li>
                <li><i class="fa-solid fa-vr-cardboard"></i> Manage 3D Models</li>
                <li><i class="fa-solid fa-users-gear"></i> Manage Users</li>
                <li><i class="fa-solid fa-envelope-open"></i> Manage Inquiries</li>
                <li><i class="fa-solid fa-chart-pie"></i> Reports &amp; Analytics</li>
              </ul>
              <div class="arch-node-action">
                <a href="admin.html" class="btn btn-secondary btn-sm" style="background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); color:#fff;">Open Admin Portal</a>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  },

  openArchitectureModal() {
    const modal = document.getElementById('arch-blueprint-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeArchitectureModal() {
    const modal = document.getElementById('arch-blueprint-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* ==========================================================================
     TOP NAVIGATION & AUTH BADGE
     ========================================================================== */
  initNavigation() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }

    // Check user session
    const rawUser = localStorage.getItem('villa3d_user') || sessionStorage.getItem('villa3d_user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        const authBtns = document.getElementById('nav-auth-buttons');
        const userBadge = document.getElementById('nav-user-badge');
        const avatar = document.getElementById('nav-user-avatar');
        const name = document.getElementById('nav-user-name');

        if (authBtns) authBtns.style.display = 'none';
        if (userBadge) userBadge.style.display = 'flex';
        if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
        if (name) name.textContent = user.name;

        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('villa3d_user');
            localStorage.removeItem('villa3d_token');
            sessionStorage.removeItem('villa3d_user');
            sessionStorage.removeItem('villa3d_token');
            window.location.reload();
          });
        }
      } catch (e) {}
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
