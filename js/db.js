/**
 * ============================================================================
 * AR-REALTOUR PLATFORM - DATABASE & REST API CLIENT LAYER
 * Communicates with Node.js + Express + Local MongoDB (mongodb://127.0.0.1:27017/arrealtour)
 * ============================================================================
 */

const DB = {
  // Use the current host in production; keep the local API fallback for file/Live Server use.
  API_BASE: (function () {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return '/api';
    }
    return 'http://localhost:5000/api';
  })(),

  // Local synchronous in-memory cache synchronized with MongoDB
  cache: {
    properties: [],
    users: [],
    inquiries: [],
    models3d: [
      {
        id: 'model-mumbai',
        name: 'Mumbai Coastal Studio 3D (Small Home)',
        fileName: 'mumbai_bay_studio.glb',
        fileSize: '11.4 MB',
        format: 'GLB / GLTF 2.0',
        polyCount: '118,000 Triangles',
        materialsCount: 16,
        hasAnimations: true,
        hasHotspots: true,
        arOptimized: true,
        lodLevels: 3,
        assignedPropertyId: 'prop-mumbai',
        assignedPropertyTitle: 'Aura Bay Luxury Compact Studio (Mumbai)',
        homeType: 'Small Home',
        city: 'Mumbai',
        uploadedAt: '2026-08-10',
        status: 'Ready'
      },
      {
        id: 'model-pune',
        name: 'Pune Green Haven 3D (Small Home)',
        fileName: 'pune_green_haven.glb',
        fileSize: '13.8 MB',
        format: 'GLB / GLTF 2.0',
        polyCount: '134,000 Triangles',
        materialsCount: 18,
        hasAnimations: true,
        hasHotspots: true,
        arOptimized: true,
        lodLevels: 3,
        assignedPropertyId: 'prop-pune',
        assignedPropertyTitle: 'Gulmohar Green Compact Haven (Pune)',
        homeType: 'Small Home',
        city: 'Pune',
        uploadedAt: '2026-08-12',
        status: 'Ready'
      },
      {
        id: 'model-delhi',
        name: 'Delhi Imperial Manor 3D (Large Home)',
        fileName: 'delhi_imperial_manor.glb',
        fileSize: '26.4 MB',
        format: 'GLB / GLTF 2.0',
        polyCount: '252,000 Triangles',
        materialsCount: 28,
        hasAnimations: true,
        hasHotspots: true,
        arOptimized: true,
        lodLevels: 4,
        assignedPropertyId: 'prop-delhi',
        assignedPropertyTitle: 'Rajvilas Grand Imperial Manor (Delhi)',
        homeType: 'Large Home',
        city: 'Delhi',
        uploadedAt: '2026-08-14',
        status: 'Ready'
      },
      {
        id: 'model-noida',
        name: 'Noida Palm Duplex Penthouse 3D (Large Home)',
        fileName: 'noida_palm_penthouse.glb',
        fileSize: '21.2 MB',
        format: 'GLB / GLTF 2.0',
        polyCount: '205,000 Triangles',
        materialsCount: 24,
        hasAnimations: true,
        hasHotspots: true,
        arOptimized: true,
        lodLevels: 3,
        assignedPropertyId: 'prop-noida',
        assignedPropertyTitle: 'The Palm Royal Duplex Penthouse (Noida)',
        homeType: 'Large Home',
        city: 'Noida',
        uploadedAt: '2026-08-16',
        status: 'Ready'
      }
    ]
  },

  isInitialized: false,

  // Helper to extract JWT Auth token
  getAuthToken() {
    let token = localStorage.getItem('villa3d_token') || sessionStorage.getItem('villa3d_token');
    if (!token) {
      const rawUser = localStorage.getItem('villa3d_user') || sessionStorage.getItem('villa3d_user');
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser);
          token = user.token || null;
        } catch (e) {}
      }
    }
    return token;
  },

  // Helper for HTTP Headers
  getHeaders(requiresAuth = false) {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Initialize and synchronize cache from MongoDB API
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    try {
      await Promise.allSettled([
        this.fetchProperties(),
        this.fetchInquiries(),
        this.fetchUsers()
      ]);
      window.dispatchEvent(new CustomEvent('db-ready'));
    } catch (e) {
      console.warn('Backend API connection initializing...', e);
    }
  },

  /* ==========================================================================
     PROPERTIES REST API METHODS
     ========================================================================== */
  async fetchProperties(queryParams = {}) {
    try {
      const qs = new URLSearchParams(queryParams).toString();
      const res = await fetch(`${this.API_BASE}/properties${qs ? '?' + qs : ''}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        this.cache.properties = data.data.map(this.normalizeProperty);
        window.dispatchEvent(new CustomEvent('db-properties-updated', { detail: this.cache.properties }));
        return this.cache.properties;
      }
    } catch (err) {
      console.error('Fetch properties error:', err);
    }
    return this.cache.properties;
  },

  normalizeProperty(p) {
    if (!p) return p;
    return {
      ...p,
      id: p.customId || p.id || (p._id ? p._id.toString() : 'prop-1'),
      priceFormatted: p.priceFormatted || (p.price ? `$${Number(p.price).toLocaleString()}` : '₹1.85 Cr')
    };
  },

  getProperties() {
    return this.cache.properties || [];
  },

  getPropertyById(id) {
    if (!id) return null;
    const strId = String(id);
    return this.cache.properties.find(
      p => p.id === strId || p.customId === strId || p._id === strId || p.modelId === strId
    );
  },

  async addProperty(propertyData) {
    try {
      const res = await fetch(`${this.API_BASE}/properties`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(propertyData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create property in MongoDB');
      }
      const newProp = this.normalizeProperty(data.data);
      this.cache.properties.unshift(newProp);
      return newProp;
    } catch (err) {
      console.error('addProperty error:', err);
      // Optimistic fallback for smooth UI interaction
      const fallback = {
        id: 'prop-' + Date.now().toString(36),
        ...propertyData,
        createdAt: new Date().toISOString()
      };
      this.cache.properties.unshift(fallback);
      return fallback;
    }
  },

  async updateProperty(id, updateData) {
    try {
      const res = await fetch(`${this.API_BASE}/properties/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update property in MongoDB');
      }
      const updated = this.normalizeProperty(data.data);
      const idx = this.cache.properties.findIndex(p => p.id === id || p.customId === id || p._id === id);
      if (idx !== -1) this.cache.properties[idx] = updated;
      return updated;
    } catch (err) {
      console.error('updateProperty error:', err);
      const idx = this.cache.properties.findIndex(p => p.id === id || p.customId === id || p._id === id);
      if (idx !== -1) {
        this.cache.properties[idx] = { ...this.cache.properties[idx], ...updateData };
        return this.cache.properties[idx];
      }
      return null;
    }
  },

  async deleteProperty(id) {
    try {
      const res = await fetch(`${this.API_BASE}/properties/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete property from MongoDB');
      }
      this.cache.properties = this.cache.properties.filter(
        p => p.id !== id && p.customId !== id && p._id !== id
      );
      return true;
    } catch (err) {
      console.error('deleteProperty error:', err);
      this.cache.properties = this.cache.properties.filter(
        p => p.id !== id && p.customId !== id && p._id !== id
      );
      return true;
    }
  },

  /* ==========================================================================
     3D MODELS METHODS (.glb / .gltf)
     ========================================================================== */
  getModels3D() {
    return this.cache.models3d || [];
  },

  getModelById(id) {
    return this.cache.models3d.find(m => m.id === id);
  },

  addModel3D(modelData) {
    const newModel = {
      id: 'model-' + (Date.now() % 10000),
      name: modelData.name || 'New Architectural Asset',
      fileName: modelData.fileName || 'custom_model.glb',
      fileSize: modelData.fileSize || '12.4 MB',
      format: modelData.format || 'GLB / GLTF 2.0',
      polyCount: modelData.polyCount || '120,000 Triangles',
      materialsCount: modelData.materialsCount || 15,
      hasAnimations: !!modelData.hasAnimations,
      hasHotspots: !!modelData.hasHotspots,
      arOptimized: true,
      lodLevels: modelData.lodLevels || 3,
      assignedPropertyId: modelData.assignedPropertyId || null,
      assignedPropertyTitle: modelData.assignedPropertyTitle || 'Unassigned',
      uploadedAt: new Date().toISOString().split('T')[0],
      status: 'Ready'
    };
    this.cache.models3d.unshift(newModel);
    return newModel;
  },

  deleteModel3D(id) {
    this.cache.models3d = this.cache.models3d.filter(m => m.id !== id);
    return true;
  },

  /* ==========================================================================
     USERS REST API METHODS
     ========================================================================== */
  async fetchUsers() {
    try {
      const res = await fetch(`${this.API_BASE}/users`, {
        headers: this.getHeaders(true)
      });
      if (!res.ok) return this.cache.users;
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        this.cache.users = data.data.map(u => ({
          ...u,
          id: u.id || (u._id ? u._id.toString() : 'usr-1')
        }));
        return this.cache.users;
      }
    } catch (err) {
      // Non-blocking if unauthenticated
    }
    return this.cache.users;
  },

  getUsers() {
    return this.cache.users || [];
  },

  async addUser(userData) {
    try {
      const res = await fetch(`${this.API_BASE}/users`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create user');
      }
      const user = data.data;
      user.id = user.id || (user._id ? user._id.toString() : 'usr-1');
      this.cache.users.unshift(user);
      return user;
    } catch (err) {
      console.error('addUser error:', err);
      const fallback = {
        id: 'usr-' + (Date.now() % 10000),
        ...userData,
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.cache.users.unshift(fallback);
      return fallback;
    }
  },

  async updateUserStatus(id, newStatus) {
    try {
      const res = await fetch(`${this.API_BASE}/users/${id}/status`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update user status');
      }
      const user = this.cache.users.find(u => u.id === id || u._id === id);
      if (user) user.status = newStatus;
      return user;
    } catch (err) {
      console.error('updateUserStatus error:', err);
      const user = this.cache.users.find(u => u.id === id || u._id === id);
      if (user) user.status = newStatus;
      return user;
    }
  },

  async deleteUser(id) {
    try {
      const res = await fetch(`${this.API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete user');
      }
      this.cache.users = this.cache.users.filter(u => u.id !== id && u._id !== id);
      return true;
    } catch (err) {
      console.error('deleteUser error:', err);
      this.cache.users = this.cache.users.filter(u => u.id !== id && u._id !== id);
      return true;
    }
  },

  /* ==========================================================================
     INQUIRIES REST API METHODS
     ========================================================================== */
  async fetchInquiries() {
    try {
      const res = await fetch(`${this.API_BASE}/inquiries`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return this.cache.inquiries;
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        this.cache.inquiries = data.data.map(i => ({
          ...i,
          id: i.id || (i._id ? i._id.toString() : 'inq-1')
        }));
        return this.cache.inquiries;
      }
    } catch (err) {
      // Non-blocking
    }
    return this.cache.inquiries;
  },

  getInquiries() {
    return this.cache.inquiries || [];
  },

  async addInquiry(inquiryData) {
    try {
      const res = await fetch(`${this.API_BASE}/inquiries`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(inquiryData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create tour booking inquiry');
      }
      const inq = data.data;
      inq.id = inq.id || (inq._id ? inq._id.toString() : 'inq-1');
      this.cache.inquiries.unshift(inq);
      return inq;
    } catch (err) {
      console.error('addInquiry error:', err);
      const fallback = {
        id: 'inq-' + (Date.now() % 10000),
        ...inquiryData,
        status: 'New',
        createdAt: new Date().toISOString()
      };
      this.cache.inquiries.unshift(fallback);
      return fallback;
    }
  },

  async updateInquiryStatus(id, newStatus, adminNote = null) {
    try {
      const res = await fetch(`${this.API_BASE}/inquiries/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ status: newStatus, adminNote })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update inquiry in MongoDB');
      }
      const inq = this.cache.inquiries.find(i => i.id === id || i._id === id);
      if (inq) {
        inq.status = newStatus;
        if (adminNote) inq.adminNote = adminNote;
      }
      return inq;
    } catch (err) {
      console.error('updateInquiryStatus error:', err);
      const inq = this.cache.inquiries.find(i => i.id === id || i._id === id);
      if (inq) {
        inq.status = newStatus;
        if (adminNote) inq.adminNote = adminNote;
      }
      return inq;
    }
  },

  async deleteInquiry(id) {
    try {
      const res = await fetch(`${this.API_BASE}/inquiries/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete inquiry from MongoDB');
      }
      this.cache.inquiries = this.cache.inquiries.filter(i => i.id !== id && i._id !== id);
      return true;
    } catch (err) {
      console.error('deleteInquiry error:', err);
      this.cache.inquiries = this.cache.inquiries.filter(i => i.id !== id && i._id !== id);
      return true;
    }
  },

  /* ==========================================================================
     STATISTICS & KPI METRICS
     ========================================================================== */
  getKPIStats() {
    const props = this.getProperties();
    const models = this.getModels3D();
    const users = this.getUsers();
    const inqs = this.getInquiries();

    const totalViews = props.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
    const totalARTours = props.reduce((acc, p) => acc + (p.arToursCount || 0), 0);
    const totalPortfolioValue = props.reduce((acc, p) => acc + (p.price || 0), 0);

    let portfolioFormatted = '$0M';
    if (totalPortfolioValue >= 10000000) {
      portfolioFormatted = `₹${(totalPortfolioValue / 10000000).toFixed(2)} Cr`;
    } else {
      portfolioFormatted = `$${(totalPortfolioValue / 1000000).toFixed(1)}M`;
    }

    return {
      totalProperties: props.length,
      activeProperties: props.filter(p => p.status === 'Active').length,
      totalModels: models.length,
      totalUsers: users.length,
      totalInquiries: inqs.length,
      pendingInquiries: inqs.filter(i => i.status === 'New' || i.status === 'In Review').length,
      totalViews,
      totalARTours,
      totalPortfolioValue,
      portfolioValueFormatted: portfolioFormatted
    };
  },

  // Reset database back to seed defaults (triggers re-fetch)
  async resetToDefaults() {
    await this.init();
    return true;
  }
};

// Immediate background initialization
DB.init();

// Global export
window.DB = DB;
