// 빠진 공식 X 글 찾기 시험: 웹 아카이브 목록과 X 공개 타임라인에서 우리 목록에 없는 글 번호를 세요.
import fs from 'node:fs';
const have = new Set(fs.readFileSync('data/x_posts.csv', 'utf8').split('\n').slice(1).map(l => l.split(',')[1]).filter(Boolean));
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return [r.status, await r.text()]; };
const ids = new Set();
for (const host of ['twitter.com', 'x.com', 'mobile.twitter.com']) {
  try {
    const [st, t] = await get(`https://web.archive.org/cdx/search/cdx?url=${host}/official_fore/status/*&output=json&fl=original&collapse=urlkey&limit=50000`);
    const rows = st === 200 ? JSON.parse(t || '[]').slice(1) : [];
    rows.forEach(r => { const m = r[0].match(/status\/(\d{15,20})/); if (m) ids.add(m[1]); });
    console.log(`::notice::아카이브 ${host} ${st} 줄 ${rows.length}`);
  } catch (e) { console.log(`::notice::아카이브 오류 ${host} ${e.message}`); }
}
const fresh = [...ids].filter(i => !have.has(i) && BigInt(i) > 1422000000000000000n);
console.log(`::notice::아카이브 글번호 ${ids.size}, 우리 목록에 없는 2021-08 이후 ${fresh.length}`);
fs.writeFileSync('x_missing_ids.txt', fresh.join('\n'));
try {
  const [st, t] = await get('https://syndication.twitter.com/srv/timeline-profile/screen-name/official_fore');
  const n = (t.match(/"id_str":"\d+"/g) || []).length;
  console.log(`::notice::타임라인 ${st} 글 ${n} 길이 ${t.length}`);
} catch (e) { console.log(`::notice::타임라인 오류 ${e.message}`); }
