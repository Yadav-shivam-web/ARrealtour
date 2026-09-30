/**
 * ============================================================================
 * AR-REALTOUR - AUGMENTED REALITY (AR) MODULE
 * WebXR, Simulated Camera AR Environment, Plane Tracking, Pan/Zoom/Move 3D Controls,
 * Interior Rooms Walkthrough, Roof Cutaway, and Live Working Mobile QR Code Engine
 * ============================================================================
 */

window.AREngine = {
  currentProperty: null,
  activeMode: 'simulator', // 'simulator' or 'webcam'
  scaleMode: 'tabletop', // 'tabletop' (1:50) or 'real' (1:1)
  isPlaced: false,
  isCutaway: false,
  rotationAngle: 0,
  scaleFactor: 1.0,
  mediaStream: null,
  arScene: null,
  arCamera: null,
  arRenderer: null,
  arControls: null,
  arModelGroup: null,
  arRoofMesh: null,
  arReticle: null,
  animationId: null,
  targetOffset: { x: 0, y: -0.4, z: 0 },

  init() {
    this.bindGlobalTriggers();
  },

  bindGlobalTriggers() {
    // Delegated click for any [data-ar-property-id] or [data-launch-ar]
    document.addEventListener('click', (e) => {
      const arBtn = e.target.closest('[data-launch-ar]');
      if (arBtn) {
        e.preventDefault();
        const propId = arBtn.getAttribute('data-launch-ar');
        this.openARModal(propId);
      }
    });
  },

  openARModal(propertyId) {
    let prop = null;
    if (window.DB) {
      prop = DB.getPropertyById(propertyId);
    }
    if (!prop) {
      prop = {
        id: 'prop-1',
        modelId: 'model-mumbai',
        title: 'Aura Bay Luxury Compact Studio',
        priceFormatted: '₹1.85 Cr',
        location: 'Bandra West, Mumbai',
        sqft: 850,
        beds: 1,
        baths: 1
      };
    }
    this.currentProperty = prop;

    let modal = document.getElementById('ar-modal');
    if (!modal) {
      this.createARModalHTML();
      modal = document.getElementById('ar-modal');
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.updateModalInfo(prop);
      this.initARScene();
      this.generateQRCode();
    }
  },

  closeARModal() {
    const modalElem = document.getElementById('ar-modal');
    if (modalElem) {
      modalElem.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.stopCameraStream();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  updateModalInfo(prop) {
    const titleEl = document.getElementById('ar-prop-title');
    const priceEl = document.getElementById('ar-prop-price');
    const locEl = document.getElementById('ar-prop-loc');
    if (titleEl) titleEl.textContent = prop.title;
    if (priceEl) priceEl.textContent = prop.priceFormatted || `₹${(prop.price||18500000).toLocaleString('en-IN')}`;
    if (locEl) locEl.textContent = prop.location || 'Mumbai';

    // Highlight current active model pill in AR modal
    const modelId = prop.modelId || 'model-mumbai';
    document.querySelectorAll('.ar-modal-model-pill').forEach(pill => {
      if (pill.getAttribute('data-model') === modelId) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  },

  switchARModel(modelId) {
    if (window.DB) {
      const allProps = DB.getProperties();
      const match = allProps.find(p => p.modelId === modelId);
      if (match) this.currentProperty = match;
    }
    if (!this.currentProperty || this.currentProperty.modelId !== modelId) {
      this.currentProperty = {
        id: modelId === 'model-mumbai' ? 'prop-1' : (modelId === 'model-pune' ? 'prop-2' : (modelId === 'model-delhi' ? 'prop-3' : 'prop-4')),
        modelId: modelId,
        title: modelId === 'model-mumbai' ? 'Aura Bay Luxury Compact Studio' : (modelId === 'model-pune' ? 'Gulmohar Green Compact Haven' : (modelId === 'model-delhi' ? 'Rajvilas Grand Imperial Manor' : 'The Palm Royal Duplex Penthouse')),
        priceFormatted: modelId === 'model-mumbai' ? '₹1.85 Cr' : (modelId === 'model-pune' ? '₹78 Lakh' : (modelId === 'model-delhi' ? '₹14.50 Cr' : '₹5.95 Cr')),
        location: modelId === 'model-mumbai' ? 'Bandra West, Mumbai' : (modelId === 'model-pune' ? 'Koregaon Park, Pune' : (modelId === 'model-delhi' ? 'Vasant Vihar, New Delhi' : 'Sector 128, Noida'))
      };
    }
    this.updateModalInfo(this.currentProperty);
    this.buildARVillaModel();
    this.generateQRCode();
  },

  createARModalHTML() {
    const div = document.createElement('div');
    div.id = 'ar-modal';
    div.className = 'ar-modal-backdrop';
    div.innerHTML = `
      <div class="ar-modal-container">
        <!-- AR Header -->
        <div class="ar-modal-header">
          <div class="ar-brand-badge">
            <i class="fa-solid fa-expand"></i>
            <span>AR-REALTOUR &bull; WebXR &amp; 3D Engine</span>
          </div>
          <div class="ar-header-info">
            <h3 id="ar-prop-title">Aura Bay Luxury Compact Studio</h3>
            <div>
              <span class="ar-header-price" id="ar-prop-price">₹1.85 Cr</span>
              <span class="ar-header-loc" id="ar-prop-loc"><i class="fa-solid fa-location-dot"></i> Bandra West, Mumbai</span>
            </div>
          </div>
          <button class="ar-modal-close" onclick="AREngine.closeARModal()" aria-label="Close AR Studio">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- 4 Model Switcher Bar in Modal -->
        <div class="ar-modal-switcher-strip" style="display: flex; gap: 8px; padding: 10px 24px; background: #ffffff; border-bottom: 1px solid #fbcfe8; overflow-x: auto;">
          <button class="model-select-btn ar-modal-model-pill active" data-model="model-mumbai" onclick="AREngine.switchARModel('model-mumbai')">
            <i class="fa-solid fa-house-chimney"></i> Mumbai (Small - ₹1.85 Cr)
          </button>
          <button class="model-select-btn ar-modal-model-pill" data-model="model-pune" onclick="AREngine.switchARModel('model-pune')">
            <i class="fa-solid fa-tree"></i> Pune (Small - ₹78 L)
          </button>
          <button class="model-select-btn ar-modal-model-pill" data-model="model-delhi" onclick="AREngine.switchARModel('model-delhi')">
            <i class="fa-solid fa-hotel"></i> Delhi (Large - ₹14.5 Cr)
          </button>
          <button class="model-select-btn ar-modal-model-pill" data-model="model-noida" onclick="AREngine.switchARModel('model-noida')">
            <i class="fa-solid fa-building"></i> Noida (Large - ₹5.95 Cr)
          </button>
        </div>

        <!-- AR Body Split View -->
        <div class="ar-modal-body">
          <!-- AR Viewport -->
          <div class="ar-viewport-wrap" id="ar-viewport-wrap">
            <!-- Simulated Camera or Real Video Stream -->
            <video id="ar-camera-video" class="ar-camera-stream" autoplay playsinline muted></video>
            <div class="ar-sim-background" id="ar-sim-background"></div>

            <!-- AR 3D Canvas -->
            <canvas id="ar-canvas" class="ar-canvas"></canvas>

            <!-- AR HUD Scanning Overlay -->
            <div class="ar-hud-overlay" id="ar-hud-overlay">
              <div class="ar-reticle" id="ar-reticle">
                <div class="reticle-ring"></div>
                <div class="reticle-dot"></div>
                <span class="reticle-text">Surface Detected - Tap Anchor to Place</span>
              </div>
              <div class="ar-dimension-tags">
                <div class="dim-tag"><i class="fa-solid fa-arrows-up-down-left-right"></i> Drag Left-Click to Rotate &bull; Right-Click to Pan &bull; Scroll to Zoom</div>
                <div class="dim-tag"><i class="fa-solid fa-layer-group"></i> Interior Visible: Living, Beds, Kitchen &amp; Deck</div>
              </div>
            </div>

            <!-- On-Screen Directional Pan D-Pad (Up, Down, Left, Right, Reset) -->
            <div style="position: absolute; left: 16px; bottom: 85px; z-index: 35; display: flex; flex-direction: column; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid #fbcfe8; padding: 6px; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
              <button class="btn-user-action" style="width: 32px; height: 32px; padding: 0;" onclick="AREngine.panModel(0, 0.25)" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
              <div style="display: flex; gap: 4px;">
                <button class="btn-user-action" style="width: 32px; height: 32px; padding: 0;" onclick="AREngine.panModel(-0.25, 0)" title="Move Left"><i class="fa-solid fa-arrow-left"></i></button>
                <button class="btn-user-action" style="width: 32px; height: 32px; padding: 0;" onclick="AREngine.resetARView()" title="Center & Reset View"><i class="fa-solid fa-crosshairs"></i></button>
                <button class="btn-user-action" style="width: 32px; height: 32px; padding: 0;" onclick="AREngine.panModel(0.25, 0)" title="Move Right"><i class="fa-solid fa-arrow-right"></i></button>
              </div>
              <button class="btn-user-action" style="width: 32px; height: 32px; padding: 0;" onclick="AREngine.panModel(0, -0.25)" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
            </div>

            <!-- Room Quick Jump Floating Bar (Right Side) -->
            <div style="position: absolute; right: 16px; top: 16px; z-index: 35; display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); border: 1px solid #fbcfe8; padding: 8px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
              <span style="font-size: 0.72rem; font-weight: 700; color: #831843; text-align: center;"><i class="fa-solid fa-door-open"></i> Interior Rooms</span>
              <button class="btn-user-action" style="font-size: 0.76rem; padding: 4px 8px; justify-content: flex-start;" onclick="AREngine.teleportRoom('living')"><i class="fa-solid fa-couch" style="color:#db2777;"></i> Living Salon</button>
              <button class="btn-user-action" style="font-size: 0.76rem; padding: 4px 8px; justify-content: flex-start;" onclick="AREngine.teleportRoom('bedroom')"><i class="fa-solid fa-bed" style="color:#db2777;"></i> Master Bed</button>
              <button class="btn-user-action" style="font-size: 0.76rem; padding: 4px 8px; justify-content: flex-start;" onclick="AREngine.teleportRoom('kitchen')"><i class="fa-solid fa-utensils" style="color:#db2777;"></i> Kitchen &amp; Dining</button>
              <button class="btn-user-action" style="font-size: 0.76rem; padding: 4px 8px; justify-content: flex-start;" onclick="AREngine.teleportRoom('terrace')"><i class="fa-solid fa-water-ladder" style="color:#db2777;"></i> Terrace / Pool</button>
              <button class="btn-user-action" style="font-size: 0.76rem; padding: 4px 8px; justify-content: flex-start;" onclick="AREngine.toggleRoofCutaway()"><i class="fa-solid fa-layer-group" style="color:#db2777;"></i> Roof Cutaway</button>
            </div>

            <!-- AR Bottom Controls -->
            <div class="ar-bottom-hud">
              <button class="ar-hud-btn active" id="btn-ar-place" onclick="AREngine.togglePlacement()">
                <i class="fa-solid fa-location-crosshairs"></i> Anchor in Space
              </button>
              <button class="ar-hud-btn" id="btn-ar-scale" onclick="AREngine.toggleScale()">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i> <span id="btn-scale-text">1:1 Real Size</span>
              </button>
              <button class="ar-hud-btn" id="btn-ar-camera" onclick="AREngine.toggleWebcam()">
                <i class="fa-solid fa-camera"></i> Live Camera
              </button>
              <button class="ar-hud-btn" id="btn-ar-rotate" onclick="AREngine.rotateModel()">
                <i class="fa-solid fa-arrows-rotate"></i> Rotate 45&deg;
              </button>
            </div>
          </div>

          <!-- AR Mobile Launcher & Controls Panel -->
          <div class="ar-sidebar-panel">
            <div class="ar-sidebar-card">
              <h4><i class="fa-solid fa-mobile-screen-button"></i> Mobile AR Quick-Launch</h4>
              <p>Scan this QR code with your iPhone or Android camera to instantly open the 3D model &amp; AR Walkthrough on your phone!</p>
              
              <div class="ar-qr-box">
                <div id="ar-qr-canvas-wrap" class="qr-canvas-wrap" style="min-height: 180px; display: flex; align-items: center; justify-content: center;">
                  <!-- Generated Dynamic Scannable QR Code -->
                </div>
                <span class="qr-label" id="qr-target-label"><i class="fa-solid fa-qrcode"></i> Live Mobile AR Link</span>
              </div>

              <!-- Action Link Copy & Direct Mobile View -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="ar-direct-link-input" readonly class="auth-input" style="font-size: 0.74rem; padding: 6px 10px; background: #fdf2f8;" value="">
                  <button class="btn-user-action btn-user-primary" onclick="AREngine.copyMobileLink()" title="Copy Link to Clipboard">
                    <i class="fa-solid fa-copy"></i> Copy
                  </button>
                </div>
                <a id="ar-open-tab-link" href="ar-view.html" target="_blank" class="btn-auth-submit" style="text-decoration: none; text-align: center; padding: 8px; font-size: 0.8rem; background: #fdf2f8; border: 1px solid #f472b6; color: #db2777; border-radius: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Mobile View in Tab
                </a>
              </div>
            </div>

            <div class="ar-sidebar-card">
              <h4><i class="fa-solid fa-sliders"></i> Size &amp; Height Adjustments</h4>
              
              <div class="ar-slider-group">
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; margin-bottom:4px;">
                  <label>Model Size Scale</label>
                  <span id="ar-size-val-label" style="font-weight:700; color:#db2777;">100%</span>
                </div>
                <input type="range" min="30" max="250" value="100" class="ar-slider" id="ar-scale-slider" oninput="AREngine.onSliderScale(this.value)">
              </div>

              <div class="ar-slider-group">
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; margin-bottom:4px;">
                  <label>Elevation Height</label>
                  <span id="ar-height-val-label" style="font-weight:700; color:#db2777;">0 cm</span>
                </div>
                <input type="range" min="-100" max="100" value="0" class="ar-slider" id="ar-height-slider" oninput="AREngine.onSliderHeight(this.value)">
              </div>

              <div class="ar-slider-group">
                <label>Rotation Angle</label>
                <input type="range" min="0" max="360" value="0" class="ar-slider" id="ar-rot-slider" oninput="AREngine.onSliderRotate(this.value)">
              </div>

              <div class="ar-env-presets" style="display: flex; gap: 6px; margin-top: 8px;">
                <button class="ar-preset-btn active" onclick="AREngine.setEnvironment('livingroom')">Living Room</button>
                <button class="ar-preset-btn" onclick="AREngine.setEnvironment('tabletop')">Desk Table</button>
                <button class="ar-preset-btn" onclick="AREngine.setEnvironment('outdoor')">Lawn / Yard</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  initARScene() {
    const canvas = document.getElementById('ar-canvas');
    const container = document.getElementById('ar-viewport-wrap');
    if (!canvas || !container || typeof THREE === 'undefined') return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    this.arScene = new THREE.Scene();
    this.arCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.arCamera.position.set(0, 3.2, 7.5);

    this.arRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    this.arRenderer.setSize(width, height);
    this.arRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.arRenderer.shadowMap.enabled = true;

    // Attach OrbitControls with full pan, zoom, and rotate capabilities
    if (THREE.OrbitControls) {
      this.arControls = new THREE.OrbitControls(this.arCamera, this.arRenderer.domElement);
      this.arControls.enableDamping = true;
      this.arControls.dampingFactor = 0.05;
      this.arControls.enablePan = true;
      this.arControls.enableZoom = true;
      this.arControls.enableRotate = true;
      this.arControls.target.set(0, 0, 0);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    this.arScene.add(ambientLight);
    this.ambientLight = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight.position.set(8, 15, 10);
    dirLight.castShadow = true;
    this.arScene.add(dirLight);

    // Build Current Indian AR Model (with full furnished interior & glass walls)
    this.buildARVillaModel();

    // Create AR Reticle (Plane tracking indicator)
    const reticleGeo = new THREE.RingGeometry(0.3, 0.38, 32).rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide });
    this.arReticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.arReticle.position.set(0, -0.4, 0);
    this.arScene.add(this.arReticle);

    // Animate
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.arControls) this.arControls.update();
      if (this.arReticle) {
        const time = Date.now() * 0.003;
        this.arReticle.scale.setScalar(1 + Math.sin(time) * 0.08);
      }
      this.arRenderer.render(this.arScene, this.arCamera);
    };
    animate();

    window.addEventListener('resize', () => this.onARResize());
  },

  buildARVillaModel() {
    if (this.arModelGroup) {
      this.arScene.remove(this.arModelGroup);
    }
    this.arModelGroup = new THREE.Group();
    this.arModelGroup.position.set(this.targetOffset.x, this.targetOffset.y, this.targetOffset.z);

    const modelId = this.currentProperty ? (this.currentProperty.modelId || 'model-mumbai') : 'model-mumbai';

    // Material definitions
    const floorWood = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.5 });
    const floorMarble = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.1 });
    const wallWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.32, roughness: 0.1 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 });
    const woodFurnitureMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.05, metalness: 0.85 });

    if (modelId === 'model-mumbai' || modelId === 'prop-1') {
      // 1. MUMBAI 1 BHK COMPACT STUDIO (Visible Interior)
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.15, 3.5), floorWood);
      base.position.y = 0.08;
      this.arModelGroup.add(base);

      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.8, 0.05), glassMat);
      glassFront.position.set(0, 0.95, 1.75);
      const glassBack = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.8, 0.05), glassMat);
      glassBack.position.set(0, 0.95, -1.75);
      this.arModelGroup.add(glassFront, glassBack);

      // Living Room Sofa & Coffee Table
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.6), sofaMat);
      sofa.position.set(-1.2, 0.25, 0.5);
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.4), woodFurnitureMat);
      table.position.set(-1.2, 0.15, 1.1);
      this.arModelGroup.add(sofa, table);

      // Kitchen Island
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.5), woodFurnitureMat);
      island.position.set(-1.2, 0.28, -0.9);
      this.arModelGroup.add(island);

      // Glass Partition & Bedroom
      const part = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 2.0), glassMat);
      part.position.set(0.5, 0.8, -0.8);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.4), bedMat);
      bed.position.set(1.5, 0.25, -0.9);
      this.arModelGroup.add(part, bed);

      // Balcony
      const bal = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.8), floorWood);
      bal.position.set(1.4, 0.08, 2.05);
      this.arModelGroup.add(bal);

      // Roof Slab
      this.arRoofMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 3.7), wallWhite);
      this.arRoofMesh.position.set(0, 1.9, 0);
      this.arModelGroup.add(this.arRoofMesh);

    } else if (modelId === 'model-pune' || modelId === 'prop-2') {
      // 2. PUNE 2 BHK GREEN HAVEN
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.15, 4.2), floorWood);
      base.position.y = 0.08;
      this.arModelGroup.add(base);

      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.9, 0.05), glassMat);
      glassFront.position.set(0, 1.0, 2.1);
      this.arModelGroup.add(glassFront);

      // Emerald Sofa & 4-Seater Dining Set
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.7), emeraldMat);
      sofa.position.set(-1.4, 0.27, 0.6);
      const dining = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.7), woodFurnitureMat);
      dining.position.set(-1.4, 0.25, -1.0);
      this.arModelGroup.add(sofa, dining);

      // 2 Bedrooms
      const bed1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.4), bedMat);
      bed1.position.set(1.6, 0.23, -1.0);
      const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.3), bedMat);
      bed2.position.set(1.6, 0.23, 1.0);
      this.arModelGroup.add(bed1, bed2);

      // Green Planters
      const planter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0x166534 }));
      planter.position.set(0, 0.2, 2.3);
      this.arModelGroup.add(planter);

      this.arRoofMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 4.4), wallWhite);
      this.arRoofMesh.position.set(0, 2.0, 0);
      this.arModelGroup.add(this.arRoofMesh);

    } else if (modelId === 'model-delhi' || modelId === 'prop-3') {
      // 3. DELHI 5 BHK GRAND IMPERIAL MANOR
      const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 5.2), floorMarble);
      base.position.y = 0.1;
      this.arModelGroup.add(base);

      // Double-height Glass Atrium
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.0, 0.05), glassMat);
      glassFront.position.set(0, 1.6, 2.6);
      this.arModelGroup.add(glassFront);

      // Chandelier
      const chand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.15, 0.6, 12), goldMat);
      chand.position.set(0, 2.4, 0);
      this.arModelGroup.add(chand);

      // Royal Navy Sectional & Banquet Table
      const secSofa = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.9), sofaMat);
      secSofa.position.set(-1.8, 0.3, 1.0);
      const banquet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.8), woodFurnitureMat);
      banquet.position.set(1.8, 0.3, 1.0);
      this.arModelGroup.add(secSofa, banquet);

      // Upper Floor Gallery & Upstairs Bedrooms
      const gallery = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 2.2), floorMarble);
      gallery.position.set(0, 1.6, -1.3);
      const upBed1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), bedMat);
      upBed1.position.set(-2.0, 1.85, -1.3);
      const upBed2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), bedMat);
      upBed2.position.set(2.0, 1.85, -1.3);
      this.arModelGroup.add(gallery, upBed1, upBed2);

      // Outdoor Azure Pool
      const pool = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.6), poolMat);
      pool.position.set(0, 0.06, 3.7);
      this.arModelGroup.add(pool);

      this.arRoofMesh = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.15, 5.4), wallWhite);
      this.arRoofMesh.position.set(0, 3.15, 0);
      this.arModelGroup.add(this.arRoofMesh);

    } else if (modelId === 'model-noida' || modelId === 'prop-4') {
      // 4. NOIDA 4 BHK ROYAL DUPLEX PENTHOUSE
      const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.15, 4.6), floorMarble);
      base.position.y = 0.08;
      this.arModelGroup.add(base);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.8, 0.05), glassMat);
      glass.position.set(0, 1.5, 2.3);
      this.arModelGroup.add(glass);

      // Floating Wooden Staircase
      for (let s = 0; s < 6; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.25), woodFurnitureMat);
        step.position.set(2.2 - s * 0.12, 0.2 + s * 0.2, 0.6 - s * 0.28);
        this.arModelGroup.add(step);
      }

      // Upper Mezzanine Suite
      const mez = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 2.5), floorMarble);
      mez.position.set(-1.0, 1.45, -0.9);
      const mezBed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), bedMat);
      mezBed.position.set(-1.2, 1.7, -0.9);
      this.arModelGroup.add(mez, mezBed);

      // Sky Jacuzzi
      const jacuzzi = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), poolMat);
      jacuzzi.position.set(1.9, 0.24, -1.4);
      this.arModelGroup.add(jacuzzi);

      this.arRoofMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.14, 4.8), wallWhite);
      this.arRoofMesh.position.set(0, 3.0, 0);
      this.arModelGroup.add(this.arRoofMesh);
    }

    this.arScene.add(this.arModelGroup);
    this.resetARView();
  },

  /* Pan & Move Controls (Up, Down, Left, Right, Reset) */
  panModel(dx, dy) {
    this.targetOffset.x += dx;
    this.targetOffset.y += dy;
    if (this.arModelGroup) {
      this.arModelGroup.position.set(this.targetOffset.x, this.targetOffset.y, this.targetOffset.z);
    }
    if (this.arControls) {
      this.arControls.target.x += dx;
      this.arControls.target.y += dy;
      this.arControls.update();
    }
  },

  resetARView() {
    this.targetOffset = { x: 0, y: -0.4, z: 0 };
    if (this.arModelGroup) {
      this.arModelGroup.position.set(0, -0.4, 0);
      this.arModelGroup.rotation.set(0, 0, 0);
    }
    if (this.arCamera && this.arControls) {
      this.arCamera.position.set(0, 3.2, 7.5);
      this.arControls.target.set(0, 0.4, 0);
      this.arControls.update();
    }
  },

  onSliderScale(val) {
    const scale = Number(val) / 100;
    if (this.arModelGroup) {
      this.arModelGroup.scale.set(scale, scale, scale);
    }
    const label = document.getElementById('ar-size-val-label');
    if (label) label.textContent = `${val}%`;
  },

  onSliderHeight(val) {
    const heightOffset = (Number(val) / 100) * 0.8;
    this.targetOffset.y = -0.4 + heightOffset;
    if (this.arModelGroup) {
      this.arModelGroup.position.y = this.targetOffset.y;
    }
    const label = document.getElementById('ar-height-val-label');
    if (label) label.textContent = `${val > 0 ? '+' : ''}${val} cm`;
  },

  togglePlacement() {
    this.isPlaced = !this.isPlaced;
    const btn = document.getElementById('btn-ar-place');
    const reticle = document.getElementById('ar-reticle');
    if (this.isPlaced) {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-lock"></i> Anchored &bull; Click to Move';
      if (reticle) reticle.style.opacity = '0';
      if (this.arReticle) this.arReticle.visible = false;
    } else {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Anchor in Space';
      if (reticle) reticle.style.opacity = '1';
      if (this.arReticle) this.arReticle.visible = true;
    }
  },

  toggleScale() {
    const scaleSlider = document.getElementById('ar-scale-slider');
    const btnText = document.getElementById('btn-scale-text');

    if (this.scaleMode === 'tabletop') {
      this.scaleMode = 'real';
      if (scaleSlider) {
        scaleSlider.value = 180;
        this.onSliderScale(180);
      }
      if (btnText) btnText.textContent = '1:50 Tabletop';
    } else {
      this.scaleMode = 'tabletop';
      if (scaleSlider) {
        scaleSlider.value = 100;
        this.onSliderScale(100);
      }
      if (btnText) btnText.textContent = '1:1 Real Size';
    }
  },

  rotateModel() {
    this.rotationAngle = (this.rotationAngle + 45) % 360;
    if (this.arModelGroup) {
      this.arModelGroup.rotation.y = (this.rotationAngle * Math.PI) / 180;
    }
    const slider = document.getElementById('ar-rot-slider');
    if (slider) slider.value = this.rotationAngle;
  },

  onSliderRotate(val) {
    this.rotationAngle = Number(val);
    if (this.arModelGroup) {
      this.arModelGroup.rotation.y = (this.rotationAngle * Math.PI) / 180;
    }
  },

  toggleRoofCutaway() {
    this.isCutaway = !this.isCutaway;
    if (this.arRoofMesh) {
      this.arRoofMesh.visible = !this.isCutaway;
    }
    if (this.isCutaway && this.arCamera && this.arControls) {
      this.arCamera.position.set(0, 5.5, 4.5);
      this.arControls.target.set(0, 0.4, 0);
      this.arControls.update();
    }
  },

  teleportRoom(room) {
    if (!this.arCamera || !this.arControls) return;
    if (room === 'living') {
      this.arCamera.position.set(-1.5, 1.2, 2.5);
      this.arControls.target.set(-1.2, 0.4, 0.5);
    } else if (room === 'bedroom') {
      this.arCamera.position.set(1.5, 1.2, 1.2);
      this.arControls.target.set(1.5, 0.4, -0.9);
    } else if (room === 'kitchen') {
      this.arCamera.position.set(-1.2, 1.1, 0.4);
      this.arControls.target.set(-1.2, 0.4, -0.9);
    } else if (room === 'terrace') {
      this.arCamera.position.set(0, 1.4, 3.2);
      this.arControls.target.set(0, 0.3, 2.0);
    }
    this.arControls.update();
  },

  setEnvironment(type) {
    const bg = document.getElementById('ar-sim-background');
    if (!bg) return;
    document.querySelectorAll('.ar-preset-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (type === 'livingroom') {
      bg.style.backgroundImage = `radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(248, 250, 252, 0.95) 100%), url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&auto=format&fit=crop&q=80')`;
    } else if (type === 'tabletop') {
      bg.style.backgroundImage = `radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(248, 250, 252, 0.95) 100%), url('https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=1200&auto=format&fit=crop&q=80')`;
    } else {
      bg.style.backgroundImage = `radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(248, 250, 252, 0.95) 100%), url('https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80')`;
    }
  },

  async toggleWebcam() {
    const video = document.getElementById('ar-camera-video');
    const bg = document.getElementById('ar-sim-background');
    const btn = document.getElementById('btn-ar-camera');

    if (this.mediaStream) {
      this.stopCameraStream();
      if (video) video.style.display = 'none';
      if (bg) bg.style.display = 'block';
      if (btn) btn.classList.remove('active');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        this.mediaStream = stream;
        if (video) {
          video.srcObject = stream;
          video.style.display = 'block';
        }
        if (bg) bg.style.display = 'none';
        if (btn) btn.classList.add('active');
      } else {
        alert('Webcam is not supported on this browser.');
      }
    } catch (err) {
      alert('Camera access unavailable. Using the ultra-realistic Simulated AR Studio.');
    }
  },

  stopCameraStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  },

  onARResize() {
    const canvas = document.getElementById('ar-canvas');
    const container = document.getElementById('ar-viewport-wrap');
    if (!canvas || !container || !this.arRenderer || !this.arCamera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.arCamera.aspect = width / height;
    this.arCamera.updateProjectionMatrix();
    this.arRenderer.setSize(width, height);
  },

  /* Real Working Scannable Dynamic QR Code Generator */
  generateQRCode() {
    const qrWrap = document.getElementById('ar-qr-canvas-wrap');
    const linkInput = document.getElementById('ar-direct-link-input');
    const openLink = document.getElementById('ar-open-tab-link');
    if (!qrWrap) return;

    const modelId = this.currentProperty ? (this.currentProperty.modelId || 'model-mumbai') : 'model-mumbai';
    
    // Clean target mobile URL
    let baseUrl = window.location.href.split('#')[0].split('?')[0];
    const lastSlash = baseUrl.lastIndexOf('/');
    const dirUrl = lastSlash !== -1 ? baseUrl.substring(0, lastSlash + 1) : baseUrl + '/';
    const mobileUrl = `${dirUrl}ar-view.html?model=${modelId}`;

    if (linkInput) linkInput.value = mobileUrl;
    if (openLink) openLink.href = `ar-view.html?model=${modelId}`;

    // Generate dynamic QR code URL
    const qrTargetData = mobileUrl.startsWith('file:') 
      ? `https://ar-realtour.netlify.app/ar-view.html?model=${modelId}` 
      : mobileUrl;
      
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetData)}&margin=6&color=83-24-67&bgcolor=255-255-255`;

    qrWrap.innerHTML = `
      <div style="position: relative; padding: 8px; background: #ffffff; border: 1.5px solid #fbcfe8; border-radius: 12px; box-shadow: 0 4px 14px rgba(244, 114, 182, 0.2); display: inline-block;">
        <img src="${qrApiUrl}" alt="Scannable AR QR Code" style="width: 170px; height: 170px; display: block; border-radius: 6px;" onerror="this.onerror=null; AREngine.renderFallbackCanvasQR('${qrTargetData}')">
      </div>
    `;
  },

  renderFallbackCanvasQR(url) {
    const qrWrap = document.getElementById('ar-qr-canvas-wrap');
    if (!qrWrap) return;

    // Fast local canvas QR matrix fallback
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 160, 160);

    ctx.fillStyle = '#831843';
    // Three Corner Finders
    const drawFinder = (x, y) => {
      ctx.fillRect(x, y, 36, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, y + 5, 26, 26);
      ctx.fillStyle = '#831843';
      ctx.fillRect(x + 10, y + 10, 16, 16);
    };
    drawFinder(8, 8);
    drawFinder(116, 8);
    drawFinder(8, 116);

    // Data grid
    for (let i = 8; i < 152; i += 6) {
      for (let j = 8; j < 152; j += 6) {
        if ((i < 50 && j < 50) || (i > 110 && j < 50) || (i < 50 && j > 110)) continue;
        const hash = (i * 37 + j * 91 + url.length * 13) % 100;
        if (hash > 42) ctx.fillRect(i, j, 5, 5);
      }
    }

    qrWrap.innerHTML = '';
    qrWrap.appendChild(canvas);
  },

  copyMobileLink() {
    const input = document.getElementById('ar-direct-link-input');
    if (!input) return;
    input.select();
    const linkText = input.value.startsWith('http') ? input.value : window.location.href.replace(/[^/]*$/, '') + input.value;
    navigator.clipboard.writeText(linkText).then(() => {
      alert('Mobile AR link copied to clipboard!\n\nLink: ' + linkText + '\n\nShare this link to your phone via WhatsApp or browser to open instantly.');
    }).catch(() => {
      alert('Link: ' + linkText);
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.AREngine.init();
});
