// 유튜브 뮤직 음원 → 다른 음원 사이트 곡 주소 (song.link 공개 API, 1분에 10번까지라 천천히 받아요)
// data/ytm_tracks.json 의 곡마다 data/ytm_links.json 에 { 영상ID: { spotify, appleMusic, ... } } 저장. 이미 받은 곡은 건너뛰어요.
import fs from 'fs';
const OUT = 'data/ytm_links.json';
const tracks = JSON.parse(fs.readFileSync('data/ytm_tracks.json', 'utf8')).tracks.filter(t => !/instrumental|\(inst/i.test(t.title));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const KEEP = ['spotify', 'appleMusic', 'deezer', 'tidal', 'amazonMusic', 'soundcloud'];
let got = 0, miss = 0;
for (const t of tracks) {
  if (out[t.id]) continue;
  const u = `https://api.song.link/v1-alpha.1/links?userCountry=KR&url=${encodeURIComponent('https://music.youtube.com/watch?v=' + t.id)}`;
  let d = null;
  for (let i = 0; i < 3 && !d; i++) {
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (r && r.status === 429) { await new Promise(s => setTimeout(s, 30000)); continue; }
    d = r && r.ok ? await r.json() : {};
  }
  const links = {};
  KEEP.forEach(k => { const l = d?.linksByPlatform?.[k]; if (l?.url) links[k] = l.url; });
  out[t.id] = links;
  Object.keys(links).length ? got++ : miss++;
  await new Promise(s => setTimeout(s, 6500));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/},"/g, '},\n"'));
console.log(`::notice::새로 찾음 ${got} / 못 찾음 ${miss} / 전체 ${Object.keys(out).length}`);
