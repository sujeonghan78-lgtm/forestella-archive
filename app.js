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
  const songsLine = e => e.songSource === '참고' || !e.songs.length ? '' :
    `<span class="songs"><span class="songs-label">확인된 곡</span>${e.songs.map(esc).join(' · ')}</span>`;
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

  document.addEventListener('click', ev => {
    const h = ev.target.closest('.help');
    document.querySelectorAll('.help[aria-expanded="true"]').forEach(b => {
      if (b === h) return;
      b.setAttribute('aria-expanded', 'false'); b.nextElementSibling.hidden = true;
    });
    if (h) {
      const open = h.getAttribute('aria-expanded') !== 'true';
      h.setAttribute('aria-expanded', String(open)); h.nextElementSibling.hidden = !open;
      return;
    }
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

  // 랜덤 무대 후보: 곡이 확인되고 볼 수 있는 영상이 있는 일정의 (일정, 곡) 한 쌍씩. 일정이 아니라 곡 단위로 뽑아서
  // 곡이 많은 공연도, 한 곡만 부른 방송도 고르게 나와요. 최근에 나온 것들은 한동안 다시 안 나와요.
  let pickCount = 0;
  let randomPick = null;
  const RECENT_KEY = 'soopbyeol-recent-picks';
  function recentPicks() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (err) { return []; }
  }
  function homeRandom() {
    const pool = [];
    data.events.forEach(e => {
      if (e.songSource === '참고' || !(e.videoId || e.related.length)) return;
      e.songs.forEach(song => { if (window.DATA.songKey(song)) pool.push({ e, song }); });
    });
    if (!pool.length) return '';
    if (!randomPick || randomPick.n !== pickCount || !data.events.includes(randomPick.e)) {
      const recent = recentPicks();
      const keep = Math.min(30, Math.floor(pool.length / 2));
      const fresh = pool.filter(p => !recent.includes(p.e.id + '|' + p.song));
      const from = fresh.length ? fresh : pool;
      const p = from[Math.floor(Math.random() * from.length)];
      randomPick = { n: pickCount, e: p.e, song: p.song };
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([p.e.id + '|' + p.song, ...recent].slice(0, keep))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
    }
    const { e, song } = randomPick;
    const vid = e.videoId || (e.related[0] || {}).videoId || '';
    return `
      <section class="block" id="random">
        <div class="block-head"><h2 class="h2">오늘의 랜덤 무대</h2><span class="head-side"><button type="button" class="reroll" id="reroll"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>다시 뽑기</button>${shareBtn('랜덤 무대 공유하기', `오늘의 포레스텔라 랜덤 무대 🎲\n${fmtDate(e.date, false)} ${e.title} · ${song}\n\n나도 뽑아보기 👉 ${SITE}\n${TAGS}`, '')}</span></div>
        <div class="dice-card">
          <a class="dice-link" href="#/e/${encodeURIComponent(e.id)}">
            <span class="dice-thumb" aria-hidden="true">${vid ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="dice-play"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span></span>
            <span class="dice-text">
              <span class="sub">${fmtDate(e.date, false)} · ${esc(e.title)}</span>
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

  const PROGRAMS = ['불후의 명곡', '열린음악회', '라디오', '음악방송'];
  function homePrograms() {
    return `
      <section class="block">
        <h2 class="h2">프로그램별로 보기</h2>
        <div class="chips">${PROGRAMS.map(p => `<a class="pill" href="#/program/${encodeURIComponent(p)}">${p}</a>`).join('')}</div>
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
    return `
      <section class="block prog-mini">
        <h2 class="h3">프로그램별 모아보기</h2>
        <div class="chips">${PROGRAMS.map(p => `<a class="chip" href="#/program/${encodeURIComponent(p)}">${esc(p)} ›</a>`).join('')}</div>
      </section>`;
  }

  // 홈: 공식 유튜브 새 영상 (+ 몇 년 전 오늘 올라온 영상)
  function homeVideos() {
    const vs = (data.official || []).filter(v => !v.bc);
    if (!vs.length) return '';
    const t = todayParts();
    const md = `${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
    const ago = vs.filter(v => v.date.slice(5) === md && v.date.slice(0, 4) < String(t.y));
    return `
      <section class="block">
        <div class="block-head"><h2 class="h2">공식 유튜브 새 영상</h2><a class="more" href="#/yt">전체 보기</a></div>
        ${ytStrip(vs.slice(0, 10))}
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
        <input type="search" name="q" aria-label="검색어" placeholder="곡명, 방송, 장소 · 초성 OK" autocomplete="off">
        <a class="adv-btn" href="#/search">통합 검색</a>
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
  let shown = 50;

  function readParams() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
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
  const KO_EN = { 레거시: 'legacy', 웨이브: 'wave', 일루셔니스트: 'illusionist', 로열: 'royal', 로얄: 'royal', 비기닝: 'beginning', 월드트리: 'world tree', 라이트: 'light', 페스티벌: 'festival', 미스틱: 'mystique', 에볼루션: 'evolution', 메모리즈: 'memories', 윈터스토리: 'winter story', 윈터: 'winter', 심포니: 'symphony', 비욘드: 'beyond', 에튀드: 'etude', 에뛰드: 'etude', 아마겟돈: 'armageddon', 챔피언스: 'champions', 데스파시토: 'despacito', 스윗: 'sweet', 스위트: 'sweet', 이스케이프: 'escape', 러브인서울: 'love in seoul', 넥스트투유: 'next to you', 판타지아: 'fantasia', 넬라: 'nella', 노떼: 'notte', 포레스텔라: 'forestella', 투어: 'tour', 콘서트: 'concert', 팬미팅: 'fan meeting', 피타: 'pitta' };
  // 영어 곡 이름의 한글 표기 (띄어쓰기 없이, 여러 표기는 칸으로 구분). 곡 찾기·통합 검색에서 한글로도 찾게 해요
  const SONG_KO = {"myeden":"마이에덴","champions":"챔피언스 챔피온스 챔스","lazencasaveus":"라젠카세이브어스 라젠카","inneruniverse":"이너유니버스","scarboroughfair":"스카보로페어 스카버러페어 스카보로우페어","saveourlives":"세이브아워라이브즈 세이브아워라이브스 세아라 세이브아워","warriors":"워리어스 워리어즈","stilllovingyou":"스틸러빙유","badromance":"배드로맨스 베드로맨스","bohemianrhapsody":"보헤미안랩소디 보헤미안렙소디 보헤미안 보랩","healtheworld":"힐더월드","moonlight":"문라이트","fakelove":"페이크러브","utopia":"유토피아","shapeofyou":"쉐이프오브유 셰이프오브유 쉐잎오브유","jesuismalade":"쥬스위말라드 주스위말라드 쥬쉬말라드","forlife":"포라이프","myfavoritethings":"마이페이버릿띵스 마이페이보릿띵스 마이페이버릿씽스 마페띵","legendsneverdie":"레전드네버다이 레전즈네버다이","despacito":"데스파시토","whitenight":"화이트나이트","thegodfather":"대부 갓파더 더갓파더","arabiannights":"아라비안나이트 아라비안나이츠","theshowmustgoon":"더쇼머스트고온 쇼머스트고온","chagallsdream":"샤갈의꿈 샤갈스드림 샤갈","pianoman":"피아노맨","apocalypse":"아포칼립스","abracadabra":"아브라카다브라","everything":"에브리띵 에브리씽","ileftmyheartinsanfrancisco":"아이레프트마이하트인샌프란시스코 샌프란시스코","etude":"에튀드 에뛰드 에튜드","nellanotte":"넬라노떼 넬라노테","armageddon":"아마겟돈 아마게돈","angel":"엔젤 앤젤","snowglobe":"스노우글로브 스노글로브","imcomingnow":"아임커밍나우","dellamorenonsisa":"델라모레논시사","ilmirtoelarosa":"일미르토에라로사","crane":"크레인","amapola":"아마폴라","closeyoureyes":"클로즈유어아이즈","timetravel":"타임트래블 타임트레블","limmensità":"림멘시타 리멘시타","gashiri":"가시리","thornbird":"가시나무새 쏜버드","gethsemane":"겟세마네","amorfati":"아모르파티","wrongfulencounter":"악연","holdingoutforahero":"홀딩아웃포어히어로","youchangemyworld":"유체인지마이월드","youaremystar":"유아마이스타","dreamalittledreamofme":"드림어리틀드림오브미","theprayer":"더프레이어","thejourneyoflove":"더저니오브러브","primula":"프리뮬라 프리물라","sweetdreams":"스윗드림즈 스위트드림스","comeuneternoaddio":"꼬메운에떼르노아디오 코메운에테르노아디오","inunaltravita":"인우날트라비타 인운알트라비타","parlapiupiano":"빠를라삐우삐아노 파를라피우피아노","timeinabottle":"타임인어보틀","saysomething":"세이썸띵 세이섬씽","universe":"유니버스","changeontherise":"체인지온더라이즈","theskyandthedawnandthesun":"하늘과새벽과태양","myheartwillgoon":"마이하트윌고온","intotheunknown":"인투디언노운","laymedown":"레이미다운","paranoidandroid":"파라노이드안드로이드","revival":"리바이벌","thriller":"스릴러","smoothcriminal":"스무스크리미널","wearethechampions":"위아더챔피언스 위아더챔피온스","onelove":"원러브","thesoundofsilence":"사운드오브사일런스 더사운드오브사일런스","thegreatestshow":"더그레이티스트쇼 그레이티스트쇼","thephoenix":"더피닉스 피닉스","thevoice":"더보이스","remember":"리멤버","allthekingshorses":"올더킹스호시스","theresnothingholdinmeback":"데어즈낫띵홀딘미백 데얼스나띵홀딘미백","teeth":"티스","wakawaka":"와카와카","bad":"배드","laultimanoche":"라울티마노체","vivalavida":"비바라비다","radioactive":"레디오액티브 라디오액티브","mama":"마마","hijodelaluna":"이호데라루나","nellafantasia":"넬라판타지아","bemylove":"비마이러브","phantomoftheopera":"오페라의유령 팬텀오브디오페라","téirabhaileriú":"테르아왈리루","countingstars":"카운팅스타즈 카운팅스타스","rise":"라이즈","loverunsout":"러브런즈아웃","square":"스퀘어","signofthetimes":"사인오브더타임즈","kool":"쿨","chosenone":"초즌원","athena":"아테나","handclap":"핸드클랩","introrunes":"룬스","nowwearefree":"나우위아프리","deliverus":"딜리버어스","stillhere":"스틸히어","overture":"오버추어","ultimanoche":"울티마노체","pray":"프레이","evolution":"에볼루션","limmensita":"림멘시타","funiculifunicula":"푸니쿨리푸니쿨라","lacalunnia":"라칼룬니아","intromystique":"미스틱","preludedelaluna":"프렐류드데라루나","dandelion":"댄딜라이언 민들레","thenation":"더네이션","betheone":"비더원","persona":"페르소나","prayer":"프레이어","icarus":"이카루스","notalone":"낫얼론","will":"윌","introlotus":"로투스","carpediem":"카르페디엠","smog":"스모그","befree":"비프리","stuckinamaze":"스턱인어메이즈","recuerdosdebuenosaires":"레쿠에르도스데부에노스아이레스","apollon":"아폴론","dontbequiet":"돈비콰이엇","gtho":"지티에이치오","newness":"뉴니스","better":"베러 베터","knockthedoor":"녹더도어","paradox":"패러독스 파라독스","achristmassymphony":"크리스마스심포니","deepshadow":"딥섀도우 딥쉐도우","vantablack":"반타블랙","parlapiùpiano":"빠를라삐우삐아노 파를라피우피아노","komorebi":"코모레비","nexttoyou":"넥스트투유","sweetescape":"스윗이스케이프 스위트이스케이프","ternuraantiga":"테르누라안티가"};
  const songKoKey = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^0-9a-zà-ÿ]/g, '');
  const koOf = name => SONG_KO[songKoKey(name)] || '';
  const songText = so => so.name + ' ' + koOf(so.name);
  Object.entries(SONG_KO).forEach(([en, ko]) => ko.split(' ').forEach(k => { if (k.length >= 2 && !KO_EN[k]) KO_EN[k] = en; }));
  const aliasOf = q => { const s = q.replace(/\s+/g, ''); let out = s, hit = false; Object.keys(KO_EN).sort((x, y) => y.length - x.length).forEach(k => { if (out.includes(k)) { out = out.split(k).join(KO_EN[k]); hit = true; } }); return hit ? out : ''; };
  function runSearch(p) {
    const { items, fuse } = getIndex();
    const q = p.q.trim();
    let fuzzy = false;
    let list;
    if (!q) list = items.map(i => i.e);
    else if (isChosungOnly(q)) list = items.filter(i => i.cho.includes(q)).map(i => i.e);
    else {
      const nq = norm(q);
      list = items.filter(i => i.text.includes(nq)).map(i => i.e);
      const alt = aliasOf(q);
      if (!list.length && alt) list = items.filter(i => i.text.includes(norm(alt))).map(i => i.e);
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
    // 영상이 있으면 오른쪽에 썸네일을 보여줘요 (못 불러오면 ▶ 동그라미로)
    const vid = e.videoId || (e.related[0] || {}).videoId || (e.ytMain && e.ytMain.id);
    const thumb = vid ? `<span class="card-thumb" aria-label="영상 있음"><img src="https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="play-dot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span></span>` : '';
    const card = `
      <a class="card${e.setlist ? ' card-concert' : ''}${vid ? ' has-thumb' : ''}" href="${e.ytOnly ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(e.videoId) + '" target="_blank" rel="noopener' : '#/e/' + encodeURIComponent(e.id)}">
        <span class="card-body">
          <span class="meta">${tag(e.category)}<span>${fmtDate(e.date)}</span>${upcoming(e)}</span>
          <span class="card-title">${esc(e.title)}</span>
          ${songsLine(e)}
        </span>${thumb}
      </a>`;
    if (!e.setlist) return card;
    return `
      <div class="card-wrap">${card}
        <a class="card-sl" href="#/tour/${encodeURIComponent(e.setlist.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>셋리 보기</a>
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
    const hit = name => cho ? chosung(name).includes(nq) : norm(name).includes(nq);
    const out = [];
    PROGRAMS.filter(hit).forEach(pg => out.push({ href: '#/program/' + encodeURIComponent(pg), kind: '프로그램', name: pg + ' 모아보기' }));
    [...data.songs.values()].filter(so => hit(songText(so))).sort((a, b) => playCount(b) - playCount(a)).slice(0, 4)
      .forEach(so => out.push({ href: '#/song/' + encodeURIComponent(so.key), kind: '곡', name: so.name, img: songPic(so) }));
    (data.albums || []).filter(a => hit(a.name)).slice(0, 3)
      .forEach(a => out.push({ href: '#/xfeed?rel=' + encodeURIComponent(a.rel || a.name), kind: a.member ? a.member + ' 음반' : '음반', name: a.name, img: a.img && imgSize(a.img, 'thumb') }));
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
    const alt = aliasOf(p.q), na = alt && norm(alt);
    const hit = name => ok && (cho ? chosung(name).includes(nq) : norm(name).includes(nq) || (na && norm(name).includes(na)));
    const songs = [...data.songs.values()].filter(so => hit(songText(so))).sort((a, b) => playCount(b) - playCount(a));
    const vids = (data.official || []).filter(v => hit(v.title) && (!p.member || v.members.includes(p.member)) && (!p.year || v.date.startsWith(p.year)));
    const rels = [
      ...(data.albums || []).filter(a => hit(a.name) && (!p.member || a.member === p.member)).map(a => ({ href: '#/xfeed?rel=' + encodeURIComponent(a.rel || a.name), kind: a.member ? a.member + ' 음반' : '음반', name: a.name, sub: a.date.replace(/-/g, '.'), img: a.img && imgSize(a.img, 'thumb') })),
      ...(data.concerts && data.concerts.length ? data.concerts : data.tours).filter(c => hit(c.name)).map(c => ({ href: '#/tour/' + encodeURIComponent(c.id), kind: '콘서트', name: c.name, sub: c.from ? c.from.replace(/-/g, '.') : '', img: c.img ? imgSize(c.img, 'thumb') : c.tour ? tourPic(c.tour) : c.events ? tourPic(c) : '' })),
      ...PROGRAMS.filter(hit).map(pg => ({ href: '#/program/' + encodeURIComponent(pg), kind: '프로그램', name: pg + ' 모아보기', sub: '' })),
    ];
    return { songs, vids, rels };
  }
  function searchTabs(p, evN) {
    const h = searchHits(p);
    const tabs = [['', '전체'], ['ev', '일정', evN], ['song', '곡', h.songs.length], ['yt', '유튜브', h.vids.length], ['rel', '음반·콘서트', h.rels.length]];
    return `<div class="chips s-tabs">${tabs.filter(([t, , n]) => n !== 0 || (p.t || '') === t).map(([t, l, n]) => `<a class="chip${(p.t || '') === t ? ' on' : ''}" href="#" data-t="${t}">${l}${n != null ? ` <b>${n.toLocaleString()}</b>` : ''}</a>`).join('')}
      <a class="chip s-xlink" href="#/xfeed?q=${encodeURIComponent(p.q)}">공식 X에서 찾기 ›</a></div>`;
  }
  const relCard = x => `<a class="x-card${x.img ? '' : ' no-img'}" href="${x.href}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="x-text"><span class="x-date">${esc(x.kind)}${x.sub ? ' · ' + esc(x.sub) : ''}</span><b>${esc(x.name)}</b></span></a>`;
  const songCard = so => relCard({ href: '#/song/' + encodeURIComponent(so.key), kind: '곡', sub: `무대 ${so.events.length}번`, name: so.name, img: songPic(so) });
  function searchAll(p) {
    const h = searchHits(p);
    const { list, fuzzy } = runSearch(p);
    // 비슷한 결과(정확히 맞는 게 없을 때)는 다른 종류가 있으면 빼요
    const others = h.songs.length + h.vids.length + h.rels.length;
    const evs = fuzzy && others ? [] : list;
    const head = searchTabs(p, evs.length);
    const more = (t, n, unit) => n ? `<a class="more s-more" href="#" data-t="${t}">${n.toLocaleString()}${unit} 모두 보기 ›</a>` : '';
    if (p.t === 'song') return head + (h.songs.length ? moreList(h.songs.map(songCard), 20) : '<p class="empty">찾는 곡이 없어요.</p>');
    if (p.t === 'yt') return head + (h.vids.length ? `<div class="view-row"><p class="sub">${h.vids.length.toLocaleString()}개</p>${albumBtn()}</div>${ytList(h.vids)}` : '<p class="empty">찾는 영상이 없어요.</p>');
    if (p.t === 'rel') return head + (h.rels.length ? `<div class="stack x-list">${h.rels.map(relCard).join('')}</div>` : '<p class="empty">찾는 음반·콘서트가 없어요.</p>');
    const sec = (title, n, body, t, unit) => n ? `<section class="s-sec"><div class="block-head"><h2 class="h3">${title} <span class="song-count">${n.toLocaleString()}</span></h2>${more(t, n, unit)}</div>${body}</section>` : '';
    const any = evs.length || others;
    return head + (any ? [
      sec('곡', h.songs.length, `<div class="stack x-list">${h.songs.slice(0, 3).map(songCard).join('')}</div>`, 'song', '곡'),
      sec(fuzzy ? '비슷한 일정' : '일정', evs.length, `<div class="stack">${evs.slice(0, 4).map(resultCard).join('')}</div>`, 'ev', '건'),
      sec('공식 유튜브', h.vids.length, ytStrip(h.vids.slice(0, 8)), 'yt', '개'),
      sec('음반·콘서트', h.rels.length, `<div class="stack x-list">${h.rels.slice(0, 3).map(relCard).join('')}</div>`, 'rel', '개'),
    ].join('') : `<p class="empty">찾는 기록이 없어요. 혹시 빠진 기록이라면 <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">제보해 주세요</a>.</p>`);
  }
  function searchVideos(q) {
    const nq = norm(q);
    if (nq.length < 2) return '';
    const vs = (data.official || []).filter(v => norm(v.title).includes(nq));
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
    const desc = [p.q && `'${p.q}'`, p.cat, p.year && `${p.year}년`, p.member, p.video && '영상 있음'].filter(Boolean).join(' · ');
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
        <a class="back" href="#/">‹ 홈</a>
        <form class="searchbox" role="search" id="search-form">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" name="q" aria-label="검색어" placeholder="곡·방송·영상·음반 검색 · 초성 OK" value="${esc(p.q)}" autocomplete="off">
        </form>
        <div id="fwrap"${fHide(p) ? ' hidden' : ''}><div class="chips" id="filters">
          ${chip('video', '1', '▶ 영상 있음', p.video)}${cats.map(c => chip('cat', c, c, p.cat === c)).join('')}
        </div>
        <div class="chips" id="filters2">
          ${MEMBER_LIST.map(m => chip('member', m, m.slice(1), p.member === m)).join('')}
        </div>
        <div class="chips" id="filters3">${years.map(y => chip('year', y, y, p.year === y)).join('')}</div></div>
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
    // 연도·멤버 칩: 한 번 더 누르면 풀려요
    ['year', 'member'].forEach(k => document.querySelectorAll(`.chip[data-${k}]`).forEach(b => b.onclick = () => {
      update({ [k]: readParams()[k] === b.dataset[k] ? '' : b.dataset[k] });
      document.querySelectorAll(`.chip[data-${k}]`).forEach(x => { const on = x.dataset[k] === readParams()[k]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    }));
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
  let songFilter = '';
  const SONG_FILTERS = [['', '전체'], ['video', '무대 영상 있음'], ['album', '음반 수록곡'], ['concert', '콘서트에서 부른 곡']];
  const playCount = so => so.events.length + so.tours.length;

  // 곡 이름이 나온 공식 X 글 (짧은 이름은 엉뚱한 글이 섞여서 한글 2자·영문 4자 이상만)
  function songX(so) {
    if (so._x && so._xFeed === data.xFeed) return so._x;
    const flat = t => t.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const nm = flat(so.name);
    const hangul = /[가-힣]/.test(nm);
    // 영어 곡은 낱말 경계로 (Angel이 Los Angeles에 걸리지 않게)
    const words = so.name.toLowerCase().match(/[0-9a-z]+/g) || [];
    const rx = new RegExp('(^|[^a-z])' + words.join('[^a-z0-9]*') + '($|[^a-z])');
    const hit = p => hangul ? (p._flat || (p._flat = flat(p.raw))).includes(nm) : rx.test(p._low || (p._low = p.raw.toLowerCase()));
    so._xFeed = data.xFeed;
    so._x = nm.length >= (hangul ? 2 : 4) && (hangul || words.length) ? (data.xFeed || []).filter(hit) : [];
    return so._x;
  }
  // 곡 대표 사진: 음반 표지 → 최근 무대 영상 썸네일 → 공식 X 사진
  function songPic(so) {
    const al = so.albums.find(a => a.img);
    if (al) return imgSize(al.img, 'thumb');
    for (let i = so.events.length - 1; i >= 0; i--) {
      const e = so.events[i], vid = e.videoId || (e.related[0] || {}).videoId;
      if (vid) return `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/mqdefault.jpg`;
    }
    const ov = (so.official || []).find(v => v.kind !== '쇼츠');
    if (ov) return `https://i.ytimg.com/vi/${encodeURIComponent(ov.id)}/mqdefault.jpg`;
    const xp = songX(so).find(p => p.img);
    return xp ? imgSize(xp.img, 'thumb') : '';
  }

  function songsView() {
    const pass = so => !songFilter || (songFilter === 'video' ? so.events.length : songFilter === 'album' ? so.albums.length : so.tours.length);
    const list = [...data.songs.values()].filter(pass).sort((a, b) =>
      songSort === 'first' ? (a.since || '9').localeCompare(b.since || '9') || hangulFirst(a.name, b.name)
        : songSort === 'many' ? playCount(b) - playCount(a) || hangulFirst(a.name, b.name)
          : hangulFirst(a.name, b.name));
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${val}" aria-pressed="${on}">${label}</button>`;
    return `
      <div class="page-head">
        <h1 class="h1">곡 아카이브${help('무대 영상으로 확인된 곡, 음반 수록곡, 콘서트 셋리스트 곡을 모았어요. 초록 숫자는 영상으로 확인된 무대 수예요.')}</h1>
        <p class="sub">한 곡을 누르면 무대, 음반, 콘서트가 모두 나와요 · ${list.length}곡</p>
      </div>
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="song-q" aria-label="곡 이름 찾기" placeholder="곡 이름 찾기 · 초성도 OK" autocomplete="off">
      </form>
      <div class="chips" id="song-sort">
        ${chip('sort', 'name', '가나다순', songSort === 'name')}${chip('sort', 'many', '많이 부른 순', songSort === 'many')}${chip('sort', 'first', '처음 부른 순', songSort === 'first')}
      </div>
      <div class="chips" id="song-filter">${SONG_FILTERS.map(([v, l]) => chip('filter', v, l, songFilter === v)).join('')}</div>
      <div>
        ${list.map(so => {
          const al = so.albums[0];
          const meta = [so.events.length ? `<b>무대 ${so.events.length}</b>` : '', so.tours.length ? `콘서트 ${so.tours.length}` : '', so.titleOf.length ? '타이틀' : ''].filter(Boolean).join(' · ');
          return `
          <a class="song-item" href="#/song/${encodeURIComponent(so.key)}" data-n="${esc(norm(songText(so) + ' ' + (al ? al.name : '')))}" data-c="${esc(chosung(songText(so)))}">
            ${songPic(so) ? `<img class="song-thumb" src="${esc(songPic(so))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'song-thumb'}))">` : '<span class="song-thumb"></span>'}
            <span class="song-name">${esc(so.name)}${al ? `<small>${esc(al.name)}</small>` : ''}</span>
            ${songSort === 'first' && so.since ? `<span class="song-first">${fmtDate(so.since, false)}</span>` : ''}
            <span class="song-n">${meta} ›</span>
          </a>`;
        }).join('')}
      </div>`;
  }
  function bindSongs() {
    document.querySelectorAll('#song-sort .chip').forEach(b => b.onclick = () => { songSort = b.dataset.sort; renderBase('songs'); });
    document.querySelectorAll('#song-filter .chip').forEach(b => b.onclick = () => { songFilter = b.dataset.filter; renderBase('songs'); });
    // 곡 이름 찾기: 다시 그리지 않고 목록에서 숨기기만 해요 (입력 중 자판이 닫히지 않게)
    const q = document.getElementById('song-q');
    if (q) q.oninput = () => {
      const v = norm(q.value), c = q.value.replace(/\s/g, '');
      document.querySelectorAll('.song-item').forEach(a => {
        a.hidden = !!v && !a.dataset.n.includes(v) && !(isChosungOnly(c) && a.dataset.c.includes(c));
      });
    };
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
      <a class="song-album" href="#/xfeed?rel=${encodeURIComponent(a.rel || a.name)}">
        ${a.img ? `<img src="${esc(imgSize(a.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createElement('span'))">` : '<span></span>'}
        <span><b>${esc(a.name)}</b><small>${a.member ? esc(a.member) + ' · ' : ''}${esc(a.date.slice(0, 4))} · ${esc(a.kind || '')}${so.titleOf.includes(a) ? ' · 타이틀곡' : ''}</small></span>
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
        <div class="block-head"><h1 class="song-title">${esc(so.name)}</h1>${shareBtn('이 곡 공유하기', `포레스텔라 「${so.name}」 무대 모아보기 🏆\n${so.first ? `처음 확인된 무대 ${fmtDate(so.first.date, false)} ${so.first.title}부터\n` : ''}\n${TAGS}`, link('#/song/' + encodeURIComponent(so.key)))}</div>
        <span class="count-pill">${so.events.length ? `확인된 무대 ${so.events.length}개` : '무대 영상 준비 중'}${so.titleOf.length ? ' · 타이틀곡' : ''}</span>
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
        { label: '무대', n: stages.length, html: stages.length ? yearBlocks : `<p class="empty">아직 영상으로 확인된 무대가 없어요. <a href="${formUrl({ type: '새 기록', title: so.name })}" target="_blank" rel="noopener">무대 알려주기 ›</a></p>` },
        { label: '유튜브', n: so.official.length, html: ytList(so.official) },
        { label: '콘서트', n: so.tours.length, html: so.tours.length ? `<p class="src-note">콘서트 셋리스트 기준이에요. 무대 목록과 달리 영상으로 확인한 건 아니에요.</p><div class="tour-chips">${so.tours.slice().sort((a, b) => (a.dates[0] < b.dates[0] ? 1 : -1)).map(t => `<a class="chip" href="#/tour/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>` : '' },
        { label: '공식 X', n: xs.length, html: xList(xs) },
      ])}`;
  }

  // ---------- 연표 ----------
  const FIRST_YEAR = 2018;   // 포레스텔라 데뷔 해
  const CALENDAR_START = '2021-08';   // 팬카페 캘린더가 시작된 달

  // 같은 공연이 이틀 연속 열리면 연표에서 한 줄로 묶어요
  function groupRuns(list) {
    const runs = [];
    list.forEach(e => {
      const last = runs[runs.length - 1];
      const prev = last && last[last.length - 1];
      const close = prev && (new Date(e.date) - new Date(prev.date)) / 864e5 <= 3;
      if (prev && close && prev.title === e.title && prev.place === e.place) last.push(e);
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
    const gap = gapText ? `
      <div class="gap-card">
        <b>${gapText}</b>
        <span>이 시기 기록은 아직 비어 있어요. 기억나는 무대가 있다면 알려주세요.</span>
        <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">기록 제보하기 ›</a>
      </div>` : '';

    const body = [...months.entries()].map(([m, list]) => `
      <h2 class="month" id="m-${m}">${Number(m.slice(0, 4))}년 ${Number(m.slice(5))}월</h2>
      ${groupRuns(list).map(run => {
        const e = run[0];
        const songs = [...new Set(run.flatMap(x => x.songSource !== '참고' ? x.songs : []))];
        const md = x => x.date.slice(5).replace('-', '.');
        const when = run.length > 1
          ? `<span class="ev-days">${run.map(x => `<a class="ev-day" href="#/e/${encodeURIComponent(x.id)}">${md(x)}</a>`).join('')}</span>`
          : `<span>${md(e)}</span>`;
        return `
          <div class="ev">
            <span class="dot${songs.length ? '' : ' dot-plain'}" aria-hidden="true"></span>
            <span class="ev-body">
              <span class="ev-date">${tag(e.category)}${upcoming(e)}${when}${e.place ? `<span class="ev-place">${esc(e.place)}</span>` : ''}</span>
              <a class="ev-title" href="#/e/${encodeURIComponent(e.id)}">${esc(e.title)}${run.length > 1 ? ` <span class="ev-count">${run.length}회</span>` : ''}</a>
              ${songs.length ? `<span class="ev-songs">확인된 곡 · ${songs.map(esc).join(', ')}</span>` : ''}
            </span>
          </div>`;
      }).join('')}`).join('');

    return `
      <div class="tl-top">
        <h1 class="h1">연표</h1>
        <div class="chips" id="years">
          ${years.map(y => `<a class="yr${y === year ? ' on' : ''}${has.has(y) ? '' : ' gap'}" href="${tlHref(y, cat)}"${y === year ? ' aria-current="true"' : ''}>${y}</a>`).join('')}
        </div>
        ${cats.length > 1 ? `<div class="chips tl-cats">${['', ...cats].map(c => `<a class="chip${c === cat ? ' on' : ''}" href="${tlHref(year, c)}"${c === cat ? ' aria-current="true"' : ''}>${c || '전체'}</a>`).join('')}</div>` : ''}
      </div>
      <div class="tl">
        ${gap}
        ${body || (gap ? '' : `<p class="empty">${cat ? `이 해의 ${esc(cat)} 기록이 없어요.` : '이 해의 기록이 아직 없어요.'}</p>`)}
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

  // 프로그램 화면에서는 "[KBS2] 불후의 명곡 - " 같은 앞부분을 떼서 회차 이름만 보여줘요.
  function programTitle(title, prog) {
    if (!['불후의 명곡', '열린음악회'].includes(prog)) return title;
    const i = title.indexOf(prog);
    if (i < 0) return title;
    const rest = title.slice(i + prog.length).replace(/^[\s\-–:·]+/, '').trim();
    return rest || prog;
  }

  function programView() {
    const name = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0];
    const prog = PROGRAM_MATCH[name] ? name : PROGRAMS[0];
    const list = data.events.filter(PROGRAM_MATCH[prog]).slice().reverse();
    const play = playAllUrl(list);
    return `
      <div class="prog-top">
        <a class="back" href="#/">‹ 홈</a>
        <div class="block-head"><h1 class="h1">프로그램별 모아보기${help(`공식 팬카페 캘린더에 등록된 출연만 있어요.${prog === '음악방송' ? ' 뮤직뱅크 · 음악중심 · 엠카운트다운 · 인기가요 · 쇼챔피언 · 더쇼를 모았어요.' : ''} 빠진 회차는 <a href="${formUrl({ type: '새 기록' })}" target="_blank" rel="noopener">제보해 주세요</a>.`)}</h1>${shareBtn('이 프로그램 모음 공유하기', `포레스텔라 ${prog} 무대 몰아보기 ▶▶\n\n${TAGS}`, link('#/program/' + encodeURIComponent(prog)))}</div>
        <div class="chips">${PROGRAMS.map(p => `<a class="chip${p === prog ? ' on' : ''}" href="#/program/${encodeURIComponent(p)}"${p === prog ? ' aria-current="true"' : ''}>${p}</a>`).join('')}</div>
      </div>
      ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>${esc(prog)} 무대 이어보기</a>` : ''}
      <div>
        ${list.map(e => {
          const ref = e.songSource === '참고';
          const hasVideo = e.videoId || e.related.length;
          return `
            <a class="ep" href="#/e/${encodeURIComponent(e.id)}">
              <span class="ep-body">
                <span class="ep-date">${fmtDate(e.date)}</span>
                <span class="ep-title">${esc(programTitle(e.title, prog))}</span>
                ${ref ? `<span class="ep-ref">참고${e.videoMemo ? ' · ' + esc(e.videoMemo.replace(/^참고:\s*/, '')) : ''}</span>` :
                  e.songs.length ? `<span class="ep-songs">확인된 곡 · ${e.songs.map(esc).join(', ')}</span>` : ''}
              </span>
              ${hasVideo && !ref ? '<span class="play-dot" aria-label="영상 있음"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></span>' : ''}
            </a>`;
        }).join('') || '<p class="empty">아직 기록이 없어요.</p>'}
      </div>
`;
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
        <span>일정은 공식 팬카페 캘린더, 곡은 영상으로 확인된 것만 적었어요. 빠지거나 틀린 게 있으면 알려주세요.</span>
      </a>
      <nav aria-label="더보기 메뉴">
        ${item('#/program/' + encodeURIComponent(PROGRAMS[0]), '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/>', '프로그램별 모아보기', '')}
        ${item('#/concerts', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', '콘서트', ((data.concerts || []).length || data.tours.length) + '개')}
        ${item('#/timeline', '<path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="15" r="2"/><path d="M14 7h6M4 15h6"/>', '연표', '연도·월별 기록')}
        ${item('#/releases', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>', '음반 이야기', '앨범 · 싱글별 공식 X')}
        ${item('#/members', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', '멤버 개인 활동', '')}
        ${item('#/search?cat=' + encodeURIComponent('생일'), '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '기념일', '생일 · 데뷔일')}
        ${item(formUrl({}), '<path d="M4 20h4L19 9l-4-4L4 16z"/>', '기록 제보 · 정정 요청', '구글 폼', true)}
        ${item('#/install', '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6M9 11l3 3 3-3"/>', '앱처럼 쓰기', '')}
        ${item('#/about', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', '이 사이트에 대해', '')}
      </nav>`;
  }

  // 앨범 보기: 목록을 사진만 바둑판으로 (사이트 전체, 기억해 둬요). 사진 목록이 없는 칸에선 버튼이 회색
  let albumOn = false;
  try { albumOn = localStorage.getItem('albumMode') === '1' || localStorage.getItem('memAlbum') === '1'; } catch (err) { /* 괜찮아요 */ }
  document.documentElement.classList.toggle('album-on', albumOn);
  const albumBtn = () => `<button type="button" class="chip view-tog${albumOn ? ' on' : ''}" onclick="toggleAlbum()">${albumOn ? '목록으로 보기' : '앨범으로 보기'}</button>`;
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
  function membersView() {
    const m = new URLSearchParams(location.hash.split('?')[1] || '').get('m') || MEMBER_LIST[0];
    const evs = data.events.filter(e => e.members.includes(m)).sort((a, b) => (a.date < b.date ? 1 : -1));
    const vs = (data.official || []).filter(v => v.members.includes(m));
    const xs = (data.xFeed || []).filter(p => p.m.includes(m));
    const als = (data.albums || []).filter(a => a.member === m);
    const pics = xs.filter(p => p.img).slice(0, 10);
    const bday = xs.filter(p => p.cat === '생일').length;
    const q = encodeURIComponent(m);
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">멤버 개인 활동${help('일정은 일정명에 멤버 이름이 표시된 기록만, 영상·공식 X는 제목이나 글에 멤버 이름이 나온 것만 모았어요.')}</h1>
      <div class="seg-wrap" role="tablist">${MEMBER_LIST.map(x => `<a class="seg${x === m ? ' on' : ''}" href="#/members?m=${encodeURIComponent(x)}" role="tab" aria-selected="${x === m}">${x}</a>`).join('')}</div>
      ${pics.length ? `<div class="member-x"><div class="x-strip">${pics.map(p => `<a href="${esc(p.url)}" target="_blank" rel="noopener" title="${esc(p.text)}"><img src="${esc(p.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join('')}</div></div>` : ''}
      ${bday ? `<a class="chip" href="#/xfeed?cat=${encodeURIComponent('생일')}&m=${q}">🎂 생일 축하 글 ${bday}개 ›</a>` : ''}
      <div class="view-row">${albumBtn()}</div>
      <div class="mem-body">
      ${paneTabs([
        { label: '유튜브', n: vs.length, html: vs.length ? `${ytList(vs)}<a class="more mem-all" href="#/yt?m=${q}">유튜브 탭에서 보기 ›</a>` : '' },
        { label: 'X', n: xs.length, html: xList(xs) },
        { label: '일정', n: evs.length, html: evs.length ? `${moreList(evs.map(resultCard), 10)}<a class="more mem-all" href="#/search?member=${q}">검색에서 걸러 보기 ›</a>` : '' },
        { label: '음반', n: als.length, html: als.length ? `<div class="stack x-list">${als.map(a => `
          <a class="x-card${a.img ? '' : ' no-img'}" href="#/xfeed?rel=${encodeURIComponent(a.rel || a.name)}">
            ${a.img ? `<img src="${esc(imgSize(a.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <span class="x-text"><span class="x-date">${nw(`${a.date.replace(/-/g, '.')} · ${a.kind}`)}</span><b>${esc(a.name)}</b></span>
          </a>`).join('')}</div>` : '' },
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
        <p>공식 팬카페 캘린더에 올라온 일정을 옮겨왔어요. 카페 캘린더가 2021년 8월부터라 그 이전 기록은 비어 있어요. 카페 회원만 볼 수 있는 일정(응모 · 방청 신청 같은 것)은 올리지 않아요. 카페에 새 일정이 올라오면 하루 몇 번 자동으로 확인해서 여기에도 추가돼요.</p>
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
    songs: songsView,
    song: songView,
    timeline: timelineView,
    more: moreView,
    members: membersView,
    about: aboutView,
    install: installView,
    concerts: concertsView,
    tour: tourView,
    xfeed: xfeedView,
    yt: ytView,
    releases: releasesView,
  };

  // ---------- 일정 상세 (아래에서 올라오는 시트) ----------
  const SOURCE_NOTE = {
    '방송사 영상': '방송사 공식 채널 영상으로 확인했어요.',
    '공식채널': '포레스텔라 공식 유튜브로 확인했어요.',
    '언론사 영상': '언론사 공식 채널 영상으로 확인했어요.',
    '팬 영상': '팬 영상 제목 기준이라 틀릴 수 있어요. 팬 영상 링크는 걸지 않아요.',
  };
  // 유튜브·X에서 바로 찾아보기 (검색어가 미리 써진 화면을 열어요)
  const findRow = q => `
    <div class="find-row">
      <a class="find-btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" class="fill"/></svg>유튜브에서 검색</a>
      <a class="find-btn" href="https://x.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X에서 검색</a>
    </div>`;
  // 일정명 앞의 [방송사] 같은 표시는 빼고 검색해요
  const findQuery = title => '포레스텔라 ' + title.replace(/^(\[[^\]]*\]\s*)+/, '').replace(/\s*\([^)]*녹화[^)]*\)/, '').trim();

  const ytWatch = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const ytThumb = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

  function songRow(name) {
    const so = data.songs.get(window.DATA.songKey(name));
    if (!so) return `<div class="song-row"><span>${esc(name)}</span></div>`;
    return `<a class="song-row" href="#/song/${encodeURIComponent(so.key)}"><span>${esc(name)}</span><span class="song-count">확인된 무대 ${so.events.length}개 ›</span></a>`;
  }

  // ---------- 콘서트 셋리스트 ----------
  // 셋리스트 한 줄: "A / B"처럼 날마다 달랐던 곡은 각각 곡 페이지로 이어요
  function setlistSong(title) {
    return title.split(' / ').map(part => {
      const so = data.songs.get(window.DATA.songKey(window.DATA.setlistName(part)));
      return so ? `<a${so.events.length ? '' : ' class="plain"'} href="#/song/${encodeURIComponent(so.key)}">${esc(part)}</a>` : esc(part);
    }).join(' / ');
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

  // ---------- 공식 유튜브 모아보기 ----------
  const YT_KINDS = ['M/V', '무대', '직캠', '라이브', '클립', '가사 영상', '비하인드', '티저', '쇼츠', '영상'];
  function ytView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const kind = qs.get('kind') || '', yr = qs.get('y') || '', mem = qs.get('m') || '', q = qs.get('q') || '', chn = qs.get('ch') || '';
    const all = data.official || [];
    const href = (k, y, m, c = chn) => '#/yt?' + new URLSearchParams(Object.entries({ ch: c, kind: k, y, m, q }).filter(x => x[1])).toString();
    const chans = [...MEMBER_LIST.filter(m => all.some(v => v.ch === m)), ...(all.some(v => v.bc) ? ['방송사'] : [])];
    const CH_NAMES = { 강형호: '[PITTA]강형호 & 이용우', 조민규: '조민규 ChoMinGyu', 고우림: 'Official KOWOORIM' };
    const chip = (on, h, label) => `<a class="chip${on ? ' on' : ''}" href="${h}">${label}</a>`;
    const nq = norm(q);
    const list = all.filter(v => (!chn || (chn === '포레스텔라' ? !v.ch && !v.bc : chn === '방송사' ? v.bc : v.ch === chn)) && (!kind || v.kind === kind) && (!yr || v.date.startsWith(yr)) && (!mem || v.members.includes(mem)) && (!nq || norm(v.title).includes(nq)));
    return `
      <h1 class="h1 page-title">공식 유튜브${help('포레스텔라 공식 유튜브 채널(@officialforestella)과 강형호·조민규·고우림 공식 채널, 그리고 KBS·MBC·JTBC·Mnet 같은 방송사 공식 채널에 올라온 포레스텔라 영상(조회수 1만 이상)을 매일 자동으로 모아요. 종류와 멤버는 제목으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" id="yt-form">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="yt-q" value="${esc(q)}" placeholder="영상 제목 찾기" aria-label="공식 영상 찾기">
      </form>
      ${chans.length ? `<div class="chips tl-cats">${chip(!chn, href(kind, yr, mem, ''), '모든 채널')}${['포레스텔라', ...chans].map(c => chip(c === chn, href(kind, yr, mem, c), c === '포레스텔라' || c === '방송사' ? c : CH_NAMES[c] || c + ' 채널')).join('')}</div>` : ''}
      <div class="chips tl-cats">${chip(!kind, href('', yr, mem), '전체')}${YT_KINDS.filter(k => all.some(v => v.kind === k)).map(k => chip(k === kind, href(k, yr, mem), k)).join('')}</div>
      <div class="chips tl-cats">${chip(!yr, href(kind, '', mem), '전체 연도')}${[...new Set(all.map(v => v.date.slice(0, 4)))].sort().reverse().map(y => chip(y === yr, href(kind, y, mem), y)).join('')}</div>
      <div class="chips tl-cats">${chip(!mem, href(kind, yr, ''), '멤버 전체')}${MEMBER_LIST.map(m => chip(m === mem, href(kind, yr, m), m.slice(1))).join('')}</div>
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}개</p>${albumBtn()}</div>
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

  // ---------- 공식 X 모아보기 ----------
  const X_CATS = ['일정 후기', '일정 현장', '비하인드·직캠', '사진·일상', '영상', '음반·컴백', '공지·안내', '기사', '생일', '투표·이벤트'];
  const X_MEMBERS = ['배두훈', '강형호', '조민규', '고우림'];
  let xQuery = '';
  function xfeedView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const cat = qs.get('cat') || '', mem = qs.get('m') || '', rel = qs.get('rel') || '', yr = qs.get('y') || '';
    if (qs.has('q')) xQuery = qs.get('q');  // 통합 검색에서 넘어온 검색어
    let n = 0;
    const href = (c, m, y = yr) => '#/xfeed?' + new URLSearchParams(Object.entries({ cat: c, m, y }).filter(x => x[1])).toString();
    const chip = (on, h, label) => `<a class="chip${on ? ' on' : ''}" href="${h}">${label}</a>`;
    const fill = () => {
      const box = document.getElementById('xfeed');
      if (!box) return;
      const nq = rel ? '' : norm(xQuery);
      let list = (data.xFeed || []).filter(p => (!cat || p.cat === cat) && (!mem || p.m.includes(mem)) && (!rel || p.rel === rel) && (!yr || p.date.startsWith(yr)) && (!nq || norm(p.raw).includes(nq)));
      if (rel) list = list.slice().reverse();  // 음반 이야기는 처음부터 순서대로
      const card = p => xGroup(p, xLinks(p) ? `<div class="x-wrap">${card0(p)}${xLinks(p)}</div>` : card0(p));
      const card0 = p => `
          <a class="x-card${p.img ? '' : ' no-img'}" href="${esc(p.url)}" target="_blank" rel="noopener">
            ${p.img ? `<img src="${esc(p.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <span class="x-text"><span class="x-date">${esc(p.date.replace(/-/g, '.'))} · ${esc(p.cat)}</span>${esc(p.text || '(글 없음)')}</span>
          </a>`;
      if (!list.length) { box.innerHTML = `<p class="empty">${data.xPending ? '공식 X 글 불러오는 중…' : rel ? '이 음반에 묶인 공식 X 글이 없어요.' : '해당하는 글이 없어요.'}</p>`; return; }
      const pics = list.reduce((s, p) => s + ((p.imgs || []).length || (p.img ? 1 : 0)), 0);
      const label = `글 ${list.length.toLocaleString()}개${pics ? ` · 사진 ${pics.toLocaleString()}장` : ''}`;
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
    });
    return `
      ${rel ? albumHead(rel) + '<hr class="divider"><div class="view-row">' + albumBtn() + '</div>' + paneTabs([
        { label: '수록곡', html: albumTracks(rel) },
        { label: '유튜브', n: (data.official || []).filter(v => v.rel === rel).length, html: ytList((data.official || []).filter(v => v.rel === rel)) },
        { label: '공식 X', n: (data.xFeed || []).filter(p => p.rel === rel).length, html: '<div id="xfeed"><p class="empty">불러오는 중…</p></div>' },
      ]) : ''}
      ${rel ? '' : `<h1 class="h1 page-title">공식 X 모아보기${help('포레스텔라 공식 X(@official_fore)에 올라온 글을 모았어요. 종류는 글 내용으로 자동 분류해서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="xq" aria-label="공식 X 글 찾기" placeholder="공식 X 글 찾기 · 곡명, 프로그램" value="${esc(xQuery)}" autocomplete="off">
      </form>
      <div class="chips tl-cats">${chip(!cat, href('', mem), '전체')}${X_CATS.map(c => chip(c === cat, href(c, mem), c)).join('')}</div>
      <div class="chips tl-cats">${chip(!yr, href(cat, mem, ''), '전체 연도')}${[...new Set((data.xFeed || []).map(p => p.date.slice(0, 4)))].sort().reverse().map(y => chip(y === yr, href(cat, mem, y), y)).join('')}</div>
      <div class="chips tl-cats">${chip(!mem, href(cat, ''), '멤버 전체')}${X_MEMBERS.map(m => chip(m === mem, href(cat, m), m.slice(1))).join('')}</div>
      <div class="view-row"><p class="sub" id="xcount"></p>${albumBtn()}</div>
      </div>
      <div id="xfeed"><p class="empty">불러오는 중…</p></div>`}`;
  }

  function albumHead(rel) {
    const a = (data.albums || []).find(x => (x.rel || x.name) === rel);
    if (!a) return `<a class="back" href="#/releases">‹ 음반 이야기</a><h1 class="h1 page-title">${esc(rel)}</h1><p class="sub">티저부터 발매·이벤트까지 공식 X 글을 순서대로 모았어요.</p>`;
    // 같은 가수(그룹/멤버) 음반 안에서 이전·다음
    const same = data.albums.filter(x => (x.member || '') === (a.member || '')).sort((x, y) => (x.date < y.date ? -1 : 1));
    const k = same.indexOf(a), prev = same[k - 1], next = same[k + 1];
    const go = (x, label) => x ? `<a href="#/xfeed?rel=${encodeURIComponent(x.rel || x.name)}"><span>${label}</span><b>${esc(x.name)}</b></a>` : '<span></span>';
    const SRC = [[/namu/, '나무위키'], [/wikipedia/, '위키백과'], [/melon/, '멜론'], [/genie/, '지니'], [/bugs/, '벅스'], [/apple/, '애플뮤직'], [/spotify/, '스포티파이'], [/vibe|naver/, '네이버'], [/youtu/, '유튜브'], [/x\.com|twitter/, '공식 X'], [/daum/, '다음']];
    const host = u => { let h = ''; try { h = new URL(u).hostname; } catch (e) { /* 넘어가요 */ } return (SRC.find(([rx]) => rx.test(h)) || [])[1] || '기사'; };
    return `<a class="back" href="#/releases${a.member ? '?m=' + encodeURIComponent(a.member) : ''}">‹ 음반 이야기</a>
      <section class="album-head ah2">
        <div class="ah-top">
          ${a.img ? `<img class="ah-img" src="${esc(imgSize(a.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
          <div class="ah-info">
            <h1 class="h1">${esc(a.name)}</h1>
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

  function albumTracks(rel) {
    const a = (data.albums || []).find(x => (x.rel || x.name) === rel);
    if (!a || !a.tracks.length) return '';
    return `<ol class="setlist-list">${a.tracks.map(t => {
          const so = data.songs.get(window.DATA.songKey(t));
          const isTitle = a.title && a.title.split(/[,/]/).some(x => x.trim() && window.DATA.songKey(x) === window.DATA.songKey(t));
          return `<li><span class="sl-title">${so ? `<a${so.events.length ? '' : ' class="plain"'} href="#/song/${encodeURIComponent(so.key)}">${esc(t)}</a>` : esc(t)}</span>${isTitle ? '<span class="sl-note">타이틀</span>' : ''}<a class="sl-yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent((a.member || '포레스텔라') + ' ' + t)}" target="_blank" rel="noopener" aria-label="${esc(t)} 유튜브에서 검색"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" class="fill"/></svg></a></li>`;
        }).join('')}</ol>`;
  }

  function releasesView() {
    const who = new URLSearchParams(location.hash.split('?')[1] || '').get('m') || '';
    const map = new Map();
    (data.xFeed || []).forEach(p => { if (p.rel) { if (!map.has(p.rel)) map.set(p.rel, []); map.get(p.rel).push(p); } });
    // 시트 "음반 정보"가 있으면 그 순서대로, 없으면 공식 X 글로 묶은 것만
    const items = data.albums && data.albums.length
      ? data.albums.filter(a => (a.member || '') === who).map(a => { const ps = map.get(a.rel) || []; return { key: a.rel || a.name, name: a.name, sub: `${a.date.replace(/-/g, '.')} · ${a.kind}`, img: a.img || (ps.find(p => p.img) || {}).img, n: ps.length }; })
      : [...map.entries()].map(([name, ps]) => ({ key: name, name, sub: `${ps[ps.length - 1].date.replace(/-/g, '.')}부터`, img: (ps.find(p => p.img) || {}).img, n: ps.length, d: ps[ps.length - 1].date }))
        .sort((a, b) => (a.d < b.d ? 1 : -1));
    // 연도별로 묶어 표지 2칸 바둑판
    const byYear = new Map();
    items.forEach(r => { const y = (r.sub.match(/^\d{4}/) || ['기타'])[0]; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(r); });
    const kindOf = r => (r.sub.split(' · ')[1] || '').replace(/\s*\(.*\)/, '');
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">음반 이야기${help('앨범 정보는 음원 사이트·위키·기사에서 두 곳 이상 맞는 것만 적었어요. 공식 X 글은 앨범·싱글별로 묶었어요.')}</h1>
      ${(data.albums || []).some(a => a.member) ? `<div class="chips tl-cats">${['', ...MEMBER_LIST.filter(m => data.albums.some(a => a.member === m))].map(m => `<a class="chip${m === who ? ' on' : ''}" href="#/releases${m ? '?m=' + encodeURIComponent(m) : ''}">${m || '포레스텔라'}</a>`).join('')}</div>` : ''}
      ${[...byYear.entries()].map(([y, rs]) => `
        <h2 class="rel-year">${y}</h2>
        <div class="rel-grid">${rs.map(r => `
          <a class="rel-tile" href="#/xfeed?rel=${encodeURIComponent(r.key)}">
            <span class="rel-cover">${r.img ? `<img src="${esc(imgSize(r.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
            <b>${esc(r.name)}</b>
            <span class="rel-sub">${esc(kindOf(r))}${r.n ? ` · X ${r.n}` : ''}</span>
          </a>`).join('')}</div>`).join('')}`;
  }


  function concertsView() {
    // 시트 "콘서트 정보"가 있으면 셋리스트가 없는 공연까지 다 보여줘요.
    const list = data.concerts && data.concerts.length
      ? data.concerts.map(c => ({ id: c.id, name: c.name, img: c.img || tourPic(c.tour), sub: `${concertRange(c)}${/^\d+$/.test(c.count || '') ? ` · ${c.count}회` : ''}${c.tour ? ` · 셋리스트 ${c.tour.songs.length}곡` : ''}` }))
      : data.tours.slice().reverse().map(t => ({ id: t.id, name: t.name, sub: `${tourRange(t)} · ${t.complete ? '' : '일부 '}${t.songs.length}곡` }));
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">콘서트${help('공연 정보는 예매처·기사·위키 중 두 곳 이상 맞는 것만 적었어요. 셋리스트는 나무위키·setlist.fm·뉴스 기사를 모았어요. 틀린 곳이 있으면 제보해 주세요.')}</h1>
      <p class="sub">단독 콘서트와 투어의 일정, 공연장, 부른 곡을 모았어요.</p>
      <div class="stack x-list">
        ${list.map(c => `
          <a class="x-card${c.img ? '' : ' no-img'}" href="#/tour/${encodeURIComponent(c.id)}">
            ${c.img ? `<img src="${esc(imgSize(c.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            <span class="x-text"><span class="x-date">${nw(c.sub)}</span><b>${esc(c.name)}</b></span>
          </a>`).join('')}
      </div>`;
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
          ${sec.items.map(s => { const v = tourVideo(t, s.t); return `<li${v ? ' class="sl-has"' : ''}><span class="sl-title">${setlistSong(s.t)}</span>${s.note ? `<span class="sl-note">${esc(s.note)}</span>` : ''}<a class="sl-yt" href="${v ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent('포레스텔라 ' + window.DATA.setlistName(s.t.split(' / ')[0]) + ' ' + t.name.replace(/^[\d-]+\s*/, ''))}`}" target="_blank" rel="noopener" aria-label="${esc(s.t)} ${v ? '공식 영상 보기' : '유튜브에서 검색'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" class="fill"/></svg></a></li>`; }).join('')}
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
  function tourView() {
    const id = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0];
    const t = data.tours.find(x => x.id === id);
    const info = (data.concerts || []).find(x => x.id === id);
    if (!t && info) {
      // 셋리스트가 없는 공연도 같은 초록 카드로 보여줘요. 일정은 "날짜 도시 공연장" 글에서 나눠요.
      const shows = info.shows.map(x => {
        const m = x.match(/^(\d{4})-(\d\d)-(\d\d)(?:~(?:(\d\d)-)?(\d\d))?\s*(.*)$/);
        if (!m) return `<div class="tour-show"><span class="tour-place">${esc(x)}</span></div>`;
        const day = `${m[2]}.${m[3]}${m[5] ? ' ~ ' + (m[4] ? m[4] + '.' : '') + m[5] : ''}`;
        return `<div class="tour-show"><span class="tour-place">${esc(m[6])}</span><span class="ev-days"><span class="ev-day">${day}</span></span></div>`;
      }).join('');
      return `
      <a class="back" href="#/concerts">‹ 콘서트</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(info.name)}</h1></div>
        ${info.img ? `<a href="${esc(info.imgPost || info.img)}" target="_blank" rel="noopener"><img class="album-img tour-poster" src="${esc(imgSize(info.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>` : ''}
        <span class="count-pill">셋리스트 준비 중</span>
        <p class="sub">${concertRange(info)}${info.ok ? '' : ' <span class="tag">확인 중</span>'}</p>
        ${shows ? `<div class="tour-shows">${shows}</div>` : ''}
        ${findRow('포레스텔라 ' + info.name.replace(/^[\d-]+\s*/, '') + ' 콘서트')}
      </section>
      <section class="album-head tour-info">${concertInfo(info, true)}</section>
      ${ytSection((data.official || []).filter(v => v.tour === info.id), '공식 유튜브', '공연 Recap·라이브 클립·비하인드처럼 제목에 이 콘서트 이름이 들어간 공식 영상이에요.')}
      ${tourX(info.id).length ? `<hr class="divider"><div class="block-head"><h2 class="h3 list-title">공식 X</h2>${albumBtn()}</div>${xList(tourX(info.id))}` : ''}
      <hr class="divider">
      <div class="tour-foot"><p class="src-note">이 공연은 아직 셋리스트를 정리하지 못했어요. <a href="${formUrl({ type: '틀린 정보', title: info.name })}" target="_blank" rel="noopener">알고 있는 곡 알려주기 ›</a></p></div>`;
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
    const shows = [...places.values()].map(({ label, list }) =>
      `<div class="tour-show"><span class="tour-place">${esc(label)}</span><span class="ev-days">${list.map(x => `<a class="ev-day" href="#/e/${encodeURIComponent(x.id)}">${x.date.slice(5).replace('-', '.')}</a>`).join('')}</span></div>`).join('');
    const top = t.songs.slice(0, 3).map(x => x.t).join(', ');
    return `
      <a class="back" href="#/concerts">‹ 콘서트</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(t.name.replace(/\s+\S+$/, ''))} <span class="nw">${esc((t.name.match(/\S+$/) || [''])[0])}${help('곡 옆 ▶ 버튼을 누르면 이 콘서트 무대를 유튜브에서 찾아볼 수 있어요.')}</span></h1>${shareBtn('이 셋리스트 공유하기', `포레스텔라 ${t.name} 셋리스트 🎤\n${top} …\n\n${TAGS}`, link('#/tour/' + encodeURIComponent(t.id)))}</div>
        ${t.info && t.info.img ? `<a href="${esc(t.info.imgPost || t.info.img)}" target="_blank" rel="noopener"><img class="album-img tour-poster" src="${esc(imgSize(t.info.img, 'medium'))}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>` : ''}
        <span class="count-pill">${t.complete ? '' : '일부 '}${t.songs.length}곡</span>
        <p class="sub">${tourRange(t)}${t.info && !t.info.ok ? ' <span class="tag">확인 중</span>' : ''}</p>
        ${shows ? `<div class="tour-shows">${shows}</div>` : ''}
        ${findRow('포레스텔라 ' + t.name.replace(/^[\d-]+\s*/, '') + ' 콘서트')}
      </section>
      ${t.info ? `<section class="album-head tour-info">${concertInfo(t.info, true)}</section>` : ''}
      <hr class="divider">
      <div class="view-row">${albumBtn()}</div>
      ${paneTabs([
        { label: '셋리스트', n: t.songs.length, html: tourSetlist(t) },
        { label: '유튜브', n: (data.official || []).filter(v => v.tour === t.id).length, html: ytList((data.official || []).filter(v => v.tour === t.id)) },
        { label: '공식 X', n: tourX(t.id).length, html: xList(tourX(t.id)) },
      ])}
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
  function ytStrip(list) {
    return `<div class="yt-strip">${list.map(v => `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener"><img src="${ytThumbUrl(v.id)}" alt="" loading="lazy" onerror="this.remove()"><span>${esc(ytTitle(v.title))}</span></a>`).join('')}</div>`;
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
    const mainVid = e.videoId || (e.ytMain && e.ytMain.id);
    const thumb = mainVid ? `
      <a class="thumb" href="${ytWatch(mainVid)}" target="_blank" rel="noopener" aria-label="유튜브에서 영상 보기">
        <img src="${ytThumb(mainVid)}" alt="" loading="lazy">
        <span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span>
        <span class="thumb-cap">${e.videoId ? (e.songSource === '참고' ? '참고 영상 · ' : '') : (e.ytMain.kind === '비하인드' ? '공식 비하인드 · ' : '공식 영상 · ')}유튜브에서 열기</span>
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

    // 공식 유튜브 줄에 썸네일로 나오는 영상은 관련 영상 목록에서 빼요
    const shownYt = new Set((e.ytBehind || []).map(v => v.id));
    const rels = e.related.filter(v => !shownYt.has(v.videoId));
    const related = rels.length ? `
      <hr class="divider">
      <section class="d-block">
        <h2 class="h3">관련 영상</h2>
        ${rels.map(v => `
          <a class="rel" href="${ytWatch(v.videoId)}" target="_blank" rel="noopener">
            <span class="tag">${esc(v.source || '영상')}</span>
            <span class="rel-body"><span>${esc(v.title)}</span>${v.note ? `<span class="row-sub">${esc(v.note)}</span>` : ''}</span>
          </a>`).join('')}
      </section>` : '';

    return `
      <div class="sheet-grab" aria-hidden="true"><span></span></div>
      <button type="button" class="sheet-close" id="sheet-close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="sheet-body">
        <div class="meta">${tag(e.category)}<span>${fmtDate(e.date)}${period}${time}</span>${upcoming(e)}</div>
        <h1 class="d-title">${esc(e.title)}</h1>
        ${e.place || e.note ? `<p class="sub">${esc([e.place, e.note].filter(Boolean).join(' · '))}</p>` : ''}
        ${e.auto ? `<p class="src-note">공식 팬카페 스케줄에서 자동으로 가져온 일정이에요.</p>` : ''}
        ${thumb}
        <div class="share-row">
          <button type="button" class="act act-wide" data-share data-text="${esc(eventShareText(e))}" data-url="${esc(link('#/e/' + encodeURIComponent(e.id)))}">${shareIcon}공유하기</button>
          <a class="act" href="${xUrl(eventShareText(e), link('#/e/' + encodeURIComponent(e.id)))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X</a>
          <button type="button" class="act" data-copy="${esc(link('#/e/' + encodeURIComponent(e.id)))}" aria-label="링크 복사"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>복사</button>
        </div>
        ${findRow(findQuery(e.title))}
        ${(e.ytBehind || []).length ? `<hr class="divider"><section class="d-block"><div class="block-head"><h2 class="h3">공식 유튜브 비하인드${help('공식 유튜브 비하인드 영상 중 제목의 행사 이름과 날짜로 이 일정을 고른 거예요. 가끔 다른 행사일 수 있어요.')}</h2></div>${ytStrip(e.ytBehind)}</section>` : ''}
        ${xBlock(e)}
        ${related}
        <hr class="divider">
        <section class="d-block">
          <div class="block-head"><h2 class="h3">영상으로 확인된 곡${help('영상이 남아 있는 곡만 표시돼요. 실제로는 더 불렀을 수 있어요.')}</h2>${e.songSource && e.songSource !== '참고' ? `<span class="tag">${esc(e.songSource)}</span>` : ''}</div>
          ${songs}
          ${e.videoMemo && e.songSource !== '참고' ? `<p class="src-note">${esc(e.videoMemo)}</p>` : ''}
          <div class="report-links">
            <span class="notice-links">
              <a href="${formUrl({ type: '빠진 곡', date: e.date, title: e.title })}" target="_blank" rel="noopener">빠진 곡 제보 ›</a>
              <a href="${formUrl({ type: '틀린 정보', date: e.date, title: e.title })}" target="_blank" rel="noopener">틀린 정보 알려주기 ›</a>
            </span>
          </div>
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
    const tabName = name === 'xfeed' && /[?&]rel=/.test(location.hash) ? 'home' : { song: 'songs', program: 'home', members: 'more', concerts: 'more', tour: 'more', search: 'home', timeline: 'more', releases: 'home', about: 'more', install: 'more' }[name] || name;
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
    if (name === 'yt') bindYt();
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
