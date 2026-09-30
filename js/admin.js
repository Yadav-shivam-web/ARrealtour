/**
 * ============================================================================
 * AR-REALTOUR PLATFORM - ADMIN BACKEND CONTROLLER
 * Dashboard KPIs, Property CRUD, 3D Asset Viewer, User Management & Inquiry Engine
 * ============================================================================
 */

const Admin = {
  currentTab: 'dashboard',
  previewScene: null,
  previewCamera: null,
  previewRenderer: null,
  previewControls: null,
  previewMeshGroup: null,
  isWireframe: false,
  currentCollectionKey: 'properties',

  async init() {
    this.checkAdminSession();
    this.bindTabNavigation();
    await this.refreshAll();
    this.init3DPreviewer();

    // Listen for database updates from MongoDB
    window.addEventListener('db-ready', () => this.refreshAll());
    window.addEventListener('db-properties-updated', () => this.refreshAll());
  },

  checkAdminSession() {
    const rawUser = localStorage.getItem('villa3d_user') || sessionStorage.getItem('villa3d_user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user && user.name) {
          const nameEl = document.querySelector('.admin-topbar-profile h4');
          if (nameEl) nameEl.textContent = user.name;
        }
      } catch (e) {}
    }
  },

  async refreshAll() {
    await Promise.allSettled([
      DB.fetchProperties ? DB.fetchProperties() : Promise.resolve(),
      DB.fetchInquiries ? DB.fetchInquiries() : Promise.resolve(),
      DB.fetchUsers ? DB.fetchUsers() : Promise.resolve()
    ]);

    this.updateKPIs();
    this.renderDashboardInquiries();
    this.renderProperties();
    this.renderModels();
    this.renderUsers();
    this.renderInquiries();
    this.updateSidebarCounters();
    this.viewRawJSON(this.currentCollectionKey || 'properties');
  },

  /* ==========================================================================
     TAB NAVIGATION SYSTEM
     ========================================================================== */
  bindTabNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update nav links
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update tab sections
    document.querySelectorAll('.admin-tab-content').forEach(section => {
      section.classList.remove('active');
    });

    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    // Update title
    const titleMap = {
      dashboard: 'Executive Dashboard',
      analytics: 'Reports & Analytics',
      properties: 'Add & Edit 3D Properties',
      models3d: 'Manage 3D Models & Assets',
      users: 'Manage Platform Users',
      inquiries: 'Manage Tour Inquiries',
      database: 'Database Module Inspector'
    };
    const titleEl = document.getElementById('page-current-title');
    if (titleEl) titleEl.textContent = titleMap[tabId] || 'Admin Management';

    // If switched to 3D models tab, trigger canvas resize
    if (tabId === 'models3d' && this.previewRenderer) {
      setTimeout(() => this.onPreviewResize(), 50);
    }
  },

  /* ==========================================================================
     DASHBOARD & KPIS
     ========================================================================== */
  updateKPIs() {
    if (!window.DB) return;
    const stats = DB.getKPIStats();

    const portValEl = document.getElementById('kpi-portfolio-val');
    const totalPropsEl = document.getElementById('kpi-total-props');
    const totalToursEl = document.getElementById('kpi-total-tours');
    const pendingInqEl = document.getElementById('kpi-pending-inq');

    if (portValEl) portValEl.textContent = stats.portfolioValueFormatted;
    if (totalPropsEl) totalPropsEl.textContent = stats.activeProperties;
    if (totalToursEl) totalToursEl.textContent = (stats.totalViews + stats.totalARTours).toLocaleString();
    if (pendingInqEl) pendingInqEl.textContent = stats.pendingInquiries;
  },

  updateSidebarCounters() {
    if (!window.DB) return;
    const props = DB.getProperties();
    const models = DB.getModels3D();
    const users = DB.getUsers();
    const inqs = DB.getInquiries();

    const pCount = document.getElementById('sidebar-prop-count');
    const mCount = document.getElementById('sidebar-models-count');
    const uCount = document.getElementById('sidebar-users-count');
    const iCount = document.getElementById('sidebar-inquiries-count');

    if (pCount) pCount.textContent = props.length;
    if (mCount) mCount.textContent = models.length;
    if (uCount) uCount.textContent = users.length;
    if (iCount) iCount.textContent = inqs.filter(i => i.status === 'New' || i.status === 'In Review').length;
  },

  renderDashboardInquiries() {
    const tbody = document.getElementById('dashboard-inquiries-tbody');
    if (!tbody || !window.DB) return;

    const inquiries = DB.getInquiries().slice(0, 4);
    tbody.innerHTML = inquiries.map(inq => `
      <tr>
        <td><strong>${inq.userName}</strong><br><small style="color:var(--admin-text-subtle);">${inq.userEmail}</small></td>
        <td>${inq.propertyTitle}</td>
        <td><i class="fa-solid fa-cube" style="color:var(--admin-accent-cyan);"></i> ${inq.tourType}</td>
        <td>${inq.preferredDate}</td>
        <td><span class="status-pill status-${(inq.status || 'new').toLowerCase().replace(' ', '')}">${inq.status || 'New'}</span></td>
        <td>
          <button class="btn-action" title="Manage Inquiry" onclick="Admin.openInquiryModal('${inq.id || inq._id}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  /* ==========================================================================
     PROPERTIES MANAGEMENT (CRUD)
     ========================================================================== */
  renderProperties() {
    const tbody = document.getElementById('properties-admin-tbody');
    if (!tbody || !window.DB) return;

    const properties = DB.getProperties();
    tbody.innerHTML = properties.map(prop => {
      const pId = prop.id || prop.customId || prop._id;
      return `
      <tr>
        <td>
          <div class="prop-table-cell">
            <img src="${prop.image}" alt="${prop.title}" class="prop-table-thumb">
            <div class="prop-cell-info">
              <h4>${prop.title}</h4>
              <span><i class="fa-solid fa-location-dot"></i> ${prop.location}</span>
            </div>
          </div>
        </td>
        <td><span style="text-transform: capitalize;">${prop.category}</span></td>
        <td style="font-weight: 700; color: var(--admin-accent-amber);">${prop.priceFormatted || '$' + (prop.price||0).toLocaleString()}</td>
        <td>${prop.beds} Beds &bull; ${prop.baths} Baths &bull; ${prop.sqft.toLocaleString()} sqft</td>
        <td><span class="status-pill status-active"><i class="fa-solid fa-cube"></i> ${prop.modelId}</span></td>
        <td><span class="status-pill status-active">${prop.status}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action" title="Edit Property" onclick="Admin.openEditPropertyModal('${pId}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action btn-del" title="Delete Property" onclick="Admin.deleteProperty('${pId}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;}).join('');
  },

  openAddPropertyModal() {
    document.getElementById('prop-modal-title').textContent = 'Add New 3D Property';
    document.getElementById('form-prop-id').value = '';
    document.getElementById('form-property').reset();
    document.getElementById('form-prop-image').value = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80';
    this.openModal('modal-property');
  },

  openEditPropertyModal(propId) {
    const prop = DB.getPropertyById(propId);
    if (!prop) return;

    document.getElementById('prop-modal-title').textContent = 'Edit 3D Property';
    document.getElementById('form-prop-id').value = prop.id || prop.customId || prop._id;
    document.getElementById('form-prop-title').value = prop.title;
    document.getElementById('form-prop-category').value = prop.category;
    document.getElementById('form-prop-price').value = prop.price;
    document.getElementById('form-prop-location').value = prop.location;
    document.getElementById('form-prop-address').value = prop.address || prop.location;
    document.getElementById('form-prop-beds').value = prop.beds;
    document.getElementById('form-prop-baths').value = prop.baths;
    document.getElementById('form-prop-sqft').value = prop.sqft;
    document.getElementById('form-prop-model').value = prop.modelId || 'model-mumbai';
    document.getElementById('form-prop-image').value = prop.image;
    document.getElementById('form-prop-desc').value = prop.description || '';

    this.openModal('modal-property');
  },

  async handlePropertySubmit(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('form-prop-id').value;
    const propData = {
      title: document.getElementById('form-prop-title').value,
      category: document.getElementById('form-prop-category').value,
      price: Number(document.getElementById('form-prop-price').value),
      location: document.getElementById('form-prop-location').value,
      address: document.getElementById('form-prop-address').value,
      beds: Number(document.getElementById('form-prop-beds').value),
      baths: Number(document.getElementById('form-prop-baths').value),
      sqft: Number(document.getElementById('form-prop-sqft').value),
      modelId: document.getElementById('form-prop-model').value,
      image: document.getElementById('form-prop-image').value,
      description: document.getElementById('form-prop-desc').value
    };

    if (id) {
      await DB.updateProperty(id, propData);
      this.showToast(`Property "${propData.title}" updated in MongoDB!`);
    } else {
      await DB.addProperty(propData);
      this.showToast(`New 3D Property "${propData.title}" saved to MongoDB!`);
    }

    this.closeModal('modal-property');
    await this.refreshAll();
  },

  async deleteProperty(id) {
    if (confirm('Are you sure you want to delete this 3D property listing from MongoDB?')) {
      await DB.deleteProperty(id);
      this.showToast('Property deleted from MongoDB catalogue.');
      await this.refreshAll();
    }
  },

  /* ==========================================================================
     3D MODELS MANAGEMENT (.glb / .gltf)
     ========================================================================== */
  renderModels() {
    const tbody = document.getElementById('models-admin-tbody');
    if (!tbody || !window.DB) return;

    const models = DB.getModels3D();
    tbody.innerHTML = models.map(m => `
      <tr>
        <td>
          <div class="prop-table-cell">
            <div class="activity-icon"><i class="fa-solid fa-cube"></i></div>
            <div class="prop-cell-info">
              <h4>${m.name}</h4>
              <span>${m.fileName}</span>
            </div>
          </div>
        </td>
        <td>${m.format} &bull; <strong style="color:var(--admin-accent-cyan);">${m.fileSize}</strong></td>
        <td>${m.polyCount}</td>
        <td><span class="status-pill status-active">${m.assignedPropertyTitle || 'Assigned'}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action" title="Preview in 3D" onclick="Admin.loadModelInPreview('${m.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action btn-del" title="Delete 3D Asset" onclick="Admin.deleteModel('${m.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  init3DPreviewer() {
    const canvas = document.getElementById('admin-preview-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || 400;
    const height = parent.clientHeight || 400;

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color('#f8fafc');

    this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.previewCamera.position.set(5, 4, 6);

    this.previewRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (THREE.OrbitControls) {
      this.previewControls = new THREE.OrbitControls(this.previewCamera, this.previewRenderer.domElement);
      this.previewControls.enableDamping = true;
      this.previewControls.dampingFactor = 0.05;
      this.previewControls.autoRotate = true;
      this.previewControls.autoRotateSpeed = 1.0;
    }

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0xf472b6, 0xe2e8f0);
    grid.position.y = -0.01;
    this.previewScene.add(grid);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.previewScene.add(amb);

    const dir = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dir.position.set(5, 10, 7);
    this.previewScene.add(dir);

    // Build default procedural preview geometry
    this.buildPreviewGeometry();

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (this.previewControls) this.previewControls.update();
      if (this.previewRenderer && this.previewScene && this.previewCamera) {
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
    };
    animate();

    window.addEventListener('resize', () => this.onPreviewResize());
  },

  currentPreviewModelId: 'model-mumbai',

  buildPreviewGeometry(modelId = this.currentPreviewModelId) {
    this.currentPreviewModelId = modelId;
    if (this.previewMeshGroup) {
      this.previewScene.remove(this.previewMeshGroup);
    }
    this.previewMeshGroup = new THREE.Group();

    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.6,
      wireframe: this.isWireframe
    });

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      wireframe: this.isWireframe
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: this.isWireframe
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.5,
      wireframe: this.isWireframe
    });

    if (modelId === 'model-mumbai' || modelId === 'prop-mumbai') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 2.2), cyanMat);
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.1), glassMat);
      glassFront.position.set(0, 0.6, 1.1);
      const room = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), whiteMat);
      room.position.set(-0.6, 0.4, -0.3);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), goldMat);
      bed.position.set(0.8, 0.15, -0.4);
      this.previewMeshGroup.add(base, glassFront, room, bed);
    } else if (modelId === 'model-pune' || modelId === 'prop-pune') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 2.6), cyanMat);
      const living = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.4), whiteMat);
      living.position.set(-0.7, 0.5, 0.4);
      const bedWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 2.0), whiteMat);
      bedWing.position.set(0.9, 0.45, -0.2);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.1), glassMat);
      glass.position.set(-0.7, 0.45, 1.1);
      this.previewMeshGroup.add(base, living, bedWing, glass);
    } else if (modelId === 'model-delhi' || modelId === 'prop-delhi') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 3.2), whiteMat);
      const atrium = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 1.6), glassMat);
      atrium.position.set(0, 0.9, 0.2);
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.2), whiteMat);
      leftWing.position.set(-1.8, 0.75, -0.2);
      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.2), whiteMat);
      rightWing.position.set(1.8, 0.75, -0.2);
      const pool = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.0), cyanMat);
      pool.position.set(0, 0.05, 2.0);
      this.previewMeshGroup.add(base, atrium, leftWing, rightWing, pool);
    } else if (modelId === 'model-noida' || modelId === 'prop-noida') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.15, 2.8), whiteMat);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 2.4), whiteMat);
      lower.position.set(0, 0.55, 0);
      const upperDuplex = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.8), glassMat);
      upperDuplex.position.set(-0.5, 1.6, -0.2);
      const jacuzzi = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12), cyanMat);
      jacuzzi.position.set(1.2, 1.2, 0.6);
      this.previewMeshGroup.add(base, lower, upperDuplex, jacuzzi);
    } else {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 2.5), cyanMat);
      const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), whiteMat);
      mainBuilding.position.set(-0.2, 0.7, 0);
      this.previewMeshGroup.add(base, mainBuilding);
    }

    if (this.previewScene) this.previewScene.add(this.previewMeshGroup);
  },

  togglePreviewWireframe() {
    this.isWireframe = !this.isWireframe;
    this.buildPreviewGeometry();
    this.showToast(this.isWireframe ? 'Wireframe mode enabled' : 'Shaded render mode enabled');
  },

  resetPreviewCamera() {
    if (this.previewCamera && this.previewControls) {
      this.previewCamera.position.set(5, 4, 6);
      this.previewControls.target.set(0, 0.8, 0);
      this.previewControls.update();
    }
  },

  loadModelInPreview(modelId) {
    const model = DB.getModelById(modelId);
    if (!model) return;
    this.buildPreviewGeometry(modelId);
    const badge = document.getElementById('model-preview-name');
    if (badge) badge.textContent = model.fileName;
    this.showToast(`Inspecting 3D Asset: ${model.name}`);
  },

  openUploadModelModal() {
    const name = prompt('Enter 3D Model Asset Name:', 'Panoramic Sky Villa 3D');
    if (!name) return;
    const fileName = prompt('Enter .glb / .gltf file name:', 'sky_villa_lod.glb');

    DB.addModel3D({
      name,
      fileName: fileName || 'custom_model.glb',
      fileSize: '16.4 MB',
      polyCount: '165,000 Triangles',
      format: 'GLB / GLTF 2.0'
    });

    this.showToast('3D Model uploaded and registered into asset manager!');
    this.refreshAll();
  },

  deleteModel(id) {
    if (confirm('Delete this 3D model asset from the library?')) {
      DB.deleteModel3D(id);
      this.showToast('3D model asset removed.');
      this.refreshAll();
    }
  },

  onPreviewResize() {
    const canvas = document.getElementById('admin-preview-canvas');
    if (!canvas || !this.previewRenderer || !this.previewCamera) return;
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.previewCamera.aspect = width / height;
    this.previewCamera.updateProjectionMatrix();
    this.previewRenderer.setSize(width, height);
  },

  /* ==========================================================================
     USERS MANAGEMENT (CRUD)
     ========================================================================== */
  renderUsers() {
    const tbody = document.getElementById('users-admin-tbody');
    if (!tbody || !window.DB) return;

    const users = DB.getUsers();
    tbody.innerHTML = users.map(u => {
      const uId = u.id || u._id;
      return `
      <tr>
        <td>
          <div class="prop-table-cell">
            <img src="${u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" alt="${u.name}" class="admin-avatar">
            <div class="prop-cell-info">
              <h4>${u.name}</h4>
              <span>${u.email}</span>
            </div>
          </div>
        </td>
        <td><span class="status-pill ${u.role === 'admin' ? 'status-scheduled' : 'status-active'}">${u.roleLabel || (u.role === 'admin' ? 'Admin' : 'User')}</span></td>
        <td>${u.phone || 'N/A'}</td>
        <td><strong>${u.toursViewed || 0}</strong> tours &bull; <strong>${u.arSessions || 0}</strong> AR</td>
        <td><span class="status-pill ${u.status === 'Active' ? 'status-active' : 'status-closed'}">${u.status || 'Active'}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action" title="Toggle Active Status" onclick="Admin.toggleUserStatus('${uId}', '${u.status}')">
              <i class="fa-solid fa-power-off"></i>
            </button>
            <button class="btn-action btn-del" title="Delete User" onclick="Admin.deleteUser('${uId}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;}).join('');
  },

  openAddUserModal() {
    document.getElementById('form-user').reset();
    this.openModal('modal-user');
  },

  async handleUserSubmit(e) {
    if (e) e.preventDefault();
    const userData = {
      name: document.getElementById('form-user-name').value,
      email: document.getElementById('form-user-email').value,
      phone: document.getElementById('form-user-phone').value,
      role: document.getElementById('form-user-role').value
    };

    await DB.addUser(userData);
    this.showToast(`User account created in MongoDB for ${userData.name}!`);
    this.closeModal('modal-user');
    await this.refreshAll();
  },

  async toggleUserStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    await DB.updateUserStatus(id, newStatus);
    this.showToast(`User status updated in MongoDB to: ${newStatus}`);
    await this.refreshAll();
  },

  async deleteUser(id) {
    if (confirm('Are you sure you want to delete this user from MongoDB?')) {
      await DB.deleteUser(id);
      this.showToast('User account deleted from MongoDB.');
      await this.refreshAll();
    }
  },

  /* ==========================================================================
     INQUIRIES MANAGEMENT (WORKFLOW)
     ========================================================================== */
  renderInquiries() {
    const tbody = document.getElementById('inquiries-admin-tbody');
    if (!tbody || !window.DB) return;

    const inquiries = DB.getInquiries();
    tbody.innerHTML = inquiries.map(inq => {
      const inqId = inq.id || inq._id;
      return `
      <tr>
        <td>
          <strong>${inq.userName}</strong><br>
          <small style="color:var(--admin-text-subtle);">${inq.userEmail} &bull; ${inq.userPhone || ''}</small>
        </td>
        <td><strong>${inq.propertyTitle}</strong></td>
        <td><i class="fa-solid fa-cube" style="color:var(--admin-accent-cyan);"></i> ${inq.tourType}</td>
        <td>${inq.preferredDate}</td>
        <td>${inq.assignedAgent || 'Elena Rostova'}</td>
        <td><span class="status-pill status-${(inq.status || 'new').toLowerCase().replace(' ', '')}">${inq.status}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action" title="Respond & Update" onclick="Admin.openInquiryModal('${inqId}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action btn-del" title="Delete Inquiry" onclick="Admin.deleteInquiry('${inqId}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;}).join('');
  },

  openInquiryModal(id) {
    const inquiries = DB.getInquiries();
    const inq = inquiries.find(i => i.id === id || i._id === id);
    if (!inq) return;

    document.getElementById('form-inq-id').value = inq.id || inq._id;
    document.getElementById('form-inq-client').value = `${inq.userName} (${inq.userEmail})`;
    document.getElementById('form-inq-prop').value = inq.propertyTitle;
    document.getElementById('form-inq-status').value = inq.status;
    document.getElementById('form-inq-notes').value = inq.notes || '';
    document.getElementById('form-inq-admin-note').value = inq.adminNote || '';

    this.openModal('modal-inquiry');
  },

  async handleInquirySubmit(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('form-inq-id').value;
    const status = document.getElementById('form-inq-status').value;
    const adminNote = document.getElementById('form-inq-admin-note').value;

    await DB.updateInquiryStatus(id, status, adminNote);
    this.showToast(`Inquiry status updated to "${status}" in MongoDB!`);
    this.closeModal('modal-inquiry');
    await this.refreshAll();
  },

  async deleteInquiry(id) {
    if (confirm('Delete this inquiry record from MongoDB?')) {
      await DB.deleteInquiry(id);
      this.showToast('Inquiry record deleted.');
      await this.refreshAll();
    }
  },

  exportInquiriesCSV() {
    const inquiries = DB.getInquiries();
    let csv = 'ID,Client Name,Email,Property,Tour Type,Preferred Date,Status,Agent\n';
    inquiries.forEach(i => {
      csv += `"${i.id || i._id}","${i.userName}","${i.userEmail}","${i.propertyTitle}","${i.tourType}","${i.preferredDate}","${i.status}","${i.assignedAgent}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arrealtour_inquiries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    this.showToast('Inquiries CSV exported successfully!');
  },

  /* ==========================================================================
     DATABASE INSPECTOR & RESET
     ========================================================================== */
  viewRawJSON(collectionKey) {
    this.currentCollectionKey = collectionKey;
    const pre = document.getElementById('raw-json-inspector');
    if (!pre || !window.DB) return;

    let data = [];
    if (collectionKey === 'properties') data = DB.getProperties();
    else if (collectionKey === 'models3d') data = DB.getModels3D();
    else if (collectionKey === 'users') data = DB.getUsers();
    else if (collectionKey === 'inquiries') data = DB.getInquiries();

    pre.textContent = JSON.stringify(data, null, 2);
  },

  async resetDatabasePrompt() {
    if (confirm('Reset and refresh database collections from MongoDB?')) {
      await this.refreshAll();
      this.showToast('Database collections synchronized from MongoDB!');
    }
  },

  /* ==========================================================================
     MODAL & TOAST HELPERS
     ========================================================================== */
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  },

  showToast(text) {
    const toast = document.getElementById('admin-toast');
    const label = document.getElementById('admin-toast-text');
    if (!toast) return;
    if (label) label.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
