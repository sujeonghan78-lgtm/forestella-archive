// 웹 아카이브에 남은 공식 X 글 번호 중 우리 목록(data/x_posts.csv)에 없는 글을 X 공개 임베드 주소로 받아와요.
// 결과: data/x_more.csv (date,id,text,reply) + 사진은 data/x_photos.json 에 더해요.
import fs from 'node:fs';
const have = new Set(fs.readFileSync('data/x_posts.csv', 'utf8').split('\n').slice(1).map(l => l.split(',')[1]).filter(Boolean));
const OUT = 'data/x_more.csv';
const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').slice(1).map(l => l.split(',')[1]).filter(Boolean) : []);
const tried = new Set(fs.existsSync('data/x_more_skip.txt') ? fs.readFileSync('data/x_more_skip.txt', 'utf8').split('\n').filter(Boolean) : []);
const photos = JSON.parse(fs.readFileSync('data/x_photos.json', 'utf8'));
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };
const ids = new Set();
for (const host of ['twitter.com', 'x.com', 'mobile.twitter.com']) {
  try {
    const rows = JSON.parse(await get(`https://web.archive.org/cdx/search/cdx?url=${host}/official_fore/status/*&output=json&fl=original&collapse=urlkey&limit=50000`) || '[]').slice(1);
    rows.forEach(r => { const m = r[0].match(/status(?:es)?\/(\d{15,20})/); if (m) ids.add(m[1]); });
  } catch (e) { console.log(`::notice::아카이브 오류 ${host} ${e.message}`); }
}
const todo = [...ids].filter(i => !have.has(i) && !done.has(i) && !tried.has(i));
console.log(`::notice::받을 글 ${todo.length}`);
const token = id => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
const q = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
const lines = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n') : ['date,id,text,reply'];
const skip = [];
let ok = 0, gone = 0, other = 0, fail = 0;
for (const id of todo) {
  try {
    const d = JSON.parse(await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=ko&token=${token(id)}`));
    if (!d.text && !d.created_at) { gone++; skip.push(id); continue; }
    if ((d.user || {}).screen_name?.toLowerCase() !== 'official_fore') { other++; skip.push(id); continue; }
    const kst = new Date(new Date(d.created_at).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
    const text = (d.text || '').replace(/\s+/g, ' ').trim();
    lines.push([kst, id, q(text), d.in_reply_to_screen_name ? 'reply' : ''].join(','));
    photos[id] = (d.mediaDetails || []).map(m => m.media_url_https).filter(Boolean);
    ok++;
  } catch (e) {
    if (/404/.test(e.message)) { gone++; skip.push(id); } else { fail++; if (fail > 30 && ok === 0) break; }
  }
  await new Promise(r => setTimeout(r, 600));
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
fs.writeFileSync('data/x_more_skip.txt', [...tried, ...skip].join('\n'));
fs.writeFileSync('data/x_photos.json', JSON.stringify(photos));
console.log(`::notice::새 글 ${ok} / 지워진 글 ${gone} / 다른 계정 ${other} / 실패 ${fail}`);
