// 영상 없는 일정의 유튜브 영상 후보 찾기 (tools/yt_event_in.json → tools/yt_event_out.json). 검색 1번 = 100 유닛
import fs from 'node:fs';
const KEY = process.env.YOUTUBE_API_KEY;
const jobs = JSON.parse(fs.readFileSync('tools/yt_event_in.json', 'utf8'));
const day = (d, n) => new Date(new Date(d + 'T00:00:00+09:00').getTime() + n * 864e5).toISOString();
const out = [];
for (const j of jobs) {
  const q = { part: 'snippet', type: 'video', q: j.q, maxResults: 10, regionCode: 'KR', relevanceLanguage: 'ko', publishedAfter: day(j.date, -1), publishedBefore: day(j.date, j.days || 30), key: KEY };
  const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams(q));
  const d = await r.json();
  if (!r.ok) { console.log(`::warning::${j.id} ${r.status} ${d.error?.message || ''}`); if (r.status === 403) break; continue; }
  out.push({ id: j.id, date: j.date, q: j.q, items: d.items.map(i => ({ v: i.id.videoId, t: i.snippet.title, ch: i.snippet.channelTitle, cid: i.snippet.channelId, at: i.snippet.publishedAt.slice(0, 10) })) });
}
fs.writeFileSync('tools/yt_event_out.json', JSON.stringify(out, null, 0));
console.log(`::notice::검색 ${out.length}/${jobs.length}`);
