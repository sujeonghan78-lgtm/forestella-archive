// 시트 CSV + 보충 파일(data/extra_events.json)을 합쳐 저장소 원본(data/db/*.csv)을 만들어요. (2026-11 시트 → 저장소 옮길 때 한 번 쓴 도구)
// 쓰는 법: node tools/db_bake.mjs <시트 CSV 폴더(events.csv·videos.csv·albums.csv·concerts.csv·x.csv)>
// 합친 뒤에는 data/db/*.csv가 원본이에요. 사이트는 이 파일만 읽고, 고칠 때도 이 파일을 고쳐요.
import fs from 'node:fs';
const SRC = process.argv[2];
globalThis.window = globalThis;
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
(0, eval)(fs.readFileSync('data.js', 'utf8'));
const { parseCSV, songKey } = window.DATA;
const splitSongs = s => String(s || '').split('/').flatMap(x => x.split(/\s+[+&]\s+/)).map(x => x.trim()).filter(Boolean);
const read = n => { const [head, ...rows] = parseCSV(fs.readFileSync(`${SRC}/${n}.csv`, 'utf8')); const keys = head.map(h => h.trim()); return { keys, rows: rows.filter(r => r.some(c => (c || '').trim())).map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()]))) }; };
const cell = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const write = (n, keys, rows) => { rows.forEach(r => Object.keys(r).forEach(k => { if (!keys.includes(k)) keys.push(k); })); fs.writeFileSync(`data/db/${n}.csv`, [keys, ...rows.map(r => keys.map(k => String(r[k] ?? '')))].map(r => r.map(cell).join(',')).join('\n') + '\n'); console.log(n, rows.length); };
const extra = JSON.parse(fs.readFileSync('data/extra_events.json', 'utf8'));
fs.mkdirSync('data/db', { recursive: true });

// 일정
const ev = read('events');
const ids = new Set(ev.rows.map(r => r.ID));
(extra.rows || []).forEach(r => { if (!ids.has(r.ID)) { ev.rows.push({ ...r }); ids.add(r.ID); } });
const byId = new Map(ev.rows.map(r => [r.ID, r]));
Object.entries(extra.eventFix || {}).forEach(([id, f]) => { if (byId.has(id)) Object.assign(byId.get(id), f); });
(extra.hide || []).forEach(id => { if (byId.has(id)) byId.get(id)['공개여부'] = '숨김'; });
const left = { placeFix: {}, songs: {}, songSrc: {}, addSongs: {} };
const live = id => { const r = byId.get(id); return r && r['공개여부'] !== '숨김' ? r : null; };
Object.entries(extra.placeFix || {}).forEach(([id, p]) => { const r = live(id); if (!r) left.placeFix[id] = p; else if (!r['장소']) r['장소'] = p; });
Object.entries(extra.songs || {}).forEach(([id, s]) => {
  const r = live(id);
  if (!r) { left.songs[id] = s; if ((extra.songSrc || {})[id]) left.songSrc[id] = extra.songSrc[id]; return; }
  if (!splitSongs(r['확인된 곡']).length) { r['확인된 곡'] = s; r['곡 확인 출처'] = (extra.songSrc || {})[id] || r['곡 확인 출처'] || '나무위키'; }
});
Object.entries(extra.addSongs || {}).forEach(([id, s]) => {
  const r = live(id);
  if (!r || r['곡 확인 출처'] === '참고') { left.addSongs[id] = s; return; }
  const have = new Set(splitSongs(r['확인된 곡']).map(songKey).filter(Boolean));
  splitSongs(s).forEach(n => { const k = songKey(n); if (k && !have.has(k)) { have.add(k); r['확인된 곡'] = r['확인된 곡'] ? r['확인된 곡'] + ' / ' + n : n; } });
});
ev.rows.sort((a, b) => String(a['날짜']).localeCompare(String(b['날짜'])) || String(a.ID).localeCompare(String(b.ID)));
write('events', ev.keys, ev.rows);

// 관련 영상
const vd = read('videos');
const vids = new Set(vd.rows.map(r => r['영상ID']).filter(Boolean));
(extra.videos || []).forEach(r => { if (r['영상ID'] && !vids.has(r['영상ID'])) vd.rows.push({ ...r }); });
write('videos', vd.keys, vd.rows);

// 음반
const al = read('albums');
(extra.albums || []).forEach(r => { if (!al.rows.some(a => a['멤버'] === r['멤버'] && a['앨범명'] === r['앨범명'])) al.rows.push({ ...r }); });
al.rows.forEach(a => Object.assign(a, (extra.albumFix || {})[a['멤버'] + '|' + a['앨범명']] || {}));
write('albums', al.keys, al.rows);

// 콘서트
const co = read('concerts');
(extra.concerts || []).forEach(r => { if (!co.rows.some(c => c['투어ID'] === r['투어ID'])) co.rows.push({ ...r }); });
co.rows.forEach(c => Object.assign(c, (extra.concertFix || {})[c['투어ID']] || {}));
co.rows.forEach(c => { const f = (extra.posterFix || {})[c['투어ID']]; if (f && !c['포스터']) c['포스터'] = f; });
write('concerts', co.keys, co.rows);

// 공식 X
const x = read('x');
write('x', x.keys, x.rows);

// 보충 파일에는 원본에 못 넣는 것(팬 제보와 얽힌 것)만 남겨요
['rows', 'eventFix', 'hide', 'videos', 'albums', 'albumFix', 'concerts', 'concertFix', 'posterFix', 'placeFix', 'songs', 'songSrc', 'addSongs'].forEach(k => delete extra[k]);
Object.entries(left).forEach(([k, v]) => { if (Object.keys(v).length) extra[k] = v; });
extra.note = '원본(data/db/*.csv)에 넣을 수 없는 보충만 둬요: 팬 등록 일정(u…)에 붙는 값, 팬 셋리, 지역, 합치기, 캐스팅 회차 등.';
fs.writeFileSync('data/extra_events.json', JSON.stringify(extra, null, 1) + '\n');
console.log('남은 보충:', Object.entries(extra).filter(([k]) => k !== 'note').map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : Object.keys(v).length}`).join(', '));
