// 화면 전환과 그리기
(function () {
  const view = document.getElementById('view');
  let data = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function header() {
    return `
      <header class="brand">
        <span class="brand-name">숲별 기록장</span>
        <span class="brand-sub">포레스텔라 비공식 팬 아카이브</span>
      </header>`;
  }

  function soon(title, note) {
    return `
      <section class="soon">
        <h1 class="h1">${esc(title)}</h1>
        <p>${esc(note)}</p>
      </section>`;
  }

  // ---------- 공통 조각 ----------
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  function fmtDate(iso, withDay = true) {
    const [y, m, d] = iso.split('-').map(Number);
    const day = DAYS[new Date(y, m - 1, d).getDay()];
    return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}${withDay ? ` (${day})` : ''}`;
  }
  function todayParts() {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(), iso: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` };
  }
  const tag = cat => `<span class="tag">${esc(cat)}</span>`;
  // 아직 오지 않은 일정에는 '예정' 표시
  const upcoming = e => e.date > todayParts().iso ? '<span class="upcoming">예정</span>' : '';
  // 목록에서는 곡을 앞 3곡만, 나머지는 '외 N곡'으로 (전체는 일정 상세에서)
  const songsShort = (list, sep = ', ') => list.length > 3 ? `${list.slice(0, 3).map(esc).join(sep)} 외 ${list.length - 3}곡` : list.map(esc).join(sep);
  const songsLine = e => e.songSource === '참고' || !e.songs.length ? '' :
    `<span class="songs"><span class="songs-label">확인된 곡</span>${songsShort(e.songs, ' · ')}</span>`;
  const playBadge = e => e.videoId ?
    `<span class="play-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>영상</span>` : '';

  // 하루 동안 같은 결과가 나오는 랜덤 (오늘의 랜덤 무대)
  // ---------- 공유 ----------
  const SITE = location.origin + location.pathname.replace(/index\.html$/, '');
  const TAGS = '#포레스텔라 #숲별기록장';
  const link = path => SITE + path;
  const xUrl = (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? '&url=' + encodeURIComponent(url) : ''}`;
  const shareIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>';
  // 동그란 공유 버튼 (홈 · 곡 상세 · 프로그램별)
  const shareBtn = (label, text, url) =>
    `<button type="button" class="share-round" data-share data-text="${esc(text)}" data-url="${esc(url)}" aria-label="${esc(label)}">${shareIcon}</button>`;

  function eventShareText(e) {
    const songs = e.songSource !== '참고' && e.songs.length ? `\n🎵 ${e.songs.join(' / ')}` : '';
    return `📅 ${fmtDate(e.date, false)} ${e.title}${songs}\n\n${TAGS}`;
  }

  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('링크를 복사했어요'); }
    catch (err) { window.prompt('이 주소를 복사해 주세요', text); }
  }

  // 폰은 기본 공유창, 컴퓨터는 X · 링크 복사 메뉴
  function shareMenu(text, url) {
    const old = document.getElementById('share-menu');
    if (old) old.remove();
    const m = document.createElement('div');
    m.id = 'share-menu';
    m.className = 'share-menu';
    m.innerHTML = `
      <div class="share-backdrop"></div>
      <div class="share-box" role="dialog" aria-label="공유하기">
        <a class="share-item" href="${xUrl(text, url)}" target="_blank" rel="noopener">X에 올리기</a>
        <button type="button" class="share-item" data-copy="${esc(url || text)}">${url ? '링크 복사' : '문구 복사'}</button>
        <button type="button" class="share-item share-cancel">닫기</button>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('.share-backdrop').onclick = close;
    m.querySelector('.share-cancel').onclick = close;
    m.querySelector('a').onclick = () => setTimeout(close, 100);
  }

  async function share(text, url) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share(url ? { text, url } : { text }); } catch (err) { /* 사용자가 닫음 */ }
      return;
    }
    shareMenu(text, url);
  }

  // 덜 중요한 설명은 제목 옆 (?) 버튼을 눌러야 보여요
  const help = html => `<button type="button" class="help" aria-label="설명 보기" aria-expanded="false">?</button><span class="help-pop" hidden>${html}</span>`;

  // 확실하지 않은 항목: 이름 옆 동그라미 ? (누르면 이유가 잠깐 떠요)
  const unsure = t => t ? help(esc(t)) : '';

  document.addEventListener('click', ev => {
    const h = ev.target.closest('.help');
    document.querySelectorAll('.help[aria-expanded="true"]').forEach(b => {
      if (b === h) return;
      b.setAttribute('aria-expanded', 'false'); b.nextElementSibling.hidden = true;
    });
    if (h) {
      const open = h.getAttribute('aria-expanded') !== 'true';
      h.setAttribute('aria-expanded', String(open)); h.nextElementSibling.hidden = !open;
      ev.preventDefault();  // 카드 링크 안에 있어도 이동하지 않게
      return;
    }
    const s = ev.target.closest('[data-share]');
    if (s) { ev.preventDefault(); share(s.dataset.text, s.dataset.url); return; }
    const bx = ev.target.closest('[data-box]');
    if (bx) {
      ev.preventDefault();
      const { box: k, id } = bx.dataset;
      boxToggle(k, id);
      document.querySelectorAll(`[data-box="${k}"]`).forEach(b => { if (b.dataset.id === id) { b.setAttribute('aria-pressed', String(boxHas(k, id))); b.textContent = b.dataset.label ? (boxHas(k, id) ? '✓ ' : (b.dataset.ic || '🎫') + ' ') + b.dataset.label : BOX_LABEL[k][boxHas(k, id) ? 1 : 0]; } });
      return;
    }
    const c = ev.target.closest('[data-copy]');
    if (c) {
      ev.preventDefault();
      copyText(c.dataset.copy);
      const m = document.getElementById('share-menu');
      if (m) m.remove();
    }
  });

  // ---------- 보관함 (♡ 좋아요 · 🎫 직관): 이 폰에 저장, 이름+숫자 4자리로 다른 폰에서 이어 쓰기 ----------
  const BOX_KEY = 'sb-box', BOX_USER = 'sb-box-user';
  const boxRead = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (err) { return null; } };
  const boxWrite = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* 저장 못 해도 괜찮아요 */ } };
  const boxClean = b => ({ e: (b && b.e) || [], s: (b && b.s) || [], w: (b && b.w) || [], v: (b && b.v) || [], t: (b && b.t) || 0 });
  let box = boxClean(boxRead(BOX_KEY));
  let boxUser = boxRead(BOX_USER);  // { name, pin, at }
  const boxApi = () => (window.CONFIG || {}).boxApi || '';
  const boxHas = (k, id) => box[k].includes(id);
  const BOX_LABEL = { e: ['♡ 좋아요', '♥ 좋아요'], s: ['♡', '♥'], w: ['🎫 직관했어요', '🎫 직관 ✓'], v: ['📺 시청했어요', '📺 시청 ✓'] };
  const boxBtn = (k, id, cls = 'act') => `<button type="button" class="${cls} box-btn" data-box="${k}" data-id="${esc(id)}" aria-pressed="${boxHas(k, id)}"${k === 's' ? ' aria-label="이 곡 좋아요"' : ''}>${BOX_LABEL[k][boxHas(k, id) ? 1 : 0]}</button>`;
  async function boxCall(action, extra = {}) {
    const r = await fetch(boxApi(), { method: 'POST', body: JSON.stringify({ action, name: boxUser && boxUser.name, pin: boxUser && boxUser.pin, ...extra }) });
    return r.json();
  }
  let boxTimer = null;
  function boxPush() {
    if (!boxUser || !boxApi()) return;
    clearTimeout(boxTimer);
    boxTimer = setTimeout(() => boxCall('save', { data: box }).then(r => {
      if (r.ok) { boxUser.at = Date.now(); boxWrite(BOX_USER, boxUser); }
    }).catch(() => { /* 다음에 다시 보내요 */ }), 1500);
  }
  let boxDirty = false;
  function boxToggle(k, id) {
    boxDirty = true;
    box[k] = boxHas(k, id) ? box[k].filter(x => x !== id) : [id, ...box[k]];
    box.t = Date.now();
    boxWrite(BOX_KEY, box);
    boxPush();
  }
  // 앱을 열 때 서버 쪽이 더 새로우면 받아와요
  function boxPull() {
    if (!boxUser || !boxApi()) return;
    boxCall('load').then(r => {
      if (!r.ok || !r.data) return;
      const srv = boxClean(r.data);
      if (srv.t > box.t) { box = boxClean(srv); boxWrite(BOX_KEY, box); if (currentRoute() === 'box') renderBase('box'); }
      else if (box.t > srv.t) boxPush();
    }).catch(() => { /* 오프라인이면 폰 저장만 써요 */ });
  }

  // ---------- 홈 ----------
  // 정확히 같은 날짜가 없으면, 앞뒤 3일 안에서 가장 가까운 날을 보여줘요.
  function yearsAgoToday() {
    const t = todayParts();
    const md = iso => iso.slice(5);
    for (let off = 0; off <= 3; off++) {
      for (const sign of off ? [1, -1] : [0]) {
        const d = new Date(t.y, t.m - 1, t.d + sign * off);
        const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const hits = data.events.filter(e => md(e.date) === key && e.date.slice(0, 4) < String(t.y));
        if (hits.length) return { exact: off === 0, hits: hits.sort((a, b) => b.date.localeCompare(a.date)) };
      }
    }
    return { exact: false, hits: [] };
  }

  function homeAgo() {
    const t = todayParts();
    const { exact, hits } = yearsAgoToday();
    if (!hits.length) return '';
    const yearsOf = e => t.y - Number(e.date.slice(0, 4));
    const years = yearsOf(hits[0]);
    // 그날 기록이 여러 해에 걸쳐 있으면 '지난 오늘'로 묶고, 카드마다 몇 년 전인지 붙여요
    const multi = new Set(hits.map(yearsOf)).size > 1;
    const title = multi ? (exact ? '지난 오늘' : '지난 이맘때') : exact ? `${years}년 전 오늘` : `${years}년 전 이맘때`;
    const xImg = e => (e.xPost && e.xPost.img) || ((e.xBehind || []).find(p => p.img) || {}).img || '';
    const cards = hits.map(e => `
      <a class="hero${xImg(e) ? ' hero-pic' : ''}" href="#/e/${encodeURIComponent(e.id)}">
        ${xImg(e) ? `<img class="hero-img" src="${esc(xImg(e))}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('hero-pic');this.remove()">` : ''}
        <span class="meta">${tag(e.category)}<span>${fmtDate(e.date)}${multi ? ` · ${yearsOf(e)}년 전` : ''}</span></span>
        <span class="hero-title">${esc(e.title)}</span>
        <span class="hero-foot">${songsLine(e)}${playBadge(e)}</span>
      </a>`).join('');
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">${title}</h2><span class="sub head-side">${t.m}월 ${t.d}일${exact ? shareBtn(title + ' 공유하기', agoText(years, hits[0]), link('#/e/' + encodeURIComponent(hits[0].id))) : ''}</span></div>
        <div class="stack">${cards}</div>
      </section>`;
  }

  function agoText(years, e) {
    const song = e.songSource !== '참고' && e.songs.length ? ` 「${e.songs[0]}」` : '';
    return `${years}년 전 오늘의 포레스텔라 🌲\n${e.title}${song}\n\n${TAGS}`;
  }

  // 랜덤 무대 후보: 곡이 확인된 무대 영상 전체에서 (영상, 곡) 한 쌍씩. 뽑힌 곡이 나오는 그 영상을 보여줘요.
  // 공식 채널 무대·라이브·직캠·클립 + 시트 일정 영상(곡이 하나뿐인 일정만). 최근에 나온 것들은 한동안 다시 안 나와요.
  let pickCount = 0;
  let randomPick = null;
  let randomPool = null;
  const RECENT_KEY = 'soopbyeol-recent-picks';
  const STAGE_KINDS = ['무대', '라이브', '직캠', '클립'];
  function recentPicks() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (err) { return []; }
  }
  // 일정 없는 영상은 제목의 [프로그램] 이름, 없으면 채널 이름으로
  const vidWhere = v => !v.bc ? (v.title.replace(/^.*[’'"”]\s*/, '').trim() || v.kind) : ((v.title.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1).split(/[/,|]/)[0].trim()).find(x => !/직캠|focus|4k|eng|페이스캠|가로|세로|fancam|kbs|mbc|sbs|jtbc/i.test(x)) || v.bc || v.ch || '공식 영상');
  // 일정 없는 영상도 일정 상세 창으로 열리게 영상 한 줄짜리 일정을 만들어 둬요 (data.js 방송 무대와 같은 모양)
  function ytEvent(v, so) {
    const id = 'yt-' + v.id;
    if (!data.byId.has(id)) data.byId.set(id, { id, ytOnly: v, date: v.date, category: v.bc ? 'TV' : '유튜브', title: vidWhere(v), place: v.bc || (v.ch ? v.ch + ' 유튜브' : '포레스텔라 공식 유튜브'), songs: [so.name], songKeys: [so.key], related: [], members: v.members || [], videoId: v.id });
    return data.byId.get(id);
  }
  function randomCandidates() {
    if (randomPool && randomPool.data === data) return randomPool.list;
    const list = [], seen = new Set();
    data.songs.forEach(so => (so.official || []).forEach(v => {
      if (!STAGE_KINDS.includes(v.kind) || (v.loose || []).includes(so.key) || seen.has(v.id)) return;
      seen.add(v.id);
      const e = v.event || ytEvent(v, so);
      list.push({ vid: v.id, so, e, date: v.date, where: e.title });
    }));
    data.events.forEach(e => {
      if (e.songSource === '참고' || !e.videoId || seen.has(e.videoId) || e.songs.length !== 1) return;
      const so = data.songs.get(window.DATA.songKey(e.songs[0]));
      if (so) { seen.add(e.videoId); list.push({ vid: e.videoId, so, e, date: e.date, where: e.title }); }
    });
    // 일정의 관련 영상 중 곡 하나짜리 무대도 넣어요
    data.events.forEach(e => {
      if (e.songSource === '참고') return;
      e.related.forEach(v => {
        if (seen.has(v.videoId)) return;
        const ks = (v.title || '').split(' / ').map(window.DATA.songKey).filter(k => k && data.songs.has(k));
        if (ks.length !== 1 || !e.songKeys.includes(ks[0])) return;
        seen.add(v.videoId); list.push({ vid: v.videoId, so: data.songs.get(ks[0]), e, date: e.date, where: e.title });
      });
    });
    randomPool = { data, list };
    return list;
  }
  function homeRandom() {
    const pool = randomCandidates();
    if (!pool.length) return '';
    if (!randomPick || randomPick.n !== pickCount || !pool.includes(randomPick.p)) {
      const recent = recentPicks();
      const keep = Math.max(1, pool.length - 20); // 거의 다 한 번씩 나온 뒤에야 다시 나와요
      const fresh = pool.filter(p => !recent.includes(p.vid));
      const from = fresh.length ? fresh : pool;
      const p = from[Math.floor(Math.random() * from.length)];
      randomPick = { n: pickCount, p };
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([p.vid, ...recent].slice(0, keep))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
    }
    const { vid, so, e, date, where } = randomPick.p;
    const song = so.name;
    // 일정 상세 창으로 열고, 창 맨 위 영상 자리에 뽑힌 영상을 보여줘요 (?v=영상)
    const href = `#/e/${encodeURIComponent(e.id)}?v=${encodeURIComponent(vid)}`;
    return `
      <section class="block" id="random">
        <div class="block-head"><h2 class="h2">오늘의 랜덤 무대</h2><span class="head-side"><button type="button" class="reroll" id="reroll"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>다시 뽑기</button>${shareBtn('랜덤 무대 공유하기', `오늘의 포레스텔라 랜덤 무대 🎲\n${fmtDate(date, false)} ${e ? e.title + ' · ' : ''}${song}\nhttps://youtu.be/${vid}\n\n나도 뽑아보기 👉 ${SITE}\n${TAGS}`, '')}</span></div>
        <div class="dice-card">
          <a class="dice-link" href="${href}">
            <span class="dice-thumb" aria-hidden="true"><img src="https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="dice-play"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span></span>
            <span class="dice-text">
              <span class="sub">${fmtDate(date, false)} · ${esc(where)}</span>
              <span class="dice-song">${esc(song)}</span>
            </span>
          </a>
        </div>
      </section>`;
  }

  // 이 달의 기록: 해마다 같은 달, 해마다 한 줄 (곡·영상이 있는 일정을 먼저)
  function homeMonth() {
    const t = todayParts();
    const mm = String(t.m).padStart(2, '0');
    const byYear = new Map();
    data.events.filter(e => e.date.slice(5, 7) === mm && e.date.slice(0, 4) < String(t.y)).forEach(e => {
      const y = e.date.slice(0, 4);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(e);
    });
    if (!byYear.size) return '';
    const score = e => (e.videoId ? 2 : 0) + (e.songs.length ? 1 : 0) - (['유튜브', '생일', '네이버TV'].includes(e.category) ? 4 : 0);
    const rows = [...byYear.keys()].sort().slice(-3).map(y => {
      const e = byYear.get(y).slice().sort((a, b) => score(b) - score(a) || a.date.localeCompare(b.date))[0];
      const sub = e.songs.length && e.songSource !== '참고'
        ? `${e.songs[0]}${e.songs.length > 1 ? ' 외' : ''}` : (e.place || e.category);
      return `
        <a class="row" href="#/e/${encodeURIComponent(e.id)}">
          <span class="row-year">${y}</span>
          <span class="row-body"><span class="row-title">${esc(e.title)}</span><span class="row-sub">${e.date.slice(5).replace('-', '.')} · ${esc(sub)}</span></span>
        </a>`;
    }).join('');
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">${t.m}월의 기록</h2><a class="more" href="#/timeline">더 보기</a></div>
        <p class="sub">해마다 ${t.m}월에 있었던 무대들</p>
        <div>${rows}</div>
      </section>`;
  }


  function homeShortcuts() {
    // 가장 최근 음반 표지·콘서트 포스터를 썸네일로 (없으면 아이콘)
    const tile = (href, icon, label, sub, img) =>
      `<a class="sc${img ? ' sc-pic' : ''}" href="${href}">${img ? `<img class="sc-img" src="${esc(imgSize(img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('sc-pic');this.remove()">` : ''}${menuIcon(icon)}<span class="sc-l">${label}</span><span class="sc-s">${sub}</span></a>`;
    const alb = (data.albums || []).filter(a => a.img).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const con = (data.concerts || []).map(c => ({ c, img: c.img || tourPic(c.tour) })).filter(x => x.img).sort((a, b) => (a.c.from < b.c.from ? 1 : -1))[0];
    return `
      <section class="block">
      <h2 class="h2 sc-head">음반 · 콘서트</h2>
      <nav class="shortcuts" aria-label="음반·콘서트">
        ${tile('#/releases', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>', '음반 이야기', alb ? '최근 · ' + esc(alb.name) : '앨범·싱글별', alb && alb.img)}
        ${tile('#/concerts', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', '콘서트', con ? '최근 · ' + esc(con.c.name) : `공연 ${(data.concerts || []).length || data.tours.length}개`, con && con.img)}
      </nav>
      </section>`;
  }
  function homeMembers() {
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">멤버별 활동</h2><a class="more" href="#/members">전체 보기</a></div>
        <nav class="mem-row">${MEMBER_LIST.map(m => {
          // 그 멤버만 나온 최근 공식 X 사진을 얼굴 칸으로, 아래엔 가장 최근 소식 날짜
          const pic = (data.xFeed || []).find(p => p.img && p.m.length === 1 && p.m[0] === m);
          const last = [...(data.official || []).filter(v => v.members.includes(m)), ...(data.xFeed || []).filter(p => p.m.includes(m))].map(x => x.date).sort().pop();
          return `<a href="#/members?m=${encodeURIComponent(m)}"><span class="mem-pic">${pic ? `<img src="${esc(pic.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span><b>${m}</b>${last ? `<span>최근 ${last.slice(2).replace(/-/g, '.')}</span>` : ''}</a>`;
        }).join('')}</nav>
      </section>`;
  }
  function homePrograms() {
    const top = programList().filter(p => p.name !== OTHER_PROG && p.name !== MIX_PROG).slice(0, 8);
    return `
      <section class="block prog-mini">
        <div class="sec-head"><h2 class="h3">프로그램별 모아보기</h2><a class="more-link" href="#/program">전체 ›</a></div>
        <div class="prog-scroll">${top.map(p => `<a class="prog-card" href="${progHref(p.name)}"><span class="prog-thumb">${progThumb(p)}</span><b>${esc(p.name)}</b><span class="prog-meta">${p.events.length ? `출연 ${p.events.length}` : `영상 ${p.videos.length}`}</span>${progLast(p) ? `<span class="prog-meta">최근 ${progLast(p)}</span>` : ''}</a>`).join('')}</div>
      </section>`;
  }

  // 홈: 유튜브 새 영상 (공식 + 방송사, 올라온 날 순) (+ 몇 년 전 오늘 올라온 공식 영상)
  function homeVideos() {
    const all = data.official || [];
    const vs = all.filter(v => !v.bc);
    if (!all.length) return '';
    const t = todayParts();
    const upOf = v => v.up || v.date;
    const fresh = all.slice().sort((a, b) => upOf(b).localeCompare(upOf(a))).slice(0, 12);
    const newSince = new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10);
    const md = `${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
    const ago = vs.filter(v => v.date.slice(5) === md && v.date.slice(0, 4) < String(t.y));
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">유튜브 새 영상</h2><a class="more" href="#/yt">전체 보기</a></div>
        ${ytStrip(fresh, v => upOf(v) >= newSince)}
        ${ago.length ? `<p class="sub yt-ago">${t.y - Number(ago[0].date.slice(0, 4))}년 전 오늘 올라온 영상</p>${ytStrip(ago)}` : ''}
      </section>`;
  }

  function homeConcerts() {
    if (!data.tours.length) return '';
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">콘서트 셋리스트</h2><a class="more" href="#/concerts">전체 보기</a></div>
        <div class="chips">${data.tours.slice().reverse().map(t => `<a class="pill" href="#/tour/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>
      </section>`;
  }

  function homeSearchBox() {
    return `
      <form class="searchbox" role="search" id="home-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" name="q" aria-label="검색어" placeholder="무엇이든 찾기 · 초성 OK" autocomplete="off">
        <a class="adv-btn" href="#/search">통합 검색</a>
      </form>`;
  }

  function bindHome() {
    // 관리자 기기에서만: 아직 안 읽은 의견 수
    if (isAdmin()) loadOpinions().then(() => {
      const box = document.getElementById('op-home'), n = opUnread().length;
      if (box && n) box.innerHTML = `<a class="op-home" href="#/opinion">💬 새 의견 <b>${n}</b>건 <span>바로가기 ›</span></a>`;
    });
    const f = document.getElementById('home-search');
    if (f) f.onsubmit = ev => {
      ev.preventDefault();
      const q = f.q.value.trim();
      location.hash = '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    // '통합 검색' 버튼도 쓴 검색어를 들고 넘어가요
    const adv = f && f.querySelector('.adv-btn');
    if (adv) adv.onclick = ev => { ev.preventDefault(); f.onsubmit(ev); };
    const b = document.getElementById('reroll');
    if (b) b.onclick = () => {
      pickCount++;
      document.getElementById('random').outerHTML = homeRandom();
      bindHome();
    };
  }

  // ---------- 검색 ----------
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const norm = s => String(s || '').toLowerCase().replace(/[\s'’‘`]+/g, '');
  const chosung = s => [...String(s || '')].map(c => {
    const code = c.charCodeAt(0) - 0xAC00;
    return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
  }).join('').replace(/\s+/g, '').toLowerCase();
  const isChosungOnly = q => /^[ㄱ-ㅎ]+$/.test(String(q || '').replace(/\s+/g, ''));

  let searchIndex = null;
  function getIndex() {
    if (searchIndex && searchIndex.data === data) return searchIndex;
    const items = data.events.map(e => {
      const text = [e.title, e.place, e.songs.join(' '), e.songs.map(koOf).join(' '), e.videoMemo, e.related.map(v => v.title).join(' ')].join(' ');
      return { e, text: norm(text), cho: chosung(text) };
    });
    const fuse = window.Fuse ? new window.Fuse(data.events, {
      keys: [{ name: 'title', weight: 2 }, { name: 'songs', weight: 2 }, 'place', 'related.title'],
      threshold: 0.35, ignoreLocation: true,
    }) : null;
    searchIndex = { data, items, fuse };
    return searchIndex;
  }

  const MEMBER_LIST = ['배두훈', '강형호', '조민규', '고우림'];
  const MEMBER_NICK = { 듄: '배두훈', 클: '강형호', 밍: '조민규', 욺: '고우림' };
  let shown = 50;

  function readParams() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    // 팬들이 부르는 멤버 별명 한 글자(듄·클·밍·욺)로 치면 그 멤버로 걸러요
    const q = qs.get('q') || '', nick = MEMBER_NICK[q.trim()];
    if (nick) return { q: '', cat: qs.get('cat') || '', year: qs.get('year') || '', member: nick, video: qs.get('video') === '1', t: qs.get('t') || '', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
    return { q: qs.get('q') || '', cat: qs.get('cat') || '', year: qs.get('year') || '', member: qs.get('member') || '', video: qs.get('video') === '1', t: qs.get('t') || '', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
  }
  function writeParams(p) {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.cat) qs.set('cat', p.cat);
    if (p.year) qs.set('year', p.year);
    if (p.member) qs.set('member', p.member);
    if (p.video) qs.set('video', '1');
    if (p.t) qs.set('t', p.t);
    if (p.sort === 'old') qs.set('sort', 'old');
    const s = qs.toString();
    history.replaceState(null, '', '#/search' + (s ? '?' + s : ''));
    baseHash = location.hash;
  }

  // 한글로 친 영어 이름 (레거시 → legacy). 공연·음반·곡 이름에 자주 나오는 것만
  const KO_EN = { 레거시: 'legacy', 웨이브: 'wave', 일루셔니스트: 'illusionist', 로열: 'royal', 로얄: 'royal', 비기닝: 'beginning', 월드트리: 'world tree', 라이트: 'light', 페스티벌: 'festival', 미스틱: 'mystique', 에볼루션: 'evolution', 메모리즈: 'memories', 윈터스토리: 'winter story', 윈터: 'winter', 심포니: 'symphony', 비욘드: 'beyond', 에튀드: 'etude', 에뛰드: 'etude', 아마겟돈: 'armageddon', 챔피언스: 'champions', 데스파시토: 'despacito', 스윗: 'sweet', 스위트: 'sweet', 이스케이프: 'escape', 러브인서울: 'love in seoul', 넥스트투유: 'next to you', 판타지아: 'fantasia', 넬라: 'nella', 노떼: 'notte', 포레스텔라: 'forestella', 투어: 'tour', 콘서트: 'concert', 팬미팅: 'fan meeting', 피타: 'pitta', 더: 'the', 디: 'the', 시네마: 'cinema', 인시네마: 'in cinema', 일루전: 'illusion', 유토피아: 'utopia', 블룸: 'bloom', 파라나: 'parana', 뉴에이지: 'new age', 네이션: 'nation', 유니버스: 'universe', 쿨: 'kool', 비프리: 'be free', 카르페디엠: 'carpe diem', 언피니시드: 'unfinished', 패러독스: 'paradox', 파라독스: 'paradox', 아포칼립스: 'apocalypse', 에브리띵: 'everything', 에브리씽: 'everything', 스틸히어: 'still here', 딥섀도우: 'deep shadow', 딥쉐도우: 'deep shadow', 벤타블랙: 'vanta black', 크리스마스: 'christmas', 뉴노멀라이프: 'new normal life', 로얄콘서트: 'royal concert', 팰리스: 'palace', 쇼: 'show', 나이트라이브: 'night live', 북미: 'north america', 아메리카: 'america', 어크로스더호라이즌: 'across the horizon', 호라이즌: 'horizon', 레퀴엠: 'requiem', 엠카운트다운: 'm countdown', 엠카: 'm countdown', 뮤직뱅크: 'music bank', 뮤뱅: 'music bank', 인기가요: 'inkigayo', 쇼챔피언: 'show champion', 더쇼: 'the show', 비하인드: 'behind', 티저: 'teaser', 라이브: 'live', 직캠: 'fancam' };
  // 영어 곡 이름의 한글 표기 (띄어쓰기 없이, 여러 표기는 칸으로 구분). 곡 찾기·통합 검색에서 한글로도 찾게 해요
  const SONG_KO = {"myeden":"마이에덴","champions":"챔피언스 챔피온스 챔스","lazencasaveus":"라젠카세이브어스 라젠카","inneruniverse":"이너유니버스","scarboroughfair":"스카보로페어 스카버러페어 스카보로우페어 스카페","saveourlives":"세이브아워라이브즈 세이브아워라이브스 세아라 세이브아워","warriors":"워리어스 워리어즈","stilllovingyou":"스틸러빙유","badromance":"배드로맨스 베드로맨스 밷로맨스 밷로 밴로맨스","bohemianrhapsody":"보헤미안랩소디 보헤미안렙소디 보헤미안 보랩","healtheworld":"힐더월드","moonlight":"문라이트 문라잇","fakelove":"페이크러브","utopia":"유토피아","shapeofyou":"쉐이프오브유 셰이프오브유 쉐잎오브유 쉡옵유 쉐옵유 쉪오뷰 쉡오뷰 오뷰","jesuismalade":"쥬스위말라드 주스위말라드 쥬쉬말라드 말라데","forlife":"포라이프 포랖","myfavoritethings":"마이페이버릿띵스 마이페이보릿띵스 마이페이버릿씽스 마페띵","legendsneverdie":"레전드네버다이 레전즈네버다이","despacito":"데스파시토 데슷파 데슷파시토","whitenight":"화이트나이트","thegodfather":"대부 갓파더 더갓파더","arabiannights":"아라비안나이트 아라비안나이츠","theshowmustgoon":"더쇼머스트고온 쇼머스트고온","chagallsdream":"샤갈의꿈 샤갈스드림 샤갈","pianoman":"피아노맨","apocalypse":"아포칼립스","abracadabra":"아브라카다브라","everything":"에브리띵 에브리씽 에블띵","ileftmyheartinsanfrancisco":"아이레프트마이하트인샌프란시스코 샌프란시스코","etude":"에튀드 에뛰드 에튜드","nellanotte":"넬라노떼 넬라노테","armageddon":"아마겟돈 아마게돈","angel":"엔젤 앤젤","snowglobe":"스노우글로브 스노글로브","imcomingnow":"아임커밍나우 암커밍","dellamorenonsisa":"델라모레논시사","ilmirtoelarosa":"일미르토에라로사","crane":"크레인 백학","amapola":"아마폴라","closeyoureyes":"클로즈유어아이즈","timetravel":"타임트래블 타임트레블","limmensità":"림멘시타 리멘시타","gashiri":"가시리","thornbird":"가시나무새 쏜버드","gethsemane":"겟세마네","amorfati":"아모르파티","wrongfulencounter":"악연","holdingoutforahero":"홀딩아웃포어히어로","youchangemyworld":"유체인지마이월드 유챈마","youaremystar":"유아마이스타","dreamalittledreamofme":"드림어리틀드림오브미","theprayer":"더프레이어","thejourneyoflove":"더저니오브러브","primula":"프리뮬라 프리물라","sweetdreams":"스윗드림즈 스위트드림스","comeuneternoaddio":"꼬메운에떼르노아디오 코메운에테르노아디오","inunaltravita":"인우날트라비타 인운알트라비타","parlapiupiano":"빠를라삐우삐아노 파를라피우피아노 빨라쀼 팔라퓨","timeinabottle":"타임인어보틀 탐보틀","saysomething":"세이썸띵 세이섬씽","universe":"유니버스","changeontherise":"체인지온더라이즈","theskyandthedawnandthesun":"하늘과새벽과태양 하새태","myheartwillgoon":"마이하트윌고온 마이윌고온","intotheunknown":"인투디언노운","laymedown":"레이미다운","paranoidandroid":"파라노이드안드로이드","revival":"리바이벌","thriller":"스릴러","smoothcriminal":"스무스크리미널 스크","wearethechampions":"위아더챔피언스 위아더챔피온스 위아챔","onelove":"원러브 원럽","thesoundofsilence":"사운드오브사일런스 더사운드오브사일런스 사옵사","thegreatestshow":"더그레이티스트쇼 그레이티스트쇼","thephoenix":"더피닉스 피닉스 더피오닉스 thepheonix","thevoice":"더보이스","remember":"리멤버","allthekingshorses":"올더킹스호시스","theresnothingholdinmeback":"데어즈낫띵홀딘미백 데얼스나띵홀딘미백 홀딩미백 theresnothingholdingmeback","teeth":"티스 티쓰","wakawaka":"와카와카","bad":"배드","laultimanoche":"라울티마노체","vivalavida":"비바라비다","radioactive":"레디오액티브 라디오액티브","mama":"마마","hijodelaluna":"이호데라루나","nellafantasia":"넬라판타지아 넬판","bemylove":"비마이러브 비말럽","phantomoftheopera":"오페라의유령 팬텀오브디오페라 팬오페","téirabhaileriú":"테르아왈리루","countingstars":"카운팅스타즈 카운팅스타스","rise":"라이즈","loverunsout":"러브런즈아웃 러브런스아웃 럽런아 럽런즈아웃","square":"스퀘어","signofthetimes":"사인오브더타임즈","kool":"쿨","chosenone":"초즌원 쵸즌원","athena":"아테나","handclap":"핸드클랩","introrunes":"룬스","nowwearefree":"나우위아프리","deliverus":"딜리버어스","stillhere":"스틸히어","overture":"오버추어","ultimanoche":"울티마노체","pray":"프레이","evolution":"에볼루션","limmensita":"림멘시타","funiculifunicula":"푸니쿨리푸니쿨라","lacalunnia":"라칼룬니아","intromystique":"미스틱","preludedelaluna":"프렐류드데라루나","dandelion":"댄딜라이언 민들레 댄들라이언","thenation":"더네이션","betheone":"비더원","persona":"페르소나","prayer":"프레이어","icarus":"이카루스","notalone":"낫얼론","will":"윌","introlotus":"로투스","carpediem":"카르페디엠","smog":"스모그","befree":"비프리","stuckinamaze":"스턱인어메이즈","recuerdosdebuenosaires":"레쿠에르도스데부에노스아이레스","apollon":"아폴론","dontbequiet":"돈비콰이엇","gtho":"지티에이치오","newness":"뉴니스","better":"베러 베터","knockthedoor":"녹더도어","paradox":"패러독스 파라독스","achristmassymphony":"크리스마스심포니","deepshadow":"딥섀도우 딥쉐도우","vantablack":"반타블랙","parlapiùpiano":"빠를라삐우삐아노 파를라피우피아노 빨라쀼 팔라퓨","komorebi":"코모레비","nexttoyou":"넥스트투유","sweetescape":"스윗이스케이프 스위트이스케이프","ternuraantiga":"테르누라안티가","신라의달밤":"신밤"};
  const songKoKey = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^0-9a-zà-ÿ]/g, '');
  const koOf = name => SONG_KO[songKoKey(name)] || '';
  const songText = so => [...new Set([so.name, so.match || so.name, koOf(so.match || so.name), koOf(so.name)])].join(' ');
  Object.entries(SONG_KO).forEach(([en, ko]) => ko.split(' ').forEach(k => { if (k.length >= 2 && !KO_EN[k]) KO_EN[k] = en; }));
  const aliasOf = q => { const s = q.replace(/\s+/g, ''); let out = s, hit = false; Object.keys(KO_EN).sort((x, y) => y.length - x.length).forEach(k => { if (out.includes(k)) { out = out.split(k).join(KO_EN[k]); hit = true; } }); return hit ? out : ''; };
  // 모든 검색창 공통 규칙: 띄어쓰기 무시, 초성만 치면 초성으로, 한글 표기(웨이브→wave)도 같이
  const matcher = q => {
    const nq = norm(q);
    if (!nq) return null;
    if (isChosungOnly(q)) return t => chosung(t).includes(nq);
    const alt = aliasOf(q), na = alt && norm(alt);
    return t => { const s = norm(t); return s.includes(nq) || (!!na && s.includes(na)); };
  };
  // 영상 제목 + 붙은 곡의 한국어 이름 (영어 제목 영상도 한글·초성으로 찾게)
  let vidTextMap = null;
  const vidText = v => {
    if (!vidTextMap) { vidTextMap = new Map(); data.songs.forEach(so => (so.official || []).forEach(x => vidTextMap.set(x, (vidTextMap.get(x) || '') + ' ' + songText(so)))); }
    return v.title + (vidTextMap.get(v) || '');
  };
  function runSearch(p) {
    const { items, fuse } = getIndex();
    const q = p.q.trim();
    let fuzzy = false;
    let list;
    if (!q) list = items.map(i => i.e);
    else if (isChosungOnly(q)) { const cq = q.replace(/\s+/g, ''); list = items.filter(i => i.cho.includes(cq)).map(i => i.e); }
    else {
      const nq = norm(q);
      const alt = aliasOf(q), na = alt && norm(alt);
      list = items.filter(i => i.text.includes(nq) || (na && i.text.includes(na))).map(i => i.e);
      if (!list.length && fuse) { list = fuse.search(q).map(r => r.item); fuzzy = list.length > 0; }
    }
    list = list.filter(e =>
      (!p.cat || e.category === p.cat) &&
      (!p.year || e.date.startsWith(p.year)) &&
      (!p.member || e.members.includes(p.member)) &&
      (!p.video || e.videoId || e.related.length));
    if (!fuzzy) list = list.slice().sort((a, b) => p.sort === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    return { list, fuzzy };
  }

  function resultCard(e) {
    const solo = !e.setlist && e.category === '공연' && /^\[/.test(e.title) && soloInfos().find(c => c.evs.includes(e));
    // 영상이 있으면 오른쪽에 썸네일을 보여줘요 (못 불러오면 ▶ 동그라미로)
    const vid = e.videoId || (e.related[0] || {}).videoId || (e.ytMain && e.ytMain.id);
    const thumb = vid ? `<span class="card-thumb" aria-label="영상 있음"><img src="https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="play-dot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span></span>` : '';
    const card = `
      <a class="card${e.setlist || solo ? ' card-concert' : ''}${vid ? ' has-thumb' : ''}" href="${e.ytOnly ? (e.link || 'https://www.youtube.com/watch?v=' + encodeURIComponent(e.videoId)) + '" target="_blank" rel="noopener' : '#/e/' + encodeURIComponent(e.id)}">
        <span class="card-body">
          <span class="meta">${tag(e.category)}<span>${fmtDate(e.date)}</span>${upcoming(e)}</span>
          <span class="card-title">${esc(e.title)}</span>
          ${songsLine(e)}
        </span>${thumb}
      </a>`;
    if (!e.setlist && !solo) return card;
    return `
      <div class="card-wrap">${card}
        <a class="card-sl" href="#/tour/${encodeURIComponent(e.setlist ? e.setlist.id : solo.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>${e.setlist ? '셋리 보기' : '공연 보기'}</a>
      </div>`;
  }

  // 유튜브 임시 재생목록 (최대 50개)
  function playAllUrl(list) {
    const ids = [];
    list.forEach(e => {
      const id = e.videoId || (e.related.find(v => v.source !== '공식채널') || {}).videoId;
      if (id && !ids.includes(id)) ids.push(id);
    });
    return ids.length ? `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(',')}` : '';
  }

  // 검색어에 맞는 곡·음반·콘서트·프로그램 바로가기
  function searchShortcuts(q) {
    const nq = norm(q), cho = isChosungOnly(q);
    if (!nq || (!cho && nq.length < 2)) return '';
    const hit = matcher(q);
    const out = [];
    programList().map(p => p.name).filter(hit).forEach(pg => out.push({ href: progHref(pg), kind: '프로그램', name: pg + ' 모아보기' }));
    [...data.songs.values()].filter(so => hit(songText(so))).sort((a, b) => playCount(b) - playCount(a)).slice(0, 4)
      .forEach(so => out.push({ href: '#/song/' + encodeURIComponent(so.key), kind: '곡', name: so.name, img: songPic(so) }));
    (data.albums || []).filter(a => hit(a.name)).slice(0, 3)
      .forEach(a => out.push({ href: albHref(a), kind: a.member ? a.member + ' 음반' : '음반', name: a.name, img: a.img && imgSize(a.img, 'thumb') }));
    (data.concerts && data.concerts.length ? data.concerts : data.tours).filter(c => hit(c.name)).slice(0, 3)
      .forEach(c => out.push({ href: '#/tour/' + encodeURIComponent(c.id), kind: '콘서트', name: c.name, img: c.img ? imgSize(c.img, 'thumb') : (c.tour ? tourPic(c.tour) : c.events ? tourPic(c) : '') }));
    if (!out.length) return '';
    return `<div class="shortcut-row">${out.map(x => `
      <a class="shortcut-card" href="${x.href}">
        ${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sc-ph'}))">` : '<span class="sc-ph"></span>'}
        <span><small>${esc(x.kind)}</small><b>${esc(x.name)}</b></span>
      </a>`).join('')}</div>`;
  }

  // 검색어가 제목에 들어간 공식 유튜브 영상 (몇 개만, 나머지는 공식 유튜브 화면으로)
  // 통합 검색: 종류별 탭 (전체 · 일정 · 곡 · 유튜브 · 음반·콘서트) + 공식 X는 X 탭으로 연결
  function searchHits(p) {
    const nq = norm(p.q), cho = isChosungOnly(p.q);
    const ok = nq && (cho || nq.length >= 2);
    const m = ok && matcher(p.q);
    const hit = name => !!m && m(name);
    const songs = [...data.songs.values()].filter(so => hit(songText(so))).sort((a, b) => playCount(b) - playCount(a));
    const vids = (data.official || []).filter(v => hit(vidText(v)) && (!p.member || v.members.includes(p.member)) && (!p.year || v.date.startsWith(p.year)));
    const rels = [
      ...(data.albums || []).filter(a => hit(a.name) && (!p.member || a.member === p.member)).map(a => ({ href: albHref(a), kind: a.member ? a.member + ' 음반' : '음반', name: a.name, sub: a.date.replace(/-/g, '.'), img: a.img && imgSize(a.img, 'thumb') })),
      ...(data.concerts && data.concerts.length ? data.concerts : data.tours).filter(c => hit(c.name)).map(c => ({ href: '#/tour/' + encodeURIComponent(c.id), kind: '콘서트', name: c.name, sub: c.from ? c.from.replace(/-/g, '.') : '', img: c.img ? imgSize(c.img, 'thumb') : c.tour ? tourPic(c.tour) : c.events ? tourPic(c) : '' })),
      ...programList().map(p => p.name).filter(hit).map(pg => ({ href: progHref(pg), kind: '프로그램', name: pg + ' 모아보기', sub: '' })),
    ];
    // 공식 X: 글에 검색어가 있거나, 찾은 곡이 나온 글
    const xset = new Set((data.xFeed || []).filter(x => hit(x.raw)));
    songs.forEach(so => songX(so).forEach(x => xset.add(x)));
    const xs = [...xset].filter(x => (!p.member || x.m.includes(p.member)) && (!p.year || x.date.startsWith(p.year))).sort((a, b) => b.date.localeCompare(a.date));
    return { songs, vids, rels, xs };
  }
  const xMini = x => `<a class="x-card${x.img ? '' : ' no-img'}" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img ? `<img src="${esc(x.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="x-text"><span class="x-date">${esc(x.date.replace(/-/g, '.'))} · ${esc(x.cat)}</span>${esc(x.text || '(글 없음)')}</span></a>`;
  function searchTabs(p, evN) {
    const h = searchHits(p);
    const tabs = [['', '전체'], ['ev', '일정', evN], ['song', '곡', h.songs.length], ['yt', '유튜브', h.vids.length], ['rel', '음반·콘서트', h.rels.length], ['x', '공식 X', h.xs.length]];
    return `<div class="chips s-tabs">${tabs.filter(([t, , n]) => n !== 0 || (p.t || '') === t).map(([t, l, n]) => `<a class="chip${(p.t || '') === t ? ' on' : ''}" href="#" data-t="${t}">${l}${n != null ? ` <b>${n.toLocaleString()}</b>` : ''}</a>`).join('')}</div>`;
  }
  const relCard = x => `<a class="x-card${x.img ? '' : ' no-img'}" href="${x.href}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="x-text"><span class="x-date">${esc(x.kind)}${x.sub ? ' · ' + esc(x.sub) : ''}</span><b>${esc(x.name)}</b></span></a>`;
  // 곡 요약 (곡 목록·검색 결과 공통)
  const songMeta = (so, plain) => [so.events.length ? (plain ? `무대 ${so.events.length}` : `<b>무대 ${so.events.length}</b>`) : '', (so.official || []).length ? `영상 ${so.official.length}` : '', so.tours.length ? `콘서트 ${so.tours.length}` : '', so.titleOf.length ? '타이틀' : ''].filter(Boolean).join(' · ');
  const songCard = so => relCard({ href: '#/song/' + encodeURIComponent(so.key), kind: '곡', sub: songMeta(so, true), name: so.name, img: songPic(so) });
  function searchAll(p) {
    const h = searchHits(p);
    const { list, fuzzy } = runSearch(p);
    // 비슷한 결과(정확히 맞는 게 없을 때)는 다른 종류가 있으면 빼요
    const others = h.songs.length + h.vids.length + h.rels.length + h.xs.length;
    const evs = fuzzy && others ? [] : list;
    const head = searchTabs(p, evs.length);
    const more = (t, n, unit) => n ? `<a class="more s-more" href="#" data-t="${t}">${n.toLocaleString()}${unit} 모두 보기 ›</a>` : '';
    if (p.t === 'song') return head + (h.songs.length ? moreList(h.songs.map(songCard), 20) : '<p class="empty">찾는 곡이 없어요.</p>');
    if (p.t === 'yt') return head + (h.vids.length ? `<div class="view-row"><p class="sub">${h.vids.length.toLocaleString()}개</p>${albumBtn()}</div>${ytList(h.vids)}` : '<p class="empty">찾는 영상이 없어요.</p>');
    if (p.t === 'x') return head + (h.xs.length ? moreList(h.xs.map(xMini), 20) : '<p class="empty">찾는 공식 X 글이 없어요.</p>');
    if (p.t === 'rel') return head + (h.rels.length ? `<div class="stack x-list">${h.rels.map(relCard).join('')}</div>` : '<p class="empty">찾는 음반·콘서트가 없어요.</p>');
    const sec = (title, n, body, t, unit) => n ? `<section class="s-sec"><div class="block-head"><h2 class="h3">${title} <span class="song-count">${n.toLocaleString()}</span></h2>${more(t, n, unit)}</div>${body}</section>` : '';
    const any = evs.length || others;
    return head + (any ? [
      sec('곡', h.songs.length, `<div class="stack x-list s-group">${h.songs.slice(0, 3).map(songCard).join('')}</div>`, 'song', '곡'),
      sec(fuzzy ? '비슷한 일정' : '일정', evs.length, `<div class="stack s-group">${evs.slice(0, 4).map(resultCard).join('')}</div>`, 'ev', '건'),
      sec('공식 유튜브', h.vids.length, ytStrip(h.vids.slice(0, 8)), 'yt', '개'),
      sec('음반·콘서트', h.rels.length, `<div class="stack x-list s-group">${h.rels.slice(0, 3).map(relCard).join('')}</div>`, 'rel', '개'),
      sec('공식 X', h.xs.length, `<div class="stack x-list s-group">${h.xs.slice(0, 3).map(xMini).join('')}</div>`, 'x', '개'),
    ].join('') : `<p class="empty">찾는 기록이 없어요. 혹시 빠진 일정이라면 <a href="#/add">일정 등록</a>으로 알려주세요.</p>`);
  }
  function searchVideos(q) {
    const nq = norm(q);
    if (nq.length < 2) return '';
    const m = matcher(q);
    const vs = (data.official || []).filter(v => m(vidText(v)));
    if (!vs.length) return '';
    return `<div class="search-yt"><div class="block-head"><h2 class="h3">공식 유튜브</h2><a class="more" href="#/yt?q=${encodeURIComponent(q)}">${vs.length}개 ›</a></div>${ytStrip(vs.slice(0, 8))}</div>`;
  }

  // 검색 전 화면: 최근 검색어, 많이 부른 곡
  const RECENT_Q = 'soopbyeol-recent-q';
  function recentQueries() { try { return JSON.parse(localStorage.getItem(RECENT_Q) || '[]'); } catch (err) { return []; } }
  function saveQuery(q) {
    q = (q || '').trim();
    if (q.length < 2 && !isChosungOnly(q)) return;
    try { localStorage.setItem(RECENT_Q, JSON.stringify([q, ...recentQueries().filter(x => x !== q)].slice(0, 8))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
  }
  function searchHome() {
    const recent = recentQueries();
    const top = [...data.songs.values()].filter(so => so.events.length).sort((a, b) => b.events.length - a.events.length).slice(0, 10);
    return `
      ${recent.length ? `<h2 class="h3 list-title">최근 검색어 <button type="button" class="link-btn" id="clear-recent">지우기</button></h2>
      <div class="chips wrap">${recent.map(q => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      <h2 class="h3 list-title">많이 부른 곡</h2>
      <div class="chips wrap">${top.map(so => `<a class="chip" href="#/song/${encodeURIComponent(so.key)}">${esc(so.name)}</a>`).join('')}</div>
      <button type="button" class="btn btn-soft" id="show-all">전체 일정 ${data.events.length.toLocaleString()}건 보기</button>`;
  }

  let showAll = false;
  // 필터는 일정을 볼 때만: 검색 전 첫 화면이나 일정 말고 다른 탭에선 숨겨요
  const fHide = p => p.q ? p.t !== 'ev' : !(p.cat || p.year || p.member || p.video || showAll);
  function searchResults(p) {
    if (!p.q && !p.cat && !p.year && !p.member && !p.video && !showAll) return searchHome();
    if (p.q && p.t !== 'ev') return searchAll(p);
    const { list, fuzzy } = runSearch(p);
    const desc = [p.q && `'${p.q}'`, p.cat, p.year && (p.year.length === 10 ? fmtDate(p.year, false) : `${p.year}년`), p.member, p.video && '영상 있음'].filter(Boolean).join(' · ');
    const play = playAllUrl(list);
    // 연도별로 묶어요. 결과가 적으면 다 펼치고, 많으면 첫 해만 펼쳐요
    const part = list.slice(0, shown);
    let body;
    if (fuzzy) body = `<div class="stack">${part.map(resultCard).join('')}</div>`;
    else {
      const byYear = new Map();
      part.forEach(e => { const y = e.date.slice(0, 4); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(e); });
      body = [...byYear.entries()].map(([y, l], i) => `
        <details class="year-group"${i === 0 || list.length <= 20 ? ' open' : ''}>
          <summary><span class="yg-year">${y}년</span><span class="song-count">${l.length}건</span></summary>
          <div class="stack">${l.map(resultCard).join('')}</div>
        </details>`).join('');
    }
    return `
      ${p.q ? searchTabs(p, list.length) : ''}
      <div class="result-head">
        <span>${desc ? esc(desc) + ' · ' : ''}<b>${list.length}건</b>${fuzzy ? ' · 비슷한 결과' : ''}</span>
        <button type="button" class="link-btn" id="sort">${p.sort === 'old' ? '오래된순' : '최신순'} ▾</button>
      </div>
      ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>검색 결과 영상 이어보기</a>` : ''}
      ${list.length ? body :
        `<p class="empty">찾는 기록이 없어요. 혹시 빠진 일정이라면 <a href="#/add">일정 등록</a>으로 알려주세요.</p>`}
      ${list.length > shown ? `<button type="button" class="btn btn-soft" id="show-more">더 보기 (${list.length - shown}건 남음)</button>` : ''}`;
  }

  function searchView() {
    const p = readParams();
    const cats = [...new Set(data.events.map(e => e.category).filter(Boolean))];
    const years = [...new Set(data.events.map(e => e.date.slice(0, 4)))].sort().reverse();
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `
      <div class="search-top">
        <a class="back" href="#/">‹ 홈</a>
        <form class="searchbox" role="search" id="search-form">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" name="q" aria-label="검색어" placeholder="곡·방송·영상·음반 찾기 · 초성 OK" value="${esc(p.q)}" autocomplete="off">
        </form>
        <div id="fwrap"${fHide(p) ? ' hidden' : ''}><div class="chips" id="filters">
          ${chip('video', '1', '▶ 영상 있음', p.video)}${cats.map(c => chip('cat', c, c, p.cat === c)).join('')}
        </div>
        <div class="chips" id="filters2">
          ${MEMBER_LIST.map(m => chip('member', m, m.slice(1), p.member === m)).join('')}
        </div>
        <div class="chips" id="filters3">${years.map(y => chip('year', y, y, p.year === y)).join('')}</div>
        <label class="f-date">날짜로 찾기 <input type="date" id="f-date" value="${p.year.length === 10 ? esc(p.year) : ''}"></label></div>
      </div>
      <div id="results">${searchResults(p)}</div>`;
  }

  function bindSearch() {
    const form = document.getElementById('search-form');
    const input = form.q;
    const update = (change, resetShown = true) => {
      const nick = MEMBER_NICK[String(change.q || '').trim()];
      if (nick) { change = { ...change, q: '', member: nick }; input.value = ''; }
      const p = Object.assign(readParams(), change);
      writeParams(p);
      if (nick) document.querySelectorAll('.chip[data-member]').forEach(x => { const on = x.dataset.member === nick; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      if (resetShown) shown = 50;
      document.getElementById('results').innerHTML = searchResults(p);
      document.getElementById('fwrap').hidden = fHide(p);
      bindResults();
    };
    const bindResults = () => {
      const s = document.getElementById('sort');
      if (s) s.onclick = () => update({ sort: readParams().sort === 'old' ? 'new' : 'old' });
      const m = document.getElementById('show-more');
      if (m) m.onclick = () => { shown += 50; update({}, false); };
      const all = document.getElementById('show-all');
      if (all) all.onclick = () => { showAll = true; update({}); };
      const clr = document.getElementById('clear-recent');
      if (clr) clr.onclick = () => { try { localStorage.removeItem(RECENT_Q); } catch (err) { /* 괜찮아요 */ } update({}); };
      document.querySelectorAll('#results .chip[data-q]').forEach(b => b.onclick = () => { input.value = b.dataset.q; update({ q: b.dataset.q }); });
      document.querySelectorAll('#results [data-t]').forEach(b => b.onclick = ev => { ev.preventDefault(); update({ t: b.dataset.t }); window.scrollTo(0, 0); });
      // 결과를 누르면 그 검색어를 최근 검색어로 남겨요
      document.getElementById('results').onclick = ev => { if (ev.target.closest('a')) saveQuery(readParams().q); };
    };
    let timer;
    input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => update({ q: input.value }), 150); };
    form.onsubmit = ev => { ev.preventDefault(); input.blur(); saveQuery(input.value); update({ q: input.value }); };
    document.querySelectorAll('#filters .chip[data-cat]').forEach(b => b.onclick = () => {
      const p = readParams();
      update({ cat: p.cat === b.dataset.cat ? '' : b.dataset.cat });
      document.querySelectorAll('#filters .chip[data-cat]').forEach(x => { const on = x.dataset.cat === readParams().cat; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    });
    const v = document.querySelector('#filters .chip[data-video]');
    v.onclick = () => { const on = !readParams().video; update({ video: on }); v.classList.toggle('on', on); v.setAttribute('aria-pressed', on); };
    // 날짜 고르기: 연도 칸에 날짜를 통째로 넣어요 (날짜로 시작하는 일정만)
    const fd = document.getElementById('f-date');
    fd.onchange = () => { update({ year: fd.value }); document.querySelectorAll('.chip[data-year]').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', false); }); };
    // 연도·멤버 칩: 한 번 더 누르면 풀려요
    ['year', 'member'].forEach(k => document.querySelectorAll(`.chip[data-${k}]`).forEach(b => b.onclick = () => {
      update({ [k]: readParams()[k] === b.dataset[k] ? '' : b.dataset[k] });
      if (k === 'year') fd.value = '';
      document.querySelectorAll(`.chip[data-${k}]`).forEach(x => { const on = x.dataset[k] === readParams()[k]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    }));
    bindResults();
    if (!readParams().q && !readParams().cat) input.focus({ preventScroll: true });
  }

  // 구글 폼 미리 채우기 주소 (통합형: "제보 내용" 한 칸에 줄로 채워요)
  // 칸 이름을 다 보여줘서 빈 줄만 채우면 되게 해요
  const reportText = ({ type, date, title, song, link, msg } = {}) =>
    [['종류', type || '새 기록 / 빠진 곡 / 틀린 정보 중 하나'], ['날짜', date], ['일정', title], ['곡', song], ['링크', link], ['내용', msg]].map(([k, v]) => `${k}: ${v || ''}`).join('\n');
  function formUrl(o = {}) {
    const f = window.CONFIG.form;
    const qs = new URLSearchParams({ usp: 'pp_url' });
    if (f.fields.content) qs.set(f.fields.content, reportText(o));
    return `${f.url}?${qs}`;
  }

  // ---------- 곡 아카이브 ----------
  const koCollator = new Intl.Collator('ko');
  // 가나다순: 한글 곡 먼저, 그다음 영어 곡 (한국어 사이트라서)
  const hangulFirst = (a, b) => {
    const ha = /^[가-힣]/.test(a), hb = /^[가-힣]/.test(b);
    return ha !== hb ? (ha ? -1 : 1) : koCollator.compare(a, b);
  };
  let songSort = 'name';
  let songFilter = '';
  const songMem = new Set();   // 멤버 개인 곡 필터 (여러 명 고르면 그중 누구라도)
  const SONG_FILTERS = [['', '분류 전체'], ['video', '영상 있음'], ['album', '음반 수록곡'], ['concert', '콘서트에서 부른 곡']];
  // 멤버 혼자만 부른 곡: 무대가 모두 멤버 개인 일정([형호] …, 강형호 단독 콘서트)이고, 음반도 멤버 솔로 음반뿐이고, 포레스텔라 콘서트 셋리에 없는 곡
  const evMember = e => { const m = (e.title.match(/^\[(두훈|형호|민규|우림)\]/) || [])[1]; if (m) return m; const f = Object.keys(SOLO_SHORT).find(n => e.title.includes(n)); return f && !/포레스텔라|forestella/i.test(e.title) ? SOLO_SHORT[f] : ''; };
  const soloOf = so => {
    if (so._solo !== undefined) return so._solo;
    const ms = new Set();
    let group = (so.tours || []).length > 0;
    so.albums.forEach(a => { if (a.member) ms.add(SOLO_SHORT[a.member] || a.member); else group = true; });
    so.events.forEach(e => { const m = evMember(e); if (m) ms.add(m); else group = true; });
    return (so._solo = !group && ms.size ? ['두훈', '형호', '민규', '우림'].filter(m => ms.has(m)) : []);
  };
  const playCount = so => so.events.length + so.tours.length;

  // 곡 이름이 나온 공식 X 글 (짧은 이름은 엉뚱한 글이 섞여서 한글 2자·영문 4자 이상만)
  function songX(so) {
    if (so._x && so._xFeed === data.xFeed) return so._x;
    const flat = t => t.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    // '한국어 (영어)' 곡은 두 이름 다 찾아요
    const two = so.name.match(/^(.+?)\s*\(([^)]+)\)$/);
    const names = so.key === 'mama' ? ['MAMA'] : [...new Set([so.match || so.name, ...(two && /[가-힣]/.test(two[1]) ? [two[1], two[2]] : [])])];
    // 멤버 솔로 음반에만 있는 곡은 그 멤버 글에서만
    const solo = !so.events.length && !so.tours.length && so.albums.length && so.albums.every(al => al.member) ? so.albums[0].member : '';
    const tests = names.map(name => {
      const nm = flat(name);
      const hangul = /[가-힣]/.test(nm);
      if (nm.length < (hangul ? 2 : 4)) return null;
      // 영어 곡은 낱말 경계로 (Angel이 Los Angeles에 걸리지 않게)
      const words = name.toLowerCase().match(/[0-9a-z]+/g) || [];
      if (!hangul && !words.length) return null;
      const rx = new RegExp('(^|[^a-z])' + words.join('[^a-z0-9]*') + '($|[^a-z])');
      // '바람'·'친구'처럼 짧은 한글 이름은 곡 이름으로 쓰였을 때만: 따옴표·괄호 안, #해시태그, '- 곡명', '곡명 무대'
      const nameRx = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      const qrx = hangul && nm.length <= 4 && new RegExp(`(?:#|\\s[-–—]\\s*)${nameRx}|(?:[‘'"“<《「『〈\\[]|&lt;)\\s*${nameRx}\\s*(?:[’'"”>》」』〉\\]]|&gt;)|${nameRx}\\s+(?:무대|라이브|음원|뮤비|m\\/v|커버|직캠)`, 'i');
      return p => qrx ? qrx.test(p.raw) : hangul ? (p._flat || (p._flat = flat(p.raw))).includes(nm) : rx.test(p._low || (p._low = p.raw.toLowerCase()));
    }).filter(Boolean);
    const skip = window.DATA_LINK_SKIP || new Set();
    const hit = p => (!solo || p.m.includes(solo) || p.raw.includes(solo.slice(1))) && !skip.has(`x:${p.id}>song:${so.key}`) && tests.some(t => t(p));
    // 흔한 영어 낱말 이름(Angel·Everything 같은)으로만 찾는 곡은 점검 화면에 올려요
    so._xLoose = names.every(n => !/[가-힣]/.test(n) && (n.match(/[0-9a-z]+/gi) || []).length < 2 && /^(angel|moonlight|universe|rise|everything|champions|warriors|paradox|mama|stay|together|home|dream|love|forever|memories|alone|hero|believe|time|tonight|hallelujah|requiem)$/i.test(n.trim()));
    so._xFeed = data.xFeed;
    so._x = tests.length ? (data.xFeed || []).filter(hit) : [];
    return so._x;
  }
  // 곡 대표 사진: 음반 표지 → 최근 무대 영상 썸네일 → 공식 X 사진
  function songPic(so) {
    const al = so.albums.find(a => a.img);
    if (al) return imgSize(al.img, 'thumb');
    for (let i = so.events.length - 1; i >= 0; i--) {
      const e = so.events[i], vid = e.videoId || (e.related[0] || {}).videoId || (e.ytMain && e.ytMain.id);
      if (vid) return `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg`;
    }
    const ov = (so.official || []).find(v => v.kind !== '쇼츠');
    if (ov) return `https://i.ytimg.com/vi/${encodeURIComponent(ov.id)}/mqdefault.jpg`;
    const tr = (so.tracks || [])[0];
    if (tr) return `https://i.ytimg.com/vi/${encodeURIComponent(tr.id)}/mqdefault.jpg`;
    const xp = songX(so).find(p => p.img);
    return xp ? imgSize(xp.img, 'thumb') : '';
  }

  function songsView() {
    const pass = so => (!songFilter || (songFilter === 'video' ? so.events.length || (so.official || []).length : songFilter === 'album' ? so.albums.length : so.tours.length)) && (!songMem.size || soloOf(so).some(m => songMem.has(m)));
    const list = [...data.songs.values()].filter(pass).sort((a, b) =>
      songSort === 'first' ? (a.since || '9').localeCompare(b.since || '9') || hangulFirst(a.name, b.name)
        : songSort === 'many' ? playCount(b) - playCount(a) || hangulFirst(a.name, b.name)
          : hangulFirst(a.name, b.name));
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${val}" aria-pressed="${on}">${label}</button>`;
    return `
      <h1 class="h1 page-title">곡 아카이브${help('무대 영상으로 확인된 곡, 음반 수록곡, 콘서트 셋리스트 곡을 모았어요. 한 곡을 누르면 무대, 음반, 콘서트가 모두 나와요. 초록 숫자는 영상으로 확인된 무대 수예요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="song-q" aria-label="곡 찾기" placeholder="곡 찾기 · 초성 OK" autocomplete="off">
      </form>
      <div class="chips tl-cats" id="song-sort">
        ${chip('sort', 'name', '가나다순', songSort === 'name')}${chip('sort', 'many', '많이 부른 순', songSort === 'many')}${chip('sort', 'first', '처음 부른 순', songSort === 'first')}
      </div>
      <div class="chips tl-cats" id="song-filter">${SONG_FILTERS.map(([v, l]) => chip('filter', v, l, songFilter === v).replace(v ? '' : 'class="chip', v ? '' : 'class="chip chip-all') + (v ? '' : '<span class="chip-br"></span>')).join('')}</div>
      <div class="chips tl-cats" id="song-mem">${['두훈', '형호', '민규', '우림'].map(m => chip('mem', m, m, songMem.has(m))).join('')}</div>
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}곡</p>${chipsBtn()}</div>
      </div>
      <div>
        ${list.map(so => {
          const al = so.albums[0];
          const meta = songMeta(so);
          return `
          <a class="song-item" href="#/song/${encodeURIComponent(so.key)}" data-n="${esc(norm(songText(so) + ' ' + (al ? al.name : '')))}" data-c="${esc(chosung(songText(so)))}">
            ${songPic(so) ? `<img class="song-thumb" src="${esc(songPic(so))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'song-thumb'}))">` : '<span class="song-thumb"></span>'}
            <span class="song-name">${esc(so.name)}${soloOf(so).map(m => ` <span class="solo-tag">${m}</span>`).join('')}${songPending(so) ? ' <span class="new-tag">확인 필요</span>' : ''}${al ? `<small>${esc(al.name)}</small>` : ''}</span>
            ${songSort === 'first' && so.since ? `<span class="song-first">${fmtDate(so.since, false)}</span>` : ''}
            <span class="song-n">${meta} ›</span>
          </a>`;
        }).join('')}
      </div>`;
  }
  function bindSongs() {
    document.querySelectorAll('#song-sort .chip').forEach(b => b.onclick = () => { songSort = b.dataset.sort; renderBase('songs'); });
    document.querySelectorAll('#song-filter .chip').forEach(b => b.onclick = () => { songFilter = b.dataset.filter; renderBase('songs'); });
    document.querySelectorAll('#song-mem .chip').forEach(b => b.onclick = () => { const m = b.dataset.mem; if (songMem.has(m)) songMem.delete(m); else songMem.add(m); renderBase('songs'); });
    // 곡 이름 찾기: 다시 그리지 않고 목록에서 숨기기만 해요 (입력 중 자판이 닫히지 않게)
    const q = document.getElementById('song-q');
    if (q) q.oninput = () => {
      const v = norm(q.value), c = q.value.replace(/\s/g, ''), alt = aliasOf(q.value), na = alt && norm(alt);
      document.querySelectorAll('.song-item').forEach(a => {
        a.hidden = !!v && (isChosungOnly(c) ? !a.dataset.c.includes(c) : !a.dataset.n.includes(v) && !(na && a.dataset.n.includes(na)));
      });
    };
  }

  // 곡의 음원: 유튜브 뮤직 공식 음원(앨범의 그 곡) + 다른 음원 사이트 검색 바로가기
  const MUSIC_SITES = [['멜론', 'https://www.melon.com/search/total/index.htm?q='], ['지니', 'https://www.genie.co.kr/search/searchMain?query='], ['벅스', 'https://music.bugs.co.kr/search/integrated?q='],
    ['플로', 'https://www.music-flo.com/search/all?keyword='], ['바이브', 'https://vibe.naver.com/search?query='], ['스포티파이', 'https://open.spotify.com/search/'], ['애플뮤직', 'https://music.apple.com/kr/search?term='], ['유튜브 뮤직', 'https://music.youtube.com/search?q=']];
  function songTracks(so) {
    const artist = (so.albums[0] && so.albums[0].member) || '포레스텔라';
    const q = encodeURIComponent(artist + ' ' + (so.match || so.name).replace(/\s*\([^)]*\)\s*$/, ''));
    const PLAT = { spotify: '스포티파이', appleMusic: '애플뮤직', deezer: '디저', tidal: '타이달', amazonMusic: '아마존 뮤직' };
    const cards = so.tracks.map(t => `<div class="card-wrap">
      <a class="card has-thumb" href="https://music.youtube.com/watch?v=${encodeURIComponent(t.id)}" target="_blank" rel="noopener">
        <span class="card-body"><span class="meta">${tag('유튜브 뮤직')}<span>${fmtDate(t.date)}</span></span><span class="card-title">${esc(t.album)}</span><span class="sub">${esc(t.title)}</span></span>
        <span class="card-thumb"><img src="https://i.ytimg.com/vi/${encodeURIComponent(t.id)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="play-dot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span></span>
      </a>${Object.keys(t.links || {}).filter(k => PLAT[k]).length ? `<div class="chips wrap track-links">${Object.entries(t.links).filter(([k]) => PLAT[k]).map(([k, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${PLAT[k]} ↗</a>`).join('')}</div>` : ''}</div>`).join('');
    return `${cards ? `<div class="stack">${cards}</div>` : ''}
      <p class="src-note">다른 음원 사이트에서 찾기</p>
      <div class="chips wrap">${MUSIC_SITES.map(([n, u]) => `<a class="chip" href="${u}${q}" target="_blank" rel="noopener">${n} ↗</a>`).join('')}</div>`;
  }
  function songView() {
    const key = decodeURIComponent(location.hash.split('/')[2] || '');
    const so = data.songs.get(key);
    if (!so) return `<p class="empty">이 곡을 찾지 못했어요. <a href="#/songs">곡 목록으로 ›</a></p>`;
    const stages = so.events.slice().reverse();
    const play = playAllUrl(stages);
    const xs = songX(so);
    // 수록 음반 (표지 + 음반 이야기 링크)
    const albumRow = so.albums.length ? `<div class="song-albums">${so.albums.map(a => `
      <a class="song-album" href="${albHref(a)}">
        ${a.img ? `<img src="${esc(imgSize(a.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createElement('span'))">` : '<span></span>'}
        <span><b>${esc(a.name)}${unsure(a.unsure)}</b><small>${a.member ? esc(a.member) + ' · ' : ''}${esc(a.date.slice(0, 4))} · ${esc(a.kind || '')}${so.titleOf.includes(a) ? ' · 타이틀곡' : ''}</small></span>
      </a>`).join('')}</div>` : '';
    // 무대 목록은 연도별로 묶고, 가장 최근 해만 펼쳐 둬요
    const byYear = new Map();
    stages.forEach(e => { const y = e.date.slice(0, 4); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(e); });
    const yearBlocks = [...byYear.entries()].map(([y, list], i) => `
      <details class="year-group"${i === 0 ? ' open' : ''}>
        <summary><span class="yg-year">${y}년</span><span class="song-count">${list.length}개</span></summary>
        <div class="stack">${list.map(resultCard).join('')}</div>
      </details>`).join('');
    return `
      <a class="back" href="#/songs">‹ 곡 아카이브</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(so.name)}</h1><span class="head-side">${boxBtn('s', so.key, 'heart-btn')}${shareBtn('이 곡 공유하기', `포레스텔라 「${so.name}」 무대 모아보기 🏆\n${so.first ? `처음 확인된 무대 ${fmtDate(so.first.date, false)} ${so.first.title}부터\n` : ''}\n${TAGS}`, link('#/song/' + encodeURIComponent(so.key)))}</span></div>
        <span class="count-pill">${so.events.length ? `확인된 무대 ${so.events.length}개` : '무대 영상 준비 중'}${so.titleOf.length ? ' · 타이틀곡' : ''}</span>
        ${songPending(so) ? '<p class="src-note">팬이 올린 셋리에서 새로 들어온 곡이에요. 셋리가 확정되면 이 표시도 사라져요.</p>' : ''}
        ${albumRow}
        ${so.first ? `<div class="facts">
          <div class="fact"><b>처음 확인</b><span>${fmtDate(so.first.date, false)} · ${esc(so.first.title)}</span></div>
          ${so.events.length > 1 ? `<div class="fact"><b>최근 확인</b><span>${fmtDate(so.last.date, false)} · ${esc(so.last.title)}</span></div>` : ''}
        </div>` : ''}
        ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>이 곡 무대 이어보기</a>` : ''}
        ${findRow('포레스텔라 ' + so.name)}
      </section>
      <div class="view-row">${albumBtn()}</div>
      ${paneTabs([
        { label: '무대', n: stages.length, html: stages.length ? yearBlocks : `<p class="empty">아직 영상으로 확인된 무대가 없어요. <a href="${formUrl({ type: '새 기록', song: so.name })}" target="_blank" rel="noopener">무대 알려주기 ›</a></p>` },
        { label: '유튜브', n: so.official.length, html: ytList(so.official) },
        { label: '음원', n: so.tracks.length, html: so.tracks.length || so.albums.length ? songTracks(so) : '' },
        { label: '콘서트', n: so.tours.length, html: so.tours.length ? `<p class="src-note">콘서트 셋리스트 기준이에요. 무대 목록과 달리 영상으로 확인한 건 아니에요.</p><div class="tour-chips">${so.tours.slice().sort((a, b) => (a.dates[0] < b.dates[0] ? 1 : -1)).map(t => `<a class="chip" href="#/tour/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>` : '' },
        { label: '공식 X', n: xs.length, html: xList(xs) },
      ])}`;
  }

  // ---------- 연표 ----------
  const FIRST_YEAR = 2018;   // 포레스텔라 데뷔 해
  const CALENDAR_START = '2021-08';   // 팬카페 캘린더가 시작된 달

  // 같은 공연이 이틀 연속 열리면 연표에서 한 줄로 묶어요
  const samePlace = (a, b) => (a || '').replace(/\s+/g, '') === (b || '').replace(/\s+/g, '');
  // 연표 썸네일: 콘서트 포스터 → 무대·공식 영상 → 공식 X 후기 사진 (확실히 이어진 것만)
  function evPic(run) {
    const e = run[0];
    if (e.category === '공연') {
      const solo = /^\[/.test(e.title) ? soloInfos().find(c => c.evs.includes(e)) : null;
      if (solo && solo.img) return solo.img;
      const c = !/^\[/.test(e.title) && (data.concerts || []).find(c => c.from && e.date >= c.from && e.date <= (c.to || c.from));
      if (c && c.img) return imgSize(c.img, 'small');
    }
    for (const x of run) {
      const v = x.videoId || (x.related[0] || {}).videoId || (x.ytMain && x.ytMain.id);
      if (v) return `https://i.ytimg.com/vi/${encodeURIComponent(v)}/mqdefault.jpg`;
    }
    const xp = run.find(x => x.xPost && x.xPost.img);
    return xp ? imgSize(xp.xPost.img, 'thumb') : '';
  }
  const evThumb = p => p ? `<span class="ev-thumb" aria-hidden="true"><img src="${esc(p)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : '';
  function groupRuns(list) {
    const runs = [];
    list.forEach(e => {
      const last = runs[runs.length - 1];
      const prev = last && last[last.length - 1];
      const close = prev && Math.abs(new Date(e.date) - new Date(prev.date)) / 864e5 <= 3;
      if (prev && close && prev.title === e.title && samePlace(prev.place, e.place)) last.push(e);
      else runs.push([e]);
    });
    return runs;
  }

  function timelineView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const ym = qs.get('ym') || '';
    const years = [];
    const lastYear = data.events.length ? Number(data.events[data.events.length - 1].date.slice(0, 4)) : new Date().getFullYear();
    for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(String(y));
    const has = new Set(data.events.map(e => e.date.slice(0, 4)));
    const year = qs.get('y') || (ym ? ym.slice(0, 4) : String(lastYear));

    const cat = qs.get('cat') || '';
    const yearEvents = data.events.filter(e => e.date.startsWith(year));
    const cats = [...new Set(yearEvents.map(e => e.category).concat(cat || []).filter(Boolean))];
    const events = cat ? yearEvents.filter(e => e.category === cat) : yearEvents;
    const tlHref = (y, c) => `#/timeline?y=${y}${c ? '&cat=' + encodeURIComponent(c) : ''}`;
    const months = new Map();
    events.forEach(e => {
      const m = e.date.slice(0, 7);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(e);
    });

    const gapText = year < CALENDAR_START.slice(0, 4) ? `${year}년` :
      year === CALENDAR_START.slice(0, 4) ? `${year}년 1~${Number(CALENDAR_START.slice(5)) - 1}월` : '';
    const gapHas = yearEvents.some(e => e.date.slice(0, 7) < CALENDAR_START);
    const gap = gapText && !gapHas ? `
      <div class="gap-card">
        <b>${gapText}</b>
        <span>이 시기 기록은 아직 비어 있어요. 기억나는 무대가 있다면 알려주세요.</span>
        <a href="#/add">일정 등록하기 ›</a>
      </div>` : '';

    const body = [...months.entries()].map(([m, list]) => `
      <h2 class="month" id="m-${m}">${Number(m.slice(0, 4))}년 ${Number(m.slice(5))}월</h2>
      ${groupRuns(list).map(run => {
        const e = run[0];
        const songs = [...new Set(run.flatMap(x => x.songSource !== '참고' ? x.songs : []))];
        const md = x => x.date.slice(5).replace('-', '.');
        const when = run.length > 1
          ? `<span class="ev-days">${run.map(x => `<a class="ev-day${boxHas('w', x.id) ? ' went' : ''}" href="#/e/${encodeURIComponent(x.id)}">${boxHas('w', x.id) ? '🎫 ' : ''}${md(x)}</a>`).join('')}</span>`
          : `<span${boxHas('w', e.id) ? ' class="went-mark"' : ''}>${boxHas('w', e.id) ? '🎫 ' : ''}${md(e)}</span>`;
        const liked = run.some(x => boxHas('e', x.id));
        return `
          <div class="ev">
            <span class="dot${songs.length ? '' : ' dot-plain'}" aria-hidden="true"></span>
            <span class="ev-body">
              <span class="ev-date">${tag(e.category)}${upcoming(e)}${when}${e.place ? `<span class="ev-place">${esc(e.place)}</span>` : ''}</span>
              <a class="ev-title" href="#/e/${encodeURIComponent(e.id)}">${liked ? '<span class="liked-mark">♥</span> ' : ''}${esc(e.title)}${evPending(e)}${run.length > 1 ? ` <span class="ev-count">${run.length}회</span>` : ''}</a>
              ${songs.length ? `<span class="ev-songs">확인된 곡 · ${songsShort(songs)}</span>` : ''}
            </span>${evThumb(evPic(run))}
          </div>`;
      }).join('')}`).join('');

    return `
      <div class="tl-top">
        <h1 class="h1">연표</h1>
        <div class="chips" id="years">
          ${years.map(y => `<a class="yr${y === year ? ' on' : ''}${has.has(y) ? '' : ' gap'}" href="${tlHref(y, cat)}"${y === year ? ' aria-current="true"' : ''}>${y}</a>`).join('')}
        </div>
        ${cats.length > 1 ? `<div class="chips tl-cats">${['', ...cats].map(c => `<a class="chip${c === cat ? ' on' : ''}" href="${tlHref(year, c)}"${c === cat ? ' aria-current="true"' : ''}>${c || '전체'} <b>${c ? yearEvents.filter(e => e.category === c).length : yearEvents.length}</b></a>`).join('')}</div>` : ''}
        <div class="add-bar">${addQuick()}</div>
      </div>
      <div class="tl">
        ${gap}
        ${body || (gap ? '' : `<p class="empty">${cat ? `이 해의 ${esc(cat)} 기록이 없어요.` : '이 해의 기록이 아직 없어요.'}</p>`)}
      </div>`;
  }
  function bindTimeline() {
    const q = view.querySelector('.add-quick'); if (q) bindAdd(q);
    const on = document.querySelector('#years .yr.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    const ym = new URLSearchParams(location.hash.split('?')[1] || '').get('ym');
    const target = ym && document.getElementById('m-' + ym);
    if (target) requestAnimationFrame(() => {
      const top = target.getBoundingClientRect().top + scrollY - document.querySelector('.tl-top').offsetHeight - 8;
      window.scrollTo(0, Math.max(0, top));
    });
  }

  // ---------- 프로그램별 모아보기 ----------
  // ---------- 프로그램별 모아보기 ----------
  // 일정 이름과 방송사 영상 제목으로 프로그램을 묶어요. 위에서부터 먼저 맞는 것으로 정해요.
  const PROGRAM_DEFS = [
    ['불후의 명곡', '음악 경연', /불후의\s?명곡|immortal\s?songs/i],
    ['로또싱어', '음악 경연', /로또\s?싱어/],
    ['싱크로유', '음악쇼', /싱크로유/],
    ['슈가맨', '음악쇼', /슈가맨/],
    ['코리아 온 스테이지', '음악쇼', /코리아\s?온\s?스테이지/],
    ['괴팍한 5형제', '예능', /괴팍한\s?5\s?형제/],
    ['복면가왕', '음악 경연', /복면가왕/],
    ['팬텀싱어', '음악 경연', /팬텀싱어\s?\d*/],
    ['열린음악회', '음악쇼', /열린\s?음악회|open\s?concert/i],
    ['유희열의 스케치북', '음악쇼', /스케치북|유스케/],
    ['더 시즌즈', '음악쇼', /더\s?시즌즈|고막남친|the\s?seasons/i],
    ['방판뮤직', '음악쇼', /방판\s?뮤직/],
    ['해피투게더', '음악쇼', /해피투게더/],
    ['라이브 와이어', '음악쇼', /라이브\s?와이어/],
    ['딩고 · 킬링보이스', '음악쇼', /킬링\s?보이스|dingo|딩고/i],
    ['음악방송', '음악방송', /뮤직뱅크|music\s?bank|음악중심|엠카운트다운|m\s?countdown|인기가요|쇼\s?챔피언|더\s?쇼\b/i],
    ['연말 · 시상식', '연말 · 시상식', /가요대축제|가요대제전|가요대전|mama|연기대상|연예대상|청룡영화상|어워즈|awards/i],
    ['신상출시 편스토랑', '예능', /편스토랑/],
    ['냉장고를 부탁해', '예능', /냉장고를\s?부탁해/],
    ['구해줘! 홈즈', '예능', /구해줘!?\s?홈즈/],
    ['전지적 참견 시점', '예능', /전지적\s?참견\s?시점|전참시/],
    ['라디오스타', '예능', /라디오스타/],
    ['미운 우리 새끼', '예능', /미운\s?우리\s?새끼|미우새/],
    ['걸어서 환장 속으로', '예능', /걸어서\s?환장(\s?속으로)?/],
    ['유 퀴즈 온 더 블럭', '예능', /유\s?퀴즈(\s?온\s?더\s?블럭)?/],
    ['전현무계획', '예능', /전현무\s?계획\s?\d*/],
    ['숲속의 포레시피', '웹 콘텐츠', /포레시피/],
    ['포레미파솔', '웹 콘텐츠', /[포퍼]레\s?미\s?파\s?솔/],
    ['포레 라이브', '웹 콘텐츠', /official\s?live|포레\s?live|숲\s?속\s?라이브|live\s?clip/i],
  ];
  // 자료를 더 모은 다음에 보여줄 프로그램 (목록에서 숨겨요)
  const HIDDEN_PROGS = new Set([]);
  const MIX_PROG = '모음 · 미분류 영상';
  // 프로그램을 못 찾은 방송사 영상은 종류별로 나눠 묶어요
  const MIX_SPLIT = [
    ['모음 · 뮤비 · 가사 영상', /\[MV\]|M\/V|뮤직\s?비디오|lyric|리릭/i],
    ['모음 · 인터뷰', /인터뷰|interview|퇴근길|재미\s?LIVE/i],
    ['모음 · 예능 클립', /#?shorts|쇼츠|사심픽|십분클립|최고의\s?5분|노래방|쿠키|심리상담|토크|개인기|깻잎|청혼|슈가워치|자료화면|비밀|귀 막아|성사된/i],
    ['모음 · 연예 뉴스', /연예가|연중\s?(플러스|라이브)|연중플러스/],
    ['모음 · 무대 모음', /모음|몰아보기|compilation|플레이리스트|유플리|best\s?songs|미리\s?보기|무대|live|\s-\s|–/i],
  ];
  const REGION_BC = /^(KBS|MBC|TBC|KNN|TJB|JTV|UBC|G1|CJB|JIBS)\s?(전주|대전|부산|대구|광주|창원|춘천|청주|제주|울산|강릉|안동|진주|포항|순천|목포|충주|원주|경남|강원|충북|전북|전남|경북)$/;
  const PROGRAM_TYPES = ['음악 경연', '음악쇼', '음악방송', '연말 · 시상식', '예능', '라디오', '웹 콘텐츠', '지역 방송', '특집 · 행사', '모음'];
  const OTHER_PROG = '특집 · 행사 무대';
  // 예전 주소(#/program/불후의 명곡 등)는 그대로 열려요
  let progCache = null;
  function programs() {
    if (progCache && progCache.src === data) return progCache.map;
    const map = new Map();
    const get = (name, type) => { if (!map.has(name)) map.set(name, { name, type, events: [], videos: [] }); return map.get(name); };
    const defOf = t => PROGRAM_DEFS.find(d => d[2].test(t));
    data.events.forEach(e => {
      if (e.ytOnly || e.setlist) return;
      const d = defOf(e.title);
      if (d) get(d[0], d[1]).events.push(e);
      else if (e.category === '라디오') get('라디오', '라디오').events.push(e);
      else if (e.category === 'TV') get(OTHER_PROG, '특집 · 행사').events.push(e);
    });
    // 다른 방송(연예 뉴스 등)이 프로그램 이름만 언급한 영상은 빼요 ([연예가 헤드라인] … '팬텀싱어' 같은)
    const MENTION_ONLY = /^\s*\[(연예가|연중|뉴스|news|연예\s?뉴스|스타\s?뉴스)/i;
    const defOfVideo = t => MENTION_ONLY.test(t) ? null : defOf(t);
    // 방송사 영상은 방송 프로그램에, 공식·멤버 채널 영상은 웹 콘텐츠에만 붙여요
    (data.official || []).forEach(v => {
      // 딩고 채널 영상은 제목에 프로그램 이름이 없어도 딩고로
      const d = defOfVideo(v.title) || (/딩고/.test(v.bc || '') ? PROGRAM_DEFS.find(x => x[0] === '딩고 · 킬링보이스') : null);
      if (!v.bc) { if (d && d[1] === '웹 콘텐츠') get(d[0], d[1]).videos.push(v); return; }
      if (d && d[1] !== '웹 콘텐츠') get(d[0], d[1]).videos.push(v);
      // 지역 방송사(KBS전주·KBS대전 등) 영상은 채널별로 묶어요
      else if (REGION_BC.test(v.bc)) get(v.bc.replace(/^KBS\s?/, 'KBS ').replace(/^(KBS 대전)$/, '$1 · 대케가수'), '지역 방송').videos.push(v);
      else if (v.event && map.has(OTHER_PROG) && map.get(OTHER_PROG).events.includes(v.event)) map.get(OTHER_PROG).videos.push(v);
      else if (!v.event) { const m = MIX_SPLIT.find(x => x[1].test(v.title)); get(m ? m[0] : MIX_PROG, '모음').videos.push(v); }
    });
    map.forEach(p => {
      p.events.sort((a, b) => b.date.localeCompare(a.date));
      p.videos.sort((a, b) => b.date.localeCompare(a.date));
      // 곡: 출연 일정에 확인된 곡 + 프로그램 무대 영상에 붙은 곡 (같은 날은 한 번)
      const days = new Map();
      const add = (key, date) => { if (!key) return; if (!days.has(key)) days.set(key, new Set()); days.get(key).add(date); };
      p.events.forEach(e => (e.songKeys || []).forEach(k => add(k, e.date)));
      const vset = new Set(p.videos);
      data.songs.forEach(so => (so.official || []).forEach(v => { if (vset.has(v) && ['무대', '직캠', '라이브'].includes(v.kind)) add(so.key, v.date); }));
      p.songs = [...days.entries()].map(([k, s]) => ({ so: data.songs.get(k), n: s.size })).filter(x => x.so).sort((a, b) => b.n - a.n || hangulFirst(a.so.name, b.so.name));
      p.size = p.events.length + p.videos.length;
    });
    progCache = { src: data, map };
    return map;
  }
  const programList = () => [...programs().values()].filter(p => p.size && !HIDDEN_PROGS.has(p.name)).sort((a, b) => b.events.length - a.events.length || b.videos.length - a.videos.length);
  const PROGRAMS_TOP = () => programList().filter(p => p.name !== OTHER_PROG && p.name !== MIX_PROG).slice(0, 6).map(p => p.name);
  const progHref = name => '#/program/' + encodeURIComponent(name);

  // 회차 이름: "[KBS2] 불후의 명곡 - 2021 왕중왕전" → "2021 왕중왕전". 프로그램 이름이 맨 앞에 있을 때만 떼고, 남는 게 없으면 원래 제목
  const BC_PREFIX = /^(\[[^\]]*\]\s*)*((KBS|MBC|SBS|JTBC|Mnet|tvN|MBN|EBS|채널S)\d?(\s*TV)?(\s*,\s*|\s+))*/i;
  function programTitle(title, prog) {
    const t = title.replace(BC_PREFIX, '').trim();
    const d = PROGRAM_DEFS.find(x => x[0] === prog);
    // 여러 프로그램을 묶은 칸(음악방송·연말 등)은 제목을 그대로
    if (!d || ['음악방송', '연말 · 시상식', '딩고 · 킬링보이스', '팬텀싱어'].includes(prog)) return t || title;
    const m = t.match(d[2]);
    if (!m || m.index > 0) return t || title;
    const rest = t.slice(m[0].length).replace(/^[\s\-–:·]+/, '').trim();
    // "(6/28 녹화분)"처럼 괄호만 남으면 "방송 (6/28 녹화분)"으로
    return !rest ? t : rest.startsWith('(') ? `방송 ${rest}` : rest;
  }

  // ---------- 보관함 화면 ----------
  // 보관함 숫자 (보관함 화면과 숲별 카드가 같이 써요)
  function boxStats() {
    const evs = ids => ids.map(id => data.byId.get(id)).filter(Boolean);
    const wentAll = evs(box.w).sort((a, b) => b.date.localeCompare(a.date));
    const isBc = e => /TV|라디오/.test(e.category);
    const went = wentAll, seen = evs(box.v).sort((a, b) => b.date.localeCompare(a.date));  // 직관(방송 현장 포함) / 방송으로 시청
    const liked = evs(box.e).sort((a, b) => b.date.localeCompare(a.date));
    const songs = box.s.map(k => data.songs.get(k)).filter(Boolean);
    // 직관으로 들은 곡: 그날 확인된 곡 (없으면 그 투어 셋리스트)
    const heard = new Map();
    wentAll.forEach(e => {
      const names = e.songSource !== '참고' && e.songs.length ? e.songs : e.setlist ? e.setlist.songs.map(x => x.t) : [];
      new Set(names.map(window.DATA.songKey).filter(Boolean)).forEach(k => heard.set(k, (heard.get(k) || 0) + 1));
    });
    const heardList = [...heard.entries()].map(([k, n]) => [data.songs.get(k), n]).filter(x => x[0]).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name));
    const regions = new Map();
    went.forEach(e => { const r = regionOf(e); if (r !== '그 외') regions.set(r, (regions.get(r) || 0) + 1); });
    const topRegion = [...regions.entries()].sort((a, b) => b[1] - a[1])[0];
    const first = went[went.length - 1];
    return { evs, wentAll, isBc, went, seen, liked, songs, heardList, topRegion, first };
  }
  function boxView() {
    const { wentAll, went, seen, liked, songs, heardList, topRegion, first } = boxStats();
    const row = e => `<a class="box-ev" href="#/e/${encodeURIComponent(e.id)}"><span>${fmtDate(e.date, false)}</span><b>${esc(e.title)}</b></a>`;
    const empty = !wentAll.length && !seen.length && !liked.length && !songs.length;
    const LIMIT = 8;
    const songChip = (so, n) => `<a class="chip" href="#/song/${encodeURIComponent(so.key)}">${esc(so.name)}${n > 1 ? ` ×${n}` : ''}</a>`;
    const tabs = [
      ['w', '🎫 직관', went.length, went.map(row).join('')],
      ['b', '📺 시청', seen.length, seen.map(row).join('')],
      ['e', '♥ 일정', liked.length, liked.map(row).join('')],
      ['s', '♥ 곡', songs.length, `<div class="chips box-songs">${songs.map(so => songChip(so)).join('')}</div>`],
      ['h', '들은 곡', heardList.length, `<div class="chips box-songs">${heardList.map(([so, n]) => songChip(so, n)).join('')}</div>`],
    ].filter(x => x[2]);
    let t = decodeURIComponent((location.hash.split('?t=')[1] || '').split('&')[0]);
    if (!tabs.some(x => x[0] === t)) t = (tabs[0] || [''])[0];
    const curTab = tabs.find(x => x[0] === t) || ['', '', 0, ''];
    const cur = { n: curTab[2], html: curTab[3] };
    // 검색용: 직관·좋아요 일정과 곡을 한 목록에
    const findAttr = t => `data-n="${esc(norm(t))}" data-c="${esc(chosung(t))}"`;
    const allEv = [...new Map([...wentAll, ...liked].map(e => [e.id, e])).values()].sort((a, b) => b.date.localeCompare(a.date));
    const allItems = allEv.map(e => `<a class="box-ev box-hit" ${findAttr(e.title + ' ' + (e.place || ''))} href="#/e/${encodeURIComponent(e.id)}"><span>${fmtDate(e.date, false)}</span><b>${boxHas('w', e.id) ? '🎫 ' : ''}${boxHas('e', e.id) ? '♥ ' : ''}${esc(e.title)}</b></a>`).join('')
      + (songs.length ? `<div class="chips box-songs">${songs.map(so => `<a class="chip box-hit" ${findAttr(so.name)} href="#/song/${encodeURIComponent(so.key)}">♥ ${esc(so.name)}</a>`).join('')}</div>` : '');
    const sync = !boxApi() ? '' : boxUser ? `
      <section class="box-sync">
        <b>다른 폰에서도 이어 쓰는 중</b>
        <span>이름 <b>${esc(boxUser.name)}</b>${boxUser.at ? ` · 마지막 저장 ${new Date(boxUser.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
        <button type="button" class="link-btn" id="box-out">이 폰에서 연결 끊기</button>
      </section>` : `
      <section class="box-sync">
        <b>다른 폰에서도 이어 쓰기</b>
        <span>처음이면 이름과 숫자 4자리를 새로 정하고, 다른 폰에서 쓰던 보관함을 불러오려면 그때 정한 이름·숫자를 똑같이 넣어 주세요. 두 폰의 목록이 합쳐져요.</span>
        <form id="box-form" class="box-form" onsubmit="return false">
          <input id="box-name" maxlength="20" placeholder="이름 (예: 숲별홍길동)" autocomplete="off" aria-label="이름">
          <input id="box-pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="숫자 4자리" autocomplete="off" aria-label="숫자 4자리">
          <button type="submit" class="chip on" id="box-go">시작 · 불러오기</button>
        </form>
        <p class="src-note" id="box-msg">숫자를 잊으면 찾아드릴 방법이 없어요. 다른 사이트 비밀번호는 쓰지 마세요.</p>
      </section>`;
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">보관함${help('일정·곡에서 ♡ 좋아요, 🎫 직관·📺 시청했어요를 누르면 여기 모여요. 이 폰에 저장돼요.')}</h1>
      ${empty ? `<p class="empty">아직 비어 있어요. 일정이나 곡 화면에서 ♡ 좋아요, 🎫 직관했어요를 눌러 보세요.</p>` : ''}
      ${wentAll.length || seen.length ? `
      <section class="block box-stat">
        <div class="box-nums">${went.length ? `<span><b>${went.length}</b>번 직관</span>` : ''}${seen.length ? `<span><b>${seen.length}</b>번 시청</span>` : ''}<span><b>${heardList.length}</b>곡 들음</span>${topRegion ? `<span><b>${esc(topRegion[0])}</b>많이 간 곳</span>` : ''}</div>
        ${first ? `<p class="sub">첫 직관 · ${fmtDate(first.date, false)} ${esc(first.title)}</p>` : ''}
      </section>` : ''}
      ${empty ? '' : `
      <form class="searchbox song-search box-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="box-q" aria-label="보관함에서 찾기" placeholder="보관함에서 찾기 · 초성 OK" autocomplete="off">
      </form>
      <section class="block" id="box-found" hidden>
        ${allItems}
        <p class="empty" id="box-none" hidden>찾는 게 없어요.</p>
      </section>
      <div id="box-tabs-wrap">
      <div class="chips box-tabs">${tabs.map(([k, label, n]) => `<a class="chip${k === t ? ' on' : ''}" href="#/box?t=${k}"${k === t ? ' aria-current="true"' : ''}>${label} ${n}</a>`).join('')}</div>
      <section class="block box-list${cur.n > LIMIT ? ' short' : ''}">
        ${cur.html || '<p class="empty">아직 없어요.</p>'}
        ${cur.n > LIMIT ? `<button type="button" class="link-btn box-more">${cur.n}개 전체 보기</button>` : ''}
      </section>
      </div>`}
      ${sync}`;
  }
  // ---------- 숲별 카드 · 입덕일 D+ (이 폰에만 저장) ----------
  const CARD_KEY = 'sb-card', PHOTO_KEY = 'sb-card-photo';
  const CARD_MEMS = ['두훈', '형호', '민규', '우림'];
  const CARD_GENS = ['1기', '2기', '2.5기', '3기'];
  const CARD_STATS = [['w', '직관 횟수'], ['b', '시청 횟수'], ['first', '첫 직관'], ['h', '들은 곡 수'], ['top', '제일 많이 들은 곡'], ['r', '많이 간 곳'], ['stage', '입덕 후 포레 무대 수']];
  const CARD_COLORS = {
    forest: { bg: ['#1F3A30'], ink: '#F2EEDF', mute: 'rgba(242,238,223,.6)', line: 'rgba(242,238,223,.18)', acc: '#C6EC6B', name: '숲' },
    paper: { bg: ['#F4EFE4'], ink: '#22342B', mute: 'rgba(34,52,43,.55)', line: 'rgba(34,52,43,.15)', acc: '#2F7A5A', name: '종이' },
    dusk: { bg: ['#F3E2DA', '#E6DAE8'], ink: '#45303A', mute: 'rgba(69,48,58,.55)', line: 'rgba(69,48,58,.15)', acc: '#B0567A', name: '노을' },
    night: { bg: ['#141A2E'], ink: '#ECE8F7', mute: 'rgba(236,232,247,.55)', line: 'rgba(236,232,247,.16)', acc: '#E8C77A', name: '밤' },
  };
  // 글씨체: 이름·D+·곡 이름·한마디에 써요 (k: 손글씨는 글자가 작아 보여서 키워요)
  const CARD_FONTS = {
    myeong: { f: '"Nanum Myeongjo", serif', w: 700, big: 800, k: 1, name: '명조' },
    plex: { f: '"IBM Plex Sans KR", sans-serif', w: 700, big: 700, k: 1, name: '고딕' },
    dodum: { f: '"Gowun Dodum", sans-serif', w: 400, big: 400, k: 1, name: '둥근' },
    pen: { f: '"Nanum Pen Script", cursive', w: 400, big: 400, k: 1.3, name: '손글씨' },
  };
  const CARD_SANS = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
  const cardDefault = () => ({ nick: '', since: '', gen: [], debut: '', fav: '', mem: [], best: '', line: '', color: 'forest', font: 'myeong', stats: ['w', 'b', 'first', 'h', 'r'], hideAsk: false });
  let card = Object.assign(cardDefault(), boxRead(CARD_KEY) || {});
  let cardPhoto = boxRead(PHOTO_KEY);  // { src, x, y }
  const cardSave = () => boxWrite(CARD_KEY, card);
  const ddayOf = since => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '')) return 0;
    const t = todayParts(), [y, m, d] = since.split('-').map(Number);
    return Math.round((Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(y, m - 1, d)) / 864e5) + 1;  // 입덕한 날이 D+1
  };
  const ddayText = () => { const n = ddayOf(card.since); return n > 0 ? 'D+' + n.toLocaleString('en-US') : ''; };

  // 오른쪽 위 작은 D+ (입덕일을 정한 뒤에만, 누르면 숲별 카드)
  function ddayBadge(name) {
    const t = ddayText();
    return t && !['search', 'card', 'timeline'].includes(name) ? `<a class="dday-badge" href="#/card" aria-label="숲별 ${t}, 숲별 카드 만들기">숲별 <b>${t}</b></a>` : '';
  }
  // 처음 온 폰: 홈 위에 입덕일 정하기 (정하거나 ✕ 누르면 다시 안 떠요)
  function homeAsk() {
    if (card.since || card.hideAsk) return '';
    return `
      <section class="dday-ask" id="dday-ask">
        <button type="button" class="dday-x" id="dday-x" aria-label="닫기">✕</button>
        <b>입덕일을 알려 주세요</b>
        <span>숲별이 된 지 며칠째인지 세어 드려요. 이 폰에만 저장돼요.</span>
        <form class="dday-form" id="dday-form" onsubmit="return false">
          <input type="date" id="dday-in" max="${todayIso()}" min="2017-01-01" aria-label="입덕 날짜" required>
          <button type="submit" class="chip on">입덕일 설정하기</button>
        </form>
      </section>`;
  }
  function bindAsk() {
    const x = document.getElementById('dday-x'), f = document.getElementById('dday-form');
    if (!f) return;
    x.onclick = () => { card.hideAsk = true; cardSave(); document.getElementById('dday-ask').remove(); };
    f.onsubmit = () => {
      const v = document.getElementById('dday-in').value;
      if (ddayOf(v) > 0) { card.since = v; cardSave(); renderBase('home'); }
      return false;
    };
  }
  function todayIso() { const t = todayParts(); return `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`; }

  // 카드에 들어갈 기록 (보관함에서 자동)
  const favList = t => [...new Set((t || '').split(/\s*[·,]\s*/).map(x => x.trim()).filter(Boolean))].slice(0, 5);
  function cardNums() {
    const st = boxStats(), on = k => card.stats.includes(k);
    const cells = [], lines = [];
    if (on('w') && st.went.length) cells.push(['직관', st.went.length, '번']);
    if (on('b') && st.seen.length) cells.push(['시청', st.seen.length, '번']);
    if (on('h') && st.heardList.length) cells.push(['들은 곡', st.heardList.length, '곡']);
    if (on('r') && st.topRegion) cells.push(['많이 간 곳', st.topRegion[0], '']);
    if (on('stage') && card.since) {
      const today = todayIso();
      const n = data.events.filter(e => e.date >= card.since && e.date <= today && !/생일|유튜브|네이버TV|기념/.test(e.category || '')).length;
      cells.push(['입덕 후 무대', n, '번']);
    }
    if (on('first') && st.first) lines.push(['첫 직관', fmtDate(st.first.date, false) + ' ' + st.first.title]);
    if (on('top') && st.heardList.length) lines.push(['제일 많이 들은 곡', st.heardList[0][0].name + (st.heardList[0][1] > 1 ? ` (${st.heardList[0][1]}번)` : '')]);
    return { cells, lines, st };
  }

  let cardFontsP = null;
  function cardFontsReady(text) {
    if (!cardFontsP) cardFontsP = new Promise(res => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;700&family=Nanum+Myeongjo:wght@700;800&family=Gowun+Dodum&family=Nanum+Pen+Script&display=swap';
      l.onload = l.onerror = res;
      document.head.appendChild(l);
      setTimeout(res, 4000);
    });
    const F = CARD_FONTS[card.font] || CARD_FONTS.myeong;
    return cardFontsP.then(() => document.fonts ? Promise.all([
      document.fonts.load(`${F.big} 50px ${F.f}`, text), document.fonts.load(`${F.w} 25px ${F.f}`, text),
      document.fonts.load(`400 12px ${CARD_SANS}`, text), document.fonts.load(`700 12px ${CARD_SANS}`, text),
    ]).catch(() => {}) : null);
  }

  let cardImg = null, cardImgSrc = '';
  // 카드 그리기: 미리보기와 저장 이미지가 같은 그림이에요 (340 너비 기준, 3배로 그려요)
  function drawCard(cv) {
    const C = CARD_COLORS[card.color] || CARD_COLORS.forest, F = CARD_FONTS[card.font] || CARD_FONTS.myeong;
    const W = 340, P = 22, IN = W - P * 2, S = 3, PH = 190;
    const hasPhoto = !!(cardPhoto && cardImg && cardImg.complete && cardImg.naturalWidth);
    const ctx = cv.getContext('2d');
    const ops = [];
    const font = (w, px, fam = CARD_SANS) => `${w} ${px}px ${fam}`;
    const fit = (t, max) => { if (ctx.measureText(t).width <= max) return t; while (t && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
    const wrap = (t, max, n) => {
      const out = []; let cur = '';
      for (const w of t.split(/(\s+)/)) {
        if (ctx.measureText(cur + w).width <= max || !cur.trim()) cur += w;
        else { out.push(cur.trim()); cur = w.trimStart(); }
      }
      if (cur.trim()) out.push(cur.trim());
      if (out.length > n) { out.length = n; out[n - 1] = fit(out[n - 1] + '…', max).replace(/……$/, '…'); }
      return out.map(l => fit(l, max));
    };
    const spaced = (t, x, y, ls, align = 'left') => {
      let w = 0; for (const ch of t) w += ctx.measureText(ch).width + ls; w -= ls;
      let cx = align === 'right' ? x - w : x;
      for (const ch of t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    };
    const label = (t, x, y, align) => ops.push(() => { ctx.font = font(500, 9); ctx.fillStyle = C.mute; spaced(t, x, y, 1.4, align); });
    const hline = y => ops.push(() => { ctx.fillStyle = C.line; ctx.fillRect(P, y, IN, 1); });
    ctx.textBaseline = 'top';
    let y = hasPhoto ? PH + 14 : P;
    ops.push(() => { ctx.font = font(500, 9.5); ctx.fillStyle = C.mute; spaced('FORESTELLA', P, y0, 2.2); spaced('SOOPBYEOL CARD', W - P, y0, 2.2, 'right'); });
    const y0 = y; y += 14 + 12;
    // 닉네임
    const nick = card.nick.trim() || '숲별';
    ctx.font = font(F.w, 25 * F.k, F.f);
    const nickT = fit(nick, IN), yN = y;
    ops.push(() => { ctx.font = font(F.w, 25 * F.k, F.f); ctx.fillStyle = C.ink; ctx.fillText(nickT, P, yN); });
    y += 25 * F.k * 1.25;
    // 입덕일 · 기수
    const gens = CARD_GENS.filter(g => card.gen.includes(g));
    const meta = [card.since ? card.since.replace(/-/g, '.') + ' 입덕' : '', gens.length ? '공식 팬클럽 숲별 ' + gens.join(' · ') : ''].filter(Boolean).join(' · ');
    if (meta) {
      ctx.font = font(400, 11);
      wrap(meta, IN, 2).forEach(l => { const yy = y + 2; ops.push(() => { ctx.font = font(400, 11); ctx.fillStyle = C.mute; ctx.fillText(l, P, yy); }); y += 15; });
    }
    // 큰 D+
    y += 10;
    const dd = ddayText() || 'D+';
    const big = 50 * F.k, yB = y;
    ctx.font = font(F.big, big, F.f);
    const bw = ctx.measureText(dd).width;
    ops.push(() => {
      ctx.font = font(F.big, big, F.f); ctx.fillStyle = C.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(dd, P, yB + big * 0.86);
      ctx.font = font(500, 9.5); ctx.fillStyle = C.mute;
      if (bw + 100 < IN) { spaced('DAYS WITH', P + bw + 10, yB + big * 0.86 - 13, 1.5); spaced('FORESTELLA', P + bw + 10, yB + big * 0.86, 1.5); }
      ctx.textBaseline = 'top';
    });
    y += big + 4;
    // 최애
    const mems = CARD_MEMS.filter(m => card.mem.includes(m));
    if (mems.length) {
      const yM = y + 6;
      ops.push(() => { ctx.font = font(400, 12.5); ctx.fillStyle = C.acc; ctx.fillText('♥', P, yM); ctx.fillStyle = C.ink; ctx.fillText(mems.join(' · '), P + 16, yM); });
      y += 6 + 18;
    }
    // 입덕곡 · 최애곡 (최애곡은 ' · '로 여러 곡)
    const favs = favList(card.fav);
    const songsRow = [['입덕곡', card.debut.trim()], ['최애곡', favs.join(' · ')]].filter(x => x[1]);
    if (songsRow.length) {
      y += 10; hline(y); y += 11;
      const two = songsRow.length > 1 && favs.length < 2;
      const colW = (IN - 12) / 2;
      songsRow.forEach(([lb, v], i) => {
        const x = two ? P + i * (colW + 12) : P, yS = y;
        label(lb, x, yS);
        ctx.font = font(F.w, 16 * F.k, F.f);
        const ls = two ? [fit(v, colW)] : wrap(v, IN, 2);
        ls.forEach((l, j) => ops.push(() => { ctx.font = font(F.w, 16 * F.k, F.f); ctx.fillStyle = C.ink; ctx.fillText(l, x, yS + 15 - (F.k > 1 ? 2 : 0) + j * 16 * F.k * 1.25); }));
        if (!two || i === songsRow.length - 1) y += 15 + 16 * F.k * 1.2 + (ls.length - 1) * 16 * F.k * 1.25 + (two ? 0 : 6);
      });
    }
    // 보관함 기록
    const { cells, lines } = cardNums();
    if (cells.length || lines.length) {
      y += 10; hline(y); y += 11;
      for (let r = 0; r < cells.length; r += 4) {
        const row = cells.slice(r, r + 4), cw = IN / row.length, yR = y;
        row.forEach(([lb, v, unit], i) => {
          const x = P + i * cw + (i ? 10 : 0);
          label(lb, x, yR);
          ops.push(() => {
            if (i) { ctx.fillStyle = C.line; ctx.fillRect(P + i * cw, yR, 1, 34); }
            ctx.fillStyle = C.ink; ctx.font = font(700, 17);
            const vt = fit(String(v), cw - (i ? 14 : 4) - (unit ? 12 : 0));
            ctx.fillText(vt, x, yR + 14);
            if (unit) { const vw = ctx.measureText(vt).width; ctx.font = font(400, 10); ctx.fillText(unit, x + vw + 1.5, yR + 21); }
          });
        });
        y += 38 + (r + 4 < cells.length ? 8 : 0);
      }
      lines.forEach(([lb, v]) => {
        const yL = y + 4;
        ops.push(() => {
          ctx.font = font(400, 11); ctx.fillStyle = C.mute; ctx.fillText(lb, P, yL);
          const lw = ctx.measureText(lb + ' ').width; ctx.fillStyle = C.ink; ctx.fillText(fit(v, IN - lw), P + lw, yL);
        });
        y += 18;
      });
    }
    // 제일 좋았던 일정 (절취선 아래)
    const best = card.best && data.byId.get(card.best);
    let yCut = 0;
    if (best) {
      y += 12; yCut = y; y += 13;
      label('제일 좋았던 일정 · ' + best.date.replace(/-/g, '.'), P, y);
      y += 15;
      ctx.font = font(700, 12.5);
      wrap(best.title, IN, 2).forEach(l => { const yy = y; ops.push(() => { ctx.font = font(700, 12.5); ctx.fillStyle = C.ink; ctx.fillText(l, P, yy); }); y += 18; });
    }
    // 한마디 · 아래 줄은 맨 아래에 붙여요
    const lineT = card.line.trim();
    const qH = lineT ? 15 * F.k * 1.7 + 6 : 0;
    const H = Math.ceil(Math.max(y + 14 + qH + 26, hasPhoto ? 690 : 520));
    if (lineT) {
      const yQ = H - 26 - qH;
      ops.push(() => { ctx.font = font(F.w, 15 * F.k, F.f); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(fit('“' + lineT + '”', IN), W / 2, yQ); ctx.textAlign = 'left'; });
    }
    ops.push(() => { ctx.font = font(400, 8.5); ctx.fillStyle = C.mute; ctx.fillText('숲별 기록장', P, H - 26); ctx.textAlign = 'right'; ctx.fillText('sujeonghan78-lgtm.github.io/forestella-archive', W - P, H - 26); ctx.textAlign = 'left'; });

    // 실제로 그리기
    cv.width = W * S; cv.height = H * S;
    cv.dataset.h = H;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.textBaseline = 'top';
    ctx.save();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, W, H, 20) : ctx.rect(0, 0, W, H); ctx.clip();
    if (C.bg.length > 1) { const g = ctx.createLinearGradient(0, 0, W * 0.35, H); g.addColorStop(0, C.bg[0]); g.addColorStop(1, C.bg[1]); ctx.fillStyle = g; } else ctx.fillStyle = C.bg[0];
    ctx.fillRect(0, 0, W, H);
    if (hasPhoto) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH); ctx.clip();
      const iw = cardImg.naturalWidth, ih = cardImg.naturalHeight, sc = Math.max(W / iw, PH / ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(cardImg, -(dw - W) * (cardPhoto.x ?? .5), -(dh - PH) * (cardPhoto.y ?? .5), dw, dh);
      ctx.restore();
    }
    const tg = ctx.createLinearGradient(0, 0, W, 0); tg.addColorStop(0, '#C6EC6B'); tg.addColorStop(.5, '#62D3A1'); tg.addColorStop(1, '#72BCF3');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 4);
    ops.forEach(f => f());
    if (yCut) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(10, yCut); ctx.lineTo(W - 10, yCut); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'destination-out';
      [0, W].forEach(x => { ctx.beginPath(); ctx.arc(x, yCut, 8, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    return { PH: hasPhoto ? PH : 0 };
  }

  function cardView() {
    const st = boxStats();
    const bestList = [...new Map([...st.wentAll, ...st.liked].map(e => [e.id, e])).values()].sort((a, b) => b.date.localeCompare(a.date));
    const chip = (grp, v, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-grp="${grp}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">숲별 카드${help('내 숲별 기록을 카드 한 장으로 만들어요. 넣은 내용과 사진은 이 폰에만 저장돼요.')}</h1>
      <form class="card-form" id="card-form" onsubmit="return false">
        <label><span class="cf-l">닉네임</span><input id="cf-nick" maxlength="16" value="${esc(card.nick)}" placeholder="숲별홍길동" autocomplete="off"></label>
        <label><span class="cf-l">입덕 날짜</span><input type="date" id="cf-since" value="${esc(card.since)}" max="${todayIso()}" min="2017-01-01"></label>
        <div class="cf-g"><span class="cf-l">공식 팬클럽 숲별 기수 <small>여러 개 골라도 돼요</small></span><div class="chips cf-chips">${CARD_GENS.map(g => chip('gen', g, g, card.gen.includes(g))).join('')}</div></div>
        <div class="cf-two">
          <label><span class="cf-l">입덕곡</span><span class="cf-ac"><input id="cf-debut" maxlength="40" value="${esc(card.debut)}" placeholder="곡 이름·초성" autocomplete="off"><span class="cf-sug" hidden></span></span></label>
          <label><span class="cf-l">최애곡</span><span class="cf-ac"><input id="cf-fav" maxlength="120" value="${esc(card.fav)}" placeholder="여러 곡 골라도 돼요" autocomplete="off" data-multi="1"><span class="cf-sug" hidden></span></span></label>
        </div>
        <div class="cf-g"><span class="cf-l">최애 <small>여러 명 골라도 돼요</small></span><div class="chips cf-chips">${CARD_MEMS.map(m => chip('mem', m, m, card.mem.includes(m))).join('')}</div></div>
        <label><span class="cf-l">제일 좋았던 일정 <small>직관·♥ 일정에서 골라요</small></span>
          <select id="cf-best"><option value="">${bestList.length ? '안 넣을래요' : '보관함에 직관·♥ 일정이 아직 없어요'}</option>${bestList.map(e => `<option value="${esc(e.id)}"${e.id === card.best ? ' selected' : ''}>${fmtDate(e.date, false)} ${esc(e.title)}</option>`).join('')}</select></label>
        <div class="cf-g"><span class="cf-l">사진 <small>안 넣어도 돼요</small></span>
          <div class="cf-photo"><label class="chip cf-file">📷 ${cardPhoto ? '사진 바꾸기' : '폰에서 사진 고르기'}<input type="file" id="cf-photo" accept="image/*" hidden></label>${cardPhoto ? '<button type="button" class="link-btn" id="cf-photo-x">사진 빼기</button>' : ''}</div>
          <p class="src-note">직접 찍었거나 공유해도 되는 사진을 넣어 주세요. 사진은 이 폰에만 있어요.${cardPhoto ? ' 미리보기에서 사진을 끌어서 위치를 맞출 수 있어요.' : ''}</p></div>
        <label><span class="cf-l">한마디 <small>안 써도 돼요</small></span><input id="cf-line" maxlength="24" value="${esc(card.line)}" placeholder="숲별이라 행복해" autocomplete="off"></label>
        <div class="cf-g"><span class="cf-l">글씨체</span><div class="cf-fonts">${Object.entries(CARD_FONTS).map(([k, f]) => `<button type="button" class="cf-font${card.font === k ? ' on' : ''}" data-grp="font" data-v="${k}" aria-pressed="${card.font === k}" style="font-family:${esc(f.f)};font-weight:${f.w}${k === 'pen' ? ';font-size:21px' : ''}">${f.name} 숲별</button>`).join('')}</div></div>
        <div class="cf-g"><span class="cf-l">카드 색</span><div class="cf-colors">${Object.entries(CARD_COLORS).map(([k, c]) => `<button type="button" class="cf-color${card.color === k ? ' on' : ''}" data-grp="color" data-v="${k}" aria-pressed="${card.color === k}" style="background:${c.bg.length > 1 ? `linear-gradient(135deg,${c.bg.join(',')})` : c.bg[0]}"><span class="sr">${c.name}</span></button>`).join('')}</div></div>
        <div class="cf-g"><span class="cf-l">카드에 넣을 기록 <small>보관함에서 자동</small></span><div class="chips cf-chips">${CARD_STATS.map(([k, l]) => chip('stats', k, l, card.stats.includes(k))).join('')}</div></div>
      </form>
      <div class="cf-l cf-pv-l">미리보기</div>
      <div class="cf-pv"><canvas id="card-cv"${cardPhoto ? ' class="has-photo"' : ''} aria-label="숲별 카드 미리보기"></canvas></div>
      <div class="cf-btns"><button type="button" class="btn" id="card-save">이미지로 저장</button><button type="button" class="btn ghost" id="card-x">X에 올리기</button></div>
      <p class="src-note cf-msg" id="card-msg">X에 올릴 땐 저장한 카드 이미지를 글에 붙여 주세요.</p>`;
  }

  function bindCard() {
    const cv = document.getElementById('card-cv');
    if (!cv) return;
    let geo = { PH: 0 }, tick = 0;
    const redraw = () => {
      const my = ++tick;
      const text = [card.nick, card.debut, card.fav, card.line, ddayText(), 'FORESTELLA SOOPBYEOL CARD DAYS WITH 숲별 입덕 공식 팬클럽 기수 직관 시청 들은 곡 많이 간 곳 첫 제일 좋았던 일정 기록장 번 무대 0123456789.·♥…“”', (data.byId.get(card.best) || {}).title || ''].join(' ');
      geo = drawCard(cv);
      cardFontsReady(text).then(() => { if (my === tick) geo = drawCard(cv); });
    };
    if (cardPhoto && cardImgSrc !== cardPhoto.src) { cardImg = new Image(); cardImg.onload = redraw; cardImg.src = cardImgSrc = cardPhoto.src; }
    const form = document.getElementById('card-form');
    const txt = { 'cf-nick': 'nick', 'cf-debut': 'debut', 'cf-fav': 'fav', 'cf-line': 'line', 'cf-since': 'since', 'cf-best': 'best' };
    form.oninput = form.onchange = ev => {
      const k = txt[ev.target.id];
      if (!k) return;
      card[k] = ev.target.value;
      cardSave(); redraw();
    };
    form.onclick = ev => {
      const b = ev.target.closest('[data-grp]');
      if (!b) return;
      const g = b.dataset.grp, v = b.dataset.v;
      if (g === 'font' || g === 'color') {
        card[g] = v;
        form.querySelectorAll(`[data-grp="${g}"]`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      } else {
        card[g] = card[g].includes(v) ? card[g].filter(x => x !== v) : [...card[g], v];
        b.classList.toggle('on'); b.setAttribute('aria-pressed', card[g].includes(v));
      }
      cardSave(); redraw();
    };
    // 곡 칸: 치는 대로 곡 목록이 걸러져요 (초성 OK, 목록에 없는 곡도 그대로 써도 돼요)
    const songNames = [...new Set([...data.songs.values()].map(x => x.name))].sort((a, b) => a.localeCompare(b, 'ko')).map(n => ({ n, k: norm(n), c: chosung(n).replace(/\s+/g, '') }));
    form.querySelectorAll('.cf-ac').forEach(w => {
      const inp = w.querySelector('input'), sug = w.querySelector('.cf-sug');
      const show = () => {
        const v = (inp.dataset.multi ? inp.value.split(/[·,]/).pop() : inp.value).trim(), q = norm(v), cq = v.replace(/\s+/g, '');
        const hits = !q ? songNames : isChosungOnly(cq) ? songNames.filter(x => x.c.includes(cq)) : songNames.filter(x => x.k.includes(q));
        sug.innerHTML = hits.slice(0, 60).map(x => `<button type="button" class="cf-opt" data-n="${esc(x.n)}">${esc(x.n)}</button>`).join('') || '<span class="cf-none">목록에 없어요. 그대로 써도 돼요.</span>';
        sug.hidden = false;
      };
      inp.addEventListener('focus', () => { if (inp.dataset.multi && inp.value.trim() && !/[·,]\s*$/.test(inp.value)) { inp.value = inp.value.trim() + ' · '; setTimeout(() => { const n = inp.value.length; inp.setSelectionRange(n, n); show(); }, 0); } show(); });
      inp.addEventListener('input', show);
      // 여러 곡 칸은 눌렀을 때 커서를 맨 뒤로 (다음 곡을 이어서 쓰게)
      if (inp.dataset.multi) inp.addEventListener('click', () => { if (/·\s*$/.test(inp.value)) { const n = inp.value.length; inp.setSelectionRange(n, n); show(); } });
      inp.addEventListener('blur', () => setTimeout(() => {
        sug.hidden = true;
        // 여러 곡 칸은 끝에 남은 ' · '를 정리해서 저장해요
        if (inp.dataset.multi && document.activeElement !== inp) { const t = favList(inp.value).join(' · '); if (t !== inp.value) { inp.value = t; inp.dispatchEvent(new Event('input', { bubbles: true })); sug.hidden = true; } }
      }, 150));
      sug.onpointerdown = ev => ev.preventDefault();
      sug.onclick = ev => {
        const o = ev.target.closest('.cf-opt');
        if (!o) return;
        ev.stopPropagation();
        if (inp.dataset.multi) { const segs = inp.value.split(/\s*[·,]\s*/); segs.pop(); inp.value = favList([...segs, o.dataset.n].join(' · ')).join(' · ') + ' · '; } else inp.value = o.dataset.n;
        sug.hidden = true;
        inp.dispatchEvent(new Event('input', { bubbles: true })); sug.hidden = true; inp.blur();
      };
    });
    // 사진: 긴 쪽 1200px로 줄여서 이 폰에만 저장
    const fi = document.getElementById('cf-photo');
    fi.onchange = () => {
      const f = fi.files && fi.files[0];
      if (!f) return;
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const sc = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        cardPhoto = { src: c.toDataURL('image/jpeg', 0.85), x: 0.5, y: 0.5 };
        boxWrite(PHOTO_KEY, cardPhoto);
        cardImgSrc = '';
        renderBase('card');
      };
      img.src = url;
    };
    const px = document.getElementById('cf-photo-x');
    if (px) px.onclick = () => { cardPhoto = null; cardImg = null; cardImgSrc = ''; boxWrite(PHOTO_KEY, null); renderBase('card'); };
    // 미리보기에서 사진 끌어서 위치 맞추기
    let drag = null;
    cv.onpointerdown = ev => {
      if (!geo.PH || !cardImg) return;
      const r = cv.getBoundingClientRect(), k = 340 / r.width;
      if ((ev.clientY - r.top) * k > geo.PH) return;
      drag = { x: ev.clientX, y: ev.clientY, px: cardPhoto.x ?? .5, py: cardPhoto.y ?? .5, k };
      cv.setPointerCapture(ev.pointerId);
    };
    cv.onpointermove = ev => {
      if (!drag) return;
      const iw = cardImg.naturalWidth, ih = cardImg.naturalHeight, sc = Math.max(340 / iw, geo.PH / ih);
      const ox = iw * sc - 340, oy = ih * sc - geo.PH;
      const cl = v => Math.min(1, Math.max(0, v));
      cardPhoto.x = ox > 1 ? cl(drag.px - (ev.clientX - drag.x) * drag.k / ox) : .5;
      cardPhoto.y = oy > 1 ? cl(drag.py - (ev.clientY - drag.y) * drag.k / oy) : .5;
      drawCard(cv);
    };
    cv.onpointerup = cv.onpointercancel = () => { if (drag) { drag = null; boxWrite(PHOTO_KEY, cardPhoto); } };
    // 저장: 공유 창이 되면 공유 창(사진 앱에 저장 가능), 아니면 내려받기
    const msg = document.getElementById('card-msg');
    const blobOf = () => new Promise(res => cv.toBlob(res, 'image/png'));
    const download = b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '숲별카드.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
    document.getElementById('card-save').onclick = async () => {
      const b = await blobOf(); if (!b) return;
      const file = new File([b], '숲별카드.png', { type: 'image/png' });
      // 아이폰은 공유 창의 '이미지 저장'으로, 안드로이드·컴퓨터는 바로 내려받기
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      download(b);
      msg.textContent = '카드 이미지를 저장했어요. 갤러리나 다운로드 폴더에서 볼 수 있어요.';
    };
    document.getElementById('card-x').onclick = () => {
      const t = `숲별 ${ddayText()} 🌲 내 숲별 카드\n#포레스텔라 #Forestella #숲별카드\n`;
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent('https://sujeonghan78-lgtm.github.io/forestella-archive/'), '_blank', 'noopener');
    };
    redraw();
  }

  // 같은 공연이 이틀 이상이면 직관은 날짜마다 따로 눌러요
  const wentBtns = e => {
    const near = data.events.filter(x => x.title === e.title && samePlace(x.place, e.place) && Math.abs(new Date(x.date) - new Date(e.date)) <= 7 * 864e5);
    // 방송은 현장에서 본 '직관'과 방송으로 본 '시청'을 따로 눌러요
    if (/TV|라디오/.test(e.category)) return boxBtn('w', e.id, 'bpill') + boxBtn('v', e.id, 'bpill');
    if (near.length < 2) return boxBtn('w', e.id, 'bpill');
    return near.map(x => { const on = boxHas('w', x.id), lab = x.date.slice(5).replace('-', '.') + ' 직관'; return `<button type="button" class="bpill box-btn" data-box="w" data-id="${esc(x.id)}" data-label="${lab}" aria-pressed="${on}">${on ? '✓ ' : '🎫 '}${lab}</button>`; }).join('');
  };
  function bindBox() {
    const more = document.querySelector('.box-more');
    if (more) more.onclick = () => { more.parentNode.classList.remove('short'); more.remove(); };
    const bq = document.getElementById('box-q');
    if (bq) bq.oninput = () => {
      const v = norm(bq.value), c = bq.value.replace(/\s/g, ''), cho = isChosungOnly(c);
      document.getElementById('box-tabs-wrap').hidden = !!v;
      document.getElementById('box-found').hidden = !v;
      let n = 0;
      document.querySelectorAll('.box-hit').forEach(a => { a.hidden = !(cho ? a.dataset.c.includes(c) : a.dataset.n.includes(v)); if (!a.hidden) n++; });
      document.getElementById('box-none').hidden = n > 0;
    };
    const out = document.getElementById('box-out');
    if (out) out.onclick = () => { boxUser = null; boxWrite(BOX_USER, null); renderBase('box'); };
    const form = document.getElementById('box-form');
    if (!form) return;
    const msg = document.getElementById('box-msg');
    form.onsubmit = async () => {
      const name = document.getElementById('box-name').value.trim(), pin = document.getElementById('box-pin').value.trim();
      if (name.length < 2) { msg.textContent = '이름은 2글자 이상으로 정해 주세요.'; return false; }
      if (!/^\d{4}$/.test(pin)) { msg.textContent = '숫자 4자리를 넣어 주세요.'; return false; }
      msg.textContent = '확인하는 중…';
      try {
        boxUser = { name, pin };
        const r = await boxCall('login', { data: box });
        if (!r.ok) {
          boxUser = null;
          msg.textContent = r.err === 'locked' ? '여러 번 틀려서 잠시 막혔어요. 10분 뒤에 다시 해 주세요.' : r.err === 'pin' ? '이미 있는 이름이에요. 내 이름이라면 숫자를 다시 확인해 주세요.' : '지금은 연결이 안 돼요. 잠시 뒤 다시 해 주세요.';
          return false;
        }
        box = boxClean(r.data); boxWrite(BOX_KEY, box);
        boxUser.at = Date.now(); boxWrite(BOX_USER, boxUser);
        renderBase('box');
      } catch (err) { boxUser = null; msg.textContent = '지금은 연결이 안 돼요. 잠시 뒤 다시 해 주세요.'; }
      return false;
    };
  }

  // ---------- 공연·행사 (축제·기업 행사·지역 공연) ----------
  // 단독 투어·게스트·셋리스트 있는 콘서트는 빼고, 장소·행사명 낱말로 지역을 나눠요 (보충 파일 region으로 고칠 수 있어요)
  const REGIONS = [
    ['해외', /두바이|해외|일본|미국|도쿄|N\.?AMERICA|Atlanta|Dallas|New York|Vancouver|\bin LA\b/i],
    ['경기·인천', /경기 광주|인천|송도|부천|광명|안성|분당|성남|고양|킨텍스|수원|의정부|신한대|인스파이어|계양|자라섬|jarasum|가평|용인|경기도|과천|렛츠런파크(?! 제주)|Incheon|Suwon|Goyang/i],
    ['제주', /제주/],
    ['강원', /Gangn[eu]+ng|Gangneong|강원|원주|춘천|강릉|인제|동해|속초|평창|삼척|홍천/],
    ['충청', /Daejeon|Cheongju|in DA|대전|세종시|충남|충북|충청|천안|아산|이순신종합운동장|이순신 종합운동장|계룡|예산|제천|청주|공주|금강|대백제전|당진|서산|논산|충주/],
    ['전라', /Gwangju|Jeonju|광주|타이거즈|전남|전북|전라|목포|여수|나주|순천|장흥|보림사|곡성|익산|원광|남원|광한루|영광|화순|지스트|엘로우시티|드래곤즈|광양|함평|군산|전주|고창|정읍|해남|강진|수묵/],
    ['경상', /Busan|Daegu|Ulsan|Changwon|in BU|부산|대구|울산|경북|경남|경상|창원|김해|통영|용호도|경주|칠곡|직지사|김천|영도|벡스코|BNK|포항|안동|구미|영덕|예주|울진|연호문화센터|태화강|3\.15|거제|진주|양산|APEC|창녕|밀양|상주|문경/],
    ['서울', /서울|seoul|경희대|잠실|올림픽공원|올림픽홀|88잔디|롯데콘서트홀|코엑스|장충|은평|서리풀|홍대|노량진|동작|세종대|고려대|한전아트센터|유니버설아트센터|플라자호텔|KBS홀|블루스퀘어|예술의전당(?!.*(광주|대구|경주|부산))/i],
  ];
  const regionOf = e => {
    const fix = ((data.extra || {}).region || {})[e.id];
    if (fix) return fix;
    const t = `${e.place || ''} ${e.title}`;
    const r = REGIONS.find(([, rx]) => rx.test(t));
    return r ? r[0] : '그 외';
  };
  const isLocalEvent = e => e.category === '공연' && !e.ytOnly;
  const hasVideo = e => !!(e.videoId || e.related.length || e.ytMain || (e.ytStage || []).length);
  function localView() {
    const r = decodeURIComponent((location.hash.split('?r=')[1] || '').split('&')[0]);
    const all = data.events.filter(isLocalEvent);
    const names = ['서울', '경기·인천', '강원', '충청', '전라', '경상', '제주', '해외', '그 외'];
    const count = n => all.filter(e => regionOf(e) === n).length;
    const list = (r ? all.filter(e => regionOf(e) === r) : all).slice().reverse();
    const years = new Map();
    list.forEach(e => { const y = e.date.slice(0, 4); if (!years.has(y)) years.set(y, []); years.get(y).push(e); });
    const md = x => x.date.slice(5).replace('-', '.');
    // 이틀 공연은 연표처럼 한 줄에 날짜 버튼 여러 개로
    const row = run => { const e = run[0]; const songs = run.find(x => x.songs.length && x.songSource !== '참고'); return `
          <div class="ev">
            <span class="dot${songs ? '' : ' dot-plain'}" aria-hidden="true"></span>
            <span class="ev-body">
              <span class="ev-date">${r ? '' : `<span class="tag">${esc(regionOf(e))}</span>`}${upcoming(e)}${run.length > 1 ? `<span class="ev-days">${run.slice().sort((a, b) => a.date.localeCompare(b.date)).map(x => `<a class="ev-day${boxHas('w', x.id) ? ' went' : ''}" href="#/e/${encodeURIComponent(x.id)}">${boxHas('w', x.id) ? '🎫 ' : ''}${md(x)}</a>`).join('')}</span>` : `<span>${md(e)}</span>`}${e.place ? `<span class="ev-place">${esc(e.place)}</span>` : ''}</span>
              <a class="ev-title" href="#/e/${encodeURIComponent(e.id)}">${run.some(x => boxHas('e', x.id)) ? '<span class="liked-mark">♥</span> ' : ''}${run.length === 1 && boxHas('w', e.id) ? '🎫 ' : ''}${esc(e.title)}${run.length > 1 ? ` <span class="ev-count">${run.length}회</span>` : ''}${run.some(hasVideo) ? ' <span class="ev-count">▶ 영상</span>' : ''}</a>
              ${songs ? `<span class="ev-songs">확인된 곡 · ${songsShort(songs.songs)}</span>` : ''}
            </span>${evThumb(evPic(run))}
          </div>`; };
    const chip = (n, label) => `<a class="chip${n === r ? ' on' : ''}" href="#/local${n ? '?r=' + encodeURIComponent(n) : ''}"${n === r ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">공연·행사${help('축제·기획 공연·기업 행사처럼 단독 콘서트가 아닌 공연을 지역별로 모았어요. 지역은 장소와 행사 이름으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <div class="chips tl-cats">${chip('', `전체 ${all.length}`)}${names.filter(count).map(n => chip(n, `${n} ${count(n)}`)).join('')}</div>
      <p class="sub">${list.length}개 · ${list.filter(hasVideo).length}개는 영상이 있어요 ${addLink('', 'add-mini')}</p>
      </div>
      <div class="tl">${[...years.entries()].map(([y, es]) => `<h2 class="month">${y}년</h2>${groupRuns(es).map(row).join('')}`).join('')}</div>`;
  }

  function programView() {
    const name = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0];
    const p = name && !HIDDEN_PROGS.has(name) && programs().get(name);
    return p ? programDetail(p) : programIndex();
  }

  let progType = '', progSort = 'many';
  function programIndex() {
    const all = programList();
    const types = PROGRAM_TYPES.filter(t => all.some(p => p.type === t));
    let list = progType ? all.filter(p => p.type === progType) : all;
    if (progSort === 'recent') list = list.slice().sort((a, b) => (progLastDate(b) > progLastDate(a) ? 1 : -1));
    const counts = p => [p.events.length && `출연 ${p.events.length}`, p.videos.length && `영상 ${p.videos.length}`, p.songs.length && `곡 ${p.songs.length}`].filter(Boolean).join(' · ');
    const row = p => `<a class="prog-row" href="${progHref(p.name)}" data-n="${esc(norm(p.name))}" data-c="${esc(chosung(p.name))}"><span class="prog-rthumb">${progThumb(p)}</span><span class="prog-rbody"><b>${esc(p.name)}</b><span>${counts(p)}</span>${progLast(p) ? `<span>최근 ${progLast(p)}${progSpan(p).includes('~') ? ` · ${progSpan(p).slice(0, 4)}년부터` : ''}</span>` : ''}</span><span class="prog-chev" aria-hidden="true">›</span></a>`;
    // 전체 · 많이 나온 순일 때만 큰 카드 + 종류별 묶음, 나머지는 한 줄 목록
    const grouped = !progType && progSort === 'many';
    const top = grouped ? list.filter(p => p.name !== OTHER_PROG && p.name !== MIX_PROG && progCover(p)).slice(0, 4) : [];
    const topSet = new Set(top);
    const card = p => `<a class="prog-card" href="${progHref(p.name)}" data-n="${esc(norm(p.name))}" data-c="${esc(chosung(p.name))}"><span class="prog-thumb">${progThumb(p)}</span><b>${esc(p.name)}</b><span class="prog-meta">${counts(p)}</span>${progLast(p) ? `<span class="prog-meta">최근 ${progLast(p)}</span>` : ''}</a>`;
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    const body = grouped
      ? `${top.length ? `<section class="prog-sec"><h2 class="h3 list-title">많이 나온 프로그램</h2><div class="prog-grid">${top.map(card).join('')}</div></section>` : ''}
        ${types.map(t => [t, list.filter(p => p.type === t && !topSet.has(p))]).filter(x => x[1].length).map(([t, ps]) => `<section class="prog-sec"><h2 class="h3 list-title">${esc(t)}</h2><div class="prog-rows">${ps.map(row).join('')}</div></section>`).join('')}`
      : `<section class="prog-sec"><div class="prog-rows">${list.map(row).join('')}</div></section>`;
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">프로그램별 모아보기${help('일정에 등록된 출연과 방송사 공식 유튜브 영상을 프로그램별로 묶었어요. 프로그램 이름은 제목으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="prog-q" aria-label="프로그램 찾기" placeholder="프로그램 찾기 · 초성 OK" autocomplete="off">
      </form>
      <div class="chips tl-cats" id="prog-type">${chip('t', '', '전체', !progType)}${types.map(t => chip('t', t, t, progType === t)).join('')}</div>
      <div class="view-row"><p class="sub" id="prog-count">${list.length}개</p><div class="chips" id="prog-sort">${chip('s', 'many', '많이 나온 순', progSort === 'many')}${chip('s', 'recent', '최근 순', progSort === 'recent')}</div></div>
      </div>
      ${body}`;
  }
  function bindPrograms() {
    document.querySelectorAll('#prog-type .chip').forEach(b => b.onclick = () => { progType = b.dataset.t; renderBase('program'); });
    document.querySelectorAll('#prog-sort .chip').forEach(b => b.onclick = () => { progSort = b.dataset.s; renderBase('program'); });
    const on = document.querySelector('#prog-type .chip.on');
    if (on && on.dataset.t) on.parentNode.scrollLeft = on.offsetLeft - 16;
    const q = document.getElementById('prog-q');
    if (!q) return;
    q.oninput = () => {
      const v = norm(q.value), c = q.value.replace(/\s/g, '');
      const items = [...document.querySelectorAll('.prog-row, .prog-grid .prog-card')];
      items.forEach(a => { a.hidden = !!v && (isChosungOnly(c) ? !a.dataset.c.includes(c) : !a.dataset.n.includes(v)); });
      document.querySelectorAll('.prog-sec').forEach(sec => { sec.hidden = ![...sec.querySelectorAll('.prog-row, .prog-card')].some(a => !a.hidden); });
      document.getElementById('prog-count').textContent = items.filter(a => !a.hidden).length + '개';
    };
  }
  const progThumb = p => { const v = progCover(p); return v ? `<img src="${ytThumbUrl(v)}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
  const progLastDate = p => p.events.map(e => e.date).concat(p.videos.map(v => v.date)).filter(Boolean).sort().pop() || '';
  const progLast = p => progLastDate(p).slice(0, 7).replace('-', '.');

  // 프로그램 대표 썸네일: 가장 최근 무대 영상 → 최근 영상 → 영상 있는 최근 출연
  function progCover(p) {
    const v = p.videos.find(x => ['무대', '라이브'].includes(x.kind)) || p.videos[0];
    if (v) return v.id;
    const e = p.events.find(x => x.videoId || x.ytMain);
    return e ? (e.videoId || e.ytMain.id) : '';
  }
  // 활동 기간: "2018~2026" (한 해면 "2026")
  function progSpan(p) {
    const ds = p.events.map(e => e.date).concat(p.videos.map(v => v.date)).filter(Boolean).sort();
    if (!ds.length) return '';
    const a = ds[0].slice(0, 4), b = ds[ds.length - 1].slice(0, 4);
    return a === b ? a : `${a}~${b}`;
  }

  // 회차 제목이 프로그램 이름이나 "방송"뿐이면 누가 나왔는지로 보여줘요
  const MEM_ORDER = ['배두훈', '강형호', '조민규', '고우림'];
  function epTitle(e, prog) {
    const t = programTitle(e.title, prog).replace(/\s*\((두훈|형호|민규|우림)([,\/·\s]+(두훈|형호|민규|우림))*\)\s*$/, '').trim();
    const generic = !t || t === prog || /^(MBC|KBS|SBS|JTBC|Mnet|tvN|MBN)?\s*방송$/.test(t) || PROGRAM_DEFS.some(d => d[0] === prog && d[2].test(t) && t.replace(d[2], '').trim() === '');
    if (!generic) return t;
    const ms = MEM_ORDER.filter(m => (e.members || []).includes(m));
    return ms.length && ms.length < 4 ? `${ms.map(m => m.slice(1)).join(' · ')} 출연` : '포레스텔라 출연';
  }
  function programDetail(p) {
    const play = playAllUrl(p.events);
    const ep = e => {
      const ref = e.songSource === '참고';
      const vid = e.videoId || (e.ytMain && e.ytMain.id) || ((e.ytStage || [])[0] || {}).id || (e.related[0] || {}).videoId;
      return `
        <a class="ep" href="#/e/${encodeURIComponent(e.id)}">
          <span class="ep-body">
            <span class="ep-date">${fmtDate(e.date)}</span>
            <span class="ep-title">${esc(epTitle(e, p.name))}</span>
            ${ref ? `<span class="ep-ref">참고${e.videoMemo ? ' · ' + esc(e.videoMemo.replace(/^참고:\s*/, '')) : ''}</span>` :
              e.songs.length ? `<span class="ep-songs">확인된 곡 · ${songsShort(e.songs)}</span>` : ''}
          </span>
          ${vid && !ref ? `<span class="day-thumb ep-thumb"><img src="${ytThumbUrl(vid)}" alt="" loading="lazy" onerror="this.remove()"><span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span></span>` : ''}
        </a>`;
    };
    const songRow = x => `<a class="song-item" href="#/song/${encodeURIComponent(x.so.key)}">${songPic(x.so) ? `<img class="song-thumb" src="${esc(songPic(x.so))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'song-thumb'}))">` : '<span class="song-thumb"></span>'}<span class="song-name">${esc(x.so.name)}</span><span class="song-n"><b>${x.n}번</b> ›</span></a>`;
    const others = PROGRAMS_TOP().filter(n => n !== p.name);
    return `
      <a class="back" href="#/program">‹ 프로그램</a>
      <h1 class="h1 page-title">${esc(p.name)}</h1>
      <p class="sub">${esc(p.type)}${progSpan(p) ? ` · ${progSpan(p)}` : ''}</p>
      ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>${esc(p.name)} 무대 이어보기</a>` : ''}
      ${paneTabs([
        { label: '출연', n: p.events.length, html: p.events.length ? moreList(p.events.map((e, i) => `<div class="ep-item">${i === 0 || p.events[i - 1].date.slice(0, 4) !== e.date.slice(0, 4) ? `<h3 class="ep-year">${e.date.slice(0, 4)}</h3>` : ''}${ep(e)}</div>`), 15).replace('stack x-list', 'stack ep-list') : '' },
        { label: '영상', n: p.videos.length, html: p.videos.length ? ytList(p.videos) : '' },
        { label: '곡', n: p.songs.length, html: p.songs.length ? `<p class="src-note">이 프로그램에서 부른 날 수 순서예요.</p><div>${p.songs.map(songRow).join('')}</div>` : '' },
      ]) || '<p class="empty">아직 기록이 없어요.</p>'}
      ${others.length ? `<h2 class="h3 list-title">다른 프로그램</h2><div class="chips">${others.map(n => `<a class="chip" href="${progHref(n)}">${esc(n)}</a>`).join('')}<a class="chip" href="#/program">전체 ›</a></div>` : ''}`;
  }

  // ---------- 자동 연결 점검 (관리용) ----------
  // 애매한 자동 연결만 모아서 맞아요/틀려요. 맞아요는 이 기기에만, 틀려요는 목록을 복사해서 보내면 data.js LINK_SKIP에 넣어요
  const CHK_OK = 'soopbyeol-check-ok', CHK_BAD = 'soopbyeol-check-bad';
  const chkGet = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (err) { return []; } };
  const chkSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* 괜찮아요 */ } };
  function checkItems() {
    const evT = e => `${fmtDate(e.date, false)} ${e.title}`;
    const ev = [], song = [], x = [];
    (data.official || []).forEach(v => {
      if (v.event && (v.evWhy || []).length) [v.event, ...(v.evMore || [])].forEach(e => ev.push({ k: `${v.id}>ev:${e.id}`, img: ytThumbUrl(v.id), url: ytWatch(v.id), title: v.title, sub: `${v.bc || (v.ch ? v.ch + ' 채널' : '공식')} · ${v.date}`, to: evT(e), why: v.evWhy.join(' · ') }));
      (v.loose || []).forEach(key => { const so = data.songs.get(key); if (so) song.push({ k: `${v.id}>song:${key}`, img: ytThumbUrl(v.id), url: ytWatch(v.id), title: v.title, sub: `${v.bc || (v.ch ? v.ch + ' 채널' : '공식')} · ${v.date}`, to: so.name, why: '제목에 따옴표 없이 곡 이름이 들어 있음' }); });
    });
    data.songs.forEach(so => { const ps = songX(so); if (so._xLoose) ps.forEach(p => x.push({ k: `x:${p.id}>song:${so.key}`, img: p.img ? p.img + '?name=thumb' : '', url: p.url, title: p.text || p.raw, sub: `공식 X · ${p.date}`, to: so.name, why: '짧은 곡 이름으로 찾음' })); });
    return { ev, song, x };
  }
  function checkView() {
    const ok = new Set(chkGet(CHK_OK)), bad = chkGet(CHK_BAD), badK = new Set(bad.map(b => b.k));
    const its = checkItems();
    const left = l => l.filter(i => !ok.has(i.k) && !badK.has(i.k));
    const row = i => `
      <div class="chk" data-k="${esc(i.k)}" data-d="${esc(i.to + ' ← ' + i.title)}">
        <a class="chk-media" href="${esc(i.url)}" target="_blank" rel="noopener">${i.img ? `<img src="${esc(i.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</a>
        <div class="chk-body">
          <span class="chk-sub">${esc(i.sub)}</span>
          <a class="chk-title" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a>
          <span class="chk-to">→ ${esc(i.to)}</span>
          <span class="chk-why">${esc(i.why)}</span>
          <span class="chk-btns"><button type="button" class="chip" data-chk="ok">맞아요</button><button type="button" class="chip chk-bad" data-chk="bad">틀려요</button></span>
        </div>
      </div>`;
    const pane = l => { const r = left(l); return r.length ? moreList(r.map(row), 15).replace(/stack x-list/g, 'stack chk-list') : '<p class="empty">다 확인했어요!</p>'; };
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">자동 연결 점검${help('영상과 공식 X 글 중 제목·글 내용만 보고 자동으로 붙인 것 가운데 애매한 것만 모았어요. 맞으면 [맞아요], 틀리면 [틀려요]를 누르고, 틀린 목록을 복사해서 보내 주시면 사이트에서 빼요. [맞아요]는 이 기기에만 기억돼요.')}</h1>
      <div class="sync-box" id="sync-status"><b>자동으로 가져오기</b><span class="sync-row">불러오는 중…</span></div>
      <div class="chk-bar">
        <span>틀린 연결 <b>${bad.length}</b>개</span>
        <button type="button" class="chip" id="chk-copy"${bad.length ? '' : ' disabled'}>목록 복사</button>
        <button type="button" class="link-btn" id="chk-reset">처음부터 다시</button>
      </div>
      ${paneTabs([
        { label: '영상 → 일정', n: left(its.ev).length, html: pane(its.ev) },
        { label: '영상 → 곡', n: left(its.song).length, html: pane(its.song) },
        { label: '공식 X → 곡', n: left(its.x).length, html: pane(its.x) },
      ])}`;
  }
  // 자동으로 가져오는 작업(깃허브 액션)마다 마지막 실행 시각과 성공 여부. 너무 오래 멈추면 빨갛게
  const SYNC_JOBS = [['cafe-sync.yml', '카페 일정', 1], ['yt-sync.yml', '공식 유튜브', 2], ['yt-bc.yml', '방송사 유튜브', 2], ['x-sync.yml', '공식 X', 1]];
  function loadSyncStatus() {
    const box = document.getElementById('sync-status');
    if (!box) return;
    const when = t => new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    Promise.all(SYNC_JOBS.map(([f, name, days]) =>
      fetch(`https://api.github.com/repos/sujeonghan78-lgtm/forestella-archive/actions/workflows/${f}/runs?per_page=1&exclude_pull_requests=true`)
        .then(r => r.ok ? r.json() : Promise.reject()).then(j => {
          const run = (j.workflow_runs || [])[0];
          if (!run) return `<span class="sync-row"><span>${name}</span><span>아직 실행 전</span></span>`;
          const failed = run.status === 'completed' && run.conclusion !== 'success';
          const stale = Date.now() - Date.parse(run.updated_at) > days * 86400e3;
          const state = run.status !== 'completed' ? '가져오는 중' : failed ? '실패' : '성공';
          return `<span class="sync-row${failed || stale ? ' sync-bad' : ''}"><span>${name}</span><a href="${esc(run.html_url)}" target="_blank" rel="noopener">${esc(when(run.updated_at))} · ${state}</a></span>`;
        }).catch(() => `<span class="sync-row"><span>${name}</span><span>확인 못 함</span></span>`)))
      .then(rows => { box.innerHTML = '<b>자동으로 가져오기</b>' + rows.join(''); });
  }
  function bindCheck() {
    loadSyncStatus();
    const v = document.getElementById('view') || document.body;
    v.querySelectorAll('[data-chk]').forEach(b => b.onclick = () => {
      const box = b.closest('.chk'), k = box.dataset.k;
      if (b.dataset.chk === 'ok') chkSet(CHK_OK, [...new Set([...chkGet(CHK_OK), k])]);
      else chkSet(CHK_BAD, [...chkGet(CHK_BAD).filter(x => x.k !== k), { k, d: box.dataset.d }]);
      box.remove();
      const n = document.querySelector('.chk-bar b'); if (n) n.textContent = chkGet(CHK_BAD).length;
      const c = document.getElementById('chk-copy'); if (c) c.disabled = !chkGet(CHK_BAD).length;
    });
    const c = document.getElementById('chk-copy');
    if (c) c.onclick = () => copyText('자동 연결 틀린 것\n' + chkGet(CHK_BAD).map(x => `${x.k} | ${x.d}`).join('\n'));
    const r = document.getElementById('chk-reset');
    if (r) r.onclick = () => { if (confirm('맞아요·틀려요 표시를 모두 지울까요?')) { chkSet(CHK_OK, []); chkSet(CHK_BAD, []); renderBase('check'); } };
  }

  // ---------- 더보기 ----------
  const menuIcon = d => `<span class="mi-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg></span>`;
  function moreView() {
    const item = (href, icon, label, side, ext) =>
      `<a class="mi" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${menuIcon(icon)}<span class="mi-l">${label}</span><span class="mi-side">${side ? side + ' ' : ''}›</span></a>`;
    return `
      <h1 class="h1 page-title">더보기</h1>
      <a class="about-card" href="#/about">
        <span class="block-head"><span class="about-title">기록은 이렇게 모았어요</span><span aria-hidden="true">›</span></span>
        <span>일정은 공식 팬카페 캘린더(2021년 7월 이전은 나무위키·방송 영상), 곡은 영상으로 확인된 것만 적었어요. 빠지거나 틀린 게 있으면 알려주세요.</span>
      </a>
      <nav aria-label="더보기 메뉴">
        ${item('#/add', '<path d="M12 5v14M5 12h14"/>', '일정 등록', '빠진 일정 알려주기')}
        ${item('#/opinion', '<path d="M4 5h16v11H9l-5 4z"/>', '의견', '남기기 · 모아보기')}
        ${item('#/box', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', '보관함', (box.e.length + box.s.length + box.w.length) ? `♥ ${box.e.length + box.s.length} · 🎫 ${box.w.length}` : '좋아요 · 직관')}
        ${item('#/card', '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h5M4 15.5h16" stroke-dasharray="2 2"/>', '숲별 카드', card.since ? '숲별 ' + ddayText() : '내 기록을 카드로')}
        ${item('#/program', '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/>', '프로그램별 모아보기', '')}
        ${item('#/local', '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', '공연·행사', '축제 · 기획 공연 · 지역별')}
        ${item('#/concerts', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', '콘서트', ((data.concerts || []).length || data.tours.length) + '개')}
        ${item('#/timeline', '<path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="15" r="2"/><path d="M14 7h6M4 15h6"/>', '연표', '연도·월별 기록')}
        ${item('#/releases', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>', '음반 이야기', '앨범 · 싱글별 공식 X')}
        ${item('#/members', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', '멤버 개인 활동', '')}
        ${item('#/search?cat=' + encodeURIComponent('생일'), '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '기념일', '생일 · 데뷔일')}
        ${item(formUrl({}), '<path d="M4 20h4L19 9l-4-4L4 16z"/>', '기록 제보 · 정정 요청', '구글 폼', true)}
        ${item('#/install', '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6M9 11l3 3 3-3"/>', '앱처럼 쓰기', '')}
        ${item('#/about', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', '이 사이트에 대해', '')}
      </nav>
      <a class="check-link" href="#/check">자동 연결 점검 (관리용) ›</a>
      <a class="check-link" href="#/admin">관리자 기기 ›</a>`;
  }

  // 앨범 보기: 목록을 사진만 바둑판으로 (사이트 전체, 기억해 둬요). 사진 목록이 없는 칸에선 버튼이 회색
  let albumOn = false;
  try { albumOn = localStorage.getItem('albumMode') === '1' || localStorage.getItem('memAlbum') === '1'; } catch (err) { /* 괜찮아요 */ }
  document.documentElement.classList.toggle('album-on', albumOn);
  const albumBtn = () => `<button type="button" class="chip view-tog${albumOn ? ' on' : ''}" onclick="toggleAlbum()">${albumOn ? '목록으로 보기' : '앨범으로 보기'}</button>`;
  // 필터 펼치기: 좌우로 넘기던 필터 줄을 여러 줄로 다 보여줘요 (펼친 동안은 위에 고정하지 않아요)
  let chipsOpen = false;
  try { chipsOpen = localStorage.getItem('chipsOpen') === '1'; } catch (err) { /* 저장 못 해도 괜찮아요 */ }
  document.documentElement.classList.toggle('chips-open', chipsOpen);
  const chipsBtn = () => `<button type="button" class="link-btn chips-tog" onclick="toggleChips()">${chipsOpen ? '접기 ▴' : '펼치기 ▾'}</button>`;
  window.toggleChips = () => {
    chipsOpen = !chipsOpen;
    try { localStorage.setItem('chipsOpen', chipsOpen ? '1' : '0'); } catch (err) { /* 괜찮아요 */ }
    document.documentElement.classList.toggle('chips-open', chipsOpen);
    document.querySelectorAll('.chips-tog').forEach(b => { b.textContent = chipsOpen ? '접기 ▴' : '펼치기 ▾'; });
  };
  window.toggleAlbum = () => {
    albumOn = !albumOn;
    document.documentElement.classList.toggle('album-on', albumOn);
    try { localStorage.setItem('albumMode', albumOn ? '1' : ''); } catch (err) { /* 괜찮아요 */ }
    document.querySelectorAll('.view-tog').forEach(b => { b.classList.toggle('on', albumOn); b.textContent = albumOn ? '목록으로 보기' : '앨범으로 보기'; });
  };
  let syncT = 0;
  const viewEl = document.getElementById('view');
  if (viewEl) new MutationObserver(() => { clearTimeout(syncT); syncT = setTimeout(() => window.syncAlbum(), 60); }).observe(viewEl, { childList: true, subtree: true });
  window.syncAlbum = () => {
    // 화면(#view)과 일정 상세 창(.sheet-wrap)을 따로 봐요
    document.querySelectorAll('#view, .sheet-wrap').forEach(box => {
      const ok = [...box.querySelectorAll('.x-list')].some(l => l.offsetParent && l.querySelector('.x-card img, .card-thumb img'));
      box.querySelectorAll('.view-tog').forEach(b => { b.classList.toggle('dis', !ok); b.disabled = !ok; });
    });
  };
  // 멤버 개인 활동: 맨 위 프로필(사진·숫자), 탭은 활동 이력 → 일정 → 음반 → 유튜브 → X
  const CAREER_ORDER = ['뮤지컬', '공연', 'OST', '음반', '방송', '라디오', '광고', '기타'];
  const CAREER_LABEL = { 공연: '단독 공연 · 무대', 음반: '솔로 음반 · 참여곡', OST: 'OST', 방송: '방송', 뮤지컬: '뮤지컬' };
  const careerDate = d => {
    const [a, b] = String(d).split('~');
    const f = x => (x || '').replace(/-/g, '.');
    if (!b) return f(a);
    // 기간은 달까지만: 2015.10~2016.01, 같은 달이면 날짜 그대로
    const ma = f(a).slice(0, 7), mb = f(b).slice(0, 7);
    return ma === mb ? f(a) : `${ma}~${a.slice(0, 4) === b.slice(0, 4) ? mb.slice(5) : mb}`;
  };
  function membersView() {
    const m = new URLSearchParams(location.hash.split('?')[1] || '').get('m') || MEMBER_LIST[0];
    const evs = data.events.filter(e => e.members.includes(m)).sort((a, b) => (a.date < b.date ? 1 : -1));
    const vs = (data.official || []).filter(v => v.members.includes(m));
    const xs = (data.xFeed || []).filter(p => p.m.includes(m));
    const als = (data.albums || []).filter(a => a.member === m);
    const pics = xs.filter(p => p.img).slice(0, 10);
    const bday = xs.filter(p => p.cat === '생일').length;
    const q = encodeURIComponent(m);
    // 활동 이력: 시트 음반 정보에 이미 있는 음반은 음반 탭에서 보여서 빼요
    const alNames = new Set(als.map(a => a.name.toLowerCase().replace(/\s+/g, '')));
    const car = (data.career || []).filter(c => c.member === m && !(c.type === '음반' && alNames.has(c.title.toLowerCase().replace(/\s+/g, ''))));
    const carRow = c => `<div class="car-row"><span class="car-date">${esc(careerDate(c.date)).replace('~', '~<br>')}</span><span class="car-body"><b>${esc(c.title)}${unsure(c.unsure)}</b>${[c.note, c.where].filter(Boolean).length ? `<span>${esc([c.note, c.where].filter(Boolean).join(' · '))}</span>` : ''}</span></div>`;
    // 음반 탭에도 솔로 참여곡·OST를 같이 (시트 음반 아래)
    // 발매일이 같은(±1일) 시트 음반이 있으면 그 음반 카드에 곡 이름만 붙이고, 없으면 따로 목록으로
    const dayN = d => Date.parse(d.slice(0, 10)) / 864e5;
    const albSongs = new Map();
    const carDisc = car.filter(c => c.type === '음반' || c.type === 'OST').filter(c => {
      if (c.date.length < 10) return true;
      const near = als.filter(a => a.date && Math.abs(dayN(a.date) - dayN(c.date)) <= 1);
      const same = x => x.name.replace(/\s+/g, '').toLowerCase() === c.title.replace(/\s+/g, '').toLowerCase();
      const a = near.find(same) || near.find(a => (c.type === 'OST') === /OST/i.test(a.kind + a.name)) || near[0];
      // 시트 비고에서 '제외'라고 적어 둔 곡은 그 음반에 붙이지 않아요
      if (!a) return true;
      if (a.name.replace(/\s+/g, '').toLowerCase() === c.title.replace(/\s+/g, '').toLowerCase()) return false;
      if (c.title.split('/').some(t => (a.note || '').includes(t.trim()))) return true;
      albSongs.set(a, [...(albSongs.get(a) || []), c.title]);
      return false;
    }).sort((a, b) => b.date.localeCompare(a.date));
    // 활동 이력 탭: 음반·OST는 음반 탭에, 방송은 팬텀싱어만 남겨요
    const carShow = car.filter(c => !['음반', 'OST'].includes(c.type) && (c.type !== '방송' || /팬텀싱어/.test(c.title)));
    const groups = CAREER_ORDER.map(t => [t, carShow.filter(c => (CAREER_ORDER.includes(c.type) ? c.type : '기타') === t).sort((a, b) => b.date.localeCompare(a.date))]).filter(g => g[1].length);
    const careerHtml = groups.length ? `${groups.map(([t, list]) => `
        <h3 class="car-h">${esc(CAREER_LABEL[t] || t)} <b>${list.length}</b></h3>
        <div class="car-list">${list.map(carRow).join('')}</div>`).join('')}
        <p class="src-note">나무위키 · 더뮤지컬 · 소속사 프로필 · 기사에서 모았어요.</p>` : '';
    const first = evs.length ? evs[evs.length - 1].date.slice(0, 4) : '';
    const stat = [['일정', evs.length], ['영상', vs.length], ['음반', als.length + carDisc.length], ['활동 이력', carShow.length]].filter(x => x[1]);
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">멤버 개인 활동${help('일정은 일정명에 멤버 이름이 표시된 기록만, 영상·공식 X는 제목이나 글에 멤버 이름이 나온 것만 모았어요. 활동 이력은 나무위키 · 더뮤지컬 · 소속사 프로필 · 기사에서 모았어요.')}</h1>
      <div class="seg-wrap" role="tablist">${MEMBER_LIST.map(x => `<a class="seg${x === m ? ' on' : ''}" href="#/members?m=${encodeURIComponent(x)}" role="tab" aria-selected="${x === m}">${x}</a>`).join('')}</div>
      <div class="mem-hero">
        <span class="mem-hero-pic">${pics[0] ? `<img src="${esc(pics[0].img)}?name=small" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
        <div class="mem-hero-body">
          <b>${esc(m)}</b>
          <div class="mem-stats">${stat.map(([k, n]) => `<span>${k} <b>${n}</b></span>`).join('')}</div>
          ${bday ? `<a class="mem-bday" href="#/xfeed?cat=${encodeURIComponent('생일')}&m=${q}">🎂 생일 축하 글 ${bday}개 ›</a>` : ''}
        </div>
      </div>
      ${pics.length > 1 ? `<div class="member-x"><div class="x-strip">${pics.slice(1).map(p => `<a href="${esc(p.url)}" target="_blank" rel="noopener" title="${esc(p.text)}"><img src="${esc(p.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join('')}</div></div>` : ''}
      <div class="mem-body">
      ${paneTabs([
        { label: '활동 이력', n: carShow.length, html: careerHtml },
        { label: '일정', n: evs.length, html: evs.length ? `${moreList(evs.map(resultCard), 10)}<a class="more mem-all" href="#/search?member=${q}">검색에서 걸러 보기 ›</a>` : '' },
        { label: '음반', n: als.length + carDisc.length, html: als.length + carDisc.length ? `<div class="stack x-list">${als.map(a => `
          <a class="x-card${a.img ? '' : ' no-img'}" href="${albHref(a)}">
            ${a.img ? `<img src="${esc(imgSize(a.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <span class="x-text"><span class="x-date">${nw(`${a.date.replace(/-/g, '.')} · ${a.kind}`)}</span><b>${esc(a.name)}${unsure(a.unsure)}</b>${albSongs.has(a) ? `<span class="x-date">${esc(m)} 노래 · ${esc(albSongs.get(a).join(', '))}</span>` : ''}</span>
          </a>`).join('')}</div>${carDisc.length ? `<h3 class="car-h">그 밖의 참여곡 · OST <b>${carDisc.length}</b></h3><div class="car-list">${carDisc.map(carRow).join('')}</div>` : ''}` : '' },
        { label: '유튜브', n: vs.length, html: vs.length ? `<div class="view-row">${albumBtn()}</div>${ytList(vs)}<a class="more mem-all" href="#/yt?m=${q}">유튜브 탭에서 보기 ›</a>` : '' },
        { label: 'X', n: xs.length, html: xList(xs) },
      ])}
      </div>`;
  }

  function aboutView() {
    const badge = (cls, label, text) => `<div class="b-row"><span class="bd ${cls}">${label}</span><span>${text}</span></div>`;
    return `
      <div class="about-top">
        <a class="back" href="#/more">‹ 더보기</a>
        <h1 class="h1">이 사이트에 대해</h1>
        <p>숲별 기록장은 팬이 만든 <b>비공식</b> 아카이브예요. 소속사 · 공식 채널과 관계가 없어요.</p>
      </div>
      <section class="sec">
        <h2 class="h3">일정은 어디서 왔나요?</h2>
        <p>공식 팬카페 캘린더에 올라온 일정을 옮겨왔어요. 카페 캘린더가 2021년 8월부터라, 그 이전(2017~2021년 7월)은 나무위키와 방송사 유튜브 영상 날짜로 따로 채웠어요. 카페 회원만 볼 수 있는 일정(응모 · 방청 신청 같은 것)은 올리지 않아요. 카페에 새 일정이 올라오면 30분마다 자동으로 확인해서 여기에도 추가돼요.</p>
      </section>
      <section class="sec">
        <h2 class="h3">영상과 곡은 어디서 오나요?</h2>
        <p>아래 채널의 영상을 매일 자동으로 모아서, 제목을 보고 곡 · 일정 · 음반 · 콘서트 · 프로그램에 붙여요. 제목으로 붙이는 거라 가끔 틀릴 수 있어요.</p>
        <ul class="about-list">
          <li><b>포레스텔라 공식 유튜브</b>와 멤버 공식 채널 (강형호 · 조민규 · 고우림)</li>
          <li><b>방송사 공식 유튜브 20개</b> (KBS · MBC · JTBC · Mnet 등). 조회수 1만 이상이고 제목에 포레스텔라나 멤버 이름이 있는 영상만</li>
          <li><b>유튜브 뮤직 공식 음원</b> (곡 페이지의 음원 칸)</li>
          <li><b>공식 X</b> (@official_fore) 글</li>
          <li><b>콘서트 셋리스트</b>는 나무위키 · setlist.fm · 뉴스 기사를 모았어요</li>
        </ul>
      </section>
      <section class="sec">
        <h2 class="h3">일정의 '이날 부른 곡'</h2>
        <p>영상으로 확인된 곡만 적어요. 영상이 없는 곡은 빠져 있을 수 있어요. 출처는 이렇게 표시해요.</p>
        <div class="badges">
          ${badge('bd-tv', '방송사 영상', '방송사 공식 채널 영상으로 확인')}
          ${badge('bd-official', '공식채널', '포레스텔라 공식 유튜브로 확인')}
          ${badge('bd-fan', '팬 영상', '팬 영상 제목 기준이라 틀릴 수 있어요. 링크는 걸지 않아요')}
          ${badge('bd-ref', '참고', '녹화일 · 연속 방송이라 곡을 정하지 않았어요')}
        </div>
      </section>
      <section class="sec">
        <h2 class="h3">빠지거나 틀린 게 있다면</h2>
        <p>제보 폼으로 알려주세요. 제보는 "팬 제보 · 미확인" 표시와 함께 바로 보이고, 확인한 뒤 기록에 반영해요.</p>
        <div class="two-btn">
          <a class="btn btn-link" href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">기록 제보하기</a>
          <a class="btn btn-link btn-line" href="${formUrl({ type: '틀린 정보' })}" target="_blank" rel="noopener">정정 요청</a>
        </div>
      </section>
      <section class="sec">
        <h2 class="h3">문의 · 삭제 요청</h2>
        <p>X(트위터) <a href="https://x.com/duun1122" target="_blank" rel="noopener">@duun1122</a>로 연락해 주세요. 기록 정정은 제보 폼이 더 빨라요.</p>
      </section>`;
  }

  // 홈 화면에 추가 안내 (첫 접속 팝업 없이, 더보기에서만)
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installPrompt = ev; });
  function installView() {
    const ua = navigator.userAgent;
    const kakao = /KAKAOTALK/i.test(ua);
    const android = /Android/i.test(ua);
    const os = new URLSearchParams(location.hash.split('?')[1] || '').get('os') || (android ? 'android' : 'ios');
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const step = (n, t, d) => `<div class="step"><span class="num">${n}</span><div class="st"><b>${t}</b><span>${d}</span></div></div>`;
    const steps = os === 'android' ? [
      step(1, '크롬에서 열기', kakao ? '지금 카톡 안에서 열었어요. 오른쪽 위 ⋮ 메뉴에서 "다른 브라우저로 열기"를 눌러주세요.' : '카톡 안에서 열었다면 오른쪽 위 ⋮ 메뉴에서 "다른 브라우저로 열기"를 눌러주세요.'),
      step(2, '메뉴 열기', '크롬 오른쪽 위 ⋮ 버튼을 눌러요.'),
      step(3, '"홈 화면에 추가" 선택', '"앱 설치"로 보일 수도 있어요. 추가를 누르면 끝!'),
    ] : [
      step(1, '사파리에서 열기', kakao ? '지금 카톡 안에서 열었어요. 오른쪽 아래 메뉴에서 "Safari로 열기"를 눌러주세요.' : '카톡 안에서 열었다면 오른쪽 아래 메뉴에서 "Safari로 열기"를 눌러주세요.'),
      step(2, '공유 버튼 누르기', '화면 아래쪽, 네모에 화살표가 있는 버튼이에요.'),
      step(3, '"홈 화면에 추가" 선택', '목록을 아래로 내리면 있어요. 추가를 누르면 끝!'),
    ];
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <div class="install-head">
        <img src="icons/icon-192.png" alt="" width="60" height="60">
        <div><h1 class="h1">앱처럼 쓰기</h1><p class="sub">홈 화면에 추가하면 아이콘으로 바로 열려요</p></div>
      </div>
      ${standalone ? '<div class="notice">이미 홈 화면에서 열었어요. 👍</div>' : ''}
      <div class="checks">
        <span>✓ 주소창 없이 전체 화면으로</span>
        <span>✓ 한 번 열어두면 다음부터 더 빨리</span>
        <span>✓ 앱스토어 설치 필요 없음</span>
      </div>
      ${installPrompt ? '<button type="button" class="btn install-now" id="install-now">지금 홈 화면에 추가하기</button>' : ''}
      <div class="seg-wrap" role="tablist">
        <a class="seg${os === 'ios' ? ' on' : ''}" href="#/install?os=ios" role="tab" aria-selected="${os === 'ios'}">아이폰</a>
        <a class="seg${os === 'android' ? ' on' : ''}" href="#/install?os=android" role="tab" aria-selected="${os === 'android'}">안드로이드</a>
      </div>
      <div class="steps">${steps.join('')}</div>`;
  }
  function bindInstall() {
    const b = document.getElementById('install-now');
    if (b) b.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderBase('install'); };
  }

  const routes = {
    home: () => `
      ${header()}
      <div id="op-home"></div>
      ${homeAsk()}
      ${homeSearchBox()}
      <hr class="divider">
      ${homeRandom()}
      ${homeMembers()}
      <hr class="divider">
      ${homeVideos()}
      ${homeShortcuts()}
      ${homePrograms()}
      <hr class="divider">
      ${homeAgo()}
      ${homeMonth()}`,
    search: searchView,
    program: programView,
    local: localView,
    box: boxView,
    card: cardView,
    songs: songsView,
    song: songView,
    timeline: timelineView,
    more: moreView,
    members: membersView,
    about: aboutView,
    install: installView,
    concerts: concertsView,
    tour: tourView,
    add: addView,
    opinion: opinionView,
    admin: adminView,
    xfeed: xfeedView,
    yt: ytView,
    releases: releasesView,
    check: checkView,
  };

  // ---------- 일정 상세 (아래에서 올라오는 시트) ----------
  const SOURCE_NOTE = {
    '방송사 영상': '출처 · 방송사 공식 영상',
    '공식채널': '출처 · 포레스텔라 공식 유튜브',
    '언론사 영상': '출처 · 언론사 공식 영상',
    '팬 영상': '출처 · 팬 영상 (제목 기준이라 틀릴 수 있어요)',
  };
  const YT_FIND = '<span class="yt-find" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>유튜브</span>';
  // 유튜브·X에서 바로 찾아보기 (검색어가 미리 써진 화면을 열어요)
  const findRow = q => `
    <div class="find-row">
      <a class="find-btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>유튜브에서 검색</a>
      <a class="find-btn" href="https://x.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X에서 검색</a>
    </div>`;
  // 일정명 앞의 [방송사] 같은 표시는 빼고 검색해요
  const findQuery = title => '포레스텔라 ' + title.replace(/^(\[[^\]]*\]\s*)+/, '').replace(/\s*\([^)]*녹화[^)]*\)/, '').trim();

  const ytWatch = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const ytThumb = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

  // 일정 상세 '이날 부른 곡' 한 줄: 곡 요약 + 그날 무대 영상이 있으면 ▶
  // 아직 확정 안 된 팬 셋리에만 나온 곡
  const songPending = so => !(so.albums || []).length && !(so.tours || []).length && !(so.official || []).length && so.events.length > 0 && so.events.every(x => x.fanSet && !x.fanSet.ok);
  function songRow(name, e) {
    const so = data.songs.get(window.DATA.songKey(name));
    const ytq = e ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`포레스텔라 ${name} ${e.title.replace(/\[[^\]]*\]|\([^)]*\)|<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`)}` : '';
    const ytBtn = ytq ? `<a class="day-yt" href="${ytq}" target="_blank" rel="noopener" aria-label="${esc(name)} 유튜브에서 찾기">${YT_FIND}</a>` : '';
    // 사이트에 없는 곡은 검은 글씨, 있는 곡은 초록 글씨로 곡 페이지에 이어요
    if (!so) return `<div class="day-song"><span class="day-song-name"><b>${esc(name)}</b></span>${ytBtn}</div>`;
    // 확인 안 된 팬 셋리에만 나온 새 곡은 검은 글씨 + '확인 필요' (셋리가 확정되면 자동으로 초록)
    if (songPending(so)) return `<div class="day-song"><a class="day-song-name" href="#/song/${encodeURIComponent(so.key)}"><b>${esc(name)} <span class="new-tag">확인 필요</span></b></a>${ytBtn}</div>`;
    const day = e && ((so.official || []).find(v => v.event === e) || (so.official || []).find(v => v.date === e.date && ['무대', '직캠', '라이브'].includes(v.kind)));
    const vid = day ? day.id : e && e.videoId && e.songs.length === 1 ? e.videoId : '';
    return `<div class="day-song"><a class="day-song-name day-song-link" href="#/song/${encodeURIComponent(so.key)}"><b>${esc(name)} ›</b></a>${vid ? `<a class="day-thumb" href="${ytWatch(vid)}" target="_blank" rel="noopener" aria-label="${esc(name)} 이날 영상 보기"><img src="${ytThumbUrl(vid)}" alt="" loading="lazy" onerror="this.remove()"><span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span></a>` : ytBtn}</div>`;
  }

  // ---------- 콘서트 셋리스트 ----------
  // 셋리스트 한 줄: "A / B"처럼 날마다 달랐던 곡은 각각 곡 페이지로 이어요
  function setlistSong(title) {
    return title.split(' / ').map(seg => seg.split(/(\s+[+&]\s+)/).map((part, i) => {
      if (i % 2) return esc(part);
      const so = data.songs.get(window.DATA.songKey(window.DATA.setlistName(part)));
      const cls = so && [so.events.length ? '' : 'plain', (so.official || []).length ? 'has-vid' : ''].filter(Boolean).join(' ');
      return so ? `<a${cls ? ` class="${cls}"` : ''} href="#/song/${encodeURIComponent(so.key)}">${esc(part)}</a>` : esc(part);
    }).join('')).join(' / ');
  }

  // 메모 맨 앞의 "1부·2부·앵콜"을 소제목으로 바꿔요
  function setlistSections(songs) {
    const secs = [];
    songs.forEach((s, i) => {
      const m = (s.note || '').match(/^(1부|2부|3부|4부|앵콜)(\s*마지막)?(\s*·\s*)?/);
      const name = m ? m[1] : '';
      const note = m ? s.note.slice(m[0].length) : s.note;
      if (!secs.length || (name && name !== secs[secs.length - 1].name)) secs.push({ name, items: [] });
      secs[secs.length - 1].items.push({ ...s, n: i + 1, note });
    });
    return secs;
  }

  const tourRange = t => {
    const a = t.dates[0], b = t.dates[t.dates.length - 1];
    return a === b ? fmtDate(a, false) : `${fmtDate(a, false)} ~ ${a.slice(0, 4) === b.slice(0, 4) ? b.slice(5).replace('-', '.') : fmtDate(b, false)}`;
  };

  // 필터 여러 개 고르기: 주소에 쉼표로 이어 써요 (같은 줄 안에서는 '또는', 다른 줄끼리는 '그리고')
  // '전체'가 기본, 누르면 켜고 다시 누르면 꺼요. 다 끄면 '전체'로 돌아가요
  const multiOf = (qs, k) => (qs.get(k) || '').split(',').filter(Boolean);
  function multiChips(base, state, key, values, allLabel, label = v => v) {
    const sel = state[key];
    const link = next => { const s = new URLSearchParams(Object.entries({ ...state, [key]: next }).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]).filter(x => x[1])).toString(); return s ? base + '?' + s : base; };
    const a = (on, h, t) => `<a class="chip${on ? ' on' : ''}" href="${h}">${esc(t)}</a>`;
    return `<div class="chips tl-cats">${a(!sel.length, link([]), allLabel).replace('class="chip', 'class="chip chip-all')}<span class="chip-br"></span>${values.map(v => a(sel.includes(v), link(sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v]), label(v))).join('')}</div>`;
  }

  // ---------- 공식 유튜브 모아보기 ----------
  const YT_KINDS = ['M/V', '무대', '직캠', '라이브', '클립', '가사 영상', '비하인드', '티저', '쇼츠', '영상'];
  function ytView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const q = qs.get('q') || '';
    const st = { ch: multiOf(qs, 'ch'), kind: multiOf(qs, 'kind'), y: multiOf(qs, 'y'), m: multiOf(qs, 'm'), q };
    const all = data.official || [];
    const chans = [...MEMBER_LIST.filter(m => all.some(v => v.ch === m)), ...(all.some(v => v.bc) ? ['방송사'] : [])];
    const CH_NAMES = { 강형호: '[PITTA]강형호 & 이용우', 조민규: '조민규 ChoMinGyu', 고우림: 'Official KOWOORIM' };
    const qm = matcher(q);
    const chOk = v => !st.ch.length || st.ch.some(c => c === '포레스텔라' ? !v.ch && !v.bc : c === '방송사' ? v.bc : v.ch === c);
    const list = all.filter(v => chOk(v) && (!st.kind.length || st.kind.includes(v.kind)) && (!st.y.length || st.y.includes(v.date.slice(0, 4))) && (!st.m.length || st.m.some(m => v.members.includes(m))) && (!qm || qm(vidText(v))));
    return `
      <h1 class="h1 page-title">공식 유튜브${help('포레스텔라 공식 유튜브 채널(@officialforestella)과 강형호·조민규·고우림 공식 채널, 그리고 KBS·MBC·JTBC·Mnet 같은 방송사 공식 채널에 올라온 포레스텔라 영상(조회수 1만 이상)을 매일 자동으로 모아요. 종류와 멤버는 제목으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" id="yt-form">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="yt-q" value="${esc(q)}" placeholder="영상 찾기 · 초성 OK" aria-label="영상 찾기" autocomplete="off">
      </form>
      ${chans.length ? multiChips('#/yt', st, 'ch', ['포레스텔라', ...chans], '채널 전체', c => c === '포레스텔라' || c === '방송사' ? c : CH_NAMES[c] || c + ' 채널') : ''}
      ${multiChips('#/yt', st, 'kind', YT_KINDS.filter(k => all.some(v => v.kind === k)), '종류 전체')}
      ${multiChips('#/yt', st, 'y', [...new Set(all.map(v => v.date.slice(0, 4)))].sort().reverse(), '연도 전체')}
      ${multiChips('#/yt', st, 'm', MEMBER_LIST, '멤버 전체', m => m.slice(1))}
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}개</p>${chipsBtn()}${albumBtn()}</div>
      </div>
      ${list.length ? moreList(list.map(ytCard), 20) : '<p class="empty">해당하는 영상이 없어요.</p>'}`;
  }
  function bindYt() {
    const f = document.getElementById('yt-form');
    if (!f) return;
    f.onsubmit = ev => {
      ev.preventDefault();
      const qs = new URLSearchParams(location.hash.split('?')[1] || '');
      const v = document.getElementById('yt-q').value.trim();
      if (v) qs.set('q', v); else qs.delete('q');
      location.hash = '#/yt' + (qs.toString() ? '?' + qs : '');
    };
  }

  // ---------- 셋리 알려주기 ----------
  // 팬이 셋리 글을 통째로 붙여넣으면 곡으로 나눠 사이트 곡과 맞춰 보여주고, 제보 폼("종류: 셋리스트")으로 보내요.
  // 곡의 60% 이상이 사이트에 있는 곡이면 data.js가 그 일정에 바로 붙여요.
  const SL_SKIP = /^(앵콜|앵코르|앙코르|encore|vcr|ment|멘트|토크|인트로|intro|인터미션|intermission|셋리스트|셋리|setlist|오프닝|엔딩|\d+부|part\s*\d+)$/i;
  function slParse(t) {
    let lines = t.split(/\n+/);
    if (lines.filter(l => l.trim()).length < 3) lines = t.split(/\s*(?:\/|,|→|>|\|)\s*/);
    return lines.map(l => l
      .replace(/[\u{1F000}-\u{1FAFF}☀-➿️‍]/gu, '')
      .replace(/^[\s\d.)\]:\-–—•·*#~|>]+/, '')
      .replace(/\s*[(（[][^)）\]]*(앵콜|앙코르|encore|솔로|듀엣|ver|버전)[^)）\]]*[)）\]]\s*$/i, '')
      .replace(/^["'“‘「『]|["'”’」』]$/g, '')
      .trim())
      .filter(l => l && l.length <= 60 && !SL_SKIP.test(l) && !/셋리|setlist|^https?:|^[@#]/i.test(l));
  }
  function slMatch(n) {
    const so = data.songs.get(window.DATA.songKey(window.DATA.setlistName(n)));
    if (so) return so.name;
    // 검색창이 알아듣는 한글 표기·줄임말(보랩, 넬판…)도 같은 곡으로
    const c = n.replace(/\s+/g, '').toLowerCase();
    const has = name => (koOf(name) + ' ' + (SONG_KO[String(name).replace(/\s+/g, '')] || '')).split(' ').includes(c);
    const hit = [...data.songs.values()].find(s => has(s.name) || (s.match && has(s.match)));
    return hit ? hit.name : '';
  }
  // 이 브라우저를 구분하는 임의 번호 (셋리 '맞아요'를 같은 사람이 여러 번 세지 않게)
  const myUid = () => { try { let u = localStorage.getItem('sb-uid'); if (!u) { u = Math.random().toString(36).slice(2, 10); localStorage.setItem('sb-uid', u); } return u; } catch (err) { return ''; } };
  const SL_OK = 'sb-slok';
  const slOked = k => { try { return JSON.parse(localStorage.getItem(SL_OK) || '[]').includes(k); } catch (err) { return false; } };
  // 팬이 올린 셋리 상태: 확인 필요(맞아요 버튼) 또는 확정
  function slState(e) {
    const f = e.fanSet;
    if (!f) return '';
    const mine = f.by && f.by === myUid(), done = slOked((f.src || e.id) + ':' + f.ver);
    const btn = !f.ok && !mine && !done && (window.CONFIG.form || {}).fields ? `<button type="button" class="bpill sl-ok" data-id="${esc(f.src || e.id)}" data-ver="${esc(f.ver)}">맞아요</button>` : '';
    const msg = f.ok ? `팬 ${f.n}명이 확인한 셋리예요.`
      : mine ? '내가 올린 셋리예요. 다른 두 분이 맞다고 하면 확정돼요.'
      : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.'
      : "팬이 올린 셋리예요. 맞으면 '맞아요'를, 틀린 곳이 있으면 아래 '셋리 고치기'를 눌러 주세요.";
    return `<div class="sl-state${f.ok ? ' ok' : ''}"><span class="src-badge">${f.ok ? '확정' : `확인 필요 · ${f.n}/2`}</span><span class="sl-state-msg">${msg}</span>${btn}</div>`;
  }
  // 하루 두 번 공연은 제목 끝 (낮공)·(밤공)으로 나눠 둬요
  const showTag = e => { const m = e.title.match(/\((낮공|밤공)\)$/); return m ? ' ' + m[1] : ''; };
  function slForm(evs) {
    if (!evs.length || !(window.CONFIG.form || {}).fields) return '';
    // 곡이 이미 있으면 그 목록을 채워 두고 '셋리 고치기'로 보여줘요
    const one = evs.find(e => e.songs.length && e.songSource !== '참고') || evs[0];
    const fs = one && (one.fanSet || (one.songs.length && one.songSource !== '참고' ? { songs: one.songs } : null));
    const opt = e => `${e.date.slice(5).replace('-', '.')}${showTag(e)}${e.place ? ' ' + e.place : ''}`;
    return `
      <details class="sl-add">
        <summary>${fs ? '✏️ 셋리 고치기' : '📝 셋리 알려주기'}</summary>
        <div class="sl-box">
          ${evs.length > 1 ? `<select class="sl-ev">${evs.map(e => `<option value="${esc(e.id)}"${e === one ? ' selected' : ''}>${esc(opt(e))}</option>`).join('')}</select>` : `<input type="hidden" class="sl-ev" value="${esc(evs[0].id)}">`}
          <textarea class="sl-in" rows="8" placeholder="한 줄에 한 곡씩 붙여넣어 주세요. 보랩·넬판 같은 줄임말도 알아들어요.&#10;&#10;예)&#10;Save our lives&#10;스카페&#10;넬판&#10;Inner Universe&#10;아리랑">${fs ? esc(fs.songs.join('\n')) : ''}</textarea>
          <ol class="sl-pre"></ol>
          <p class="src-note sl-msg">✓는 사이트에 있는 곡, ?는 처음 보는 곡이에요. 보내면 '확인 필요'로 붙고, 다른 두 분이 맞다고 하면 확정돼요.${fs && fs.ver ? ' 고쳐서 보내면 확인은 처음부터 다시 받아요.' : ''} 사이트에 반영되기까지 5~10분쯤 걸려요.</p>
          <button type="button" class="bpill sl-send" disabled>보내기</button>
        </div>
      </details>`;
  }
  // 날짜를 바꾸면 그날 곡으로 다시 채워요
  document.addEventListener('change', ev => {
    if (!ev.target.matches('.sl-ev')) return;
    const e = data.events.find(x => x.id === ev.target.value), t = ev.target.closest('.sl-box').querySelector('.sl-in');
    t.value = e && e.songSource !== '참고' ? e.songs.join('\n') : '';
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // 미리 채워 둔 목록은 열자마자 ✓/? 미리보기를 보여줘요
  document.addEventListener('toggle', ev => { const t = ev.target.matches && ev.target.matches('.sl-add') && ev.target.open && ev.target.querySelector('.sl-in'); if (t && t.value) t.dispatchEvent(new Event('input', { bubbles: true })); }, true);
  document.addEventListener('input', ev => {
    if (!ev.target.matches('.sl-in')) return;
    const box = ev.target.closest('.sl-box');
    const list = slParse(ev.target.value);
    box.querySelector('.sl-pre').innerHTML = list.map(n => { const m = slMatch(n); return `<li class="${m ? 'ok' : 'new'}">${m ? '✓' : '?'} ${esc(m || n)}</li>`; }).join('');
    box.querySelector('.sl-send').disabled = list.length < 3;
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.sl-send');
    if (!b) return;
    const box = b.closest('.sl-box');
    const id = box.querySelector('.sl-ev').value, e = data.events.find(x => x.id === id);
    const songs = [...new Set(slParse(box.querySelector('.sl-in').value).map(n => slMatch(n) || n))];
    if (!e || songs.length < 3) return;
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 셋리스트\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n곡: ${songs.join(' / ')}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => { b.textContent = '보냈어요 ✓'; box.querySelector('.sl-msg').textContent = `${songs.length}곡을 보냈어요. 고마워요! 5~10분쯤 뒤 새로 열면 사이트에 붙어 있어요.`; })
      .catch(() => { b.disabled = false; b.textContent = '다시 보내기'; box.querySelector('.sl-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; });
  });

  document.addEventListener('click', ev => {
    const b = ev.target.closest('.sl-ok');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 셋리확인\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n버전: ${b.dataset.ver}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => {
        try { const a = JSON.parse(localStorage.getItem(SL_OK) || '[]'); a.push(e.id + ':' + b.dataset.ver); localStorage.setItem(SL_OK, JSON.stringify(a.slice(-300))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
        document.querySelectorAll(`.sl-ok[data-id="${CSS.escape(e.id)}"]`).forEach(x => { x.closest('.sl-state').outerHTML = slState(e); });
      })
      .catch(() => { b.disabled = false; b.textContent = '다시 누르기'; });
  });

  // ---------- 일정 등록 ----------
  // 한 칸에 일정 하나씩 적어 보내요(제보 폼 '종류: 새일정'). 보내면 바로 '확인 필요'로 뜨고, 다른 두 분이 '맞아요'를 누르면 확정이에요
  const ADD_CATS = ['공연', '뮤지컬', 'TV', '라디오', '유튜브', '기타'];
  const ADD_MEM = ['두훈', '형호', '민규', '우림'];
  const addKey = t => (t || '').replace(/\[[^\]]*\]|\s+/g, '').toLowerCase();
  const addSame = (date, title) => { const t0 = addKey(title); return t0 && data.events.find(x => x.date === date && (addKey(x.title) === t0 || (t0.length >= 4 && (addKey(x.title).includes(t0) || t0.includes(addKey(x.title)))))); };
  function addCard(v = {}, quick = false) {
    const mem = v.mem || [];
    return `
      <div class="add-card">
        <div class="add-row">
          <label class="add-f"><span>날짜 *</span><input type="date" class="a-date" value="${esc(v.date || '')}" required></label>
          <label class="add-f"><span>시간</span><input type="time" class="a-time" value="${esc(v.time || '')}"></label>
        </div>
        <div class="add-f"><span>누구</span><div class="chips a-mem">${['포레스텔라', ...ADD_MEM].map(m => `<button type="button" class="chip${(m === '포레스텔라' ? !mem.length : mem.includes(m)) ? ' on' : ''}" data-m="${m}">${m}</button>`).join('')}</div></div>
        <div class="add-row">
          <label class="add-f add-cat"><span>종류</span><select class="a-cat">${ADD_CATS.map(c => `<option${c === (v.cat || '공연') ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="add-f add-grow"><span>일정 이름 *</span><input type="text" class="a-title" value="${esc(v.title || '')}" placeholder="예) 불후의 명곡 녹화"></label>
        </div>
        ${quick ? '<details class="add-sl add-more-f"><summary>장소 · 영상 · 셋리 더 적기 (선택)</summary>' : ''}
        <label class="add-f"><span>장소</span><input type="text" class="a-place" value="${esc(v.place || '')}" placeholder="선택"></label>
        <label class="add-f"><span>관련 영상</span><input type="url" class="a-link" value="${esc(v.link || '')}" placeholder="유튜브 링크 (선택)"></label>
        <details class="add-sl"${v.songs ? ' open' : ''}><summary>셋리 적기 (선택)</summary><textarea class="a-songs" rows="5" placeholder="한 줄에 한 곡씩. 보랩·넬판 같은 줄임말도 알아들어요.">${esc(v.songs || '')}</textarea></details>${quick ? '</details>' : ''}
        <p class="a-dup"></p>
        <button type="button" class="link-btn a-del">이 칸 지우기</button>
      </div>`;
  }
  function addView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">일정 등록</h1>
      <p class="sub">빠진 일정을 알려주세요. 한 칸에 일정 하나씩이에요. 보내면 사이트에 '확인 필요'로 뜨고, 다른 두 분이 맞다고 하면 확정돼요. 반영되기까지 5~10분쯤 걸려요.</p>
      <div class="add-xl">
        <a class="bpill add-tpl" href="data/schedule_form.xlsx" download="숲별_일정등록_양식.xlsx">엑셀 양식 받기</a>
        <label class="bpill add-up">엑셀로 한 번에 올리기<input type="file" class="add-file" accept=".xlsx,.xls,.csv" hidden></label>
      </div>
      <p class="src-note add-xl-msg">여러 개는 엑셀 양식에 한 줄에 하나씩 채워서 올리면 아래 칸에 들어가요. 확인하고 보내 주세요.</p>
      <div class="add-list">${addCard({ date: qs.get('d') || '' })}</div>
      <button type="button" class="bpill add-more">＋ 일정 하나 더</button>
      <button type="button" class="bpill add-send">보내기</button>
      <p class="src-note add-msg"></p>`;
  }
  const addRead = c => {
    const mem = [...c.querySelectorAll('.a-mem .chip.on')].map(b => b.dataset.m).filter(m => m !== '포레스텔라');
    return { date: c.querySelector('.a-date').value, time: c.querySelector('.a-time').value, mem, cat: c.querySelector('.a-cat').value,
      title: c.querySelector('.a-title').value.trim(), place: c.querySelector('.a-place').value.trim(), link: c.querySelector('.a-link').value.trim(),
      songs: [...new Set(slParse(c.querySelector('.a-songs').value).map(n => slMatch(n) || n))] };
  };
  function addCheck(c) {
    const v = addRead(c), same = v.date && v.title && addSame(v.date, v.title);
    c.querySelector('.a-dup').innerHTML = same ? `이미 있는 일정 같아요: <a href="#/e/${encodeURIComponent(same.id)}">${esc(same.title)}</a>${v.songs.length ? ' · 적은 셋리는 이 일정에 붙어요.' : ''}` : '';
  }
  // 엑셀 도구는 필요할 때만 불러와요
  let xlsxP = null;
  const loadXlsx = () => xlsxP = xlsxP || new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'lib/xlsx.mini.min.js'; s.onload = () => ok(window.XLSX); s.onerror = no; document.head.appendChild(s); });
  function bindAdd(root = view) {
    const $ = sel => root.querySelector(sel);
    const list = $('.add-list');
    if (!list) return;
    list.addEventListener('click', ev => {
      const chip = ev.target.closest('.a-mem .chip');
      if (chip) {
        const box = chip.parentNode, all = chip.dataset.m === '포레스텔라';
        if (all) box.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === chip));
        else { chip.classList.toggle('on'); const any = box.querySelector('.chip.on:not([data-m="포레스텔라"])'); box.querySelector('[data-m="포레스텔라"]').classList.toggle('on', !any); }
      }
      const del = ev.target.closest('.a-del');
      if (del) { del.closest('.add-card').remove(); if (!list.children.length) list.insertAdjacentHTML('beforeend', addCard({}, root.matches && root.matches('.add-quick'))); }
    });
    list.addEventListener('input', ev => { const c = ev.target.closest('.add-card'); if (c && ev.target.matches('.a-date,.a-title,.a-songs')) addCheck(c); });
    list.addEventListener('change', ev => { const c = ev.target.closest('.add-card'); if (c) addCheck(c); });
    $('.add-more').onclick = () => {
      const last = list.lastElementChild, v = last ? addRead(last) : {};
      list.insertAdjacentHTML('beforeend', addCard({ date: v.date, cat: v.cat, mem: v.mem }, !!root.closest && root.matches('.add-quick')));
      list.lastElementChild.querySelector('.a-title').focus();
    };
    const xlMsg = $('.add-xl-msg');
    if ($('.add-tpl')) $('.add-tpl').onclick = () => { xlMsg.textContent = "예시 줄은 지우고 한 줄에 일정 하나씩 채워 주세요. 누구는 '포레스텔라' 또는 '두훈, 형호'처럼, 셋리는 곡 사이에 / 를 넣어요."; };
    if ($('.add-file')) $('.add-file').onchange = ev => {
      const file = ev.target.files[0];
      if (!file) return;
      xlMsg.textContent = '읽는 중…';
      Promise.all([loadXlsx(), file.arrayBuffer()]).then(([X, buf]) => {
        const wb = X.read(buf, { type: 'array', cellDates: true });
        const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true, defval: '' });
        // 엑셀 날짜·시간 칸은 날짜 값으로 와요
        const p2 = n => String(n).padStart(2, '0');
        const cell = v => v instanceof Date ? (v.getFullYear() < 1901 ? `${p2(v.getHours())}:${p2(v.getMinutes())}` : `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`) : String(v);
        const g = (r, k) => cell(r[Object.keys(r).find(x => x.replace(/\s/g, '').includes(k)) || ''] || '').trim();
        const cards = rows.map(r => {
          const d0 = g(r, '날짜'), us = d0.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          const date = window.DATA.normDate(us ? `${us[3].length === 2 ? '20' + us[3] : us[3]}-${p2(us[1])}-${p2(us[2])}` : d0.replace(/[./]\s*/g, '-').replace(/-$/, ''));
          const title = g(r, '일정');
          if (!date || !title || /^\(예시\)/.test(title)) return '';
          const who = g(r, '누구');
          const mem = /포레스텔라|전체/.test(who) ? [] : ADD_MEM.filter(m => who.includes(m));
          const cat = ADD_CATS.find(c => g(r, '종류').includes(c)) || (g(r, '종류') ? '기타' : '공연');
          const t = g(r, '시간').match(/(\d{1,2}):(\d\d)/);
          return addCard({ date, time: t ? t[1].padStart(2, '0') + ':' + t[2] : '', mem, cat, title, place: g(r, '장소'), link: g(r, '영상'), songs: g(r, '셋리').split(/\s*\/\s*|\n/).filter(Boolean).join('\n') });
        }).filter(Boolean);
        if (!cards.length) { xlMsg.textContent = '읽을 줄이 없어요. 날짜와 일정 이름이 있는지 확인해 주세요.'; return; }
        const first = list.firstElementChild;
        if (list.children.length === 1 && first && !addRead(first).title) first.remove();
        list.insertAdjacentHTML('beforeend', cards.join(''));
        list.querySelectorAll('.add-card').forEach(addCheck);
        xlMsg.textContent = `${cards.length}개를 넣었어요. 확인하고 아래 '보내기'를 눌러 주세요.`;
      }).catch(() => { xlMsg.textContent = '파일을 읽지 못했어요. 엑셀(.xlsx) 파일인지 확인해 주세요.'; });
      ev.target.value = '';
    };
    $('.add-send').onclick = async () => {
      const b = $('.add-send'), msg = $('.add-msg');
      const cards = [...list.querySelectorAll('.add-card')];
      const items = cards.map(addRead);
      const bad = items.findIndex(v => !v.date || !v.title);
      if (bad >= 0) { msg.textContent = `${bad + 1}번째 칸에 날짜와 일정 이름을 적어 주세요.`; cards[bad].scrollIntoView({ block: 'center' }); return; }
      const f = window.CONFIG.form;
      b.disabled = true;
      let sent = 0;
      for (const v of items) {
        b.textContent = `보내는 중… ${sent + 1}/${items.length}`;
        const body = new URLSearchParams({ [f.fields.content]: [`종류: 새일정`, `날짜: ${v.date}`, `시간: ${v.time}`, `누구: ${v.mem.length ? v.mem.join(', ') : '포레스텔라'}`, `분류: ${v.cat}`, `일정: ${v.title}`, `장소: ${v.place}`, `링크: ${v.link}`, `곡: ${v.songs.join(' / ')}`, `누가: ${myUid()}`].join('\n') });
        try { await fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body }); sent++; } catch (err) { break; }
      }
      if (sent === items.length) {
        b.textContent = '보냈어요 ✓';
        msg.textContent = `${sent}개를 보냈어요. 고마워요! 5~10분쯤 뒤 새로 열면 사이트에 '확인 필요'로 떠요.`;
        list.innerHTML = addCard({}, root.matches && root.matches('.add-quick')); setTimeout(() => { b.disabled = false; b.textContent = '보내기'; }, 3000);
      } else {
        cards.slice(0, sent).forEach(c => c.remove());
        b.disabled = false; b.textContent = '남은 것 다시 보내기';
        msg.textContent = `${sent}개는 보냈고 나머지는 못 보냈어요. 인터넷 연결을 확인하고 다시 눌러 주세요.`;
      }
    };
  }
  // 팬이 등록한 일정: 확인 필요 · n/2 와 '맞아요'
  function evState(e) {
    const f = e.fanEvent;
    if (!f) return '';
    const mine = f.by && f.by === myUid(), done = slOked('ev:' + e.id);
    const btn = !f.ok && !mine && !done ? `<button type="button" class="bpill ev-ok" data-id="${esc(e.id)}">맞아요</button>` : '';
    const msg = f.ok ? `팬 ${f.n}명이 확인한 일정이에요.` : mine ? '내가 등록한 일정이에요. 다른 두 분이 맞다고 하면 확정돼요.' : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.' : "팬이 등록한 일정이에요. 맞으면 '맞아요'를 눌러 주세요.";
    return `<div class="sl-state${f.ok ? ' ok' : ''}"><span class="src-badge">${f.ok ? '확정' : `확인 필요 · ${f.n}/2`}</span><span class="sl-state-msg">${msg}</span>${btn}</div>`;
  }
  const evPending = e => e.fanEvent && !e.fanEvent.ok ? ' <span class="new-tag">확인 필요</span>' : '';
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.ev-ok');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 일정확인\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => {
        try { const a = JSON.parse(localStorage.getItem(SL_OK) || '[]'); a.push('ev:' + e.id); localStorage.setItem(SL_OK, JSON.stringify(a.slice(-300))); } catch (err) { /* 괜찮아요 */ }
        b.closest('.sl-state').outerHTML = evState(e);
      })
      .catch(() => { b.disabled = false; b.textContent = '다시 누르기'; });
  });
  // 연표 같은 곳에서 화면을 안 옮기고 바로 적는 칸
  const addQuick = () => `<details class="add-quick"><summary class="bpill">＋ 일정 등록</summary>
      <div class="add-list">${addCard({}, true)}</div>
      <div class="add-acts"><button type="button" class="bpill add-more">＋ 하나 더</button><button type="button" class="bpill add-send">보내기</button></div>
      <p class="src-note add-msg">보내면 '확인 필요'로 뜨고, 반영까지 5~10분쯤 걸려요. <a href="#/add">엑셀로 여러 개 올리기 ›</a></p>
    </details>`;
  const addLink = (d, cls = '') => `<a class="bpill add-link${cls ? ' ' + cls : ''}" href="#/add${d ? '?d=' + d : ''}">＋ 일정 등록</a>`;

  // ---------- 의견 ----------
  // 사이트 안에서 바로 보내는 의견(제보 폼 '종류: 의견'). 의견 탭은 열 때마다 시트를 새로 받아요.
  // '처리했어요'는 관리자 기기(#/admin에서 만든 열쇠)로 서명한 것만 인정해요
  const OP_MINE = 'sb-op-mine', ADMIN_KEY = 'sb-admin-key';
  const opMine = () => { try { return JSON.parse(localStorage.getItem(OP_MINE) || '[]'); } catch (err) { return []; } };
  const adminJwk = () => { try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); } catch (err) { return null; } };
  const isAdmin = () => { const k = adminJwk(), c = window.CONFIG.adminKey; return !!(k && c && k.x === c.x && k.y === c.y); };
  const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' }, SIGN = { name: 'ECDSA', hash: 'SHA-256' };
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const opMsg = m => new TextEncoder().encode(`${m.id}:${m.state}:${m.n}`);
  let opData = null, opDone = new Map(), opLoading = null;
  async function verifyMarks(marks) {
    const c = window.CONFIG.adminKey, done = new Map();
    if (!c || !crypto.subtle) return done;
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: c.x, y: c.y, ext: true }, ECDSA, false, ['verify']);
    // 같은 의견에 여러 번 눌렀으면 번호가 가장 큰(가장 최근) 것만 봐요
    const last = new Map();
    for (const m of marks) {
      let ok = false;
      try { ok = await crypto.subtle.verify(SIGN, key, unb64u(m.sig), opMsg(m)); } catch (err) { ok = false; }
      if (ok && (!last.has(m.id) || Number(m.n) > Number(last.get(m.id).n))) last.set(m.id, m);
    }
    last.forEach((m, id) => { if (m.state === '처리') done.set(id, m); });
    return done;
  }
  function loadOpinions() {
    return opLoading = opLoading || window.DATA.fetchText(window.CONFIG.sheets.reports).then(async t => {
      opData = window.DATA.buildOpinions(t);
      opDone = await verifyMarks(opData.marks);
    }).catch(() => { opData = opData || { ops: [], marks: [] }; }).finally(() => { opLoading = null; });
  }
  const OP_CATS = ['정보 수정', '오류 신고', '기능 요청', '자유·응원'];
  // 읽음 표시: 의견 탭을 열 때 본 의견 번호를 이 기기에 저장해요
  const OP_SEEN = 'sb-op-seen';
  const opSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(OP_SEEN) || '[]')); } catch (err) { return new Set(); } };
  const opUnread = () => { const seen = opSeen(); return opData ? opData.ops.filter(o => !seen.has(o.id)) : []; };
  let opNewIds = null;  // 이번에 열었을 때 새로 본 의견 (다시 그려도 유지)
  const opQs = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const opFilter = () => opQs().get('f') || '';
  function opListHtml() {
    if (!opData) return '<p class="empty">의견 불러오는 중…</p>';
    // 내가 보낸 의견은 시트에 들어오기 전까지 '방금 보냄'으로 먼저 보여줘요 (같은 사람·같은 글이면 시트 것만)
    const me = myUid();
    const list = opMine().filter(o => !opData.ops.some(x => x.by === o.by && x.text === o.text)).reverse().map(o => ({ ...o, local: true })).concat(opData.ops.slice().reverse());
    const f = opFilter(), c = opQs().get('c') || '';
    const shown = list.filter(o => (!f || (f === 'done' ? opDone.has(o.id) : !opDone.has(o.id))) && (!c || (o.cat || '자유·응원') === c));
    const admin = isAdmin();
    const href = (ff, cc) => '#/opinion' + ((ff || cc) ? '?' + new URLSearchParams(Object.entries({ f: ff, c: cc }).filter(x => x[1])).toString() : '');
    const chip = (v, l) => `<a class="chip${f === v ? ' on' : ''}" href="${href(v, c)}">${l}</a>`;
    const cchip = (v, l) => `<a class="chip${c === v ? ' on' : ''}" href="${href(f, v)}">${l}</a>`;
    return `
      <div class="chips tl-cats">${chip('', `전체 ${list.length}`)}${chip('todo', `처리 전 ${list.filter(o => !opDone.has(o.id)).length}`)}${chip('done', `처리됨 ${list.filter(o => opDone.has(o.id)).length}`)}</div>
      <div class="chips tl-cats">${cchip('', '모든 분류')}${OP_CATS.map(x => cchip(x, x)).join('')}</div>
      ${shown.length ? shown.map((o, i) => `${!o.local && opNewIds && !opNewIds.has(o.id) && shown.slice(0, i).some(x => opNewIds.has(x.id)) && !shown.slice(0, i).some(x => !x.local && !opNewIds.has(x.id)) ? '<div class="op-read">여기까지 새 의견이에요 · 아래는 읽은 의견</div>' : ''}
        <div class="op-item${opDone.has(o.id) ? ' done' : ''}">
          <div class="op-head"><span class="op-who">${opNewIds && opNewIds.has(o.id) ? '<span class="op-new">N</span> ' : ''}<span class="new-tag op-cat">${esc(o.cat || '자유·응원')}</span> ${esc(o.name || '익명')}${o.by && o.by === me ? ' · 내 의견' : ''}</span><span class="op-time">${esc(o.local ? '방금 보냄 · 반영 중' : String(o.time).replace(/:\d\d$/, ''))}</span></div>
          ${o.ev ? (id => `<a class="op-ev" href="#/e/${encodeURIComponent(id)}">📅 ${esc(o.ev.replace(/^\[ID [^\]]+\]\s*/, ''))}</a>`)((o.ev.match(/\[ID ([^\]]+)\]/) || [])[1] || '') : ''}
          <p class="op-text">${esc(o.text)}</p>
          <div class="op-foot">${opDone.has(o.id) ? '<span class="op-done">✓ 처리했어요</span>' : '<span class="op-todo">확인 중</span>'}${admin && !o.local ? `<button type="button" class="link-btn op-mark" data-id="${esc(o.id)}" data-state="${opDone.has(o.id) ? '취소' : '처리'}">${opDone.has(o.id) ? '처리 취소' : '처리했어요'}</button>` : ''}</div>
        </div>`).join('') : '<p class="empty">아직 의견이 없어요.</p>'}`;
  }
  function opinionView() {
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">의견</h1>
      <p class="sub">사이트에 바라는 점, 틀린 곳, 고마운 말 무엇이든 남겨 주세요. 남긴 의견은 이 화면에 모두에게 보여요.</p>
      <div class="op-form">
        <div class="chips a-mem op-cats">${OP_CATS.map((x, i) => `<button type="button" class="chip${i === 3 ? ' on' : ''}" data-c="${x}">${x}</button>`).join('')}</div>
        <input type="text" class="op-name" maxlength="20" placeholder="닉네임 (선택)">
        <textarea class="op-in" rows="4" maxlength="1000" placeholder="의견을 적어 주세요"></textarea>
        <button type="button" class="bpill add-send op-send" disabled>보내기</button>
        <p class="src-note op-msg">보낸 의견은 내 화면엔 바로 보이고, 다른 분들 화면엔 5~10분쯤 뒤에 보여요.</p>
      </div>
      ${isAdmin() ? '<p class="src-note">관리자 기기예요. 의견마다 \'처리했어요\'를 누를 수 있어요.</p>' : ''}
      <div id="op-list">${opListHtml()}</div>`;
  }
  function bindOpinion() {
    const fill = () => { const box = document.getElementById('op-list'); if (box && currentRoute() === 'opinion') box.innerHTML = opListHtml(); };
    loadOpinions().then(() => {
      // 처음 그릴 때 안 읽은 것을 기억해 두고, 바로 읽음으로 저장해요 (다음에 열면 그 뒤에 온 것만 새 의견)
      if (opData && !opNewIds) { opNewIds = new Set(opUnread().map(o => o.id)); try { localStorage.setItem(OP_SEEN, JSON.stringify(opData.ops.map(o => o.id).slice(-1000))); } catch (err) { /* 괜찮아요 */ } }
      fill();
    });
    const t = view.querySelector('.op-in'), b = view.querySelector('.op-send');
    try { t.value = sessionStorage.getItem('sb-op-draft') || ''; } catch (err) { /* 괜찮아요 */ }
    b.disabled = !t.value.trim();
    t.addEventListener('input', () => { b.disabled = !t.value.trim(); try { sessionStorage.setItem('sb-op-draft', t.value); } catch (err) { /* 괜찮아요 */ } });
    b.onclick = () => {
      const text = t.value.trim(), name = view.querySelector('.op-name').value.trim(), cat = (view.querySelector('.op-cats .on') || {}).dataset.c || '자유·응원';
      if (!text) return;
      const f = window.CONFIG.form, by = myUid();
      const body = new URLSearchParams({ [f.fields.content]: `종류: 의견\n분류: ${cat}\n이름: ${name}\n누가: ${by}\n내용: ${text}` });
      b.disabled = true; b.textContent = '보내는 중…';
      fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body }).then(() => {
        // 시트에 들어간 시각을 몰라서, 시트에서 돌아오면 같은 글인지 글 내용으로 맞춰 봐요
        const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text, name, cat, by, at: Date.now() });
        try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); sessionStorage.removeItem('sb-op-draft'); } catch (err) { /* 괜찮아요 */ }
        t.value = ''; b.textContent = '보냈어요 ✓'; setTimeout(() => { b.textContent = '보내기'; }, 2500);
        view.querySelector('.op-msg').textContent = '고마워요! 다른 분들 화면엔 5~10분쯤 뒤에 보여요.';
        fill();
      }).catch(() => { b.disabled = false; b.textContent = '다시 보내기'; view.querySelector('.op-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; });
    };
    view.querySelector('.op-cats').addEventListener('click', ev => { const x = ev.target.closest('.chip'); if (x) view.querySelectorAll('.op-cats .chip').forEach(y => y.classList.toggle('on', y === x)); });
    view.addEventListener('click', async ev => {
      const m = ev.target.closest('.op-mark');
      if (!m || !isAdmin()) return;
      m.disabled = true; m.textContent = '보내는 중…';
      try {
        const key = await crypto.subtle.importKey('jwk', { ...adminJwk(), kty: 'EC', crv: 'P-256', ext: true }, ECDSA, false, ['sign']);
        const mark = { id: m.dataset.id, state: m.dataset.state, n: String(Date.now()) };
        mark.sig = b64u(await crypto.subtle.sign(SIGN, key, opMsg(mark)));
        const f = window.CONFIG.form;
        await fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ [f.fields.content]: `종류: 의견처리\n대상: ${mark.id}\n상태: ${mark.state}\n번호: ${mark.n}\n서명: ${mark.sig}` }) });
        if (mark.state === '처리') opDone.set(mark.id, mark); else opDone.delete(mark.id);
        fill();
      } catch (err) { m.disabled = false; m.textContent = '다시 누르기'; }
    });
  }
  // 관리자 기기 정하기: 이 기기 안에서 열쇠를 만들고, 공개 열쇠만 보여줘요
  function adminView() {
    const k = adminJwk(), c = window.CONFIG.adminKey;
    const pub = k ? JSON.stringify({ x: k.x, y: k.y }) : '';
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">관리자 기기</h1>
      ${!k ? `<p class="sub">이 기기를 관리자 기기로 정하면 의견에 '처리했어요'를 누를 수 있어요. 열쇠는 이 기기 안에만 저장돼요.</p>
        <button type="button" class="bpill add-send" id="admin-make">이 기기를 관리자 기기로</button>`
      : isAdmin() ? `<p class="sub">이 기기는 관리자 기기예요. <a href="#/opinion">의견 탭</a>에서 처리 표시를 할 수 있어요.</p>`
      : `<p class="sub">아래 확인용 번호를 복사해서 보내 주세요. 사이트에 넣으면 이 기기가 관리자 기기가 돼요.</p>
        <textarea class="op-in" rows="4" readonly>${esc(pub)}</textarea>
        <button type="button" class="bpill" data-copy="${esc(pub)}">복사</button>${c ? '<p class="src-note">지금 사이트에 들어 있는 번호와 달라요. 다른 기기가 관리자 기기로 정해져 있어요.</p>' : ''}`}`;
  }
  function bindAdmin() {
    const b = document.getElementById('admin-make');
    if (b) b.onclick = async () => {
      try {
        const kp = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
        const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
        localStorage.setItem(ADMIN_KEY, JSON.stringify({ d: j.d, x: j.x, y: j.y }));
        renderBase('admin');
      } catch (err) { b.textContent = '만들지 못했어요. 다시 눌러 주세요.'; }
    };
  }
  // 일정 상세에서 바로 '틀린 곳 알려주기' (의견 · 정보 수정으로 들어가요)
  const fixBox = e => `<details class="fix-box"><summary>✏️ 틀린 곳 알려주기</summary><div class="op-form">
      <textarea class="op-in fix-in" rows="3" maxlength="1000" placeholder="예) 날짜가 03.15예요 / 이 곡은 안 불렀어요"></textarea>
      <button type="button" class="bpill add-send fix-send" data-id="${esc(e.id)}">보내기</button>
      <p class="src-note fix-msg">의견 탭에 '정보 수정'으로 올라가요. 반영까지 5~10분쯤 걸려요.</p></div></details>`;
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.fix-send');
    if (!b) return;
    const box = b.closest('.op-form'), t = box.querySelector('.fix-in'), text = t.value.trim();
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!text || !e) return;
    const f = window.CONFIG.form, by = myUid();
    const body = new URLSearchParams({ [f.fields.content]: `종류: 의견\n분류: 정보 수정\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n이름: \n누가: ${by}\n내용: ${text}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body }).then(() => {
      const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text, name: '', cat: '정보 수정', ev: `[ID ${e.id}] ${e.title}`, by, at: Date.now() });
      try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); } catch (err) { /* 괜찮아요 */ }
      t.value = ''; b.textContent = '보냈어요 ✓';
      box.querySelector('.fix-msg').innerHTML = '고마워요! <a href="#/opinion">의견 탭</a>에서 처리됐는지 볼 수 있어요.';
    }).catch(() => { b.disabled = false; b.textContent = '다시 보내기'; });
  });
  const opBtn = () => `<a class="op-fab" href="#/opinion">💬 의견 남기기</a>`;

  // ---------- 공식 X 모아보기 ----------
  const X_CATS = ['일정 후기', '일정 현장', '비하인드·직캠', '사진·일상', '영상', '음반·컴백', '공지·안내', '기사', '생일', '투표·이벤트'];
  const X_MEMBERS = ['배두훈', '강형호', '조민규', '고우림'];
  let xQuery = '';
  // 공식 X 새 글 링크 올리기: 제보 폼에 "종류: 공식X" 줄로 보내고, 이 기기엔 바로 보여줘요.
  // 다른 사람 화면엔 자동 작업(x-sync)이 공식 계정 글인지 확인한 뒤에 떠요.
  const X_ADD = 'sb-x-added';
  const xAdded = () => { try { return JSON.parse(localStorage.getItem(X_ADD) || '[]'); } catch (err) { return []; } };
  const xIdOf = u => ((u || '').match(/(?:x|twitter)\.com\/official_fore\/status(?:es)?\/(\d{15,20})/i) || [])[1];
  const xIdDate = id => { try { return new Date(Number(BigInt(id) >> 22n) + 1288834974657 + 9 * 3600e3).toISOString().slice(0, 10); } catch (e) { return ''; } };
  function sendXLink(id) {
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 공식X\n날짜: ${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)}\n링크: https://x.com/official_fore/status/${id}` });
    return fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body });
  }
  function xfeedView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const rel = qs.get('rel') || '';
    const st = { cat: multiOf(qs, 'cat'), m: multiOf(qs, 'm'), y: multiOf(qs, 'y') };
    if (qs.has('q')) xQuery = qs.get('q');  // 통합 검색에서 넘어온 검색어
    let n = 0;
    const fill = () => {
      const box = document.getElementById('xfeed');
      if (!box) return;
      const qm = rel ? null : matcher(xQuery);
      const have = new Set((data.xFeed || []).map(p => p.id));
      const mine = rel ? [] : xAdded().filter(id => !have.has(id)).map(id => ({ id, url: 'https://x.com/official_fore/status/' + id, date: xIdDate(id), cat: '내가 올린 링크', m: [], text: '눌러서 X에서 보기 · 내용은 확인되면 채워져요', raw: '', img: '', imgs: [] }));
      let list = mine.concat(data.xFeed || []).filter(p => p.cat === '내가 올린 링크' || (rel || ((!st.cat.length || st.cat.includes(p.cat)) && (!st.m.length || st.m.some(m => p.m.includes(m))) && (!st.y.length || st.y.includes(p.date.slice(0, 4))))) && (!rel || p.rel === rel) && (!qm || qm(p.raw)));
      if (rel) list = list.slice().reverse();  // 음반 이야기는 처음부터 순서대로
      const card = p => xGroup(p, xLinks(p) ? `<div class="x-wrap">${card0(p)}${xLinks(p)}</div>` : card0(p));
      const card0 = p => `
          <a class="x-card${p.img ? '' : ' no-img'}" href="${esc(p.url)}" target="_blank" rel="noopener">
            ${p.img ? `<img src="${esc(p.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <span class="x-text"><span class="x-date">${esc(p.date.replace(/-/g, '.'))} · ${esc(p.cat)}</span>${esc(p.text || '(글 없음)')}</span>
          </a>`;
      if (!list.length) { box.innerHTML = `<p class="empty">${data.xPending ? '공식 X 글 불러오는 중…' : rel ? '이 음반에 묶인 공식 X 글이 없어요.' : '해당하는 글이 없어요.'}</p>`; return; }
      const pics = list.reduce((s, p) => s + ((p.imgs || []).length || (p.img ? 1 : 0)), 0);
      const label = `${list.length.toLocaleString()}개${pics ? ` · 사진 ${pics.toLocaleString()}장` : ''}`;
      const cnt = document.getElementById('xcount'); if (cnt) cnt.textContent = label;
      box.innerHTML = `${rel ? `<p class="sub">${label}</p>` : ''}<div class="stack x-list"></div><button type="button" class="more-btn">더 보기</button>`;
      const more = () => {
        box.querySelector('.x-list').insertAdjacentHTML('beforeend', list.slice(n, n + 40).map(card).join(''));
        n += 40;
        box.querySelector('.more-btn').hidden = n >= list.length;
      };
      box.querySelector('.more-btn').onclick = more;
      more();
    };
    setTimeout(() => {
      fill();
      // 공식 X 글 찾기: 입력이 멈추면 목록만 다시 채워요
      const q = document.getElementById('xq');
      let timer;
      if (q) q.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { xQuery = q.value; n = 0; fill(); }, 200); };
      const add = document.getElementById('x-add-form');
      // 링크를 붙여넣기만 해도 바로 올려요
      const addInp = document.getElementById('x-add-url');
      if (addInp) addInp.oninput = () => { if (xIdOf(addInp.value)) add.requestSubmit(); };
      if (add) add.onsubmit = ev => {
        ev.preventDefault();
        const inp = document.getElementById('x-add-url'), msg = document.getElementById('x-add-msg');
        const id = xIdOf(inp.value);
        if (!id) { msg.textContent = '포레스텔라 공식 X(@official_fore) 글 링크를 넣어 주세요.'; return; }
        if ((data.xFeed || []).some(p => p.id === id)) { msg.textContent = '이미 있는 글이에요.'; return; }
        msg.textContent = '올리는 중…';
        sendXLink(id).then(() => {
          try { localStorage.setItem(X_ADD, JSON.stringify([id, ...xAdded().filter(x => x !== id)].slice(0, 50))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
          inp.value = ''; msg.textContent = '올렸어요! 다른 분들 화면에는 잠시 뒤에 보여요.'; n = 0; fill();
        }).catch(() => { msg.textContent = '못 올렸어요. 인터넷 연결을 확인해 주세요.'; });
      };
    });
    return `
      ${rel ? albumHead(rel, qs.get('am')) + '<hr class="divider"><div class="view-row">' + albumBtn() + '</div>' + paneTabs([
        { label: '수록곡', html: albumTracks(rel, qs.get('am')) },
        { label: '유튜브', n: (data.official || []).filter(v => v.rel === rel).length, html: ytList((data.official || []).filter(v => v.rel === rel)) },
        { label: '공식 X', n: (data.xFeed || []).filter(p => p.rel === rel).length, html: '<div id="xfeed"><p class="empty">불러오는 중…</p></div>' },
      ]) : ''}
      ${rel ? '' : `<h1 class="h1 page-title">공식 X 모아보기${help('포레스텔라 공식 X(@official_fore)에 올라온 글을 모았어요. 새 글은 하루 두 번 자동으로 가져오고, 링크를 붙여 넣으면 15분 안에 올라와요. 종류는 글 내용으로 자동 분류해서 가끔 틀릴 수 있어요.')}</h1>
      <details class="x-add"><summary>＋ 새 글 링크 붙여넣기</summary>
        <form id="x-add-form" class="x-add-form"><input id="x-add-url" type="url" inputmode="url" placeholder="https://x.com/official_fore/status/…" aria-label="공식 X 글 링크" autocomplete="off"><button type="submit" class="chip">올리기</button></form>
        <p class="x-add-msg sub" id="x-add-msg"></p>
      </details>
      <div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="xq" aria-label="공식 X 글 찾기" placeholder="공식 X 글 찾기 · 초성 OK" value="${esc(xQuery)}" autocomplete="off">
      </form>
      ${multiChips('#/xfeed', st, 'cat', X_CATS, '종류 전체')}
      ${multiChips('#/xfeed', st, 'y', [...new Set((data.xFeed || []).map(p => p.date.slice(0, 4)))].sort().reverse(), '연도 전체')}
      ${multiChips('#/xfeed', st, 'm', X_MEMBERS, '멤버 전체', m => m.slice(1))}
      <div class="view-row"><p class="sub" id="xcount"></p>${chipsBtn()}${albumBtn()}</div>
      </div>
      <div id="xfeed"><p class="empty">불러오는 중…</p></div>`}`;
  }

  // 같은 이름 음반이 멤버마다 있을 수 있어서(팬텀싱어 올스타전 등) 멤버도 주소에 넣어요
  const albHref = a => '#/xfeed?rel=' + encodeURIComponent(a.rel || a.name) + (a.member ? '&am=' + encodeURIComponent(a.member) : '');
  const albumOf = (rel, am) => { const all = (data.albums || []).filter(x => (x.rel || x.name) === rel); return all.find(x => (x.member || '') === (am || '')) || all[0]; };
  function albumHead(rel, am) {
    const a = albumOf(rel, am);
    if (!a) return `<a class="back" href="#/releases">‹ 음반 이야기</a><h1 class="h1 page-title">${esc(rel)}</h1><p class="sub">티저부터 발매·이벤트까지 공식 X 글을 순서대로 모았어요.</p>`;
    // 같은 가수(그룹/멤버) 음반 안에서 이전·다음
    const same = data.albums.filter(x => (x.member || '') === (a.member || '')).sort((x, y) => (x.date < y.date ? -1 : 1));
    const k = same.indexOf(a), prev = same[k - 1], next = same[k + 1];
    const go = (x, label) => x ? `<a href="${albHref(x)}"><span>${label}</span><b>${esc(x.name)}</b></a>` : '<span></span>';
    const SRC = [[/namu/, '나무위키'], [/wikipedia/, '위키백과'], [/melon/, '멜론'], [/genie/, '지니'], [/bugs/, '벅스'], [/apple/, '애플뮤직'], [/spotify/, '스포티파이'], [/vibe|naver/, '네이버'], [/youtu/, '유튜브'], [/x\.com|twitter/, '공식 X'], [/daum/, '다음']];
    const host = u => { let h = ''; try { h = new URL(u).hostname; } catch (e) { /* 넘어가요 */ } return (SRC.find(([rx]) => rx.test(h)) || [])[1] || '기사'; };
    return `<a class="back" href="#/releases${a.member ? '?m=' + encodeURIComponent(a.member) : ''}">‹ 음반 이야기</a>
      <section class="album-head ah2">
        <div class="ah-top">
          ${a.img ? `<img class="ah-img" src="${esc(imgSize(a.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
          <div class="ah-info">
            <h1 class="h1">${esc(a.name)}${unsure(a.unsure)}</h1>
            <p class="sub">${a.member ? esc(a.member) + ' · ' : ''}${esc(a.date.replace(/-/g, '.'))}<br>${esc(a.kind)}${a.ok ? '' : ' · <span class="tag">확인 중</span>'}</p>
          </div>
        </div>
        <dl class="ah-facts">
          ${a.title ? `<dt>타이틀</dt><dd>${esc(a.title)}</dd>` : ''}
          ${a.credit ? `<dt>작사·작곡</dt><dd>${esc(a.credit)}</dd>` : ''}
          ${a.label ? `<dt>기획·유통</dt><dd>${esc(a.label)}</dd>` : ''}
        </dl>
        ${a.note ? `<p class="ah-note">${esc(a.note)}</p>` : ''}
        ${a.src.length ? `<p class="src-note">정보 출처: ${a.src.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))} ↗</a>`).join(' · ')}</p>` : ''}
        <nav class="ah-nav">${go(prev, '‹ 이전 음반')}${go(next, '다음 음반 ›')}</nav>
      </section>`;
  }

  function albumTracks(rel, am) {
    const a = albumOf(rel, am);
    if (!a || !a.tracks.length) return '';
    return `<ol class="setlist-list">${a.tracks.map(t => {
          const so = data.songs.get(window.DATA.songKey(t));
          const isTitle = a.title && a.title.split(/[,/]/).some(x => x.trim() && window.DATA.songKey(x) === window.DATA.songKey(t));
          return `<li><span class="sl-title">${so ? `<a${so.events.length ? '' : ' class="plain"'} href="#/song/${encodeURIComponent(so.key)}">${esc(t)}</a>` : esc(t)}</span>${isTitle ? '<span class="sl-note">타이틀</span>' : ''}<a class="sl-yt sl-find" href="https://www.youtube.com/results?search_query=${encodeURIComponent((a.member || '포레스텔라') + ' ' + t)}" target="_blank" rel="noopener" aria-label="${esc(t)} 유튜브에서 검색">${YT_FIND}</a></li>`;
        }).join('')}</ol>`;
  }

  let relItems = [];
  function releasesView() {
    const who = new URLSearchParams(location.hash.split('?')[1] || '').get('m') || '';
    const map = new Map();
    (data.xFeed || []).forEach(p => { if (p.rel) { if (!map.has(p.rel)) map.set(p.rel, []); map.get(p.rel).push(p); } });
    // 시트 "음반 정보"가 있으면 그 순서대로, 없으면 공식 X 글로 묶은 것만
    const items = data.albums && data.albums.length
      ? data.albums.filter(a => (a.member || '') === who).map(a => { const ps = map.get(a.rel) || []; return { key: a.rel || a.name, href: albHref(a), name: a.name, sub: `${a.date.replace(/-/g, '.')} · ${a.kind}`, date: a.date, tn: (a.tracks || []).length, tr: a.tracks || [], img: a.img || (ps.find(p => p.img) || {}).img, n: ps.length }; })
      : [...map.entries()].map(([name, ps]) => ({ key: name, name, sub: `${ps[ps.length - 1].date.replace(/-/g, '.')}부터`, img: (ps.find(p => p.img) || {}).img, n: ps.length, d: ps[ps.length - 1].date }))
        .sort((a, b) => (a.d < b.d ? 1 : -1));
    // 연도별로 묶어 표지 2칸 바둑판
    relItems = items;
    const byYear = new Map();
    items.forEach(r => { const y = (r.sub.match(/^\d{4}/) || ['기타'])[0]; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(r); });
    const kindOf = r => (r.sub.split(' · ')[1] || '').replace(/\s*\(.*\)/, '');
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">음반 이야기${help('앨범 정보는 음원 사이트·위키·기사에서 두 곳 이상 맞는 것만 적었어요. 공식 X 글은 앨범·싱글별로 묶었어요.')}</h1>
      ${(data.albums || []).some(a => a.member) ? `<div class="chips tl-cats">${['', ...MEMBER_LIST.filter(m => data.albums.some(a => a.member === m))].map(m => `<a class="chip${m === who ? ' on' : ''}" href="#/releases${m ? '?m=' + encodeURIComponent(m) : ''}">${m || '포레스텔라'}</a>`).join('')}</div>` : ''}
      ${items.some(r => r.date) ? `<div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="rel-q" aria-label="음반 찾기" placeholder="앨범·수록곡 찾기 · 초성 OK" autocomplete="off">
      </form>
      <p class="sub" id="rel-count">${relCount(items)}</p>
      </div>` : ''}
      ${[...byYear.entries()].map(([y, rs]) => `
        <section class="rel-sec">
        <h2 class="rel-year">${y}</h2>
        <div class="rel-grid">${rs.map(r => `
          <a class="rel-tile" data-i="${items.indexOf(r)}" data-n="${esc(norm(r.name + ' ' + (r.tr || []).join(' ')))}" data-c="${esc(chosung(r.name + ' ' + (r.tr || []).join(' ')))}" href="${r.href || '#/xfeed?rel=' + encodeURIComponent(r.key)}">
            <span class="rel-cover">${r.img ? `<img src="${esc(imgSize(r.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
            <b>${esc(r.name)}</b>
            <span class="rel-sub">${r.date ? esc([kindOf(r), r.tn && r.tn + '곡'].filter(Boolean).join(' · ')) : esc(r.sub) + (r.n ? ` · X ${r.n}` : '')}</span>
          </a>`).join('')}</div>
        </section>`).join('')}`;
  }
  // 앨범 수 · 곡 수 (같은 곡·Inst. 버전은 한 번만 세요)
  const relSong = t => norm(t.replace(/\s*[\(\[](inst\.?|instrumental|mr|piano ver\.?|remaster ver\.?)[\)\]]/gi, ''));
  const relCount = rs => `앨범 ${rs.length}장 · ${new Set(rs.flatMap(r => (r.tr || []).filter(t => !/^\s*$/.test(t)).map(relSong))).size}곡`;
  function bindReleases() {
    const q = document.getElementById('rel-q');
    if (!q) return;
    const tiles = [...document.querySelectorAll('.rel-tile')];
    const all = tiles.map(a => relItems[+a.dataset.i]);
    q.oninput = () => {
      const v = norm(q.value), c = q.value.replace(/\s/g, ''), alt = aliasOf(q.value), na = alt && norm(alt);
      tiles.forEach(a => { a.hidden = !!v && (isChosungOnly(c) ? !a.dataset.c.includes(c) : !a.dataset.n.includes(v) && !(na && a.dataset.n.includes(na))); });
      document.querySelectorAll('.rel-sec').forEach(sec => { sec.hidden = ![...sec.querySelectorAll('.rel-tile')].some(a => !a.hidden); });
      document.getElementById('rel-count').textContent = relCount(all.filter((r, i) => !tiles[i].hidden));
    };
  }


  // 멤버 단독 공연(활동 이력)을 콘서트 정보와 같은 모양으로: 콘서트 페이지(#/tour/solo-…)로 열려요
  const SOLO_SHORT = { 배두훈: '두훈', 강형호: '형호', 조민규: '민규', 고우림: '우림' };
  let soloCache = null;
  function soloInfos() {
    if (soloCache && soloCache.d === data) return soloCache.list;
    const list = (data.career || []).filter(c => c.type === '공연' && /단독/.test(c.note || '')).map(c => {
      const [a, b] = c.date.split('~'), to = b || a;
      const evs = a.length === 10 ? data.events.filter(e => e.date >= a && e.date <= to && (e.title.includes('[' + SOLO_SHORT[c.member] + ']') || e.title.includes(c.member))) : [];
      const days = a.length === 10 ? (b && b !== a ? `${a}~${b.slice(5)}` : a) : '';
      return { id: 'solo-' + (c.member === '배두훈' ? 'dh' : c.member === '강형호' ? 'hh' : c.member === '조민규' ? 'mk' : 'wr') + '-' + a.replace(/-/g, ''), solo: true, member: c.member, name: c.title, note: c.note,
        from: a.length === 10 ? a : '', to: a.length === 10 ? to : '', year: a.slice(0, 4), count: c.shows ? String(c.shows) : evs.length > 1 ? String(evs.length) : '', org: '',  // shows: 하루 낮공·밤공처럼 일정 수보다 회차가 많을 때
        shows: days ? [`${days} ${c.where || (evs.find(e => e.place) || {}).place || ''}`.trim()] : [], facts: [], img: c.poster || '', src: [], ok: true, evs };
    });
    soloCache = { d: data, list };
    return list;
  }
  // 포스터 위 작은 표시: 팬이 올린 셋리가 있으면 '확인 필요 n/2' 또는 '셋리스트'(확정)
  function fanPill(evs) {
    const fs = [...new Set((evs || []).map(e => e.fanSet).filter(Boolean))];
    if (!fs.length) return '';
    const open = fs.filter(f => !f.ok);
    return open.length ? `<span class="con-set con-check">확인 필요 ${Math.min(...open.map(f => f.n))}/2</span>` : '<span class="con-set">셋리스트</span>';
  }
  function concertsView() {
    // 포레스텔라 공연(시트 "콘서트 정보")과 멤버 단독 공연(활동 이력)을 포스터 카드로, 해마다 묶어 보여줘요
    const FULL = { 배두훈: '두훈', 강형호: '형호', 조민규: '민규', 고우림: '우림' };
    const cover = (img, ph, badge, extra) => `<span class="solo-cover"><span class="con-ph" aria-hidden="true">♪</span>${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${badge ? `<span class="solo-badge">${esc(badge)}</span>` : ''}${extra || ''}</span>`;
    // 카드 제목은 짧게: 연도·'포레스텔라'·'PITTA 강형호 콘서트' 같은 앞말은 빼요
    const short = n => n.replace(/^[\d-]+\s+/, '').replace(/^포레스텔라\s+/, '').replace(/^(PITTA 강형호 콘서트|배두훈 팬미팅|조민규 단독 콘서트)\s*:?\s*/, '') || n;
    const items = [];
    (data.concerts || []).forEach(c => {
      const sub = [concertRange(c), /^\d+$/.test(c.count || '') ? `${c.count}회` : ''].filter(Boolean).join(' · ');
      const img = c.img ? imgSize(c.img, 'small') : tourPic(c.tour);
      const seen = !!c.from && data.events.some(e => e.category === '공연' && e.date >= c.from && e.date <= (c.to || c.from) && !/^\[/.test(e.title) && boxHas('w', e.id));
      items.push({ m: '', date: c.from || '', r: /^\d+$/.test(c.count || '') ? Number(c.count) : concertEvents(c).length, html: `<a class="solo-card" data-m="" href="#/tour/${encodeURIComponent(c.id)}">${cover(img, c.name, '', (c.tour ? '<span class="con-set">셋리스트</span>' : fanPill(concertEvents(c))) + (seen ? '<span class="solo-seen">🎫</span>' : ''))}<b>${esc(short(c.name))}</b><span class="rel-sub">${nw(sub)}</span></a>` });
    });
    if (!items.length) data.tours.forEach(t => items.push({ m: '', date: (t.dates || [''])[0] || '', html: `<a class="solo-card" data-m="" href="#/tour/${encodeURIComponent(t.id)}">${cover(tourPic(t), t.name, '', '')}<b>${esc(t.name)}</b><span class="rel-sub">${nw(tourRange(t))}</span></a>` }));
    soloInfos().forEach(c => {
      const when = c.from ? concertRange(c) : c.year + '년';
      const seen = c.evs.some(e => boxHas('w', e.id));
      const sub = [when, c.count ? `${c.count}회` : ''].filter(Boolean).join(' · ');
      items.push({ m: c.member, date: c.from || c.year, r: Number(c.count) || c.evs.length || 1, html: `<a class="solo-card" data-m="${esc(c.member)}" href="#/tour/${encodeURIComponent(c.id)}">${cover(c.img, c.name, FULL[c.member], fanPill(c.evs) + (seen ? '<span class="solo-seen">🎫</span>' : ''))}<b>${esc(short(c.name))}</b><span class="rel-sub">${nw(sub)}</span></a>` });
    });
    items.sort((x, y) => y.date.localeCompare(x.date));
    const years = [...new Set(items.map(x => x.date.slice(0, 4)))];
    const tabs = ['', ...Object.keys(FULL).filter(m => items.some(x => x.m === m))];
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">콘서트${help('포레스텔라 콘서트·투어와 멤버 단독 콘서트·팬미팅이에요. 공연 정보는 예매처·기사·위키 중 두 곳 이상 맞는 것만 적었어요. 셋리스트는 나무위키·setlist.fm·뉴스 기사를 모았어요. 틀린 곳이 있으면 제보해 주세요.')}</h1>
      <div class="chips solo-tabs">${tabs.map(m => `<button type="button" class="chip" data-m="${esc(m)}">${m ? esc(FULL[m]) : '포레스텔라'} <b>${items.filter(x => x.m === m).length}</b></button>`).join('')}</div>
      ${tabs.map(m => { const l = items.filter(x => x.m === m); return `<p class="con-sum" data-m="${esc(m)}" hidden>${l.length}건 · 총 회차 ${l.reduce((a, x) => a + (x.r || 0), 0)}회</p>`; }).join('')}
      ${years.map(y => `<section class="con-year"><h2 class="con-y">${y}</h2><div class="solo-grid">${items.filter(x => x.date.slice(0, 4) === y).map(x => x.html).join('')}</div></section>`).join('')}`;
  }
  function bindSolo() {
    const tabs = document.querySelectorAll('.solo-tabs .chip');
    const pick = m => {
      tabs.forEach(x => x.classList.toggle('on', x.dataset.m === m));
      document.querySelectorAll('.solo-card').forEach(c => { c.hidden = c.dataset.m !== m; });
      document.querySelectorAll('.con-year').forEach(s => { s.hidden = !s.querySelector('.solo-card:not([hidden])'); });
      document.querySelectorAll('.con-sum').forEach(p => { p.hidden = p.dataset.m !== m; });
      try { sessionStorage.setItem('sb-con-tab', m); } catch (e) {}
    };
    tabs.forEach(t => t.onclick = () => pick(t.dataset.m));
    let m = ''; try { m = sessionStorage.getItem('sb-con-tab') || ''; } catch (e) {}
    pick([...tabs].some(t => t.dataset.m === m) ? m : '');
  }

  // X 사진만 크기를 골라 받을 수 있어요. 다른 곳 사진은 주소 그대로 써요.
  // ' · '로 나뉜 조각은 줄바꿈 때 쪼개지지 않게
  const nw = t => t.split(' · ').map((x, i, all) => `<span class="nw">${esc(x)}${i < all.length - 1 ? ' ·' : ''}</span>`).join(' ');
  function imgSize(u, size) { return /pbs\.twimg\.com/.test(u) ? `${u}?name=${size}` : u; }

  // 포스터가 없는 공연은 그 투어 무대 영상 썸네일로
  function tourPic(t) {
    const e = t && t.events.slice().reverse().find(x => x.videoId || x.related.length);
    const vid = e && (e.videoId || e.related[0].videoId);
    return vid ? `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg` : '';
  }

  const concertRange = c => {
    const a = c.from, b = c.to;
    if (!a) return '';
    return a === b ? fmtDate(a, false) : `${fmtDate(a, false)} ~ ${a.slice(0, 4) === b.slice(0, 4) ? b.slice(5).replace('-', '.') : fmtDate(b, false)}`;
  };

  // 콘서트 정보 (시트): 포스터, 기간·회차·주최, 공연 일정, 특징, 출처
  function concertInfo(c, short) {
    return `
      ${c.img && !short ? `<a href="${esc(c.imgPost || c.img)}" target="_blank" rel="noopener"><img class="album-img" src="${esc(imgSize(c.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>` : ''}
      <div class="facts">
        ${short ? '' : `<div class="fact"><b>기간</b><span>${esc(concertRange(c))}${c.ok ? '' : ' <span class="tag">확인 중</span>'}</span></div>`}
        ${c.count ? `<div class="fact"><b>회차</b><span>${esc(/^\d+$/.test(c.count) ? c.count + '회' : c.count)}</span></div>` : ''}
        ${c.org && c.org !== '확인 중' ? `<div class="fact"><b>주최·기획</b><span>${esc(c.org)}</span></div>` : ''}
      </div>
      ${c.shows.length && !short ? `<h2 class="h3 list-title">공연 일정</h2><ul class="track-list show-list">${c.shows.map(x => `<li>${esc(x.replace(/^(\d{4})-(\d\d)-(\d\d)/, '$1.$2.$3').replace(/~(\d\d)-(\d\d)/, '~$1.$2'))}</li>`).join('')}</ul>` : ''}
      ${c.facts.length ? `<h2 class="h3 list-title">이런 공연이었어요</h2><ul class="track-list fact-list">${c.facts.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${c.src.length ? `<p class="src-note">출처: ${c.src.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${i + 1}</a>`).join(' · ')}</p>` : ''}`;
  }

  function tourSetlist(t) {
    return `
      ${setlistSections(t.songs).map((sec, i) => `
        ${i ? '<hr class="divider">' : ''}
        ${sec.name ? `<h2 class="h3 list-title">${sec.name}</h2>` : ''}
        <ol class="setlist-list" start="${sec.items[0].n}">
          ${sec.items.map(s => { const v = tourVideo(t, s.t); return `<li${v ? ' class="sl-has"' : ''}><span class="sl-title">${setlistSong(s.t)}</span>${s.note ? `<span class="sl-note">${esc(s.note)}</span>` : ''}<a class="sl-yt${v ? '' : ' sl-find'}" href="${v ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent('포레스텔라 ' + window.DATA.setlistName(s.t.split(' / ')[0]) + ' ' + t.name.replace(/^[\d-]+\s*/, ''))}`}" target="_blank" rel="noopener" aria-label="${esc(s.t)} ${v ? '공식 영상 보기' : '유튜브에서 검색'}">${v ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" class="fill"/></svg>' : YT_FIND}</a></li>`; }).join('')}
        </ol>`).join('')}`;
  }
  // 셋리스트 곡의 이 콘서트 공식 영상 (제목에 곡 이름 + 콘서트 이름)
  function tourVideo(t, title) {
    for (const part of title.split(' / ')) {
      const so = data.songs.get(window.DATA.songKey(window.DATA.setlistName(part)));
      const v = so && (so.official || []).find(x => x.tour === t.id);
      if (v) return v;
    }
    return null;
  }

  const tourX = id => (data.xFeed || []).filter(p => p.tour === id);
  // 콘서트 정보의 공연 일정("날짜 도시 공연장")을 한 줄씩. 그날 일정이 있으면 날짜를 그 일정으로 이어요.
  // 공연 장소가 많으면 앞 5줄만 보이고 나머지는 '전체 일정 보기'로 펼쳐요
  const foldShows = html => {
    const rows = html.split(/(?=<div class="tour-show">)/).filter(Boolean);
    if (rows.length <= 6) return html;
    return rows.slice(0, 5).join('') + `<details class="tour-more"><summary>전체 일정 보기 (${rows.length}곳)</summary>${rows.slice(5).join('')}</details>`;
  };
  // 콘서트 기간 안의 포레스텔라 공연 일정 ([멤버] 표시 일정은 빼요)
  const concertEvents = c => c.from ? data.events.filter(e => e.category === '공연' && e.date >= c.from && e.date <= (c.to || c.from) && !/^\[/.test(e.title)) : [];
  function infoShows(info, events) {
    const rows = new Map();  // 같은 장소는 한 줄로
    info.shows.forEach(x => {
      const m = x.match(/^(\d{4})-(\d\d)-(\d\d)(?:~(?:(\d\d)-)?(\d\d))?\s*(.*)$/);
      if (!m) { rows.set(x, { place: x, days: [] }); return; }
      const first = `${m[1]}-${m[2]}-${m[3]}`;
      const days = [first];
      if (m[5]) { const end = `${m[1]}-${m[4] || m[2]}-${m[5]}`; let d = new Date(first + 'T00:00:00Z'); while ((d = new Date(d.getTime() + 864e5)).toISOString().slice(0, 10) <= end) days.push(d.toISOString().slice(0, 10)); }
      const place = m[6] || '장소 확인 중';
      const key = place === '확인 중' || place === '장소 확인 중' ? x : place.replace(/\s+/g, '');
      if (!rows.has(key)) rows.set(key, { place, days: [] });
      rows.get(key).days.push(...days);
    });
    return [...rows.values()].map(({ place, days }) => `<div class="tour-show"><span class="tour-place">${esc(place)}</span><span class="ev-days">${days.map(dd => { const es = events.filter(x => x.date === dd); const lab = dd.slice(5).replace('-', '.'); return es.length ? es.map(e => `<a class="ev-day${boxHas('w', e.id) ? ' went' : ''}" href="#/e/${encodeURIComponent(e.id)}">${boxHas('w', e.id) ? '🎫 ' : ''}${lab}${showTag(e)}</a>`).join('') : `<span class="ev-day">${lab}</span>`; }).join('')}</span></div>`).join('');
  }

  function tourView() {
    const id = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0];
    const t = data.tours.find(x => x.id === id);
    const info = (data.concerts || []).find(x => x.id === id) || soloInfos().find(x => x.id === id);
    if (!t && info) {
      // 셋리스트가 없는 공연도 같은 초록 카드로 보여줘요. 일정은 "날짜 도시 공연장" 글에서 나눠요.
      const evs = info.evs || concertEvents(info);
      const shows = infoShows(info, evs);
      // 팬이 올린 셋리(또는 시트 곡)가 있는 날은 날짜별로 바로 보여줘요
      const sung = evs.filter(e => e.songs.length && e.songSource !== '참고');
      // 같은 셋리를 나눠 쓰는 날(이틀 공연)은 한 묶음으로
      const sets = new Map();
      sung.forEach(e => { const k = e.fanSet ? e.fanSet.src : e.id; if (!sets.has(k)) sets.set(k, []); sets.get(k).push(e); });
      const sungHtml = [...sets.values()].map(g => { const e = g[0]; return `<div class="block-head"><h2 class="h3 list-title">${g.map(x => `<a href="#/e/${encodeURIComponent(x.id)}">${x === e ? fmtDate(x.date, false) : x.date.slice(5).replace('-', '.')}${showTag(x)}</a>`).join(' · ')}${e.place ? ' · ' + esc(e.place) : ''} <span class="count">${e.songs.length}</span></h2></div>${slState(e)}<div class="day-songs">${e.songs.map(n => songRow(n, e)).join('')}</div>`; }).join('');
      return `
      <a class="back" href="#/concerts">‹ 콘서트</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${info.solo ? `<span class="solo-who">${esc(info.member)}</span>` : ''}${esc(info.name)}</h1></div>
        ${info.img ? `<a href="${esc(info.imgPost || info.img)}" target="_blank" rel="noopener"><img class="album-img tour-poster" src="${esc(imgSize(info.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>` : ''}
        <span class="count-pill">${sung.length ? `${Math.max(...sung.map(e => e.songs.length))}곡` : '셋리스트 준비 중'}</span>
        <p class="sub">${info.solo ? esc([concertRange(info) || info.year + '년', info.note].filter(Boolean).join(' · ')) : concertRange(info)}${info.ok ? '' : ' <span class="tag">확인 중</span>'}</p>
        ${shows ? `<div class="tour-shows">${foldShows(shows)}</div>` : ''}
        ${findRow(info.solo ? `${info.member} ${info.name}` : '포레스텔라 ' + info.name.replace(/^[\d-]+\s*/, '') + ' 콘서트')}
      </section>
      <section class="album-head tour-info">${concertInfo(info, true)}</section>
      ${info.solo ? ytSection([...new Set(info.evs.flatMap(e => [...(e.ytStage || []), ...(e.ytBehind || [])]))], '공식 유튜브', '이 공연 날짜에 맞는 공식 채널 영상이에요.') : ytSection((data.official || []).filter(v => v.tour === info.id), '공식 유튜브', '공연 Recap·라이브 클립·비하인드처럼 제목에 이 콘서트 이름이 들어간 공식 영상이에요.')}
      ${tourX(info.id).length ? `<hr class="divider"><div class="block-head"><h2 class="h3 list-title">공식 X</h2>${albumBtn()}</div>${xList(tourX(info.id))}` : ''}
      <hr class="divider">
      ${sung.length ? `${sungHtml}<hr class="divider">` : ''}
      <div class="tour-foot">${sung.length ? '' : '<p class="src-note">이 공연은 아직 셋리스트를 정리하지 못했어요. 아는 분은 알려주세요.</p>'}${slForm(evs)}</div>`;
    }
    if (!t) return `<p class="empty">이 콘서트를 찾지 못했어요. <a href="#/concerts">콘서트 목록으로 ›</a></p>`;
    // 같은 장소는 한 줄로 모아요 (띄어쓰기만 다른 장소 이름도 같은 곳으로 봐요)
    const places = new Map();
    t.events.forEach(e => {
      const city = (e.title.match(/\bin\s+([^}\]]+?)\s*[}\]]?$/i) || [])[1];
      const label = e.place || city || (/encore|앙코르|앵콜/i.test(e.title) ? '앙코르' : e.title);
      const key = label.replace(/\s+/g, '');
      if (!places.has(key)) places.set(key, { label, list: [] });
      places.get(key).list.push(e);
    });
    // 콘서트 정보에 회차가 더 많이 적혀 있으면 그걸로 (셋리스트 출처는 일부 날짜만 있을 때가 있어요)
    const infoN = t.info ? t.info.shows.filter(x => /^\d{4}-/.test(x)).length : 0;
    const shows = infoN > places.size ? infoShows(t.info, [...t.events, ...concertEvents(t.info)]) : [...places.values()].map(({ label, list }) =>
      `<div class="tour-show"><span class="tour-place">${esc(label)}</span><span class="ev-days">${list.map(x => `<a class="ev-day" href="#/e/${encodeURIComponent(x.id)}">${x.date.slice(5).replace('-', '.')}</a>`).join('')}</span></div>`).join('');
    const top = t.songs.slice(0, 3).map(x => x.t).join(', ');
    return `
      <a class="back" href="#/concerts">‹ 콘서트</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(t.name.replace(/\s+\S+$/, ''))} <span class="nw">${esc((t.name.match(/\S+$/) || [''])[0])}${help('곡 옆 ▶ 버튼을 누르면 이 콘서트 무대를 유튜브에서 찾아볼 수 있어요.')}</span></h1>${shareBtn('이 셋리스트 공유하기', `포레스텔라 ${t.name} 셋리스트 🎤\n${top} …\n\n${TAGS}`, link('#/tour/' + encodeURIComponent(t.id)))}</div>
        ${t.info && t.info.img ? `<a href="${esc(t.info.imgPost || t.info.img)}" target="_blank" rel="noopener"><img class="album-img tour-poster" src="${esc(imgSize(t.info.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>` : ''}
        <span class="count-pill">${t.complete ? '' : '일부 '}${t.songs.length}곡</span>
        <p class="sub">${t.info ? concertRange(t.info) : tourRange(t)}${t.info && !t.info.ok ? ' <span class="tag">확인 중</span>' : ''}</p>
        ${shows ? `<div class="tour-shows">${foldShows(shows)}</div>` : ''}
        ${findRow('포레스텔라 ' + t.name.replace(/^[\d-]+\s*/, '') + ' 콘서트')}
      </section>
      <hr class="divider">
      <div class="view-row">${albumBtn()}</div>
      ${paneTabs([
        { label: '셋리스트', n: t.songs.length, html: tourSetlist(t) },
        { label: '유튜브', n: (data.official || []).filter(v => v.tour === t.id).length, html: ytList((data.official || []).filter(v => v.tour === t.id)) },
        { label: '공식 X', n: tourX(t.id).length, html: xList(tourX(t.id)) },
      ])}
      ${t.info ? `<hr class="divider"><section class="album-head tour-info">${concertInfo(t.info, true)}</section>` : ''}
      <hr class="divider">
      <div class="tour-foot">
        ${t.caution ? `<p class="src-note">${esc(t.caution)}</p>` : ''}
        <p class="src-note"><a href="${esc(t.source.url)}" target="_blank" rel="noopener nofollow">${esc(t.source.name)}</a> 기준이라 틀릴 수 있어요. <a href="${formUrl({ type: '틀린 정보', title: t.name + ' 셋리스트' })}" target="_blank" rel="noopener">틀린 곳 알려주기 ›</a></p>
      </div>`;
  }

  function reportsFor(e) {
    const t = norm(e.title);
    return data.reports.filter(r => r.date === e.date && (!r.title || t.includes(norm(r.title)) || norm(r.title).includes(t)));
  }

  // ---------- 공식 유튜브 (data/yt_videos.json) ----------
  const ytThumbUrl = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
  const ytTitle = t => t.replace(/^포레스텔라\s*\(Forestella\)\s*/i, '');
  function ytCard(v) {
    return `<a class="x-card yt-card" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">
        <img src="${ytThumbUrl(v.id)}" alt="" loading="lazy" onerror="this.remove()">
        <span class="x-text"><span class="x-date">${v.bc ? esc(v.bc) + ' · ' : v.ch ? esc(v.ch) + ' 채널 · ' : ''}${esc(v.kind)} · ${esc(v.date.replace(/-/g, '.'))}</span>${esc(ytTitle(v.title))}</span>
      </a>`;
  }
  // 카드 목록: 처음 n개만 보이고 '더 보기'로 n개씩 펼쳐요
  function moreList(cards, n = 10) {
    if (cards.length <= n) return `<div class="stack x-list">${cards.join('')}</div>`;
    return `<div class="stack x-list">${cards.map((c, i) => i < n ? c : c.replace(/^(\s*<\w+)/, '$1 hidden')).join('')}</div>
      <button type="button" class="more-btn" onclick="const h=[...this.previousElementSibling.querySelectorAll(':scope>[hidden]')];let k=0,i=0;for(;i<h.length&&k<${n};i++){h[i].hidden=false;if(h[i].offsetParent)k++}const r=h.length-i;if(!r)this.remove();else this.textContent='더 보기 ('+r+'개 남음)'">더 보기 (${cards.length - n}개 남음)</button>`;
  }
  // 상세 화면 탭: 한 번에 한 칸만 보여서 화면이 길어지지 않게 (내용 없는 칸은 빼요)
  function paneTabs(panes) {
    panes = panes.filter(p => p.html);
    if (panes.length < 2) return panes.map(p => p.html).join('');
    const click = "const b=this,bar=b.parentNode,ps=bar.parentNode.querySelectorAll(':scope>.pane');[...bar.children].forEach((x,i)=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-selected',on);ps[i].hidden=!on});const t=bar.getBoundingClientRect().top;if(t<0)bar.scrollIntoView();syncAlbum()";
    return `<div class="pane-wrap"><div class="pane-tabs" role="tablist">${panes.map((p, i) => `<button type="button" role="tab" class="${i ? '' : 'on'}" aria-selected="${!i}" onclick="${click}">${p.label}${p.n ? ` <b>${p.n}</b>` : ''}</button>`).join('')}</div>
      ${panes.map((p, i) => `<div class="pane"${i ? ' hidden' : ''}>${p.html}</div>`).join('')}</div>`;
  }
  // 분류 칩 + 목록: 칩을 누르면 그 분류만 (분류가 하나뿐이면 칩 없이)
  function catList(list, key, card) {
    if (!list.length) return '';
    const cnt = new Map();
    list.forEach(x => { const k = key(x) || '기타'; cnt.set(k, (cnt.get(k) || 0) + 1); });
    if (cnt.size < 2) return moreList(list.map(card), 10);
    const ks = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const click = "const w=this.closest('.cat-wrap');w.querySelectorAll(':scope>.chips>.chip').forEach(c=>c.classList.toggle('on',c===this));w.querySelectorAll(':scope>.cat-block').forEach((b,i)=>b.hidden=i!==+this.dataset.i);syncAlbum()";
    return `<div class="cat-wrap"><div class="chips cat-chips">${['전체', ...ks].map((k, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-i="${i}" onclick="${click}">${esc(k)}${i ? ` ${cnt.get(k)}` : ''}</button>`).join('')}</div>
      ${[list, ...ks.map(k => list.filter(x => (key(x) || '기타') === k))].map((l, i) => `<div class="cat-block"${i ? ' hidden' : ''}>${moreList(l.map(card), 10)}</div>`).join('')}</div>`;
  }
  const ytList = list => catList(list, v => v.kind, ytCard);
  const xCount = list => { const pics = list.reduce((s, p) => s + ((p.imgs || []).length || (p.img ? 1 : 0)), 0); return `글 ${list.length.toLocaleString()}개${pics ? ` · 사진 ${pics.toLocaleString()}장` : ''}`; };
  const xList = list => list.length ? `<p class="sub x-count">${xCount(list)}</p>${catList(list, p => p.cat, p => xCard(p, p.cat))}` : '';

  // 가로로 넘기는 영상 줄
  function ytStrip(list, isNew) {
    return `<div class="yt-strip">${list.map(v => `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener"><i class="yt-thumb"><img src="${ytThumbUrl(v.id)}" alt="" loading="lazy" onerror="this.remove()">${isNew && isNew(v) ? '<b class="new-badge">NEW</b>' : ''}</i><span>${esc(ytTitle(v.title))}</span>${v.bc ? `<small class="yt-src">${esc(v.bc)}</small>` : ''}</a>`).join('')}</div>`;
  }
  function ytSection(list, title, note) {
    if (!list.length) return '';
    return `<hr class="divider"><h2 class="h3 list-title">${title}${help(note)}</h2>${moreList(list.map(ytCard), 5)}`;
  }

  // 공식 X 글 속 링크 → 작은 버튼 (유튜브 공식 영상이면 종류까지)
  const LINK_NAMES = [[/youtu\.?be/, '유튜브'], [/naver/, '네이버'], [/instagram/, '인스타그램'], [/cafe\.daum/, '팬카페'], [/weverse/, '위버스'], [/fromm/, '프롬'], [/interpark|ticket|yes24|melon/, '예매'], [/spotify|music\.apple|genie|bugs|flo/, '음원'], [/onair\.|tv\.naver|kbs|mbc|sbs/, '방송'], [/./, '링크']];
  function xLinks(p) {
    if (!p.links || !p.links.length) return '';
    const ytId = u => (u.match(/(?:youtu\.be\/|[?&]v=|shorts\/)([\w-]{11})/) || [])[1];
    return `<div class="x-links">${p.links.slice(0, 4).map(u => {
      const id = ytId(u), ov = id && (data.official || []).find(v => v.id === id);
      let host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (err) { return ''; }
      const name = ov ? '공식 ' + ov.kind : ((LINK_NAMES.find(([rx]) => rx.test(host)) || [])[1] || host);
      return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(name)} ↗</a>`;
    }).join('')}</div>`;
  }

  // 앨범 보기용: 대표 사진 말고 나머지 사진들 (목록에선 숨겨요)
  const xExtras = p => (p.imgs || []).filter(u => u !== p.img).map(u => `<a class="x-card x-extra" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(u)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join('');
  const xGroup = (p, html) => { const ex = xExtras(p); return ex ? `<div class="x-group">${html}${ex}</div>` : html; };
  // 공식 X 대표 글: 사진 + 글 앞부분 카드 하나, 누르면 X로
  function xCard(p, label) {
    const img = p.img ? `<img src="${esc(p.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    const card = `<a class="x-card${img ? '' : ' no-img'}" href="${esc(p.url)}" target="_blank" rel="noopener">${img}
        <span class="x-text"><span class="x-date">${label} · ${esc(p.date.replace(/-/g, '.'))}</span>${esc(p.text)}</span>
      </a>`;
    const ln = xLinks(p);
    return xGroup(p, ln ? `<div class="x-wrap">${card}${ln}</div>` : card);
  }
  function xBlock(e) {
    const b = e.xBehind || [];
    if (!e.xPost && !b.length) return '';
    return `<hr class="divider"><section class="d-block">
      <div class="block-head"><h2 class="h3">공식 X${help('포레스텔라 공식 X 계정이 이 일정 뒤에 올린 글과 비하인드예요. 날짜와 글 내용으로 골라서 가끔 다른 글일 수 있어요.')}</h2>${albumBtn()}</div>
      ${moreList([...(e.xPost ? [xCard(e.xPost, '후기')] : []), ...b.map(p => xCard(p, /직캠|fancam|choreo/i.test(p.text) ? '직캠' : /포레미파솔/.test(p.text) ? '포레미파솔' : '비하인드'))], 3)}
    </section>`;
  }

  function detailView(e) {
    const time = !e.start || e.start === '종일' ? '' : ` · ${esc(e.start)}${e.end && e.end !== e.start ? '~' + esc(e.end) : ''}`;
    const period = e.endDate && e.endDate !== e.date ? ` ~ ${fmtDate(e.endDate, false)}` : '';
    // 랜덤 무대에서 열면 주소의 ?v= 영상을 맨 위에
    const picked = new URLSearchParams(location.hash.split('?')[1] || '').get('v');
    const mainVid = picked || e.videoId || (e.ytMain && e.ytMain.id);
    const thumb = mainVid ? `
      <a class="thumb" href="${ytWatch(mainVid)}" target="_blank" rel="noopener" aria-label="유튜브에서 영상 보기">
        <img src="${ytThumb(mainVid)}" alt="" loading="lazy">
        <span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span>
        <span class="thumb-cap">${picked ? '🎲 뽑힌 무대 · ' : e.videoId ? (e.songSource === '참고' ? '참고 영상 · ' : '') : (e.ytMain.kind === '비하인드' ? '공식 비하인드 · ' : '공식 영상 · ')}유튜브에서 열기</span>
      </a>` : '';

    let songs;
    if (e.songSource === '참고') {
      songs = `
        <div class="notice">
          <span class="src-badge">참고</span>
          <span>녹화·연속 방송이라 이날 곡은 정하지 않았어요.${e.videoMemo ? ' ' + esc(e.videoMemo) : ''}</span>
        </div>`;
    } else if (e.songs.length) {
      songs = `
        ${slState(e)}
        <div class="day-songs">${e.songs.map(n => songRow(n, e)).join('')}</div>
        ${e.fanSrc && !e.fanSet ? `<p class="src-note">${e.songSource !== '팬 기록' ? '일부 곡은 ' : ''}${e.fanSrc.note ? `${esc(e.fanSrc.note)} 때 ` : ''}인터넷에 올라온 정보를 모은 거라 실제와 다를 수 있어요.</p>` : SOURCE_NOTE[e.songSource] ? `<p class="src-note">${esc(SOURCE_NOTE[e.songSource])}</p>` : ''}`;
    } else {
      songs = `<p class="src-note">아직 확인된 곡이 없어요.</p>`;
    }

    const reports = reportsFor(e);
    const reportList = reports.length ? `
      <hr class="divider">
      <section class="d-block">
        <h2 class="h3">팬 제보</h2>
        ${reports.map(r => `
          <div class="report">
            <span class="report-badge">팬 제보 · 미확인</span>
            <span>${esc([r.type, r.song].filter(Boolean).join(' · '))}</span>
            ${r.message ? `<span class="report-msg">${esc(r.message)}</span>` : ''}
            ${/^https?:\/\//.test(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener nofollow">근거 링크 ›</a>` : ''}
          </div>`).join('')}
      </section>` : '';

    // 비하인드·방송 영상 줄에 썸네일로 나오는 영상은 관련 영상 목록에서 빼요 (중복)
    const shownYt = new Set([...(e.ytBehind || []), ...(e.ytStage || [])].map(v => v.id));
    const rels = e.related.filter(v => !shownYt.has(v.videoId));
    const related = rels.length ? `
      <hr class="divider">
      <section class="d-block">
        <h2 class="h3">관련 영상 <span class="song-count">${rels.length}</span></h2>
        <div class="yt-strip">${rels.map(v => `<a href="${ytWatch(v.videoId)}" target="_blank" rel="noopener"><img src="${ytThumbUrl(v.videoId)}" alt="" loading="lazy" onerror="this.remove()"><span>${esc(v.title)}</span><small class="yt-src">${esc([v.source || '영상', v.note].filter(Boolean).join(' · '))}</small></a>`).join('')}</div>
      </section>` : '';

    return `
      <div class="sheet-grab" aria-hidden="true"><span></span></div>
      <button type="button" class="sheet-close" id="sheet-close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="sheet-body">
        <div class="meta">${tag(e.category)}<span>${fmtDate(e.date)}${period}${time}</span>${upcoming(e)}</div>
        <h1 class="d-title">${esc(e.title)}</h1>
        ${evState(e)}
        ${e.place || e.note ? `<p class="sub">${esc([e.place, e.note].filter(Boolean).join(' · '))}</p>` : ''}
        <div class="box-row">${boxBtn('e', e.id, 'bpill')}${/생일|유튜브|네이버TV/.test(e.category) ? '' : wentBtns(e)}</div>
        ${e.auto ? `<p class="src-note">공식 팬카페 스케줄에서 자동으로 가져온 일정이에요.</p>` : ''}
        ${thumb}
        <div class="share-row">
          <button type="button" class="act act-wide" data-share data-text="${esc(eventShareText(e))}" data-url="${esc(link('#/e/' + encodeURIComponent(e.id)))}">${shareIcon}공유하기</button>
          <a class="act" href="${xUrl(eventShareText(e), link('#/e/' + encodeURIComponent(e.id)))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X</a>
          <button type="button" class="act" data-copy="${esc(link('#/e/' + encodeURIComponent(e.id)))}" aria-label="링크 복사"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>복사</button>
        </div>
        ${findRow(findQuery(e.title))}
        ${fixBox(e)}
        ${(e.ytBehind || []).length ? `<hr class="divider"><section class="d-block"><div class="block-head"><h2 class="h3">공식 유튜브 비하인드${help('공식 유튜브 비하인드 영상 중 제목의 행사 이름과 날짜로 이 일정을 고른 거예요. 가끔 다른 행사일 수 있어요.')}</h2></div>${ytStrip(e.ytBehind)}</section>` : ''}
        ${(e.ytStage || []).length ? `<hr class="divider"><section class="d-block"><div class="block-head"><h2 class="h3">방송 영상 <span class="song-count">${e.ytStage.length}</span>${help('방송사 공식 유튜브 영상 중 제목의 프로그램 이름과 방송 날짜로 이 일정에 붙인 거예요. 가끔 다른 회차일 수 있어요.')}</h2></div>${ytStrip(e.ytStage)}</section>` : ''}
        ${xBlock(e)}
        ${related}
        <hr class="divider">
        <section class="d-block">
          <div class="block-head"><h2 class="h3">이날 부른 곡${e.songSource !== '참고' && e.songs.length ? ` <span class="song-count">${e.songs.length}</span>` : ''}${help('방송·공식 영상이나 인터넷에 올라온 정보로 확인된 곡이에요. 빠진 곡이 있을 수 있어요. ▶를 누르면 그날 영상이 열려요.')}</h2></div>
          ${songs}
          ${e.videoMemo && e.songSource !== '참고' ? `<p class="src-note">${esc(e.videoMemo)}</p>` : ''}
          ${!e.setlist && e.songSource !== '참고' ? slForm([e]) : ''}
        </section>
        ${reportList}
      </div>`;
  }

  const sheet = document.createElement('div');
  sheet.className = 'sheet-wrap';
  new MutationObserver(() => { clearTimeout(syncT); syncT = setTimeout(() => window.syncAlbum(), 60); }).observe(sheet, { childList: true, subtree: true });
  sheet.hidden = true;
  sheet.innerHTML = '<div class="sheet-backdrop"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="일정 상세" tabindex="-1"></section>';
  document.querySelector('.app').appendChild(sheet);
  let baseHash = null;   // 시트 아래에 깔린 화면의 주소
  let openedInApp = false;

  function closeSheet() {
    if (openedInApp) history.back();
    else location.hash = baseHash || '#/';
  }
  sheet.querySelector('.sheet-backdrop').onclick = closeSheet;
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !sheet.hidden) closeSheet(); });

  function showSheet(id) {
    const e = data.byId.get(decodeURIComponent((id || '').split('?')[0]));
    const box = sheet.querySelector('.sheet');
    box.innerHTML = e ? detailView(e) : `
      <div class="sheet-body"><p class="empty">이 기록을 찾지 못했어요. 주소가 바뀌었거나 숨김 처리된 일정일 수 있어요.</p></div>`;
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    box.scrollTop = 0;
    const c = document.getElementById('sheet-close');
    if (c) c.onclick = closeSheet;
    box.focus({ preventScroll: true });
  }
  function hideSheet() {
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
  }

  function currentRoute() {
    const path = location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
    return path === 'e' || routes[path] ? path : 'home';
  }

  function setTabs(name) {
    const tabName = name === 'xfeed' && /[?&]rel=/.test(location.hash) ? 'home' : { song: 'songs', program: 'home', members: 'more', card: 'more', concerts: 'more', tour: 'more', search: 'home', timeline: 'more', add: 'more', opinion: 'more', admin: 'more', releases: 'home', about: 'more', install: 'more' }[name] || name;
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === tabName;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  // 탭 맨 아래 작은 "마지막 업데이트" (자동으로 가져오는 작업이 마지막으로 성공한 시각)
  const SYNC_OF = { home: ['cafe-sync.yml'], yt: ['yt-sync.yml', 'yt-bc.yml'], xfeed: ['x-sync.yml'] };
  const syncCache = {};
  function lastSync(f) {
    const key = 'sb-sync-' + f;
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < 10 * 60e3) return Promise.resolve(c.t); } catch (err) { /* 없으면 새로 받아요 */ }
    return syncCache[f] = syncCache[f] || fetch(`https://api.github.com/repos/sujeonghan78-lgtm/forestella-archive/actions/workflows/${f}/runs?per_page=1&status=success&exclude_pull_requests=true`)
      .then(r => r.ok ? r.json() : Promise.reject()).then(j => {
        const t = ((j.workflow_runs || [])[0] || {}).updated_at || '';
        try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), t })); } catch (err) { /* 괜찮아요 */ }
        return t;
      }).catch(() => '');
  }
  function fillSyncNote(name) {
    const files = SYNC_OF[name];
    if (!files) return;
    Promise.all(files.map(lastSync)).then(ts => {
      const t = ts.filter(Boolean).sort().pop();
      if (!t || currentRoute() !== name) return;
      view.querySelectorAll('.sync-note').forEach(x => x.remove());
      const el = document.createElement('p');
      el.className = 'sync-note';
      el.textContent = '마지막 업데이트 ' + new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      view.appendChild(el);
    });
  }
  function renderBase(name) {
    if (name !== 'opinion') opNewIds = null;
    setTabs(name);
    view.innerHTML = ddayBadge(name) + routes[name]() + (/^(opinion|admin|add|card)$/.test(name) ? '' : opBtn());
    fillSyncNote(name);
    if (name === 'home') bindHome();
    if (name === 'search') bindSearch();
    if (name === 'songs') bindSongs();
    if (name === 'releases') bindReleases();
    if (name === 'concerts') bindSolo();
    if (name === 'program') bindPrograms();
    if (name === 'box') bindBox();
    if (name === 'card') bindCard();
    if (name === 'home') bindAsk();
    if (name === 'yt') bindYt();
    if (name === 'timeline') bindTimeline();
    if (name === 'install') bindInstall();
    if (name === 'check') bindCheck();
    if (name === 'add') bindAdd();
    if (name === 'opinion') bindOpinion();
    if (name === 'admin') bindAdmin();
  }

  // 반환값: 바탕 화면을 새로 그렸는지 (스크롤을 맨 위로 올릴지)
  function render() {
    const name = currentRoute();
    if (!data) { setTabs(name === 'e' ? 'home' : name); return false; }
    if (name === 'e') {
      if (baseHash === null) { baseHash = '#/'; renderBase('home'); }
      showSheet(location.hash.split('/')[2]);
      return false;
    }
    hideSheet();
    openedInApp = false;
    if (baseHash === location.hash && view.innerHTML) {
      // 시트에서 좋아요·직관을 바꿨으면 바탕 화면 표시도 다시 그려요 (스크롤은 그대로)
      if (boxDirty) { boxDirty = false; const y = window.scrollY; renderBase(name); window.scrollTo(0, y); }
      return false;
    }
    baseHash = location.hash;
    renderBase(name);
    return true;
  }

  function showLoading() {
    view.innerHTML = `${header()}<p class="status">기록을 불러오는 중이에요…</p>`;
  }

  function showError(err) {
    view.innerHTML = `
      ${header()}
      <section class="soon">
        <p>기록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>
        <button type="button" class="btn" id="retry">다시 시도</button>
        <p class="status">${esc(err.message)}</p>
      </section>`;
    document.getElementById('retry').onclick = start;
  }

  async function start() {
    showLoading();
    try {
      data = await window.DATA.load(next => { data = next; searchIndex = null; if (currentRoute() !== 'e') baseHash = null; render(); });
      render();
      boxPull();
    } catch (err) {
      showError(err);
    }
  }

  // 방문자 수: 주소의 #/ 뒤 화면 이름만 보내요 (검색어 같은 ?뒤 내용은 빼요)
  function countView(tries = 0) {
    if (location.hostname !== 'sujeonghan78-lgtm.github.io') return;
    const gc = window.goatcounter;
    if (!gc || !gc.count) { if (tries < 20) setTimeout(() => countView(tries + 1), 500); return; }
    const route = (location.hash || '#/').split('?')[0];
    gc.count({ path: location.pathname + route });
  }

  window.addEventListener('hashchange', () => {
    const wasOpen = !sheet.hidden;
    countView();
    if (render()) window.scrollTo(0, 0);
    if (currentRoute() === 'e' && !wasOpen) openedInApp = true;
  });
  render();
  start();
  countView();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
