// 이름으로 유튜브 채널 후보 찾기 (구독자 순). 사용: node tools/yt_find.mjs "배두훈,강형호"
const KEY = process.env.YOUTUBE_API_KEY;
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
for (const name of (process.argv[2] || '').split(',').map(s => s.trim()).filter(Boolean)) {
  const found = await api('search', { part: 'snippet', type: 'channel', q: name, maxResults: 8 });
  const ids = found.items.map(i => i.snippet.channelId).join(',');
  if (!ids) { console.log(`::notice::${name}: 없음`); continue; }
  const chs = (await api('channels', { part: 'snippet,statistics', id: ids })).items
    .sort((a, b) => Number(b.statistics.subscriberCount || 0) - Number(a.statistics.subscriberCount || 0));
  console.log(`::notice::${name} → ${chs.slice(0, 6).map(c => `${c.snippet.title}(${c.snippet.customUrl || ''}, ${c.id}) 구독${c.statistics.subscriberCount} 영상${c.statistics.videoCount}`).join(' | ')}`);
}
