// 공연장 → 네이버 장소 번호: 깃허브가 네이버 장소 검색으로 찾아 data/places.json에 넣어요 (사이트는 번호 있는 곳만 네이버 지도 링크)
// 좌표 있는 곳(found): 우리 좌표에서 300m 안 결과만 nid로 확정. 좌표 없는 곳(miss): 결과 3개를 naverCand 후보로 (한꺼번에 찾기 화면에서 골라요)
// 한 번 찾아본 곳은 nidTry 날짜를 남겨 다시 안 찾아요 (ALL=1이면 다시)
import fs from 'node:fs';

const F = 'data/places.json';
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const found = d.found || {}, miss = d.miss || [], hint = d.hint || {};
const cand = d.naverCand = d.naverCand || {};
const tried = d.naverTried = d.naverTried || {};
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'ko', Referer: 'https://map.naver.com/' };
const today = new Date().toISOString().slice(0, 10), ALL = process.env.ALL === '1';
const dist = (a, b) => { const R = 6371e3, r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r; return Math.round(Math.sqrt(x * x + y * y) * R); };
const num = v => Math.round(+v * 1e6) / 1e6;

// 저장 폴더(포레공연)에 장소 번호(sid)가 있으면 검색 없이 좌표로 맞춰요
const links = fs.existsSync('data/naver_links.json') ? JSON.parse(fs.readFileSync('data/naver_links.json', 'utf8')).links || {} : {};
const known = [];
Object.values(links).forEach(l => { if (l.t === 'place' && l.id) known.push({ id: l.id, name: l.name, lat: l.lat, lng: l.lng }); if (l.t === 'folder') (l.items || []).forEach(i => i.sid && known.push({ id: i.sid, name: i.name, lat: i.lat, lng: i.lng })); });

let shown = 0;
async function search(q) {
  const html = await (await fetch('https://pcmap.place.naver.com/place/list?query=' + encodeURIComponent(q), { headers: UA })).text();
  const m = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});\s*window\./);
  const out = [];
  if (m) {
    const walk = o => { if (!o || typeof o !== 'object') return; if (o.id && o.name && o.x && o.y && /^\d{5,}$/.test(String(o.id))) out.push({ id: String(o.id), name: o.name, addr: o.roadAddress || o.address || o.fullAddress || '', lat: num(o.y), lng: num(o.x) }); Object.values(o).forEach(walk); };
    try { walk(JSON.parse(m[1])); } catch (err) { /* 아래에서 알려요 */ }
  }
  if (!out.length && shown++ < 2) console.log(`::notice::검색 결과 못 읽음 [${q}] 길이 ${html.length} APOLLO ${!!m} 앞부분 ${html.slice(0, 300).replace(/\s+/g, ' ')}`);
  const seen = new Set();
  return out.filter(x => !seen.has(x.id) && seen.add(x.id));
}
const wait = () => new Promise(ok => setTimeout(ok, 900));

// 이름이 얼마나 겹치나 (띄어쓰기·괄호 빼고 두 글자씩)
const bi = t => { const c = String(t).toLowerCase().replace(/\([^)]*\)|[^0-9a-z가-힣]/g, ''); const o = new Set(); for (let i = 0; i < c.length - 1; i++) o.add(c.slice(i, i + 2)); return o; };
const sim = (a, b) => { const A = bi(a), B = bi(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.min(A.size, B.size); };
if (ALL) Object.values(found).forEach(v => { delete v.nid; delete v.nname; });
let fix = 0, fromFolder = 0, cands = 0, n = 0;
for (const [k, v] of Object.entries(found)) {
  if (v.nid || (!ALL && tried[k])) continue;
  const near = known.map(x => ({ ...x, d: dist(v, x) })).filter(x => x.d <= 150).sort((a, b) => a.d - b.d)[0];
  if (near && sim(near.name, k) >= 0.5) { v.nid = near.id; v.nname = near.name; fromFolder++; continue; }
  // 일정에 적힌 장소 이름으로 먼저, 없으면 지도 이름으로. 300m 안에서 이름이 가장 비슷한 곳 (반 이상 겹쳐야)
  let best = null;
  for (const q of [...new Set([k.replace(/\s*\([^)]*\)\s*/g, ' ').trim(), (hint[k] || ''), (v.name || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()].filter(Boolean))]) {
    let hits = [];
    try { hits = await search(q); n++; } catch (err) { console.log('검색 실패', k, err.message); }
    best = hits.map(x => ({ ...x, d: dist(v, x), s: sim(x.name, k) })).filter(x => x.d <= 300 && x.s >= 0.5).sort((a, b) => b.s - a.s || a.d - b.d)[0];
    await wait();
    if (best) break;
  }
  if (best) { v.nid = best.id; v.nname = best.name; fix++; }
  tried[k] = today;
  await wait();
}
for (const k of miss) {
  if (cand[k] || (!ALL && tried[k])) continue;
  let hits = [];
  try { hits = await search(hint[k] || k); n++; } catch (err) { console.log('검색 실패', k, err.message); }
  if (hits.length) { cand[k] = hits.slice(0, 3); cands++; }
  tried[k] = today;
  await wait();
}
fs.writeFileSync(F, JSON.stringify(d, null, 1) + '\n');
console.log(`::notice::네이버 장소 번호: 검색 ${n}번 · 폴더로 ${fromFolder} · 검색으로 ${fix} · 좌표 없는 곳 후보 ${cands} · 번호 있는 곳 모두 ${Object.values(found).filter(v => v.nid).length}/${Object.keys(found).length}`);
