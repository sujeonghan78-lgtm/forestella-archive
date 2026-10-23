// 네이버 지도 링크 → 좌표: 제보 탭에 들어온 네이버 지도 링크(장소 하나·저장 폴더 공유)를 열어 이름·주소·좌표로 바꿔 data/naver_links.json에 모아요.
// 폰 브라우저에서는 네이버를 직접 열 수 없어서 깃허브가 15분마다 대신 열어요. 한 번 찾은 링크는 다시 안 열어요.
// 액션을 손으로 돌릴 때 links 입력(줄바꿈·쉼표로 여러 개)을 주면 그 링크도 같이 열어요 (관리자 일괄 넣기용)
import fs from 'node:fs';

const OUT = 'data/naver_links.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'ko' };
const LINK = /https?:\/\/(?:naver\.me\/[\w-]+|(?:m\.)?map\.naver\.com\/[^\s"'<>]+|(?:m|pcmap)\.place\.naver\.com\/[^\s"'<>]+|pages\.map\.naver\.com\/[^\s"'<>]+)/g;
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const links = old.links || {};

const csvRows = text => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

const want = new Set((process.env.LINKS || '').match(LINK) || []);
try {
  const cfg = fs.readFileSync('config.js', 'utf8');
  const url = cfg.match(/reports:\s*'([^']+)'/)[1];
  csvRows(await (await fetch(url)).text()).forEach(r => (r.join('\n').match(LINK) || []).forEach(u => want.add(u)));
} catch (err) { console.log('제보 탭 못 읽음', err.message); }

const num = v => Math.round(+v * 1e6) / 1e6;
async function place(id) {
  const html = await (await fetch(`https://m.place.naver.com/place/${id}/home`, { headers: UA })).text();
  const xy = html.match(/"x":"(1[23]\d\.\d+)","y":"(3[3-8]\.\d+)"/);
  if (!xy) throw new Error('좌표 없음');
  const name = ((html.match(/og:title" content="([^"]+)"/) || [])[1] || '').replace(/\s*:\s*네이버.*$/, '').trim();
  const addr = (html.match(/"roadAddress":"([^"]+)"/) || html.match(/"address":"([^"]+)"/) || [])[1] || '';
  return { t: 'place', id, name, addr, lat: num(xy[2]), lng: num(xy[1]) };
}
async function folder(sid) {
  const j = await (await fetch(`https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${sid}/bookmarks?start=0&limit=5000&sort=lastUseTime`, { headers: UA })).json();
  const items = (j.bookmarkList || []).filter(b => b.py && b.px).map(b => ({ name: (b.displayName || b.name || '').trim(), addr: b.address || '', lat: num(b.py), lng: num(b.px), memo: (b.memo || '').trim(), sid: b.sid || '' }));
  return { t: 'folder', name: (j.folder || {}).name || '', items };
}
async function resolve(u) {
  // 짧은 링크는 따라가서 진짜 주소를 봐요
  const r = await fetch(u, { headers: UA, redirect: 'follow' });
  let fin = r.url;
  try { const f = new URL(fin).searchParams.get('fallbackUrl'); if (f) fin += ' ' + f; } catch (err) { /* 그대로 */ }
  const share = fin.match(/detail-list\/([0-9a-f]{20,})|bookmark\/share[^ ]*?[?&]id=([0-9a-f]{20,})/);
  if (share) return folder(share[1] || share[2]);
  const pid = fin.match(/place\/(\d{5,})|[?&](?:pinId|id)=(\d{5,})/);
  if (pid) return place(pid[1] || pid[2]);
  // 짧은 링크가 웹페이지를 바로 주는 경우: 본문에서 찾아봐요
  const body = await r.text();
  const p2 = body.match(/place\/(\d{5,})/);
  if (p2) return place(p2[1]);
  throw new Error('모르는 링크 ' + fin.slice(0, 120));
}

let got = 0, bad = 0;
for (const u of want) {
  const o = links[u];
  if (o && (o.t !== 'fail' || o.n >= 3)) continue;
  try { links[u] = { ...(await resolve(u)), at: new Date().toISOString().slice(0, 10) }; got++; }
  catch (err) { links[u] = { t: 'fail', n: ((o && o.n) || 0) + 1, why: String(err.message).slice(0, 80) }; bad++; }
  await new Promise(ok => setTimeout(ok, 800));
}
fs.writeFileSync(OUT, JSON.stringify({ note: 'tools/naver_sync.mjs가 네이버 지도 링크를 열어 찾은 이름·좌표', links }, null, 1) + '\n');
console.log(`::notice::네이버 링크 ${want.size}개 · 새로 찾음 ${got} · 못 찾음 ${bad}`);
