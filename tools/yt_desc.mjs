// 곡이 빈 일정의 영상 설명 모으기 (tools/yt_desc_in.json → tools/yt_desc_out.json)
// 붙은 영상 설명 + 일정 이름으로 찾은 영상(제목·설명)을 모아, 무슨 곡을 불렀는지 사람이 보고 채우는 데 써요. 검색 1번 = 100 유닛
import fs from 'node:fs';
const KEY = process.env.YOUTUBE_API_KEY;
const jobs = JSON.parse(fs.readFileSync('tools/yt_desc_in.json', 'utf8'));
const day = (d, n) => new Date(new Date(d + 'T00:00:00+09:00').getTime() + n * 864e5).toISOString();
const get = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?` + new URLSearchParams({ ...q, key: KEY })); const d = await r.json(); if (!r.ok) throw new Error(`${r.status} ${d.error?.message || ''}`); return d; };
const info = async ids => ids.length ? (await get('videos', { part: 'snippet', id: ids.slice(0, 50).join(',') })).items.map(i => ({ v: i.id, t: i.snippet.title, ch: i.snippet.channelTitle, at: i.snippet.publishedAt.slice(0, 10), d: i.snippet.description.slice(0, 1500) })) : [];
const out = [];
for (const j of jobs) {
  try {
    const own = await info(j.vids || []);
    let found = [];
    if (j.q) {
      const s = await get('search', { part: 'snippet', type: 'video', q: j.q, maxResults: 15, regionCode: 'KR', relevanceLanguage: 'ko', publishedAfter: day(j.date, -1), publishedBefore: day(j.date, j.days || 20) });
      found = await info(s.items.map(i => i.id.videoId).filter(v => !(j.vids || []).includes(v)));
    }
    out.push({ id: j.id, date: j.date, title: j.title, own, found });
  } catch (err) { console.log(`::warning::${j.id} ${err.message}`); if (/403/.test(err.message)) break; }
}
fs.writeFileSync('tools/yt_desc_out.json', JSON.stringify(out, null, 0));
console.log(`::notice::설명 모음 ${out.length}/${jobs.length}`);
