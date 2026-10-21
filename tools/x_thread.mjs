// 공식 계정이 자기 글에 이어 단 타래 글(data/x_more.csv 의 reply 중 팬 답글이 아닌 것)을 data/x_extra.json 으로 만들어요.
// 분류 규칙은 tools/x_sync.mjs 의 CATS·MEMBERS를 그대로 가져다 써요.
import fs from 'node:fs';
const src = fs.readFileSync('tools/x_sync.mjs', 'utf8');
const rules = src.slice(src.indexOf('const CATS'), src.indexOf('// 한국 시간 날짜'));
const classify = new Function(rules + '; return classify;')();
const rows = fs.readFileSync('data/x_more.csv', 'utf8').trim().split('\n').slice(1);
const parse = l => { const out = []; let cell = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ',') { out.push(cell); cell = ''; } else cell += c; } out.push(cell); return out; };
const photos = JSON.parse(fs.readFileSync('data/x_photos.json', 'utf8'));
const posts = rows.map(parse).filter(([, , text, reply]) => reply && !text.startsWith('@'))
  .map(([date, id, text]) => ({ id, date, ...classify(text), text: text.replace(/\s*https:\/\/t\.co\/\w+$/, ''), imgs: photos[id] || [] }));
fs.writeFileSync('data/x_extra.json', JSON.stringify({ source: '공식 X 타래 글 (웹 아카이브)', posts }));
console.log(posts.length);
