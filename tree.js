// 숲별 트리 3D (트리 화면에 들어갈 때만 불러와요)
import * as T from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

// 하늘: 폰 시간 기준 새벽·낮·노을·밤
let DROP = null, SPLASH = null;
export function skyNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'sunset' : 'night';
}
const SKY = { dawn: ['#a99ad8', '#f7c6cf', .35], day: ['#9fd3f2', '#e8f6fb', 0], sunset: ['#4b3f86', '#f6a06a', .45], night: ['#060b1a', '#16303a', 1] };

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
const PTEX = {}; let pPick = null, pgCur = 0; const PICK = new T.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffc83a, emissiveIntensity: .6, roughness: .6 });
let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const fm = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, flatShading: true }, o));
// 면마다 살짝 다른 색 (아래 진초록 → 위 연두), snow면 윗면을 눈으로
function treeMesh(snow, dk = 0) {
  const g = SRC.clone(), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const G0 = new T.Color(0x3f8a34).lerp(new T.Color(0x084e52), dk), G1 = new T.Color(0x8fd968).lerp(new T.Color(0x2c9690), dk), B = new T.Color(0xb57a48), S = new T.Color(0xeef4fb);
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
  m.castShadow = m.receiveShadow = true;
  if (snow) { // 층 끝 윗면에 두툼한 눈 (위로 들어 올린 흰 판)
    const bins = new Array(41).fill(0), bi = y => Math.min(40, Math.max(0, Math.round(y / H * 40))), sp = [];
    for (let i = 0; i < n; i++) { const k = bi(p.getY(i)); bins[k] = Math.max(bins[k], Math.hypot(p.getX(i), p.getZ(i))); }
    for (let i = 0; i < n; i += 3) {
      let cy = 0, cr = 0; for (let j = 0; j < 3; j++) { cy += p.getY(i + j) / 3; cr += Math.hypot(p.getX(i + j), p.getZ(i + j)) / 3; }
      if (cy < FT + .1) continue;
      const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i), az = p.getZ(i + 1) - p.getZ(i), bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i), bz = p.getZ(i + 2) - p.getZ(i);
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, ln = Math.hypot(nx, ny, nz) || 1;
      if (ny / ln < .55 || cr < (bins[bi(cy)] || 1) * .78) continue;
      for (let j = 0; j < 3; j++) { const x = p.getX(i + j), z = p.getZ(i + j), r = Math.hypot(x, z) || 1, o = .05 + .03 * Math.sin(x * 7 + z * 5); sp.push(x + x / r * .02, p.getY(i + j) + o, z + z / r * .02); }
    }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sg.computeVertexNormals();
    const sm = new T.Mesh(sg, new T.MeshStandardMaterial({ color: 0xf6f9fd, emissive: 0x9aa8b8, emissiveIntensity: .3, roughness: 1, flatShading: true, side: T.DoubleSide })); sm.castShadow = true; m.add(sm);
  }
  return m;
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
// 동물 눈사람 (Lv8): 0 곰 · 1 고양이 · 2 병아리 · 3 토끼. 얼굴은 점 눈 + 볼터치, 동물 특징만 얹어요
export function animalSnow(sz, kind, my = {}) { // my: { c 목도리 색, f 얼굴 그림(dataURL) } 이 폰에서만
  const g = new T.Group(), w = fm(0xfbfdff, { roughness: .8 }), blk = fm(0x1d1d22), pk = fm(0xffb3c1, { roughness: .9 });
  const b1 = new T.Mesh(new T.IcosahedronGeometry(sz * .5, 1), w); b1.position.y = sz * .5; const b2 = new T.Mesh(new T.IcosahedronGeometry(sz * .36, 1), w); b2.position.y = sz * 1.15; g.add(b1, b2);
  [-1, 1].forEach(k => { const e = new T.Mesh(new T.SphereGeometry(sz * .033, 8, 6), blk); e.position.set(k * sz * .12, sz * 1.24, sz * .33); e.userData.face = 1; g.add(e); const hl = new T.Mesh(new T.SphereGeometry(sz * .011, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(k * sz * .12 + sz * .011, sz * 1.252, sz * .36); hl.userData.face = 1; g.add(hl);
    const ch = new T.Mesh(new T.SphereGeometry(sz * .06, 6, 4), pk); ch.scale.set(1, .6, .4); ch.position.set(k * sz * .21, sz * 1.13, sz * .29); ch.userData.face = 1; g.add(ch); });
  const scarf = c0 => { const c = my.c != null ? my.c : c0; const sf = new T.Mesh(new T.TorusGeometry(sz * .37, sz * .065, 6, 14), fm(c)); sf.rotation.x = Math.PI / 2; sf.position.y = sz * .88; g.add(sf); const tl = new T.Mesh(new T.BoxGeometry(sz * .12, sz * .35, sz * .05), fm(c)); tl.position.set(sz * .2, sz * .72, sz * .42); tl.rotation.z = .2; g.add(tl); };
  if (kind === 0) { [-1, 1].forEach(k => { const e = new T.Mesh(new T.IcosahedronGeometry(sz * .11, 1), w); e.scale.z = .7; e.position.set(k * sz * .25, sz * 1.42, 0); g.add(e); const i = new T.Mesh(new T.SphereGeometry(sz * .055, 6, 4), pk); i.scale.z = .4; i.position.set(k * sz * .25, sz * 1.42, sz * .07); g.add(i); });
    const n = new T.Mesh(new T.SphereGeometry(sz * .045, 6, 4), blk); n.position.set(0, sz * 1.15, sz * .36); n.userData.face = 1; g.add(n); scarf(0x9a6a44); }
  else if (kind === 1) { [-1, 1].forEach(k => { const e = new T.Mesh(new T.ConeGeometry(sz * .11, sz * .2, 4), w); e.position.set(k * sz * .2, sz * 1.47, 0); e.rotation.z = -k * .35; g.add(e); });
    const n = new T.Mesh(new T.SphereGeometry(sz * .035, 6, 4), pk); n.position.set(0, sz * 1.16, sz * .36); n.userData.face = 1; g.add(n); scarf(0xf0a040); }
  else if (kind === 2) { const bk = new T.Mesh(new T.SphereGeometry(sz * .05, 10, 8), fm(0xffbf2a, { roughness: .5 })); bk.scale.z = .5; bk.position.set(0, sz * 1.13, sz * .355); bk.userData.face = 1; g.add(bk);
    const cp = new T.Mesh(new T.CylinderGeometry(sz * .37, sz * .62, sz * .72, 14, 1, true, Math.PI * .35, Math.PI * 1.3), fm(my.c != null ? my.c : 0xd8343e, { side: T.DoubleSide })); cp.position.y = sz * .6; g.add(cp);
    const col = new T.Mesh(new T.TorusGeometry(sz * .37, sz * .055, 6, 14), fm(my.c != null ? my.c : 0xd8343e)); col.rotation.x = Math.PI / 2; col.position.y = sz * .9; g.add(col); }
  else { [-1, 1].forEach(k => { const e = new T.Mesh(new T.IcosahedronGeometry(sz * .08, 1), w); e.scale.set(1, 3.2, .7); e.position.set(k * sz * .12, sz * 1.6, 0); e.rotation.z = -k * .12; g.add(e); const i = new T.Mesh(new T.SphereGeometry(sz * .04, 6, 4), pk); i.scale.set(1, 4.5, .4); i.position.set(k * sz * .12, sz * 1.62, sz * .05); i.rotation.z = -k * .12; g.add(i); });
    const n = new T.Mesh(new T.SphereGeometry(sz * .035, 6, 4), pk); n.position.set(0, sz * 1.16, sz * .36); n.userData.face = 1; g.add(n); scarf(0x8ec5e8); }
  g.children.filter(o => o.userData.face).forEach(o => g.remove(o)); // 얼굴은 처음엔 비워 두고, 그린 사람만 그 그림으로
  (my.it || []).forEach(o => { const ph = Math.PI * .5 - .75 + o.u / 256 * 1.5, th = Math.PI * .5 - .75 + o.v / 256 * 1.5, r = sz * .37, d = new T.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)), p = d.clone().multiplyScalar(r).add(new T.Vector3(0, sz * 1.15, 0));
    const m = o.t === 'c' ? new T.Mesh(new T.ConeGeometry(sz * .055, sz * .3, 8), fm(0xff8a2a)) : new T.Mesh(new T.CylinderGeometry(sz * .045, sz * .045, sz * .03, 12), fm(0x1d1d22, { roughness: .4 }));
    m.position.copy(o.t === 'c' ? p.clone().add(d.clone().multiplyScalar(sz * .14)) : p); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); g.add(m); }); // 단추(눈)·당근(코)
  if (my.f) { const tx = new T.TextureLoader().load(my.f); tx.colorSpace = T.SRGBColorSpace;
    const fc = new T.Mesh(new T.SphereGeometry(sz * .368, 12, 8, Math.PI * .5 - .75, 1.5, Math.PI * .5 - .75, 1.5), new T.MeshStandardMaterial({ map: tx, transparent: true, depthWrite: false, roughness: .8, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2 })); fc.position.y = sz * 1.15; g.add(fc); }
  g.traverse(o => { o.castShadow = true; }); return g;
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
  const skyG = new T.Group(); skyG.scale.setScalar(2); sc.add(skyG); // 하늘을 숲 나무보다 멀리 (별이 나무 앞에 보이지 않게)
  const AUR = { t: { value: 0 } };
  const MET = { list: [], t: 0, geo: new T.PlaneGeometry(11, 1.35), tex: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 236, 0); g.addColorStop(0, 'rgba(255,243,200,0)'); g.addColorStop(1, 'rgba(255,243,200,.85)'); x.fillStyle = g; x.fillRect(0, 15, 236, 2);
    const h = x.createRadialGradient(236, 16, 0, 236, 16, 6); h.addColorStop(0, 'rgba(255,255,240,1)'); h.addColorStop(.35, 'rgba(255,243,200,.8)'); h.addColorStop(1, 'rgba(255,243,200,0)'); x.fillStyle = h; x.fillRect(229, 9, 14, 14); return new T.CanvasTexture(c); })() }; // 편지 열릴 때 별똥별처럼: 빛나는 머리 + 노란 꼬리
  const metGo = f0 => {
        const fw = new T.Vector3(); cam.getWorldDirection(fw); const up = cam.up.clone().applyQuaternion(cam.quaternion).normalize(), rt = fw.clone().cross(up).normalize(), dir = 1;
        const m = new T.Mesh(MET.geo, new T.MeshBasicMaterial({ map: MET.tex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
        const D = cam.position.length() + 40, hh = D * Math.tan(cam.fov * Math.PI / 360), hw = hh * cam.aspect; m.position.copy(cam.position).addScaledVector(fw, D).addScaledVector(up, hh * (.45 + Math.random() * .45)).addScaledVector(rt, hw * (Math.random() * 1.2 - .3) * dir);
        const v = rt.clone().multiplyScalar(-dir * .55).addScaledVector(up, -.3); m.quaternion.copy(cam.quaternion); m.rotateZ(Math.atan2(-.3, -dir * .55));
        m.scale.x = .55 + Math.random() * .8; m.userData = { v, f: f0 }; m.position.addScaledVector(v, f0); sc.add(m); MET.list.push(m); 
  };
  const SKY_A = [0, .6, -.6, 1.2, -1.2, 1.85, -1.85, 2.7], SKY_Y = [19, 21.5, 20, 22, 21, 20.5, 22, 21];
  CONST.forEach((c, ci) => { const a = SKY_A[ci], cx = c.p.reduce((s, q) => s + q[0], 0) / c.p.length * c.s, cy = c.p.reduce((s, q) => s + q[1], 0) / c.p.length * c.s;
    c.p.forEach(([x, y]) => { const dx = x * c.s - cx; CP.push({ ci, v: new T.Vector3(Math.sin(a) * SKY_R + Math.cos(a) * dx, SKY_Y[ci] + y * c.s - cy, -Math.cos(a) * SKY_R + Math.sin(a) * dx) }); }); });
  // 별끼리 너무 붙지 않게: 다른 별(별자리 별 포함)과 STAR_GAP보다 가까우면 다른 자리를 다시 찾아요
  const STAR_GAP = 1.1, used_ = CP.map(q => q.v), far = v => used_.every(u => u.distanceToSquared(v) > STAR_GAP * STAR_GAP);
  const starPos = () => { let v; for (let k = 0; k < 15; k++) { const a = rnd() * 6.283, R = 24 + rnd() * 6, y = 4 + rnd() * 30; v = new T.Vector3(Math.sin(a) * R, y, -Math.cos(a) * R); if (far(v)) break; } used_.push(v); return [v.x, v.y, v.z]; };
  const ptM = sz => new T.PointsMaterial({ color: 0xfff3c8, size: sz * 1.7, transparent: true, opacity: starA, fog: false });
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
  const shoot = (to, done_) => { const rtv = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); rtv.y = 0; rtv.normalize().applyAxisAngle(new T.Vector3(0, 1, 0), -skyG.rotation.y); const from = to.clone().addScaledVector(rtv, 9 + rnd() * 5).add(new T.Vector3(0, 7 + rnd() * 4, 0)), N = 8 + Math.floor(Math.random() * 12), hist = []; // 별똥별은 늘 화면 오른쪽 위 → 왼쪽 아래
    const head = new T.Points(new T.BufferGeometry().setFromPoints([from]), ptM(1.2)); skyG.add(head);
    const tg = new T.BufferGeometry().setFromPoints(Array(N).fill(from)), tail = new T.Line(tg, new T.LineBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: starA * .8, fog: false })); skyG.add(tail);
    let f = 0; const L = 70;
    fx.push(() => { f++; const k = Math.min(1, f / L), e = 1 - Math.pow(1 - k, 2), p = from.clone().lerp(to, e); head.geometry.setFromPoints([p]); hist.unshift(p); if (hist.length > N) hist.pop();
      tg.setFromPoints(hist.concat(Array(N - hist.length).fill(hist[hist.length - 1]))); tail.material.opacity = starA * .8 * (k < .85 ? 1 : (1 - k) / .15);
      if (k >= 1) { skyG.remove(head); skyG.remove(tail); done_(); return false; } return true; }); };
  // 카메라가 천천히 하늘을 올려다봤다가 돌아와요 (별자리 별이 켜질 때)
  const lookTo = (to, n, then) => { const from = look; let f = 0; fx.push(() => { f++; const k = Math.min(1, f / n), e = k * k * (3 - 2 * k); look = from + (to - from) * e; if (zoom >= .95) aim(); if (k >= 1) { if (then) then(); return false; } return true; }); };
  // 지금 화면에 보이는 하늘 자리 (위쪽 빈 하늘, 트리 뒤 먼 곳)
  const seenPos = () => { for (let k = 0; k < 12; k++) { const nx = (rnd() - .5) * 1.7, ny = .12 + rnd() * .43; if (Math.abs(nx) < .42 && ny < .45) continue; const n = new T.Vector3(nx, ny, .5).unproject(cam), dir = n.sub(cam.position).normalize(); if (dir.z > -.05) continue; const tt = (-50 - cam.position.z) / dir.z, p = cam.position.clone().add(dir.multiplyScalar(tt)); if (p.y > 6) { skyG.updateMatrixWorld(true); const lp = skyG.worldToLocal(p); if (!far(lp) && k < 11) continue; used_.push(lp); return lp; } } return new T.Vector3(...starPos()); };
  // 하늘을 돌려 그 별이 앞에 오게 (가까운 쪽으로)
  const skyTo = (a, n) => { const from = skyRot; let d = (a - from) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; let f = 0; fx.push(() => { f++; const k = Math.min(1, f / n), e = k * k * (3 - 2 * k); skyRot = from + d * e; return k < 1; }); };
  const skyStar = () => { const before = lit(); wn++; const q = lit() > before ? CP[lit() - 1] : null, fin = q && done(q.ci);
    const after = () => { if (fin) { drawLines(q.ci); label(opt.cName ? opt.cName(CONST[q.ci].n) : CONST[q.ci].n); setTimeout(() => { if (alive && opt.onConst) opt.onConst(CONST[q.ci].n); }, 1400); } };
    if (!starA) { after(); return null; }
    if (q) { skyTo(Math.atan2(q.v.x, -q.v.z), 50); lookTo(.8, 50, () => shoot(q.v, () => { dot(q.v, true); after(); setTimeout(() => { if (alive && drag == null) lookTo(0, 70); }, fin ? 4200 : 1800); })); }
    else dot(seenPos(), false);
    return null; };
  const hill = new T.Mesh(new T.CylinderGeometry(60, 60, .6, 48), fm(0xe6eef4, { roughness: 1, flatShading: false })); hill.position.y = -.3; hill.receiveShadow = true; sc.add(hill);
  const PLAIN = treeMesh(false, L.dk || 0), SNOWY = null;
  const spin = new T.Group(); sc.add(spin);
  let skyRot = 0, top = 1, t = null, surf = null, hangOrn = null, ornOff = null, ornMake = null; const pops = [], ORN = [], fx = [], GLIT = [], WOODS = [], LIGHTS = [], LANT = [], TLAN = [], FLY = [], PSLOT = [], SNOW4 = []; let sPlace = null, SZONE = null;
  const snowPut = (k, my) => { if (SNOW4[k]) { spin.remove(SNOW4[k]); SNOW4[k] = null; } if (!my || !my.p) return; const n = animalSnow(.85, k, my); n.position.set(my.p[0], 0, my.p[1]); n.rotation.y = Math.atan2(my.p[0], my.p[1]); n.userData.sk = k; spin.add(n); SNOW4[k] = n; };
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
    if (L.pola) { // 폴라로이드 줄: 겉면에서 살짝 띄운 끈에 15칸, 숲별이 고른 사진을 쪽마다 바꿔 걸어요 (빈 칸은 하얀 판)
      const P = [], N = []; for (let k = 0; k <= 120; k++) { const f = k / 120, s = surf(ft + .2 + f * (top * .8 - ft - .2), 1.2 + f * 6.283 * 1.8, .16); if (s) { P.push(s.p); N.push(s.n.clone().normalize()); } }
      if (P.length > 10) {
        const cu = new T.CatmullRomCurve3(P), rope = new T.Mesh(new T.TubeGeometry(cu, 240, .012, 5), fm(0xc9a77a, { roughness: .9 })); spin.add(rope);
        const fr = fm(0xfbfbf8, { roughness: .6 }), pin = fm(0xb98a5a), blank = fm(0xe9edf0, { roughness: .8 }), step = (P.length - 6) / 15;
        for (let i = 0; i < 15; i++) { const k = Math.round(4 + i * step), p = P[k], n = N[k], c = new T.Group(), sz = .34 * Math.max(.75, 1 - k / P.length * .35);
          const card = new T.Mesh(new T.BoxGeometry(sz, sz * 1.2, .012), fr); card.position.y = -sz * .62; c.add(card);
          const pic = new T.Mesh(new T.PlaneGeometry(sz * .84, sz * .84), blank); pic.position.set(0, -sz * .53, .007); c.add(pic);
          const cl = new T.Mesh(new T.BoxGeometry(sz * .1, sz * .26, sz * .08), pin); cl.position.y = -sz * .04; c.add(cl);
          c.position.copy(p); c.lookAt(p.clone().add(new T.Vector3(n.x, 0, n.z))); c.rotateZ((rnd() - .5) * .3); c.traverse(o => { o.castShadow = true; }); const cp = new T.Mesh(new T.PlaneGeometry(sz * .92, sz * .23), new T.MeshBasicMaterial({ transparent: true, depthWrite: false })); cp.position.set(0, -sz * 1.085, .007); cp.visible = false; c.add(cp); c.userData.cap = cp; c.userData.pic = pic; c.userData.blank = blank; spin.add(c); PSLOT.push(c); } } }
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
    if (L.aurora && night) { // 오로라 (Lv8~): 가는 세로 빛줄기가 촘촘한 커튼 — 아래는 밝은 초록으로 또렷이 끊기고, 위로 갈수록 청록→보라로 흐려져요. 은은하게, 하늘과 같이 돌아요
      [[-.9, 1.6, 37, 14.8, 6, .0], [.3, 1.5, 40, 15.6, 7, 1.7], [1.5, 1.4, 38, 15, 5.5, 3.1], [2.8, 1.6, 41, 15.7, 6.5, 4.6], [4.3, 1.5, 39, 15.2, 6, 6.2]].forEach(([a0, span, R0, y0, H, sd]) => { const W = 90, g = new T.PlaneGeometry(1, 1, W, 1), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = p.getY(i) + .5, an = a0 + (u - .5) * span, rr = R0 + Math.sin(u * 7 + sd) * 3 + Math.sin(u * 19 + sd) * .8; p.setXYZ(i, Math.sin(an) * rr, y0 + v * H * (.22 + 2.3 * u * u) + Math.sin(u * 5.3 + sd) * 2 + Math.sin(u * 9.7 + sd * 1.3) * 1.3 + Math.sin(u * 13 + sd) * .7, -Math.cos(an) * rr); }
        const m = new T.Mesh(g, new T.ShaderMaterial({ uniforms: { t: AUR.t, o: { value: .42 }, sd: { value: sd } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
          vertexShader: 'uniform float t; uniform float sd; varying vec2 vU; void main(){ vU = uv; vec3 q = position; vec2 n = normalize(q.xz); q.xz += n * (sin(uv.x * 11.0 + t * .25 + sd) * 1.8 + sin(uv.x * 27.0 - t * .4) * .5); gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0); }',
          fragmentShader: 'uniform float t; uniform float o; uniform float sd; varying vec2 vU; void main(){ float x = vU.x * 6.2832; float r = .5 + .5 * sin(x * 31.0 + t * .3 + sd); r *= .6 + .4 * sin(x * 73.0 - t * .5 + sd * 2.0); r = .4 + .6 * r * (.75 + .25 * sin(x * 151.0 + t * .8)); float v = vU.y; float a = smoothstep(0.0, .1, v) * (exp(-v * 1.7) * .72 + .28) * (1.0 - smoothstep(.55, 1.0, v)); float e = smoothstep(0.0, .1, vU.x) * (1.0 - smoothstep(.9, 1.0, vU.x)); vec3 g = vec3(.25, 1.0, .6), c = vec3(.2, .85, .9), p = vec3(.62, .32, 1.0); vec3 col = v < .22 ? mix(g, c, v / .22) : mix(c, p, smoothstep(.22, .72, v)); gl_FragColor = vec4(col, a * r * e * o * (.8 + .2 * sin(t * .3 + x * 2.0 + sd))); }' }));
        m.renderOrder = -1; skyG.add(m); }); }
    if (L.woods) { // 바닥 돌 (Lv5부터): 크고 작은 각진 돌을 둘레에 흩어 놓아요 (한 번에 그려서 가벼워요)
      let rs = 31; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647, n = 46, im = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), fm(0xf2f6fa, { roughness: 1, emissive: 0x8a96a2, emissiveIntensity: .35 }), n), mx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
      for (let k = 0; k < n; k++) { const a = rr() * 6.283, d = 3.6 + Math.pow(rr(), .7) * 16, s = (.12 + Math.pow(rr(), 2.5) * .8) * (1 + (d - 3.6) / 16);
        q.setFromEuler(e.set(rr() * 3, rr() * 3, rr() * 3)); mx.compose(new T.Vector3(Math.cos(a) * d, s * .25, Math.sin(a) * d), q, new T.Vector3(s * (1 + rr() * .6), s * (.5 + rr() * .4), s * (1 + rr() * .5))); im.setMatrixAt(k, mx); }
      im.castShadow = im.receiveShadow = true; spin.add(im); }
    if (L.woods) { // 둘레 숲: 각진 원뿔을 쌓은 단순한 나무 (한 그루 = 한 덩어리로 합쳐 가볍게), 트리와 같이 돌아요. 눈 레벨엔 끝이 하얗게
      let ws = 77; const wr = () => (ws = (ws * 16807) % 2147483647) / 2147483647, GC = [0x2f5a3c, 0x3a6b45, 0x274d36, 0x456f3a, 0x2c6050], SC = new T.Color(0xf2f6fa), TC = new T.Color(0x4a3426);
      const part = (geo, x, y, z, ry, rz, col, P, N, C) => { const g = geo.toNonIndexed(); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); const p = g.attributes.position.array, n = g.attributes.normal.array; for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) C.push(col.r, col.g, col.b); };
      const KC = new T.Color(0x2b2f33), GLM = new T.MeshStandardMaterial({ color: night || sky === 'sunset' ? 0xffe2b0 : 0xb9c4cc, emissive: 0xff9a3a, emissiveIntensity: night || sky === 'sunset' ? 1.5 : 0, roughness: .3, fog: false });
      for (let k = 0; k < L.woods; k++) { const a = wr() * 6.283, d = 12 + Math.pow(wr(), .8) * 16 * (L.wfar || 1), hs = .6 + Math.pow(wr(), 2) * (.7 + 2.6 * Math.min(1.4, (d - 12) / 16)), G = new T.Color(GC[k % GC.length]), nt = 2 + Math.floor(wr() * 3), seg = 5 + Math.floor(wr() * 3), fat = .55 + wr() * .8, P = [], N = [], C = [], TP = [];
        part(new T.CylinderGeometry(.12 * hs, .15 * hs, .5 * hs, 5), 0, .25 * hs, 0, 0, 0, TC, P, N, C);
        let y = .4 * hs; for (let j = 0; j < nt; j++) { const r = (.85 - j * .55 / nt) * hs * fat * (.9 + wr() * .2), h = (1.05 - j * .3 / nt) * hs * (.85 + wr() * .3), ry = wr() * 3, rz = (wr() - .5) * .08;
          part(new T.ConeGeometry(r, h, seg), 0, y + h / 2, 0, ry, rz, G, P, N, C);
          if (L.lights && d >= 18) for (let q = 0; q < seg; q++) { if ((Math.sin((k * 31 + j * 7 + q) * 12.9898) * 43758.5453 % 1 + 1) % 1 > .2) continue; const th = q / seg * 6.2832, lx = r * Math.sin(th), lz = r * Math.cos(th), cr = Math.cos(ry), sr = Math.sin(ry); TP.push([lx * cr + lz * sr, y, -lx * sr + lz * cr]); } // 나뭇잎 층 끝 꼭지점마다 랜턴
          if (L.snow) part(new T.ConeGeometry(r * .52, h * .52, seg), 0, y + h - h * .26 + .01, 0, ry, rz, SC, P, N, C); y += h * (.55 + wr() * .1); }
        const GP = [], GN = [], GC2 = []; TP.forEach(([x, y, z], q) => { const sc = .28 * hs, y0 = y - .5 * sc, ro = q * 1.7; // 가지 끝에 매달린 작은 랜턴: 틀은 나무와 한 덩어리, 유리는 따로(켜져요)
          part(new T.CylinderGeometry(.004 * hs + .01, .004 * hs + .01, .1 * sc, 3), x, y - .05 * sc, z, 0, 0, KC, P, N, C); part(new T.BoxGeometry(.27 * sc, .05 * sc, .27 * sc), x, y0 + .025 * sc, z, ro, 0, KC, P, N, C); part(new T.ConeGeometry(.2 * sc, .12 * sc, 4), x, y0 + .35 * sc, z, ro + Math.PI / 4, 0, KC, P, N, C);
          part(new T.BoxGeometry(.2 * sc, .24 * sc, .2 * sc), x, y0 + .17 * sc, z, ro, 0, KC, GP, GN, GC2); });
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
        const m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, flatShading: true })); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.userData.tier = d < 19 ? 0 : d < 28 ? 1 : d < 38 ? 2 : 3; spin.add(m); WOODS.push(m);
        if (GP.length) { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(GP, 3)); gg.setAttribute('normal', new T.Float32BufferAttribute(GN, 3)); m.add(new T.Mesh(gg, GLM)); } }
      if (GLM.emissiveIntensity) TLAN.push(GLM); }
    if (L.aurora) { // 눈 속 작은 등불 (Lv8~): 큰 트리에서 떨어진 숲 가장자리 눈 위에 랜턴, 밤·노을엔 촛불처럼 일렁여요
      let ls = 913; const lr = () => (ls = (ls * 16807) % 2147483647) / 2147483647, lit = night || sky === 'sunset', FR = fm(0x2b2f33, { roughness: .6, metalness: .4 });
      for (let c = 0; c < 14; c++) { const far = c >= 7, ca = c * .898 + (far ? .45 : 0) + lr() * .5, cd = far ? 22 + lr() * 18 : 8.5 + lr() * 10, nn = 1; // 가까운 숲 7개 + 저 멀리 숲 7개
        for (let j = 0; j < nn; j++) { const a = ca + (lr() - .5) * .12, d = cd + (lr() - .5) * 1.4, s = (1.1 + (d - 8) / 12 * .7) * (.8 + lr() * .35), fade = 1 - Math.min(.55, (d - 8) / 20), g = new T.Group();
          const glass = new T.Mesh(new T.BoxGeometry(.2, .26, .2), new T.MeshStandardMaterial({ color: lit ? 0xffe2b0 : 0xb9c4cc, emissive: 0xff9a3a, emissiveIntensity: lit ? 1.4 * fade : 0, roughness: .3, transparent: true, opacity: .9 }));
          glass.position.y = .2; g.add(glass);
          const base = new T.Mesh(new T.BoxGeometry(.27, .05, .27), FR); base.position.y = .045; g.add(base);
          const cap = new T.Mesh(new T.ConeGeometry(.2, .12, 4), FR); cap.rotation.y = Math.PI / 4; cap.position.y = .39; g.add(cap);
          const ring = new T.Mesh(new T.TorusGeometry(.045, .012, 4, 8), FR); ring.position.y = .48; g.add(ring);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => { const p = new T.Mesh(new T.BoxGeometry(.03, .28, .03), FR); p.position.set(x * .105, .2, z * .105); g.add(p); });
          g.children.forEach(m => { m.castShadow = true; });
          if (lit) { const halo = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: 0xffb060, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: .8 * fade })); halo.position.y = .22; halo.scale.setScalar(far ? 1.3 : .75); g.add(halo);
            const pool = new T.Mesh(new T.CircleGeometry(.75, 20), new T.MeshBasicMaterial({ map: GLOW, color: 0xffa050, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: .45 * fade })); pool.rotation.x = -Math.PI / 2; pool.position.y = .015; g.add(pool);
            LANT.push({ glass, halo, pool, f: fade, ph: lr() * 6.283 }); }
          g.scale.setScalar(s); g.rotation.y = lr() * 6.283; g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); spin.add(g); } } }
    if (L.sm4) (opt.snow4 || []).forEach((my, k) => { if (my && my.p) snowPut(k, my); }); // 내가 놓은 자리에만 (이 폰)
    if (L.gifts && !opt.noGifts) [Math.PI].forEach((ra, half) => GIFTS.forEach(([x, z, c, rc, q, h, up], i) => { // 앞뒤로 빙 둘러요 (트리와 같이 돌아요), 큰 상자는 더 크게
      const f = q >= .5 ? 1.4 : 1, cs = Math.cos(ra), sn = Math.sin(ra), g = gift(x * cs - z * sn, x * sn + z * cs, half ? OC[(i + 3) % 8] : c, q * f, h * f, rc, i + half); g.rotation.y += ra; if (up) g.position.y = up * 1.4; spin.add(g); }));
  }
  // 반딧불 빛 가루 (Lv8부터): 트리 둘레를 천천히 떠다녀요
  if (L.fly) for (let k = 0; k < 36; k++) { const f = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: k % 4 ? 0xfff0a0 : 0xd8ffb0, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); f.userData = { a: Math.random() * 6.283, r: 1.6 + Math.random() * 4, y: .3 + Math.random() * 4.5, s: (.5 + Math.random()) * (Math.random() < .5 ? -1 : 1), ph: Math.random() * 6.283 }; f.scale.setScalar(.16 + Math.random() * .1); sc.add(f); FLY.push(f); }
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
    if (drag == null) return; const dx = e.clientX - drag, dy = e.clientY - dragY; rot += dx * .01; skyRot += dx * .0033; v = placing || sPlace || pPick ? 0 : dx * .0015; drag = e.clientX; dragY = e.clientY;
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
    if (sPlace) { rcP.setFromCamera(ndc(e), cam); const pt = new T.Vector3(); if (rcP.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), pt)) { const lp = spin.worldToLocal(pt), r = Math.hypot(lp.x, lp.z); if (r > 1.3 && r < 5 && lp.z > .3) { const p = [+lp.x.toFixed(2), +lp.z.toFixed(2)]; if (!sPlace.g) { sPlace.g = animalSnow(.85, sPlace.k, {}); sPlace.g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .6; o.material.depthWrite = false; } }); spin.add(sPlace.g); } sPlace.g.position.set(p[0], 0, p[1]); sPlace.g.rotation.y = Math.atan2(p[0], p[1]); sPlace.p = p; sPlace.cb(p); } } return; }
    if (pPick) { rcP.setFromCamera(ndc(e), cam); const hh = rcP.intersectObjects(PSLOT, true)[0]; if (hh) { let c = hh.object; while (c && !PSLOT.includes(c)) c = c.parent; const i = PSLOT.indexOf(c), g = pgCur * 15 + i; if (c && !(opt.polas || [])[g]) pPick(g); } return; }
    rcP.setFromCamera(ndc(e), cam); const hit = rcP.intersectObjects(ORN.concat(SNOW4.filter(Boolean)), true)[0]; if (!hit) return; let o = hit.object; while (o && o.userData.sk == null && !o.userData.orn) o = o.parent; if (o && o.userData.sk != null) { if (opt.onSnow) opt.onSnow(o.userData.sk); return; } if (opt.onTap) opt.onTap(hit.object.userData.orn); };
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
    if (drag == null && !placing && !sPlace && !pPick) { rot += v; v += (.003 - v) * .02; }
    if (++frame % 6 === 0) tags();
    for (let i = pops.length - 1; i >= 0; i--) { const o = pops[i]; const mn = o.userData.min || .15; o.material.size = Math.max(mn, o.material.size * .985); if (o.material.size <= mn) pops.splice(i, 1); }
    for (let i = fx.length - 1; i >= 0; i--) if (!fx[i]()) fx.splice(i, 1);
    if (pPick) PICK.emissiveIntensity = .45 + .35 * Math.sin(performance.now() / 260);
    if (TLAN.length) { const tm = performance.now() / 1000; TLAN.forEach(m => { m.emissiveIntensity = 1.5 * (.88 + .08 * Math.sin(tm * 5.1) + .04 * Math.sin(tm * 11.3)); }); }
    if (LANT.length) { const tm = performance.now() / 1000; LANT.forEach(l => { const k = .86 + .09 * Math.sin(tm * 6.3 + l.ph) + .05 * Math.sin(tm * 13.7 + l.ph * 2); l.glass.material.emissiveIntensity = 1.4 * l.f * k; l.halo.material.opacity = .8 * l.f * k; l.pool.material.opacity = .45 * l.f * k; }); }
    if (LIGHTS.length || FLY.length) { const tm = performance.now() / 1000; LIGHTS.forEach(l => { l.material.opacity = .78 + .2 * Math.sin(tm * 1.2 + l.userData.ph); }); FLY.forEach(f => { const u = f.userData, a = u.a + tm * .08 * u.s; f.position.set(Math.cos(a) * u.r, u.y + Math.sin(tm * .7 + u.ph) * .35, Math.sin(a) * u.r); f.material.opacity = Math.max(0, Math.sin(tm * 1.3 + u.ph)) * .95; }); }
    if (snowP) { const a = snowP.geometry.attributes.position, tm = performance.now() / 1000; for (let k = 0; k < a.count; k++) { let y = a.getY(k) - .012 - (k % 5) * .002; if (y < 0) y = 16; a.setY(k, y); a.setX(k, a.getX(k) + Math.sin(tm + k) * .003); } a.needsUpdate = true; }
    if (starA >= .45) { // 별똥별: 밤·노을 하늘에 가끔 하나씩 (몇 초마다 랜덤)
      if (!MET.t) MET.t = performance.now() + 2500 + Math.random() * 5000;
      if (performance.now() > MET.t) { MET.t = performance.now() + 4000 + Math.random() * 9000; metGo(0); }
      for (let i = MET.list.length - 1; i >= 0; i--) { const m = MET.list[i], u = m.userData; u.f++; m.position.add(u.v); m.material.opacity = Math.min(1, u.f / 6) * Math.max(0, 1 - Math.max(0, u.f - 22) / 14); if (u.f > 36) { sc.remove(m); m.material.dispose(); MET.list.splice(i, 1); } } }
    AUR.t.value = performance.now() / 1000;
    skyRot += .00012; // 하늘(별)이 아주 천천히 돌아요 — 한 바퀴 약 15분
    skyG.rotation.y = skyRot; spin.rotation.y = rot;
    const WFADE = [0, .42, .66, .96]; if (WOODS.length) { const wp = new T.Vector3(), c0 = cam.position.length(), fc = sc.fog ? sc.fog.color : new T.Color(0xffffff); WOODS.forEach(g => { g.getWorldPosition(wp); const dc = wp.distanceTo(cam.position); g.visible = dc > c0 * .8; const f = WFADE[g.userData.tier || 0]; /* 거리 4단계: 멀수록 하늘색에 가깝게 */ if (g.userData.f !== f || g.userData.fc !== fc.getHex()) { g.userData.f = f; g.userData.fc = fc.getHex(); g.material.color.setScalar(1 - f); g.material.emissive.copy(fc).multiplyScalar(f); } }); }
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
    addPola(o, g) { (opt.polas = opt.polas || [])[g] = o; this.polaPage(Math.floor(g / 15)); },
    polaPick(cb) { pPick = cb; this.polaPage(pgCur); },
    snowSet(k, my) { snowPut(k, my); },
    shot() { r.render(sc, cam); return r.domElement.toDataURL('image/png'); }, // 트리 사진 (화면 글자 없이)
    snowPlace(k, cb) { if (sPlace && sPlace.g) spin.remove(sPlace.g); sPlace = cb ? { k, cb, g: null, p: null } : null;
      if (!SZONE) { SZONE = new T.Mesh(new T.RingGeometry(1.4, 4.9, 40, 1, .1, Math.PI - .2), new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: .35, depthWrite: false, side: T.DoubleSide })); SZONE.rotation.x = Math.PI / 2; SZONE.position.y = .03; spin.add(SZONE); } SZONE.visible = !!cb;
      if (cb) { rot = Math.round(rot / 6.283) * 6.283; v = 0; } }, // 눈사람은 선물 없는 반쪽(앞)에만, 고르는 동안 그 땅을 연하게
    polaOn() { return PSLOT.length > 0; },
    polaPages() { return Math.max(1, Math.ceil((opt.polas || []).length / 15)); },
    polaPage(pg) { if (!PSLOT.length) return; pgCur = pg; const L_ = opt.polas || [];
      PSLOT.forEach((c, i) => { const o = L_[pg * 15 + i], k = ORN.indexOf(c); if (k >= 0) ORN.splice(k, 1); const pic = c.userData.pic;
        const cp = c.userData.cap; if (cp.material.map) { cp.material.map.dispose(); cp.material.map = null; } cp.visible = false;
        if (o && o.cap) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); let fs = 64; x.font = `600 ${fs}px sans-serif`; while (x.measureText(o.cap).width > 490 && fs > 26) { fs -= 2; x.font = `600 ${fs}px sans-serif`; } x.fillStyle = '#33393e'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.cap, 256, 66); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; cp.material.map = tx; cp.material.needsUpdate = true; cp.visible = true; }
        if (!o || !o.pic) { pic.material = pPick && !o ? PICK : c.userData.blank; c.userData.orn = null; c.traverse(x => { x.userData.orn = null; }); return; }
        c.userData.orn = o; c.traverse(x => { x.userData.orn = o; }); ORN.push(c);
        const ld = PTEX[o.pic] || (PTEX[o.pic] = new Promise(res => { const tl = new T.TextureLoader(); tl.setCrossOrigin('anonymous'); tl.load(o.pic, tx => { const im = tx.image, w = im.width, h = im.height; tx.colorSpace = T.SRGBColorSpace; if (h > w) { tx.repeat.set(1, w / h); tx.offset.set(0, (1 - w / h) / 2); } else { tx.repeat.set(h / w, 1); tx.offset.set((1 - h / w) / 2, 0); } res(new T.MeshStandardMaterial({ map: tx, roughness: .7 })); }, undefined, () => res(null)); }));
        ld.then(m => { if (m && c.userData.orn === o) pic.material = m; }); }); },
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
  const set = q => { if (m) g.remove(m); m = q.snowK != null ? (() => { const s = animalSnow(.48, q.snowK, q.my || {}); s.position.y = -.42; s.rotation.y = -.5; return s; })() : q.shape === 3 ? (() => { const g = new T.Group(), s = snowman(.36, OC[q.color]); s.position.y = -.32; g.add(s); return g; })() : q.shape === 1 ? sock(.42, OC[q.color]) : q.shape === 2 ? star5(.2, OC[q.color]) : bead(.2, OC[q.color]); g.add(m); };
  set(o);
  r.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; r.domElement.setPointerCapture(e.pointerId); });
  r.domElement.addEventListener('pointermove', e => { if (!drag) return; vy = (e.clientX - drag.x) * .012; ry += vy; rx = Math.max(-1.2, Math.min(1.2, rx + (e.clientY - drag.y) * .012)); drag = { x: e.clientX, y: e.clientY }; });
  r.domElement.addEventListener('pointerup', () => { drag = null; vy = Math.max(-.05, Math.min(.05, vy)); });
  (function loop() { if (!alive || !document.body.contains(r.domElement)) { alive = false; try { r.dispose(); } catch (err) { /* 괜찮아요 */ } return; } if (!drag) { ry += vy; vy += (.01 - vy) * .03; } g.rotation.set(rx, ry, 0); r.render(sc, cam); requestAnimationFrame(loop); })();
  return { set, destroy() { alive = false; try { r.dispose(); } catch (err) { /* 괜찮아요 */ } r.domElement.remove(); } };
}
