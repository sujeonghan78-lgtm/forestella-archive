// 공식·멤버·방송사 영상 조회수를 하루 한 번 data/yt_views.json 에 쌓아요 (깃허브 액션, YOUTUBE_API_KEY 필요)
// yt_views.json: 오늘(now)·일주일 전(prev) 조회수 / yt_views_hist.json: 최근 8일 매일(days) + 일요일마다 한 점(weeks, 10만 이상 영상만, 2년치)
import fs from 'fs';
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.log('::error::YOUTUBE_API_KEY 비밀값이 없어요'); process.exit(1); }
const OUT = 'data/yt_views.json', HIST = 'data/yt_views_hist.json';  // 사이트는 가벼운 OUT만 처음에 받고, 그래프용 HIST는 곡 화면에서만
const read = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
const ids = [...new Set([...(read('data/yt_videos.json').videos || []), ...(read('data/yt_bc.json').videos || [])].map(v => v.id))];
const now = {};
for (let i = 0; i < ids.length; i += 50) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: 'statistics', id: ids.slice(i, i + 50).join(','), key: KEY })}`);
  const d = await r.json();
  if (!r.ok) { console.log(`::error::${r.status} ${d.error?.message || ''}`); process.exit(1); }
  d.items.forEach(v => { now[v.id] = Number(v.statistics.viewCount || 0); });
}
const kst = new Date(Date.now() + 9 * 3600e3), day = kst.toISOString().slice(0, 10);
const old = read(HIST);
const days = [...(old.days || []).filter(x => x.d !== day), { d: day, v: now }].slice(-8);
const weeks = (old.weeks || []).filter(x => x.d !== day);
if (kst.getUTCDay() === 0 || !weeks.length) weeks.push({ d: day, v: Object.fromEntries(Object.entries(now).filter(([, n]) => n >= 100000)) });
fs.writeFileSync(HIST, JSON.stringify({ d: day, days, weeks: weeks.slice(-104) }));
// 일주일 전(없으면 가장 오래된 날) 조회수: 이번 주 증가·고비 돌파 계산용
const ago = days[0];
fs.writeFileSync(OUT, JSON.stringify({ d: day, ago: ago.d, now, prev: ago.d === day ? {} : ago.v }));
console.log(`::notice::영상 ${Object.keys(now).length}개 조회수 저장 (${day})`);
