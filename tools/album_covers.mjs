// data/albums_lookup.csv 의 앨범마다 표지 주소를 찾아 data/album_covers.json 에 모아요.
// 1) 애플뮤직: 가수 → 그 가수의 앨범 전체에서 발매일·이름으로 고르기  2) 없으면 Deezer 검색
import fs from 'node:fs';

const rows = fs.readFileSync('data/albums_lookup.csv', 'utf8').trim().split('\n').slice(1).map(l => {
  const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  return { artist: c[0], album: c[1], date: c[2] };
});
const flat = t => (t || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/g, '');
const get = async u => JSON.parse((await (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()).trim());
const wait = ms => new Promise(s => setTimeout(s, ms));
const near = (a, b) => a && b && Math.abs(new Date(a) - new Date(b)) <= 3 * 864e5;

const apple = {};
for (const name of [...new Set(rows.map(r => r.artist))]) {
  try {
    const arts = (await get(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&country=kr&limit=5`)).results || [];
    const art = arts.find(a => flat(a.artistName) === flat(name)) || arts[0];
    await wait(1500);
    apple[name] = art ? ((await get(`https://itunes.apple.com/lookup?id=${art.artistId}&entity=album&country=kr&limit=200`)).results || []).filter(x => x.wrapperType === 'collection') : [];
    console.log(`::notice::애플뮤직 ${name} → ${art ? art.artistName : '없음'} 앨범 ${apple[name].length}개`);
  } catch (e) { apple[name] = []; console.log(`::notice::애플뮤직 오류 ${name} ${e.message}`); }
  await wait(1500);
}
const out = {};
let ok = 0;
for (const r of rows) {
  const list = apple[r.artist] || [];
  const nm = flat(r.album);
  let pick = list.find(a => near((a.releaseDate || '').slice(0, 10), r.date) && (flat(a.collectionName).includes(nm.slice(0, 4)) || nm.includes(flat(a.collectionName).slice(0, 4))))
    || list.find(a => flat(a.collectionName) === nm)
    || list.find(a => near((a.releaseDate || '').slice(0, 10), r.date));
  let url = pick ? pick.artworkUrl100.replace('100x100bb', '600x600bb') : '';
  if (!url) {
    try {
      const d = (await get(`https://api.deezer.com/search/album?q=${encodeURIComponent(r.artist + ' ' + r.album.replace(/\([^)]*\)/g, ''))}`)).data || [];
      const hit = d.find(a => flat(a.title) === nm || flat(a.title).includes(nm) || nm.includes(flat(a.title)));
      if (hit) url = hit.cover_xl || hit.cover_big || '';
      await wait(800);
    } catch (e) { /* 넘어가요 */ }
  }
  out[r.album] = url;
  if (url) ok++;
}
fs.writeFileSync('data/album_covers.json', JSON.stringify(out, null, 1));
console.log(`::notice::표지 ${ok} / ${rows.length}`);
console.log(`::notice::못 찾음 ${Object.keys(out).filter(k => !out[k]).join(' | ')}`);
