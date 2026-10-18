// 포레스텔라·멤버 공식 유튜브 채널 영상 목록을 data/yt_videos.json 에 저장해요 (깃허브 액션, YOUTUBE_API_KEY 필요).
// 처음엔 전체, 다음부터는 새 영상이 나올 때까지만 받아요.
import fs from 'fs';
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.log('::error::YOUTUBE_API_KEY 비밀값이 없어요'); process.exit(1); }
const OUT = 'data/yt_videos.json';
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
process.on('unhandledRejection', e => { console.log(`::error::${e.message}`); process.exit(1); });
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).videos : [];
const known = new Set(old.map(v => v.id));
const full = process.argv.includes('--full') || !old.length;
// 받아올 채널 (member가 빈칸이면 그룹 공식 채널). 2026-10-18 검색으로 확인, 수정 님 확인
const CHANNELS = [
  { id: 'UCb_gdTMC2xeuO1p8lKkZHHQ', member: '' },        // 포레스텔라 @officialforestella
  { id: 'UCTMpZOeZ937YNXsWfrGd1Rw', member: '고우림' },  // Official KOWOORIM
  { id: 'UCjZtahoJBKWbNQeM-95Dbmg', member: '조민규' },  // 조민규 ChoMinGyu
  { id: 'UC4pREczEzCTBg0_OSrcfVMA', member: '강형호' },  // [PITTA]강형호 & 이용우
];
const ids = [], chOf = {};
for (const c of CHANNELS) {
  const ch = (await api('channels', { part: 'contentDetails', id: c.id })).items[0];
  const fullCh = full || !old.some(v => (v.ch || '') === c.member);
  let page = '';
  do {
    const d = await api('playlistItems', { part: 'contentDetails', playlistId: ch.contentDetails.relatedPlaylists.uploads, maxResults: 50, ...(page && { pageToken: page }) });
    const got = d.items.map(i => i.contentDetails.videoId);
    const fresh = got.filter(id => !known.has(id) && !chOf[id]);
    fresh.forEach(id => { chOf[id] = c.member; });
    ids.push(...fresh);
    page = d.nextPageToken;
    if (!fullCh && fresh.length < got.length) break;
  } while (page);
}
const sec = s => { const m = (s || '').match(/(\d+)H|(\d+)M|(\d+)S/g) || []; return m.reduce((t, x) => t + parseInt(x) * (x.endsWith('H') ? 3600 : x.endsWith('M') ? 60 : 1), 0); };
const add = [];
for (let i = 0; i < ids.length; i += 50) {
  const d = await api('videos', { part: 'snippet,contentDetails', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
  for (const v of d.items) {
    const kst = new Date(new Date(v.snippet.publishedAt).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
    add.push({ id: v.id, date: kst, title: v.snippet.title, sec: sec(v.contentDetails.duration), ...(chOf[v.id] && { ch: chOf[v.id] }) });
  }
}
const all = [...old.filter(v => !add.some(a => a.id === v.id)), ...add].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
fs.writeFileSync(OUT, JSON.stringify({ channels: CHANNELS, videos: all }, null, 0).replace(/},{/g, '},\n{'));
const years = {};
all.forEach(v => { years[v.date.slice(0, 4)] = (years[v.date.slice(0, 4)] || 0) + 1; });
console.log(`::notice::새 영상 ${add.length} / 전체 ${all.length} / 연도별 ${Object.entries(years).sort().map(([y, n]) => y + ':' + n).join(' ')}`);
