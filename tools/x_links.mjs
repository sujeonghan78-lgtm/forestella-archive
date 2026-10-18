// 공식 X 글 본문의 t.co 짧은 주소를 원래 주소로 풀어 data/x_links.json 에 모아요 ({글ID: [주소…]}).
// X 공개 임베드용 주소(cdn.syndication.twimg.com)를 써요. 이미 받은 글은 건너뜀. 사진 링크(pic)는 빼요.
import fs from 'node:fs';
const OUT = 'data/x_links.json';
const token = id => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const rows = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').slice(1) : [];
const ids = [...new Set([...rows('data/x_posts.csv'), ...rows('data/x_more.csv')]
  .filter(l => /t\.co\//.test(l)).map(l => l.split(',')[1]).filter(i => /^\d+$/.test(i || '') && !(i in out)))];
console.log(`::notice::풀 글 ${ids.length}`);
let ok = 0, fail = 0;
for (const id of ids) {
  try {
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=ko&token=${token(id)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    out[id] = ((d.entities || {}).urls || []).map(u => u.expanded_url).filter(u => u && !/(twitter|x)\.com\/[^/]+\/status\/\d+\/(photo|video)/.test(u));
    ok++;
  } catch (e) { fail++; if (fail >= 30 && ok === 0) break; }
  await new Promise(r => setTimeout(r, 600));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"'));
console.log(`::notice::받음 ${ok} / 실패 ${fail} / 링크 있는 글 ${Object.values(out).filter(v => v.length).length}`);
