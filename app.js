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
        <div class="block-head"><h2 class="h2">${title}</h2><span class="sub">${t.m}월 ${t.d}일</span></div>
        <div class="stack">${cards}</div>
      </section>`;
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
        <div class="block-head"><h2 class="h2">오늘의 랜덤 무대</h2></div>
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

  const routes = {
    home: () => `
      ${header()}
      ${homeSearchBox()}
      ${homeAgo()}
      ${homeRandom()}
      ${homeMonth()}
      ${homePrograms()}`,
    search: searchView,
    program: () => soon('프로그램별 모아보기', '사이트 2단계에서 만들어요.'),
    songs: () => soon('곡 아카이브', '사이트 2단계에서 만들어요.'),
    timeline: () => soon('연표', '사이트 2단계에서 만들어요.'),
    more: () => soon('더보기', '사이트 3단계에서 만들어요.'),
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

  function songCount(song) {
    return data.events.filter(e => e.songSource !== '참고' && e.songs.includes(song)).length;
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
        ${e.songs.map(s => `<a class="song-row" href="#/search?q=${encodeURIComponent(s)}"><span>${esc(s)}</span><span class="song-count">확인된 무대 ${songCount(s)}개 ›</span></a>`).join('')}
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
  sheet.innerHTML = '<div class="sheet-backdrop"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="일정 상세"></section>';
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
    (c || box).focus({ preventScroll: true });
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
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  function renderBase(name) {
    setTabs(name);
    view.innerHTML = routes[name]();
    if (name === 'home') bindHome();
    if (name === 'search') bindSearch();
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
})();
