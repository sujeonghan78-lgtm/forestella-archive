// 숲별 트리 3D (트리 화면에 들어갈 때만 불러와요)
import * as T from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

// 하늘: 폰 시간 기준 새벽·낮·노을·밤
let DROP = null, SPLASH = null;
export function skyNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'sunset' : 'night';
}
const SKY = { dawn: ['#a99ad8', '#f7c6cf', .35], day: ['#9fd3f2', '#e8f6fb', 0], sunset: ['#4b3f86', '#f6a06a', .45], night: ['#13274a', '#2b5a5a', 1] };

let SRC = null, FT = 1.6;
const H = 5.6;
async function loadTree() {
  if (SRC) return;
  let g;
  (await new GLTFLoader().loadAsync('lib/tree.glb')).scene.traverse(o => { if (o.isMesh && !g) { o.updateWorldMatrix(true, false); g = o.geometry.clone().applyMatrix4(o.matrixWorld); } });
  g = g.toNonIndexed(); ['uv', 'uv1', 'uv2', 'color', 'tangent'].forEach(a => g.deleteAttribute(a));
  g.computeBoundingBox(); { const b = g.boundingBox, c = b.getCenter(new T.Vector3()), k = H / (b.max.y - b.min.y); g.translate(-c.x, -b.min.y, -c.z); g.scale(k, k, k); }
  // 모양 다듬기: 줄기 짧게, 가지 넓게, 층 끝은 9갈래 물결로 살짝 처지게
  const p = g.attributes.position, n = p.count; let maxR = 0;
  for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(p.getX(i), p.getZ(i)));
  let f0 = 99; for (let i = 0; i < n; i++) if (Math.hypot(p.getX(i), p.getZ(i)) > maxR * .6) f0 = Math.min(f0, p.getY(i));
  const bins = new Array(41).fill(0), bi = y => Math.min(40, Math.max(0, Math.round(y / H * 40)));
  for (let i = 0; i < n; i++) { const k = bi(p.getY(i)); bins[k] = Math.max(bins[k], Math.hypot(p.getX(i), p.getZ(i))); }
  const TS = .45, W = 1.32, SEG = 9;
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const r = Math.hypot(x, z), a = Math.atan2(z, x);
    if (y < f0 - .01) y *= TS;
    else { const rel = r / (bins[bi(y)] || 1); let f = W, dy = 0; if (rel > .75) { const w = Math.cos(a * SEG + y * 1.3); f *= 1 + .13 * w * (rel - .75) * 4; dy = -.18 * (w + 1) / 2 * (rel - .75) * 4; } x *= f; z *= f; y = f0 * TS + (y - f0) * 1.05 + dy; }
    p.setXYZ(i, x, y, z);
  }
  g.computeBoundingBox(); const k = H / g.boundingBox.max.y; g.scale(k, k, k);
  FT = f0 * TS * k; SRC = g;
}
let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const fm = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, flatShading: true }, o));
// 면마다 살짝 다른 색 (아래 진초록 → 위 연두), snow면 윗면을 눈으로
function treeMesh(snow) {
  const g = SRC.clone(), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const G0 = new T.Color(0x3f8a34), G1 = new T.Color(0x8fd968), B = new T.Color(0xb57a48), S = new T.Color(0xeef4fb);
  seed = 5;
  for (let i = 0; i < n; i += 3) {
    let cy = 0; for (let j = 0; j < 3; j++) cy += p.getY(i + j) / 3;
    const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i), az = p.getZ(i + 1) - p.getZ(i), bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i), bz = p.getZ(i + 2) - p.getZ(i);
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nyF = ny / (Math.hypot(nx, ny, nz) || 1);
    let cr = 0; for (let j = 0; j < 3; j++) cr += Math.hypot(p.getX(i + j), p.getZ(i + j)) / 3;
    const trunk = cy < FT - .02 && cr < .7, k = 1 + (rnd() - .5) * .14;
    let c = trunk ? B.clone() : G0.clone().lerp(G1, Math.min(1, (cy - FT) / (H - FT)));
    c.multiplyScalar(k);
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r; col[(i + j) * 3 + 1] = c.g; col[(i + j) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .9 }));
  m.castShadow = m.receiveShadow = true; return m;
}
// 장식 모양들 (각진 로우폴리)
export function bead(sz, c) { return new T.Mesh(new T.IcosahedronGeometry(sz, 1), fm(c, { roughness: .55 })); }
export function star5(sz, c) {
  const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const rr = (k % 2 ? .42 : 1) * sz, a = k / 10 * 6.283 + 1.571; k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new T.ExtrudeGeometry(sh, { depth: sz * .3, bevelEnabled: true, bevelSize: sz * .12, bevelThickness: sz * .15, bevelSegments: 1 }); g.translate(0, 0, -sz * .15); return new T.Mesh(g, fm(c));
}
export function sock(sz, c) {
  const g = new T.Group();
  const leg = new T.Mesh(new T.BoxGeometry(sz * .5, sz * .75, sz * .3), fm(c)); leg.position.y = sz * .1; g.add(leg);
  const foot = new T.Mesh(new T.BoxGeometry(sz * .7, sz * .32, sz * .3), fm(c)); foot.position.set(sz * .12, -sz * .36, 0); g.add(foot);
  const toe = new T.Mesh(new T.BoxGeometry(sz * .18, sz * .32, sz * .31), fm(0xffffff)); toe.position.set(sz * .47, -sz * .36, 0); g.add(toe);
  const heel = new T.Mesh(new T.BoxGeometry(sz * .16, sz * .2, sz * .31), fm(0xffffff)); heel.position.set(-sz * .17, -sz * .42, 0); g.add(heel);
  const cuff = new T.Mesh(new T.BoxGeometry(sz * .6, sz * .22, sz * .38), fm(0xf4f4f0)); cuff.position.y = sz * .55; g.add(cuff);
  return g;
}
export function snowman(sz, c = 0xd8343e) { // 눈사람 (목도리 색 = c)
  const g = new T.Group(), w = fm(0xfbfdff, { roughness: .8 }), blk = fm(0x1d1d22);
  const b1 = new T.Mesh(new T.IcosahedronGeometry(sz * .5, 1), w); b1.position.y = sz * .5; const b2 = new T.Mesh(new T.IcosahedronGeometry(sz * .36, 1), w); b2.position.y = sz * 1.15; g.add(b1, b2);
  [-1, 1].forEach(k => { const e = new T.Mesh(new T.SphereGeometry(sz * .045, 6, 4), blk); e.position.set(k * sz * .12, sz * 1.25, sz * .32); g.add(e); });
  const nose = new T.Mesh(new T.ConeGeometry(sz * .06, sz * .3, 6), fm(0xff8a2a)); nose.rotation.x = Math.PI / 2; nose.position.set(0, sz * 1.16, sz * .47); g.add(nose);
  const sf = new T.Mesh(new T.TorusGeometry(sz * .3, sz * .07, 5, 10), fm(c)); sf.rotation.x = Math.PI / 2; sf.position.y = sz * .86; g.add(sf);
  const tail = new T.Mesh(new T.BoxGeometry(sz * .12, sz * .35, sz * .05), fm(c)); tail.position.set(sz * .18, sz * .7, sz * .28); tail.rotation.z = .2; g.add(tail);
  const hb = new T.Mesh(new T.CylinderGeometry(sz * .3, sz * .3, sz * .04, 10), blk); hb.position.y = sz * 1.46; const ht = new T.Mesh(new T.CylinderGeometry(sz * .2, sz * .2, sz * .3, 10), blk); ht.position.y = sz * 1.62;
  const hr = new T.Mesh(new T.CylinderGeometry(sz * .205, sz * .205, sz * .06, 10), fm(0x2e9a5e)); hr.position.y = sz * 1.5; g.add(hb, ht, hr);
  return g;
}
function gift(x, z, c, q, h, rc, i) { // 상자 + 리본 + 위 리본 매듭
  const g = new T.Group();
  const b = new T.Mesh(new T.BoxGeometry(q, h, q * (.8 + (i % 3) * .1)), fm(c, { roughness: .6 })); b.castShadow = b.receiveShadow = true; g.add(b);
  [0, Math.PI / 2].forEach(r => { const rb = new T.Mesh(new T.BoxGeometry(q * 1.02 + .01, h + .01, q * .16), fm(rc)); rb.rotation.y = r; g.add(rb); });
  [-1, 1].forEach(k => { const bw = new T.Mesh(new T.BoxGeometry(q * .3, q * .18, q * .12), fm(rc)); bw.position.set(k * q * .13, h / 2 + q * .07, 0); bw.rotation.z = k * .5; g.add(bw); });
  g.position.set(x, 0, z); g.children.forEach(o => { o.position.y += h / 2; }); g.rotation.y = i * .9; return g;
}
const GIFTS = [ // x, z, 색, 리본, 크기, 높이, 위에 얹기
  [-1.9, 1.5, 0xe5484d, 0xf5d36a, .62, .5], [-1.2, 2.2, 0x5b8def, 0xffffff, .48, .42], [-2.6, .5, 0xb07cf0, 0xf5d36a, .5, .62],
  [2.0, 1.6, 0xf2a33a, 0xe5484d, .58, .46], [1.2, 2.3, 0x3fae6a, 0xffffff, .42, .36], [2.7, .4, 0xff8fc0, 0xffffff, .46, .4],
  [-.3, 2.6, 0xf4f4f0, 0xe5484d, .4, .34], [.6, 2.7, 0xd8343e, 0x3fae6a, .34, .3],
  [-1.9, 1.5, 0x7fd0e8, 0xffffff, .36, .3, .5], [2.0, 1.6, 0xf5c83c, 0x5b8def, .34, .28, .46],
];
// 실제 별자리 (대략 모양, 왼쪽 아래가 0,0). o = 하늘 자리, s = 크기, e = 잇는 선
const CONST = [
  { n: '북두칠성', o: [-5, 9.5], s: 1, p: [[0, 0], [1.1, .2], [2, .1], [3, .5], [3.2, 1.6], [4.4, 1.8], [4.6, .7]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  { n: '카시오페이아', o: [.6, 12.5], s: .9, p: [[0, 1], [1, 0], [2, .8], [3, 0], [4, 1]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { n: '오리온', o: [-2, 15], s: 1.05, p: [[0, 3], [2.4, 3.2], [.9, 1.6], [1.2, 1.5], [1.5, 1.4], [.2, 0], [2.4, .2], [1.2, 3.9]], e: [[0, 7], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  { n: '거문고자리', o: [-5.2, 14.5], s: 1, p: [[0, 1.6], [.3, .9], [.9, 1], [.6, 0], [1.2, .1]], e: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]] },
  { n: '백조자리', o: [2.2, 16.5], s: 1, p: [[0, 2.2], [1, 1.2], [2.1, 0], [.1, .5], [2, 2]], e: [[0, 1], [1, 2], [3, 1], [1, 4]] },
  { n: '작은곰자리', o: [-4.8, 20], s: 1, p: [[0, 0], [.8, .4], [1.5, .6], [2.2, .5], [2.4, 1.2], [3.1, 1.4], [3, .6]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  { n: '쌍둥이자리', o: [1, 20.5], s: 1, p: [[0, 3], [.9, 3.1], [.1, 1.5], [-.1, 0], [1, 1.6], [1.4, .1]], e: [[0, 1], [0, 2], [2, 3], [1, 4], [4, 5]] },
  { n: '사자자리', o: [-2.4, 25], s: 1.1, p: [[0, 0], [0, .8], [.4, 1.4], [1, 1.5], [1.3, 1], [2.5, .7], [3.6, .4], [2.6, 0]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [7, 0]] },
];
const BC = [0xe8453c, 0xff9a3c, 0xf5c83c, 0xb7e07a, 0x7fd0e8, 0x3f6fe0, 0x9b6ee8, 0xff8fc0, 0xf4f4f0, 0xd4a94a];
// 숲별 오너먼트 색 8가지 (app.js 색 고르기와 같은 순서)
export const OC = [0xe8453c, 0xff9a3c, 0xf5c83c, 0x8fd968, 0x7fd0e8, 0x3f6fe0, 0x9b6ee8, 0xff8fc0];
const SC = [0xd8343e, 0x2f6fd8, 0x8a5ad8, 0xff8fc0, 0xf0a030];

// el 안에 트리를 그려요. opt: { lv: {tree,forest,beads,socks,snow,star,gifts}, people, sky }
export async function mount(el, opt) {
  await loadTree();
  const W0 = () => el.clientWidth || 360, H0 = () => el.clientHeight || 420;
  const r = new T.WebGLRenderer({ antialias: true, alpha: false });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(W0(), H0());
  r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = T.SRGBColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  el.appendChild(r.domElement); r.domElement.style.touchAction = 'none'; r.domElement.style.display = 'block';
  const sc = new T.Scene(), sky = opt.sky || skyNow(), [s0, s1, starA] = SKY[sky], night = sky === 'night';
  { const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, s0); gr.addColorStop(1, s1); x.fillStyle = gr; x.fillRect(0, 0, 2, 256); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; sc.background = tx; }
  sc.fog = new T.Fog(s1, 16, 48); // 땅 끝이 하늘에 스며들게
  sc.add(new T.HemisphereLight(night ? 0xc8dcff : 0xffffff, 0x40504a, night ? 1.1 : 1.6));
  const d = new T.DirectionalLight(sky === 'sunset' ? 0xffc29a : sky === 'dawn' ? 0xffd6e4 : night ? 0xe8f0ff : 0xfff1dc, night ? 1.5 : 2.2); d.position.set(4, 9, 6); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -6, right: 6, top: 8, bottom: -2 }); sc.add(d);
  const rim = new T.DirectionalLight(0x9fe6d6, .6); rim.position.set(-5, 4, -6); sc.add(rim);
  const L = opt.lv; seed = 9;
  // 하늘 별 = 숲별들이 준 물: 물 한 번에 작은 점 별 하나, 물 STEP번마다 별자리 별이 하나씩 켜져요(북두칠성부터 차례로).
  // 다 채운 별자리는 연한 선으로 잇고 이름이 잠깐 떠요. 낮엔 안 보이고 새벽·노을·밤에 보여요
  const STEP = opt.cStep || 20, SKY_R = 22, CP = [];
  // 하늘은 돔: 손가락으로 돌리면 트리보다 천천히 같이 돌아요. 별자리는 하늘 둘레에 펼쳐 둬요 (앞쪽 두 개부터)
  const skyG = new T.Group(); sc.add(skyG);
  const SKY_A = [0, .6, -.6, 1.2, -1.2, 1.85, -1.85, 2.7], SKY_Y = [19, 21.5, 20, 22, 21, 20.5, 22, 21];
  CONST.forEach((c, ci) => { const a = SKY_A[ci], cx = c.p.reduce((s, q) => s + q[0], 0) / c.p.length * c.s, cy = c.p.reduce((s, q) => s + q[1], 0) / c.p.length * c.s;
    c.p.forEach(([x, y]) => { const dx = x * c.s - cx; CP.push({ ci, v: new T.Vector3(Math.sin(a) * SKY_R + Math.cos(a) * dx, SKY_Y[ci] + y * c.s - cy, -Math.cos(a) * SKY_R + Math.sin(a) * dx) }); }); });
  // 별끼리 너무 붙지 않게: 다른 별(별자리 별 포함)과 STAR_GAP보다 가까우면 다른 자리를 다시 찾아요
  const STAR_GAP = 1.1, used_ = CP.map(q => q.v), far = v => used_.every(u => u.distanceToSquared(v) > STAR_GAP * STAR_GAP);
  const starPos = () => { let v; for (let k = 0; k < 15; k++) { const a = rnd() * 6.283, R = 24 + rnd() * 6, y = 4 + rnd() * 30; v = new T.Vector3(Math.sin(a) * R, y, -Math.cos(a) * R); if (far(v)) break; } used_.push(v); return [v.x, v.y, v.z]; };
  const ptM = sz => new T.PointsMaterial({ color: 0xfff3c8, size: sz, transparent: true, opacity: starA, fog: false });
  const lineM = new T.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: starA * .35, fog: false });
  const drawLines = ci => { const c = CONST[ci], base = CP.findIndex(q => q.ci === ci), p = []; c.e.forEach(([i, j]) => p.push(CP[base + i].v, CP[base + j].v)); skyG.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(p), lineM)); };
  let wn = opt.water || 0;
  const lit = () => Math.min(CP.length, wn <= 200 ? Math.floor(wn / STEP) : Math.floor(200 / STEP) + Math.floor((wn - 200) / 100)), done = ci => CP.every((q, k) => q.ci !== ci || k < lit());
  if (starA) {
    const cp = CP.slice(0, lit()).map(q => q.v); if (cp.length) skyG.add(new T.Points(new T.BufferGeometry().setFromPoints(cp), ptM(.26)));
    CONST.forEach((c, ci) => { if (done(ci)) drawLines(ci); });
    const p = [], n = Math.min(400, wn - lit()); for (let k = 0; k < n; k++) p.push(...starPos());
    if (p.length) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); skyG.add(new T.Points(g, ptM(.13))); }
  }
  const label = txt => { const d = document.createElement('div'); d.className = 'tree-const'; d.textContent = '✨ ' + txt; el.appendChild(d); setTimeout(() => d.remove(), 3200); };
  // 반짝임: 둥근 빛(스프라이트)이 크게 켜졌다가 천천히 작아져요
  const GLOW = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(.25, 'rgba(255,240,190,.55)'); g.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(cv); })();
  const glow = (pos, size, life) => { const s = new T.Sprite(new T.SpriteMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: starA })); s.position.copy(pos); s.scale.setScalar(size); skyG.add(s); let f = 0;
    fx.push(() => { f++; const k = f / life; s.scale.setScalar(size * (1 - k * .8)); s.material.opacity = starA * (1 - k); if (k >= 1) { skyG.remove(s); return false; } return true; }); };
  const dot = (pos, big) => { const pt = new T.Points(new T.BufferGeometry().setFromPoints([pos]), ptM(big ? 2.4 : 1.4)); pt.userData.min = big ? .26 : .13; skyG.add(pt); pops.push(pt); glow(pos, big ? 3.2 : 1.8, big ? 110 : 80); };
  // 별똥별: 하늘 위 한쪽에서 꼬리를 끌며 날아와 별자리 자리에 박혀요
  const shoot = (to, done_) => { const a = Math.atan2(to.x, -to.z), sd = (rnd() < .5 ? -1 : 1) * (9 + rnd() * 5), from = to.clone().add(new T.Vector3(Math.cos(a) * sd, 7 + rnd() * 4, Math.sin(a) * sd)), N = 14, hist = [];
    const head = new T.Points(new T.BufferGeometry().setFromPoints([from]), ptM(1.2)); skyG.add(head);
    const tg = new T.BufferGeometry().setFromPoints(Array(N).fill(from)), tail = new T.Line(tg, new T.LineBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: starA * .8, fog: false })); skyG.add(tail);
    let f = 0; const L = 70;
    fx.push(() => { f++; const k = Math.min(1, f / L), e = 1 - Math.pow(1 - k, 2), p = from.clone().lerp(to, e); head.geometry.setFromPoints([p]); hist.unshift(p); if (hist.length > N) hist.pop();
      tg.setFromPoints(hist.concat(Array(N - hist.length).fill(hist[hist.length - 1]))); tail.material.opacity = starA * .8 * (k < .85 ? 1 : (1 - k) / .15);
      if (k >= 1) { skyG.remove(head); skyG.remove(tail); done_(); return false; } return true; }); };
  // 카메라가 천천히 하늘을 올려다봤다가 돌아와요 (별자리 별이 켜질 때)
  const lookTo = (to, n, then) => { const from = look; let f = 0; fx.push(() => { f++; const k = Math.min(1, f / n), e = k * k * (3 - 2 * k); look = from + (to - from) * e; if (zoom >= .95) aim(); if (k >= 1) { if (then) then(); return false; } return true; }); };
  // 지금 화면에 보이는 하늘 자리 (위쪽 빈 하늘, 트리 뒤 먼 곳)
  const seenPos = () => { for (let k = 0; k < 12; k++) { const nx = (rnd() - .5) * 1.7, ny = .12 + rnd() * .43; if (Math.abs(nx) < .42 && ny < .45) continue; const n = new T.Vector3(nx, ny, .5).unproject(cam), dir = n.sub(cam.position).normalize(); if (dir.z > -.05) continue; const tt = (-24 - cam.position.z) / dir.z, p = cam.position.clone().add(dir.multiplyScalar(tt)); if (p.y > 3) { skyG.updateMatrixWorld(true); const lp = skyG.worldToLocal(p); if (!far(lp) && k < 11) continue; used_.push(lp); return lp; } } return new T.Vector3(...starPos()); };
  // 하늘을 돌려 그 별이 앞에 오게 (가까운 쪽으로)
  const skyTo = (a, n) => { const from = skyRot; let d = (a - from) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; let f = 0; fx.push(() => { f++; const k = Math.min(1, f / n), e = k * k * (3 - 2 * k); skyRot = from + d * e; return k < 1; }); };
  const skyStar = () => { const before = lit(); wn++; const q = lit() > before ? CP[lit() - 1] : null, fin = q && done(q.ci);
    const after = () => { if (fin) { drawLines(q.ci); label(opt.cName ? opt.cName(CONST[q.ci].n) : CONST[q.ci].n); setTimeout(() => { if (alive && opt.onConst) opt.onConst(CONST[q.ci].n); }, 1400); } };
    if (!starA) { after(); return null; }
    if (q) { skyTo(Math.atan2(q.v.x, -q.v.z), 50); lookTo(.8, 50, () => shoot(q.v, () => { dot(q.v, true); after(); setTimeout(() => { if (alive && drag == null) lookTo(0, 70); }, fin ? 4200 : 1800); })); }
    else dot(seenPos(), false);
    return null; };
  const hill = new T.Mesh(new T.CylinderGeometry(60, 60, .6, 48), fm(0xe6eef4, { roughness: 1, flatShading: false })); hill.position.y = -.3; hill.receiveShadow = true; sc.add(hill);
  const PLAIN = treeMesh(false), SNOWY = null;
  const spin = new T.Group(); sc.add(spin);
  let skyRot = 0, top = 1, t = null, surf = null, hangOrn = null, ornOff = null, ornMake = null; const pops = [], ORN = [], fx = [], GLIT = [], WOODS = [];
  if (!L.tree) { // 씨앗·새싹
    const soil = new T.Mesh(new T.CylinderGeometry(.55, .65, .14, 9), fm(0x6e4a2c, { roughness: 1 })); soil.position.y = .07; spin.add(soil);
    if (L.sprout) { const st = new T.Mesh(new T.CylinderGeometry(.035, .045, .55, 6), fm(0x4e8f3a)); st.position.y = .4; spin.add(st); [-1, 1].forEach(k => { const lf = new T.Mesh(new T.IcosahedronGeometry(.2, 1), fm(0x7fd468)); lf.scale.set(1.5, .35, .75); lf.position.set(k * .2, .68, 0); lf.rotation.z = k * .4; spin.add(lf); }); top = .9; }
    else { const sd = new T.Mesh(new T.IcosahedronGeometry(.2, 1), fm(0xa06d40)); sd.scale.set(1, .8, 1); sd.position.y = .22; spin.add(sd); top = .5; }
  } else {
    t = (SNOWY || PLAIN).clone(); const TY = L.tall || 1; t.scale.set(L.tree, L.tree * TY, L.tree); spin.add(t); top = H * L.tree * TY; t.updateMatrixWorld(true);
    const rc = new T.Raycaster(), hs = top;
    // 겉면 자리 + 그 자리의 바깥 방향
    surf = (y, a, off) => { rc.set(new T.Vector3(Math.cos(a) * 12, y, Math.sin(a) * 12), new T.Vector3(-Math.cos(a), 0, -Math.sin(a))); const h = rc.intersectObject(t, false)[0]; if (!h) return null; const nrm = h.face.normal.clone().transformDirection(t.matrixWorld); return { p: h.point.add(nrm.clone().multiplyScalar(off)), n: nrm }; };
    const hang = (o, s) => { o.position.copy(s.p); o.lookAt(s.p.clone().add(s.n)); o.rotateZ((rnd() - .5) * .5); o.castShadow = true; spin.add(o); };
    const ft = FT * L.tree * (L.tall || 1), nB = L.beads || 0, nS = L.socks || 0, nSt = L.stars || 0, used = [];
    // 빈 자리 찾기: 다른 장식과 gap 이상 떨어진 겉면 (여러 번 시도)
    const spot = (gap, off) => { for (let tr = 0; tr < 14; tr++) { const y = ft + .3 * L.tree + rnd() * (hs - ft - 1.0 * L.tree), s = surf(y, rnd() * 6.283, off); if (s && used.every(u => u.p.distanceTo(s.p) > u.r + gap)) return s; } return null; };
    // 숲별 오너먼트 (opt.orns: [{id, shape 0구슬·1양말·2별, color, spot [각도, 높이 비율, 크기, 회전] 또는 null, nick}])
    // 자리를 고른 것 먼저 달고, 사이트 장식은 그 둘레 빈 곳에, 자리 없이 바구니에서 온 건 마지막에 빈 곳에 달아요
    const OB = 1.25 * Math.max(L.tree, .55);
    ornMake = (o, sz) => o.shape === 3 ? (() => { const g = new T.Group(), s = snowman(.26 * sz, OC[o.color] || OC[0]); s.position.y = -.22 * sz; g.add(s); return g; })() : o.shape === 1 ? sock(.3 * sz, OC[o.color] || OC[0]) : o.shape === 2 ? star5(.11 * sz, OC[o.color] || OC[2]) : bead(.11 * sz, OC[o.color] || OC[0]);
    ornOff = (o, sz) => (o.shape === 0 ? .1 : o.shape === 3 ? .1 : .06) * sz;
    const at0 = f => { const ry = spin.rotation.y, rz = spin.rotation.z; spin.rotation.set(0, 0, 0); spin.updateMatrixWorld(true); try { return f(); } finally { spin.rotation.set(0, ry, rz); spin.updateMatrixWorld(true); } };
    hangOrn = (o, m) => at0(() => { const sz = OB * (o.spot ? o.spot[2] : 1), s = o.spot ? surf(Math.min(o.spot[1], .86) * top, o.spot[0], ornOff(o, sz)) : spot(.13 * sz, ornOff(o, sz)); if (!s) return null;
      m = m || ornMake(o, sz); m.position.copy(s.p); m.lookAt(s.p.clone().add(s.n)); m.rotateZ(o.spot ? o.spot[3] : (rnd() - .5) * .5);
      m.userData.orn = o; m.traverse(c => { c.castShadow = true; c.userData.orn = o; }); if (!m.parent) spin.add(m); used.push({ p: s.p, r: .13 * sz }); return m; });
    (opt.orns || []).filter(o => o.spot).forEach(o => { const m = hangOrn(o); if (m) ORN.push(m); });
    for (let k = 0; k < nB + nS + nSt; k++) {
      const sz = (.7 + rnd() * .5) * Math.max(L.tree, .55), kind = k < nB ? 0 : k < nB + nS ? 1 : 2, r = (kind === 1 ? .2 : .11) * sz, s = spot(r + .05, kind === 0 ? .09 * sz : kind === 1 ? .06 * sz : .05 * sz); if (!s) continue;
      used.push({ p: s.p, r }); hang(kind === 0 ? bead(.1 * sz, BC[Math.floor(rnd() * BC.length)]) : kind === 1 ? sock(.3 * sz, SC[Math.floor(rnd() * SC.length)]) : star5(.1 * sz, [0xf5c83c, 0xdfe4ea, 0xff8fc0][k % 3]), s);
    }
    (opt.orns || []).filter(o => !o.spot).forEach(o => { const m = hangOrn(o); if (m) ORN.push(m); });
    if (L.star) { const st = star5(.48, 0xffcf3a); st.material.emissive = new T.Color(0xd09000); st.material.emissiveIntensity = night ? .9 : .3; st.position.set(0, top + .25, 0); spin.add(st); }
    if (L.glit) for (let k = 0; k < 90; k++) { // 반짝이: 겉면 작은 빛, 트리를 돌려 면이 카메라를 향할 때만 반짝
      const y = ft + rnd() * (top * .86 - ft), s = surf(y, rnd() * 6.283, .06); if (!s) continue;
      const sp = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: k % 3 ? 0xfff6d0 : 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, fog: false, opacity: 0 }));
      sp.position.copy(s.p); sp.scale.setScalar(.11 + rnd() * .06); sp.userData.n = s.n.clone().normalize(); sp.userData.k = .5 + rnd() * .4; spin.add(sp); GLIT.push(sp); }
    if (L.ribbon) { // 금색 리본: 겉면을 따라 납작한 띠가 아래에서 위로 두 바퀴 남짓, 하늘빛을 반사해서 돌리면 빛이 흘러가요
      const P = [], N = []; for (let k = 0; k <= 160; k++) { const f = k / 160, s = surf(ft + .15 + f * (top * .84 - ft - .15), 1.2 + f * 6.283 * 2.2, .08); if (s) { P.push(s.p); N.push(s.n.clone().normalize()); } }
      if (P.length > 10) {
        const cv = P.map(() => 0), pos = [], nor = [], idx = [], W = .075;
        P.forEach((p, k) => { const tg = (P[Math.min(k + 1, P.length - 1)]).clone().sub(P[Math.max(k - 1, 0)]).normalize(), w = new T.Vector3().crossVectors(N[k], tg).normalize().multiplyScalar(W); pos.push(p.x + w.x, p.y + w.y, p.z + w.z, p.x - w.x, p.y - w.y, p.z - w.z); nor.push(N[k].x, N[k].y, N[k].z, N[k].x, N[k].y, N[k].z); if (k) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); } });
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
        const ec = document.createElement('canvas'); ec.width = 256; ec.height = 128; const ex = ec.getContext('2d'), eg = ex.createLinearGradient(0, 0, 0, 128);
        eg.addColorStop(0, '#2a3550'); eg.addColorStop(.42, '#fff6dc'); eg.addColorStop(.5, '#ffffff'); eg.addColorStop(.58, '#c99a3a'); eg.addColorStop(1, '#3a2a10'); ex.fillStyle = eg; ex.fillRect(0, 0, 256, 128);
        for (let k = 0; k < 6; k++) { ex.fillStyle = 'rgba(255,255,255,.9)'; ex.fillRect(k * 43, 30 + (k % 3) * 8, 10, 60); }
        const env = new T.CanvasTexture(ec); env.mapping = T.EquirectangularReflectionMapping; env.colorSpace = T.SRGBColorSpace;
        const rb = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0xffcc55, metalness: 1, roughness: .22, envMap: env, envMapIntensity: 1.3, emissive: 0x8a5a00, emissiveIntensity: .25, side: T.DoubleSide })); rb.castShadow = true; spin.add(rb); } }
    if (L.woods) { // 둘레 숲: 각진 원뿔을 쌓은 단순한 나무 (한 그루 = 한 덩어리로 합쳐 가볍게), 트리와 같이 돌아요. 눈 레벨엔 끝이 하얗게
      let ws = 77; const wr = () => (ws = (ws * 16807) % 2147483647) / 2147483647, GC = [0x3d7a4a, 0x4a8a52, 0x356a44, 0x5a8c45, 0x3a7a62], SC = new T.Color(0xf2f6fa), TC = new T.Color(0x4a3426);
      const part = (geo, x, y, z, ry, rz, col, P, N, C) => { const g = geo.toNonIndexed(); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); const p = g.attributes.position.array, n = g.attributes.normal.array; for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) C.push(col.r, col.g, col.b); };
      for (let k = 0; k < L.woods; k++) { const a = wr() * 6.283, d = 12 + Math.pow(wr(), .8) * 16, hs = .6 + Math.pow(wr(), 2) * (.7 + 2.6 * (d - 12) / 16), G = new T.Color(GC[k % GC.length]), nt = 2 + Math.floor(wr() * 3), seg = 5 + Math.floor(wr() * 3), fat = .55 + wr() * .8, P = [], N = [], C = [];
        part(new T.CylinderGeometry(.12 * hs, .15 * hs, .5 * hs, 5), 0, .25 * hs, 0, 0, 0, TC, P, N, C);
        let y = .4 * hs; for (let j = 0; j < nt; j++) { const r = (.85 - j * .55 / nt) * hs * fat * (.9 + wr() * .2), h = (1.05 - j * .3 / nt) * hs * (.85 + wr() * .3), ry = wr() * 3, rz = (wr() - .5) * .08;
          part(new T.ConeGeometry(r, h, seg), 0, y + h / 2, 0, ry, rz, G, P, N, C);
          if (L.snow) part(new T.ConeGeometry(r * .4, h * .4, seg), 0, y + h - h * .2 + .01, 0, ry, rz, SC, P, N, C); y += h * (.55 + wr() * .1); }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
        const m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, flatShading: true, fog: false })); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); spin.add(m); WOODS.push(m); } }
    if (L.snow) { const sm = snowman(.85); sm.position.set(2.05, 0, 3.1); sm.rotation.y = -.45; sm.traverse(o => { o.castShadow = true; }); spin.add(sm); }
    if (L.gifts) [0, Math.PI].forEach((ra, half) => GIFTS.forEach(([x, z, c, rc, q, h, up], i) => { // 앞뒤로 빙 둘러요 (트리와 같이 돌아요), 큰 상자는 더 크게
      const f = q >= .5 ? 1.4 : 1, cs = Math.cos(ra), sn = Math.sin(ra), g = gift(x * cs - z * sn, x * sn + z * cs, half ? OC[(i + 3) % 8] : c, q * f, h * f, rc, i + half); g.rotation.y += ra; if (up) g.position.y = up * 1.4; spin.add(g); }));
  }
  // 눈 내리기 (눈 레벨부터): 작은 눈송이가 천천히 내려요. 별이 가려지지 않게 적게
  let snowP = null;
  if (L.snow) { const n = 500, p = new Float32Array(n * 3); for (let k = 0; k < n; k++) { p[k * 3] = (Math.random() - .5) * 26; p[k * 3 + 1] = Math.random() * 16; p[k * 3 + 2] = (Math.random() - .5) * 22; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); snowP = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: .07, transparent: true, opacity: .85, depthWrite: false })); sc.add(snowP); }
  const hh = Math.max(top, 1), dist = L.tree ? 4.2 + 9.8 * L.tree : 3.4;
  const cam = new T.PerspectiveCamera(34, W0() / H0(), .05, 200);
  let tilt = .12, zoom = 1, ly = null, look = 0; // 위아래 각도, 확대(두 손가락), 확대했을 때 보는 높이
  const aim = () => { const asp = W0() / H0(), dd = dist * (asp < .8 ? Math.max(1.08, .68 / asp) : 1) * zoom, ty0 = hh * (asp < .6 ? .42 : .47), ty = zoom < .95 && ly != null ? ly : ty0; cam.position.set(0, ty + Math.sin(tilt) * dd, Math.cos(tilt) * dd); cam.lookAt(0, ty + look * dd * .6, -look * dd * .15); };
  aim();
  // 손가락으로 돌리기 + 천천히 혼자 돌기
  let rot = .3, v = .003, drag = null, sway = 0, alive = true;
  const cvs = r.domElement;
  let dragY = 0;
  const pts = new Map(); let pinch = 0;
  const pd = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const setZoom = z => { const was = zoom; zoom = Math.max(.3, Math.min(1.25, z)); if (zoom < .95 && ly == null) ly = hh * .5; if (zoom >= .95) ly = null; if (was !== zoom) aim(); };
  // 오너먼트 달기: place()로 시작하면 트리를 톡 눌러 자리를 고르고, 한 손가락으로 겉면을 따라 옮기고, 두 손가락으로 크기·방향을 바꿔요
  let placing = null, moving = false, tap0 = null, tw = 0;
  const rcP = new T.Raycaster(), ndc = e => { const b = cvs.getBoundingClientRect(); return new T.Vector2((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); };
  const scr = o => { const p = o.getWorldPosition(new T.Vector3()).project(cam), b = cvs.getBoundingClientRect(); return { x: b.left + (p.x + 1) / 2 * b.width, y: b.top + (1 - p.y) / 2 * b.height, p }; };
  const hitTree = e => { if (!t) return null; rcP.setFromCamera(ndc(e), cam); const h = rcP.intersectObject(t, false)[0]; if (!h) return null; const lp = spin.worldToLocal(h.point.clone()); const hr_ = lp.y / top; if (hr_ > .86) return null; // 꼭대기 별 자리엔 못 달아요
    return [Math.atan2(lp.z, lp.x), Math.max(0, Math.min(1, hr_))]; };
  const setPlace = (a, h) => { if (!placing || !hangOrn) return; const p = placing; p.spot = [a, h, p.spot ? p.spot[2] : 1, p.spot ? p.spot[3] : 0];
    if (!p.m) { p.m = ornMake(p.o, OBs()); p.m.scale.setScalar(p.spot[2]); }
    p.o.spot = p.spot; const sz = p.spot[2]; p.m.scale.setScalar(1); hangOrn(p.o, p.m); p.m.scale.setScalar(sz); p.m.position.add(new T.Vector3()); if (opt.onPlace) opt.onPlace(p.spot); };
  const OBs = () => 1.25 * Math.max(L.tree || .55, .55);
  const twist = () => { const [a, b] = [...pts.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  cvs.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { pinch = pd(); tw = twist(); drag = null; moving = false; tap0 = null; return; }
    tap0 = { x: e.clientX, y: e.clientY, at: Date.now() }; moving = false;
    if (placing && placing.m) { const q = scr(placing.m); if (Math.hypot(q.x - e.clientX, q.y - e.clientY) < 48) { moving = true; return; } }
    drag = e.clientX; dragY = e.clientY; });
  const onMove = e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const d2 = pd(), a2 = twist();
      if (placing && placing.m && placing.spot) { if (pinch) placing.spot[2] = Math.max(.7, Math.min(1.5, placing.spot[2] * d2 / pinch)); placing.spot[3] += a2 - tw; setPlace(placing.spot[0], placing.spot[1]); }
      else if (pinch) setZoom(zoom * pinch / d2);
      pinch = d2; tw = a2; return; }
    if (moving) { const h = hitTree(e); if (h) setPlace(h[0], h[1]); return; }
    if (drag == null) return; const dx = e.clientX - drag, dy = e.clientY - dragY; rot += dx * .01; skyRot += dx * .0033; v = placing ? 0 : dx * .0015; drag = e.clientX; dragY = e.clientY;
    if (zoom < .95) ly = Math.max(hh * .08, Math.min(hh * 1.02, ly + dy * .012 * Math.max(1, hh / 4))); // 확대 중엔 위아래로 밀면 보는 높이가 바뀌어요
    else if (look > 0 || (tilt <= -.05 && dy < 0)) look = Math.max(0, Math.min(1, look - dy * .004)); // 끝까지 위로 밀면 하늘을 올려다봐요
    else tilt = Math.max(-.05, Math.min(1.1, tilt + dy * .006));
    aim(); };
  addEventListener('pointermove', onMove);
  const up = e => {
    const tp = tap0 && pts.size === 1 && Math.hypot(e.clientX - tap0.x, e.clientY - tap0.y) < 10 && Date.now() - tap0.at < 450; tap0 = null;
    pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) { drag = null; moving = false; } else { const [p] = pts.values(); drag = p.x; dragY = p.y; }
    if (!tp || e.target !== cvs) return;
    if (placing) { const h = hitTree(e); if (h) setPlace(h[0], h[1]); return; }
    rcP.setFromCamera(ndc(e), cam); const hit = rcP.intersectObjects(ORN, true)[0]; if (hit && opt.onTap) opt.onTap(hit.object.userData.orn); };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom * (e.deltaY > 0 ? 1.1 : .9)); }, { passive: false });
  const drops = []; let frame = 0;
  // 확대하면 가까운 오너먼트 위에 이름표가 떠요 (앞쪽에 보이는 것 중 화면 가운데에 가까운 8개)
  const tagBox = document.createElement('div'); tagBox.className = 'tree-tags'; el.appendChild(tagBox);
  const tags = () => { if (zoom > .62 || placing || !ORN.length) { if (tagBox.childElementCount) tagBox.innerHTML = ''; return; }
    const b = cvs.getBoundingClientRect(), list = [];
    ORN.forEach(m => { const w = m.getWorldPosition(new T.Vector3()), out = new T.Vector3(w.x, 0, w.z); if (out.dot(cam.position.clone().sub(w).setY(0)) <= 0) return; const p = w.clone().project(cam); if (Math.abs(p.x) > .95 || Math.abs(p.y) > .9) return; list.push({ m, x: (p.x + 1) / 2 * b.width, y: (1 - p.y) / 2 * b.height, d: Math.hypot(p.x, p.y) }); });
    list.sort((a, c) => a.d - c.d); tagBox.innerHTML = '';
    list.slice(0, 8).forEach(q => { const d = document.createElement('span'); d.textContent = q.m.userData.orn.nick || ''; if (q.m.userData.orn.mine) d.className = 'me'; d.style.left = q.x + 'px'; d.style.top = q.y + 'px'; tagBox.appendChild(d); }); };
  const onResize = () => { r.setSize(W0(), H0()); cam.aspect = W0() / H0(); cam.updateProjectionMatrix(); aim(); };
  addEventListener('resize', onResize);
  (function loop() {
    if (!alive) return;
    if (!document.body.contains(cvs)) { api.destroy(); return; }
    if (drag == null && !placing) { rot += v; v += (.003 - v) * .02; }
    if (++frame % 6 === 0) tags();
    for (let i = pops.length - 1; i >= 0; i--) { const o = pops[i]; const mn = o.userData.min || .15; o.material.size = Math.max(mn, o.material.size * .985); if (o.material.size <= mn) pops.splice(i, 1); }
    for (let i = fx.length - 1; i >= 0; i--) if (!fx[i]()) fx.splice(i, 1);
    if (snowP) { const a = snowP.geometry.attributes.position, tm = performance.now() / 1000; for (let k = 0; k < a.count; k++) { let y = a.getY(k) - .012 - (k % 5) * .002; if (y < 0) y = 16; a.setY(k, y); a.setX(k, a.getX(k) + Math.sin(tm + k) * .003); } a.needsUpdate = true; }
    skyG.rotation.y = skyRot; spin.rotation.y = rot;
    if (WOODS.length) { const wp = new T.Vector3(), c0 = cam.position.length(), fc = sc.fog ? sc.fog.color : new T.Color(0xffffff); WOODS.forEach(g => { g.getWorldPosition(wp); const dc = wp.distanceTo(cam.position); g.visible = dc > c0 * .8; const f = Math.round(Math.max(0, Math.min(.25, (dc - c0 * .8) / (c0 * 2))) * 40) / 40; if (g.userData.f !== f || g.userData.fc !== fc.getHex()) { g.userData.f = f; g.userData.fc = fc.getHex(); g.material.color.setScalar(1 - f); g.material.emissive.copy(fc).multiplyScalar(f); } }); }
    if (GLIT.length) { const wp = new T.Vector3(), wn = new T.Vector3(); GLIT.forEach(sp => { sp.getWorldPosition(wp); wn.copy(sp.userData.n).applyAxisAngle(new T.Vector3(0, 1, 0), rot); const d = wn.dot(cam.position.clone().sub(wp).normalize()), th = sp.userData.k; sp.material.opacity = Math.max(0, 1 - Math.abs(d - th) / .035); }); } spin.rotation.z = Math.sin(sway * 14) * sway * .05; sway = Math.max(0, sway - .016);
    for (let i = drops.length - 1; i >= 0; i--) { const dp = drops[i];
      if (dp.userData.wait > 0) { dp.userData.wait--; continue; } dp.visible = true;
      if (dp.userData.sp != null) { dp.userData.sp++; dp.scale.setScalar(1 + dp.userData.sp * .25); dp.material.opacity = .7 - dp.userData.sp * .07; if (dp.userData.sp > 9) { sc.remove(dp); drops.splice(i, 1); } continue; }
      dp.userData.vy += .006; dp.position.y -= dp.userData.vy;
      if (dp.position.y < dp.userData.end) { dp.geometry = SPLASH; dp.material = dp.material.clone(); dp.scale.set(1, 1, 1); dp.userData.sp = 0; } }
    r.render(sc, cam); requestAnimationFrame(loop);
  })();
  const api = {
    water(k = 1) { // 작은 물방울 40개가 비처럼 차례로 떨어지고 톡 퍼져요, 그다음 준 물만큼 별 (여러 개면 차례로)
      sway = 1; for (let j = 0; j < Math.min(k, 60); j++) setTimeout(() => { if (alive) skyStar(); }, 1100 + j * 160); const m = fm(0x7fd0ff, { roughness: .15, transparent: true, opacity: .85 }), w = Math.max(1.2, hh * .38), r0 = .028 * Math.max(1, hh / 3);
      if (!DROP || DROP.r !== r0) { DROP = new T.IcosahedronGeometry(r0, 0); DROP.r = r0; SPLASH = new T.RingGeometry(r0 * .6, r0 * 1.4, 10); SPLASH.rotateX(-Math.PI / 2); }
      for (let k = 0; k < 40; k++) { const dp = new T.Mesh(DROP, m); dp.scale.y = 1.6; const x = (Math.random() - .5) * 2 * w, z = (Math.random() - .5) * 2 * w * .7 + w * .2;
        dp.position.set(x, hh * 1.25 + Math.random() * hh * .3, z); dp.visible = false; dp.userData = { wait: Math.floor(Math.random() * 45), vy: .02 + Math.random() * .02, end: Math.max(.02, (1 - Math.min(1, Math.hypot(x, z) / (w * 1.3))) * hh * .8) }; sc.add(dp); drops.push(dp); } },
    celebrate() { // 편지가 열리는 순간: 하늘을 올려다보면 별똥별이 쏟아져요
      lookTo(.8, 50, () => { for (let k = 0; k < 14; k++) setTimeout(() => { if (!alive) return; const to = seenPos(); shoot(to, () => { if (starA) dot(to, k % 3 === 0); }); }, k * 220); setTimeout(() => { if (alive && drag == null) lookTo(0, 80); }, 5200); }); },
    place(o) { placing = { o: Object.assign({}, o, { spot: null }), m: null, spot: null }; v = 0; return !!hangOrn; },
    placed() { return placing && placing.spot ? placing.spot.map((x, i) => +x.toFixed(i === 2 ? 2 : 3)) : null; },
    move(id) { const m = ORN.find(x => x.userData.orn.id === id); if (!m || !hangOrn) return false; const o = m.userData.orn, p = m.position;
      const sp = o.spot ? o.spot.slice() : [Math.atan2(p.z, p.x), Math.max(0, Math.min(1, p.y / top)), 1, 0];
      ORN.splice(ORN.indexOf(m), 1); placing = { o, m, spot: sp, orig: o.spot ? o.spot.slice() : null, origPos: p.clone(), origQ: m.quaternion.clone() }; v = 0; return true; },
    cancel() { if (placing && placing.m) { if (placing.origPos) { const p = placing; p.o.spot = p.orig; p.m.scale.setScalar(1); p.m.position.copy(p.origPos); p.m.quaternion.copy(p.origQ); if (p.orig) p.m.scale.setScalar(p.orig[2]); ORN.push(p.m); } else spin.remove(placing.m); } placing = null; },
    commit() { if (placing && placing.m) ORN.push(placing.m); placing = null; },
    add(o) { if (!hangOrn) return; const m = hangOrn(o); if (m) ORN.push(m); },
    recolor(id, from, to) { const a = new T.Color(OC[from]), b = OC[to]; ORN.filter(m => m.userData.orn.id === id).forEach(m => { m.userData.orn.color = to; m.traverse(c => { if (c.material && c.material.color && c.material.color.equals(a)) c.material.color.set(b); }); }); },
    remove(id) { ORN.filter(m => m.userData.orn.id === id).forEach(m => { spin.remove(m); ORN.splice(ORN.indexOf(m), 1); }); },
    destroy() { alive = false; removeEventListener('resize', onResize); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); removeEventListener('pointermove', onMove); try { r.dispose(); } catch (err) { /* 괜찮아요 */ } cvs.remove(); },
  };
  return api;
}

// 오너먼트 작성 창 미리보기: 모양·색을 바꾸면 바로 바뀌고, 손가락으로 돌려 볼 수 있어요
export function preview(el, o) {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true }), W = () => el.clientWidth || 200, Hh = () => el.clientHeight || 180;
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(W(), Hh()); r.toneMapping = T.ACESFilmicToneMapping; r.outputColorSpace = T.SRGBColorSpace;
  el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(30, W() / Hh(), .01, 20); cam.position.set(0, 0, 2.1); cam.lookAt(0, 0, 0);
  sc.add(new T.HemisphereLight(0xffffff, 0x50605a, 1.8)); const d = new T.DirectionalLight(0xfff4e0, 2.4); d.position.set(1.5, 2, 2.5); sc.add(d);
  const g = new T.Group(); sc.add(g); let m = null, ry = .5, rx = .15, vy = .01, drag = null, alive = true;
  const set = q => { if (m) g.remove(m); m = q.shape === 3 ? (() => { const g = new T.Group(), s = snowman(.36, OC[q.color]); s.position.y = -.32; g.add(s); return g; })() : q.shape === 1 ? sock(.42, OC[q.color]) : q.shape === 2 ? star5(.2, OC[q.color]) : bead(.2, OC[q.color]); g.add(m); };
  set(o);
  r.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; r.domElement.setPointerCapture(e.pointerId); });
  r.domElement.addEventListener('pointermove', e => { if (!drag) return; vy = (e.clientX - drag.x) * .012; ry += vy; rx = Math.max(-1.2, Math.min(1.2, rx + (e.clientY - drag.y) * .012)); drag = { x: e.clientX, y: e.clientY }; });
  r.domElement.addEventListener('pointerup', () => { drag = null; vy = Math.max(-.05, Math.min(.05, vy)); });
  (function loop() { if (!alive || !document.body.contains(r.domElement)) { alive = false; try { r.dispose(); } catch (err) { /* 괜찮아요 */ } return; } if (!drag) { ry += vy; vy += (.01 - vy) * .03; } g.rotation.set(rx, ry, 0); r.render(sc, cam); requestAnimationFrame(loop); })();
  return { set, destroy() { alive = false; try { r.dispose(); } catch (err) { /* 괜찮아요 */ } r.domElement.remove(); } };
}
