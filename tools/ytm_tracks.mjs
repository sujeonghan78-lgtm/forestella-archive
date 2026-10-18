// 유튜브 뮤직 공식 음원(아티스트 - Topic 채널) 목록을 data/ytm_tracks.json 에 저장해요 (깃허브 액션, YOUTUBE_API_KEY 필요).
// 음원 영상 설명의 "Provided to YouTube by …" 부분에서 앨범 이름·발매일을 읽어요.
import fs from 'fs';
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.log('::error::YOUTUBE_API_KEY 비밀값이 없어요'); process.exit(1); }
const OUT = 'data/ytm_tracks.json';
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
// 그룹·멤버 Topic 채널 (member 빈칸 = 그룹)
const ARTISTS = [['포레스텔라', ''], ['Forestella', ''], ['고우림', '고우림'], ['강형호', '강형호'], ['조민규', '조민규'], ['배두훈', '배두훈']];
const chans = new Map();
for (const [name, member] of ARTISTS) {
  const d = await api('search', { part: 'snippet', type: 'channel', q: `${name} - Topic`, maxResults: 5 });
  d.items.filter(i => /- Topic$/.test(i.snippet.title) && i.snippet.title.replace(/ - Topic$/, '').replace(/\s/g, '').toLowerCase().includes(name.replace(/\s/g, '').toLowerCase()))
    .forEach(i => { if (!chans.has(i.snippet.channelId)) chans.set(i.snippet.channelId, { title: i.snippet.title, member }); });
}
const ids = [], chOf = {};
for (const [id, c] of chans) {
  const ch = (await api('channels', { part: 'contentDetails', id })).items[0];
  const up = ch?.contentDetails?.relatedPlaylists?.uploads;
  if (!up) continue;
  let page = '';
  do {
    const d = await api('playlistItems', { part: 'contentDetails', playlistId: up, maxResults: 50, ...(page && { pageToken: page }) });
    d.items.forEach(i => { const v = i.contentDetails.videoId; if (!chOf[v]) { chOf[v] = c; ids.push(v); } });
    page = d.nextPageToken;
  } while (page);
}
const tracks = [];
for (let i = 0; i < ids.length; i += 50) {
  const d = await api('videos', { part: 'snippet', id: ids.slice(i, i + 50).join(',') });
  for (const v of d.items) {
    const desc = v.snippet.description || '';
    if (!/Provided to YouTube/i.test(desc)) continue;
    const parts = desc.split(/\n\s*\n/).map(s => s.trim());
    const album = parts[2] || '';
    const date = (desc.match(/Released on:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
    tracks.push({ id: v.id, title: v.snippet.title, album, date, artist: (parts[1] || '').replace(/^.*?·\s*/, ''), ...(chOf[v.id].member && { member: chOf[v.id].member }) });
  }
}
tracks.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
fs.writeFileSync(OUT, JSON.stringify({ channels: [...chans].map(([id, c]) => ({ id, ...c })), tracks }, null, 0).replace(/},{/g, '},\n{'));
console.log(`::notice::채널 ${[...chans.values()].map(c => c.title).join(', ')} / 음원 ${tracks.length}개 / 앨범 ${new Set(tracks.map(t => t.album)).size}개`);
