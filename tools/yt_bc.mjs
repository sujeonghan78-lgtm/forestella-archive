// 방송사 공식 채널에 올라온 포레스텔라 영상을 data/yt_bc.json 에 저장해요 (깃허브 액션, YOUTUBE_API_KEY 필요).
// 조건: 제목에 포레스텔라·멤버 이름, 조회수 1만 이상. 처음(또는 --full)엔 전체, 다음부터는 최근 7일만 찾아요.
import fs from 'fs';
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.log('::error::YOUTUBE_API_KEY 비밀값이 없어요'); process.exit(1); }
const OUT = 'data/yt_bc.json';
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
// 믿을 만한 방송사·음악 채널 (2026-10-18 yt_bc_scan으로 포레스텔라 영상 많은 채널 확인). 이름은 사이트에 보이는 짧은 이름
const CHANNELS = [
  ['@legendkpop', 'KBS 레전드 케이팝'], ['@kbskpop', 'KBS Kpop'], ['@1004kbs', 'KBS'], ['@kbsent', 'KBS Entertain'],
  ['@kbsworldtv', 'KBS WORLD'], ['@kbs_startv', 'KBS StarTV'], ['@kbs-together', 'KBS 같이삽시다'], ['@kbsjj', 'KBS전주'],
  ['@kbsculturedocumentary2173', 'KBS대전'], ['@MBCkpop', 'MBCkpop'], ['@MBCentertainment', 'MBC 예능'], ['@sbskpop', 'SBS KPOP'],
  ['@jtbcentertainment', 'JTBC'], ['@jtbcvoyage', 'JTBC Voyage'], ['@jtbcmusic', 'JTBC Music'], ['@mbn_entertainment', 'MBN'],
  ['@playmnet', 'Mnet TV'], ['@mnet', 'Mnet K-POP'], ['@dingomusic', '딩고 뮤직'], ['@universalmusicclassics', '유니버설뮤직 클래식'],
];
const NAME = /포레스텔라|forestella|배두훈|강형호|고우림/i;  // 조민규는 다른 사람과 이름이 같아서 혼자로는 안 받아요
const MIN_VIEWS = 10000;
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { channels: [], videos: [] };
const full = process.argv.includes('--full') || !old.videos.length;
const since = new Date(Date.now() - 7 * 864e5).toISOString();
const chOf = {}, found = [], missing = [];
let stopped = '';
try {
  for (const [handle, name] of CHANNELS) {
    const ch = (await api('channels', { part: 'id', forHandle: handle })).items?.[0];
    if (!ch) { missing.push(handle); continue; }
    found.push({ id: ch.id, handle, name });
    let page = '';
    do {
      const d = await api('search', { part: 'id', type: 'video', channelId: ch.id, q: '포레스텔라|Forestella|고우림|강형호|배두훈', maxResults: 50, order: 'date', ...(full ? {} : { publishedAfter: since }), ...(page && { pageToken: page }) });
      d.items.forEach(i => { chOf[i.id.videoId] ||= name; });
      page = d.nextPageToken;
    } while (page);
  }
} catch (e) { stopped = e.message; }  // 하루 사용량이 다 되면 받은 데까지만 저장해요
const sec = s => { const m = (s || '').match(/(\d+)H|(\d+)M|(\d+)S/g) || []; return m.reduce((t, x) => t + parseInt(x) * (x.endsWith('H') ? 3600 : x.endsWith('M') ? 60 : 1), 0); };
const kst = iso => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
// 방송 날짜: 제목의 "220101 방송", "2022.01.01" 같은 날짜 (재업로드 영상이 많아서 올린 날보다 이게 정확해요)
const aired = (t, up) => {
  const m = t.match(/(\d{2})(\d{2})(\d{2})\s*방송/) || t.match(/(?:KBS|MBC|SBS|JTBC|Mnet|MBN|TV)\s*(\d{2})(\d{2})(\d{2})(?!\d)/) || t.match(/(?<!\d)(20\d{2})[.\-/]?(\d{2})[.\-/]?(\d{2})(?!\d)/);
  if (!m) return '';
  const y = m[1].length === 2 ? '20' + m[1] : m[1], d = `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return d >= '2017-01-01' && d <= up && !isNaN(new Date(d)) ? d : '';
};
const ids = Object.keys(chOf).filter(id => !old.videos.some(v => v.id === id));
const add = [];
for (let i = 0; i < ids.length && !stopped; i += 50) {
  const d = await api('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(',') });
  for (const v of d.items) {
    const views = Number(v.statistics.viewCount || 0), t = v.snippet.title;
    if (!NAME.test(t) || views < MIN_VIEWS) continue;
    const up = kst(v.snippet.publishedAt), air = aired(t, up);
    add.push({ id: v.id, date: air || up, ...(air && air !== up && { up }), title: t, sec: sec(v.contentDetails.duration), views, bc: chOf[v.id] });
  }
}
const all = [...old.videos, ...add].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
const channels = [...old.channels.filter(c => !found.some(f => f.id === c.id)), ...found];
fs.writeFileSync(OUT, JSON.stringify({ channels, videos: all }, null, 0).replace(/},{/g, '},\n{'));
const per = {}; all.forEach(v => { per[v.bc] = (per[v.bc] || 0) + 1; });
console.log(`::notice::새 영상 ${add.length} / 전체 ${all.length} / 채널별 ${Object.entries(per).map(([k, n]) => k + ':' + n).join(' ')}${missing.length ? ' / 못 찾은 채널 ' + missing.join(',') : ''}${stopped ? ' / 중간에 멈춤: ' + stopped : ''}`);
