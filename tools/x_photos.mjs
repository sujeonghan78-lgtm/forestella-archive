// data/x_posts.csv 의 공식 X 글마다 사진 주소를 받아 data/x_photos.json 에 모아요.
// X 공개 임베드용 주소(cdn.syndication.twimg.com)를 써요. 이미 받은 글은 건너뜀.
// 사용: node tools/x_photos.mjs [개수]
import fs from 'node:fs';

const OUT = 'data/x_photos.json';
const limit = Number(process.argv[2]) || Infinity;
const token = id => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const ids = fs.readFileSync('data/x_posts.csv', 'utf8').split('\n').slice(1)
  .map(l => l.split(',')[1]).filter(i => i && !(i in out));

let ok = 0, fail = 0, err = '';
for (const id of ids.slice(0, limit)) {
  try {
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=ko&token=${token(id)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    out[id] = (d.mediaDetails || []).map(m => m.media_url_https).filter(Boolean);
    ok++;
  } catch (e) {
    fail++; err = `${id}: ${e.message}`;
    if (fail >= 20 && ok === 0) break;
  }
  await new Promise(r => setTimeout(r, 700));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 0));
const withPic = Object.values(out).filter(v => v.length).length;
console.log(`::notice::받음 ${ok} / 실패 ${fail} / 사진 있는 글 ${withPic} / 전체 ${Object.keys(out).length} ${err}`);
const ex = Object.keys(out).find(k => out[k].length);
if (ex) console.log(`::notice::예시 ${ex} ${out[ex].slice(0, 2).join(' ')}`);
