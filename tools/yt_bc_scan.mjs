// 포레스텔라 영상을 많이 올린 채널 찾기 (조회수 순 검색 → 채널별로 묶기). 방송사 채널 목록 고를 때 한 번 써요.
const KEY = process.env.YOUTUBE_API_KEY;
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
const NAME = /포레스텔라|forestella|배두훈|강형호|조민규|고우림/i;
const ids = new Set();
for (const q of ['포레스텔라', 'Forestella', '포레스텔라 불후의 명곡', '포레스텔라 열린음악회', '포레스텔라 팬텀싱어', '포레스텔라 음악방송']) {
  let page = '';
  for (let i = 0; i < 4; i++) {
    const d = await api('search', { part: 'id', type: 'video', q, order: 'viewCount', maxResults: 50, regionCode: 'KR', ...(page && { pageToken: page }) });
    d.items.forEach(x => ids.add(x.id.videoId));
    page = d.nextPageToken; if (!page) break;
  }
}
const by = {};
const list = [...ids];
for (let i = 0; i < list.length; i += 50) {
  const d = await api('videos', { part: 'snippet,statistics', id: list.slice(i, i + 50).join(',') });
  for (const v of d.items) {
    if (!NAME.test(v.snippet.title)) continue;
    const c = by[v.snippet.channelId] ||= { title: v.snippet.channelTitle, n: 0, views: 0, big: 0 };
    c.n++; const vw = Number(v.statistics.viewCount || 0); c.views += vw; if (vw >= 10000) c.big++;
  }
}
const chIds = Object.keys(by).sort((a, b) => by[b].views - by[a].views).slice(0, 50);
for (let i = 0; i < chIds.length; i += 50) {
  const d = await api('channels', { part: 'snippet,statistics', id: chIds.slice(i, i + 50).join(',') });
  d.items.forEach(c => { by[c.id].subs = Number(c.statistics.subscriberCount || 0); by[c.id].url = c.snippet.customUrl || ''; });
}
const lines = chIds.map(id => `${by[id].title}|${by[id].url}|${id}|구독${Math.round((by[id].subs || 0) / 1000)}k|영상${by[id].n}(1만+${by[id].big})|조회${Math.round(by[id].views / 1e4)}만`);
for (let i = 0; i < lines.length; i += 10) console.log(`::notice::${lines.slice(i, i + 10).join(' ;; ')}`);
