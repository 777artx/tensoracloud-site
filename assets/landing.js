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

// case.glb = Corsair 4000D Airflow (CC-BY 4.0, kirigami318). Measured in case space after
// normalisation: tray z = -0.795, rear wall x = -1.95, shroud top y = -0.99 (plate underside
// -1.008), floor y = -1.727, glass z = 1.08.
// motherboard placement: back of PCB on the tray stand-offs (tray z = -0.795),
// rear I/O against the rear wall (x = -1.95), bottom edge just above the shroud.
const MB = [-0.79, 0.50, -0.575];
const onBoard = (x, y, z) => [MB[0] + x, MB[1] + y, MB[2] + z];

const STEP_LABELS = ['Empty case', 'Motherboard', 'CPU', 'Memory', 'Storage', 'GPU', 'Power', 'Ready'];

const CONFIG = {
  camera: { pos: [0, 0.9, 13.4], target: [0, -0.05, 0], fov: 30 },
  // 30 / 20 / 50 layout: copy left, white spawn column in the middle (screen centre at 40%),
  // PC centred in the right 50% (NDC x = 0.5). spawnDist = distance from the camera where parts
  // appear; spawnFit = the size (units) every part is presented at in the column.
  layout: { split: 0.44, minAspect: 1.15, spawnDist: 12.8, spawnFit: 2.1, spawnNdcX: -0.2 },
  rig: { rotY: -0.48, mouseYaw: 0.13, mousePitch: 0.05 },   // 3/4 view + cursor parallax

  // case.glb → normalised 4.25 x 4.4 x 2.18. Open (glass) side +Z, front +X.
  case: {
    file: 'models/case.glb', size: 4.4, rot: [0, 0, 0], pos: [0, 0, 0],
    tint: null,                     // the model ships real PBR materials; no albedo override
    // window cut into the PSU shroud front (shroud face z = 0.70) so the PSU bay is visible.
    // Stops short of the rear panel (x < -1.85) and the glass (z > 1.03).
    cut: { min: [-1.84, -1.68, 0.0], max: [-0.5, -1.03, 1.0] },
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
      // 1.33 wide x 0.715 tall x 1.47 deep after rotation. Sits on the floor (y -1.727) inside
      // the shroud cavity (underside y -1.008), against the rear wall.
      id: 'psu', step: 6, file: 'models/psu.glb', size: 1.47,
      rot: [0, -Math.PI / 2, 0],
      pos: [-1.2, -1.367, -0.10], via: [-1.2, -1.367, 1.9], rotEnd: [0, 0, 0],
      showRot: [-Math.PI / 2, 0, 0],          // fan side toward the viewer
      fallback: [1.33, 0.715, 1.47],
    },
  ],

  finalStep: 7,
  steps: 8,          // 0..7
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

// final-scene state, driven by the scroll timeline on the last step
const finale = {
  center: 0,      // 0 = split layout (PC in the right half), 1 = PC centred
  dissolve: 0,    // orange column: 0 = solid, 1 = fully dissolved to white
  float: 0,       // 0 = cursor parallax, 1 = free floating + slow spin
  spin: 0,        // accumulated spin angle (rad)
};

/** place the PC in the right half of the viewport on wide screens (blended to centre at the end) */
function layout() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfW = Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov / 2)) * CONFIG.camera.pos[2] * aspect;
  const shift = (aspect >= CONFIG.layout.minAspect ? halfW * CONFIG.layout.split : 0) * (1 - finale.center);
  camera.position.x = CONFIG.camera.pos[0] - shift;
  camTarget.x = CONFIG.camera.target[0] - shift;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
layout();
camera.lookAt(camTarget);

/* orange spawn column, drawn on a low-res canvas so it can dissolve grain by grain */
const column = (() => {
  const el = document.getElementById('column');
  const ctx = el.getContext('2d');
  const W = el.width, H = el.height;
  const N = W * H;
  const noise = new Float32Array(N);
  for (let i = 0; i < N; i++) noise[i] = Math.random();
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const accent = [0xf5, 0x84, 0x1f];
  let drawn = -1;
  const draw = () => {
    const t = finale.dissolve;
    if (t <= 0) { if (drawn !== 0) { ctx.fillStyle = '#f5841f'; ctx.fillRect(0, 0, W, H); drawn = 0; } return; }
    if (t >= 1) { if (drawn !== 1) { ctx.clearRect(0, 0, W, H); drawn = 1; } return; }
    // grains vanish in a fixed random order (no per-frame flicker); redraw only when t moves
    if (t === drawn) return;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      px[j] = accent[0]; px[j + 1] = accent[1]; px[j + 2] = accent[2]; px[j + 3] = noise[i] > t ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
    drawn = t;
  };
  draw();
  return { draw };
})();

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
const inner = new THREE.PointLight(0xffffff, 1.8, 5, 2);
inner.position.set(0.2, 0.6, 0.35);
lights.push(inner);

const bay = new THREE.SpotLight(0xffffff, 9, 7, 0.5, 0.7, 1.2);   // PSU bay, also inside the glass
bay.position.set(0.3, -0.6, 0.9);
bay.target.position.set(-1.2, -1.37, -0.1);
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
/*  Build scene                                                              */
/* ------------------------------------------------------------------------ */

const parts = [];      // { def, holders:[{holder, inst}] }

let caseHolder;
const cutPlanesLocal = [];
const cutPlanesWorld = [];

async function build() {
  const casePivot = await loadNormalised(CONFIG.case.file, CONFIG.case.size, CONFIG.case.rot, [4.25, 4.4, 2.18]);
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

  // tempered-glass side panel: smoked, reflective, drawn after everything behind it
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x22262c, metalness: 0.0, roughness: 0.04,
    transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide,
    envMapIntensity: 1.4, clearcoat: 1.0, clearcoatRoughness: 0.03,
  });
  const caseMeshes = [];
  casePivot.traverse((o) => { if (o.isMesh && o.material) caseMeshes.push(o); });
  caseMeshes.forEach((o) => {
    const isGlass = o.name === 'GlassPanel' || o.material.name === 'Glass';
    if (isGlass) {
      o.material = glassMat;
      o.castShadow = false;
      o.receiveShadow = false;
      o.renderOrder = 10;
      return;
    }
    o.material = o.material.clone();
    if (CONFIG.case.tint != null) o.material.color.set(CONFIG.case.tint);
    // thin sheet-metal plates: render both faces so the cut window shows the inside of the bay
    o.material.side = THREE.DoubleSide;
    o.material.envMapIntensity = 1.0;
    // the shroud window: skip the glass frame so the cut never opens a hole in the panel
    if (o.name !== 'GlassFrame' && o.material.name !== 'GlassFrame') {
      o.material.clippingPlanes = cutPlanesWorld;
      o.material.clipIntersection = true;
    }
  });

  // the rear panel has a real PSU opening; a dark plate behind the bay keeps the page
  // background from showing through the shroud window before the PSU arrives
  const bayPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.78, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9, metalness: 0.05 }),
  );
  bayPlate.position.set(-1.88, -1.37, -0.1);
  bayPlate.receiveShadow = true;
  caseHolder.add(bayPlate);

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
      inst.fromScale = CONFIG.layout.spawnFit / def.size;   // every part is presented at the same size
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
const hint = document.getElementById('hint');
const launchEl = document.getElementById('launch');
gsap.set(launchEl, { autoAlpha: 0 });
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
    // every sentence leaves before the next step (the final step has no copy at all)
    const outAt = base + 0.74;
    tl.to(words, { y: -26, opacity: 0, duration: 0.22, ease: 'power2.in', stagger: 0.015 }, outAt);
    tl.set(el, { autoAlpha: 0 }, outAt + 0.26);
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

  // final: the orange column dissolves to white grain by grain, the PC glides to the centre,
  // lets go of the cursor and floats / turns slowly, then the call to action rises in
  const fb = CONFIG.finalStep * STEP;
  tl.to(inner, { intensity: 4, duration: 0.5 }, fb);
  tl.to(finale, { dissolve: 1, duration: 0.55, ease: 'none' }, fb + 0.02);
  tl.to(finale, { center: 1, duration: 0.6, ease: 'power2.inOut' }, fb + 0.1);
  tl.to(finale, { float: 1, duration: 0.5, ease: 'power2.inOut' }, fb + 0.2);
  tl.fromTo(launchEl, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, fb + 0.55);

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
let lastCenter = -1;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();
  const f = finale.float;
  // idle breathing grows into a real float at the end
  idle.position.y = Math.sin(t * 0.6) * (0.02 + 0.12 * f);
  idle.rotation.y = Math.sin(t * 0.35) * 0.012;
  idle.rotation.x = Math.sin(t * 0.45 + 1.2) * 0.035 * f;
  idle.rotation.z = Math.sin(t * 0.3 + 0.4) * 0.02 * f;

  mouseSmooth.lerp(mouse, 0.045);
  if (!controls) {
    finale.spin = f > 0 ? finale.spin + dt * 0.11 * f : 0;  // slow turn, ~1 min per revolution; unwinds when scrolling back
    const parallax = mouseSmooth.x * CONFIG.rig.mouseYaw * (1 - f);
    rig.rotation.y = CONFIG.rig.rotY + parallax + finale.spin * f;
    rig.rotation.x = mouseSmooth.y * CONFIG.rig.mousePitch * (1 - f);
    if (finale.center !== lastCenter) { layout(); lastCenter = finale.center; }
    camera.lookAt(camTarget);
    // copy drifts the opposite way to the PC for depth
    copyEl.style.transform = `translate3d(${mouseSmooth.x * -10}px, ${mouseSmooth.y * -6}px, 0)`;
  } else {
    controls.update();
  }
  column.draw();

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
    window.__scene = { THREE, scene, camera, rig, idle, parts, CONFIG, caseHolder, controls };
    window.__look = (px, py, pz, tx = 0, ty = 0, tz = 0) => {
      camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update();
    };
    rig.rotation.y = 0;
    parts.forEach(({ holders }) => holders.forEach(({ holder, inst }) => {
      holder.visible = true; holder.scale.setScalar(1);
      holder.position.set(...inst.pos); holder.rotation.set(...inst.rotEnd);
    }));
  }
});
