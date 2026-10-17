// data/albums_lookup.csv 의 앨범마다 애플뮤직(iTunes 검색) 표지 주소를 찾아 data/album_covers.json 에 모아요.
// 발매일이 맞는 앨범을 먼저 고르고, 없으면 이름이 가장 비슷한 것. 못 찾으면 빈칸.
import fs from 'node:fs';

const rows0 = fs.readFileSync('data/albums_lookup.csv', 'utf8').trim().split('\n').slice(1).map(l => {
  const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  return { artist: c[0], album: c[1], date: c[2] };
});
const flat = t => t.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/g, '');
const out = {};
let ok = 0;
const rows = process.env.PROBE ? [] : rows0;
for (const r of rows) {
  const term = `${r.artist} ${r.album.replace(/\([^)]*\)/g, '')}`;
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&country=kr&limit=10`);
    const body = await res.text();
    if (!res.ok || !body.trim().startsWith('{')) { console.log(`::notice::${res.status} ${body.slice(0, 120)}`); }
    const list = JSON.parse(body).results || [];
    if (r === rows[0] || r === rows[30]) console.log(`::notice::${term} → ${list.length}개 ${list.slice(0, 3).map(a => a.collectionName + ' ' + (a.releaseDate || '').slice(0, 10)).join(' | ')}`);
    const pick = list.find(a => (a.releaseDate || '').slice(0, 10) === r.date)
      || list.find(a => flat(a.collectionName).includes(flat(r.album)) || flat(r.album).includes(flat(a.collectionName)));
    out[r.album] = pick ? pick.artworkUrl100.replace('100x100bb', '600x600bb') : '';
    if (pick) ok++;
  } catch (e) { out[r.album] = ''; if (!ok) console.log(`::notice::오류 ${e.message}`); }
  await new Promise(s => setTimeout(s, 1500));
}
fs.writeFileSync('data/album_covers.json', JSON.stringify(out, null, 1));
console.log(`::notice::표지 ${ok} / ${rows.length}`);
console.log(`::notice::못 찾음 ${Object.keys(out).filter(k => !out[k]).join(' | ')}`);
