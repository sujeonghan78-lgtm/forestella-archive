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
  const songsLine = e => e.songSource === '참고' || !e.songs.length ? '' :
    `<span class="songs"><span class="songs-label">확인된 곡</span>${e.songs.map(esc).join(' · ')}</span>`;
  const playBadge = e => e.videoId ?
    `<span class="play-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>영상</span>` : '';

  // 하루 동안 같은 결과가 나오는 랜덤 (오늘의 랜덤 무대)
  function seeded(seed) {
    let h = 2166136261;
    for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  }

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

  document.addEventListener('click', ev => {
    const s = ev.target.closest('[data-share]');
    if (s) { ev.preventDefault(); share(s.dataset.text, s.dataset.url); return; }
    const c = ev.target.closest('[data-copy]');
    if (c) {
      ev.preventDefault();
      copyText(c.dataset.copy);
      const m = document.getElementById('share-menu');
      if (m) m.remove();
    }
  });

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
    const years = t.y - Number(hits[0].date.slice(0, 4));
    const title = exact ? `${years}년 전 오늘` : `${years}년 전 이맘때`;
    const cards = hits.map(e => `
      <a class="hero" href="#/e/${encodeURIComponent(e.id)}">
        <span class="meta">${tag(e.category)}<span>${fmtDate(e.date)}</span></span>
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

  // 랜덤 무대 후보: 공식 영상이 있고 곡이 확인된 일정
  let pickCount = 0;
  function homeRandom() {
    const pool = data.events.filter(e => e.videoId && e.songs.length && e.songSource !== '참고');
    if (!pool.length) return '';
    const rnd = seeded(todayParts().iso + ':' + pickCount);
    const e = pool[Math.floor(rnd() * pool.length)];
    const song = e.songs[Math.floor(rnd() * e.songs.length)];
    return `
      <section class="block" id="random">
        <div class="block-head"><h2 class="h2">오늘의 랜덤 무대</h2>${shareBtn('랜덤 무대 공유하기', `오늘의 포레스텔라 랜덤 무대 🎲\n${fmtDate(e.date, false)} ${e.title} · ${song}\n\n나도 뽑아보기 👉 ${SITE}\n${TAGS}`, '')}</div>
        <div class="dice-card">
          <a class="dice-link" href="#/e/${encodeURIComponent(e.id)}">
            <span class="dice" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg></span>
            <span class="dice-text">
              <span class="sub">${fmtDate(e.date, false)} · ${esc(e.title)}</span>
              <span class="dice-song">${esc(song)}</span>
            </span>
          </a>
          <button type="button" class="btn" id="reroll">다시 뽑기</button>
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
    const rows = [...byYear.keys()].sort().map(y => {
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

  const PROGRAMS = ['불후의 명곡', '열린음악회', '라디오', '음악방송'];
  function homePrograms() {
    return `
      <section class="block">
        <h2 class="h2">프로그램별로 보기</h2>
        <div class="chips">${PROGRAMS.map(p => `<a class="pill" href="#/program/${encodeURIComponent(p)}">${p}</a>`).join('')}</div>
      </section>`;
  }

  function homeSearchBox() {
    return `
      <form class="searchbox" role="search" id="home-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" name="q" aria-label="검색어" placeholder="곡명, 방송, 장소로 찾기 · 초성도 OK" autocomplete="off">
      </form>`;
  }

  function bindHome() {
    const f = document.getElementById('home-search');
    if (f) f.onsubmit = ev => {
      ev.preventDefault();
      const q = f.q.value.trim();
      location.hash = '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    const b = document.getElementById('reroll');
    if (b) b.onclick = () => {
      pickCount++;
      document.getElementById('random').outerHTML = homeRandom();
      bindHome();
    };
  }

  // ---------- 검색 ----------
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const chosung = s => [...String(s || '')].map(c => {
    const code = c.charCodeAt(0) - 0xAC00;
    return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
  }).join('').replace(/\s+/g, '').toLowerCase();
  const isChosungOnly = q => /^[ㄱ-ㅎ]+$/.test(q);

  let searchIndex = null;
  function getIndex() {
    if (searchIndex && searchIndex.data === data) return searchIndex;
    const items = data.events.map(e => {
      const text = [e.title, e.place, e.songs.join(' '), e.videoMemo, e.related.map(v => v.title).join(' ')].join(' ');
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
  let shown = 50;

  function readParams() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    return { q: qs.get('q') || '', cat: qs.get('cat') || '', year: qs.get('year') || '', member: qs.get('member') || '', video: qs.get('video') === '1', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
  }
  function writeParams(p) {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.cat) qs.set('cat', p.cat);
    if (p.year) qs.set('year', p.year);
    if (p.member) qs.set('member', p.member);
    if (p.video) qs.set('video', '1');
    if (p.sort === 'old') qs.set('sort', 'old');
    const s = qs.toString();
    history.replaceState(null, '', '#/search' + (s ? '?' + s : ''));
    baseHash = location.hash;
  }

  function runSearch(p) {
    const { items, fuse } = getIndex();
    const q = p.q.trim();
    let fuzzy = false;
    let list;
    if (!q) list = items.map(i => i.e);
    else if (isChosungOnly(q)) list = items.filter(i => i.cho.includes(q)).map(i => i.e);
    else {
      const nq = norm(q);
      list = items.filter(i => i.text.includes(nq) || i.cho.includes(chosung(q))).map(i => i.e);
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
    const hasVideo = e.videoId || e.related.length;
    return `
      <a class="card" href="#/e/${encodeURIComponent(e.id)}">
        <span class="meta">${tag(e.category)}<span>${fmtDate(e.date)}</span>${hasVideo ? '<span class="play-dot" aria-label="영상 있음"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span>' : ''}</span>
        <span class="card-title">${esc(e.title)}</span>
        ${songsLine(e)}
      </a>`;
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

  function searchResults(p) {
    const { list, fuzzy } = runSearch(p);
    const desc = [p.q && `'${p.q}'`, p.cat, p.year && `${p.year}년`, p.member, p.video && '영상 있음'].filter(Boolean).join(' · ');
    const play = playAllUrl(list);
    return `
      <div class="result-head">
        <span>${desc ? esc(desc) + ' · ' : ''}<b>${list.length}건</b>${fuzzy ? ' · 비슷한 결과' : ''}</span>
        <button type="button" class="link-btn" id="sort">${p.sort === 'old' ? '오래된순' : '최신순'} ▾</button>
      </div>
      ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>검색 결과 영상 이어보기</a>` : ''}
      ${list.length ? `<div class="stack">${list.slice(0, shown).map(resultCard).join('')}</div>` :
        `<p class="empty">찾는 기록이 없어요. 혹시 빠진 기록이라면 <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">제보해 주세요</a>.</p>`}
      ${list.length > shown ? `<button type="button" class="btn btn-soft" id="show-more">더 보기 (${list.length - shown}건 남음)</button>` : ''}`;
  }

  function searchView() {
    const p = readParams();
    const cats = [...new Set(data.events.map(e => e.category).filter(Boolean))];
    const years = [...new Set(data.events.map(e => e.date.slice(0, 4)))].sort().reverse();
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `
      <div class="search-top">
        <form class="searchbox" role="search" id="search-form">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" name="q" aria-label="검색어" placeholder="곡명, 방송, 장소 · 초성도 OK" value="${esc(p.q)}" autocomplete="off">
        </form>
        <div class="chips" id="filters">
          ${cats.map(c => chip('cat', c, c, p.cat === c)).join('')}
          <label class="chip chip-select${p.year ? ' on' : ''}"><span class="sr">연도</span>
            <select id="year"><option value="">연도 ▾</option>${years.map(y => `<option value="${y}"${p.year === y ? ' selected' : ''}>${y}년</option>`).join('')}</select></label>
          <label class="chip chip-select${p.member ? ' on' : ''}"><span class="sr">멤버</span>
            <select id="member"><option value="">멤버 ▾</option>${MEMBER_LIST.map(m => `<option value="${m}"${p.member === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
          ${chip('video', '1', '▶ 영상 있음', p.video)}
        </div>
      </div>
      <div id="results">${searchResults(p)}</div>`;
  }

  function bindSearch() {
    const form = document.getElementById('search-form');
    const input = form.q;
    const update = (change, resetShown = true) => {
      const p = Object.assign(readParams(), change);
      writeParams(p);
      if (resetShown) shown = 50;
      document.getElementById('results').innerHTML = searchResults(p);
      bindResults();
    };
    const bindResults = () => {
      const s = document.getElementById('sort');
      if (s) s.onclick = () => update({ sort: readParams().sort === 'old' ? 'new' : 'old' });
      const m = document.getElementById('show-more');
      if (m) m.onclick = () => { shown += 50; update({}, false); };
    };
    let timer;
    input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => update({ q: input.value }), 150); };
    form.onsubmit = ev => { ev.preventDefault(); input.blur(); update({ q: input.value }); };
    document.querySelectorAll('#filters .chip[data-cat]').forEach(b => b.onclick = () => {
      const p = readParams();
      update({ cat: p.cat === b.dataset.cat ? '' : b.dataset.cat });
      document.querySelectorAll('#filters .chip[data-cat]').forEach(x => { const on = x.dataset.cat === readParams().cat; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    });
    const v = document.querySelector('#filters .chip[data-video]');
    v.onclick = () => { const on = !readParams().video; update({ video: on }); v.classList.toggle('on', on); v.setAttribute('aria-pressed', on); };
    ['year', 'member'].forEach(id => {
      const sel = document.getElementById(id);
      sel.onchange = () => { update({ [id]: sel.value }); sel.parentElement.classList.toggle('on', !!sel.value); };
    });
    bindResults();
    if (!readParams().q && !readParams().cat) input.focus({ preventScroll: true });
  }

  // 구글 폼 미리 채우기 주소
  function formUrl({ type, date, title, song } = {}) {
    const f = window.CONFIG.form;
    const qs = new URLSearchParams({ usp: 'pp_url' });
    if (type) qs.set(f.fields.type, type);
    if (date) qs.set(f.fields.date, date);
    if (title) qs.set(f.fields.title, title);
    if (song) qs.set(f.fields.song, song);
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

  function songsView() {
    const list = [...data.songs.values()].sort((a, b) =>
      songSort === 'first' ? a.first.date.localeCompare(b.first.date) || hangulFirst(a.name, b.name) : hangulFirst(a.name, b.name));
    return `
      <div class="page-head">
        <h1 class="h1">곡 아카이브</h1>
        <p class="sub">한 곡을 누르면 그 곡이 확인된 무대가 모두 나와요</p>
      </div>
      <div class="notice">영상으로 확인된 무대만 모았어요. 영상이 없는 무대는 빠져 있을 수 있어요.</div>
      <div class="chips" id="song-sort">
        <button type="button" class="chip${songSort === 'name' ? ' on' : ''}" data-sort="name" aria-pressed="${songSort === 'name'}">가나다순</button>
        <button type="button" class="chip${songSort === 'first' ? ' on' : ''}" data-sort="first" aria-pressed="${songSort === 'first'}">처음 확인된 순</button>
      </div>
      <div>
        ${list.map(so => `
          <a class="song-item" href="#/song/${encodeURIComponent(so.key)}">
            <span class="song-name">${esc(so.name)}</span>
            ${songSort === 'first' ? `<span class="song-first">${fmtDate(so.first.date, false)}</span>` : ''}
            <span class="song-n">${so.events.length}개 ›</span>
          </a>`).join('')}
      </div>`;
  }
  function bindSongs() {
    document.querySelectorAll('#song-sort .chip').forEach(b => b.onclick = () => {
      songSort = b.dataset.sort;
      renderBase('songs');
    });
  }

  function songView() {
    const key = decodeURIComponent(location.hash.split('/')[2] || '');
    const so = data.songs.get(key);
    if (!so) return `<p class="empty">이 곡을 찾지 못했어요. <a href="#/songs">곡 목록으로 ›</a></p>`;
    const stages = so.events.slice().reverse();
    const play = playAllUrl(stages);
    return `
      <a class="back" href="#/songs">‹ 곡 아카이브</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(so.name)}</h1>${shareBtn('이 곡 공유하기', `포레스텔라 「${so.name}」 무대 모아보기 🏆\n처음 확인된 무대 ${fmtDate(so.first.date, false)} ${so.first.title}부터\n\n${TAGS}`, link('#/song/' + encodeURIComponent(so.key)))}</div>
        <span class="count-pill">확인된 무대 ${so.events.length}개</span>
        <div class="facts">
          <div class="fact"><b>처음 확인</b><span>${fmtDate(so.first.date, false)} · ${esc(so.first.title)}</span></div>
          ${so.events.length > 1 ? `<div class="fact"><b>최근 확인</b><span>${fmtDate(so.last.date, false)} · ${esc(so.last.title)}</span></div>` : ''}
        </div>
        ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>이 곡 무대 이어보기</a>` : ''}
      </section>
      <h2 class="h3 list-title">무대 목록</h2>
      <div class="stack">${stages.map(resultCard).join('')}</div>
      <p class="src-note foot">영상으로 확인된 무대만 있어요. 빠진 무대는 일정 상세에서 제보해 주세요.</p>`;
  }

  // ---------- 연표 ----------
  const FIRST_YEAR = 2018;   // 포레스텔라 데뷔 해
  const CALENDAR_START = '2021-08';   // 팬카페 캘린더가 시작된 달

  function timelineView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const ym = qs.get('ym') || '';
    const years = [];
    const lastYear = data.events.length ? Number(data.events[data.events.length - 1].date.slice(0, 4)) : new Date().getFullYear();
    for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(String(y));
    const has = new Set(data.events.map(e => e.date.slice(0, 4)));
    const year = qs.get('y') || (ym ? ym.slice(0, 4) : String(lastYear));

    const events = data.events.filter(e => e.date.startsWith(year));
    const months = new Map();
    events.forEach(e => {
      const m = e.date.slice(0, 7);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(e);
    });

    const gapText = year < CALENDAR_START.slice(0, 4) ? `${year}년` :
      year === CALENDAR_START.slice(0, 4) ? `${year}년 1~${Number(CALENDAR_START.slice(5)) - 1}월` : '';
    const gap = gapText ? `
      <div class="gap-card">
        <b>${gapText}</b>
        <span>이 시기 기록은 아직 비어 있어요. 기억나는 무대가 있다면 알려주세요.</span>
        <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">기록 제보하기 ›</a>
      </div>` : '';

    const body = [...months.entries()].map(([m, list]) => `
      <h2 class="month" id="m-${m}">${Number(m.slice(0, 4))}년 ${Number(m.slice(5))}월</h2>
      ${list.map(e => {
        const songs = e.songSource !== '참고' && e.songs.length;
        return `
          <a class="ev" href="#/e/${encodeURIComponent(e.id)}">
            <span class="dot${songs ? '' : ' dot-plain'}" aria-hidden="true"></span>
            <span class="ev-body">
              <span class="ev-date">${e.date.slice(5).replace('-', '.')} · ${esc(e.place || e.category)}</span>
              <span class="ev-title">${esc(e.title)}</span>
              ${songs ? `<span class="ev-songs">확인된 곡 · ${e.songs.map(esc).join(', ')}</span>` : ''}
            </span>
          </a>`;
      }).join('')}`).join('');

    return `
      <div class="tl-top">
        <h1 class="h1">연표</h1>
        <div class="chips" id="years">
          ${years.map(y => `<a class="yr${y === year ? ' on' : ''}${has.has(y) ? '' : ' gap'}" href="#/timeline?y=${y}"${y === year ? ' aria-current="true"' : ''}>${y}</a>`).join('')}
        </div>
      </div>
      <div class="tl">
        ${gap}
        ${body || (gap ? '' : '<p class="empty">이 해의 기록이 아직 없어요.</p>')}
      </div>`;
  }
  function bindTimeline() {
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
  const PROGRAM_MATCH = {
    '불후의 명곡': e => e.title.includes('불후의 명곡'),
    '열린음악회': e => e.title.includes('열린음악회'),
    '라디오': e => e.category === '라디오',
    '음악방송': e => /뮤직뱅크|음악중심|엠카운트다운|인기가요|쇼챔피언|더\s?쇼/i.test(e.title),
  };

  function programView() {
    const name = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0];
    const prog = PROGRAM_MATCH[name] ? name : PROGRAMS[0];
    const list = data.events.filter(PROGRAM_MATCH[prog]).slice().reverse();
    const play = playAllUrl(list);
    return `
      <div class="prog-top">
        <a class="back" href="#/">‹ 홈</a>
        <div class="block-head"><h1 class="h1">프로그램별 모아보기</h1>${shareBtn('이 프로그램 모음 공유하기', `포레스텔라 ${prog} 무대 몰아보기 ▶▶\n\n${TAGS}`, link('#/program/' + encodeURIComponent(prog)))}</div>
        <div class="chips">${PROGRAMS.map(p => `<a class="chip${p === prog ? ' on' : ''}" href="#/program/${encodeURIComponent(p)}"${p === prog ? ' aria-current="true"' : ''}>${p}</a>`).join('')}</div>
      </div>
      ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>${esc(prog)} 무대 이어보기</a>` : ''}
      <div>
        ${list.map(e => {
          const ref = e.songSource === '참고';
          const hasVideo = e.videoId || e.related.length;
          return `
            <a class="ep" href="#/e/${encodeURIComponent(e.id)}">
              <span class="ep-date">${fmtDate(e.date, false)}</span>
              <span class="ep-body">
                <span class="ep-title">${esc(e.title)}</span>
                ${ref ? `<span class="ep-ref">참고${e.videoMemo ? ' · ' + esc(e.videoMemo.replace(/^참고:\s*/, '')) : ''}</span>` :
                  e.songs.length ? `<span class="ep-songs">확인된 곡 · ${e.songs.map(esc).join(', ')}</span>` : ''}
              </span>
              ${hasVideo && !ref ? '<span class="play-dot" aria-label="영상 있음"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span>' : ''}
            </a>`;
        }).join('') || '<p class="empty">아직 기록이 없어요.</p>'}
      </div>
      <p class="src-note foot">공식 팬카페 캘린더에 등록된 출연만 있어요.${prog === '음악방송' ? ' 뮤직뱅크 · 음악중심 · 엠카운트다운 · 인기가요 · 쇼챔피언 · 더쇼를 모았어요.' : ''} 빠진 회차는 <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">제보해 주세요</a>.</p>`;
  }

  // ---------- 더보기 ----------
  const menuIcon = d => `<span class="mi-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg></span>`;
  function moreView() {
    const item = (href, icon, label, side, ext) =>
      `<a class="mi" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${menuIcon(icon)}<span class="mi-l">${label}</span><span class="mi-side">${side} ›</span></a>`;
    return `
      <h1 class="h1 page-title">더보기</h1>
      <a class="about-card" href="#/about">
        <span class="block-head"><span class="about-title">기록은 이렇게 모았어요</span><span aria-hidden="true">›</span></span>
        <span>일정은 공식 팬카페 캘린더, 곡은 영상으로 확인된 것만 적었어요. 빠지거나 틀린 게 있으면 알려주세요.</span>
      </a>
      <nav aria-label="더보기 메뉴">
        ${item('#/program/' + encodeURIComponent(PROGRAMS[0]), '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/>', '프로그램별 모아보기', '불후 · 열린음악회')}
        ${item('#/members', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', '멤버 개인 활동', '')}
        ${item('#/search?cat=' + encodeURIComponent('생일'), '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '기념일', '생일 · 데뷔일')}
        ${item(formUrl({}), '<path d="M4 20h4L19 9l-4-4L4 16z"/>', '기록 제보 · 정정 요청', '구글 폼', true)}
        ${item('#/install', '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6M9 11l3 3 3-3"/>', '앱처럼 쓰기', '홈 화면에 추가')}
        ${item('#/about', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', '이 사이트에 대해', '')}
      </nav>`;
  }

  function membersView() {
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">멤버 개인 활동</h1>
      <p class="sub">일정명에 멤버 이름이 표시된 기록만 모았어요. 완전체 무대는 빠져요.</p>
      <nav class="member-list">
        ${MEMBER_LIST.map(m => {
          const n = data.events.filter(e => e.members.includes(m)).length;
          return `<a class="mi" href="#/search?member=${encodeURIComponent(m)}"><span class="mi-l">${m}</span><span class="mi-side">${n}건 ›</span></a>`;
        }).join('')}
      </nav>`;
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
        <p>공식 팬카페 캘린더에 올라온 일정을 옮겨왔어요. 카페 캘린더가 2021년 8월부터라 그 이전 기록은 비어 있어요. 카페 회원만 볼 수 있는 일정(응모 · 방청 신청 같은 것)은 올리지 않아요.</p>
      </section>
      <section class="sec">
        <h2 class="h3">곡 정보는 이렇게 적었어요</h2>
        <p>영상으로 확인된 곡만 적었어요. <b>실제로는 더 불렀을 수 있어요.</b></p>
        <div class="badges">
          ${badge('bd-tv', '방송사 영상', '방송사 공식 채널 영상으로 확인')}
          ${badge('bd-official', '공식채널', '포레스텔라 공식 유튜브로 확인')}
          ${badge('bd-press', '언론사 영상', '언론사 공식 채널 영상으로 확인')}
          ${badge('bd-fan', '팬 영상', '팬이 올린 영상 제목 기준이라 틀릴 수 있어요')}
          ${badge('bd-ref', '참고', '녹화일 · 연속 방송이라 곡을 확정하지 않고 관련 방송 영상만 연결')}
          ${badge('bd-report', '팬 제보 · 미확인', '제보 폼으로 들어온 내용이에요. 아직 확인 전이에요')}
        </div>
      </section>
      <section class="sec">
        <h2 class="h3">영상 링크</h2>
        <p>방송사 · 공식 채널 · 언론사 영상만 연결해요. 팬 영상은 링크를 걸지 않아요.</p>
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
      ${homeSearchBox()}
      ${homeAgo()}
      ${homeRandom()}
      ${homeMonth()}
      ${homePrograms()}`,
    search: searchView,
    program: programView,
    songs: songsView,
    song: songView,
    timeline: timelineView,
    more: moreView,
    members: membersView,
    about: aboutView,
    install: installView,
  };

  // ---------- 일정 상세 (아래에서 올라오는 시트) ----------
  const SOURCE_NOTE = {
    '방송사 영상': '방송사 공식 채널 영상으로 확인했어요.',
    '공식채널': '포레스텔라 공식 유튜브로 확인했어요.',
    '언론사 영상': '언론사 공식 채널 영상으로 확인했어요.',
    '팬 영상': '팬 영상 제목 기준이라 틀릴 수 있어요. 팬 영상 링크는 걸지 않아요.',
  };
  const ytWatch = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const ytThumb = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

  function songRow(name) {
    const so = data.songs.get(window.DATA.songKey(name));
    if (!so) return `<div class="song-row"><span>${esc(name)}</span></div>`;
    return `<a class="song-row" href="#/song/${encodeURIComponent(so.key)}"><span>${esc(name)}</span><span class="song-count">확인된 무대 ${so.events.length}개 ›</span></a>`;
  }

  function reportsFor(e) {
    const t = norm(e.title);
    return data.reports.filter(r => r.date === e.date && (!r.title || t.includes(norm(r.title)) || norm(r.title).includes(t)));
  }

  function detailView(e) {
    const time = e.start ? ` · ${esc(e.start)}${e.end ? '~' + esc(e.end) : ''}` : '';
    const period = e.endDate && e.endDate !== e.date ? ` ~ ${fmtDate(e.endDate, false)}` : '';
    const thumb = e.videoId ? `
      <a class="thumb" href="${ytWatch(e.videoId)}" target="_blank" rel="noopener" aria-label="유튜브에서 영상 보기">
        <img src="${ytThumb(e.videoId)}" alt="" loading="lazy">
        <span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span>
        <span class="thumb-cap">${e.songSource === '참고' ? '참고 영상 · ' : ''}유튜브에서 열기</span>
      </a>` : '';

    let songs;
    if (e.songSource === '참고') {
      songs = `
        <div class="notice">
          <span class="src-badge">참고</span>
          <span>녹화일이거나 연속 방송 회차라서 이 일정의 곡은 확정하지 않았어요.${e.videoMemo ? ' ' + esc(e.videoMemo) : ''}</span>
        </div>`;
    } else if (e.songs.length) {
      songs = `
        ${e.songs.map(songRow).join('')}
        ${SOURCE_NOTE[e.songSource] ? `<p class="src-note">${esc(SOURCE_NOTE[e.songSource])}</p>` : ''}`;
    } else {
      songs = `<p class="src-note">아직 영상으로 확인된 곡이 없어요.</p>`;
    }

    const reports = reportsFor(e);
    const reportList = reports.length ? `
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

    const related = e.related.length ? `
      <section class="d-block">
        <h2 class="h3">관련 영상</h2>
        ${e.related.map(v => `
          <a class="rel" href="${ytWatch(v.videoId)}" target="_blank" rel="noopener">
            <span class="tag">${esc(v.source || '영상')}</span>
            <span class="rel-body"><span>${esc(v.title)}</span>${v.note ? `<span class="row-sub">${esc(v.note)}</span>` : ''}</span>
          </a>`).join('')}
      </section>` : '';

    const ym = e.date.slice(0, 7);
    return `
      <div class="sheet-grab" aria-hidden="true"><span></span></div>
      <button type="button" class="sheet-close" id="sheet-close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="sheet-body">
        <div class="meta">${tag(e.category)}<span>${fmtDate(e.date)}${period}${time}</span></div>
        <h1 class="d-title">${esc(e.title)}</h1>
        ${e.place || e.note ? `<p class="sub">${esc([e.place, e.note].filter(Boolean).join(' · '))}</p>` : ''}
        ${thumb}
        <div class="share-row">
          <button type="button" class="act act-wide" data-share data-text="${esc(eventShareText(e))}" data-url="${esc(link('#/e/' + encodeURIComponent(e.id)))}">${shareIcon}공유하기</button>
          <a class="act" href="${xUrl(eventShareText(e), link('#/e/' + encodeURIComponent(e.id)))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X</a>
          <button type="button" class="act" data-copy="${esc(link('#/e/' + encodeURIComponent(e.id)))}" aria-label="링크 복사"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>복사</button>
        </div>
        <section class="d-block">
          <div class="block-head"><h2 class="h3">영상으로 확인된 곡</h2>${e.songSource && e.songSource !== '참고' ? `<span class="tag">${esc(e.songSource)}</span>` : ''}</div>
          ${songs}
          ${e.videoMemo && e.songSource !== '참고' ? `<p class="src-note">${esc(e.videoMemo)}</p>` : ''}
          <div class="notice notice-col">
            <span>영상이 남아 있는 곡만 표시돼요. 실제로는 더 불렀을 수 있어요.</span>
            <span class="notice-links">
              <a href="${formUrl({ type: '빠진 곡', date: e.date, title: e.title })}" target="_blank" rel="noopener">빠진 곡 제보 ›</a>
              <a href="${formUrl({ type: '틀린 정보', date: e.date, title: e.title })}" target="_blank" rel="noopener">틀린 정보 알려주기 ›</a>
            </span>
          </div>
        </section>
        ${reportList}
        ${related}
        <a class="same-time" href="#/timeline?ym=${ym}"><span class="sub">같은 시기의 기록</span><span>${Number(ym.slice(0, 4))}년 ${Number(ym.slice(5))}월 연표에서 보기 ›</span></a>
      </div>`;
  }

  const sheet = document.createElement('div');
  sheet.className = 'sheet-wrap';
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
    const e = data.byId.get(decodeURIComponent(id || ''));
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
    const tabName = { song: 'songs', program: 'home', members: 'more', about: 'more', install: 'more' }[name] || name;
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === tabName;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  function renderBase(name) {
    setTabs(name);
    view.innerHTML = routes[name]();
    if (name === 'home') bindHome();
    if (name === 'search') bindSearch();
    if (name === 'songs') bindSongs();
    if (name === 'timeline') bindTimeline();
    if (name === 'install') bindInstall();
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
    if (baseHash === location.hash && view.innerHTML) return false;
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
    } catch (err) {
      showError(err);
    }
  }

  window.addEventListener('hashchange', () => {
    const wasOpen = !sheet.hidden;
    if (render()) window.scrollTo(0, 0);
    if (currentRoute() === 'e' && !wasOpen) openedInApp = true;
  });
  render();
  start();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
