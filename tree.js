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
const BC = [0xe8453c, 0xff9a3c, 0xf5c83c, 0xb7e07a, 0x7fd0e8, 0x3f6fe0, 0x9b6ee8, 0xff8fc0, 0xf4f4f0, 0xd4a94a];
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
  sc.add(new T.HemisphereLight(night ? 0xc8dcff : 0xffffff, 0x40504a, night ? 1.1 : 1.6));
  const d = new T.DirectionalLight(sky === 'sunset' ? 0xffc29a : sky === 'dawn' ? 0xffd6e4 : night ? 0xe8f0ff : 0xfff1dc, night ? 1.5 : 2.2); d.position.set(4, 9, 6); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -6, right: 6, top: 8, bottom: -2 }); sc.add(d);
  const rim = new T.DirectionalLight(0x9fe6d6, .6); rim.position.set(-5, 4, -6); sc.add(rim);
  const L = opt.lv; seed = 9;
  // 하늘 별 = 물 준 숲별 수 (최대 400개)
  if (starA) { const p = [], n = Math.min(400, 20 + (opt.people || 0)); for (let k = 0; k < n; k++) p.push((rnd() - .5) * 44, 4 + rnd() * 18, -18); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); sc.add(new T.Points(g, new T.PointsMaterial({ color: 0xfff3c8, size: .15, transparent: true, opacity: starA }))); }
  const hill = new T.Mesh(new T.CylinderGeometry(10, 10.5, .6, 24), fm(0xe6eef4, { roughness: 1, flatShading: false })); hill.position.y = -.3; hill.receiveShadow = true; sc.add(hill);
  const PLAIN = treeMesh(false), SNOWY = null;
  // 뒤쪽 숲: 단순한 뾰족 나무·동그란 나무 (레벨마다 늘어나요)
  const FG = [0x4f7f5a, 0x5e8f62, 0x6f9a6a], fz = new T.Color(s1);
  for (let k = 0; k < (L.forest || 0) * 2; k++) {
    const g = new T.Group(), a = Math.PI * (1.05 + .9 * ((k * .618) % 1)), rad = 7 + (k % 3) * 1.8, sz = .7 + (k % 4) * .18, col = new T.Color(FG[k % 3]).lerp(fz, .25 + (k % 3) * .1);
    const tk = new T.Mesh(new T.CylinderGeometry(.08 * sz, .1 * sz, .5 * sz, 5), fm(new T.Color(0x8a6a4a).lerp(fz, .3))); tk.position.y = .25 * sz; g.add(tk);
    if (k % 3 === 2) { const b = new T.Mesh(new T.IcosahedronGeometry(.55 * sz, 0), fm(col)); b.position.y = .9 * sz; g.add(b); }
    else [0, 1, 2].forEach(j => { const c = new T.Mesh(new T.ConeGeometry((.6 - j * .15) * sz, .7 * sz, 6), fm(col)); c.position.y = (.7 + j * .42) * sz; g.add(c); });
    g.position.set(Math.cos(a) * rad * 1.2, 0, Math.sin(a) * rad - 2); g.rotation.y = k; sc.add(g);
  }
  const spin = new T.Group(); sc.add(spin);
  let top = 1, addStar = null; const pops = [];
  if (!L.tree) { // 씨앗·새싹
    const soil = new T.Mesh(new T.CylinderGeometry(.55, .65, .14, 9), fm(0x6e4a2c, { roughness: 1 })); soil.position.y = .07; spin.add(soil);
    if (L.sprout) { const st = new T.Mesh(new T.CylinderGeometry(.035, .045, .55, 6), fm(0x4e8f3a)); st.position.y = .4; spin.add(st); [-1, 1].forEach(k => { const lf = new T.Mesh(new T.IcosahedronGeometry(.2, 1), fm(0x7fd468)); lf.scale.set(1.5, .35, .75); lf.position.set(k * .2, .68, 0); lf.rotation.z = k * .4; spin.add(lf); }); top = .9; }
    else { const sd = new T.Mesh(new T.IcosahedronGeometry(.2, 1), fm(0xa06d40)); sd.scale.set(1, .8, 1); sd.position.y = .22; spin.add(sd); top = .5; }
  } else {
    const t = (SNOWY || PLAIN).clone(); t.scale.setScalar(L.tree); spin.add(t); top = H * L.tree; t.updateMatrixWorld(true);
    const rc = new T.Raycaster(), hs = top;
    // 겉면 자리 + 그 자리의 바깥 방향
    const surf = (y, a, off) => { rc.set(new T.Vector3(Math.cos(a) * 12, y, Math.sin(a) * 12), new T.Vector3(-Math.cos(a), 0, -Math.sin(a))); const h = rc.intersectObject(t, false)[0]; if (!h) return null; const nrm = h.face.normal.clone().transformDirection(t.matrixWorld); return { p: h.point.add(nrm.clone().multiplyScalar(off)), n: nrm }; };
    const hang = (o, s) => { o.position.copy(s.p); o.lookAt(s.p.clone().add(s.n)); o.rotateZ((rnd() - .5) * .5); o.castShadow = true; spin.add(o); };
    const ft = FT * L.tree, nB = L.beads || 0, nS = L.socks || 0, used = [];
    // 빈 자리 찾기: 다른 장식과 gap 이상 떨어진 겉면 (여러 번 시도)
    const spot = (gap, off) => { for (let tr = 0; tr < 14; tr++) { const y = ft + .3 * L.tree + rnd() * (hs - ft - 1.0 * L.tree), s = surf(y, rnd() * 6.283, off); if (s && used.every(u => u.p.distanceTo(s.p) > u.r + gap)) return s; } return null; };
    for (let k = 0; k < nB + nS; k++) {
      const sz = (.7 + rnd() * .5) * Math.max(L.tree, .55), sock_ = k >= nB, r = (sock_ ? .2 : .11) * sz, s = spot(r + .05, sock_ ? .06 * sz : .09 * sz); if (!s) continue;
      used.push({ p: s.p, r }); hang(sock_ ? sock(.3 * sz, SC[Math.floor(rnd() * SC.length)]) : bead(.1 * sz, BC[Math.floor(rnd() * BC.length)]), s);
    }
    // 물 한 번 = 작은 별 하나 (120개까지, 그 뒤로는 별이 더 반짝여요)
    const SW = Math.max(L.tree, .55), glow = Math.min(1, Math.max(0, ((opt.water || 0) - 120) / 280));
    const starM = [0xffd54a, 0xfff3c8, 0xffb84a].map(c => fm(c, { emissive: c, emissiveIntensity: (night ? .5 : .15) + glow * .6, roughness: .4 }));
    addStar = pop => { const s = spot(.07 * SW, .04 * SW); if (!s) return; const st = star5(.065 * SW, 0); st.material = starM[Math.floor(rnd() * 3)]; used.push({ p: s.p, r: .06 * SW }); hang(st, s); if (pop) { st.scale.setScalar(.01); pops.push(st); } };
    for (let k = 0; k < Math.min(120, opt.water || 0); k++) addStar(false);
    if (L.star) { const st = star5(.48, 0xffcf3a); st.material.emissive = new T.Color(0xd09000); st.material.emissiveIntensity = night ? .9 : .3; st.position.set(0, top + .25, 0); spin.add(st); }
    if (L.gifts) GIFTS.forEach(([x, z, c, rc, q, h, up], i) => { const g = gift(x, z, c, q, h, rc, i); if (up) g.position.y = up; sc.add(g); });
  }
  const hh = Math.max(top, 1), dist = L.tree ? 4.2 + 9.8 * L.tree : 3.4;
  const cam = new T.PerspectiveCamera(34, W0() / H0(), .05, 200);
  let tilt = .12; // 위아래 보는 각도 (손가락 위아래로 바꿈)
  const aim = () => { const asp = W0() / H0(), dd = dist * (asp < .8 ? Math.max(1.08, .68 / asp) : 1), ty = hh * (asp < .6 ? .42 : .47); cam.position.set(0, ty + Math.sin(tilt) * dd, Math.cos(tilt) * dd); cam.lookAt(0, ty, 0); };
  aim();
  // 손가락으로 돌리기 + 천천히 혼자 돌기
  let rot = .3, v = .003, drag = null, sway = 0, alive = true;
  const cvs = r.domElement;
  let dragY = 0;
  cvs.addEventListener('pointerdown', e => { drag = e.clientX; dragY = e.clientY; });
  addEventListener('pointermove', e => { if (drag == null) return; const dx = e.clientX - drag; rot += dx * .01; v = dx * .0015; drag = e.clientX; tilt = Math.max(-.05, Math.min(1.1, tilt + (e.clientY - dragY) * .006)); dragY = e.clientY; aim(); });
  addEventListener('pointerup', () => { drag = null; });
  const drops = [];
  const onResize = () => { r.setSize(W0(), H0()); cam.aspect = W0() / H0(); cam.updateProjectionMatrix(); aim(); };
  addEventListener('resize', onResize);
  (function loop() {
    if (!alive) return;
    if (!document.body.contains(cvs)) { api.destroy(); return; }
    if (drag == null) { rot += v; v += (.003 - v) * .02; }
    for (let i = pops.length - 1; i >= 0; i--) { const o = pops[i], k = Math.min(1, o.scale.x + .05); o.scale.setScalar(k); if (k >= 1) pops.splice(i, 1); }
    spin.rotation.y = rot; spin.rotation.z = Math.sin(sway * 14) * sway * .05; sway = Math.max(0, sway - .016);
    for (let i = drops.length - 1; i >= 0; i--) { const dp = drops[i];
      if (dp.userData.wait > 0) { dp.userData.wait--; continue; } dp.visible = true;
      if (dp.userData.sp != null) { dp.userData.sp++; dp.scale.setScalar(1 + dp.userData.sp * .25); dp.material.opacity = .7 - dp.userData.sp * .07; if (dp.userData.sp > 9) { sc.remove(dp); drops.splice(i, 1); } continue; }
      dp.userData.vy += .006; dp.position.y -= dp.userData.vy;
      if (dp.position.y < dp.userData.end) { dp.geometry = SPLASH; dp.material = dp.material.clone(); dp.scale.set(1, 1, 1); dp.userData.sp = 0; } }
    r.render(sc, cam); requestAnimationFrame(loop);
  })();
  const api = {
    water() { // 작은 물방울 40개가 비처럼 차례로 떨어지고 톡 퍼져요, 그다음 별 하나
      sway = 1; if (addStar) setTimeout(() => { if (alive) addStar(true); }, 1100); const m = fm(0x7fd0ff, { roughness: .15, transparent: true, opacity: .85 }), w = Math.max(1.2, hh * .38), r0 = .028 * Math.max(1, hh / 3);
      if (!DROP || DROP.r !== r0) { DROP = new T.IcosahedronGeometry(r0, 0); DROP.r = r0; SPLASH = new T.RingGeometry(r0 * .6, r0 * 1.4, 10); SPLASH.rotateX(-Math.PI / 2); }
      for (let k = 0; k < 40; k++) { const dp = new T.Mesh(DROP, m); dp.scale.y = 1.6; const x = (Math.random() - .5) * 2 * w, z = (Math.random() - .5) * 2 * w * .7 + w * .2;
        dp.position.set(x, hh * 1.25 + Math.random() * hh * .3, z); dp.visible = false; dp.userData = { wait: Math.floor(Math.random() * 45), vy: .02 + Math.random() * .02, end: Math.max(.02, (1 - Math.min(1, Math.hypot(x, z) / (w * 1.3))) * hh * .8) }; sc.add(dp); drops.push(dp); } },
    destroy() { alive = false; removeEventListener('resize', onResize); try { r.dispose(); } catch (err) { /* 괜찮아요 */ } cvs.remove(); },
  };
  return api;
}
