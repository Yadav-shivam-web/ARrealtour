/**
 * ============================================================================
 * AR-REALTOUR - VIP USER PANEL CONTROLLER
 * Embedded 3D Walkthrough Studio, AR WebXR Launcher, Bookings & Concierge Chat
 * ============================================================================
 */

const UserPanel = {
  currentUser: null,
  currentTab: 'overview',
  user3DScene: null,
  user3DCamera: null,
  user3DRenderer: null,
  user3DControls: null,
  userVillaGroup: null,

  async init() {
    const rawUser = localStorage.getItem('villa3d_user') || sessionStorage.getItem('villa3d_user');
    const token = localStorage.getItem('villa3d_token') || sessionStorage.getItem('villa3d_token');

    if (!rawUser || !token) {
      window.location.replace('login.html');
      return;
    }

    try {
      const response = await fetch(`${DB.API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Session expired');

      const data = await response.json();
      if (data.user.role === 'admin') {
        window.location.replace('admin.html');
        return;
      }
      if (data.user.role !== 'user') throw new Error('Invalid account role');

      this.currentUser = { ...data.user, token };
    } catch (error) {
      localStorage.removeItem('villa3d_user');
      localStorage.removeItem('villa3d_token');
      sessionStorage.removeItem('villa3d_user');
      sessionStorage.removeItem('villa3d_token');
      window.location.replace('login.html');
      return;
    }

    this.loadUserData();
    this.renderKPIs();
    this.renderUpcomingBookings();
    this.renderAllBookings();
    this.renderSavedEstates();
    this.renderBrowseCatalog();
    this.initEmbedded3D();

    // Listen for MongoDB synchronization
    window.addEventListener('db-ready', () => {
      this.renderKPIs();
      this.renderUpcomingBookings();
      this.renderAllBookings();
      this.renderSavedEstates();
      this.renderBrowseCatalog();
    });
    window.addEventListener('db-properties-updated', () => {
      this.renderSavedEstates();
      this.renderBrowseCatalog();
    });
  },

  /* ==========================================================================
     USER DATA & SESSION
     ========================================================================== */
  loadUserData() {
    const storage = localStorage.getItem('villa3d_user') ? localStorage : sessionStorage;
    storage.setItem('villa3d_user', JSON.stringify(this.currentUser));

    // Update UI elements
    const nameEls = document.querySelectorAll('.bind-user-name');
    nameEls.forEach(el => el.textContent = this.currentUser.name);

    const firstNames = document.querySelectorAll('.bind-user-firstname');
    firstNames.forEach(el => el.textContent = this.currentUser.name.split(' ')[0]);

    const emailEls = document.querySelectorAll('.bind-user-email');
    emailEls.forEach(el => el.textContent = this.currentUser.email);

    const roleEls = document.querySelectorAll('.bind-user-role');
    roleEls.forEach(el => el.textContent = this.currentUser.roleLabel || 'VIP Buyer');

    const avatarEls = document.querySelectorAll('.bind-user-avatar');
    avatarEls.forEach(el => el.src = this.currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');

    // Profile form inputs
    const pName = document.getElementById('prof-input-name');
    const pEmail = document.getElementById('prof-input-email');
    const pPhone = document.getElementById('prof-input-phone');
    if (pName) pName.value = this.currentUser.name;
    if (pEmail) pEmail.value = this.currentUser.email;
    if (pPhone) pPhone.value = this.currentUser.phone || '+1 (415) 555-8901';
  },

  logout() {
    localStorage.removeItem('villa3d_user');
    localStorage.removeItem('villa3d_token');
    sessionStorage.removeItem('villa3d_user');
    sessionStorage.removeItem('villa3d_token');
    window.location.href = 'login.html';
  },

  /* ==========================================================================
     TAB NAVIGATION SYSTEM
     ========================================================================== */
  switchTab(tabId) {
    this.currentTab = tabId;

    // Update nav links
    document.querySelectorAll('.user-nav-link').forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update sections
    document.querySelectorAll('.user-tab-content').forEach(section => {
      section.classList.remove('active');
    });

    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    const titleMap = {
      overview: 'VIP Client Dashboard',
      studio3d: '3D Virtual Walkthrough Studio',
      browse: 'Browse 3D Properties Portfolio',
      bookings: 'My Scheduled Tours & Inquiries',
      saved: 'My Saved & Bookmarked Estates',
      customizer: '3D Interior Space Customizer',
      chat: 'Direct VIP Concierge Messages',
      profile: 'Account Settings & Preferences'
    };

    const topTitle = document.getElementById('user-topbar-title');
    if (topTitle) topTitle.textContent = titleMap[tabId] || 'VIP Portal';

    if (tabId === 'studio3d') {
      setTimeout(() => this.on3DResize(), 50);
    }
  },

  /* ==========================================================================
     DASHBOARD KPIS & BOOKINGS
     ========================================================================== */
  renderKPIs() {
    if (!window.DB) return;
    const inqs = DB.getInquiries();
    const userInqs = inqs.filter(i => 
      (this.currentUser && i.userEmail === this.currentUser.email) || i.userName.includes('Alex')
    );

    const bookingCounter = document.getElementById('user-kpi-bookings');
    if (bookingCounter) bookingCounter.textContent = `${userInqs.length || 2} Booked`;

    const navBookingCount = document.getElementById('nav-booking-badge');
    if (navBookingCount) navBookingCount.textContent = userInqs.length || 2;
  },

  renderUpcomingBookings() {
    const tbody = document.getElementById('user-upcoming-tbody');
    if (!tbody || !window.DB) return;

    const inqs = DB.getInquiries().slice(0, 3);
    tbody.innerHTML = inqs.map(i => `
      <tr>
        <td><strong>${i.propertyTitle}</strong></td>
        <td><i class="fa-solid fa-cube" style="color:var(--user-accent-cyan);"></i> ${i.tourType}</td>
        <td>${i.preferredDate}</td>
        <td>${i.assignedAgent || 'Elena Rostova'}</td>
        <td><span class="status-pill status-${i.status.toLowerCase().replace(' ', '')}">${i.status}</span></td>
      </tr>
    `).join('');
  },

  renderAllBookings() {
    const tbody = document.getElementById('user-all-bookings-tbody');
    if (!tbody || !window.DB) return;

    const inqs = DB.getInquiries();
    tbody.innerHTML = inqs.map(i => `
      <tr>
        <td><strong>${i.propertyTitle}</strong></td>
        <td><i class="fa-solid fa-vr-cardboard" style="color:var(--user-accent-cyan);"></i> ${i.tourType}</td>
        <td>${i.preferredDate}</td>
        <td>${i.assignedAgent || 'Elena Rostova'}</td>
        <td><span class="status-pill status-${i.status.toLowerCase().replace(' ', '')}">${i.status}</span></td>
        <td>
          <button class="btn-user-action" style="padding: 4px 10px; font-size: 0.78rem;" onclick="UserPanel.cancelBooking('${i.id}')">
            <i class="fa-solid fa-ban" style="color:var(--user-accent-rose);"></i> Cancel
          </button>
        </td>
      </tr>
    `).join('');
  },

  async cancelBooking(id) {
    if (confirm('Are you sure you want to cancel this scheduled tour?')) {
      if (window.DB) {
        await DB.deleteInquiry(id);
        if (DB.fetchInquiries) await DB.fetchInquiries();
      }
      this.showToast('Tour booking cancelled.');
      this.renderKPIs();
      this.renderUpcomingBookings();
      this.renderAllBookings();
    }
  },

  /* ==========================================================================
     SAVED ESTATES & CATALOG
     ========================================================================== */
  renderSavedEstates() {
    const grid = document.getElementById('user-saved-grid');
    if (!grid || !window.DB) return;

    const props = DB.getProperties().slice(0, 3);
    grid.innerHTML = props.map(p => `
      <div class="user-prop-card">
        <div class="user-prop-img-box">
          <img src="${p.image}" alt="${p.title}" class="user-prop-img">
          <div class="user-prop-badge-wrap">
            <span class="badge badge-3d"><i class="fa-solid fa-vr-cardboard"></i> 3D Ready</span>
          </div>
        </div>
        <div class="user-prop-body">
          <h3>${p.title}</h3>
          <p><i class="fa-solid fa-location-dot"></i> ${p.location}</p>
          <div class="user-prop-specs-row">
            <span><strong>${p.beds}</strong> Beds</span> &bull;
            <span><strong>${p.baths}</strong> Baths</span> &bull;
            <span><strong>${p.sqft.toLocaleString()}</strong> sqft</span>
          </div>
          <div class="user-prop-footer">
            <span class="user-prop-price-val">${p.priceFormatted}</span>
            <div style="display:flex; gap:8px;">
              <button class="btn-user-action btn-user-primary" onclick="UserPanel.launchStudioWithProp('${p.id}')">
                <i class="fa-solid fa-cube"></i> View 3D
              </button>
              <button class="btn-user-action" onclick="UserPanel.launchAR('${p.id}')" title="AR View">
                <i class="fa-solid fa-expand"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderBrowseCatalog() {
    const grid = document.getElementById('user-browse-grid');
    if (!grid || !window.DB) return;

    const props = DB.getProperties();
    grid.innerHTML = props.map(p => `
      <div class="user-prop-card">
        <div class="user-prop-img-box">
          <img src="${p.image}" alt="${p.title}" class="user-prop-img">
          <div class="user-prop-badge-wrap">
            <span class="badge badge-3d"><i class="fa-solid fa-vr-cardboard"></i> 3D Tour</span>
            <span class="badge" style="background: rgba(168,85,247,0.85);"><i class="fa-solid fa-expand"></i> AR</span>
          </div>
        </div>
        <div class="user-prop-body">
          <h3>${p.title}</h3>
          <p><i class="fa-solid fa-location-dot"></i> ${p.location}</p>
          <div class="user-prop-specs-row">
            <span><strong>${p.beds}</strong> Beds</span> &bull;
            <span><strong>${p.baths}</strong> Baths</span> &bull;
            <span><strong>${p.sqft.toLocaleString()}</strong> sqft</span>
          </div>
          <div class="user-prop-footer">
            <span class="user-prop-price-val">${p.priceFormatted}</span>
            <div style="display:flex; gap:8px;">
              <button class="btn-user-action btn-user-primary" onclick="UserPanel.launchStudioWithProp('${p.id}')">
                <i class="fa-solid fa-cube"></i> 3D Tour
              </button>
              <button class="btn-user-action" onclick="UserPanel.launchAR('${p.id}')">
                <i class="fa-solid fa-expand"></i> AR
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  /* ==========================================================================
     EMBEDDED THREE.JS 3D STUDIO IN USER PANEL
     ========================================================================== */
  initEmbedded3D() {
    const canvas = document.getElementById('user-studio-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 500;

    this.user3DScene = new THREE.Scene();
    this.user3DScene.background = new THREE.Color('#f8fafc');

    this.user3DCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.user3DCamera.position.set(38, 22, 42);

    this.user3DRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.user3DRenderer.setSize(width, height);
    this.user3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (THREE.OrbitControls) {
      this.user3DControls = new THREE.OrbitControls(this.user3DCamera, this.user3DRenderer.domElement);
      this.user3DControls.enableDamping = true;
      this.user3DControls.dampingFactor = 0.05;
      this.user3DControls.autoRotate = true;
      this.user3DControls.autoRotateSpeed = 0.8;
      this.user3DControls.target.set(0, 5, 0);
    }

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    this.user3DScene.add(amb);

    const sun = new THREE.DirectionalLight(0xfffaed, 2.0);
    sun.position.set(45, 60, 35);
    this.user3DScene.add(sun);

    // Build Luxury Indian Real Estate Geometry
    this.buildVillaGeometry('model-mumbai');

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (this.user3DControls) this.user3DControls.update();
      this.user3DRenderer.render(this.user3DScene, this.user3DCamera);
    };
    animate();

    window.addEventListener('resize', () => this.on3DResize());
  },

  buildVillaGeometry(modelId = 'model-mumbai') {
    if (this.userVillaGroup) {
      this.user3DScene.remove(this.userVillaGroup);
    }
    this.userVillaGroup = new THREE.Group();

    // Material definitions
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xdfd7ca, roughness: 0.2, metalness: 0.1 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.5 });
    const wallWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.35, roughness: 0.1 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }); // Royal Blue
    const emeraldSofaMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 }); // Emerald
    const woodFurnitureMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4 });
    const kitchenMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.05, metalness: 0.85 });

    let titleText = 'Aura Bay Luxury Compact Studio • Bandra West, Mumbai (₹1.85 Cr)';

    if (modelId === 'model-mumbai' || modelId === 'prop-1') {
      titleText = 'Aura Bay Luxury Compact Studio • Bandra West, Mumbai (₹1.85 Cr)';
      // Base Floor
      const base = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 15), woodFloorMat);
      base.position.set(0, -0.2, 0);
      this.userVillaGroup.add(base);

      // Glass Enclosure
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(22, 5, 0.2), glassMat);
      glassFront.position.set(0, 2.5, 7.5);
      this.userVillaGroup.add(glassFront);

      // Back & Side Walls
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 5, 0.3), wallWhiteMat);
      backWall.position.set(0, 2.5, -7.5);
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 15), wallWhiteMat);
      leftWall.position.set(-11, 2.5, 0);
      this.userVillaGroup.add(backWall, leftWall);

      // Living Room Sofa & Coffee Table
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 2.2), sofaMat);
      sofa.position.set(-5, 0.6, 2);
      const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1.5), woodFurnitureMat);
      table.position.set(-5, 0.25, 4.5);
      this.userVillaGroup.add(sofa, table);

      // Kitchen Island
      const island = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.5, 1.8), kitchenMat);
      island.position.set(-6, 0.75, -4.5);
      this.userVillaGroup.add(island);

      // Glass Partition & Bedroom
      const part = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 8), glassMat);
      part.position.set(2, 2.25, -3.5);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1, 5.5), bedMat);
      bed.position.set(6.5, 0.5, -4);
      this.userVillaGroup.add(part, bed);

      // Balcony
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 3), woodFloorMat);
      balcony.position.set(6, -0.15, 8.5);
      this.userVillaGroup.add(balcony);

    } else if (modelId === 'model-pune' || modelId === 'prop-2') {
      titleText = 'Gulmohar Green Compact Haven • Koregaon Park, Pune (₹78 Lakh)';
      // Base Floor
      const base = new THREE.Mesh(new THREE.BoxGeometry(25, 0.4, 18), woodFloorMat);
      base.position.set(0, -0.2, 0);
      this.userVillaGroup.add(base);

      // Glass curtain front
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(25, 5.5, 0.2), glassMat);
      glassFront.position.set(0, 2.75, 9);
      this.userVillaGroup.add(glassFront);

      // Living Emerald Sofa
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(6, 1.3, 2.4), emeraldSofaMat);
      sofa.position.set(-6, 0.65, 3);
      this.userVillaGroup.add(sofa);

      // 4-Seater Dining Set
      const diningTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.2), woodFurnitureMat);
      diningTable.position.set(-5.5, 0.6, -4);
      this.userVillaGroup.add(diningTable);

      // 2 Bedrooms
      const bed1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 5.2), bedMat);
      bed1.position.set(6.5, 0.55, -4.5);
      const bed2 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 4.8), bedMat);
      bed2.position.set(7, 0.5, 4);
      this.userVillaGroup.add(bed1, bed2);

      // Green Planters
      const planter = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x166534 }));
      planter.position.set(0, 0.4, 9.5);
      this.userVillaGroup.add(planter);

    } else if (modelId === 'model-delhi' || modelId === 'prop-3') {
      titleText = 'Rajvilas Grand Imperial Manor • Vasant Vihar, New Delhi (₹14.50 Cr)';
      // Ground Marble Floor
      const base = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 24), floorMat);
      base.position.set(0, -0.25, 0);
      this.userVillaGroup.add(base);

      // Double-height Glass Atrium
      const atrium = new THREE.Mesh(new THREE.BoxGeometry(32, 9, 0.2), glassMat);
      atrium.position.set(0, 4.5, 12);
      this.userVillaGroup.add(atrium);

      // Swarovski Chandelier
      const chand = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.5, 2.5, 12), goldMat);
      chand.position.set(0, 6.5, 0);
      this.userVillaGroup.add(chand);

      // Royal Blue Grand Sectional
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 3), sofaMat);
      sofa.position.set(-7, 0.7, 4);
      this.userVillaGroup.add(sofa);

      // 8-Seater Banquet Dining Table
      const dining = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 3), woodFurnitureMat);
      dining.position.set(7, 0.6, 4);
      this.userVillaGroup.add(dining);

      // Upper Floor Gallery
      const upperGallery = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 10), floorMat);
      upperGallery.position.set(0, 4.8, -5);
      this.userVillaGroup.add(upperGallery);

      // Master Bedrooms Upstairs
      const masterBed1 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 6), bedMat);
      masterBed1.position.set(-9, 5.6, -5);
      const masterBed2 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 6), bedMat);
      masterBed2.position.set(9, 5.6, -5);
      this.userVillaGroup.add(masterBed1, masterBed2);

      // Outdoor Azure Swimming Pool
      const pool = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 8), poolMat);
      pool.position.set(0, -0.1, 17);
      this.userVillaGroup.add(pool);

    } else if (modelId === 'model-noida' || modelId === 'prop-4') {
      titleText = 'The Palm Royal Duplex Penthouse • Sector 128, Noida (₹5.95 Cr)';
      // Duplex Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 20), floorMat);
      base.position.set(0, -0.2, 0);
      this.userVillaGroup.add(base);

      // Double-height Glass Salon
      const glass = new THREE.Mesh(new THREE.BoxGeometry(26, 8.5, 0.2), glassMat);
      glass.position.set(0, 4.25, 10);
      this.userVillaGroup.add(glass);

      // Floating Wooden Staircase
      for (let s = 0; s < 8; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.8), woodFurnitureMat);
        step.position.set(10 - s * 0.4, 0.5 + s * 0.5, 2 - s * 0.9);
        this.userVillaGroup.add(step);
      }

      // Upper Mezzanine Suite
      const mez = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 12), floorMat);
      mez.position.set(-4, 4.2, -3);
      const mezBed = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 5.5), bedMat);
      mezBed.position.set(-5, 5, -3);
      this.userVillaGroup.add(mez, mezBed);

      // Sky Jacuzzi & Terrace
      const jacuzzi = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1, 16), poolMat);
      jacuzzi.position.set(9, 0.5, -6);
      this.userVillaGroup.add(jacuzzi);
    } else {
      // Default Modern Estate
      const ground = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 16), wallWhiteMat);
      ground.position.set(0, 3.5, 0);
      this.userVillaGroup.add(ground);
    }

    this.user3DScene.add(this.userVillaGroup);

    // Update UI Badge
    const badge = document.getElementById('user-studio-prop-title');
    if (badge) badge.textContent = titleText;
  },

  set3DLighting(mode) {
    if (!this.user3DScene) return;
    if (mode === 'day') {
      this.user3DScene.background.set('#f8fafc');
    } else if (mode === 'sunset') {
      this.user3DScene.background.set('#fff1f2');
    } else if (mode === 'night') {
      this.user3DScene.background.set('#1e1b4b');
    }
    this.showToast(`Atmosphere switched to: ${mode.toUpperCase()}`);
  },

  set3DView(view) {
    if (!this.user3DCamera || !this.user3DControls) return;
    if (view === 'orbit') {
      this.user3DCamera.position.set(38, 22, 42);
      this.user3DControls.target.set(0, 5, 0);
      this.user3DControls.autoRotate = true;
    } else if (view === 'pool') {
      this.user3DCamera.position.set(-24, 6, 20);
      this.user3DControls.target.set(-10, 2, 6);
      this.user3DControls.autoRotate = false;
    } else if (view === 'interior') {
      this.user3DCamera.position.set(10, 6, 12);
      this.user3DControls.target.set(0, 3, 0);
      this.user3DControls.autoRotate = false;
    }
    this.user3DControls.update();
  },

  on3DResize() {
    const canvas = document.getElementById('user-studio-canvas');
    if (!canvas || !this.user3DRenderer || !this.user3DCamera) return;
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.user3DCamera.aspect = width / height;
    this.user3DCamera.updateProjectionMatrix();
    this.user3DRenderer.setSize(width, height);
  },

  launchStudioWithProp(id) {
    this.switchTab('studio3d');
    const prop = DB.getPropertyById ? DB.getPropertyById(id) : null;
    const modelId = prop ? prop.modelId : id;
    this.buildVillaGeometry(modelId);
    this.showToast(`Loaded 3D Walkthrough: ${prop ? prop.title : id}`);
  },

  launchAR(id) {
    if (window.AREngine) {
      window.AREngine.openARModal(id);
    } else {
      window.location.href = 'index.html#tour-studio';
    }
  },

  /* ==========================================================================
     CONCIERGE AGENT CHAT
     ========================================================================== */
  sendChatMessage() {
    const input = document.getElementById('chat-input-text');
    const msgArea = document.getElementById('chat-messages-area');
    if (!input || !msgArea || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg chat-msg-user';
    userMsg.textContent = userText;
    msgArea.appendChild(userMsg);
    msgArea.scrollTop = msgArea.scrollHeight;

    // Simulate Agent Reply
    setTimeout(() => {
      const agentMsg = document.createElement('div');
      agentMsg.className = 'chat-msg chat-msg-agent';
      agentMsg.innerHTML = `<strong>Elena Rostova:</strong> Hello ${this.currentUser.name.split(' ')[0]}! I received your inquiry about the 3D floorplan specs. I have scheduled a live virtual tour with high-fidelity WebXR walkthrough for you.`;
      msgArea.appendChild(agentMsg);
      msgArea.scrollTop = msgArea.scrollHeight;
    }, 900);
  },

  /* ==========================================================================
     PROFILE SAVE & TOAST
     ========================================================================== */
  async saveProfileSettings(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('prof-input-name').value;
    const email = document.getElementById('prof-input-email').value;
    const phone = document.getElementById('prof-input-phone').value;

    this.currentUser.name = name;
    this.currentUser.email = email;
    this.currentUser.phone = phone;

    localStorage.setItem('villa3d_user', JSON.stringify(this.currentUser));

    // Try updating profile on backend if token exists
    try {
      const token = localStorage.getItem('villa3d_token') || (this.currentUser && this.currentUser.token);
      if (token) {
        await fetch(`${DB.API_BASE}/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, phone })
        });
      }
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }

    this.loadUserData();
    this.showToast('Profile and VIP preferences saved successfully!');
  },

  showToast(text) {
    const toast = document.getElementById('user-toast');
    const label = document.getElementById('user-toast-text');
    if (!toast) return;
    if (label) label.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  UserPanel.init();
});
