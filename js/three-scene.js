/**
 * VILLA 3D - INTERACTIVE THREE.JS ARCHITECTURAL ENGINE
 * Luxury Real Estate 3D Model, Virtual Tour, Dynamic Lighting & Material Customizer
 */

// Global 3D Tour Controller instance
window.Villa3D = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  villaGroup: null,
  poolWater: null,
  lights: {},
  hotspots: [],
  materials: {},
  currentTheme: 'day',
  isAutoRotate: true,
  animationFrameId: null,

  // Customizer Mini Scene
  customScene: null,
  customCamera: null,
  customRenderer: null,
  customControls: null,
  customGroup: null,
  customMaterials: {},

  init() {
    this.initMainViewer();
    this.initCustomizerScene();
  },

  /* ==========================================================================
     1. MAIN 3D ARCHITECTURAL TOUR VIEWER
     ========================================================================== */
  initMainViewer() {
    const container = document.getElementById('tour-canvas-container');
    const canvas = document.getElementById('main-3d-canvas');
    if (!container || !canvas || typeof THREE === 'undefined') return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f8fafc');
    this.scene.fog = new THREE.FogExp2('#f8fafc', 0.008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(38, 22, 42);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Controls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
      this.controls.minDistance = 12;
      this.controls.maxDistance = 90;
      this.controls.target.set(0, 5, 0);
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.8;
    }

    // Initialize Lighting
    this.setupLighting();

    // Build Environment (Ground, Pool, Trees, Ambient details)
    this.buildEnvironment();

    // Load Default 3D Property Model (Mumbai Compact Studio)
    this.loadPropertyModel('prop-mumbai');

    // Setup Event Listeners
    this.setupEventListeners();

    // Start Animation Loop
    this.animate();

    // Handle Window Resizing
    window.addEventListener('resize', () => this.onWindowResize());
  },

  /* ==========================================================================
     LIGHTING & ATMOSPHERE
     ========================================================================== */
  setupLighting() {
    // Ambient Light
    this.lights.ambient = new THREE.AmbientLight('#ffffff', 0.7);
    this.scene.add(this.lights.ambient);

    // Main Sunlight (Directional)
    this.lights.sun = new THREE.DirectionalLight('#ffffff', 1.8);
    this.lights.sun.position.set(45, 60, 35);
    this.lights.sun.castShadow = true;
    this.lights.sun.shadow.mapSize.width = 2048;
    this.lights.sun.shadow.mapSize.height = 2048;
    this.lights.sun.shadow.camera.near = 10;
    this.lights.sun.shadow.camera.far = 150;
    this.lights.sun.shadow.camera.left = -40;
    this.lights.sun.shadow.camera.right = 40;
    this.lights.sun.shadow.camera.top = 40;
    this.lights.sun.shadow.camera.bottom = -40;
    this.lights.sun.shadow.bias = -0.0005;
    this.scene.add(this.lights.sun);

    // Secondary Fill Light
    this.lights.fill = new THREE.DirectionalLight('#7dd3fc', 0.6);
    this.lights.fill.position.set(-30, 20, -30);
    this.scene.add(this.lights.fill);

    // Warm Interior Glow Lights
    this.lights.interior1 = new THREE.PointLight('#ffedd5', 1.5, 25);
    this.lights.interior1.position.set(0, 4, 0);
    this.scene.add(this.lights.interior1);

    this.lights.interiorUpper = new THREE.PointLight('#fef08a', 1.8, 30);
    this.lights.interiorUpper.position.set(4, 11, 2);
    this.scene.add(this.lights.interiorUpper);

    // Pool Underwater Glow
    this.lights.pool = new THREE.PointLight('#38bdf8', 2.0, 18);
    this.lights.pool.position.set(-14, 0.5, 6);
    this.scene.add(this.lights.pool);
  },

  buildEnvironment() {
    // Ground Terrain
    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Decorative Architectural Grid
    const grid = new THREE.GridHelper(100, 40, 0xf472b6, 0xe2e8f0);
    grid.position.y = -0.04;
    this.scene.add(grid);
  },

  setAtmosphere(theme) {
    this.currentTheme = theme;
    if (theme === 'day') {
      this.scene.background.set('#f8fafc');
      this.scene.fog.color.set('#f8fafc');
      this.lights.ambient.color.set('#ffffff');
      this.lights.ambient.intensity = 0.9;
      this.lights.sun.color.set('#ffffff');
      this.lights.sun.intensity = 1.9;
      this.lights.sun.position.set(45, 60, 35);
      this.lights.fill.color.set('#fdf2f8');
      this.lights.fill.intensity = 0.6;
      this.lights.interior1.intensity = 0.8;
      this.lights.interiorUpper.intensity = 0.9;
    } else if (theme === 'sunset') {
      this.scene.background.set('#fff1f2');
      this.scene.fog.color.set('#fff1f2');
      this.lights.ambient.color.set('#fbcfe8');
      this.lights.ambient.intensity = 0.7;
      this.lights.sun.color.set('#fb7185');
      this.lights.sun.intensity = 2.0;
      this.lights.sun.position.set(50, 18, 40);
      this.lights.fill.color.set('#f472b6');
      this.lights.fill.intensity = 0.8;
      this.lights.interior1.intensity = 2.0;
      this.lights.interiorUpper.intensity = 2.2;
    } else if (theme === 'night') {
      this.scene.background.set('#1e1b4b');
      this.scene.fog.color.set('#1e1b4b');
      this.lights.ambient.color.set('#312e81');
      this.lights.ambient.intensity = 0.4;
      this.lights.sun.color.set('#f472b6');
      this.lights.sun.intensity = 0.4;
      this.lights.sun.position.set(-30, 40, -30);
      this.lights.fill.color.set('#4338ca');
      this.lights.fill.intensity = 0.4;
      this.lights.interior1.intensity = 3.5;
      this.lights.interiorUpper.intensity = 4.0;
      this.lights.pool.intensity = 4.5;
    }
  },

  /* ==========================================================================
     3D REAL ESTATE ARCHITECTURE & INTERIORS (4 INDIAN MODELS: MUMBAI, PUNE, DELHI, NOIDA)
     ========================================================================== */
  initMaterials() {
    this.materials.whiteConcrete = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.05
    });
    this.materials.darkPanel = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.2
    });
    this.materials.woodDeck = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.6,
      metalness: 0.1
    });
    this.materials.lightTeak = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
      metalness: 0.1
    });
    this.materials.marbleFloor = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.1,
      metalness: 0.2
    });
    this.materials.darkMarble = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.3
    });
    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.5,
      reflectivity: 0.9
    });
    this.materials.sofaSlate = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85
    });
    this.materials.sofaEmerald = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.85
    });
    this.materials.sofaRoyalBlue = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.85
    });
    this.materials.sofaPink = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.8
    });
    this.materials.goldTrim = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2
    });
    this.materials.chrome = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.1
    });
    this.materials.bedLinen = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9
    });
    this.materials.duvetNavy = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8
    });
    this.materials.duvetTeal = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.8
    });
    this.materials.duvetRose = new THREE.MeshStandardMaterial({
      color: 0xbe185d,
      roughness: 0.8
    });
    this.materials.ledGlow = new THREE.MeshBasicMaterial({
      color: 0xf472b6
    });
    this.materials.cyanLed = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });
    this.materials.plants = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7
    });
  },

  loadPropertyModel(modelId) {
    if (!this.materials.whiteConcrete) {
      this.initMaterials();
    }
    this.currentModelId = modelId || 'prop-mumbai';

    // Remove existing villa group
    if (this.villaGroup) {
      this.scene.remove(this.villaGroup);
    }
    this.villaGroup = new THREE.Group();

    // Clear and rebuild hotspots
    this.clearHotspots();

    const normalizedId = String(modelId).toLowerCase();

    if (normalizedId.includes('mumbai') || normalizedId === 'model-1' || normalizedId === 'prop-1') {
      this.buildMumbaiStudio();
      this.setupMumbaiHotspots();
      this.updateLaserHUD('16.0 m (L) × 12.0 m (W) × 5.8 m (H) • 850 sq ft • Small Home (Mumbai)');
      this.updateModelTitle('Aura Bay Luxury Compact Studio • Bandra West, Mumbai (₹1.85 Cr)');
      this.updateStudioMeta('₹1.85 Cr', 'Small Home &bull; Bandra West, Mumbai', '1 BHK', '2 Baths', '850 sq ft', 'Mumbai');
    } else if (normalizedId.includes('pune') || normalizedId === 'model-2' || normalizedId === 'prop-2') {
      this.buildPuneHaven();
      this.setupPuneHotspots();
      this.updateLaserHUD('18.0 m (L) × 14.0 m (W) × 6.5 m (H) • 1,150 sq ft • Small Home (Pune)');
      this.updateModelTitle('Gulmohar Green Compact Haven • Koregaon Park, Pune (₹78 Lakh)');
      this.updateStudioMeta('₹78 Lakh', 'Small Home &bull; Koregaon Park, Pune', '2 BHK', '2 Baths', '1,150 sq ft', 'Pune');
    } else if (normalizedId.includes('delhi') || normalizedId === 'model-3' || normalizedId === 'prop-3') {
      this.buildDelhiVilla();
      this.setupDelhiHotspots();
      this.updateLaserHUD('28.0 m (L) × 20.0 m (W) × 12.0 m (H) • 8,200 sq ft • Large Home (Delhi)');
      this.updateModelTitle('Rajvilas Grand Imperial Manor • Vasant Vihar, Delhi (₹14.50 Cr)');
      this.updateStudioMeta('₹14.50 Cr', 'Large Home &bull; Vasant Vihar, Delhi', '5 BHK', '6 Baths', '8,200 sq ft', 'Delhi');
    } else if (normalizedId.includes('noida') || normalizedId === 'model-4' || normalizedId === 'prop-4') {
      this.buildNoidaPenthouse();
      this.setupNoidaHotspots();
      this.updateLaserHUD('24.0 m (L) × 18.0 m (W) × 11.5 m (H) • 5,600 sq ft • Large Home (Noida)');
      this.updateModelTitle('The Palm Royal Duplex Penthouse • Sector 128, Noida (₹5.95 Cr)');
      this.updateStudioMeta('₹5.95 Cr', 'Large Home &bull; Sector 128, Noida', '4 BHK', '5 Baths', '5,600 sq ft', 'Noida');
    } else {
      this.buildMumbaiStudio();
      this.setupMumbaiHotspots();
      this.updateLaserHUD('16.0 m (L) × 12.0 m (W) × 5.8 m (H) • 850 sq ft • Small Home (Mumbai)');
      this.updateModelTitle('Aura Bay Luxury Compact Studio • Bandra West, Mumbai (₹1.85 Cr)');
      this.updateStudioMeta('₹1.85 Cr', 'Small Home &bull; Bandra West, Mumbai', '1 BHK', '2 Baths', '850 sq ft', 'Mumbai');
    }

    this.scene.add(this.villaGroup);

    // Update active state of selector pills in UI
    document.querySelectorAll('[data-model-select]').forEach(btn => {
      const isMatch = normalizedId.includes(btn.dataset.modelSelect);
      btn.classList.toggle('active', isMatch);
    });
  },

  updateStudioMeta(price, location, beds, baths, sqft, city) {
    const pEl = document.getElementById('tour-studio-meta-price');
    const lEl = document.getElementById('tour-studio-meta-loc');
    const bEl = document.getElementById('tour-meta-beds');
    const baEl = document.getElementById('tour-meta-baths');
    const sEl = document.getElementById('tour-meta-sqft');
    const cEl = document.getElementById('tour-meta-city');
    if (pEl) pEl.textContent = price;
    if (lEl) lEl.innerHTML = location;
    if (bEl) bEl.innerHTML = `<i class="fa-solid fa-bed"></i> ${beds}`;
    if (baEl) baEl.innerHTML = `<i class="fa-solid fa-bath"></i> ${baths}`;
    if (sEl) sEl.innerHTML = `<i class="fa-solid fa-ruler-combined"></i> ${sqft}`;
    if (cEl) cEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${city}`;
  },

  updateLaserHUD(dimensionText) {
    const hud = document.getElementById('measure-hud');
    if (hud) {
      hud.innerHTML = `<i class="fa-solid fa-ruler-combined" style="color: var(--primary);"></i> <span>Laser Dimension: <strong>${dimensionText}</strong></span>`;
    }
  },

  updateModelTitle(titleText) {
    const titleEl = document.querySelector('.tour-studio-section .section-title');
    if (titleEl) {
      titleEl.textContent = titleText;
    }
  },

  /* --------------------------------------------------------------------------
     MODEL 1: MUMBAI AURA BAY STUDIO (SMALL HOME - 850 SQ FT - MUMBAI - ₹1.85 Cr)
     -------------------------------------------------------------------------- */
  buildMumbaiStudio() {
    // 1. Flooring Base
    const baseFloorGeo = new THREE.BoxGeometry(16, 0.4, 12);
    this.customizableFloor = new THREE.Mesh(baseFloorGeo, this.materials.marbleFloor);
    this.customizableFloor.position.set(0, 0.2, 0);
    this.customizableFloor.receiveShadow = true;
    this.villaGroup.add(this.customizableFloor);

    // 2. Structural Walls (Rear & Left Solid, Front & Right Floor-to-Ceiling Glass)
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.4), this.materials.darkPanel);
    rearWall.position.set(0, 2.95, -5.8);
    rearWall.castShadow = true;
    rearWall.receiveShadow = true;
    this.villaGroup.add(rearWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 12), this.materials.whiteConcrete);
    leftWall.position.set(-7.8, 2.95, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.villaGroup.add(leftWall);

    // Front & Right Glass Facades (Crystal Clear for 100% Interior Visibility)
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.15), this.materials.glass);
    frontGlass.position.set(0, 2.95, 5.8);
    this.villaGroup.add(frontGlass);

    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.5, 12), this.materials.glass);
    rightGlass.position.set(7.8, 2.95, 0);
    this.villaGroup.add(rightGlass);

    // 3. Cantilevered Roof with LED Trim
    const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 14), this.materials.whiteConcrete);
    roof.position.set(0, 5.85, 0);
    roof.castShadow = true;
    this.villaGroup.add(roof);

    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.1, 0.15), this.materials.ledGlow);
    ledStrip.position.set(0, 5.65, 5.85);
    this.villaGroup.add(ledStrip);

    // 4. Sea Balcony Deck
    const balconyDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 4), this.materials.woodDeck);
    balconyDeck.position.set(0, 0.15, 7.8);
    balconyDeck.receiveShadow = true;
    this.villaGroup.add(balconyDeck);

    const balconyRailing = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 0.1), this.materials.glass);
    balconyRailing.position.set(0, 1.2, 9.8);
    this.villaGroup.add(balconyRailing);

    // 5. INTERIOR ELEMENTS (LIVING, KITCHEN ISLAND, BEDROOM ALCOVE)
    // A. Living Area: L-Sectional Sofa & Rug
    const rug = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 5), new THREE.MeshStandardMaterial({ color: 0xc4b5fd, roughness: 0.9 }));
    rug.position.set(-3.5, 0.43, 2);
    rug.receiveShadow = true;
    this.villaGroup.add(rug);

    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 1.8), this.materials.sofaSlate);
    sofaMain.position.set(-3.5, 0.85, 3.2);
    sofaMain.castShadow = true;
    this.villaGroup.add(sofaMain);

    const sofaL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 3.0), this.materials.sofaSlate);
    sofaL.position.set(-6.0, 0.85, 1.8);
    sofaL.castShadow = true;
    this.villaGroup.add(sofaL);

    // Coffee Table
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.4), this.materials.goldTrim);
    coffeeTable.position.set(-3.5, 0.65, 1.8);
    coffeeTable.castShadow = true;
    this.villaGroup.add(coffeeTable);

    // TV Wall Console Unit on Left Wall
    const tvUnit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 3.8), this.materials.darkPanel);
    tvUnit.position.set(-7.5, 2.2, 2.0);
    this.villaGroup.add(tvUnit);

    const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 3.2), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    tvScreen.position.set(-7.3, 2.3, 2.0);
    this.villaGroup.add(tvScreen);

    // B. Modular Italian Kitchen Island (Rear Left)
    const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.8), this.materials.whiteConcrete);
    kitchenIsland.position.set(-3.5, 0.95, -3.2);
    kitchenIsland.castShadow = true;
    this.villaGroup.add(kitchenIsland);

    // Faucet & Sink
    const sink = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), this.materials.chrome);
    sink.position.set(-4.2, 1.52, -3.2);
    this.villaGroup.add(sink);

    // 2 Bar Stools
    for (let x of [-3.0, -2.0]) {
      const stoolLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), this.materials.darkPanel);
      stoolLegs.position.set(x, 0.8, -2.0);
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 16), this.materials.goldTrim);
      stoolSeat.position.set(x, 1.25, -2.0);
      this.villaGroup.add(stoolLegs);
      this.villaGroup.add(stoolSeat);
    }

    // C. Master Bedroom Alcove (Right Zone with Fluted Glass Divider)
    const partition = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 6.0), this.materials.glass);
    partition.position.set(0.5, 2.65, -2.0);
    this.villaGroup.add(partition);

    // Platform Bed
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.6, 5.2), this.materials.lightTeak);
    bedBase.position.set(4.2, 0.7, -2.2);
    bedBase.castShadow = true;
    this.villaGroup.add(bedBase);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 4.8), this.materials.bedLinen);
    mattress.position.set(4.2, 1.2, -2.2);
    mattress.castShadow = true;
    this.villaGroup.add(mattress);

    const duvet = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.2, 3.2), this.materials.duvetNavy);
    duvet.position.set(4.2, 1.45, -1.5);
    this.villaGroup.add(duvet);

    // Bed Headboard & Pillows
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 0.3), this.materials.darkPanel);
    headboard.position.set(4.2, 1.8, -4.7);
    this.villaGroup.add(headboard);

    // Pillows
    for (let x of [3.0, 5.4]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.9), this.materials.bedLinen);
      pillow.position.set(x, 1.6, -4.0);
      this.villaGroup.add(pillow);
    }

    // Nightstands with warm lamps
    for (let x of [1.3, 7.0]) {
      const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), this.materials.lightTeak);
      nightstand.position.set(x, 0.7, -4.4);
      this.villaGroup.add(nightstand);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(x, 1.2, -4.4);
      this.villaGroup.add(lamp);
    }

    // D. Balcony Lounge Chairs
    for (let x of [-3.0, 3.0]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.6), this.materials.whiteConcrete);
      chair.position.set(x, 0.65, 7.8);
      this.villaGroup.add(chair);
    }
  },

  /* --------------------------------------------------------------------------
     MODEL 2: PUNE GULMOHAR GREEN HAVEN (SMALL HOME - 1,150 SQ FT - PUNE - ₹78 Lakh)
     -------------------------------------------------------------------------- */
  buildPuneHaven() {
    // 1. Flooring Base (Warm Teakwood & Terracotta)
    const baseFloorGeo = new THREE.BoxGeometry(18, 0.4, 14);
    this.customizableFloor = new THREE.Mesh(baseFloorGeo, this.materials.woodDeck);
    this.customizableFloor.position.set(0, 0.2, 0);
    this.customizableFloor.receiveShadow = true;
    this.villaGroup.add(this.customizableFloor);

    // 2. Eco Modern Stucco Walls & Sloped Pitch Roof
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(18, 5.8, 0.4), this.materials.whiteConcrete);
    rearWall.position.set(0, 3.1, -6.8);
    rearWall.castShadow = true;
    rearWall.receiveShadow = true;
    this.villaGroup.add(rearWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.8, 14), this.materials.whiteConcrete);
    leftWall.position.set(-8.8, 3.1, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.villaGroup.add(leftWall);

    // Front & Right Open Glass Architecture
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(18, 5.8, 0.15), this.materials.glass);
    frontGlass.position.set(0, 3.1, 6.8);
    this.villaGroup.add(frontGlass);

    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.8, 14), this.materials.glass);
    rightGlass.position.set(8.8, 3.1, 0);
    this.villaGroup.add(rightGlass);

    // Sloped Eco Roof with Solar Strips
    const roof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 16), this.materials.darkPanel);
    roof.position.set(0, 6.2, 0);
    roof.rotation.x = -0.05;
    roof.castShadow = true;
    this.villaGroup.add(roof);

    for (let z of [-3, 0, 3]) {
      const solarStrip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 2.0), this.materials.cyanLed);
      solarStrip.position.set(0, 6.45, z);
      solarStrip.rotation.x = -0.05;
      this.villaGroup.add(solarStrip);
    }

    // 3. INTERIOR ELEMENTS: LIVING ROOM, 4-SEATER DINING, MASTER BEDROOM, BOTANICAL GARDEN
    // A. Living Room with Emerald Green Velvet Sofa & Oak Table
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.0, 2.0), this.materials.sofaEmerald);
    sofa.position.set(-4.5, 0.9, 3.5);
    sofa.castShadow = true;
    this.villaGroup.add(sofa);

    const oakTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 1.6), this.materials.lightTeak);
    oakTable.position.set(-4.5, 0.65, 1.2);
    oakTable.castShadow = true;
    this.villaGroup.add(oakTable);

    // 2 Scandinavian Accent Armchairs
    const chair1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), this.materials.goldTrim);
    chair1.position.set(-1.4, 0.8, 2.8);
    chair1.rotation.y = -0.4;
    this.villaGroup.add(chair1);

    // B. 4-Seater Dining Nook (Center Right)
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.85, 2.2), this.materials.lightTeak);
    diningTable.position.set(3.8, 0.82, 3.2);
    diningTable.castShadow = true;
    this.villaGroup.add(diningTable);

    // 4 Dining Chairs
    const chairCoords = [
      [2.5, 3.2, 0], [5.1, 3.2, 0],
      [3.8, 1.8, Math.PI / 2], [3.8, 4.6, -Math.PI / 2]
    ];
    for (let [cx, cz, rot] of chairCoords) {
      const dChair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.9), this.materials.sofaSlate);
      dChair.position.set(cx, 0.8, cz);
      dChair.rotation.y = rot;
      this.villaGroup.add(dChair);
    }

    // Hanging Scandinavian Pendant Lamps over Dining
    for (let x of [3.0, 4.6]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0), this.materials.chrome);
      cord.position.set(x, 4.8, 3.2);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 16), this.materials.goldTrim);
      shade.position.set(x, 3.8, 3.2);
      this.villaGroup.add(cord);
      this.villaGroup.add(shade);
    }

    // C. Kitchen Counter (Rear Center)
    const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 1.8), this.materials.whiteConcrete);
    kitchenCounter.position.set(0, 0.95, -4.8);
    this.villaGroup.add(kitchenCounter);

    // D. Master Bedroom Suite (Rear Right)
    const bedroomWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.0, 5.5), this.materials.whiteConcrete);
    bedroomWall.position.set(1.5, 2.7, -4.0);
    this.villaGroup.add(bedroomWall);

    const puneBed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 4.8), this.materials.lightTeak);
    puneBed.position.set(5.2, 0.7, -4.0);
    puneBed.castShadow = true;
    this.villaGroup.add(puneBed);

    const puneMattress = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.5, 4.4), this.materials.bedLinen);
    puneMattress.position.set(5.2, 1.15, -4.0);
    this.villaGroup.add(puneMattress);

    const puneDuvet = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.18, 2.8), this.materials.duvetTeal);
    puneDuvet.position.set(5.2, 1.35, -3.2);
    this.villaGroup.add(puneDuvet);

    // E. Botanical Planters & Flowers (Front Porch)
    for (let x of [-7, -4, 4, 7]) {
      const planterBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.8), this.materials.whiteConcrete);
      planterBox.position.set(x, 0.5, 7.8);
      const plantFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), this.materials.plants);
      plantFoliage.position.set(x, 1.1, 7.8);
      this.villaGroup.add(planterBox);
      this.villaGroup.add(plantFoliage);
    }
  },

  /* --------------------------------------------------------------------------
     MODEL 3: DELHI RAJVILAS GRAND IMPERIAL MANOR (LARGE HOME - 8,200 SQ FT - DELHI - ₹14.50 Cr)
     -------------------------------------------------------------------------- */
  buildDelhiVilla() {
    // 1. Palatial Ground Floor Structure (Marble & White Stucco)
    const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(28, 6.0, 20), this.materials.whiteConcrete);
    groundFloor.position.set(0, 3.0, 0);
    groundFloor.castShadow = true;
    groundFloor.receiveShadow = true;
    this.villaGroup.add(groundFloor);

    // Customizable Royal Floor
    const floorTile = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 16), this.materials.marbleFloor);
    floorTile.position.set(0, 0.2, 0);
    floorTile.receiveShadow = true;
    this.customizableFloor = floorTile;
    this.villaGroup.add(floorTile);

    // 2. Cantilevered Upper 2nd Story Wings (East & West Suites)
    const upperWingLeft = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 18), this.materials.whiteConcrete);
    upperWingLeft.position.set(-8.5, 8.75, 1);
    upperWingLeft.castShadow = true;
    upperWingLeft.receiveShadow = true;
    this.villaGroup.add(upperWingLeft);

    const upperWingRight = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 18), this.materials.whiteConcrete);
    upperWingRight.position.set(8.5, 8.75, 1);
    upperWingRight.castShadow = true;
    upperWingRight.receiveShadow = true;
    this.villaGroup.add(upperWingRight);

    // Central Double-Height Glass Atrium
    const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 11.5, 0.2), this.materials.glass);
    atriumGlass.position.set(0, 5.75, 9.8);
    this.villaGroup.add(atriumGlass);

    const atriumGlassRear = new THREE.Mesh(new THREE.BoxGeometry(10, 11.5, 0.2), this.materials.glass);
    atriumGlassRear.position.set(0, 5.75, -9.8);
    this.villaGroup.add(atriumGlassRear);

    // Classical Columns at Front Portico
    for (let x of [-4.5, 4.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 11.5, 16), this.materials.whiteConcrete);
      col.position.set(x, 5.75, 10.4);
      col.castShadow = true;
      this.villaGroup.add(col);
    }

    // Grand Roof with Gold Cornice & Terrace Balustrade
    const grandRoof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 22), this.materials.darkPanel);
    grandRoof.position.set(0, 11.75, 1);
    grandRoof.castShadow = true;
    this.villaGroup.add(grandRoof);

    // 3. INTERIOR PALATIAL ELEMENTS (CHANDELIER, ROYAL SOFA, 8-SEATER DINING, 2 MASTER SUITES)
    // A. Central Swarovski Crystal Chandelier (Hanging from Atrium Ceiling)
    const chandelierCord = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.0), this.materials.goldTrim);
    chandelierCord.position.set(0, 9.5, 0);
    const chandelierRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 16, 32), this.materials.goldTrim);
    chandelierRing.position.set(0, 7.5, 0);
    chandelierRing.rotation.x = Math.PI / 2;
    const chandelierGlow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    chandelierGlow.position.set(0, 7.5, 0);
    this.villaGroup.add(chandelierCord);
    this.villaGroup.add(chandelierRing);
    this.villaGroup.add(chandelierGlow);

    // B. Grand Royal Blue Curved Sectional Sofa (Ground Atrium)
    const royalSofa = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.1, 2.4), this.materials.sofaRoyalBlue);
    royalSofa.position.set(0, 0.95, 4.2);
    royalSofa.castShadow = true;
    this.villaGroup.add(royalSofa);

    const royalCoffeeTable = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.5, 2.0), this.materials.darkMarble);
    royalCoffeeTable.position.set(0, 0.7, 1.8);
    royalCoffeeTable.castShadow = true;
    this.villaGroup.add(royalCoffeeTable);

    // C. 8-Seater Formal Royal Dining Table (Ground Rear)
    const royalDining = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.9, 2.8), this.materials.lightTeak);
    royalDining.position.set(0, 0.85, -4.5);
    royalDining.castShadow = true;
    this.villaGroup.add(royalDining);

    // 8 Dining Chairs with Gold Trim
    for (let i = -2.2; i <= 2.2; i += 1.4) {
      const chairFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.8), this.materials.goldTrim);
      chairFront.position.set(i, 0.85, -3.0);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.8), this.materials.goldTrim);
      chairBack.position.set(i, 0.85, -6.0);
      this.villaGroup.add(chairFront);
      this.villaGroup.add(chairBack);
    }

    // D. Upper Floor Master Suite 1 (Upper Left)
    const masterBed1 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.7, 5.5), this.materials.whiteConcrete);
    masterBed1.position.set(-8.5, 6.75, 2);
    masterBed1.castShadow = true;
    this.villaGroup.add(masterBed1);

    const duvet1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 3.8), this.materials.duvetNavy);
    duvet1.position.set(-8.5, 7.3, 3);
    this.villaGroup.add(duvet1);

    // E. Upper Floor VIP Suite 2 (Upper Right)
    const masterBed2 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.7, 5.5), this.materials.whiteConcrete);
    masterBed2.position.set(8.5, 6.75, 2);
    masterBed2.castShadow = true;
    this.villaGroup.add(masterBed2);

    const duvet2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 3.8), this.materials.duvetRose);
    duvet2.position.set(8.5, 7.3, 3);
    this.villaGroup.add(duvet2);

    // F. Connecting Upper Glass Walkway Bridge
    const bridgeFloor = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.25, 3.5), this.materials.glass);
    bridgeFloor.position.set(0, 6.2, -1.0);
    this.villaGroup.add(bridgeFloor);

    // G. Grand Outdoor Swimming Pool (Left Side)
    const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 }));
    poolBasin.position.set(-18, -0.4, 2);
    this.villaGroup.add(poolBasin);

    const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 7.4), new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, transmission: 0.7 }));
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(-18, 0.25, 2);
    this.villaGroup.add(poolWater);
  },

  /* --------------------------------------------------------------------------
     MODEL 4: NOIDA THE PALM ROYAL DUPLEX PENTHOUSE (LARGE HOME - 5,600 SQ FT - NOIDA - ₹5.95 Cr)
     -------------------------------------------------------------------------- */
  buildNoidaPenthouse() {
    // 1. Lower Level Penthouse Base (24m x 18m x 5.5m)
    const lowerFloor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 18), this.materials.marbleFloor);
    lowerFloor.position.set(0, 0.2, 0);
    lowerFloor.receiveShadow = true;
    this.customizableFloor = lowerFloor;
    this.villaGroup.add(lowerFloor);

    // Solid Core Walls & Glass Exterior
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 0.4), this.materials.darkPanel);
    rearWall.position.set(0, 2.95, -8.8);
    rearWall.castShadow = true;
    this.villaGroup.add(rearWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 18), this.materials.whiteConcrete);
    leftWall.position.set(-11.8, 2.95, 0);
    leftWall.castShadow = true;
    this.villaGroup.add(leftWall);

    // Lower Front Curtain Glass
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 0.15), this.materials.glass);
    frontGlass.position.set(0, 2.95, 8.8);
    this.villaGroup.add(frontGlass);

    // 2. Upper Mezzanine Level (16m x 14m x 5.5m offset for dramatic double-height void)
    const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 14), this.materials.whiteConcrete);
    upperFloor.position.set(4, 5.8, -1.8);
    upperFloor.castShadow = true;
    upperFloor.receiveShadow = true;
    this.villaGroup.add(upperFloor);

    const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.15), this.materials.glass);
    upperGlass.position.set(4, 8.55, 5.2);
    this.villaGroup.add(upperGlass);

    // Roof & Sky Terrace
    const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 16), this.materials.darkPanel);
    roof.position.set(4, 11.45, -1.8);
    roof.castShadow = true;
    this.villaGroup.add(roof);

    // 3. INTERIOR ELEMENTS: DOUBLE-HEIGHT SALON, FLOATING STAIRCASE, UPPER MASTER SUITE, SKY JACUZZI
    // A. Double-Height Living Salon (Lower Left Void Area)
    const salonSofa = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 2.4), this.materials.sofaSlate);
    salonSofa.position.set(-6.5, 0.9, 3.5);
    salonSofa.castShadow = true;
    this.villaGroup.add(salonSofa);

    const salonTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 1.8), this.materials.marbleFloor);
    salonTable.position.set(-6.5, 0.65, 1.0);
    salonTable.castShadow = true;
    this.villaGroup.add(salonTable);

    // B. Modern Floating Wooden Staircase
    for (let step = 0; step < 12; step++) {
      const stairTread = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.8), this.materials.lightTeak);
      stairTread.position.set(-3.5 + step * 0.45, 0.5 + step * 0.45, -4.5);
      stairTread.castShadow = true;
      this.villaGroup.add(stairTread);
    }

    // C. Island Show Kitchen with 3 Bar Stools (Lower Right)
    const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 2.0), this.materials.whiteConcrete);
    kitchenIsland.position.set(6.0, 0.95, -4.5);
    kitchenIsland.castShadow = true;
    this.villaGroup.add(kitchenIsland);

    for (let x of [4.5, 6.0, 7.5]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.85, 16), this.materials.goldTrim);
      stool.position.set(x, 0.85, -3.0);
      this.villaGroup.add(stool);
    }

    // D. Upper Mezzanine Master Penthouse Suite
    const upperBed = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.7, 5.5), this.materials.whiteConcrete);
    upperBed.position.set(6.0, 6.35, -2.0);
    upperBed.castShadow = true;
    this.villaGroup.add(upperBed);

    const upperDuvet = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 3.8), this.materials.duvetTeal);
    upperDuvet.position.set(6.0, 6.9, -1.0);
    this.villaGroup.add(upperDuvet);

    // E. Rooftop Open Sky Terrace with Heated Jacuzzi (Front Left of Upper Level)
    const jacuzziBasin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.2, 4.0), this.materials.whiteConcrete);
    jacuzziBasin.position.set(-6.5, 5.8, 3.5);
    this.villaGroup.add(jacuzziBasin);

    const jacuzziWater = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85, transmission: 0.6 }));
    jacuzziWater.rotation.x = -Math.PI / 2;
    jacuzziWater.position.set(-6.5, 6.35, 3.5);
    this.villaGroup.add(jacuzziWater);

    // Sun Loungers by Jacuzzi
    const lounger1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 3.8), this.materials.lightTeak);
    lounger1.position.set(-2.5, 5.8, 3.5);
    this.villaGroup.add(lounger1);
  },

  /* ==========================================================================
     ENVIRONMENT (GROUND, INFINITY POOL, LANDSCAPE, TREES)
     ========================================================================== */
  buildEnvironment() {
    // 1. Manicured Lawn / Base Ground
    const lawnGeo = new THREE.PlaneGeometry(120, 120);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x111c1d,
      roughness: 0.9,
      metalness: 0.05
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.05;
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // 2. Hardscape Sunken Outdoor Lounge & Pool Deck
    const deckGeo = new THREE.BoxGeometry(38, 0.4, 30);
    const deck = new THREE.Mesh(deckGeo, this.materials.woodDeck);
    deck.position.set(-5, 0.1, 8);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.scene.add(deck);

    // 3. Heated Infinity Edge Pool
    const poolBasinGeo = new THREE.BoxGeometry(16, 1.5, 12);
    const poolBasinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 });
    const poolBasin = new THREE.Mesh(poolBasinGeo, poolBasinMat);
    poolBasin.position.set(-14, -0.4, 6);
    this.scene.add(poolBasin);

    // Water Surface
    const waterGeo = new THREE.PlaneGeometry(15.4, 11.4);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.333
    });
    this.poolWater = new THREE.Mesh(waterGeo, waterMat);
    this.poolWater.rotation.x = -Math.PI / 2;
    this.poolWater.position.set(-14, 0.25, 6);
    this.scene.add(this.poolWater);

    // 4. Sun Loungers by Pool
    for (let i = -2; i <= 2; i += 2.5) {
      const loungerGeo = new THREE.BoxGeometry(2, 0.4, 4.5);
      const lounger = new THREE.Mesh(loungerGeo, this.materials.whiteConcrete);
      lounger.position.set(-4, 0.5, 5 + i * 2);
      lounger.rotation.y = 0.2;
      lounger.castShadow = true;
      this.scene.add(lounger);
    }

    // 5. Minimalist Architectural Palms / Trees
    this.createTree(18, 0, 16);
    this.createTree(22, 0, -10);
    this.createTree(-26, 0, 18);
    this.createTree(-22, 0, -14);
    this.createTree(8, 0, -18);
  },

  createTree(x, y, z) {
    const treeGroup = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 9, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Canopy / Foliage Sphere
    const canopyGeo = new THREE.DodecahedronGeometry(3.5, 1);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.8,
      metalness: 0.1
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 9;
    canopy.castShadow = true;
    treeGroup.add(canopy);

    treeGroup.position.set(x, y, z);
    this.scene.add(treeGroup);
  },

  /* ==========================================================================
     HOTSPOTS & 3D INTERACTIVE ANNOTATIONS
     ========================================================================== */
  clearHotspots() {
    if (this.hotspots && this.hotspots.length > 0) {
      this.hotspots.forEach(pin => this.scene.remove(pin));
      this.hotspots = [];
    }
  },

  setupMumbaiHotspots() {
    this.createHotspotPins([
      {
        id: 'mumbai-living',
        title: 'Sea-Facing Living Salon',
        badge: 'Small Home',
        desc: 'Customized modular sofa lounge with fluted walnut console and floor-to-ceiling Arabian Sea glass facade.',
        specs: { Area: '380 sq ft', Flooring: 'Italian Statuario', View: 'Bandra Coast' },
        pos: new THREE.Vector3(-3.5, 2.0, 2.5),
        camTarget: new THREE.Vector3(-3.5, 1.5, 2.0),
        camPos: new THREE.Vector3(-8, 5, 8)
      },
      {
        id: 'mumbai-kitchen',
        title: 'Italian Modular Kitchen Island',
        badge: 'Kitchen',
        desc: 'Quartz stone breakfast bar with barstools, built-in induction hub, and premium matte finish cabinetry.',
        specs: { Counter: 'Calacatta Quartz', Appliances: 'Built-in Bosch', Seating: '2 Barstools' },
        pos: new THREE.Vector3(-3.5, 2.2, -3.2),
        camTarget: new THREE.Vector3(-3.5, 1.5, -3.2),
        camPos: new THREE.Vector3(2, 6, -1)
      },
      {
        id: 'mumbai-bed',
        title: 'Master Bedroom Suite Nook',
        badge: 'Master Suite',
        desc: 'Platform king bed alcove with acoustic fluted partition, ambient night lighting, and integrated wardrobe.',
        specs: { Size: 'King Platform', Lighting: 'Warm Dimmable LED', Glass: 'Acoustic Tinted' },
        pos: new THREE.Vector3(4.2, 2.2, -2.2),
        camTarget: new THREE.Vector3(4.2, 1.5, -2.2),
        camPos: new THREE.Vector3(10, 6, 4)
      },
      {
        id: 'mumbai-balcony',
        title: 'Coastal Sunset Balcony',
        badge: 'Balcony',
        desc: 'Cantilevered teakwood sundeck with structural frameless glass railing overlooking the coastline.',
        specs: { Deck: 'Weatherproof Teak', Railing: '12mm Toughened Glass', Depth: '4 meters' },
        pos: new THREE.Vector3(0, 1.8, 8.5),
        camTarget: new THREE.Vector3(0, 1.2, 7.8),
        camPos: new THREE.Vector3(6, 4, 14)
      }
    ]);
  },

  setupPuneHotspots() {
    this.createHotspotPins([
      {
        id: 'pune-living',
        title: 'Emerald Velvet Living Room',
        badge: 'Eco Haven',
        desc: 'Scandinavian-style living space with emerald fabric sofa, oakwood coffee table, and natural ventilation.',
        specs: { Area: '450 sq ft', Style: 'Scandinavian Eco', Flooring: 'Warm Teak' },
        pos: new THREE.Vector3(-4.5, 2.0, 2.5),
        camTarget: new THREE.Vector3(-4.5, 1.5, 2.0),
        camPos: new THREE.Vector3(-9, 5, 8)
      },
      {
        id: 'pune-dining',
        title: '4-Seater Wooden Dining Nook',
        badge: 'Dining',
        desc: 'Solid oak 4-seater dining table set with warm overhead pendant lighting and open kitchen connection.',
        specs: { Capacity: '4 Persons', Material: 'Solid Teak', Lighting: 'Pendant Trio' },
        pos: new THREE.Vector3(3.8, 2.0, 3.2),
        camTarget: new THREE.Vector3(3.8, 1.2, 3.2),
        camPos: new THREE.Vector3(8, 5, 8)
      },
      {
        id: 'pune-suite',
        title: 'Master Suite & Study Corner',
        badge: 'Master Bed',
        desc: 'Quiet garden-facing master bedroom with double platform bed, reading lamps, and corner work desk.',
        specs: { Area: '320 sq ft', View: 'Garden View', Features: 'Work Desk + Bed' },
        pos: new THREE.Vector3(5.2, 2.0, -3.5),
        camTarget: new THREE.Vector3(5.2, 1.2, -3.5),
        camPos: new THREE.Vector3(10, 6, 2)
      },
      {
        id: 'pune-garden',
        title: 'Botanical Garden Verandah',
        badge: 'Green Living',
        desc: 'Landscaped planter terrace with organic herbs, blooming flora, and natural clay tile floor.',
        specs: { Planters: '4 Integrated Beds', Irrigation: 'Drip System', Solar: 'Rooftop Tied' },
        pos: new THREE.Vector3(0, 1.6, 7.8),
        camTarget: new THREE.Vector3(0, 1.0, 7.8),
        camPos: new THREE.Vector3(6, 4, 13)
      }
    ]);
  },

  setupDelhiHotspots() {
    this.createHotspotPins([
      {
        id: 'delhi-atrium',
        title: 'Double-Height Royal Atrium',
        badge: 'Grand Manor',
        desc: 'Magnificent 18-foot ceiling central hall with Swarovski crystal chandelier and royal blue sectional seating.',
        specs: { Ceiling: '18 ft High', Chandelier: 'Swarovski Crystal', Seating: 'Royal Sectional' },
        pos: new THREE.Vector3(0, 3.5, 3.0),
        camTarget: new THREE.Vector3(0, 2.5, 2.0),
        camPos: new THREE.Vector3(10, 7, 12)
      },
      {
        id: 'delhi-dining',
        title: '8-Seater Formal Royal Dining',
        badge: 'Banqueting',
        desc: 'Expansive formal dining hall accommodating 8 guests with gold tableware and courtyard view.',
        specs: { Seats: '8 Royal Chairs', Table: 'Solid Teak & Gold', Length: '6.5 meters' },
        pos: new THREE.Vector3(0, 2.2, -4.5),
        camTarget: new THREE.Vector3(0, 1.5, -4.5),
        camPos: new THREE.Vector3(8, 5, -2)
      },
      {
        id: 'delhi-suite1',
        title: 'Imperial Master Suite (East)',
        badge: 'Royal Suite',
        desc: 'Palatial master bedroom suite with king canopy bed, walk-in dressing partition, and private terrace.',
        specs: { Area: '1,400 sq ft', Balcony: 'Private East View', Bath: 'Dual Rain Shower' },
        pos: new THREE.Vector3(-8.5, 8.0, 2.0),
        camTarget: new THREE.Vector3(-8.5, 7.0, 2.0),
        camPos: new THREE.Vector3(-14, 12, 10)
      },
      {
        id: 'delhi-pool',
        title: 'Private Estate Infinity Pool',
        badge: 'Outdoor Pool',
        desc: 'Heated private lap pool with underwater lighting, sun lounger deck, and perimeter royal palms.',
        specs: { Length: '14 meters', Heating: 'Solar Thermal', Finish: 'Ceramic Mosaic' },
        pos: new THREE.Vector3(-18, 1.8, 2.0),
        camTarget: new THREE.Vector3(-18, 1.0, 2.0),
        camPos: new THREE.Vector3(-24, 6, 12)
      }
    ]);
  },

  setupNoidaHotspots() {
    this.createHotspotPins([
      {
        id: 'noida-salon',
        title: 'Double-Height Skyline Salon',
        badge: 'Duplex Penthouse',
        desc: 'Floor-to-ceiling glass panoramic salon lounge with contemporary modular seating and floating stairs.',
        specs: { Height: '20 ft Void', Flooring: 'Imported Marble', View: 'Golf Course Skyline' },
        pos: new THREE.Vector3(-6.5, 2.5, 2.5),
        camTarget: new THREE.Vector3(-6.5, 1.5, 2.0),
        camPos: new THREE.Vector3(-12, 6, 10)
      },
      {
        id: 'noida-staircase',
        title: 'Floating Wooden Staircase',
        badge: 'Architecture',
        desc: 'Cantilevered architectural wooden floating staircase leading to upper mezzanine suites.',
        specs: { Steps: '12 Floating Treads', Material: 'Burma Teak', Railing: 'Frameless Glass' },
        pos: new THREE.Vector3(-1.0, 3.5, -4.5),
        camTarget: new THREE.Vector3(-1.0, 2.5, -4.5),
        camPos: new THREE.Vector3(4, 7, -1)
      },
      {
        id: 'noida-mezzanine',
        title: 'Executive Master Suite',
        badge: 'Upper Suite',
        desc: 'Upper level master bedroom with wraparound glass overlooking the living void and skyline.',
        specs: { Level: 'Upper Mezzanine', Bed: 'King Size Platform', 'En-Suite': 'Glass Partitioned' },
        pos: new THREE.Vector3(6.0, 7.5, -2.0),
        camTarget: new THREE.Vector3(6.0, 6.5, -2.0),
        camPos: new THREE.Vector3(12, 10, 6)
      },
      {
        id: 'noida-jacuzzi',
        title: 'Rooftop Sky Jacuzzi & Terrace',
        badge: 'Sky Terrace',
        desc: 'Private heated outdoor sky jacuzzi with illuminated cyan water and sun loungers.',
        specs: { Feature: 'Heated Hydro Jets', Capacity: '6 Persons', View: 'Panoramic Expressway' },
        pos: new THREE.Vector3(-6.5, 7.2, 3.5),
        camTarget: new THREE.Vector3(-6.5, 6.0, 3.5),
        camPos: new THREE.Vector3(-12, 10, 10)
      }
    ]);
  },

  createHotspotPins(hotspotData) {
    const pinGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      wireframe: true
    });

    const glowCoreGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const glowCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    hotspotData.forEach(item => {
      const pinGroup = new THREE.Group();
      const outerRing = new THREE.Mesh(pinGeo, pinMat);
      const innerCore = new THREE.Mesh(glowCoreGeo, glowCoreMat);
      
      pinGroup.add(outerRing);
      pinGroup.add(innerCore);
      pinGroup.position.copy(item.pos);
      pinGroup.userData = item;

      this.scene.add(pinGroup);
      this.hotspots.push(pinGroup);
    });

    // Raycaster for clicking 3D hotspots
    if (!this.raycaster) {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      const canvas = document.getElementById('main-3d-canvas');
      if (canvas) {
        canvas.addEventListener('click', (e) => this.onCanvasClick(e));
      }
    }
  },

  onCanvasClick(event) {
    const canvas = document.getElementById('main-3d-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspots, true);

    if (intersects.length > 0) {
      // Traverse to find group userData
      let targetObj = intersects[0].object;
      while (targetObj.parent && !targetObj.userData.title) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.userData.title) {
        this.openHotspotModal(targetObj.userData);
        this.flyCameraTo(targetObj.userData.camPos, targetObj.userData.camTarget);
      }
    }
  },

  openHotspotModal(data) {
    const card = document.getElementById('hotspot-card');
    if (!card) return;

    document.getElementById('hotspot-badge').textContent = data.badge;
    document.getElementById('hotspot-title').textContent = data.title;
    document.getElementById('hotspot-desc').textContent = data.desc;

    const specsContainer = document.getElementById('hotspot-specs');
    if (specsContainer && data.specs) {
      specsContainer.innerHTML = Object.entries(data.specs)
        .map(([k, v]) => `<div class="hotspot-spec-item"><span>${k}:</span> <strong>${v}</strong></div>`)
        .join('');
    }

    card.classList.add('active');
  },

  closeHotspotModal() {
    const card = document.getElementById('hotspot-card');
    if (card) card.classList.remove('active');
  },

  flyCameraTo(targetPos, lookAtTarget) {
    if (!this.controls) return;
    this.controls.autoRotate = false;
    
    // Smooth camera transition using simple lerp step
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    let progress = 0;

    const animateCamera = () => {
      progress += 0.04;
      if (progress <= 1) {
        this.camera.position.lerpVectors(startPos, targetPos, progress);
        this.controls.target.lerpVectors(startTarget, lookAtTarget, progress);
        this.controls.update();
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  },

  /* ==========================================================================
     MATERIAL & RENDER MODE SWITCHING
     ========================================================================== */
  setFloorMaterial(type) {
    if (!this.customizableFloor) return;

    if (type === 'marble') {
      this.customizableFloor.material = this.materials.marbleFloor;
    } else if (type === 'wood') {
      this.customizableFloor.material = this.materials.woodDeck;
    } else if (type === 'concrete') {
      this.customizableFloor.material = this.materials.darkPanel;
    }

    // Also update customizer mini scene
    if (this.customFloorMesh) {
      if (type === 'marble') this.customFloorMesh.material.color.setHex(0xe2e8f0);
      if (type === 'wood') this.customFloorMesh.material.color.setHex(0x9a5b32);
      if (type === 'concrete') this.customFloorMesh.material.color.setHex(0x334155);
    }
  },

  isWireframeMode: false,
  toggleWireframe() {
    this.isWireframeMode = !this.isWireframeMode;
    if (this.villaGroup) {
      this.villaGroup.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.wireframe = this.isWireframeMode);
          } else {
            child.material.wireframe = this.isWireframeMode;
          }
        }
      });
    }
    const btn = document.getElementById('btn-wireframe');
    if (btn) btn.classList.toggle('active', this.isWireframeMode);
    return this.isWireframeMode;
  },

  isMeasuring: false,
  toggleMeasurementTool() {
    this.isMeasuring = !this.isMeasuring;
    const hud = document.getElementById('measure-hud');
    const btn = document.getElementById('btn-measure');
    if (hud) hud.style.display = this.isMeasuring ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', this.isMeasuring);
  },

  /* ==========================================================================
     CAMERA PRESET VIEWS & ROOM WALKTHROUGHS
     ========================================================================== */
  setCameraView(viewName) {
    if (!this.camera || !this.controls) return;

    if (viewName === 'orbit') {
      this.flyCameraTo(new THREE.Vector3(38, 22, 42), new THREE.Vector3(0, 5, 0));
      this.controls.autoRotate = true;
    } else if (viewName === 'floorplan') {
      // Top-Down Floorplan Cutaway
      this.flyCameraTo(new THREE.Vector3(0, 50, 1), new THREE.Vector3(0, 0, 0));
      this.controls.autoRotate = false;
    } else if (viewName === 'pool') {
      // Poolside Lounge
      this.flyCameraTo(new THREE.Vector3(-24, 5, 18), new THREE.Vector3(-10, 2, 6));
      this.controls.autoRotate = false;
    } else if (viewName === 'interior') {
      // Glass Living Room Salon
      this.flyCameraTo(new THREE.Vector3(10, 5, 12), new THREE.Vector3(0, 3, 0));
      this.controls.autoRotate = false;
    } else if (viewName === 'master') {
      // Master Penthouse Suite
      this.flyCameraTo(new THREE.Vector3(12, 13, 24), new THREE.Vector3(4, 10, 10));
      this.controls.autoRotate = false;
    } else if (viewName === 'rooftop') {
      // Rooftop Solar Terrace
      this.flyCameraTo(new THREE.Vector3(16, 20, 18), new THREE.Vector3(4, 12, 0));
      this.controls.autoRotate = false;
    }
  },

  toggleAutoRotate() {
    this.isAutoRotate = !this.isAutoRotate;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoRotate;
    }
    return this.isAutoRotate;
  },

  resetView() {
    this.setCameraView('orbit');
    this.closeHotspotModal();
  },

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */
  setupEventListeners() {
    // Lighting buttons
    document.querySelectorAll('[data-lighting]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-lighting]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setAtmosphere(btn.dataset.lighting);
      });
    });

    // View buttons
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setCameraView(btn.dataset.view);
      });
    });

    // Auto-rotate HUD button
    const autoRotateBtn = document.getElementById('btn-autorotate');
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener('click', () => {
        const active = this.toggleAutoRotate();
        autoRotateBtn.classList.toggle('active', active);
      });
    }

    // Reset View HUD button
    const resetBtn = document.getElementById('btn-reset-cam');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetView());
    }

    // Hotspot close button
    const closeHotspotBtn = document.getElementById('hotspot-close-btn');
    if (closeHotspotBtn) {
      closeHotspotBtn.addEventListener('click', () => this.closeHotspotModal());
    }

    // Material Swatches
    document.querySelectorAll('.material-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.material-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.setFloorMaterial(swatch.dataset.material);
      });
    });

    // 3D Model Selector Buttons
    document.querySelectorAll('[data-model-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modelId = btn.dataset.modelSelect;
        this.loadPropertyModel(modelId);
      });
    });
  },

  /* ==========================================================================
     2. SECONDARY 3D SPACE CUSTOMIZER SCENE
     ========================================================================== */
  initCustomizerScene() {
    const canvas = document.getElementById('customizer-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || 500;
    const height = parent.clientHeight || 450;

    this.customScene = new THREE.Scene();
    this.customScene.background = new THREE.Color('#f8fafc');

    this.customCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.customCamera.position.set(12, 10, 14);

    this.customRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this.customRenderer.setSize(width, height);
    this.customRenderer.shadowMap.enabled = true;

    if (THREE.OrbitControls) {
      this.customControls = new THREE.OrbitControls(this.customCamera, this.customRenderer.domElement);
      this.customControls.enableDamping = true;
      this.customControls.target.set(0, 2, 0);
      this.customControls.autoRotate = true;
      this.customControls.autoRotateSpeed = 1.2;
    }

    // Lights
    const customAmbient = new THREE.AmbientLight(0xffffff, 0.8);
    this.customScene.add(customAmbient);

    const customSun = new THREE.DirectionalLight(0x38bdf8, 1.5);
    customSun.position.set(10, 15, 10);
    customSun.castShadow = true;
    this.customScene.add(customSun);

    // Build Customizer Room Mockup
    this.buildCustomizerRoom();
  },

  buildCustomizerRoom() {
    this.customGroup = new THREE.Group();

    // Floor
    const floorGeo = new THREE.BoxGeometry(10, 0.3, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
    this.customFloorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.customFloorMesh.receiveShadow = true;
    this.customGroup.add(this.customFloorMesh);

    // Back Wall
    const wallGeo = new THREE.BoxGeometry(10, 6, 0.4);
    this.customWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    this.customWallMesh = new THREE.Mesh(wallGeo, this.customWallMat);
    this.customWallMesh.position.set(0, 3, -5);
    this.customGroup.add(this.customWallMesh);

    // Side Wall
    const sideWallGeo = new THREE.BoxGeometry(0.4, 6, 10);
    this.customSideWallMesh = new THREE.Mesh(sideWallGeo, this.customWallMat);
    this.customSideWallMesh.position.set(-5, 3, 0);
    this.customGroup.add(this.customSideWallMesh);

    // Luxury Sofa
    const sofaGeo = new THREE.BoxGeometry(4.5, 1, 2);
    this.customSofaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    this.customSofaMesh = new THREE.Mesh(sofaGeo, this.customSofaMat);
    this.customSofaMesh.position.set(0, 0.7, -1.5);
    this.customGroup.add(this.customSofaMesh);

    // Modern Coffee Table
    const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.2 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.4, 1.5);
    this.customGroup.add(table);

    // Floor Lamp
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 5, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(3.5, 2.5, -3.5);
    this.customGroup.add(pole);

    const shadeGeo = new THREE.ConeGeometry(0.8, 0.8, 16, 1, true);
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(3.5, 5, -3.5);
    this.customGroup.add(shade);

    this.customScene.add(this.customGroup);

    // Bind customizer UI buttons
    document.querySelectorAll('[data-custom-wall]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-custom-wall]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.customWall;
        if (this.customWallMat) {
          if (color === 'navy') this.customWallMat.color.setHex(0x1e293b);
          if (color === 'charcoal') this.customWallMat.color.setHex(0x0f172a);
          if (color === 'cream') this.customWallMat.color.setHex(0xf1f5f9);
        }
      });
    });

    document.querySelectorAll('[data-custom-sofa]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-custom-sofa]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.customSofa;
        if (this.customSofaMat) {
          if (color === 'cyan') this.customSofaMat.color.setHex(0x0284c7);
          if (color === 'emerald') this.customSofaMat.color.setHex(0x059669);
          if (color === 'gold') this.customSofaMat.color.setHex(0xd97706);
        }
      });
    });
  },

  /* ==========================================================================
     ANIMATION LOOP & RENDER
     ========================================================================== */
  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    // Update main orbit controls
    if (this.controls) this.controls.update();

    // Pulse Hotspots
    this.hotspots.forEach((pin, index) => {
      const s = 1 + Math.sin(time * 3 + index) * 0.15;
      pin.scale.set(s, s, s);
      pin.rotation.y += 0.02;
    });

    // Animate pool water shimmer
    if (this.poolWater) {
      this.poolWater.position.y = 0.25 + Math.sin(time * 2) * 0.03;
    }

    // Render Main Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // Render Customizer Mini Scene
    if (this.customRenderer && this.customScene && this.customCamera) {
      if (this.customControls) this.customControls.update();
      this.customRenderer.render(this.customScene, this.customCamera);
    }
  },

  onWindowResize() {
    const container = document.getElementById('tour-canvas-container');
    if (container && this.camera && this.renderer) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    const customCanvas = document.getElementById('customizer-3d-canvas');
    if (customCanvas && customCanvas.parentElement && this.customCamera && this.customRenderer) {
      const cWidth = customCanvas.parentElement.clientWidth;
      const cHeight = customCanvas.parentElement.clientHeight;
      this.customCamera.aspect = cWidth / cHeight;
      this.customCamera.updateProjectionMatrix();
      this.customRenderer.setSize(cWidth, cHeight);
    }
  }
};

// Initialize when DOM & scripts are loaded
window.addEventListener('DOMContentLoaded', () => {
  // Give Three.js a brief moment if loaded via script tag
  if (typeof THREE !== 'undefined') {
    Villa3D.init();
  } else {
    setTimeout(() => {
      if (typeof THREE !== 'undefined') Villa3D.init();
    }, 300);
  }
});
