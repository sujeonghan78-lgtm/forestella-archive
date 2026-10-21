// 보충 영상(extra_events.json videos)이 일정·곡·프로그램 모아보기에 잘 붙었는지 점검
// 사용: node tools/check_links.cjs <시트 CSV 폴더> <사이트 폴더> <출력 폴더>
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const S = process.argv[2], SITE = process.argv[3], OUT = process.argv[4];
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['Galaxy S9+'] })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.route('**/*', r => { const u = r.request().url();
    if (u.includes('docs.google.com/spreadsheets')) { const f = u.includes('1669749288') ? 'concerts.csv' : u.includes('1927596948') ? 'albums.csv' : u.includes('1934245955') ? 'x.csv' : u.includes('1306269272') ? 'events.csv' : u.includes('1124775229') ? 'videos.csv' : 'reports.csv'; return r.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: fs.readFileSync(path.join(S, f)) }); }
    if (u.startsWith('http://site/')) { const f = path.join(SITE, u.replace('http://site/', '').split('#')[0].split('?')[0] || 'index.html'); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); }
    if (/ytimg|twimg|\.(jpg|png)/.test(u)) return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#9ab"/></svg>' });
    return r.abort(); });
  await p.goto('http://site/index.html#/'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const d = await DATA.load();
    const ex = await (await fetch('data/extra_events.json')).json();
    const songs = [...(d.songs.values ? d.songs.values() : Object.values(d.songs))];
    const flat = s => (s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const bad = [], tv = new Set();
    (ex.videos || []).forEach(v => {
      const e = d.byId.get(v['일정ID']);
      if (!e) return bad.push(`일정 없음 ${v['일정ID']} ${v['영상ID']}`);
      if (!e.related.some(x => x.videoId === v['영상ID'])) {
        const other = d.videos.find(x => x.videoId === v['영상ID'] && x.eventId !== e.id);
        if (!other) bad.push(`일정에 안 붙음 ${e.id} ${v['영상ID']}`);
      }
      if (/TV|라디오/.test(e.category)) tv.add(e.id);
      v['제목'].split(' / ').forEach(t => {
        const so = songs.find(s => flat(s.name) === flat(t.replace(/\s*\(.*\)$/, '')));
        if (!so) return;
        if (!e.songKeys.includes(so.key)) bad.push(`일정 곡 목록에 없음 ${e.id} ${so.name}`);
        else if (!so.events.includes(e)) bad.push(`곡 페이지에 안 뜸 ${so.name} ← ${e.id}`);
      });
    });
    return { n: (ex.videos || []).length, bad, tv: [...tv] };
  });
  // 프로그램 모아보기: TV·라디오 일정이 어느 프로그램 화면에든 나오는지
  await p.goto('http://site/index.html#/program'); await p.waitForTimeout(800);
  const progs = await p.$$eval('a[href^="#/program/"]', as => [...new Set(as.map(a => a.getAttribute('href')))]);
  const seen = new Set();
  for (const h of progs) {
    await p.goto('http://site/index.html' + h); await p.waitForTimeout(250);
    (await p.$$eval('[href^="#/e/"], [data-id]', as => as.map(a => (a.getAttribute('href') || '').replace('#/e/', '') || a.getAttribute('data-id')))).forEach(id => seen.add(id));
  }
  r.tv.filter(id => !seen.has(id)).forEach(id => r.bad.push(`프로그램 모아보기에 없음 ${id}`));
  console.log(`보충 영상 ${r.n}개 · 프로그램 화면 ${progs.length}개(일정 ${seen.size}개) · TV·라디오 일정 ${r.tv.length}개 · 문제 ${r.bad.length}개`);
  r.bad.forEach(x => console.log('  ' + x));
  await b.close(); })();
