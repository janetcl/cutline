// The 3D court: floor, hoop, players, ball, arrows for the current beat, path handles,
// and picking/dragging. Positions come in as court units (see model.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Player } from './players.js?v=20261118b';
import { THEMES, TEAMS, FLOORS, RIM as RIM_UV } from './model.js?v=20261118b';

const F = 0.03048;
export const W = (u, v, y = 0) => new THREE.Vector3((u - 250) * F, y, (v - 235) * F);
const toUV = (p) => [p.x / F + 250, p.z / F + 235];
const RIM_Y = 3.05;
const RIM = W(RIM_UV[0], RIM_UV[1], RIM_Y);

function courtTexture(look) {
  const S = 3, U0 = -70, V0 = -110, UW = 640, VH = 640;
  const c = document.createElement('canvas');
  c.width = UW * S; c.height = VH * S;
  const g = c.getContext('2d');
  const X = (u) => (u - U0) * S, Y = (v) => (v - V0) * S;
  const fl = FLOORS[look.floor] || FLOORS.maple;
  g.fillStyle = look.scene === 'arena' ? '#121316' : look.scene === 'garden' ? '#1A1B20' : look.scene === 'park' ? '#8E8C86' : look.scene === 'pier' ? '#3A3D41' : look.scene === 'beach' ? '#D9BE94' : look.scene === 'gym' ? '#B98F5E' : '#2B2A28';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = look.border;
  g.fillRect(X(-30), Y(-60), 560 * S, 560 * S);
  if (fl.solid) {
    g.fillStyle = fl.solid;
    g.fillRect(X(0), Y(0), 500 * S, 470 * S);
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.08})`;
      g.fillRect(X(Math.random() * 500), Y(Math.random() * 470), 2, 2);
    }
  } else {
    const plank = 7.5;
    for (let u = 0, i = 0; u < 500; u += plank, i++) {
      for (let v = -2, j = 0; v < 470; j++) {
        const len = 60 + ((i * 37 + j * 53) % 90);
        g.fillStyle = `hsl(${fl.h + ((i * 13 + j * 7) % 5)} ${fl.s}% ${fl.l + ((i * 29 + j * 11) % 9) * 0.9}%)`;
        g.fillRect(X(u), Y(Math.max(0, v)), plank * S - 1, Math.min(len, 470 - Math.max(0, v)) * S - 1);
        v += len;
      }
    }
  }
  if (look.paint) {
    g.fillStyle = look.paint;
    g.globalAlpha = 0.85;
    g.fillRect(X(170), Y(0), 160 * S, 190 * S);
    g.beginPath(); g.arc(X(250), Y(470), 60 * S, Math.PI, 2 * Math.PI); g.fill();
    g.globalAlpha = 1;
  }
  g.strokeStyle = look.lines;
  g.lineWidth = 2 * S;
  const line = (f) => { g.beginPath(); f(); g.stroke(); };
  line(() => g.rect(X(0), Y(0), 500 * S, 470 * S));
  line(() => g.rect(X(170), Y(0), 160 * S, 190 * S));
  line(() => g.arc(X(250), Y(190), 60 * S, 0, Math.PI));
  g.setLineDash([10 * S, 8 * S]);
  line(() => g.arc(X(250), Y(190), 60 * S, Math.PI, 2 * Math.PI));
  g.setLineDash([]);
  const a = Math.asin(89.5 / 237.5);
  line(() => { g.moveTo(X(30), Y(0)); g.lineTo(X(30), Y(142)); g.arc(X(250), Y(52.5), 237.5 * S, Math.PI - a, a, true); g.lineTo(X(470), Y(0)); });
  line(() => g.arc(X(250), Y(52.5), 40 * S, 0, Math.PI));
  line(() => g.arc(X(250), Y(470), 60 * S, Math.PI, 2 * Math.PI));
  for (const v of [70, 110, 140, 170]) for (const [u0, u1] of [[160, 170], [330, 340]]) line(() => { g.moveTo(X(u0), Y(v)); g.lineTo(X(u1), Y(v)); });
  if (look.label) {
    // Baseline wordmark, painted on the apron behind the basket, readable from the broadcast camera.
    g.save();
    g.fillStyle = look.lines;
    g.globalAlpha = 0.92;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 34 * S;
    g.font = `800 ${size}px Geist, "Arial Black", Impact, sans-serif`;
    const text = look.label.toUpperCase().slice(0, 28);
    while (g.measureText(text).width > 480 * S && size > 10) { size -= 2; g.font = `800 ${size}px Geist, "Arial Black", Impact, sans-serif`; }
    g.translate(X(250), Y(-30));
    g.scale(1, -1);
    g.rotate(Math.PI);
    g.scale(-1, 1);
    g.fillText(text, 0, 0);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, w: UW * F, h: VH * F, cx: (U0 + UW / 2 - 250) * F, cz: (V0 + VH / 2 - 235) * F };
}

function ballTexture() {
  // A real eight-panel basketball, drawn per pixel on the sphere. Two seams run all the way
  // round in perpendicular planes (x = 0 and z = 0), crossing at the poles (±y). The two curved
  // seams sit either side of the x = 0 seam: they hug it near the poles, where they cross the
  // z = 0 seam, and bow away from it around the middle (|x| = a − b·y²), as on a real ball.
  const Wd = 768, Ht = 384;
  const c = document.createElement('canvas'); c.width = Wd; c.height = Ht;
  const g = c.getContext('2d');
  const img = g.createImageData(Wd, Ht);
  const bump = document.createElement('canvas'); bump.width = Wd; bump.height = Ht;
  const bg = bump.getContext('2d');
  const bimg = bg.createImageData(Wd, Ht);
  const seamW = 0.014, ca = 0.64, cb = 0.38;
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  for (let r = 0; r < Ht; r++) {
    const th = (r + 0.5) / Ht * Math.PI, st = Math.sin(th), y = Math.cos(th);
    for (let q = 0; q < Wd; q++) {
      const ph = (q + 0.5) / Wd * Math.PI * 2;
      const x = -Math.cos(ph) * st, z = Math.sin(ph) * st;
      // Distance to the nearest seam on the unit sphere.
      const d = Math.min(Math.abs(x), Math.abs(z), Math.abs(Math.abs(x) - ca + cb * y * y) / Math.sqrt(1 + 4 * cb * cb * y * y));
      const seam = Math.max(0, Math.min(1, 1 - (d - seamW) / 0.006));
      const groove = Math.max(0, Math.min(1, 1 - (d - seamW) / 0.03));
      // Pebbles: small bumps on a fine grid in angle space, sized to the sphere.
      const px = q * st * 1.2, py = r * 1.2;
      const cx = Math.floor(px / 3), cy = Math.floor(py / 3);
      const fx = px / 3 - cx - 0.5, fy = py / 3 - cy - 0.5;
      const pebble = Math.max(0, 1 - (fx * fx + fy * fy) * 3.2) * (0.7 + 0.3 * hash(cx, cy));
      const tone = 0.95 + 0.05 * Math.sin(x * 3.1 + 1.3) * Math.cos(z * 2.7 - y * 1.9);
      const k = 4 * (r * Wd + q);
      const R = (205 + pebble * 18) * tone, G = (92 + pebble * 10) * tone, B = (38 + pebble * 4) * tone;
      const shade = 1 - groove * 0.25;
      img.data[k] = (R * shade) * (1 - seam) + 26 * seam;
      img.data[k + 1] = (G * shade) * (1 - seam) + 18 * seam;
      img.data[k + 2] = (B * shade) * (1 - seam) + 14 * seam;
      img.data[k + 3] = 255;
      const bv = Math.max(0, 140 + pebble * 90 - groove * 120);
      bimg.data[k] = bimg.data[k + 1] = bimg.data[k + 2] = bv; bimg.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  bg.putImageData(bimg, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const b = new THREE.CanvasTexture(bump);
  b.anisotropy = 8;
  return { map: t, bump: b };
}

const OV = { U0: -40, V0: -60, UW: 580, VH: 540, S: 2 };
function drawMarks(g, marks, selected, accent) {
  const { U0, V0, S } = OV;
  const X = (u) => (u - U0) * S, Y = (v) => (v - V0) * S;
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const head = (a, b, color, size) => {
    const ang = Math.atan2(Y(b[1]) - Y(a[1]), X(b[0]) - X(a[0]));
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(X(b[0]) + Math.cos(ang) * 6 * S, Y(b[1]) + Math.sin(ang) * 6 * S);
    g.lineTo(X(b[0]) + Math.cos(ang + 2.5) * size * S, Y(b[1]) + Math.sin(ang + 2.5) * size * S);
    g.lineTo(X(b[0]) + Math.cos(ang - 2.5) * size * S, Y(b[1]) + Math.sin(ang - 2.5) * size * S);
    g.closePath(); g.fill();
  };
  const stroke = (pts, dash, width, color) => {
    g.setLineDash(dash.map((d) => d * S));
    g.lineWidth = width * S;
    g.strokeStyle = color;
    g.beginPath();
    pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
    g.stroke();
    g.setLineDash([]);
  };
  const zig = (base) => base.map(([u, v], i) => {
    if (i === 0 || i === base.length - 1 || i % 3) return [u, v];
    const [pu, pv] = base[i - 1];
    const dx = u - pu, dy = v - pv, l = Math.hypot(dx, dy) || 1, s = (i / 3) % 2 ? 6 : -6;
    return [u - (dy / l) * s, v + (dx / l) * s];
  });
  // Screens under arrows, the selected player's marks on top.
  const order = [...marks].sort((a, b) => (a.k === 'screen' ? -1 : 0) - (b.k === 'screen' ? -1 : 0) || (a.id === selected) - (b.id === selected));
  for (const m of order) {
    const hot = !selected || m.id === selected;
    const color = hot ? accent : 'rgba(224,85,46,.45)';
    const w = m.id === selected ? 5 : 4;
    if (m.k === 'screen') {
      const [u, v] = m.at;
      const p = [[u - Math.cos(m.ang) * 17, v - Math.sin(m.ang) * 17], [u + Math.cos(m.ang) * 17, v + Math.sin(m.ang) * 17]];
      stroke(p, [], 12, 'rgba(255,255,255,.85)');
      stroke(p, [], 7, hot ? '#1D1A17' : 'rgba(29,26,23,.5)');
      continue;
    }
    const pts = m.k === 'pass' || m.k === 'shot' ? [m.a, m.b] : m.k === 'dribble' ? zig(m.pts) : m.pts;
    const dash = m.k === 'pass' || m.k === 'shot' ? [9, 7] : [];
    stroke(pts, dash, w + 3, 'rgba(255,255,255,.75)');
    stroke(pts, dash, w, color);
    head(pts[pts.length - 2], pts[pts.length - 1], 'rgba(255,255,255,.9)', 13);
    head(pts[pts.length - 2], pts[pts.length - 1], color, 11);
  }
}

export const VIEWS = {
  broadcast: { pos: [0, 9.8, 13.2], target: [0, 0.6, -1.6] },
  // Up behind the backboard, high enough to see over it, with room above the rim.
  baseline: { pos: [0, 12.6, -24.5], target: [0, 0.2, 2.0] },
  // Straight down over the half court, pulled back so the basket and the half-court line both fit.
  top: { pos: [0, 27, -2.0], target: [0, 0, -2.2] },
  // A good seat: centered behind the half-court line, a little above the floor, so the whole half court
  // shows with the scene (skyline, stands) rising behind the basket.
  courtside: { pos: [-1.2, 4.4, 19.5], target: [0, 2.0, -6], fit: false },
};

// What every shot must keep in frame: corner and wing spots on the three-point line (feet to
// head), the top of the key, and the backboard. Used to pull the camera back on narrow frames.
const FIT_PTS = (() => {
  const pts = [];
  for (const [u, v] of [[8, 10], [492, 10], [8, 150], [492, 150], [40, 250], [460, 250], [120, 320], [380, 320], [250, 330]]) { pts.push(W(u, v, 0), W(u, v, 1.95)); }
  pts.push(W(220, 40, 3.95), W(280, 40, 3.95));
  return pts;
})();
// Safe area per frame shape, in clip space: leaves room for the title, badge and captions
// that the recorder draws over the video.
export function fitBox(aspect, recording) {
  if (!recording) return { x: 0.94, top: 0.9, bottom: -0.92 };
  if (aspect < 0.8) return { x: 0.95, top: 0.5, bottom: -0.42 };
  if (aspect < 1.3) return { x: 0.95, top: 0.8, bottom: -0.62 };
  return { x: 0.94, top: 0.84, bottom: -0.72 };
}
const _fv = new THREE.Vector3();
// Keep the camera's angle and target, and back it off (never in) until the fit points are inside the box.
export function fitCamera(camera, target, box) {
  const dir = camera.position.clone().sub(target);
  const d0 = dir.length();
  if (d0 < 1e-6) return;
  dir.divideScalar(d0);
  const fits = (d) => {
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    for (const p of FIT_PTS) {
      _fv.copy(p).project(camera);
      if (_fv.z > 1 || _fv.z < -1 || Math.abs(_fv.x) > box.x || _fv.y > box.top || _fv.y < box.bottom) return false;
    }
    return true;
  };
  if (fits(d0)) return;
  let lo = d0, hi = d0 * 1.5;
  while (!fits(hi) && hi < d0 * 6) { lo = hi; hi *= 1.5; }
  for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  fits(hi);
}

export class CourtScene {
  constructor(host, labels, hooks = {}) {
    this.host = host;
    this.labels = labels;
    this.hooks = hooks;
    this.people = new Map();
    this.theme = 'bw';
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#E9E3D9');
    scene.fog = new THREE.Fog('#E9E3D9', 30, 60);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 700);
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.addEventListener('start', () => { this.userMoved = true; });
    c.enableDamping = true;
    c.maxPolarAngle = Math.PI * 0.47;
    c.minDistance = 5;
    c.maxDistance = 40;

    this.hemi = new THREE.HemisphereLight('#FFF8EE', '#8C7A66', 1.25);
    scene.add(this.hemi);
    const key = (this.key = new THREE.DirectionalLight('#FFFFFF', 2.1));
    key.position.set(6, 16, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    this.buildHoop();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const ov = (this.ovCanvas = document.createElement('canvas'));
    ov.width = OV.UW * OV.S; ov.height = OV.VH * OV.S;
    this.ovCtx = ov.getContext('2d');
    this.ovTex = new THREE.CanvasTexture(ov);
    this.ovTex.colorSpace = THREE.SRGBColorSpace;
    this.overlay = new THREE.Mesh(new THREE.PlaneGeometry(OV.UW * F, OV.VH * F), new THREE.MeshBasicMaterial({ map: this.ovTex, transparent: true, depthWrite: false }));
    this.overlay.rotation.x = -Math.PI / 2;
    this.overlay.position.set((OV.U0 + OV.UW / 2 - 250) * F, 0.015, (OV.V0 + OV.VH / 2 - 235) * F);
    this.overlay.renderOrder = 1;
    scene.add(this.overlay);

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 48, 32), (() => { const bt = ballTexture(); return new THREE.MeshStandardMaterial({ map: bt.map, bumpMap: bt.bump, bumpScale: 0.6, roughness: 0.78, metalness: 0 }); })());
    this.ball.castShadow = true;
    scene.add(this.ball);

    this.handleGroup = new THREE.Group();
    scene.add(this.handleGroup);
    this.handleGeo = new THREE.SphereGeometry(0.11, 16, 12);
    this.addGeo = new THREE.TorusGeometry(0.1, 0.03, 8, 20);

    this.setKits({ O: TEAMS.black, D: TEAMS.white });
    this.setCourt({ floor: 'maple', paint: THEMES.bw.paint, lines: '#FFFFFF', border: THEMES.bw.paint, label: '', scene: 'studio' });
    this.setView('broadcast');
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  buildHoop() {
    const scene = this.scene;
    // Soft studio reflections so the glass and metal read as glass and metal.
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const cols = [];
    const posAttr = sky.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i) / 20;
      const c = new THREE.Color().setHSL(0.08, 0.15, 0.55 + y * 0.4);
      cols.push(c.r, c.g, c.b);
    }
    sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(sky);
    for (const [x, y, z] of [[-6, 8, 4], [6, 8, -4], [0, 10, 8]]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
      panel.position.set(x, y, z); panel.lookAt(0, 0, 0);
      env.add(panel);
    }
    scene.environment = pm.fromScene(env, 0.04).texture;
    scene.environmentIntensity = 0.55;

    const boardZ = W(250, 40).z;
    const g = (this.hoop = new THREE.Group());
    const glass = new THREE.MeshPhysicalMaterial({ color: '#E8F4FF', metalness: 0, roughness: 0.03, transmission: 0.94, thickness: 0.025, ior: 1.5, transparent: true, opacity: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2, side: THREE.DoubleSide });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.83, 1.07, 0.025), glass);
    board.position.set(0, 3.33, boardZ);
    g.add(board);
    // Painted white border and shooter's square, slightly proud of the glass on both faces.
    const paint = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 });
    const bar = (w, h, x, y) => { for (const dz of [0.014, -0.014]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.003), paint); m.position.set(x, y, boardZ + dz); g.add(m); } };
    const bw = 0.05;
    bar(1.83, bw, 0, 3.33 + 0.535 - bw / 2); bar(1.83, bw, 0, 3.33 - 0.535 + bw / 2);
    bar(bw, 1.07, -0.915 + bw / 2, 3.33); bar(bw, 1.07, 0.915 - bw / 2, 3.33);
    const sqY = RIM_Y + 0.15 + 0.23;
    bar(0.61, 0.05, 0, sqY + 0.205); bar(0.61, 0.05, 0, RIM_Y + 0.175);
    bar(0.05, 0.46, -0.28, sqY - 0.005); bar(0.05, 0.46, 0.28, sqY - 0.005);
    // Metal frame and the padded bottom edge.
    const metal = new THREE.MeshStandardMaterial({ color: '#B9BDC2', metalness: 0.9, roughness: 0.28 });
    const pad = new THREE.MeshStandardMaterial({ color: '#1D1A17', roughness: 0.8 });
    const frame = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), metal); m.position.set(x, y, boardZ - 0.01); g.add(m); };
    frame(1.86, 0.025, 0, 3.33 + 0.545); frame(0.025, 1.09, -0.93, 3.33); frame(0.025, 1.09, 0.93, 3.33);
    const bottomPad = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.09), pad);
    bottomPad.position.set(0, 3.33 - 0.57, boardZ);
    bottomPad.castShadow = true;
    g.add(bottomPad);
    // Rim, bracket and net hooks.
    const orange = new THREE.MeshStandardMaterial({ color: '#E2531B', metalness: 0.55, roughness: 0.32 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2286, 0.0095, 12, 48), orange);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(RIM);
    rim.castShadow = true;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.16), orange);
    bracket.position.set(0, RIM_Y, boardZ + 0.08);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.012), orange);
    plate.position.set(0, RIM_Y - 0.05, boardZ + 0.018);
    g.add(rim, bracket, plate);
    // Net: knotted diamond mesh, 12 loops round, tapering down.
    const N = 12, ROWS = 7;
    const node = (r, j) => {
      const a = ((j + (r % 2) * 0.5) / N) * Math.PI * 2;
      const q = r / ROWS;
      const rad = 0.2286 - 0.085 * Math.sin(q * Math.PI * 0.5) + (r === 0 ? 0 : -0.004);
      return new THREE.Vector3(RIM.x + Math.cos(a) * rad, -q * 0.44, RIM.z + Math.sin(a) * rad);
    };
    const segs = [];
    for (let r = 0; r < ROWS; r++) for (let j = 0; j < N; j++) {
      const a = node(r, j);
      segs.push([a, node(r + 1, j)], [a, node(r + 1, r % 2 ? j + 1 : j - 1)]);
    }
    const cord = new THREE.CylinderGeometry(0.0042, 0.0042, 1, 5, 1, true);
    cord.translate(0, 0.5, 0);
    this.netMat = new THREE.MeshStandardMaterial({ color: '#F6F3EC', roughness: 0.95 });
    const net = new THREE.InstancedMesh(cord, this.netMat, segs.length);
    const m4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), qn = new THREE.Quaternion(), sc = new THREE.Vector3();
    segs.forEach(([a, b], k) => {
      const d = new THREE.Vector3().subVectors(b, a);
      qn.setFromUnitVectors(up, d.clone().normalize());
      sc.set(1, d.length(), 1);
      m4.compose(a.clone().sub(new THREE.Vector3(RIM.x, 0, RIM.z)), qn, sc);
      net.setMatrixAt(k, m4);
    });
    net.castShadow = true;
    this.net = new THREE.Group();
    this.net.position.set(RIM.x, RIM_Y, RIM.z);
    this.net.add(net);
    this.netKick = 0;
    g.add(this.net);
    // Support arm, pole and base pad.
    const dark = new THREE.MeshStandardMaterial({ color: '#2A2724', roughness: 0.5, metalness: 0.2 });
    const padBase = pad.clone();
    this.stanchionMats = [dark, padBase];
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.4), dark);
    arm.position.set(0, 3.3, boardZ - 0.72);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), dark);
    pole.position.set(0, 1.7, boardZ - 1.4);
    pole.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.6), padBase);
    base.position.set(0, 0.25, boardZ - 1.7);
    g.add(arm, pole, base);
    this.stdStanchion = [arm, pole, base];
    // Outdoor gooseneck: one galvanized pipe curving up and over to the back of the board, black pad at the foot.
    const gMetal = new THREE.MeshStandardMaterial({ color: '#B9C0C6', metalness: 0.85, roughness: 0.32 });
    const gPad = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, boardZ - 2.0), new THREE.Vector3(0, 3.6, boardZ - 2.0), new THREE.Vector3(0, 3.55, boardZ - 0.45), new THREE.Vector3(0, 3.3, boardZ - 0.04));
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.085, 12), gMetal); pipe.castShadow = true;
    const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.9, 20), gPad); gp.position.set(0, 0.95, boardZ - 2.0); gp.castShadow = true;
    const gPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), gMetal); gPlate.position.set(0, 0.03, boardZ - 2.0);
    this.goose = new THREE.Group(); this.goose.add(pipe, gp, gPlate); this.goose.visible = false;
    g.add(this.goose);
    this.stanchionMats.push(gMetal, gPad);
    this.hoopGroup = g;
    scene.add(g);
  }

  // What's around the court: nothing (studio / arena) or a New York City park.
  setSurroundings(type, team) {
    const key = type + ((type === 'gym' || type === 'arena') && team ? team.paint + (team.jersey || '') : '');
    if (this.surroundType === key) return;
    this.surroundType = key;
    if (this.surround) { this.scene.remove(this.surround); this.surround.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.surround = null; }
    this.anim = []; this.boards = []; this.scored = 0;
    this.netMat.color.set(type === 'park' ? '#A9AEB3' : '#F6F3EC');
    this.netMat.metalness = type === 'park' ? 0.85 : 0;
    this.netMat.roughness = type === 'park' ? 0.35 : 0.95;
    const rnd = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
    const goose = type === 'pier';
    if (this.goose) { this.goose.visible = goose; for (const m of this.stdStanchion) m.visible = !goose; }
    if (type === 'garden') { this.buildGarden(rnd); return; }
    if (type === 'beach') { this.buildBeach(rnd); return; }
    if (type === 'gym') { this.buildGym(rnd, team); return; }
    if (type === 'arena') { this.buildGarden(rnd, true, team); return; }
    if (type === 'studio') { this.buildStudio(); return; }
    if (type === 'pier') { this.buildPier(rnd); return; }
    if (type !== 'park') return;
    this.buildPark(rnd);
  }


  // A New York City park block, all the way round: the court in a plaza, lawns and plane trees,
  // park lamps, four streets with traffic, walk-ups across the street and glass towers behind them.
  buildPark(rnd) {
    const g = (this.surround = new THREE.Group());
    this.parkCars = [];
    const STD = (o) => new THREE.MeshStandardMaterial(o);
    const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
    // merge many small geometries into one mesh (vertex colors carry the variation)
    const merge = (parts, lit = false) => {
      const pos = [], nor = [], col = [];
      for (const [geo, color, m] of parts) { const gg = geo.clone(); gg.applyMatrix4(m); gg.computeVertexNormals();
        const pa = gg.attributes.position, na = gg.attributes.normal, ix = gg.index;
        const n = ix ? ix.count : pa.count; for (let k = 0; k < n; k++) { const i = ix ? ix.getX(k) : k; pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); const sh = lit ? 0.72 + 0.4 * Math.max(0, na.getY(i)) : 1; col.push(color.r * sh, color.g * sh, color.b * sh); } }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return out; };
    const M = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

    // Sky, and the same sky baked into reflections for the glass towers.
    const skyGeo = (r) => { const geo = new THREE.SphereGeometry(r, 32, 16), cols = [], pa = geo.attributes.position, top = new THREE.Color('#4F8FD3'), hor = new THREE.Color('#E3EDF4');
      for (let i = 0; i < pa.count; i++) { const y = Math.max(0, pa.getY(i) / r); const c = hor.clone().lerp(top, Math.pow(y, 0.55)); if (pa.getY(i) < 0) c.set('#B9C2B0'); cols.push(c.r, c.g, c.b); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return geo; };
    g.add(new THREE.Mesh(skyGeo(400), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false })));
    if (this.parkEnv) this.parkEnv.dispose();
    { const es = new THREE.Scene(); es.add(new THREE.Mesh(skyGeo(20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.9) })); sun.position.set(-9, 12, 6); es.add(sun);
      const pm = new THREE.PMREMGenerator(this.renderer); this.parkEnv = pm.fromScene(es, 0.03).texture; pm.dispose(); }
    const env = this.parkEnv;
    // soft clouds all round
    const cloud = tex(256, 128, (x) => { for (let i = 0; i < 14; i++) { const px = 40 + rnd() * 176, py = 70 - rnd() * 24, pr = 18 + rnd() * 26; const gr = x.createRadialGradient(px, py, 2, px, py, pr); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill(); } });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + rnd() * 0.3, d = 300 + rnd() * 60; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, transparent: true, opacity: 0.85, depthWrite: false, fog: false })); sp.position.set(Math.cos(a) * d, 70 + rnd() * 90, Math.sin(a) * d); sp.scale.set(120 + rnd() * 80, 50 + rnd() * 30, 1); g.add(sp); }

    // Ground: lawn, the court plaza, park paths, sidewalks and four streets.
    const flat = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
    const lawnT = tex(256, 256, (x) => { x.fillStyle = '#6E8B47'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(90,120,55,.5)' : 'rgba(140,160,90,.35)'; x.fillRect(rnd() * 256, rnd() * 256, 2, 2); } }, [60, 60]);
    flat(800, 800, 0, 0, STD({ map: lawnT, roughness: 1 }), -0.03);
    const concrete = STD({ map: tex(128, 128, (x) => { x.fillStyle = '#A7A49C'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(rnd() * 128, rnd() * 128, 2, 2); } }, [10, 10]), roughness: 0.95 });
    flat(34, 34, 0, -1, concrete, -0.012);
    const pathM = STD({ color: '#B8B2A6', roughness: 0.95 });
    flat(4, 16, 0, 24, pathM, -0.015); flat(4, 14, 0, -25, pathM, -0.015); flat(14, 4, -24, 0, pathM, -0.015); flat(14, 4, 24, 0, pathM, -0.015);
    const PX = 31, PZ0 = -33, PZ1 = 35, RW = 9, SW = 4;   // park edge, road width, sidewalk
    const sideM = STD({ color: '#B5B1A9', roughness: 0.95 });
    const asphalt = STD({ map: tex(64, 64, (x) => { x.fillStyle = '#3C3E42'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.08)'; x.fillRect(rnd() * 64, rnd() * 64, 1.5, 1.5); } }, [40, 40]), roughness: 0.9 });
    const LX = PX + SW, LZ0 = PZ0 - SW, LZ1 = PZ1 + SW, EXT = 140;
    flat(RW, EXT * 2, -(LX + RW / 2), 0, asphalt, -0.01); flat(RW, EXT * 2, LX + RW / 2, 0, asphalt, -0.01);
    flat(EXT * 2, RW, 0, LZ0 - RW / 2, asphalt, -0.008); flat(EXT * 2, RW, 0, LZ1 + RW / 2, asphalt, -0.008);
    for (const sx of [-1, 1]) { flat(SW, EXT * 2, sx * (PX + SW / 2), 0, sideM, -0.006); flat(SW, EXT * 2, sx * (LX + RW + SW / 2), 0, sideM, -0.006); }
    for (const z of [PZ0 - SW / 2, PZ1 + SW / 2, LZ0 - RW - SW / 2, LZ1 + RW + SW / 2]) flat(EXT * 2, SW, 0, z, sideM, -0.004);
    const paint = STD({ color: '#F2C230', roughness: 0.6 }), white = STD({ color: '#F1EFE8', roughness: 0.6 });
    for (let t = -EXT; t < EXT; t += 6) { flat(0.18, 3, -(LX + RW / 2), t, paint, 0); flat(0.18, 3, LX + RW / 2, t, paint, 0); flat(3, 0.18, t, LZ0 - RW / 2, paint, 0.002); flat(3, 0.18, t, LZ1 + RW / 2, paint, 0.002); }
    for (const [cx, cz, along] of [[-(LX + RW / 2), LZ0 - RW - 1, 'x'], [LX + RW / 2, LZ0 - RW - 1, 'x'], [-(LX + RW / 2), LZ1 + RW + 1, 'x'], [LX + RW / 2, LZ1 + RW + 1, 'x']])
      for (let k = -3.5; k <= 3.5; k += 1) flat(along === 'x' ? 0.55 : 2, along === 'x' ? 2 : 0.55, cx + (along === 'x' ? k : 0), cz, white, 0.003);
    // Low black iron fence round the park, with gaps for the paths.
    const iron = STD({ color: '#202422', metalness: 0.6, roughness: 0.5 });
    const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0); for (const y of [0.25, 0.95]) { const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), iron); r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = -a; g.add(r); } };
    for (const sx of [-1, 1]) { rail(sx * PX, PZ0, sx * PX, -2.5); rail(sx * PX, 2.5, sx * PX, PZ1); }
    rail(-PX, PZ0, -2.5, PZ0); rail(2.5, PZ0, PX, PZ0); rail(-PX, PZ1, -2.5, PZ1); rail(2.5, PZ1, PX, PZ1);

    // Chain-link fence round the court on three sides (the camera side stays open).
    const ft = tex(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.strokeStyle = 'rgba(190,196,200,1)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(64, 64); x.moveTo(64, 0); x.lineTo(0, 64); x.stroke(); });
    ft.colorSpace = THREE.NoColorSpace;
    const H = 3.6, X = 10.2, Z0 = -11.3, Z1 = 10;
    const fenceSide = (len, px, pz, rotY) => { const t = ft.clone(); t.needsUpdate = true; t.repeat.set(len / 0.35, H / 0.35);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), STD({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 })); m.position.set(px, H / 2, pz); m.rotation.y = rotY; g.add(m); };
    fenceSide(2 * X, 0, Z0, 0); fenceSide(Z1 - Z0, -X, (Z0 + Z1) / 2, Math.PI / 2); fenceSide(Z1 - Z0, X, (Z0 + Z1) / 2, Math.PI / 2);
    const postMat = STD({ color: '#8E959B', metalness: 0.8, roughness: 0.4 }), post = new THREE.CylinderGeometry(0.04, 0.04, H, 8);
    const addPost = (x, z) => { const m = new THREE.Mesh(post, postMat); m.position.set(x, H / 2, z); m.castShadow = true; g.add(m); };
    for (let x = -X; x <= X + 0.01; x += X / 3) addPost(x, Z0);
    for (let z = Z0 + 3.1; z <= Z1 + 0.01; z += (Z1 - Z0) / 6) { addPost(-X, z); addPost(X, z); }

    // London plane trees: a mottled trunk that forks, and a canopy of clustered leaf clumps.
    const trunkMat = STD({ map: tex(64, 128, (x) => { x.fillStyle = '#A59A7E'; x.fillRect(0, 0, 64, 128); for (let i = 0; i < 70; i++) { x.fillStyle = ['#7C7259', '#C9C1A4', '#8F8A6C', '#B7AF8E'][i % 4]; x.beginPath(); x.ellipse(rnd() * 64, rnd() * 128, 4 + rnd() * 8, 3 + rnd() * 6, rnd() * 3, 0, Math.PI * 2); x.fill(); } }), roughness: 0.9 });
    const leafMat = STD({ vertexColors: true, roughness: 0.95 });
    const greens = ['#4C7A37', '#5A8A3E', '#3F6A31', '#6B9A48', '#56803A'].map((c) => new THREE.Color(c));
    const clump = (() => { const geo = new THREE.SphereGeometry(1, 16, 12), pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { const k = 0.94 + Math.sin(pa.getX(i) * 5.1) * Math.cos(pa.getZ(i) * 4.3) * 0.06; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k * 0.82, pa.getZ(i) * k); } return geo; })();
    const tree = (x, z, s) => {
      const parts = [], ry = rnd() * Math.PI * 2;
      const trunk = new THREE.CylinderGeometry(0.17, 0.26, 3.2, 9); trunk.applyMatrix4(M(x, 1.6 * s, z, s, s, s));
      const tr = new THREE.Mesh(trunk, trunkMat); tr.castShadow = true; g.add(tr);
      for (let b = 0; b < 3; b++) { const a = ry + (b / 3) * Math.PI * 2, br = new THREE.CylinderGeometry(0.07, 0.13, 2.2, 7); br.applyMatrix4(M(x + Math.cos(a) * 0.55 * s, 3.9 * s, z + Math.sin(a) * 0.55 * s, s, s, s, Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55)); const bm = new THREE.Mesh(br, trunkMat); bm.castShadow = true; g.add(bm); }
      // a big rounded crown: one clump on top and a ring of overlapping ones round it
      const base = greens[Math.floor(rnd() * greens.length)];
      parts.push([clump, base, M(x, 6.0 * s, z, 2.3 * s, 2.0 * s, 2.3 * s)]);
      const n = 6 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + rnd() * 0.4, r = 1.7 + rnd() * 0.4, y = 5.0 + rnd() * 0.8, sc = (1.35 + rnd() * 0.35) * s;
        parts.push([clump, base.clone().lerp(greens[k % greens.length], 0.35), M(x + Math.cos(a) * r * s, y * s, z + Math.sin(a) * r * s, sc * 1.1, sc * 0.9, sc * 1.1, 0, rnd() * 3, 0)]); }
      const can = new THREE.Mesh(merge(parts, true), leafMat); can.castShadow = true; g.add(can);
    };
    const treeSpots = [[-14, -14], [-6, -16.5], [5, -15.5], [14, -13], [-15, -3], [-15.5, 6], [15, -2], [15.5, 7], [-18, 16], [18, 15], [-8, 19], [8, 20], [-24, -24], [24, -23], [-25, 24], [25, 25], [-26, 9], [26, -9], [0, -29], [-12, 29], [12, 30]];
    for (const [x, z] of treeSpots) tree(x, z, 0.9 + rnd() * 0.35);
    for (let t = -EXT + 6; t < EXT; t += 11) { for (const sx of [-1, 1]) { if (Math.abs(t) > 4) tree(sx * (LX + RW + SW / 2), t + rnd() * 2, 0.75 + rnd() * 0.2); } }

    // Park lamps: a dark green post with a warm lantern.
    const lampGreen = STD({ color: '#24382C', metalness: 0.5, roughness: 0.5 });
    const glow = new THREE.MeshStandardMaterial({ color: '#FFF1C9', emissive: '#FFD889', emissiveIntensity: 1.4, roughness: 0.4 });
    const lamp = (x, z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.8, 8), lampGreen); p.position.set(x, 1.9, z); p.castShadow = true;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), lampGreen); base.position.set(x, 0.25, z);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.55, 6), glow); head.position.set(x, 4.05, z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 6), lampGreen); cap.position.set(x, 4.47, z);
      g.add(p, base, head, cap); };
    for (const [x, z] of [[-13, -13], [13, -13], [-13, 12], [13, 12], [-3, 21], [3, 27], [-3, -22], [3, -28], [-21, -3], [21, 3]]) lamp(x, z);
    for (let t = -EXT + 3; t < EXT; t += 14) for (const sx of [-1, 1]) lamp(sx * (PX + SW - 0.6), t);
    for (let t = -60; t < 60; t += 14) for (const zz of [PZ0 - SW + 0.6, PZ1 + SW - 0.6]) lamp(t, zz);
    // Benches along the park paths, and a hot dog cart by the court.
    const wood = STD({ color: '#8B5A3A', roughness: 0.8 });
    const bench = (x, z, ry) => { const b = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), wood); seat.position.y = 0.45; const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), wood); back.position.set(0, 0.75, -0.22); b.add(seat, back);
      for (const sx of [-0.8, 0.8]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.4), iron); leg.position.set(sx, 0.22, 0); b.add(leg); } b.position.set(x, 0, z); b.rotation.y = ry; g.add(b); };
    for (const [x, z, r] of [[-3.2, 20, Math.PI / 2], [3.2, 23, -Math.PI / 2], [-3.2, -23, Math.PI / 2], [3.2, -26, -Math.PI / 2], [-20, 3.2, Math.PI], [22, -3.2, 0]]) bench(x, z, r);
    { const cart = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.9), STD({ color: '#D9D6CE', metalness: 0.7, roughness: 0.3, envMap: env })); box.position.y = 0.8;
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 12, 1, true), STD({ color: '#F2B233', side: THREE.DoubleSide, roughness: 0.7 })); um.position.y = 2.6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), iron); pole.position.y = 1.5;
      for (const [wx, wz] of [[-0.7, 0.45], [0.7, 0.45], [-0.7, -0.45], [0.7, -0.45]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), iron); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.18, wz); cart.add(w); }
      cart.add(box, um, pole); cart.position.set(-6, 0, 15); cart.rotation.y = 0.4; g.add(cart); }

    // Cars and yellow cabs, some parked at the curb, the rest driving the four streets.
    const carCols = ['#F2C230', '#F2C230', '#F2C230', '#1E2226', '#E9EAEC', '#B3212D', '#2C4F8A', '#9AA1A8', '#3D6B4E'];
    const carGlass = STD({ color: '#24303C', metalness: 0.8, roughness: 0.15, envMap: env });
    const tire = STD({ color: '#151515', roughness: 0.9 });
    const headM = new THREE.MeshStandardMaterial({ color: '#FFF6D8', emissive: '#FFF0C0', emissiveIntensity: 0.8 });
    const tailM = new THREE.MeshStandardMaterial({ color: '#B0141E', emissive: '#C01020', emissiveIntensity: 0.6 });
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
    const car = (col) => { const c = new THREE.Group(), taxi = col === '#F2C230';
      const bodyM = STD({ color: col, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 0.9 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.75, 1.8), bodyM); body.position.y = 0.72; body.castShadow = true;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 1.62), carGlass); cab.position.set(-0.2, 1.38, 0);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.58), bodyM); roof.position.set(-0.2, 1.72, 0);
      c.add(body, cab, roof);
      if (taxi) { const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.9), new THREE.MeshStandardMaterial({ color: '#FFF7DD', emissive: '#FFE7A0', emissiveIntensity: 0.5 })); sign.position.set(-0.2, 1.87, 0); c.add(sign);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.1, 1.82), STD({ color: '#1A1A1A' })); stripe.position.y = 0.78; c.add(stripe); }
      for (const [wx, wz] of [[1.35, 0.85], [1.35, -0.85], [-1.35, 0.85], [-1.35, -0.85]]) { const w = new THREE.Mesh(wheelGeo, tire); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.34, wz); c.add(w); }
      for (const wz of [0.6, -0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.34), headM); h.position.set(2.16, 0.82, wz); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.34), tailM); tl.position.set(-2.16, 0.82, wz); c.add(h, tl); }
      g.add(c); return c; };
    const pick = () => carCols[Math.floor(rnd() * carCols.length)];
    const drive = (axis, fixed, dir, speed, start) => { const c = car(pick()); this.parkCars.push({ c, axis, fixed, dir, speed, t: start }); };
    for (const sx of [-1, 1]) { const cx = sx * (LX + RW / 2); for (let k = 0; k < 4; k++) { drive('z', cx + 2, 1, 7 + rnd() * 3, -EXT + k * 70 + rnd() * 20); drive('z', cx - 2, -1, 6 + rnd() * 3, -EXT + k * 70 + rnd() * 20); } }
    for (const zz of [LZ0 - RW / 2, LZ1 + RW / 2]) for (let k = 0; k < 4; k++) { drive('x', zz + 2, 1, 7 + rnd() * 3, -EXT + k * 70 + rnd() * 20); drive('x', zz - 2, -1, 6 + rnd() * 3, -EXT + k * 70 + rnd() * 20); }
    for (const sx of [-1, 1]) for (let t = -40; t < 50; t += 7 + rnd() * 6) { if (rnd() < 0.35) continue; const c = car(pick()); c.position.set(sx * (LX + RW - 1.2), 0, t); c.rotation.y = Math.PI / 2; }
    this.parkEXT = EXT;
    this.tickPark(0);

    // Across the street: brick and limestone walk-ups with stoops and water towers, all four sides.
    const winTex = (base) => tex(128, 256, (x) => { x.fillStyle = base; x.fillRect(0, 0, 128, 256); for (let r = 0; r < 16; r++) for (let q = 0; q < 6; q++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(6 + q * 20, 6 + r * 16, 12, 11); x.fillStyle = rnd() < 0.16 ? '#F4DFA6' : rnd() < 0.5 ? '#2B3440' : '#46525F'; x.fillRect(7 + q * 20, 7 + r * 16, 10, 9); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(7 + q * 20, 15 + r * 16, 10, 1.5); } });
    const bases = ['#8C4A36', '#A35D44', '#C9B79A', '#7B6A5C', '#B07A55', '#9AA0A6', '#6E4637', '#B9A58A'];
    const towerMat = STD({ color: '#7A5A3E', roughness: 0.9 }), roofMat = STD({ color: '#4A3F36', roughness: 0.9 });
    const walkup = (x, z, w, d, h, face) => { const base = new THREE.Color(bases[Math.floor(rnd() * bases.length)]); const t = winTex('#' + base.getHexString()); t.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 12)));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), STD({ map: t, roughness: 0.85 })); m.position.set(x, h / 2, z); g.add(m);
      const cor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.6, d + 0.5), STD({ color: base.clone().multiplyScalar(0.72), roughness: 0.9 })); cor.position.set(x, h + 0.3, z); g.add(cor);
      if (rnd() < 0.4) { const tx = x + (rnd() - 0.5) * w * 0.4; const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 14), towerMat); tank.position.set(tx, h + 2.6, z); const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.1, 14), roofMat); cap.position.set(tx, h + 4.25, z); g.add(tank, cap);
        for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), roofMat); leg.position.set(tx + dx, h + 0.75, z + dz); g.add(leg); } } };
    const B = LX + RW + SW;   // building line
    for (let z = -EXT; z < EXT; z += 9 + rnd() * 5) { walkup(-(B + 6), z, 12, 8 + rnd() * 4, 10 + rnd() * 14); walkup(B + 6, z, 12, 8 + rnd() * 4, 10 + rnd() * 14); }
    for (let x = -B; x < B; x += 9 + rnd() * 5) { walkup(x, LZ0 - RW - SW - 6, 8 + rnd() * 4, 12, 10 + rnd() * 14); walkup(x, LZ1 + RW + SW + 6, 8 + rnd() * 4, 12, 10 + rnd() * 14); }

    // Glass towers behind, all the way round: curtain walls that mirror the sky, with setbacks and crowns.
    const curtain = tex(128, 512, (x) => { const vg = x.createLinearGradient(0, 0, 0, 512); vg.addColorStop(0, '#7E98BC'); vg.addColorStop(0.5, '#BFD0E2'); vg.addColorStop(1, '#E9F0F6'); x.fillStyle = vg; x.fillRect(0, 0, 128, 512);
      for (let r = 0; r < 32; r++) for (let q = 0; q < 8; q++) { const v = rnd(); x.fillStyle = v < 0.5 ? `rgba(18,28,46,${v * 0.22})` : `rgba(255,255,255,${(v - 0.5) * 0.22})`; x.fillRect(q * 16, r * 16, 16, 16); }
      x.fillStyle = 'rgba(30,38,50,.35)'; for (let i = 0; i < 128; i += 16) x.fillRect(i, 0, 2, 512); x.fillStyle = 'rgba(30,38,50,.28)'; for (let i = 0; i < 512; i += 16) x.fillRect(0, i, 128, 2); });
    const glassMat = (tint, rough) => { const t = curtain.clone(); t.needsUpdate = true; return STD({ color: tint, map: t, metalness: 0.9, roughness: rough, envMap: env, envMapIntensity: 1.4 }); };
    const tints = [['#9DB4D2', 0.08], ['#A9CFC9', 0.1], ['#6F829C', 0.12], ['#E3C792', 0.1], ['#DCE4EE', 0.05]];
    const gtower = (x, z, w, d, h) => { const [tint, rough] = tints[Math.floor(rnd() * tints.length)]; const mat = glassMat(tint, rough); mat.map.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 32)));
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, h / 2, z); g.add(b);
      let y = h, ww = w, dd = d; const steps = Math.floor(rnd() * 3);
      for (let i = 0; i < steps; i++) { ww *= 0.8; dd *= 0.8; const sh = 6 + rnd() * 8; const s2 = new THREE.Mesh(new THREE.BoxGeometry(ww, sh, dd), mat); s2.position.set(x, y + sh / 2, z); g.add(s2); y += sh; }
      const crown = new THREE.Mesh(new THREE.BoxGeometry(ww * 0.95, 1.2, dd * 0.95), STD({ color: '#3C4450', metalness: 0.7, roughness: 0.4 })); crown.position.set(x, y + 0.6, z); g.add(crown);
      if (rnd() < 0.25) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, 14, 6), STD({ color: '#C9CED6', metalness: 0.9, roughness: 0.2, envMap: env })); sp.position.set(x, y + 8, z); g.add(sp); } };
    for (let a = 0; a < Math.PI * 2; a += 0.11 + rnd() * 0.08) { const r = 105 + rnd() * 70; gtower(Math.cos(a) * r, Math.sin(a) * r, 14 + rnd() * 12, 14 + rnd() * 12, 45 + rnd() * 85); }
    this.scene.add(g);
  }

  tickPark(dt) {
    if (!this.parkCars || this.surroundType !== 'park') return;
    const E = this.parkEXT;
    for (const k of this.parkCars) {
      k.t += k.dir * k.speed * dt; if (k.t > E) k.t -= 2 * E; if (k.t < -E) k.t += 2 * E;
      if (k.axis === 'z') { k.c.position.set(k.fixed, 0, k.t); k.c.rotation.y = k.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
      else { k.c.position.set(k.t, 0, k.fixed); k.c.rotation.y = k.dir > 0 ? 0 : Math.PI; }
    }
  }

  // Brooklyn Bridge Park, Pier 2: blacktop courts on the East River with Lower Manhattan
  // across the water behind the basket, the Brooklyn Bridge upriver, the pier shed's steel
  // frame and pale blue roof alongside, and tall floodlights. Built all the way round.
  buildPier(rnd) {
    const g = (this.surround = new THREE.Group());
    const basic = (color) => new THREE.MeshBasicMaterial({ color, fog: true });
    // Sky: deep summer blue overhead, hazy pale blue at the horizon.
    // Golden hour: the sun sits low just left of the skyline, so glass and water catch it.
    const sunDir = new THREE.Vector3(-0.42, 0.13, -0.9).normalize();
    const skyGeo = (R) => {
      const geo = new THREE.SphereGeometry(R, 48, 24), pa = geo.attributes.position, cols = [];
      const stops = [[0, '#F7C688'], [0.07, '#F3B996'], [0.16, '#C9B4C2'], [0.32, '#7FA2D6'], [0.6, '#3E6FBF'], [1, '#1F4C9C']].map(([t, c]) => [t, new THREE.Color(c)]);
      const v = new THREE.Vector3(), warm = new THREE.Color('#FFD7A0');
      for (let i = 0; i < pa.count; i++) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).normalize();
        const y = Math.max(0, v.y);
        let k = 0; while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
        const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
        const c = c0.clone().lerp(c1, Math.min(1, (y - t0) / (t1 - t0)));
        // A warm glow around the sun.
        const near = Math.max(0, v.dot(sunDir)); c.lerp(warm, Math.pow(near, 6) * 0.7);
        if (v.y < 0) c.set('#C9A98C');
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      return geo;
    };
    const sky = new THREE.Mesh(skyGeo(520), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false }));
    g.add(sky);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.12, 'rgba(255,236,190,.95)'); gr.addColorStop(0.35, 'rgba(255,200,130,.35)'); gr.addColorStop(1, 'rgba(255,170,110,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (const [size, op] of [[34, 1], [120, 0.55], [260, 0.25]]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      sp.position.copy(sunDir).multiplyScalar(480); sp.scale.set(size, size, 1); g.add(sp);
    }
    // Reflections: the same sky (and sun) baked once into an environment map for the glass and the river.
    if (this.pierEnv) this.pierEnv.dispose();
    { const es = new THREE.Scene(); es.add(new THREE.Mesh(skyGeo(20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.1, 1.5) })); sun.position.copy(sunDir).multiplyScalar(18); es.add(sun);
      const pm = new THREE.PMREMGenerator(this.renderer); this.pierEnv = pm.fromScene(es, 0.02).texture; pm.dispose(); }
    const env = this.pierEnv;
    // Cumulus clouds: soft white puffs, flat and a touch grey underneath, all round the sky.
    const cloudTex = (seed) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const x = c.getContext('2d');
      let r = seed; const rn = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      const puffs = [];
      for (let i = 0; i < 26; i++) { const px = 70 + rn() * 372, base = 190 - Math.pow(1 - Math.abs(px - 256) / 200, 1.2) * (60 + rn() * 70); puffs.push([px, base - rn() * 30, 26 + rn() * 46]); }
      for (const [px, py, pr] of puffs) {
        const gr = x.createRadialGradient(px, py - pr * 0.3, pr * 0.15, px, py, pr);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(246,249,252,.95)'); gr.addColorStop(1, 'rgba(225,233,242,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      }
      // Flat, slightly grey base.
      x.globalCompositeOperation = 'source-atop';
      const sh = x.createLinearGradient(0, 110, 0, 230); sh.addColorStop(0, 'rgba(255,214,170,0)'); sh.addColorStop(0.6, 'rgba(246,170,130,.45)'); sh.addColorStop(1, 'rgba(196,128,128,.6)');
      x.fillStyle = sh; x.fillRect(0, 0, 512, 256);
      x.globalCompositeOperation = 'destination-out';
      x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(0, 214, 512, 42);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const ctex = [cloudTex(11), cloudTex(29), cloudTex(53), cloudTex(97)];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rnd() * 0.2, dist = 400 + rnd() * 60, el = 45 + rnd() * 120;
      const w = 130 + rnd() * 150, h = w * 0.5;
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ctex[i % 4], transparent: true, depthWrite: false, fog: false }));
      cl.position.set(Math.sin(a) * dist, el, -Math.cos(a) * dist); cl.lookAt(0, el * 0.6, 0);
      const toSun = Math.max(0, cl.position.clone().normalize().dot(sunDir));
      cl.material.color.set('#E9EEF8').lerp(new THREE.Color('#FFE2C0'), Math.min(1, toSun * 1.3));
      g.add(cl);
    }
    // The pier deck: blacktop to the water's edge, with the next courts' yellow lines.
    const dc = document.createElement('canvas'); dc.width = 1024; dc.height = 1024;
    const dx = dc.getContext('2d');
    dx.fillStyle = '#3A3D41'; dx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) { dx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.06})`; dx.fillRect(rnd() * 1024, rnd() * 1024, 2, 2); }
    const S = 1024 / 90; // canvas px per metre; deck spans 90 m
    const P = (mx, mz) => [(mx + 45) * S, (mz + 45 - 23) * S]; // deck runs z −22 … 68
    dx.strokeStyle = '#E2C04E'; dx.lineWidth = 0.06 * S;
    const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace; dt.anisotropy = 8;
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.95 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, -0.012, 23); deck.receiveShadow = true; g.add(deck);
    // Courts either side: the same floor and hoop as the main court, on the same baseline, so every
    // line runs straight across. A 3 m gap between sidelines.
    const sideX = 500 * F + 3.0; // 15.24 m court width + a 3 m gap
    if (this.floor) {
      const u0 = -12, uw = 524, v0 = -10, vh = 480;
      const geo = new THREE.PlaneGeometry(uw * F, vh * F), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) { uv.setX(i, (u0 + 70) / 640 + uv.getX(i) * (uw / 640)); uv.setY(i, (1 - (v0 + vh + 110) / 640) + uv.getY(i) * (vh / 640)); }
      for (const sx of [-sideX, sideX]) { const m = new THREE.Mesh(geo, this.floor.material); m.rotation.x = -Math.PI / 2; m.position.set(sx, -0.002, (v0 + vh / 2 - 235) * F); m.receiveShadow = true; g.add(m); }
    }
    if (this.hoopGroup) for (const sx of [-sideX, sideX]) { const h = this.hoopGroup.clone(); h.position.x = sx; g.add(h); }
    // Concrete pier edge and a railing on the river sides (behind the basket and to the left).
    const conc = new THREE.MeshStandardMaterial({ color: '#B9B6AE', roughness: 0.9 });
    const rail = new THREE.MeshStandardMaterial({ color: '#8E969C', metalness: 0.7, roughness: 0.4 });
    const edge = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), conc); m.position.set(x, -0.8, z); g.add(m); };
    edge(0, -22, 90, 0.6); edge(-45, 23, 0.6, 90);
    for (const [ax, az, bx, bz] of [[-45, -22, 45, -22], [-45, -22, -45, 68]]) {
      const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), rail); top.rotation.set(Math.PI / 2, 0, 0); top.rotation.y = rot; top.position.set((ax + bx) / 2, 1.05, (az + bz) / 2);
      top.rotation.order = 'YXZ'; top.rotation.set(Math.PI / 2, rot, 0); g.add(top);
      for (let k = 0; k <= len; k += 2.5) { const t = k / len; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 6), rail); post.position.set(ax + (bx - ax) * t, 0.52, az + (bz - az) * t); g.add(post); }
    }
    // The East River: blue-grey with glints, out to the far shore.
    const wc = document.createElement('canvas'); wc.width = wc.height = 512;
    const wx = wc.getContext('2d'); wx.fillStyle = '#5A7FA6'; wx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const b = rnd(); wx.fillStyle = b < 0.5 ? `rgba(220,235,250,${rnd() * 0.22})` : `rgba(30,50,70,${rnd() * 0.25})`; wx.fillRect(rnd() * 512, rnd() * 512, 4 + rnd() * 14, 1); }
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace; wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(30, 30);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: '#4474A8', map: wt, roughness: 0.26, metalness: 0.7, envMap: env, envMapIntensity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -1.4; g.add(water);
    this.anim.push((d) => { wt.offset.x += d * 0.006; wt.offset.y += d * 0.0035; });
    // Glitter path from the sun across the river toward the pier.
    { const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
      for (let i = 0; i < 1600; i++) { const yy = Math.random() * 512, spread = 18 + (yy / 512) * 46, xx = 64 + (Math.random() - 0.5) * 2 * spread * Math.random();
        x.fillStyle = `rgba(255,${200 + Math.random() * 50},${140 + Math.random() * 60},${0.25 + Math.random() * 0.6})`; x.fillRect(xx, yy, 2 + Math.random() * 7, 1 + Math.random()); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const len = 330, gl = new THREE.Mesh(new THREE.PlaneGeometry(70, len), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.85 }));
      gl.rotation.x = -Math.PI / 2; gl.rotation.z = -Math.atan2(sunDir.x, -sunDir.z);
      const mid = 45 + len / 2; gl.position.set(sunDir.x / Math.hypot(sunDir.x, sunDir.z) * mid, -1.35, sunDir.z / Math.hypot(sunDir.x, sunDir.z) * mid); g.add(gl);
      t.wrapT = THREE.RepeatWrapping; this.anim.push((d, T) => { t.offset.y = (t.offset.y + d * 0.03) % 1; gl.material.opacity = 0.78 + Math.sin(T * 2.3) * 0.06 + Math.sin(T * 5.1) * 0.04; }); }
    // Boats on the river: a ferry crossing and two sailboats, bobbing as they go.
    { const boats = [];
      const hullM = new THREE.MeshStandardMaterial({ color: '#F3F1EC', roughness: 0.5 }), blue = new THREE.MeshStandardMaterial({ color: '#2F5D9C', roughness: 0.5 }), sailM = new THREE.MeshStandardMaterial({ color: '#FFF8EE', side: THREE.DoubleSide, roughness: 0.8 });
      const ferry = new THREE.Group(); const fh = new THREE.Mesh(new THREE.BoxGeometry(22, 2.4, 6), hullM); fh.position.y = 0.6; const fs = new THREE.Mesh(new THREE.BoxGeometry(22.1, 0.6, 6.1), blue); fs.position.y = 0.2;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 5), hullM); cabin.position.set(-1, 2.9, 0); const win = new THREE.Mesh(new THREE.BoxGeometry(14.05, 0.8, 5.05), new THREE.MeshStandardMaterial({ color: '#23344A', metalness: 0.6, roughness: 0.2, envMap: env })); win.position.set(-1, 3.1, 0);
      ferry.add(fh, fs, cabin, win); g.add(ferry); boats.push({ o: ferry, x: -260, z: -150, v: 6, w: 0.5, ph: 0 });
      for (const [x, z, v, sc] of [[-60, -95, 2.2, 1.2], [140, -210, -1.6, 1.6]]) { const b = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(6 * sc, 0.9 * sc, 2 * sc), hullM); h.position.y = 0.3;
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 8 * sc); sh.lineTo(3.8 * sc, 0); const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), sailM); sail.position.set(-1.6 * sc, 0.8, 0); b.add(h, sail); g.add(b); boats.push({ o: b, x, z, v, w: 1.1, ph: x }); }
      this.anim.push((d, T) => { for (const k of boats) { k.x += k.v * d; if (k.x > 320) k.x = -320; if (k.x < -320) k.x = 320; k.o.position.set(k.x, -1.35 + Math.sin(T * k.w + k.ph) * 0.12, k.z); k.o.rotation.set(Math.sin(T * k.w * 0.9 + k.ph) * 0.03, k.v < 0 ? Math.PI : 0, Math.sin(T * k.w * 1.3 + k.ph) * 0.04); } }); }
    // Brooklyn behind the camera and to the right: trees and low brick buildings on land.
    const land = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), new THREE.MeshStandardMaterial({ color: '#6C7F52', roughness: 1 }));
    land.rotation.x = -Math.PI / 2; land.position.set(250, -0.4, 180); g.add(land);
    const leaf = ['#4F7A3F', '#5D8A47', '#47703A'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
    for (let i = 0; i < 40; i++) { const x = 50 + rnd() * 120, z = -30 + rnd() * 140; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rnd() * 2.5, 1), leaf[i % 3]); b.position.set(x, 4 + rnd() * 2, z); g.add(b); }
    for (let i = 0; i < 40; i++) { const x = -40 + rnd() * 100, z = 55 + rnd() * 60; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rnd() * 2.5, 1), leaf[i % 3]); b.position.set(x, 4 + rnd() * 2, z); g.add(b); }
    // Window textures for the towers.
    const winTex = (base, lit, cols, rows, mullion) => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 256;
      const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 128, 256);
      const cw = 128 / cols, rh = 256 / rows;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { x.fillStyle = rnd() < 0.08 ? lit : mullion; x.fillRect(q * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.6); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    };
    const glassTex = (top, bottom) => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
      x.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 256; i += 6) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    };
    // Glass reflects the sky (env), tinted by its color; stone takes the warm sun.
    const mullion = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
      const vg = x.createLinearGradient(0, 0, 0, 256); vg.addColorStop(0, '#6F86A8'); vg.addColorStop(0.55, '#B8C6D8'); vg.addColorStop(1, '#FFFFFF');
      x.fillStyle = vg; x.fillRect(0, 0, 64, 256);
      for (let r = 0; r < 36; r++) for (let q = 0; q < 8; q++) { const v = Math.random(); x.fillStyle = v < 0.5 ? `rgba(20,30,50,${v * 0.25})` : `rgba(255,255,255,${(v - 0.5) * 0.3})`; x.fillRect(q * 8, r * 7, 8, 7); }
      x.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 1.5, 256);
      x.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 256; i += 7) x.fillRect(0, i, 64, 1.2);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; x.fillRect(Math.floor(Math.random() * 8) * 8 + 1.5, Math.floor(Math.random() * 36) * 7 + 1.2, 6.5, 5.8); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const glass = (color, rough = 0.1) => () => { const t = mullion.clone(); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ color, map: t, metalness: 0.92, roughness: rough, envMap: env, envMapIntensity: 1.35 }); };
    const mats = {
      stone: () => new THREE.MeshStandardMaterial({ map: winTex('#E2CDA8', '#FFE9BE', 6, 24, '#6B5A48'), roughness: 0.8 }),
      white: () => new THREE.MeshStandardMaterial({ map: winTex('#F1E9DC', '#FFFFFF', 8, 28, '#8A8F99'), roughness: 0.7, envMap: env, envMapIntensity: 0.6 }),
      dark: glass('#5E6E86', 0.14),
      blue: glass('#A9C4E6'),
      teal: glass('#9CCFC8'),
      gold: glass('#E8C489', 0.12),
      silver: glass('#E2E8F0', 0.06),
      brown: () => new THREE.MeshStandardMaterial({ map: winTex('#A4775A', '#FFDDA6', 6, 22, '#4A3628'), roughness: 0.85 }),
    };
    const kinds = Object.keys(mats);
    const sk = new THREE.Group();
    const tower = (x, z, w, d, h, kind, opts = {}) => {
      const m = mats[kind](); m.map.repeat.set(Math.max(1, Math.round(w / 10)), m.metalness > 0.5 ? 1 : Math.max(1, Math.round(h / 22)));
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, h / 2, z); sk.add(b);
      if (opts.steps) { let y = h, ww = w, dd = d; for (let i = 0; i < opts.steps; i++) { ww *= 0.78; dd *= 0.78; const sh = h * 0.07; const s2 = new THREE.Mesh(new THREE.BoxGeometry(ww, sh, dd), m); s2.position.set(x, y + sh / 2, z); sk.add(s2); y += sh; }
        if (opts.spire) { const sp = new THREE.Mesh(new THREE.ConeGeometry(ww * 0.45, opts.spire, 4), m); sp.position.set(x, y + opts.spire / 2, z); sp.rotation.y = Math.PI / 4; sk.add(sp); }
        if (opts.roof) { const rf = new THREE.Mesh(new THREE.ConeGeometry(ww * 0.62, opts.roof, 4), new THREE.MeshStandardMaterial({ color: opts.roofColor || '#3F5E58', roughness: 0.7 })); rf.position.set(x, y + opts.roof / 2, z); rf.rotation.y = Math.PI / 4; sk.add(rf); } }
      return b;
    };
    // Landmarks, left to right as seen from the court (Manhattan sits behind the basket, z −).
    const Z = -330;
    tower(-150, Z - 10, 26, 26, 128, 'white');                         // 8 Spruce-ish light tower far left
    { const ns = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 150, 10), mats.silver()); ns.position.set(-118, 75, Z - 30); sk.add(ns); } // the rippled steel tower
    tower(-92, Z + 20, 30, 24, 110, 'dark');                           // dark glass slab
    tower(-60, Z - 10, 18, 18, 120, 'stone', { steps: 4, spire: 34 }); // 70 Pine: Art Deco spire
    tower(-38, Z + 30, 34, 26, 78, 'white', { steps: 3 });             // pale stepped "wedding cake"
    tower(-22, Z - 20, 20, 20, 116, 'dark', { steps: 3, roof: 30, roofColor: '#4D6B60' }); // 40 Wall: dark with a green pyramid
    tower(2, Z + 15, 36, 30, 96, 'teal');                              // big teal glass box
    tower(-76, Z + 40, 30, 24, 64, 'gold');                            // gold glass by the water
    // One World Trade Center: tapered square tower with chamfered corners, then the spire.
    { const owm = mats.silver(); owm.color.set('#CFE0F2'); owm.roughness = 0.04;
      const ow = new THREE.Mesh(new THREE.CylinderGeometry(9, 22, 220, 4, 1), owm); ow.rotation.y = Math.PI / 4; ow.position.set(28, 110, Z - 40); sk.add(ow);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(11, 6, 11), owm); cap.position.set(28, 223, Z - 40); sk.add(cap);
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 70, 8), new THREE.MeshStandardMaterial({ color: '#D8DCE0', metalness: 0.7, roughness: 0.3 })); sp.position.set(28, 261, Z - 40); sk.add(sp); }
    tower(52, Z + 25, 28, 24, 70, 'dark');
    tower(80, Z, 26, 22, 104, 'gold');
    tower(108, Z + 10, 22, 22, 140, 'stone', { steps: 2 });
    tower(135, Z - 5, 30, 26, 88, 'teal');
    // Fill: a dense wall of shorter towers along the waterfront, and taller ones behind.
    for (let x = -210; x <= 210; x += 20 + rnd() * 18) { if (rnd() < 0.2) continue; tower(x, Z + 50 + rnd() * 18, 10 + rnd() * 10, 12, 20 + rnd() * 28, kinds[Math.floor(rnd() * kinds.length)]); }
    for (let x = -220; x <= 220; x += 28 + rnd() * 26) { if (rnd() < 0.3) continue; tower(x, Z - 80 - rnd() * 50, 14 + rnd() * 12, 14, 55 + rnd() * 60, kinds[Math.floor(rnd() * kinds.length)]); }
    // Manhattan's shoreline: a low pier strip at the water.
    const shore = new THREE.Mesh(new THREE.BoxGeometry(520, 3, 70), conc); shore.position.set(0, -0.5, Z + 40); sk.add(shore);
    // Scale the whole skyline down about its own front line, so it sits as a band under a big sky.
    const ks = 0.58; sk.scale.setScalar(ks); sk.position.set(0, 0, Z * (1 - ks));
    g.add(sk);
    // The Brooklyn Bridge upriver to the left: two stone towers with twin Gothic arches, cables and deck.
    { const br = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ color: '#B9A98E', roughness: 0.9 });
      const cable = new THREE.MeshStandardMaterial({ color: '#C9C2B3', roughness: 0.6 });
      const tw = (z) => { const t = new THREE.Group();
        for (const dx of [-7, 0, 7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(4, 64, 9), stone); p.position.set(dx, 32, z); t.add(p); }
        const cap = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 10), stone); cap.position.set(0, 59, z); t.add(cap);
        const shade = new THREE.MeshStandardMaterial({ color: '#5E5446', roughness: 1 });
        for (const dx of [-3.5, 3.5]) { const arch = new THREE.Mesh(new THREE.BoxGeometry(3, 20, 9.4), shade); arch.position.set(dx, 42, z); t.add(arch); const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 4), shade); top.position.set(dx, 54, z); top.rotation.y = Math.PI / 4; t.add(top); }
        return t; };
      const zA = -60, zB = 90, deckY = 26;
      br.add(tw(zA), tw(zB));
      const deckM = new THREE.Mesh(new THREE.BoxGeometry(20, 2.5, 420), new THREE.MeshStandardMaterial({ color: '#6E6A62', roughness: 0.8 })); deckM.position.set(0, deckY, 15); br.add(deckM);
      const cablePts = (x) => { const pts = []; const ends = [[-195, deckY + 2], [zA, 62], [zB, 62], [225, deckY + 2]];
        for (let k = 0; k < 3; k++) { const [z0, y0] = ends[k], [z1, y1] = ends[k + 1]; for (let i = 0; i <= 20; i++) { const t = i / 20, sag = k === 1 ? 26 : 14; pts.push(new THREE.Vector3(x, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, z0 + (z1 - z0) * t)); } }
        return pts; };
      for (const x of [-8, 8]) { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts(x)), 120, 0.5, 6), cable); br.add(c);
        const hang = []; for (const p of cablePts(x)) { if (p.y > deckY + 3) hang.push(p.x, p.y, p.z, p.x, deckY + 1, p.z); }
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hang, 3)); br.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: '#B8B1A2' }))); }
      br.position.set(-230, 0, -120); br.rotation.y = -0.35; g.add(br); }
    // Pier shed alongside on the right: white steel trusses under a pale blue roof, open sides.
    { const shed = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: '#E9ECEE', roughness: 0.55, metalness: 0.2 });
      const roofTop = new THREE.MeshStandardMaterial({ color: '#9CC4EA', roughness: 0.6 });
      const L = 80, Wd = 20, H = 9;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.5, L), [steel, steel, roofTop, steel, steel, steel]); roof.position.set(0, H + 1.6, 0); roof.rotation.z = -0.05; shed.add(roof);
      for (let z = -L / 2; z <= L / 2 + 0.01; z += 8) {
        for (const x of [-Wd / 2 + 0.6, Wd / 2 - 0.6]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.45, H + 1.4, 0.45), steel); c.position.set(x, (H + 1.4) / 2, z); c.castShadow = true; shed.add(c); }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.5, 0.4), steel); beam.position.set(0, H + 1.1, z); shed.add(beam);
        for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(Wd / 2, 2.2), 0.22, 0.22), steel); d.position.set(s * Wd / 4, H - 0.1, z); d.rotation.z = s * Math.atan2(2.2, Wd / 2); shed.add(d); }
      }
      for (const x of [-Wd / 2 + 0.6, Wd / 2 - 0.6]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, L), steel); ch.position.set(x, H + 1.0, 0); shed.add(ch); }
      shed.position.set(31, 0, 4); g.add(shed); }
    // Floodlight poles: tall galvanized masts with angled arms and two lamp heads.
    { const metal = new THREE.MeshStandardMaterial({ color: '#AEB5BB', metalness: 0.8, roughness: 0.35 }), lamp = new THREE.MeshStandardMaterial({ color: '#5A5F64', metalness: 0.5, roughness: 0.5 });
      const mast = (x, z, face) => { const m = new THREE.Group();
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 11, 10), metal); p.position.y = 5.5; p.castShadow = true; m.add(p);
        for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), metal); arm.position.set(s * 0.7, 10.8, 0); arm.rotation.z = s * -0.3; m.add(arm);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5), lamp); head.position.set(s * 1.4, 11.1, 0.2); head.rotation.x = 0.5; m.add(head); }
        m.position.set(x, 0, z); m.rotation.y = face; g.add(m); };
      for (const [x, z] of [[-9.9, -9.5], [-9.9, 9], [9.9, -9.5], [9.9, 9], [-26.6, -9.5], [-26.6, 9], [26.6, -9.5], [26.6, 9]]) mast(x, z, Math.atan2(-x, -z)); }
    // A few benches along the left side.
    { const wood = new THREE.MeshStandardMaterial({ color: '#8A7A66', roughness: 0.9 }), leg = new THREE.MeshStandardMaterial({ color: '#4A4F55', metalness: 0.6, roughness: 0.4 });
      for (const z of [-3, 3]) { const b = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.2), wood); seat.position.y = 0.45; b.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 2.2), wood); back.position.set(-0.24, 0.72, 0); b.add(back);
        for (const dz of [-0.9, 0.9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.06), leg); l.position.set(0, 0.22, dz); b.add(l); }
        b.position.set(-9.1, 0, z); b.castShadow = true; g.add(b); } }
    this.scene.add(g);
  }

  // Light studio: a soft wrap-around backdrop and a floor that runs to the horizon.
  buildStudio() {
    const g = (this.surround = new THREE.Group());
    const dome = new THREE.Mesh(new THREE.SphereGeometry(140, 40, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false }));
    const pa = dome.geometry.attributes.position, cols = [];
    const lo = new THREE.Color('#E6DFD3'), hi = new THREE.Color('#F7F4EE');
    for (let i = 0; i < pa.count; i++) { const y = Math.max(0, pa.getY(i) / 140); const c = lo.clone().lerp(hi, Math.min(1, y * 2.2)); cols.push(c.r, c.g, c.b); }
    dome.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.add(dome);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(138, 64), new THREE.MeshStandardMaterial({ color: '#DDD5C7', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.03; floor.receiveShadow = true; g.add(floor);
    this.scene.add(g);
  }

  // A school gym: block walls with a padded band, wooden bleachers with a few fans,
  // banners in the home team's color, a scoreboard and ceiling lights. Walls and ceiling
  // face inward only, so cameras outside them (top, baseline) still see in.
  buildGym(rnd, team) {
    const g = (this.surround = new THREE.Group());
    const accent = (team && team.paint) || '#2D4E9C';
    const X = 17, ZB = -14.5, ZF = 21, H = 9;
    const blockTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#E4DED2'; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(120,105,85,.18)'; x.lineWidth = 2;
      for (let r = 0; r < 8; r++) { const y = r * 32; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); for (let q = 0; q < 4; q++) { const xx = q * 64 + (r % 2) * 32; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 32); x.stroke(); } }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    })();
    const wall = (w, pos, rotY) => {
      const t = blockTex.clone(); t.needsUpdate = true; t.repeat.set(w / 3, H / 3);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
      m.position.set(pos[0], H / 2, pos[2]); m.rotation.y = rotY; g.add(m);
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.9), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.8 }));
      pad.position.set(pos[0], 0.95, pos[2]); pad.rotation.y = rotY; pad.translateZ(0.02); g.add(pad);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.12), new THREE.MeshStandardMaterial({ color: '#F2EEE6', roughness: 0.6 }));
      stripe.position.set(pos[0], 1.96, pos[2]); stripe.rotation.y = rotY; stripe.translateZ(0.025); g.add(stripe);
    };
    wall(2 * X, [0, 0, ZB], 0);
    wall(ZF - ZB, [-X, 0, (ZB + ZF) / 2], Math.PI / 2);
    wall(ZF - ZB, [X, 0, (ZB + ZF) / 2], -Math.PI / 2);
    wall(2 * X, [0, 0, ZF], Math.PI);
    // Wood floor beyond the court lines
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, ZF - ZB), new THREE.MeshStandardMaterial({ color: '#B88F5E', roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.015, (ZB + ZF) / 2); floor.receiveShadow = true; g.add(floor);
    // Ceiling, seen only from below, with rows of lights
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, ZF - ZB), new THREE.MeshStandardMaterial({ color: '#CFC8BC', roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (ZB + ZF) / 2); g.add(ceil);
    const lightMat = new THREE.MeshBasicMaterial({ color: '#FFF7E6' });
    for (let x = -10; x <= 10; x += 5) for (let z = -10; z <= 18; z += 7) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), lightMat);
      l.rotation.x = Math.PI / 2; l.position.set(x, H - 0.02, z); g.add(l);
    }
    // Bleachers along both sidelines
    const woodMat = new THREE.MeshStandardMaterial({ color: '#C79A62', roughness: 0.7 });
    const riserMat = new THREE.MeshStandardMaterial({ color: '#8C6A45', roughness: 0.8 });
    const crowd = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 32;
      const x = c.getContext('2d');
      // About 1 px per cm: people are ~45 cm wide on a 22 m bench.
      const shirts = [accent, '#1D1A17', '#F4F2EE', '#C9A15A', '#6E675D', '#B3202E', accent];
      const skins = ['#F1C9A5', '#E0AC80', '#C68B5E', '#8D5A3B', '#5B3A29'];
      for (let q = 0; q < 26; q++) {
        if (rnd() < 0.55) continue;
        const px = q * 20 + 2 + rnd() * 4;
        x.fillStyle = shirts[Math.floor(rnd() * shirts.length)];
        x.beginPath(); x.moveTo(px + 1, 32); x.lineTo(px + 2, 15); x.quadraticCurveTo(px + 8, 11, px + 14, 15); x.lineTo(px + 15, 32); x.closePath(); x.fill();
        x.fillStyle = skins[Math.floor(rnd() * skins.length)]; x.beginPath(); x.arc(px + 8, 8, 4.6, 0, Math.PI * 2); x.fill();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
    })();
    for (const side of [-1, 1]) {
      for (let r = 0; r < 6; r++) {
        const x0 = side * (11.2 + r * 0.75), y0 = 0.42 + r * 0.42;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 22), woodMat);
        seat.position.set(x0, y0, 1.5); seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
        const riser = new THREE.Mesh(new THREE.BoxGeometry(0.06, y0, 22), riserMat);
        riser.position.set(x0 + side * 0.33, y0 / 2, 1.5); g.add(riser);
        const t = crowd.clone(); t.needsUpdate = true; t.repeat.set(1.6 + r * 0.15, 1); t.offset.x = rnd();
        const fans = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.75), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
        fans.position.set(x0, y0 + 0.4, 1.5); fans.rotation.y = side * Math.PI / 2; g.add(fans);
      }
    }
    // Banners and a scoreboard on the far wall
    // Championship banners: a felt swallowtail with a trim stripe and the year, like a real gym wall.
    const banner = (title, year) => {
      const c = document.createElement('canvas'); c.width = 160; c.height = 300;
      const x = c.getContext('2d');
      const col = '#' + new THREE.Color(accent).getHexString();
      x.beginPath(); x.moveTo(8, 0); x.lineTo(152, 0); x.lineTo(152, 290); x.lineTo(80, 240); x.lineTo(8, 290); x.closePath();
      x.fillStyle = col; x.fill();
      x.strokeStyle = '#F4EFE6'; x.lineWidth = 7; x.beginPath(); x.moveTo(22, 14); x.lineTo(138, 14); x.lineTo(138, 262); x.lineTo(80, 222); x.lineTo(22, 262); x.closePath(); x.stroke();
      x.fillStyle = '#F4EFE6'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '800 22px Geist, Arial Black, sans-serif'; x.fillText(title, 80, 62);
      x.fillRect(42, 88, 76, 4);
      x.font = '800 50px Geist, Arial Black, sans-serif'; x.fillText(year, 80, 140);
      x.font = '700 15px Geist, Arial, sans-serif'; x.fillText('CHAMPIONS', 80, 186);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });
    };
    // Everything hung on the far wall fades out when the camera sits behind the basket (Baseline view),
    // so it never blocks the court.
    const hangG = new THREE.Group(); g.add(hangG);
    // Banners hang from a rod on two wires from the ceiling, a hand's width off the wall.
    const rodMat = new THREE.MeshStandardMaterial({ color: '#3A3A3C', metalness: 0.7, roughness: 0.4 });
    [[-12, 'CITY', "'09"], [-8.6, 'LEAGUE', "'14"], [8.6, 'STATE', "'19"], [12, 'CITY', "'24"]].forEach(([x, t, y]) => {
      const top = 7.3, zz = ZB + 0.3;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.8), banner(t, y));
      b.position.set(x, top - 1.4, zz); hangG.add(b);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), rodMat); rod.rotation.z = Math.PI / 2; rod.position.set(x, top + 0.02, zz); hangG.add(rod);
      for (const dx of [-0.7, 0.7]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, H - top, 4), rodMat); w.position.set(x + dx, top + (H - top) / 2, zz); hangG.add(w); }
    });
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 96;
    const sx = sc.getContext('2d');
    const drawGym = (o, d) => { sx.fillStyle = '#121316'; sx.fillRect(0, 0, 256, 96);
      sx.font = '800 44px Geist, Arial Black, sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
      sx.fillStyle = '#FF5A3C'; sx.fillText(String(o), 60, 52); sx.fillText(String(d), 196, 52);
      sx.fillStyle = '#FFD25A'; sx.font = '700 22px Geist, Arial, sans-serif'; sx.fillText('4TH', 128, 52); };
    drawGym(42, 38);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    this.boards.push({ base: [42, 38], draw: (o, d) => { drawGym(o, d); st.needsUpdate = true; } });
    // The scoreboard is a box bolted to the wall on two brackets, not a picture on it.
    const shell = new THREE.MeshStandardMaterial({ color: '#1A1B1F', metalness: 0.4, roughness: 0.5 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.95, 0.32), shell); box.position.set(0, 7.15, ZB + 0.42); box.castShadow = true; hangG.add(box);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ map: st })); board.position.set(0, 7.15, ZB + 0.585); hangG.add(board);
    for (const dx of [-1.6, 1.6]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3), shell); br.position.set(dx, 7.15, ZB + 0.15); hangG.add(br); }
    hangG.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; } });
    let hangF = 1;
    this.anim.push((d) => { const near = this.camera.position.z < ZB + 6; const want = near ? 0.05 : 1; if (Math.abs(hangF - want) < 0.01) return;
      hangF += (want - hangF) * Math.min(1, d * 8); hangG.traverse((o) => { if (o.material) { o.material.opacity = hangF; o.material.depthWrite = hangF > 0.9; } }); });
    // Clerestory windows high on both side walls: daylight without any extra lights.
    const winT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#CFE3F3'); gr.addColorStop(1, '#F4F7F2'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#5E5A54'; x.fillRect(0, 0, 64, 3); x.fillRect(0, 61, 64, 3); x.fillRect(0, 0, 3, 64); x.fillRect(61, 0, 3, 64); x.fillRect(31, 0, 2, 64); x.fillRect(0, 31, 64, 2);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const winMat = new THREE.MeshBasicMaterial({ map: winT, toneMapped: false });
    for (const side of [-1, 1]) for (let z = ZB + 3; z < ZF - 2; z += 4.2) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), winMat); w.position.set(side * (X - 0.03), 7.4, z); w.rotation.y = -side * Math.PI / 2; g.add(w);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 2.8), rodMat); sill.position.set(side * (X - 0.09), 6.56, z); g.add(sill);
    }
    this.scene.add(g);
  }

  // A beach court on Oahu at sunset: sand, ocean behind the basket, palms, a mountain on the horizon.
  buildBeach(rnd) {
    const g = (this.surround = new THREE.Group());
    // Sunset sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 40, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false }));
    const pa = sky.geometry.attributes.position, cols = [];
    const stops = [[0, '#FFE09A'], [0.03, '#FFC27A'], [0.08, '#FFA27E'], [0.15, '#F7A6A0'], [0.26, '#B9B6D8'], [0.42, '#86AEE0'], [0.7, '#5A93D8'], [1, '#3F7BCB']].map(([t, c]) => [t, new THREE.Color(c)]);
    for (let i = 0; i < pa.count; i++) {
      const y = Math.max(0, pa.getY(i) / 300);
      let c = stops[stops.length - 1][1].clone();
      for (let k = 0; k < stops.length - 1; k++) if (y <= stops[k + 1][0]) { c = stops[k][1].clone().lerp(stops[k + 1][1], (y - stops[k][0]) / (stops[k + 1][0] - stops[k][0])); break; }
      // Warmer toward the sun (behind the basket, -z).
      const toward = Math.max(0, -pa.getZ(i) / 300);
      const side = 1 - Math.min(1, Math.abs(pa.getX(i) / 300 + 0.12) * 1.6);
      c.lerp(new THREE.Color('#FFC266'), toward * side * Math.max(0, 0.4 - y) * 1.6);
      cols.push(c.r, c.g, c.b);
    }
    sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.add(sky);
    // Sun low on the horizon, with layered glow (additive, so it blooms over the sky).
    const SX = -30, SY = 6.5, SZ = -255;
    // Soft radial glows (a gradient texture, so there are no hard disc edges in the sky), drawn
    // over the sun disc so it stays the brightest thing in the frame.
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
    })();
    const sun = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshBasicMaterial({ color: '#FFF4D6', fog: false, toneMapped: false }));
    sun.position.set(SX, SY, SZ); g.add(sun);
    const glow = (r, color, opacity, sx = 1, sy = 1, dy = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set(SX, SY + dy, SZ + 2); m.scale.set(sx, sy, 1); g.add(m); return m;
    };
    glow(22, '#FFD890', 0.55);
    glow(55, '#FF9A55', 0.32);
    glow(150, '#FF7A50', 0.2, 1.7, 0.55, -4);
    // Streaky clouds, lit from below
    const cloudTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(120,70,140,0)'); gr.addColorStop(0.45, 'rgba(255,170,150,.9)'); gr.addColorStop(0.75, 'rgba(255,205,140,1)'); gr.addColorStop(1, 'rgba(255,205,140,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 64);
      const fade = x.createLinearGradient(0, 0, 256, 0);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.2, 'rgba(0,0,0,0)'); fade.addColorStop(0.8, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = fade; x.fillRect(0, 0, 256, 64);
      return new THREE.CanvasTexture(c);
    })();
    for (const [x, y, w, h, o] of [[-90, 30, 130, 7, 0.75], [10, 38, 160, 6, 0.6], [-20, 22, 90, 4, 0.8], [70, 27, 120, 5, 0.65], [-140, 44, 150, 8, 0.5], [120, 48, 180, 9, 0.45], [-50, 15, 70, 3, 0.85], [40, 17, 60, 2.5, 0.8]]) {
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: o, depthWrite: false, fog: false }));
      cl.position.set(x * 0.85, y * 0.85, -200); g.add(cl);
    }
    // Ocean
    const oc = document.createElement('canvas'); oc.width = 512; oc.height = 512;
    const ox = oc.getContext('2d');
    const og = ox.createLinearGradient(0, 0, 0, 512);
    og.addColorStop(0, '#E9A98A'); og.addColorStop(0.12, '#6E8FC0'); og.addColorStop(0.45, '#2F78B0'); og.addColorStop(0.8, '#1F9CB0'); og.addColorStop(1, '#35C2BC');
    ox.fillStyle = og; ox.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) { ox.fillStyle = `rgba(255,${170 + Math.random() * 60},${150 + Math.random() * 60},${Math.random() * 0.14})`; ox.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 16, 1); }
    const ot = new THREE.CanvasTexture(oc); ot.colorSpace = THREE.SRGBColorSpace;
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(700, 260), new THREE.MeshStandardMaterial({ map: ot, roughness: 0.2, metalness: 0.15 }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.06, -156); g.add(ocean);
    ot.wrapS = ot.wrapT = THREE.RepeatWrapping; ot.repeat.set(3, 1.2); this.anim.push((d) => { ot.offset.x += d * 0.004; ot.offset.y += d * 0.006; });
    // The sun's reflection: a shimmering path from the horizon to the shore.
    const rc = document.createElement('canvas'); rc.width = 128; rc.height = 512;
    const rx = rc.getContext('2d');
    for (let i = 0; i < 2200; i++) {
      const y = Math.random() * 512, t = y / 512;
      const spread = 10 + t * 60, xx = 64 + (Math.random() - 0.5) * spread * (Math.random() < 0.7 ? 0.6 : 1.4);
      rx.fillStyle = `rgba(255,${200 + Math.random() * 55},${150 + Math.random() * 70},${(1 - t * 0.6) * (0.25 + Math.random() * 0.6)})`;
      rx.fillRect(xx, y, 3 + Math.random() * 12 * (1 - t * 0.5), 1.3);
    }
    const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(46, 228), new THREE.MeshBasicMaterial({ map: rt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    refl.rotation.x = -Math.PI / 2;
    refl.position.set(SX * 0.55, -0.02, -140);
    refl.rotation.z = Math.atan2(SX * 0.45, 230);
    g.add(refl);
    rt.wrapT = THREE.RepeatWrapping; this.anim.push((d, T) => { rt.offset.y = (rt.offset.y + d * 0.04) % 1; refl.material.opacity = 0.85 + Math.sin(T * 3.1) * 0.08; });
    // Shoreline foam and wet sand
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(700, 1.2), new THREE.MeshBasicMaterial({ color: '#FFF4E6', transparent: true, opacity: 0.8 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, -0.03, -26.4); g.add(foam);
    // Waves wash up and slide back: the foam line and a thin sheet of water move together.
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(700, 2.4), new THREE.MeshBasicMaterial({ color: '#BFE9E4', transparent: true, opacity: 0.45, depthWrite: false })); wash.rotation.x = -Math.PI / 2; wash.position.set(0, -0.035, -25.6); g.add(wash);
    this.anim.push((d, T) => { const w = Math.sin(T * 0.9) * 0.5 + 0.5; foam.position.z = -26.4 + w * 1.6; wash.position.z = -25.6 + w * 1.2; foam.material.opacity = 0.55 + 0.35 * (1 - w); wash.material.opacity = 0.2 + 0.3 * w; });
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(700, 3), new THREE.MeshStandardMaterial({ color: '#B8946A', roughness: 0.6 }));
    wet.rotation.x = -Math.PI / 2; wet.position.set(0, -0.04, -24.6); g.add(wet);
    // Sand
    const sandTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#E9D2A6'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) { const v = rnd(); x.fillStyle = v < 0.33 ? 'rgba(255,248,230,.55)' : v < 0.66 ? 'rgba(176,140,96,.35)' : 'rgba(214,186,140,.5)'; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd(), 1 + rnd()); }
      x.strokeStyle = 'rgba(170,135,90,.18)'; x.lineWidth = 2; for (let r = 0; r < 9; r++) { x.beginPath(); const y0 = r * 30 + rnd() * 8; for (let q = 0; q <= 256; q += 8) x.lineTo(q, y0 + Math.sin(q / 26 + r) * 5); x.stroke(); }
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(150,115,75,.12)'; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 3 + rnd() * 4, 2 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 26); t.anisotropy = 8; return t; })();
    const sandBump = sandTex.clone(); sandBump.colorSpace = THREE.NoColorSpace; sandBump.needsUpdate = true;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 200), new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: sandTex, bumpMap: sandBump, bumpScale: 0.6, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.05, 76.9); sand.receiveShadow = true; g.add(sand);
    // A mountain on the horizon, Diamond Head style
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(48, 26, 7, 1), new THREE.MeshBasicMaterial({ color: '#7D7A8E', fog: false }));
    mtn.scale.set(1.5, 0.55, 0.8); mtn.position.set(-165, 5, -240); g.add(mtn);
    const mtn2 = new THREE.Mesh(new THREE.ConeGeometry(30, 16, 6, 1), new THREE.MeshBasicMaterial({ color: '#8E8AA0', fog: false }));
    mtn2.position.set(-112, 3, -228); mtn2.scale.set(1.6, 0.5, 0.8); g.add(mtn2);
    // Palm trees: a ringed, curving trunk and a crown of long drooping fronds, each tree two meshes.
    const mergeC = (parts) => { const pos = [], nor = [], col = [], uvs = [];
      for (const [geo, color, m] of parts) { const gg = geo.index ? geo.toNonIndexed() : geo.clone(); gg.applyMatrix4(m); gg.computeVertexNormals(); const pa2 = gg.attributes.position, na = gg.attributes.normal, ua = gg.attributes.uv;
        for (let q = 0; q < pa2.count; q++) { pos.push(pa2.getX(q), pa2.getY(q), pa2.getZ(q)); nor.push(na.getX(q), na.getY(q), na.getZ(q)); col.push(color.r, color.g, color.b); if (ua) uvs.push(ua.getX(q), ua.getY(q)); else uvs.push(0.02, 0.5); } }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); if (uvs.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return out; };
    const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    // a frond drawn as a rib with many thin leaflets, cut out with alpha so the crown looks feathery
    const frondTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.clearRect(0, 0, 512, 128);
      for (let i = 0; i < 46; i++) { const u = 12 + i * 10.6, len = 58 * Math.sin(Math.PI * Math.min(1, (u / 512) * 1.12)) * (1 - (u / 512) * 0.45) + 6;
        for (const sgn of [-1, 1]) { const gr = x.createLinearGradient(u, 64, u + 30, 64 + sgn * len); gr.addColorStop(0, '#4F8F3E'); gr.addColorStop(1, '#8DC25C'); x.fillStyle = gr;
          x.beginPath(); x.moveTo(u - 2, 64); x.quadraticCurveTo(u + 10, 64 + sgn * len * 0.6, u + 24, 64 + sgn * len); x.quadraticCurveTo(u + 12, 64 + sgn * len * 0.5, u + 5, 64); x.closePath(); x.fill(); } }
      x.strokeStyle = '#6E8A3A'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 64); x.lineTo(512, 64); x.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
    const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, vertexColors: true, alphaTest: 0.45, roughness: 0.8, side: THREE.DoubleSide });
    // one frond: a long leaf that tapers and droops, with a ridge down the middle
    const frondGeo = (droop) => { const geo = new THREE.PlaneGeometry(4.2, 1.6, 14, 2), fp = geo.attributes.position;
      for (let q = 0; q < fp.count; q++) { const u = (fp.getX(q) + 2.1) / 4.2, w = fp.getY(q); fp.setXYZ(q, u * 4.2, -u * u * droop - Math.abs(w) * 0.35 * u, w * (0.25 + 0.75 * Math.min(1, u * 3))); }
      geo.computeVertexNormals(); return geo; };
    const frondLow = frondGeo(2.4), frondHigh = frondGeo(0.9);
    const greensP = ['#FFFFFF', '#E6F2DA', '#D4E8C4', '#F2FAEA'].map((c) => new THREE.Color(c));
    const palm = (x, z, h, lean) => {
      const tparts = [], segs = 9; let px = 0, py = 0;
      for (let k = 0; k < segs; k++) { const t = k / segs; const nx = Math.sin((k + 1) / segs * 1.4) * lean, ny = (h / segs) * (k + 1);
        const a = new THREE.Vector3(px, py, 0), b = new THREE.Vector3(nx, ny, 0), len = a.distanceTo(b);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
        tparts.push([new THREE.CylinderGeometry(0.15 - t * 0.04, 0.2 - t * 0.04, len, 8), new THREE.Color(k % 2 ? '#8A6A4C' : '#9C7B5A'), m]);
        tparts.push([new THREE.TorusGeometry(0.19 - t * 0.04, 0.025, 4, 10), new THREE.Color('#6E5440'), new THREE.Matrix4().compose(b, q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), new THREE.Vector3(1, 1, 1))]);
        px = nx; py = ny; }
      const tm = new THREE.Mesh(mergeC(tparts), trunkMat); tm.castShadow = true;
      const fparts = [];
      // two tiers: long drooping fronds round the outside, shorter ones reaching up from the middle
      for (const [geo, n, tilt, sz] of [[frondLow, 12, 0.15, 1.0], [frondHigh, 7, 0.75, 0.75]]) for (let k = 0; k < n; k++) { const ang = (k / n) * Math.PI * 2 + rnd() * 0.35 + (tilt > 0.5 ? 0.25 : 0), up = tilt + (rnd() - 0.5) * 0.3, sc = sz * (0.85 + rnd() * 0.3);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(px, py, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, up, 'YXZ')), new THREE.Vector3(sc, sc, sc));
        fparts.push([geo, greensP[k % greensP.length], m]); }
      for (let k = 0; k < 4; k++) fparts.push([new THREE.SphereGeometry(0.2, 8, 6), new THREE.Color('#6B5233'), new THREE.Matrix4().makeTranslation(px + Math.cos(k * 1.6) * 0.22, py - 0.25, Math.sin(k * 1.6) * 0.22)]);
      const fm = new THREE.Mesh(mergeC(fparts), frondMat); fm.castShadow = true;
      const tree = new THREE.Group(); tree.add(tm, fm); tree.position.set(x, 0, z); tree.rotation.y = rnd() * Math.PI * 2; g.add(tree);
    };
    const palmBase = palm;
    const palmGroup = (x, z, h, lean) => { palmBase(x, z, h, lean); if (rnd() < 0.6) palmBase(x + 1.6 + rnd(), z + (rnd() - 0.5) * 2, h * (0.65 + rnd() * 0.2), lean * -0.8); };
    for (const [x, z, h, l] of [[-13, -12, 7.5, 1.6], [-16, -4, 8.5, 2.2], [14, -13, 8, -1.8], [17, 0, 7, -1.2], [-22, 8, 9, 2.4], [22, 9, 8.5, -2], [-30, -18, 10, 1.4], [32, -20, 9.5, -1.6]]) palm(x, z, h, l);
    // The land side, behind the half-court line: a lifeguard tower, umbrellas, more palms,
    // green hills and hotels, so the beach wraps all the way around.
    const tower = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: '#F2EEE6', roughness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: '#C8433A', roughness: 0.7 });
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), white); leg.position.set(dx, 1.2, dz); tower.add(leg); }
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), white); hut.position.y = 3.1; tower.add(hut);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 4), red); roof.position.y = 4.2; roof.rotation.y = Math.PI / 4; tower.add(roof);
    tower.position.set(15, 0, 20); tower.rotation.y = -0.4; tower.traverse((o) => { o.castShadow = true; }); g.add(tower);
    const umbrella = (x, z, color) => {
      const u = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), white); pole.position.y = 1.1; u.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); top.position.y = 2.3; u.add(top);
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshStandardMaterial({ color, roughness: 0.9 })); towel.rotation.x = -Math.PI / 2; towel.position.set(0.9, 0.02, 0.4); u.add(towel);
      u.position.set(x, 0, z); u.traverse((o) => { o.castShadow = true; }); g.add(u);
    };
    for (const [x, z, c] of [[-14, 14, '#E0552E'], [-18, 22, '#2B8A9E'], [-9, 26, '#F2B705'], [8, 28, '#D9507A'], [20, 12, '#2B8A9E'], [-22, 6, '#F2B705']]) umbrella(x, z, c);
    for (const [x, z, h, l] of [[-6, 34, 8, 1.2], [5, 36, 9, -1.4], [-26, 30, 10, 2], [26, 32, 9.5, -2.2], [0, 46, 11, 1.1]]) palmGroup(x, z, h, l);
    const hillMat = new THREE.MeshStandardMaterial({ color: '#5E9150', roughness: 1, flatShading: true });
    for (const [x, z, r, h] of [[-60, 140, 40, 28], [10, 160, 55, 38], [80, 150, 45, 30], [-120, 170, 50, 34], [140, 175, 50, 26]]) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8, 1), hillMat); hill.position.set(x, h / 2 - 2, z); hill.scale.z = 0.7; g.add(hill);
    }
    const pastel = ['#F4E6D2', '#F6D2C4', '#CFE7E2', '#F2E2B8', '#E9D8EC'];
    const balcT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(40,70,90,.55)'; x.fillRect(6, 6, 52, 30); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 40, 64, 3); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 44, 64, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
    for (const [x, w, h] of [[-70, 18, 26], [-45, 14, 18], [45, 16, 30], [70, 20, 22], [100, 14, 16], [-100, 16, 20], [15, 22, 34], [-15, 12, 14]]) {
      const tt = balcT.clone(); tt.needsUpdate = true; tt.repeat.set(Math.round(w / 3), Math.round(h / 3));
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), new THREE.MeshStandardMaterial({ color: pastel[Math.floor(rnd() * pastel.length)], map: tt, roughness: 0.8 })); b.position.set(x, h / 2, 95 + (x === 15 || x === -15 ? 15 : 0)); g.add(b);
    }
    const postMat0 = new THREE.MeshStandardMaterial({ color: '#8C6A48', roughness: 0.9 });
    // More palms, so the beach is full the whole way round.
    for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2 + rnd() * 0.2, r = 40 + rnd() * 25, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9; if (z < -22) continue; palmGroup(x, z, 8 + rnd() * 4, (rnd() - 0.5) * 4); }
    // Loungers under the umbrellas, surfboards in the sand, a volleyball net.
    const lounger = (x, z, ry, color) => { const l = new THREE.Group(); const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.9), white); frame.position.y = 0.35; const pad = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 1.3), new THREE.MeshStandardMaterial({ color, roughness: 0.8 })); pad.position.set(0, 0.42, 0.25);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.7), new THREE.MeshStandardMaterial({ color, roughness: 0.8 })); back.position.set(0, 0.62, -0.62); back.rotation.x = -0.7; l.add(frame, pad, back); l.position.set(x, 0, z); l.rotation.y = ry; g.add(l); };
    for (const [x, z, c] of [[-13, 15.5, '#F2EEE6'], [-17, 23.5, '#2B8A9E'], [-8, 27.5, '#F2B705'], [9, 29.5, '#D9507A'], [21, 13.5, '#F2EEE6'], [-25, 15, '#E0552E'], [12, 22, '#2B8A9E'], [-3, 30, '#F2EEE6']]) lounger(x, z, Math.PI + (rnd() - 0.5) * 0.4, c);
    for (const [x, z, c] of [[-28, 16, '#F2B705'], [27, 22, '#E0552E'], [-6, 22, '#2B8A9E'], [30, 4, '#D9507A']]) umbrella(x, z, c);
    const boardCols = ['#F2B705', '#2B8A9E', '#E0552E', '#F2EEE6', '#D9507A'];
    boardCols.forEach((c, k) => { const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.9, 4, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); sb.scale.set(1, 1, 0.22); sb.position.set(24 + k * 0.75, 1.15, 17); sb.rotation.z = (rnd() - 0.5) * 0.25; sb.castShadow = true; g.add(sb); });
    { const netPole = (x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), white); p.position.set(x, 1.25, 30); g.add(p); }; netPole(-25); netPole(-17);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.9), new THREE.MeshStandardMaterial({ color: '#F2EEE6', transparent: true, opacity: 0.55, side: THREE.DoubleSide })); net.position.set(-21, 2, 30); g.add(net); }
    // Sailboats and an outrigger canoe out on the water.
    const sailM = new THREE.MeshBasicMaterial({ color: '#FFF7EC', side: THREE.DoubleSide, fog: false });
    const sails = [];
    for (const [x, z, s2, v] of [[60, -110, 1, 1.4], [-95, -160, 1.4, -0.9], [25, -190, 1.2, 0.7], [130, -150, 0.9, -1.2], [-40, -130, 1.1, 1.0]]) { const b = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(5 * s2, 0.8 * s2, 1.6 * s2), new THREE.MeshStandardMaterial({ color: '#F2EEE6' })); hull.position.y = 0.3;
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 7 * s2); sh.lineTo(3.4 * s2, 0); const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), sailM); sail.position.set(-1.2 * s2, 0.7, 0); b.add(hull, sail); g.add(b); sails.push({ o: b, x, z, v, ph: x * 0.1 }); }
    this.anim.push((d, T) => { for (const k of sails) { k.x += k.v * d; if (k.x > 220) k.x = -220; if (k.x < -220) k.x = 220; k.o.position.set(k.x, Math.sin(T * 1.2 + k.ph) * 0.15, k.z); k.o.rotation.set(Math.sin(T * 1.1 + k.ph) * 0.05, k.v < 0 ? Math.PI : 0, Math.sin(T * 0.8 + k.ph) * 0.06); } });
    { const canoe = new THREE.Group(); const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 6, 4, 10), new THREE.MeshStandardMaterial({ color: '#B3462E', roughness: 0.6 })); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.8); hull.position.y = 0.3;
      const ama = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 3.5, 4, 8), white); ama.rotation.z = Math.PI / 2; ama.position.set(0, 0.2, 1.8); for (const dx of [-1, 1]) { const iako = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), postMat0); iako.rotation.x = Math.PI / 2; iako.position.set(dx, 0.5, 0.9); canoe.add(iako); }
      canoe.add(hull, ama); canoe.position.set(-24, 0, -18); canoe.rotation.y = 0.5; canoe.traverse((o) => { o.castShadow = true; }); g.add(canoe); }
    // Low wooden fence posts along the sand
    const postMat = new THREE.MeshStandardMaterial({ color: '#8C6A48', roughness: 0.9 });
    for (let x = -10; x <= 10; x += 2.5) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), postMat); p.position.set(x, 0.55, -12.2); p.castShadow = true; g.add(p); }
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 20, 5), postMat);
    rope.rotation.z = Math.PI / 2; rope.position.set(0, 0.95, -12.2); g.add(rope);
    this.scene.add(g);
  }

  // A big New York arena in the style of the Garden: a two-tier bowl of fans, the round
  // spoked ceiling, and a center-hung scoreboard over center court. No names or logos.
  buildGarden(rnd, plain = false, team = null) {
    // The dark arena takes the court's paint (the home team's colors when there is one), so the bowl matches the floor.
    const tc = plain && team && team.paint ? new THREE.Color(team.paint) : null;
    const hex = (c, k) => '#' + c.clone().multiplyScalar(k).getHexString();
    const g = (this.surround = new THREE.Group());
    const cz = W(250, 470).z; // center court
    const crowdTex = () => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#121318'; x.fillRect(0, 0, 1024, 256);
      const shirts = ['#B8642A', '#1F5590', '#CFC9BE', '#26262B', '#6E675D', '#35577F', '#A39C91', '#6E2B2B', '#2F2F36'];
      const skins = ['#D9B48F', '#B98257', '#80543A', '#53372A', '#C99A70'];
      for (let r = 0; r < 16; r++) {
        x.fillStyle = '#1B1C22'; x.fillRect(0, r * 16 + 12, 1024, 4);
        for (let q = 0; q < 170; q++) {
          if (rnd() < 0.22) continue;
          const px = q * 6 + rnd() * 1.5, py = r * 16 + 3 + rnd() * 1.5;
          x.fillStyle = shirts[Math.floor(rnd() * shirts.length)];
          x.fillRect(px, py + 3, 4, 6);
          x.fillStyle = skins[Math.floor(rnd() * skins.length)];
          x.beginPath(); x.arc(px + 2, py + 1.5, 1.6, 0, Math.PI * 2); x.fill();
        }
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      return t;
    };
    // Seating bowls: stepped lathe profiles, stretched into an oval around the full court.
    void crowdTex;
    const seatColor = tc ? hex(tc, 0.5) : plain ? '#2A2D33' : '#1F2C52';
    const seatMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(seatColor).multiplyScalar(0.8), roughness: 0.85, side: THREE.DoubleSide });
    const bowls = [];
    const bowl = (r0, y0, rows, rise, run) => {
      const pts = [];
      for (let i = 0; i <= rows; i++) { pts.push(new THREE.Vector2(r0 + i * run, y0 + i * rise)); pts.push(new THREE.Vector2(r0 + (i + 1) * run - 0.01, y0 + i * rise)); pts.push(new THREE.Vector2(r0 + (i + 1) * run, y0 + (i + 1) * rise)); }
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), seatMat);
      m.scale.set(1, 1, 1.55); m.position.set(0, 0, cz); m.receiveShadow = true;
      g.add(m); bowls.push({ r0, y0, rows, rise, run });
    };
    bowl(12.5, 0.4, 22, 0.42, 0.78);
    bowl(31.5, 15.5, 20, 0.62, 0.8);
    // The crowd: thousands of fans as two instanced meshes (bodies and heads), so it's two draw calls.
    {
      const spots = [];
      for (const [bi, b] of bowls.entries()) {
        const gap = bi ? 0.95 : 0.72, skip = bi ? 0.24 : 0.12;
        for (let i = 0; i < b.rows; i++) {
          const r = b.r0 + i * b.run + b.run * 0.45, y = b.y0 + i * b.rise;
          const per = Math.PI * (3 * (r + 1.55 * r) - Math.sqrt((3 * r + 1.55 * r) * (r + 3 * 1.55 * r)));
          const n = Math.floor(per / gap);
          for (let k = 0; k < n; k++) { if (rnd() < skip) continue; const a = (k + rnd() * 0.3) / n * Math.PI * 2; spots.push([Math.sin(a) * r, y, cz + Math.cos(a) * r * 1.55, 1]); }
        }
      }
      // Courtside: two rows along the far sideline, photographers kneeling under the basket.
      for (const xr of [9.4, 10.3]) for (let z = cz - 13; z <= cz + 13; z += 0.7) if (Math.abs(z - cz) > 1.2) spots.push([xr, xr > 10 ? 0.25 : 0, z, 1]);
      for (const x of [-5.6, -4.6, -3.6, 3.6, 4.6, 5.6]) spots.push([x, -0.4, W(250, -40).z, 0.72]);
      const shirts = tc ? ['#' + tc.getHexString(), '#' + tc.getHexString(), team.jersey || '#E8E4DC', '#1A1A1E', '#E8E4DC', '#2B2B30', '#C9C2B6', '#55555C'] : plain ? ['#1A1A1E', '#E8E4DC', '#2B2B30', '#C9C2B6', '#3B3B42', '#55555C', '#8A8F98', '#E0552E'] : ['#0B5CAD', '#F58426', '#E8E4DC', '#1A1A1E', '#0B3F7A', '#C9C2B6', '#2B2B30', '#4A5568', '#0B5CAD', '#6B6258'];
      const skins = ['#E3BC97', '#C68E62', '#8D5A3B', '#5A3A2A', '#D2A27A'];
      const bodyGeo = new THREE.BoxGeometry(0.44, 0.62, 0.32), headGeo = new THREE.BoxGeometry(0.22, 0.25, 0.22);
      const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: '#9A9AA0', roughness: 0.9 }), spots.length);
      const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#A8A6A2', roughness: 0.8 }), spots.length);
      const o = new THREE.Object3D(), col = new THREE.Color();
      spots.forEach(([x, y, z, sc], i) => {
        const lean = (rnd() - 0.5) * 0.25;
        o.position.set(x, y + 0.72 * sc, z); o.lookAt(0, y + 0.72 * sc, cz); o.rotateZ(lean); o.scale.setScalar(sc * (0.9 + rnd() * 0.2)); o.updateMatrix();
        bodies.setMatrixAt(i, o.matrix); bodies.setColorAt(i, col.set(shirts[Math.floor(rnd() * shirts.length)]));
        o.position.set(x, y + 1.17 * sc, z); o.updateMatrix(); heads.setMatrixAt(i, o.matrix); heads.setColorAt(i, col.set(skins[Math.floor(rnd() * skins.length)]));
      });
      bodies.frustumCulled = heads.frustumCulled = false;
      g.add(bodies, heads);
    }
    // LED ribbon boards: one along the front of the lower bowl, one on the fascia between the bowls.
    const ribbonTex = (bg, fg) => {
      const c = document.createElement('canvas'); c.width = 2048; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, 2048, 64);
      x.font = '800 40px Geist, Arial Black, sans-serif'; x.textBaseline = 'middle'; x.fillStyle = fg;
      for (let i = 0; i < 6; i++) { x.fillText('CUTLINE', 60 + i * 340, 34); x.fillStyle = i % 2 ? fg : '#FFFFFF'; }
      x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 2048; i += 4) x.fillRect(i, 0, 1, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); return t;
    };
    const ribT = ribbonTex(tc ? hex(tc, 0.42) : plain ? '#17191E' : '#0B4C99', tc ? (team.jersey && team.jersey.toUpperCase() !== '#1D1A17' ? team.jersey : '#FFFFFF') : plain ? '#E9E6DF' : '#F58426');
    // Rings are seen from inside, so their text runs the other way round; flat boards read normally.
    ribT.repeat.set(-5, 1);
    const rib = new THREE.MeshBasicMaterial({ map: ribT, side: THREE.DoubleSide, fog: false });
    const flatT = ribT.clone(); flatT.repeat.set(1.4, 1); flatT.needsUpdate = true;
    const ribFlat = new THREE.MeshBasicMaterial({ map: flatT, fog: false });
    const lowRib = new THREE.Mesh(new THREE.CylinderGeometry(12.45, 12.45, 0.85, 128, 1, true), rib);
    lowRib.scale.set(1, 1, 1.55); lowRib.position.set(0, 0.45, cz); g.add(lowRib);
    // Fascia ring between the bowls
    const fascia = new THREE.Mesh(new THREE.CylinderGeometry(31.3, 31.3, 1.6, 128, 1, true), rib);
    fascia.scale.set(1, 1, 1.55); fascia.position.set(0, 14.6, cz); g.add(fascia);
    // Courtside floor and the dark arena surround
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), new THREE.MeshStandardMaterial({ color: '#15161B', roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.02, cz); floor.receiveShadow = true; g.add(floor);
    // The other half of the court, turned round about center court, and its basket.
    if (this.floor) {
      const vSpan = 580, geo = new THREE.PlaneGeometry(640 * F, vSpan * F), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (vSpan / 640) + uv.getY(i) * (vSpan / 640));
      const far = new THREE.Mesh(geo, this.floor.material);
      far.rotation.set(-Math.PI / 2, 0, Math.PI);
      // Sits 1 cm above the near half's apron, so the far half shows right from the half-court line.
      far.position.set(0, 0.01, 2 * cz - (180 - 235) * F); far.receiveShadow = true; g.add(far);
    }
    if (this.hoopGroup) { const h2 = this.hoopGroup.clone(); h2.rotation.y = Math.PI; h2.position.set(0, 0, 2 * cz); g.add(h2); }
    // Scorer's table with an LED front, and the team benches either side, along the near sideline.
    { const dark = new THREE.MeshStandardMaterial({ color: '#16171C', roughness: 0.6 });
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 9), dark); table.position.set(-9.4, 0.4, cz); g.add(table);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.7), ribFlat); front.position.set(-8.89, 0.42, cz); front.rotation.y = Math.PI / 2; g.add(front);
      const chair = new THREE.BoxGeometry(0.5, 0.9, 0.5), chairM = new THREE.MeshStandardMaterial({ color: tc ? hex(tc, 0.8) : plain ? '#23262C' : '#0B4C99', roughness: 0.7 });
      for (let z = cz - 13; z <= cz + 13; z += 0.75) { if (Math.abs(z - cz) < 5.2) continue; const c = new THREE.Mesh(chair, chairM); c.position.set(-9.6, 0.45, z); g.add(c); } }
    // The round ceiling: concentric rings and radial spokes.
    const cc = document.createElement('canvas'); cc.width = cc.height = 1024;
    const cx = cc.getContext('2d');
    const grd = cx.createRadialGradient(512, 512, 40, 512, 512, 512);
    grd.addColorStop(0, '#3A4458'); grd.addColorStop(1, '#151820');
    cx.fillStyle = grd; cx.fillRect(0, 0, 1024, 1024);
    cx.strokeStyle = 'rgba(205,215,235,.55)'; cx.lineWidth = 3;
    if (plain) {
      // A plain arena roof: a truss grid instead of the Garden's spokes.
      cx.strokeStyle = 'rgba(160,165,180,.35)'; cx.lineWidth = 4;
      for (let k = 0; k <= 1024; k += 85) { cx.beginPath(); cx.moveTo(k, 0); cx.lineTo(k, 1024); cx.stroke(); cx.beginPath(); cx.moveTo(0, k); cx.lineTo(1024, k); cx.stroke(); }
    } else {
      for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; cx.beginPath(); cx.moveTo(512 + Math.cos(a) * 70, 512 + Math.sin(a) * 70); cx.lineTo(512 + Math.cos(a) * 510, 512 + Math.sin(a) * 510); cx.stroke(); }
      for (const r of [70, 180, 300, 420, 505]) { cx.beginPath(); cx.arc(512, 512, r, 0, Math.PI * 2); cx.stroke(); }
    }
    for (let k = 0; k < 140; k++) { const a = rnd() * Math.PI * 2, r = 120 + rnd() * 380; cx.fillStyle = 'rgba(255,244,214,.9)'; cx.beginPath(); cx.arc(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 3, 0, Math.PI * 2); cx.fill(); }
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace;
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(50, 96), new THREE.MeshBasicMaterial({ map: ct, side: THREE.DoubleSide, fog: false }));
    ceil.rotation.x = Math.PI / 2; ceil.scale.set(1, 1.3, 1); ceil.position.set(0, 34, cz); g.add(ceil);
    // Center-hung scoreboard
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256;
    const sx = sc.getContext('2d');
    const drawBig = (o, d) => { sx.fillStyle = '#05070B'; sx.fillRect(0, 0, 512, 256);
      sx.fillStyle = plain ? '#E0552E' : '#F58426'; sx.fillRect(0, 0, 512, 10); sx.fillRect(0, 246, 512, 10);
      sx.font = '800 96px Geist, Arial Black, sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
      sx.fillStyle = '#FFFFFF'; sx.fillText('HOME', 128, 62); sx.fillText('AWAY', 384, 62);
      sx.fillStyle = '#FFD25A'; sx.font = '800 104px Geist, Arial Black, sans-serif'; sx.fillText(String(o), 128, 158); sx.fillText(String(d), 384, 158);
      sx.fillStyle = '#FFFFFF'; sx.font = '700 34px Geist, Arial, sans-serif'; sx.fillText('Q4  2:41', 256, 226); };
    drawBig(88, 86);
    const stx = new THREE.CanvasTexture(sc); stx.colorSpace = THREE.SRGBColorSpace;
    this.boards.push({ base: [88, 86], draw: (o, d) => { drawBig(o, d); stx.needsUpdate = true; } });
    const screen = new THREE.MeshBasicMaterial({ map: stx, fog: false });
    const shell = new THREE.MeshStandardMaterial({ color: '#111216', metalness: 0.6, roughness: 0.4 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(10, 5.4, 7), [screen, screen, shell, shell, screen, screen]);
    board.position.set(0, 15.5, cz); g.add(board);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.0, 64, 1, true), rib);
    ring.position.set(0, 12.3, cz); g.add(ring);
    for (const x of [-3.5, 3.5]) { const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 16, 6), shell); wire.position.set(x, 26, cz); g.add(wire); }
    // Light banks hung around the scoreboard, aimed at the floor.
    { const lamp = new THREE.MeshBasicMaterial({ color: '#FFF6E2', fog: false }), housing = new THREE.MeshStandardMaterial({ color: '#202228', roughness: 0.6 });
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, r = 15;
        const h = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), housing); h.position.set(Math.sin(a) * r, 27, cz + Math.cos(a) * r * 1.3); h.lookAt(0, 0, cz); g.add(h);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), lamp); l.position.copy(h.position); l.position.y -= 0.21; l.rotation.x = Math.PI / 2; g.add(l); }
      // ...hung from a truss ring, itself on cables to the roof, so nothing floats.
      const truss = new THREE.Mesh(new THREE.TorusGeometry(15, 0.18, 6, 64), housing); truss.rotation.x = Math.PI / 2; truss.scale.set(1, 1.3, 1); truss.position.set(0, 27.35, cz); g.add(truss);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 7, 4), housing); cb.position.set(Math.sin(a) * 15, 30.9, cz + Math.cos(a) * 15 * 1.3); g.add(cb); } }
    this.scene.add(g);
  }

  // Net swish: stretches and sways when the ball drops through, then settles.
  animateNet(dt) {
    const b = this.ball.position;
    const inNet = Math.hypot(b.x - RIM.x, b.z - RIM.z) < 0.2 && b.y < RIM_Y && b.y > RIM_Y - 0.5;
    if (inNet) this.netKick = 1;
    // Scoreboards: a make adds 2, or 3 when the ball left the shooter's hands beyond the arc.
    if (b.y < 2.4 && Math.hypot(b.x - RIM.x, b.z - RIM.z) > 0.6) this.lastLow = [b.x, b.z];
    if (inNet && !this.wasInNet && this.boards && this.boards.length) {
      const L = this.lastLow, far = L ? Math.hypot(L[0] - RIM.x, L[1] - RIM.z) : 0;
      this.scored += far > 6.6 ? 3 : 2;
      for (const bd of this.boards) bd.draw(bd.base[0] + this.scored, bd.base[1]);
    }
    this.wasInNet = inNet;
    this.netKick = Math.max(0, this.netKick - dt * 1.6);
    this.netTime = (this.netTime || 0) + dt;
    const w = this.netKick;
    const wob = Math.sin(this.netTime * 18) * w;
    this.net.scale.set(1 - 0.12 * w, 1 + 0.22 * w, 1 - 0.12 * w);
    this.net.rotation.x = wob * 0.08;
    this.net.rotation.z = Math.cos(this.netTime * 15) * w * 0.06;
  }

  setKits(kits) {
    const key = JSON.stringify([kits.O, kits.D]);
    if (key === this.kitsKey) return;
    this.kitsKey = key;
    this.kits = kits;
    for (const p of this.people.values()) p.setKit({ ...kits[p.side] });
  }

  setCourt(look) {
    const key = JSON.stringify(look);
    if (key === this.courtKey) return;
    this.courtKey = key;
    const { tex, w, h, cx, cz } = courtTexture(look);
    if (this.floor) { this.floor.material.map.dispose(); this.floor.material.map = tex; this.floor.material.needsUpdate = true; } else {
      this.floor = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.position.set(cx, 0, cz);
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);
    }
    this.floor.material.roughness = look.floor === 'blacktop' ? 0.95 : 0.55;
    const pier = look.scene === 'pier';
    const park = look.scene === 'park', garden = look.scene === 'garden', beach = look.scene === 'beach';
    const bg = look.scene === 'arena' || garden ? '#0D0E12' : pier ? '#F2C691' : park ? '#BFD6EA' : beach ? '#E58A6E' : look.scene === 'gym' ? '#D6CFC2' : '#E9E3D9';
    this.scene.background.set(bg);
    this.scene.fog.color.set(pier ? '#E9C7A6' : park ? '#C9D8E4' : beach ? '#F0A07E' : bg);
    this.scene.fog.near = pier ? 120 : park ? 90 : garden ? 60 : beach ? 70 : 30;
    this.scene.fog.far = pier ? 820 : park ? 380 : garden ? 140 : beach ? 260 : 60;
    this.hemi.intensity = look.scene === 'arena' ? 0.8 : garden ? 0.7 : pier ? 1.05 : park ? 1.1 : beach ? 1.0 : 1.25;
    this.hemi.color.set(pier ? '#B9CFF2' : park ? '#DCEBFF' : beach ? '#FFB6A6' : '#FFF8EE');
    this.hemi.groundColor.set(pier ? '#6A5546' : park ? '#6F7A5E' : beach ? '#B08A62' : '#8C7A66');
    this.key.intensity = look.scene === 'arena' ? 2.6 : garden ? 3.0 : pier ? 3.4 : park ? 2.6 : beach ? 2.5 : 2.1;
    this.key.color.set(pier ? '#FFCF94' : park ? '#FFF1DC' : beach ? '#FF9F5A' : '#FFFFFF');
    this.renderer.toneMappingExposure = beach ? 1.18 : pier ? 1.08 : 1.0;
    // Beach: a low sun out over the water, behind the basket, so shadows stretch toward the camera.
    // Where the light comes from, per place: low sun at the beach and pier, a mid-afternoon sun in the park,
    // daylight through the high windows in the gym, and lights straight overhead in the arenas.
    const gym = look.scene === 'gym', indoor = look.scene === 'arena' || garden;
    if (beach) this.key.position.set(-6, 4.2, -17);
    else if (pier) this.key.position.set(-11, 6.5, -15);
    else if (park) this.key.position.set(-15, 14, 11);
    else if (gym) this.key.position.set(-14, 13, 3);
    else if (indoor) this.key.position.set(1.5, 22, 2.5);
    else this.key.position.set(6, 16, 8);
    if (gym) { this.key.intensity = 1.7; this.key.color.set('#FFF2DE'); this.hemi.intensity = 1.35; this.hemi.color.set('#FFF6EA'); this.hemi.groundColor.set('#A07E55'); }
    if (park) { this.hemi.groundColor.set('#7F8C5E'); }
    this.key.shadow.radius = indoor ? 2 : 4;
    this.key.shadow.camera.updateProjectionMatrix();
    this.host.parentElement.classList.toggle('arena', look.scene === 'arena' || garden);
    this.setSurroundings(look.scene, look.gymTeam);
  }

  // Rebuild players when the roster or a look changes.
  setPlayers(players) {
    const key = JSON.stringify(players.map((p) => [p.id, p.num, p.look]));
    if (key === this.rosterKey) {
      for (const p of players) { const x = this.people.get(p.id); if (x) x.tag.textContent = p.side === 'O' ? p.num : 'X' + p.num; }
      return;
    }
    this.rosterKey = key;
    for (const x of this.people.values()) { this.scene.remove(x.root); x.dispose(); x.tag.remove(); }
    this.people.clear();
    const t = this.kits || { O: TEAMS.black, D: TEAMS.white };
    for (const p of players) {
      const x = new Player(p.id, { ...p.look, label: p.num, ...t[p.side] });
      x.side = p.side;
      x.pos = new THREE.Vector3();
      x.prev = new THREE.Vector3();
      x.first = true;
      const tag = document.createElement('span');
      tag.className = 'tag ' + p.side;
      tag.dataset.pos = p.side === 'O' ? p.pos : '';
      tag.dataset.id = p.id;
      tag.textContent = p.side === 'O' ? p.num : 'X' + p.num;
      this.labels.appendChild(tag);
      x.tag = tag;
      this.scene.add(x.root);
      this.people.set(p.id, x);
    }
  }

  ghostStanchion(ghost) {
    for (const m of this.stanchionMats || []) { m.transparent = ghost; m.opacity = ghost ? 0.18 : 1; m.depthWrite = !ghost; m.needsUpdate = true; }
  }

  setView(name) {
    const v = VIEWS[name] || VIEWS.broadcast;
    // From the baseline the stanchion would block the play, so make it see-through.
    this.ghostStanchion(name === 'baseline');
    this.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.view = name;
    this.userMoved = false;
    this.fitView();
    this.controls.update();
  }
  // Preset views back off on narrow frames (a phone held upright, a square or 9:16 video) so the
  // corners and wings stay in shot. A view the user has dragged around is left alone on screen.
  fitView() {
    const v = VIEWS[this.view];
    if (!v || v.fit === false || this.povActive) return;
    if (this.userMoved && !this.recordSize) return;
    if (!this.userMoved) { this.camera.position.set(...v.pos); this.controls.target.set(...v.target); }
    this.camera.updateProjectionMatrix();
    fitCamera(this.camera, this.controls.target, fitBox(this.camera.aspect, !!this.recordSize && !this.recordSize.clean));
  }

  // While exporting, render at the video's exact size instead of the on-screen size.
  setRecordSize(size) {
    this.recordSize = size;
    if (size) {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(size.w, size.h, false);
      const a = size.w / size.h, hfov = 2 * Math.atan(Math.tan((18 * Math.PI) / 180) * (a >= 1.6 ? 1.6 : 1.25));
      this.camera.aspect = a;
      this.camera.fov = a >= 1.6 ? 36 : Math.min(72, (2 * Math.atan(Math.tan(hfov / 2) / a) * 180) / Math.PI);
      this.camera.updateProjectionMatrix();
      this.fitView();
    } else {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.resize();
      this.fitView();
    }
  }

  resize() {
    if (this.recordSize) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const a = w / h, hfov = 2 * Math.atan(Math.tan((18 * Math.PI) / 180) * (a >= 1.6 ? 1.6 : 1.2));
    this.camera.aspect = a;
    this.camera.fov = a >= 1.6 ? 36 : Math.min(72, (2 * Math.atan(Math.tan(hfov / 2) / a) * 180) / Math.PI);
    this.camera.updateProjectionMatrix();
    this.fitView();
  }

  setMarks(marks, selected) {
    drawMarks(this.ovCtx, marks, selected, '#E0552E');
    this.ovTex.needsUpdate = true;
  }

  setHandles(list) {
    for (const c of [...this.handleGroup.children]) { this.handleGroup.remove(c); c.material.dispose(); }
    for (const h of list) {
      const solid = h.kind === 'wp';
      const m = new THREE.Mesh(solid ? this.handleGeo : this.addGeo, new THREE.MeshBasicMaterial({ color: solid ? '#E0552E' : '#FFFFFF', depthTest: false, transparent: true, opacity: solid ? 1 : 0.95 }));
      m.position.copy(W(h.uv[0], h.uv[1], solid ? 0.12 : 0.06));
      if (!solid) m.rotation.x = -Math.PI / 2;
      m.renderOrder = 3;
      m.userData = h;
      m.scale.setScalar(solid ? 1 : 1.25);
      this.handleGroup.add(m);
    }
  }

  // ---------- Per-frame update ----------
  // f: model.sample() result; opts: { dt, now, snap, selected, showDefense, holderHand }
  update(f, opts) {
    const { dt, now, snap, selected, showDefense } = opts;
    if (this.parkCars && this.surroundType === 'park' && dt) this.tickPark(Math.min(dt, 0.1));
    if (this.anim && dt) { const d = Math.min(dt, 0.1); this.animT = (this.animT || 0) + d; for (const fn of this.anim) fn(d, this.animT); }
    // the play starting over puts the scoreboards back too
    if (typeof f.i === 'number') { const pos = f.i + (f.t || 0); if (this.lastPos !== undefined && pos < this.lastPos - 0.5 && this.scored) { this.scored = 0; for (const bd of this.boards || []) bd.draw(bd.base[0], bd.base[1]); } this.lastPos = pos; }
    const people = this.people;
    const P = (id) => people.get(id);
    for (const [id, x] of people) {
      const uv = f.pos[id];
      const hidden = !uv || (x.side === 'D' && !showDefense);
      x.root.visible = !hidden;
      x.tag.style.display = hidden ? 'none' : '';
      if (hidden) continue;
      const target = W(uv[0], uv[1]);
      x.prev.copy(x.pos);
      if (snap || x.first) x.pos.copy(target);
      else if (x.side === 'D') x.pos.lerp(target, Math.min(1, dt * 4));
      else x.pos.copy(target);
      x.setSelected(id === selected);
    }
    // Nobody shares a spot: push overlapping players apart. Defenders give way to offense,
    // teammates split the difference, and the player being dragged stays put.
    {
      const vis = [...people.entries()].filter(([, x]) => x.root.visible);
      const MIN = 0.62;
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
          const [ia, a] = vis[i], [ib, b] = vis[j];
          let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
          if (d >= MIN) continue;
          if (d < 1e-4) { dx = 1; dz = 0; d = 1; } else { dx /= d; dz /= d; }
          const push = MIN - (d < 1e-4 ? 0 : d);
          let wa = a.side === b.side ? 0.5 : a.side === 'D' ? 0.85 : 0.15;
          if (ia === selected) wa = 0; else if (ib === selected) wa = 1;
          a.pos.x -= dx * push * wa; a.pos.z -= dz * push * wa;
          b.pos.x += dx * push * (1 - wa); b.pos.z += dz * push * (1 - wa);
        }
      }
    }
    // Ball
    const ballOut = this.ball.position;
    const hand = (x, out, side = 0) => {
      const h = x.heading, s = x.look.height || 1;
      if (!side) return out.set(x.pos.x + Math.sin(h) * 0.34, 1.12 * s, x.pos.z + Math.cos(h) * 0.34);   // both hands, at the chest
      return out.set(x.pos.x + Math.cos(h) * 0.24 * side + Math.sin(h) * 0.2, 1.05 * s, x.pos.z - Math.sin(h) * 0.24 * side + Math.cos(h) * 0.2);
    };
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    const ev = f.ev;
    let shooter = null, jump = 0;
    const dribble = (x) => { hand(x, ballOut, 1.2); ballOut.y = 0.12 + Math.abs(Math.cos(now * Math.PI * 2.4)) * 0.85 * (x.look.height || 1); };
    if (!f.holder || !P(f.holder)) {
      if (ev && ev.kind === 'shot') ballOut.set(RIM.x, 0.12, RIM.z);
      else ballOut.set(RIM.x, 0.12, RIM.z + 1.2);
    } else if (ev && f.t >= ev.t0) {
      const from = P(f.holder);
      const k = Math.min(1, (f.t - ev.t0) / Math.max(0.01, ev.t1 - ev.t0));
      hand(from, tmpA);
      if (ev.kind === 'pass' && P(ev.to)) {
        if (k >= 1) hand(P(ev.to), ballOut);
        else { hand(P(ev.to), tmpB); ballOut.lerpVectors(tmpA, tmpB, k); ballOut.y += Math.sin(Math.PI * k) * 0.35; }
      } else if (ev.kind === 'shot') {
        shooter = f.holder;
        tmpA.y = 2.35 * (from.look.height || 1);
        if (k < 1) { ballOut.lerpVectors(tmpA, RIM, k); ballOut.y += Math.sin(Math.PI * k) * 1.7 + 0.05; } else {
          const drop = Math.min(1, (f.t - ev.t1) / Math.max(0.01, 1 - ev.t1));
          ballOut.set(RIM.x, RIM_Y - drop * 2.9, RIM.z + 0.02);
          ballOut.y = Math.max(0.12, ballOut.y);
        }
      } else hand(from, ballOut);
    } else if (f.dribble) dribble(P(f.holder));
    else hand(P(f.holder), ballOut);
    if (ev && ev.kind === 'shot' && f.holder) {
      shooter = f.holder;
      const span = ev.t1 - ev.t0 + 0.15;
      const q = (f.t - ev.t0 + 0.15) / span;
      jump = q > 0 && q < 1 ? Math.sin(Math.PI * q) * 0.35 : 0;
    }
    this.ball.rotation.x += dt * 6;
    this.animateNet(dt);

    const ballFlat = new THREE.Vector3(ballOut.x, 0, ballOut.z);
    const dribbling = f.dribble && f.holder && !(ev && f.t >= ev.t0), bounce = Math.abs(Math.cos(now * Math.PI * 2.4));
    // who is doing what with their arms this frame
    const poses = new Map();
    if (f.holder) {
      if (ev && ev.kind === 'pass' && ev.to) {
        const span = Math.max(0.01, ev.t1 - ev.t0);
        if (f.t < ev.t0 - 0.12) poses.set(f.holder, { kind: dribbling ? null : 'hold' });
        else if (f.t < ev.t0) poses.set(f.holder, { kind: 'windup' });
        else if (f.t < ev.t1 + 0.08) poses.set(f.holder, { kind: 'pass', k: (f.t - ev.t0) / Math.min(0.12, span) });
        if (f.t >= ev.t0 + span * 0.35 && f.t < ev.t1 + 0.12) poses.set(ev.to, { kind: 'catch' });
        else if (f.t >= ev.t1 + 0.12) poses.set(ev.to, { kind: 'hold' });
      } else if (ev && ev.kind === 'shot') {
        const g0 = ev.t0 - 0.18;
        if (f.t >= g0) poses.set(f.holder, { kind: 'shoot', k: (f.t - g0) / 0.2 });
        else if (!dribbling) poses.set(f.holder, { kind: 'hold' });
      } else if (!dribbling) poses.set(f.holder, { kind: 'hold' });
    }
    const shotUp = ev && ev.kind === 'shot' && f.t >= ev.t0 - 0.2 && f.t < ev.t1;
    for (const [id, x] of people) if (x.side === 'D' && x.root.visible) poses.set(id, { kind: x.guard === f.holder ? (shotUp ? 'contest' : 'guard') : 'deny' });
    for (const [id, x] of people) {
      if (!x.root.visible) continue;
      const v = x.first ? 0 : x.pos.distanceTo(x.prev) / Math.max(dt, 1e-4);
      const moving = v > 0.25 && !snap;
      let dir;
      if (moving) dir = Math.atan2(x.pos.x - x.prev.x, x.pos.z - x.prev.z);
      else if (x.side === 'D' && x.guard && P(x.guard)) dir = Math.atan2(P(x.guard).pos.x - x.pos.x, P(x.guard).pos.z - x.pos.z);
      else dir = Math.atan2(ballFlat.x - x.pos.x, ballFlat.z - x.pos.z);
      // Whoever has the ball faces the basket; facing the ball in their own hand made them spin.
      if (!moving && (id === f.holder || id === shooter || x.pos.distanceTo(ballFlat) < 0.6)) dir = Math.atan2(RIM.x - x.pos.x, RIM.z - x.pos.z);
      x.root.position.set(x.pos.x, id === shooter ? jump : 0, x.pos.z);
      x.tick(dt, moving ? v : 0, dir, now, { moving, style: v > 3.2 ? 'run' : x.side === 'D' ? 'chasse' : 'walk', dribble: dribbling && id === f.holder ? bounce : undefined, pose: poses.get(id) && poses.get(id).kind ? poses.get(id) : undefined }, snap || x.first);
      x.first = false;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const w = this.host.clientWidth, h = this.host.clientHeight;
    const proj = new THREE.Vector3();
    for (const x of people.values()) {
      if (!x.root.visible) continue;
      const atFeet = document.body.dataset.tags === 'floor';
      proj.set(x.root.position.x, atFeet ? 0.02 : 2.05 * (x.look.height || 1) + x.root.position.y, x.root.position.z).project(this.camera);
      // Behind the camera, off screen or faded out: no tag, so none float in the air.
      const off = proj.z > 1 || Math.abs(proj.x) > 1.1 || Math.abs(proj.y) > 1.1 || x.alpha < 0.55;
      x.tag.style.visibility = off ? 'hidden' : '';
      x.tag.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px) translate(-50%, ${atFeet ? '-20%' : '-100%'})${atFeet ? ' scaleY(.6)' : ''}`;
    }
  }

  setGuards(players) { for (const p of players) { const x = this.people.get(p.id); if (x) x.guard = p.guard; } }

  // ---------- Pointer ----------
  bindPointer() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitAt = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
    };
    const floorUV = () => { const p = new THREE.Vector3(); return ray.ray.intersectPlane(this.floorPlane, p) ? toUV(p) : null; };
    let drag = null, down = null;
    this.host.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.altKey) return;
      hitAt(e);
      const hh = ray.intersectObjects(this.handleGroup.children, false)[0];
      if (hh) {
        drag = { kind: 'handle', h: hh.object.userData, moved: false };
      } else {
        const hits = [];
        for (const [id, x] of this.people) if (x.root.visible) hits.push(x.hit);
        const ph = ray.intersectObjects(hits, false)[0];
        if (ph) {
          const id = ph.object.userData.id;
          drag = { kind: 'player', id, moved: false };
          if (this.hooks.onPick) this.hooks.onPick(id, e);
        }
      }
      if (drag) {
        e.stopPropagation();
        e.preventDefault();
        this.controls.enabled = false;
        el.setPointerCapture(e.pointerId);
      } else down = { x: e.clientX, y: e.clientY };
    }, true);
    el.addEventListener('pointermove', (e) => {
      if (!drag) {
        hitAt(e);
        const over = ray.intersectObjects(this.handleGroup.children, false).length || [...this.people.values()].some((x) => x.root.visible && ray.intersectObject(x.hit, false).length);
        el.style.cursor = over ? 'grab' : '';
        return;
      }
      hitAt(e);
      const uv = floorUV();
      if (!uv) return;
      if (!drag.moved && this.hooks.onDragStart) this.hooks.onDragStart(drag);
      drag.moved = true;
      el.style.cursor = 'grabbing';
      if (drag.kind === 'player' && this.hooks.onDragPlayer) this.hooks.onDragPlayer(drag.id, uv);
      if (drag.kind === 'handle' && this.hooks.onDragHandle) this.hooks.onDragHandle(drag.h, uv);
    });
    const end = (e) => {
      if (drag) {
        if (this.hooks.onDragEnd) this.hooks.onDragEnd(drag);
        this.controls.enabled = true;
        drag = null;
        el.style.cursor = '';
      } else if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && this.hooks.onEmpty) this.hooks.onEmpty();
      down = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', (e) => {
      hitAt(e);
      const hh = ray.intersectObjects(this.handleGroup.children, false)[0];
      if (hh && this.hooks.onHandleDouble) this.hooks.onHandleDouble(hh.object.userData);
    });
  }
}
