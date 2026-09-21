import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------------ */
/*  CONFIG - every position is in "case space": case is centred at origin,   */
/*  its open side faces +Z (towards the camera), front panel is +X.          */
/*  Slot positions were measured on the meshes (ortho render + raycast).     */
/* ------------------------------------------------------------------------ */

const DEBUG = new URLSearchParams(location.search).has('debug');

// motherboard placement: back of PCB on the tray stand-offs (tray z = -0.65),
// rear I/O against the rear wall (x = -1.68), bottom edge just above the shroud.
const MB = [-0.52, 0.325, -0.43];
const onBoard = (x, y, z) => [MB[0] + x, MB[1] + y, MB[2] + z];

const STEP_LABELS = ['Empty case', 'Motherboard', 'CPU', 'Memory', 'Storage', 'GPU', 'Power', 'Cables', 'Ready'];

const CONFIG = {
  camera: { pos: [0, 0.9, 13.4], target: [0, -0.05, 0], fov: 30 },
  // 30 / 20 / 50 layout: copy left, white spawn column in the middle (screen centre at 40%),
  // PC centred in the right 50% (NDC x = 0.5). spawnDist = distance from the camera where parts
  // appear; spawnFit = largest part width (units) that fits the column at that distance.
  layout: { split: 0.5, minAspect: 1.15, spawnDist: 12.8, spawnFit: 2.25, spawnNdcX: -0.2 },
  rig: { rotY: -0.48, mouseYaw: 0.13, mousePitch: 0.05 },   // 3/4 view + cursor parallax

  // case.glb → normalised 3.92 x 4.4 x 1.99. Open side +Z, front +X.
  case: {
    file: 'models/case.glb', size: 4.4, rot: [0, 0, 0], pos: [0, 0, 0],
    // window cut into the PSU shroud front so the PSU bay is visible
    cut: { min: [-1.62, -1.8, -0.95], max: [-0.25, -1.2, 1.15] },
  },

  // step = index of the scroll step that places the part
  // rot   = model-space fix-up (Euler, `order` optional), applied before placement
  // showRot = orientation presented head-on in the centre column (default: as mounted)
  // via   = staging point in front of the slot, pos = seated position
  parts: [
    {
      // 2.325 x 2.85 x 0.36 normalised, PCB surface at local z -0.157
      id: 'motherboard', step: 1, file: 'models/motherboard.glb', size: 2.85,
      rot: [0, 0, 0],
      pos: MB, via: [MB[0], MB[1], 1.35], rotEnd: [0, 0, 0],
      fallback: [2.325, 2.85, 0.36],
    },
    {
      // heat-spreader +Y → faces +Z. Sits in the socket (socket surface z -0.149)
      id: 'cpu', step: 2, file: 'models/cpu.glb', size: 0.40,
      rot: [Math.PI / 2, 0, 0],
      pos: onBoard(0.125, 0.52, -0.131), via: onBoard(0.125, 0.52, 0.55), rotEnd: [0, 0, 0],
      fallback: [0.4, 0.4, 0.037],
    },
    {
      // length X, pins -Y, light bar +Y → length Y, pins -Z, bar +Z, thickness X
      // slots 2 & 4 at local x 0.682 / 0.859, slot top z -0.089, stick half-height 0.204
      id: 'ram', step: 3, file: 'models/ram.glb', size: 1.27,
      rot: [Math.PI / 2, 0, Math.PI / 2], order: 'ZYX',
      instances: [
        { pos: onBoard(0.682, 0.585, 0.075), via: onBoard(0.682, 0.585, 0.75), rotEnd: [0, 0, 0] },
        { pos: onBoard(0.859, 0.585, 0.075), via: onBoard(0.859, 0.585, 0.75), rotEnd: [0, 0, 0] },
      ],
      fallback: [0.05, 1.27, 0.41],
    },
    {
      // length X, heatsink +Y, connector +X → flat on the board, heatsink +Z
      // seated in the board's open M.2 slot (key at local x +0.19, pad z -0.096) below the x16 slot
      id: 'ssd', step: 4, file: 'models/ssd.glb', size: 0.76,
      rot: [Math.PI / 2, 0, 0],
      pos: onBoard(-0.19, -0.64, -0.071), via: onBoard(-0.19, -0.64, 0.6), rotEnd: [0, 0, 0],
      fallback: [0.76, 0.2, 0.05],
    },
    {
      // length X, fans +Y, PCIe edge +Z, bracket -X → fans -Y, PCIe edge -Z (into the slot)
      // 2.6 x 0.52 x 1.2. Slot top z -0.01 at local y -0.32; PCB sits 0.2 above card centre
      id: 'gpu', step: 5, file: 'models/gpu.glb', size: 2.6,
      rot: [Math.PI, 0, 0],
      pos: onBoard(0.04, -0.52, 0.56), via: onBoard(0.04, -0.52, 1.75), rotEnd: [0, 0, 0],
      showRot: [-Math.PI / 2, 0, 0],          // fans toward the viewer while it is presented
      fallback: [2.6, 0.52, 1.2],
    },
    {
      // fan +Y, vent/switch +Z, modular sockets +X → vent -X (rear), sockets +Z (open side)
      // 1.36 wide x 0.73 tall x 1.5 deep after rotation. Sits on the floor inside the shroud.
      id: 'psu', step: 6, file: 'models/psu.glb', size: 1.5,
      rot: [0, -Math.PI / 2, 0],
      pos: [-1.02, -1.6, -0.04], via: [-1.02, -1.6, 1.9], rotEnd: [0, 0, 0],
      showRot: [-Math.PI / 2, 0, 0],          // fan side toward the viewer
      fallback: [1.36, 0.73, 1.5],
    },
  ],

  // cables: real routing - they come out of the tray grommets behind the board and
  // plug straight into their connectors. Each is a 2-row bundle of individually
  // sleeved wires (pins x 2), held by cable combs, ending in a moulded plug.
  //   w = width axis of the bundle (direction the pin row runs)
  //   the last point is the connector face; the plug body sits on it.
  cablesStep: 7,
  cables: [
    { // 24-pin ATX: right grommet → 24-pin header on the board's right edge (top z -0.447).
      // Short, tidy run: out of the header toward the glass, one bend, straight into the grommet.
      pts: [[1.42, 0.42, -0.9], [1.42, 0.44, -0.62], [1.3, 0.5, -0.3], [1.0, 0.545, -0.12], [0.72, 0.545, -0.16], [0.59, 0.545, -0.3], [0.59, 0.545, -0.44]],
      pins: 12, rows: 2, w: [0, 1, 0], plugDepth: 0.14, grommet: [1.42, 0.42, -0.78, 0.16, 0.42],
    },
    { // CPU 8-pin EPS: top tray cutout → straight down into the EPS header (top z -0.47)
      pts: [[-1.2, 1.92, -0.9], [-1.2, 1.93, -0.55], [-1.19, 1.9, -0.26], [-1.18, 1.8, -0.2], [-1.18, 1.7, -0.3], [-1.18, 1.645, -0.46]],
      pins: 4, rows: 2, w: [1, 0, 0], plugDepth: 0.13, grommet: [-1.2, 1.9, -0.78, 0.3, 0.14],
    },
    { // GPU 8-pin #1: lower right grommet → power block on the card's outer edge
      // (block measured at world x -0.49..-0.23, y -0.21..0.0, face z 0.73). Runs level
      // along the top of the card, well inside the glass (z <= 0.9), then drops into the plug.
      pts: [[1.42, -0.5, -0.9], [1.42, -0.5, -0.5], [1.32, -0.42, 0.15], [1.0, -0.26, 0.66], [0.45, -0.13, 0.88], [-0.1, -0.1, 0.9], [-0.265, -0.1, 0.86], [-0.265, -0.1, 0.74]],
      pins: 4, rows: 2, w: [1, 0, 0], plugDepth: 0.13, grommet: [1.42, -0.5, -0.78, 0.16, 0.42],
    },
    { // GPU 8-pin #2 (beside #1, toward the rear)
      pts: [[1.42, -0.5, -0.9], [1.42, -0.5, -0.5], [1.34, -0.44, 0.1], [1.05, -0.3, 0.62], [0.5, -0.16, 0.9], [-0.3, -0.11, 0.92], [-0.455, -0.1, 0.86], [-0.455, -0.1, 0.74]],
      pins: 4, rows: 2, w: [1, 0, 0], plugDepth: 0.13,
    },
    { // PSU modular leads: out of the PSU face, behind the shroud panel
      pts: [[-1.3, -1.4, 0.72], [-1.2, -1.4, 0.84], [-0.75, -1.42, 0.86], [-0.3, -1.45, 0.78], [-0.05, -1.47, 0.62]],
      pins: 6, rows: 2, w: [0, 1, 0], plugDepth: 0.12, plugAt: 'start', combs: [0.5],
    },
    {
      pts: [[-1.0, -1.62, 0.72], [-0.9, -1.62, 0.84], [-0.5, -1.63, 0.86], [-0.2, -1.65, 0.78], [-0.05, -1.66, 0.62]],
      pins: 4, rows: 2, w: [0, 1, 0], plugDepth: 0.12, plugAt: 'start', combs: [0.5],
    },
  ],

  finalStep: 8,
  steps: 9,          // 0..8
};

/* ------------------------------------------------------------------------ */
/*  Renderer / scene                                                         */
/* ------------------------------------------------------------------------ */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true;
renderer.autoClear = false;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(...CONFIG.camera.pos);
const camTarget = new THREE.Vector3(...CONFIG.camera.target);

/** place the PC in the right half of the viewport on wide screens */
function layout() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfW = Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov / 2)) * CONFIG.camera.pos[2] * aspect;
  const shift = aspect >= CONFIG.layout.minAspect ? halfW * CONFIG.layout.split : 0;
  camera.position.x = CONFIG.camera.pos[0] - shift;
  camTarget.x = CONFIG.camera.target[0] - shift;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
layout();
camera.lookAt(camTarget);

// environment for reflections (no external HDR needed)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

// lights - cinematic three-point.
const lights = [];
const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(4, 6, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.camera.near = 1;
key.shadow.camera.far = 30;
key.shadow.camera.left = key.shadow.camera.bottom = -5;
key.shadow.camera.right = key.shadow.camera.top = 5;
lights.push(key);

const rim = new THREE.DirectionalLight(0xdfe7ff, 1.4);
rim.position.set(-6, 3, -4);
lights.push(rim);

const fill = new THREE.DirectionalLight(0xffffff, 1.1);
fill.position.set(-2, -1, 6);
lights.push(fill);

// lifts the black interior; sits behind the glass so it never glares off the panel
const inner = new THREE.PointLight(0xffffff, 2.5, 5, 2);
inner.position.set(0.2, 0.6, 0.0);
lights.push(inner);

const bay = new THREE.SpotLight(0xffffff, 9, 7, 0.5, 0.7, 1.2);   // PSU bay, also inside the glass
bay.position.set(0.5, -0.5, 0.7);
bay.target.position.set(-1.0, -1.6, -0.2);
scene.add(bay.target);
lights.push(bay);

lights.push(new THREE.AmbientLight(0xffffff, 0.28));
lights.forEach((l) => scene.add(l));

// rig: the whole PC lives here. rig = cursor parallax, idle = subtle breathing.
const rig = new THREE.Group();
rig.rotation.y = CONFIG.rig.rotY;
scene.add(rig);

const idle = new THREE.Group();
rig.add(idle);

/* ------------------------------------------------------------------------ */
/*  Loading                                                                  */
/* ------------------------------------------------------------------------ */

const manager = new THREE.LoadingManager();
const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const gltf = new GLTFLoader(manager).setDRACOLoader(draco);

const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderPct = document.getElementById('loader-pct');

manager.onProgress = (_url, loaded, total) => {
  const p = Math.round((loaded / total) * 100);
  loaderBar.style.width = p + '%';
  loaderPct.textContent = p + '%';
};

/** Load a GLB, normalise it (centre + uniform scale to `size`), return a pivot group. */
function loadNormalised(file, size, rot, fallbackDims, order = 'XYZ') {
  return new Promise((resolve) => {
    const pivot = new THREE.Group();
    const finish = (obj) => {
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          if (o.material) {
            o.material.envMapIntensity = 0.9;
            if (o.material.map) o.material.map.anisotropy = 8;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(obj);
      const dims = new THREE.Vector3();
      box.getSize(dims);
      const centre = new THREE.Vector3();
      box.getCenter(centre);
      const s = size / Math.max(dims.x, dims.y, dims.z);
      obj.position.sub(centre);
      const inner = new THREE.Group();
      inner.add(obj);
      inner.scale.setScalar(s);
      inner.rotation.set(rot[0], rot[1], rot[2], order);
      pivot.add(inner);
      pivot.userData.dims = dims.multiplyScalar(s);
      resolve(pivot);
    };
    gltf.load(
      file,
      (g) => finish(g.scene),
      undefined,
      () => {
        // model missing → grey placeholder so the choreography still runs
        const geo = new THREE.BoxGeometry(...(fallbackDims || [1, 1, 1]));
        const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.3 });
        finish(new THREE.Mesh(geo, mat));
      }
    );
  });
}

/* ------------------------------------------------------------------------ */
/*  Cables - sleeved ribbons (N parallel strands) revealed along their length */
/* ------------------------------------------------------------------------ */

const cableMat = new THREE.MeshStandardMaterial({ color: 0xbdbdc2, roughness: 0.95, metalness: 0.0 });
const plugMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5, metalness: 0.15 });
const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95, metalness: 0.0 });

const PITCH = 0.04;           // wire pitch (4.2 mm on a 10.5 cm = 1 unit scale)
const WIRE_R = 0.0135;        // sleeved wire radius (18 AWG + sleeve ≈ 3 mm)

function makeCable(def) {
  const pts = def.pts.map((p) => new THREE.Vector3(...p));
  if (def.reverse) pts.reverse();                 // draw from the far end toward the plug
  const base = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const tubular = 120, radial = 8;
  const samples = 160;
  const w = new THREE.Vector3(...def.w);
  const group = new THREE.Group();
  const geos = [];
  const rows = def.rows || 2;

  // moving frame along the curve: T = tangent, W = pin-row axis, B = row-stacking axis
  const T = new THREE.Vector3(), W = new THREE.Vector3(), B = new THREE.Vector3();
  const frameAt = (t, out) => {
    base.getPointAt(t, out);
    base.getTangentAt(t, T);
    W.copy(w).addScaledVector(T, -w.dot(T)).normalize();
    B.crossVectors(T, W).normalize();
  };

  // each wire is an offset copy of the base curve (pins along W, rows along B)
  const p = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    const offB = (r - (rows - 1) / 2) * PITCH;
    for (let s = 0; s < def.pins; s++) {
      const offW = (s - (def.pins - 1) / 2) * PITCH;
      const spts = [];
      for (let i = 0; i <= samples; i++) {
        frameAt(i / samples, p);
        spts.push(p.clone().addScaledVector(W, offW).addScaledVector(B, offB));
      }
      const curve = new THREE.CatmullRomCurve3(spts, false, 'centripetal', 0.5);
      const geo = new THREE.TubeGeometry(curve, tubular, WIRE_R, radial, false);
      geo.setDrawRange(0, 0);
      geos.push(geo);
      const mesh = new THREE.Mesh(geo, cableMat);
      mesh.castShadow = true;
      group.add(mesh);
    }
  }

  const bundleW = def.pins * PITCH + 0.02;
  const bundleH = rows * PITCH + 0.02;
  const mtx = new THREE.Matrix4();
  const orient = (obj, t, flip) => {
    frameAt(t, obj.position);
    if (flip) { T.negate(); B.negate(); }          // keep the basis right-handed
    mtx.makeBasis(W, B, T);
    obj.quaternion.setFromRotationMatrix(mtx);
  };

  // cable combs holding the bundle together along the visible run
  const combs = [];
  const combGeo = new THREE.BoxGeometry(bundleW + 0.014, bundleH + 0.014, 0.03);
  for (const ct of def.combs || [0.4, 0.62]) {
    const comb = new THREE.Mesh(combGeo, plugMat);
    orient(comb, ct, false);
    comb.visible = false;
    comb.userData.t = ct;
    group.add(comb);
    combs.push(comb);
  }

  // moulded plug: pins x rows body, its face sits on the connector
  const plugDepth = def.plugDepth || 0.13;
  const plug = new THREE.Mesh(new THREE.BoxGeometry(bundleW, bundleH + 0.01, plugDepth), plugMat);
  plug.castShadow = true;
  plug.visible = false;
  group.add(plug);
  const plugEnd = def.plugAt === 'start' ? 0 : 1;          // param along the *drawn* curve
  const placePlug = (t) => {
    orient(plug, t, plugEnd === 0);
    // T now points from the connector into the cable → pull the body back onto the face
    plug.position.addScaledVector(T, -plugDepth * 0.5);
  };

  // rubber grommet where the cable leaves the tray
  if (def.grommet) {
    const [gx, gy, gz, gw, gh] = def.grommet;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), rubberMat);
    ring.scale.set(gw, gh, 1);
    ring.position.set(gx, gy, gz);
    group.add(ring);
    const fillMesh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), rubberMat);
    fillMesh.scale.set(gw, gh, 1);
    fillMesh.position.set(gx, gy, gz - 0.01);
    group.add(fillMesh);
  }

  const state = { t: 0 };
  const update = () => {
    const seg = Math.floor(state.t * tubular);
    geos.forEach((g) => g.setDrawRange(0, seg * radial * 6));
    plug.visible = state.t > 0.001;
    placePlug(plugEnd === 0 ? 0 : Math.min(state.t, 1));
    combs.forEach((c) => { c.visible = state.t >= c.userData.t; });
  };
  return { group, state, update };
}

/* ------------------------------------------------------------------------ */
/*  Build scene                                                              */
/* ------------------------------------------------------------------------ */

const parts = [];      // { def, holders:[{holder, inst}] }

const cables = CONFIG.cables.map(makeCable);
cables.forEach((c) => idle.add(c.group));

let caseHolder;
const cutPlanesLocal = [];
const cutPlanesWorld = [];

async function build() {
  const casePivot = await loadNormalised(CONFIG.case.file, CONFIG.case.size, CONFIG.case.rot, [3.92, 4.4, 1.99]);
  caseHolder = new THREE.Group();
  caseHolder.position.set(...CONFIG.case.pos);
  caseHolder.add(casePivot);
  idle.add(caseHolder);

  // window in the PSU shroud: box cut = intersection of six half-spaces
  const { min, max } = CONFIG.case.cut;
  cutPlanesLocal.push(
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), min[0]), new THREE.Plane(new THREE.Vector3(1, 0, 0), -max[0]),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), min[1]), new THREE.Plane(new THREE.Vector3(0, 1, 0), -max[1]),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), min[2]), new THREE.Plane(new THREE.Vector3(0, 0, 1), -max[2]),
  );
  cutPlanesLocal.forEach(() => cutPlanesWorld.push(new THREE.Plane()));
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.9, metalness: 0.05, side: THREE.BackSide });
  interiorMat.clippingPlanes = cutPlanesWorld;
  interiorMat.clipIntersection = true;
  const caseMeshes = [];
  casePivot.traverse((o) => { if (o.isMesh && o.material) caseMeshes.push(o); });
  caseMeshes.forEach((o) => {
    o.material = o.material.clone();
    o.material.clippingPlanes = cutPlanesWorld;
    o.material.clipIntersection = true;
    // dark inner shell so the cut window reveals a black cavity, not the mirrored exterior
    const shell = new THREE.Mesh(o.geometry, interiorMat);
    shell.castShadow = false;
    shell.receiveShadow = true;
    o.parent.add(shell);
    shell.position.copy(o.position); shell.rotation.copy(o.rotation); shell.scale.copy(o.scale);
  });

  // PSU bay liner: a dark box seen from inside so the window shows a clean cavity
  const liner = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.8, 1.62),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.95, metalness: 0.0, side: THREE.BackSide }),
  );
  liner.position.set(-1.0, -1.51, -0.1);
  liner.receiveShadow = true;
  caseHolder.add(liner);

  // every part first appears in the white centre column: sharp, centred, facing the camera
  // straight on, then glides to its slot. Computed from the camera so it tracks the layout.
  const spawn = new THREE.Vector3();
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  const spawnLocal = (ndcX, ndcY) => {
    spawn.set(ndcX, ndcY, 0.5).unproject(camera);
    spawn.sub(camera.position).normalize().multiplyScalar(CONFIG.layout.spawnDist).add(camera.position);
    return idle.worldToLocal(spawn).toArray();
  };
  // holder rotation that cancels the rig's 3/4 turn so `showRot` is seen head-on
  const rigQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, CONFIG.rig.rotY, 0)).invert();
  const showQ = new THREE.Quaternion();
  const showRotFor = (showRot) => {
    showQ.setFromEuler(new THREE.Euler(...(showRot || [0, 0, 0])));
    return new THREE.Euler().setFromQuaternion(rigQ.clone().multiply(showQ)).toArray().slice(0, 3);
  };

  for (const def of CONFIG.parts) {
    const pivot = await loadNormalised(def.file, def.size, def.rot, def.fallback, def.order);
    const instances = def.instances || [{ pos: def.pos, via: def.via, rotEnd: def.rotEnd }];
    const holders = instances.map((inst, i) => {
      const src = i === 0 ? pivot : pivot.clone(true);
      const holder = new THREE.Group();
      holder.add(src);
      holder.userData.id = def.id;
      inst.from = spawnLocal(CONFIG.layout.spawnNdcX + (i - (instances.length - 1) / 2) * 0.05, 0.03);
      inst.fromRot = showRotFor(def.showRot);
      inst.fromScale = Math.min(1, CONFIG.layout.spawnFit / def.size);   // big parts shrink to fit the column
      holder.position.set(...inst.from);
      holder.rotation.set(...inst.fromRot);
      holder.scale.setScalar(0.0001);
      holder.visible = false;
      idle.add(holder);
      return { holder, inst };
    });
    parts.push({ def, holders });
  }
}

/* ------------------------------------------------------------------------ */
/*  Scroll choreography                                                      */
/* ------------------------------------------------------------------------ */

const stepEls = [...document.querySelectorAll('.step')];
const rail = document.getElementById('rail');
stepEls.forEach(() => rail.appendChild(document.createElement('span')));
const railDots = [...rail.children];
const hint = document.getElementById('hint');
const hdrStep = document.getElementById('hdr-step');
const hdrLabel = document.getElementById('hdr-label');
const copyEl = document.getElementById('copy');

// split headlines into words for the staggered reveal
stepEls.forEach((el) => {
  const h = el.querySelector('h1, h2');
  if (!h) return;
  const words = h.textContent.trim().split(/\s+/);
  h.innerHTML = words.map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
});

function buildTimeline() {
  const STEP = 1;                       // timeline seconds per scroll step
  let lastStep = -1;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#scroll',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4,
      onUpdate: (self) => {
        const i = Math.min(CONFIG.steps - 1, Math.floor(self.progress * CONFIG.steps + 0.35));
        railDots.forEach((d, k) => { d.classList.toggle('active', k === i); d.classList.toggle('done', k < i); });
        rail.style.setProperty('--p', self.progress.toFixed(4));
        hint.classList.toggle('hidden', self.progress > 0.02);
        if (i !== lastStep) {
          lastStep = i;
          hdrStep.textContent = String(i).padStart(2, '0') + ' / ' + String(CONFIG.steps - 1).padStart(2, '0');
          hdrLabel.textContent = STEP_LABELS[i] || '';
          gsap.fromTo(hdrLabel, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
      },
    },
  });

  // copy: one sentence per step, word-by-word rise in, rise out
  stepEls.forEach((el, i) => {
    const base = i * STEP;
    const words = el.querySelectorAll('.w > span');
    const inAt = i === 0 ? -1 : base + 0.08;       // intro is shown by the loader sequence
    if (i !== 0) {
      tl.set(el, { autoAlpha: 1 }, inAt);
      tl.fromTo(words, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', stagger: 0.03 }, inAt + 0.02);
    }
    if (i !== CONFIG.finalStep) {
      const outAt = base + 0.74;
      tl.to(words, { y: -26, opacity: 0, duration: 0.22, ease: 'power2.in', stagger: 0.015 }, outAt);
      tl.set(el, { autoAlpha: 0 }, outAt + 0.26);
    }
  });

  // parts: pop into the white centre column (sharp, centred, head-on) → hold → glide to the
  // staging point in front of the slot while turning to the mounted orientation → push in
  for (const { def, holders } of parts) {
    const base = def.step * STEP;
    holders.forEach(({ holder, inst }, k) => {
      const d = k * 0.05;                                   // stagger for multi-instance parts
      const via = inst.via || inst.pos;
      const s0 = inst.fromScale;
      tl.set(holder, { visible: true }, base + d);
      tl.fromTo(holder.scale, { x: s0 * 0.86, y: s0 * 0.86, z: s0 * 0.86 }, { x: s0, y: s0, z: s0, duration: 0.16, ease: 'back.out(1.6)' }, base + d);
      // leg 1: leave the column for the staging point, turning to the mounted orientation
      tl.to(holder.position, { x: via[0], y: via[1], z: via[2], duration: 0.34, ease: 'power2.inOut' }, base + 0.34 + d);
      tl.to(holder.rotation, { x: inst.rotEnd[0], y: inst.rotEnd[1], z: inst.rotEnd[2], duration: 0.34, ease: 'power2.inOut' }, base + 0.34 + d);
      tl.to(holder.scale, { x: 1, y: 1, z: 1, duration: 0.34, ease: 'power2.inOut' }, base + 0.34 + d);
      // leg 2: seat it (the "click")
      tl.to(holder.position, { x: inst.pos[0], y: inst.pos[1], z: inst.pos[2], duration: 0.2, ease: 'power3.in' }, base + 0.7 + d);
    });
  }

  // cables draw in from the grommets to their connectors
  const cb = CONFIG.cablesStep * STEP;
  cables.forEach((c, k) => {
    tl.to(c.state, { t: 1, duration: 0.4, ease: 'power2.inOut', onUpdate: c.update }, cb + 0.06 + k * 0.1);
  });

  // final: a touch more interior light
  const fb = CONFIG.finalStep * STEP;
  tl.to(inner, { intensity: 4, duration: 0.5 }, fb);

  // pin the timeline length to exactly `steps` so scroll progress maps 1:1 to step index
  tl.set({}, {}, CONFIG.steps * STEP);

  return tl;
}

/* ------------------------------------------------------------------------ */
/*  Frame loop                                                               */
/* ------------------------------------------------------------------------ */

let controls = null;
if (DEBUG) {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(camTarget);
  document.getElementById('copy').style.display = 'none';
  renderer.domElement.style.pointerEvents = 'auto';
  renderer.domElement.style.zIndex = '30';
  renderer.domElement.style.position = 'fixed';
}

// cursor parallax (normalised -1..1)
const mouse = new THREE.Vector2(0, 0);
const mouseSmooth = new THREE.Vector2(0, 0);
window.addEventListener('pointermove', (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
});

const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  idle.position.y = Math.sin(t * 0.6) * 0.02;
  idle.rotation.y = Math.sin(t * 0.35) * 0.012;

  mouseSmooth.lerp(mouse, 0.045);
  if (!controls) {
    rig.rotation.y = CONFIG.rig.rotY + mouseSmooth.x * CONFIG.rig.mouseYaw;
    rig.rotation.x = mouseSmooth.y * CONFIG.rig.mousePitch;
    camera.lookAt(camTarget);
    // copy drifts the opposite way to the PC for depth
    copyEl.style.transform = `translate3d(${mouseSmooth.x * -10}px, ${mouseSmooth.y * -6}px, 0)`;
  } else {
    controls.update();
  }

  scene.updateMatrixWorld();
  if (caseHolder) {
    for (let i = 0; i < cutPlanesLocal.length; i++) cutPlanesWorld[i].copy(cutPlanesLocal[i]).applyMatrix4(caseHolder.matrixWorld);
  }

  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 0);
  renderer.clear(true, true, true);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  requestAnimationFrame(frame);
}

function onResize() {
  layout();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener('resize', onResize);

/* ------------------------------------------------------------------------ */
/*  Go                                                                       */
/* ------------------------------------------------------------------------ */

build().then(() => {
  // intro: case settles into place as the loader lifts
  caseHolder.position.y -= 0.5;
  caseHolder.scale.setScalar(0.96);
  gsap.to(caseHolder.position, { y: CONFIG.case.pos[1], duration: 1.8, ease: 'power3.out', delay: 0.2 });
  gsap.to(caseHolder.scale, { x: 1, y: 1, z: 1, duration: 1.8, ease: 'power3.out', delay: 0.2 });

  if (!DEBUG) buildTimeline();
  frame();

  loaderBar.style.width = '100%';
  loaderPct.textContent = '100%';
  setTimeout(() => loaderEl.classList.add('done'), 250);
  setTimeout(() => ScrollTrigger.refresh(), 400);

  // intro copy reveal (only when at the top; otherwise the timeline owns it)
  if (!DEBUG && window.scrollY < window.innerHeight * 0.3) {
    const intro = stepEls[0];
    gsap.set(intro, { autoAlpha: 1 });
    gsap.fromTo(intro.querySelectorAll('.w > span'), { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.05, delay: 0.55 });
  } else if (!DEBUG) {
    gsap.set(stepEls[0], { autoAlpha: 1 });
  }

  if (DEBUG) {
    // expose for live tuning in devtools
    window.__scene = { THREE, scene, camera, rig, idle, parts, cables, CONFIG, caseHolder, controls };
    window.__look = (px, py, pz, tx = 0, ty = 0, tz = 0) => {
      camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update();
    };
    rig.rotation.y = 0;
    parts.forEach(({ holders }) => holders.forEach(({ holder, inst }) => {
      holder.visible = true; holder.scale.setScalar(1);
      holder.position.set(...inst.pos); holder.rotation.set(...inst.rotEnd);
    }));
    cables.forEach((c) => { c.state.t = 1; c.update(); });
  }
});
