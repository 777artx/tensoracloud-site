import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------------ */
/*  CONFIG – every position is in "case space": case is centred at origin,   */
/*  its open side faces +Z (towards the camera), front panel is +X.          */
/*  Slot positions were measured on the meshes (ortho render + raycast).     */
/* ------------------------------------------------------------------------ */

const DEBUG = new URLSearchParams(location.search).has('debug');

// motherboard placement: back of PCB on the tray stand-offs (tray z = -0.65),
// rear I/O against the rear wall (x = -1.68), bottom edge just above the shroud.
const MB = [-0.52, 0.325, -0.43];
const onBoard = (x, y, z) => [MB[0] + x, MB[1] + y, MB[2] + z];

const CONFIG = {
  camera: { pos: [0, 0.9, 13.6], target: [0, -0.05, 0], fov: 30 },
  rig: { rotY: -0.48, mouseYaw: 0.13, mousePitch: 0.05 },   // 3/4 view + cursor parallax

  // case.glb → normalised 3.92 x 4.4 x 1.99. Open side +Z, front +X.
  case: {
    file: 'models/case.glb', size: 4.4, rot: [0, 0, 0], pos: [0, 0, 0],
    // window cut into the PSU shroud front so the PSU bay is visible
    cut: { min: [-1.62, -1.8, -0.95], max: [-0.25, -1.2, 1.15] },
  },

  // step = index of the scroll step that places the part
  // rot   = model-space fix-up (Euler, `order` optional), applied before placement
  // from  = where the part first appears (alternating left / right of the PC)
  // via   = staging point in front of the slot, pos = seated position
  parts: [
    {
      // 2.325 x 2.85 x 0.36 normalised, PCB surface at local z -0.157
      id: 'motherboard', step: 1, file: 'models/motherboard.glb', size: 2.85,
      rot: [0, 0, 0],
      pos: MB, via: [MB[0], MB[1], 1.35], rotEnd: [0, 0, 0],
      from: [-4.1, 0.5, 0.8], fromRot: [0.12, 0.7, -0.08],
      fallback: [2.325, 2.85, 0.36],
    },
    {
      // heat-spreader +Y → faces +Z. Sits in the socket (socket surface z -0.149)
      id: 'cpu', step: 2, file: 'models/cpu.glb', size: 0.40,
      rot: [Math.PI / 2, 0, 0],
      pos: onBoard(0.125, 0.52, -0.131), via: onBoard(0.125, 0.52, 0.55), rotEnd: [0, 0, 0],
      from: [3.9, 1.1, 0.8], fromRot: [0.4, -0.9, 0.3],
      fallback: [0.4, 0.4, 0.037],
    },
    {
      // length X, pins -Y, light bar +Y → length Y, pins -Z, bar +Z, thickness X
      // slots 2 & 4 at local x 0.682 / 0.859, slot top z -0.089, stick half-height 0.204
      id: 'ram', step: 3, file: 'models/ram.glb', size: 1.27,
      rot: [Math.PI / 2, 0, Math.PI / 2], order: 'ZYX',
      instances: [
        { pos: onBoard(0.682, 0.585, 0.075), via: onBoard(0.682, 0.585, 0.75), rotEnd: [0, 0, 0], from: [-4.0, 1.2, 0.9], fromRot: [0.2, 0.6, 0.5] },
        { pos: onBoard(0.859, 0.585, 0.075), via: onBoard(0.859, 0.585, 0.75), rotEnd: [0, 0, 0], from: [-3.8, 0.6, 1.1], fromRot: [-0.2, 0.9, 0.3] },
      ],
      fallback: [0.05, 1.27, 0.41],
    },
    {
      // length X, heatsink +Y, connector +X → flat on the board, heatsink +Z
      id: 'ssd', step: 4, file: 'models/ssd.glb', size: 0.76,
      rot: [Math.PI / 2, 0, 0],
      pos: onBoard(-0.05, -1.2, -0.132), via: onBoard(-0.05, -1.2, 0.45), rotEnd: [0, 0, 0],
      from: [3.8, -0.5, 0.9], fromRot: [0.5, -0.7, 0.9],
      fallback: [0.76, 0.2, 0.05],
    },
    {
      // length X, fans +Y, PCIe edge +Z, bracket -X → fans -Y, PCIe edge -Z (into the slot)
      // 2.6 x 0.52 x 1.2. Slot top z -0.01 at local y -0.32; PCB sits 0.2 above card centre
      id: 'gpu', step: 5, file: 'models/gpu.glb', size: 2.6,
      rot: [Math.PI, 0, 0],
      pos: onBoard(0.04, -0.52, 0.56), via: onBoard(0.04, -0.52, 1.75), rotEnd: [0, 0, 0],
      from: [-4.3, -0.2, 0.9], fromRot: [-0.35, 0.55, 0.15],
      fallback: [2.6, 0.52, 1.2],
    },
    {
      // fan +Y, vent/switch +Z, modular sockets +X → vent -X (rear), sockets +Z (open side)
      // 1.36 wide x 0.73 tall x 1.5 deep after rotation. Sits on the floor inside the shroud.
      id: 'psu', step: 6, file: 'models/psu.glb', size: 1.5,
      rot: [0, -Math.PI / 2, 0],
      pos: [-1.02, -1.6, -0.04], via: [-1.02, -1.6, 1.9], rotEnd: [0, 0, 0],
      from: [3.9, -1.3, 0.9], fromRot: [0.3, -0.8, 0.15],
      fallback: [1.36, 0.73, 1.5],
    },
  ],

  // cables: real routing – they come out of the tray grommets behind the board and
  // plug straight into their connectors. Each is a 2-row bundle of individually
  // sleeved wires (pins x 2), held by cable combs, ending in a moulded plug.
  //   w = width axis of the bundle (direction the pin row runs)
  //   the last point is the connector face; the plug body sits on it.
  cablesStep: 7,
  cables: [
    { // 24-pin ATX: right grommet → 24-pin header on the board's right edge (top z -0.447)
      pts: [[1.42, 0.42, -0.9], [1.41, 0.43, -0.55], [1.25, 0.49, -0.2], [0.92, 0.545, -0.06], [0.66, 0.545, -0.14], [0.59, 0.545, -0.3], [0.59, 0.545, -0.44]],
      pins: 12, rows: 2, w: [0, 1, 0], plugDepth: 0.14, grommet: [1.42, 0.42, -0.78, 0.16, 0.42],
    },
    { // CPU 8-pin EPS: top-left tray cutout → EPS header (top z -0.47)
      pts: [[-1.2, 1.92, -0.9], [-1.2, 1.92, -0.5], [-1.19, 1.9, -0.22], [-1.18, 1.78, -0.16], [-1.18, 1.66, -0.3], [-1.18, 1.645, -0.46]],
      pins: 4, rows: 2, w: [1, 0, 0], plugDepth: 0.13, grommet: [-1.2, 1.9, -0.78, 0.3, 0.14],
    },
    { // GPU 8-pin #1: lower right grommet → connectors on the card's outer edge (face z 0.73)
      pts: [[1.42, -0.5, -0.9], [1.41, -0.5, -0.45], [1.28, -0.42, 0.25], [0.9, -0.22, 0.78], [0.35, -0.03, 0.95], [-0.02, 0.0, 0.92], [-0.08, 0.0, 0.74]],
      pins: 4, rows: 2, w: [1, 0, 0], plugDepth: 0.13, grommet: [1.42, -0.5, -0.78, 0.16, 0.42],
    },
    { // GPU 8-pin #2 (sits beside #1)
      pts: [[1.42, -0.5, -0.9], [1.41, -0.5, -0.45], [1.3, -0.44, 0.2], [0.95, -0.27, 0.74], [0.35, -0.08, 0.98], [-0.22, -0.02, 0.94], [-0.28, 0.0, 0.74]],
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
camera.lookAt(camTarget);

// environment for reflections (no external HDR needed)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

// lights – cinematic three-point. Layer 1 = "flying" objects rendered through the blur pass.
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

const inner = new THREE.PointLight(0xffffff, 12, 7, 2);   // lifts the black interior
inner.position.set(0.2, 0.6, 1.4);
lights.push(inner);

const bay = new THREE.SpotLight(0xffffff, 10, 9, 0.32, 0.6, 1.2);   // PSU bay
bay.position.set(0.6, -0.4, 3.2);
bay.target.position.set(-1.0, -1.6, 0);
scene.add(bay.target);
lights.push(bay);

lights.push(new THREE.AmbientLight(0xffffff, 0.28));
lights.forEach((l) => { l.layers.enable(1); scene.add(l); });

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
/*  Cables – sleeved ribbons (N parallel strands) revealed along their length */
/* ------------------------------------------------------------------------ */

const cableMat = new THREE.MeshStandardMaterial({ color: 0xbdbdc2, roughness: 0.95, metalness: 0.0 });
const plugMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.55, metalness: 0.15 });
const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95, metalness: 0.0 });

const PITCH = 0.042;          // wire pitch (4.2 mm on a 10.5 cm = 1 unit scale)
const WIRE_R = 0.017;         // sleeved wire radius

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
/*  Blur pass – "flying" parts are rendered to an offscreen target,          */
/*  gaussian-blurred and composited back. Amount = holder.userData.blur.     */
/* ------------------------------------------------------------------------ */

const blur = (() => {
  const scale = 0.5;
  const mk = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  const rtA = mk(), rtB = mk();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);

  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv) * 0.1964825;
        c += texture2D(tDiffuse, vUv + dir * 1.411764) * 0.2969069;
        c += texture2D(tDiffuse, vUv - dir * 1.411764) * 0.2969069;
        c += texture2D(tDiffuse, vUv + dir * 3.294117) * 0.0944703;
        c += texture2D(tDiffuse, vUv - dir * 3.294117) * 0.0944703;
        c += texture2D(tDiffuse, vUv + dir * 5.176470) * 0.0103814;
        c += texture2D(tDiffuse, vUv - dir * 5.176470) * 0.0103814;
        gl_FragColor = c;
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });

  const compMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        if (c.a < 0.002) discard;
        vec3 rgb = c.rgb / c.a;                 // un-premultiply, tonemap, re-premultiply
        gl_FragColor = vec4(rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor = vec4(gl_FragColor.rgb * c.a, c.a);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  const quad = new THREE.Mesh(quadGeo, blurMat);
  const quadScene = new THREE.Scene();
  quadScene.add(quad);

  const size = new THREE.Vector2();
  function resize() {
    renderer.getDrawingBufferSize(size);
    rtA.setSize(Math.max(1, Math.floor(size.x * scale)), Math.max(1, Math.floor(size.y * scale)));
    rtB.setSize(rtA.width, rtA.height);
  }
  resize();

  /** render layer-1 objects blurred by `amount` (0..1) on top of the current frame */
  function render(amount, maxPx) {
    const prevLayers = camera.layers.mask;
    camera.layers.set(1);
    renderer.setRenderTarget(rtA);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    camera.layers.mask = prevLayers;

    const radius = amount * amount * maxPx;                // px at half res
    const passes = radius > 6 ? 3 : radius > 2 ? 2 : 1;
    let src = rtA, dst = rtB;
    quad.material = blurMat;
    for (let i = 0; i < passes; i++) {
      const r = radius * (1 - i * 0.3);
      blurMat.uniforms.dir.value.set(r / rtA.width, 0);
      blurMat.uniforms.tDiffuse.value = src.texture;
      renderer.setRenderTarget(dst); renderer.clear(true, false, false); renderer.render(quadScene, quadCam);
      [src, dst] = [dst, src];
      blurMat.uniforms.dir.value.set(0, r / rtA.height);
      blurMat.uniforms.tDiffuse.value = src.texture;
      renderer.setRenderTarget(dst); renderer.clear(true, false, false); renderer.render(quadScene, quadCam);
      [src, dst] = [dst, src];
    }

    renderer.setRenderTarget(null);
    quad.material = compMat;
    compMat.uniforms.tDiffuse.value = src.texture;
    renderer.render(quadScene, quadCam);
  }
  return { render, resize };
})();

function setLayer(obj, layer) {
  obj.traverse((o) => o.layers.set(layer));
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

  for (const def of CONFIG.parts) {
    const pivot = await loadNormalised(def.file, def.size, def.rot, def.fallback, def.order);
    const instances = def.instances || [{ pos: def.pos, via: def.via, rotEnd: def.rotEnd, from: def.from, fromRot: def.fromRot }];
    const holders = instances.map((inst, i) => {
      const src = i === 0 ? pivot : pivot.clone(true);
      const holder = new THREE.Group();
      holder.add(src);
      holder.position.set(...inst.from);
      holder.rotation.set(...inst.fromRot);
      holder.scale.setScalar(0.0001);
      holder.visible = false;
      holder.userData.blur = 0;
      holder.userData.layer = 0;
      holder.userData.blurPx = 7 + 15 * Math.min(1, def.size / 2.6);   // small parts get less blur so they stay legible
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

function buildTimeline() {
  const STEP = 1;                       // timeline seconds per scroll step

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#scroll',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4,
      onUpdate: (self) => {
        const i = Math.min(CONFIG.steps - 1, Math.floor(self.progress * CONFIG.steps + 0.35));
        railDots.forEach((d, k) => d.classList.toggle('active', k === i));
        hint.classList.toggle('hidden', self.progress > 0.02);
      },
    },
  });

  // copy blocks – centred, fade/scale through the middle of each step
  stepEls.forEach((el, i) => {
    const base = i * STEP;
    if (i === 0) {
      gsap.set(el, { autoAlpha: 1, scale: 1 });
      tl.to(el, { autoAlpha: 0, scale: 0.97, duration: 0.3, ease: 'power2.in' }, base + 0.3);
      return;
    }
    tl.fromTo(el, { autoAlpha: 0, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, base + 0.1);
    if (i !== CONFIG.finalStep) {
      tl.to(el, { autoAlpha: 0, scale: 0.97, duration: 0.25, ease: 'power2.in' }, base + 0.76);
    }
  });

  // parts: appear beside the PC (heavily blurred) → sharpen while gliding to the
  // staging point in front of the slot → push straight in
  for (const { def, holders } of parts) {
    const base = def.step * STEP;
    holders.forEach(({ holder, inst }, k) => {
      const d = k * 0.06;                                   // stagger for multi-instance parts
      const via = inst.via || inst.pos;
      tl.set(holder, { visible: true }, base + d);
      tl.fromTo(holder.scale, { x: 0.7, y: 0.7, z: 0.7 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: 'power2.out' }, base + d);
      tl.fromTo(holder.userData, { blur: 1 }, { blur: 0, duration: 0.6, ease: 'power1.in' }, base + 0.02 + d);
      // leg 1: glide to the staging point, straightening up
      tl.to(holder.position, { x: via[0], y: via[1], z: via[2], duration: 0.58, ease: 'power2.inOut' }, base + 0.06 + d);
      tl.to(holder.rotation, { x: inst.rotEnd[0], y: inst.rotEnd[1], z: inst.rotEnd[2], duration: 0.5, ease: 'power2.inOut' }, base + 0.08 + d);
      // leg 2: seat it (the "click")
      tl.to(holder.position, { x: inst.pos[0], y: inst.pos[1], z: inst.pos[2], duration: 0.22, ease: 'power3.in' }, base + 0.68 + d);
    });
  }

  // cables draw in from the grommets to their connectors
  const cb = CONFIG.cablesStep * STEP;
  cables.forEach((c, k) => {
    tl.to(c.state, { t: 1, duration: 0.4, ease: 'power2.inOut', onUpdate: c.update }, cb + 0.06 + k * 0.1);
  });

  // final: a touch more interior light
  const fb = CONFIG.finalStep * STEP;
  tl.to(inner, { intensity: 16, duration: 0.5 }, fb);

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
  } else {
    controls.update();
  }

  scene.updateMatrixWorld();
  if (caseHolder) {
    for (let i = 0; i < cutPlanesLocal.length; i++) cutPlanesWorld[i].copy(cutPlanesLocal[i]).applyMatrix4(caseHolder.matrixWorld);
  }

  // split flying (blurred) parts from seated ones
  let blurAmount = 0, blurPx = 0;
  for (const { holders } of parts) {
    for (const { holder } of holders) {
      const b = holder.visible ? holder.userData.blur : 0;
      const layer = b > 0.02 ? 1 : 0;
      if (layer !== holder.userData.layer) { setLayer(holder, layer); holder.userData.layer = layer; }
      if (layer === 1 && b > blurAmount) { blurAmount = b; blurPx = holder.userData.blurPx; }
    }
  }

  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 0);
  renderer.clear(true, true, true);
  renderer.shadowMap.needsUpdate = true;
  camera.layers.set(0);
  renderer.render(scene, camera);
  if (blurAmount > 0) blur.render(blurAmount, blurPx);

  requestAnimationFrame(frame);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  blur.resize();
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
