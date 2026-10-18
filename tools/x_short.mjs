// 공식 X 글 속 단축 주소(vo.la, bit.ly 등)가 실제로 가는 주소를 찾아 data/x_links.json 의 "_short" 에 모아요.
import fs from 'node:fs';
const OUT = 'data/x_links.json';
const SHORT = /^(vo\.la|bit\.ly|me2\.kr|kko\.to|han\.gl|buly\.kr|url\.kr|lrl\.kr|t\.ly|tinyurl\.com|goo\.gl|naver\.me|bitly\.kr|abit\.ly)$/;
const out = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const short = out._short || {};
const key = u => u.replace(/^https?:\/\//, '');
const text = ['data/x_posts.csv', 'data/x_more.csv'].map(f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').join('\n');
const all = [...(text.match(/https?:\/\/\s?[^\s…",]+/g) || []).map(u => u.replace(/\s/g, '')),
  ...Object.entries(out).filter(([k]) => k !== '_short').flatMap(([, v]) => v)];
const todo = [...new Set(all.filter(u => { try { return SHORT.test(new URL(u).hostname.replace(/^www\./, '')); } catch (e) { return false; } }).map(key))]
  .filter(k => !(k in short));
console.log(`::notice::풀 단축 주소 ${todo.length}`);
let ok = 0, fail = 0;
for (const k of todo) {
  let u = 'https://' + k;
  try {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const loc = r.headers.get('location');
      if (!loc || r.status < 300 || r.status >= 400) break;
      u = new URL(loc, u).href;
    }
    if (key(u) !== k) { short[k] = u; ok++; } else fail++;
  } catch (e) { fail++; }
  await new Promise(r => setTimeout(r, 300));
}
out._short = short;
fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"'));
console.log(`::notice::풀림 ${ok} / 못 풂 ${fail} / 예: vo.la/VGk46CR → ${short['vo.la/VGk46CR'] || '없음'}`);
