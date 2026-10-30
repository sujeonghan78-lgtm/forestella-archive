// 화면 전환과 그리기
(function () {
  const view = document.getElementById('view');
  let data = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function header() {
    return `
      <header class="brand">
        <span class="brand-name">숲별 기록장</span>
        <span class="brand-sub"><span>포레스텔라 비공식 팬 아카이브</span><button type="button" class="lang-btn lang-keep" onclick="SB_LANG.open()" aria-label="Language">🌐 ${window.SB_LANG ? window.SB_LANG.label() : '한국어'}</button></span>
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
      document.querySelectorAll(`[data-box="${k}"]`).forEach(b => { if (b.dataset.id === id) { b.setAttribute('aria-pressed', String(boxHas(k, id))); b.textContent = b.dataset.label ? (boxHas(k, id) ? '✓ ' : (b.dataset.ic != null ? b.dataset.ic : '🎫 ')) + b.dataset.label : BOX_LABEL[k][boxHas(k, id) ? 1 : 0]; } });
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
  const boxWrite = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* 저장 못 해도 괜찮아요 */ } if (KV_KEYS.includes(k)) kvTouch(); };
  // 이어 쓰기에 같이 싣는 이 폰 설정: 숲별 카드·카드 슬롯·나만 저장한 가사·준비물·비밀글 열쇠 (사진·스티커는 빼요)
  // 보관함 곡 칸(box.s)에 'kv:키:JSON'으로 넣어서 Apps Script를 안 바꾸고 따라가요
  const KV_KEYS = ['sb-card', 'sb-card-slots', 'sb-lyrics', 'sb-ready', 'sb-sec-key'];
  const kvStrip = (k, v) => k === 'sb-card-slots' && Array.isArray(v) ? v.map(x => x && { ...x, photo: null, stk: [] }) : v;
  // 시트(보관함)에는 이름+숫자로 잠가서 'kvx:암호문' 한 줄로 올려요 (시트를 열어도 내용이 안 보여요). 예전 'kv:' 줄도 읽어요
  const kvB64 = u8 => { let t = ''; for (let i = 0; i < u8.length; i += 8192) t += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(t); };
  const kvUnB64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  let kvKeyP = null, kvKeyFor = '';
  const kvKey = () => {
    const who = boxUser.name + '|' + boxUser.pin;
    if (kvKeyP && kvKeyFor === who) return kvKeyP;
    kvKeyFor = who;
    const enc = new TextEncoder();
    return (kvKeyP = crypto.subtle.importKey('raw', enc.encode(who), 'PBKDF2', false, ['deriveKey'])
      .then(base => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('soopbyeol-kv|' + boxUser.name), iterations: 200000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])));
  };
  async function kvLock(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kvKey(), new TextEncoder().encode(JSON.stringify(obj))));
    const all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
    return 'kvx:' + kvB64(all);
  }
  async function kvOpen(line) {
    const all = kvUnB64(line.slice(4));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await kvKey(), all.slice(12));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  const kvNow = () => { const o = {}; KV_KEYS.forEach(k => { const v = boxRead(k); if (v == null) return; const j = JSON.stringify(kvStrip(k, v)); if (j.length <= 20000) o[k] = JSON.parse(j); }); return o; };
  const KV_SIG = 'sb-kv-sig';
  let kvTimer = null;
  function kvTouch() {
    clearTimeout(kvTimer);
    kvTimer = setTimeout(async () => {
      if (!boxUser || !crypto.subtle) return;
      const o = kvNow(), sig = window.DATA.slVer([boxUser.name, JSON.stringify(o)]);
      const has = box.s.some(x => x.startsWith('kvx:')), old = box.s.some(x => x.startsWith('kv:'));
      if (has && !old && boxRead(KV_SIG) === sig) return;
      let line; try { line = Object.keys(o).length ? await kvLock(o) : ''; } catch (err) { return; }
      box.s = [...box.s.filter(x => !x.startsWith('kv:') && !x.startsWith('kvx:')), ...(line ? [line] : [])]; box.t = Date.now();
      try { localStorage.setItem(BOX_KEY, JSON.stringify(box)); } catch (err) { /* 괜찮아요 */ }
      boxWrite(KV_SIG, sig);
      boxPush();
    }, 1200);
  }
  // 받아온 보관함의 설정을 이 폰에 넣어요. 바뀐 게 있으면 한 번 새로 불러요 (카드 슬롯 사진은 이 폰 것을 그대로 둬요)
  // 잠긴 줄은 푸는 데 시간이 걸려서 뒤에서 넣고, 바뀌었으면 그때 새로 불러요
  function kvPut(pairs) {
    let changed = false;
    pairs.forEach(([k, v]) => {
      if (!KV_KEYS.includes(k)) return;
      if (k === 'sb-card-slots' && Array.isArray(v)) { const loc = boxRead(k) || []; v = v.map((s0, n) => s0 && loc[n] && loc[n].at === s0.at ? { ...s0, photo: loc[n].photo, stk: loc[n].stk } : s0); }
      const now = localStorage.getItem(k), nv = JSON.stringify(v);
      if (now !== nv && JSON.stringify(kvStrip(k, boxRead(k))) !== JSON.stringify(kvStrip(k, v))) { try { localStorage.setItem(k, nv); changed = true; } catch (err) { /* 괜찮아요 */ } }
    });
    return changed;
  }
  function kvApply() {
    const enc = box.s.find(x => x.startsWith('kvx:'));
    if (enc && boxUser && crypto.subtle) {
      kvOpen(enc).then(o => { if (kvPut(Object.entries(o))) setTimeout(() => location.reload(), 300); else kvTouch(); }).catch(() => { /* 못 풀면 이 폰 것을 그대로 둬요 */ });
      return false;
    }
    const kv = box.s.filter(x => x.startsWith('kv:'));
    if (!kv.length) { kvTouch(); return false; }
    const pairs = kv.map(x => { const i = x.indexOf(':', 3); try { return [x.slice(3, i), JSON.parse(x.slice(i + 1))]; } catch (err) { return null; } }).filter(Boolean);
    if (kvPut(pairs)) { setTimeout(() => location.reload(), 300); return true; }
    kvTouch();
    return false;
  }
  const boxClean = b => ({ e: (b && b.e) || [], s: (b && b.s) || [], w: (b && b.w) || [], v: (b && b.v) || [], t: (b && b.t) || 0 });
  let box = boxClean(boxRead(BOX_KEY));
  let boxUser = boxRead(BOX_USER);  // { name, pin, at }
  const boxApi = () => (window.CONFIG || {}).boxApi || '';
  // 관리자가 중복이라 원본에 합친 일정은 원본에 누른 걸로 쳐요 (window.SB_EV_MERGE {중복ID: 원본ID})
  const boxMg = () => window.SB_EV_MERGE || {};
  const boxHas = (k, id) => box[k].includes(id) || box[k].some(x => boxMg()[x] === id);
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
    box[k] = boxHas(k, id) ? box[k].filter(x => x !== id && boxMg()[x] !== id) : [id, ...box[k]];
    box.t = Date.now();
    boxWrite(BOX_KEY, box);
    boxPush();
    if (k === 's' || k === 'e') heartSync();
  }
  // 모든 팬의 하트 수: 이 폰의 하트 목록(곡·일정)이 바뀌면 한 줄로 보내요 (처음 한 번은 이미 눌러 둔 하트도 같이)
  const HEART_SENT = 'sb-heart-sent';
  // 소취곡(숲별 카드 + 곡 화면 🙏)도 같은 줄에 실어 보내서 '듣고 싶어 하는 팬' 수를 세요
  const wishKeys = () => { try { return pickList('wish').map(so => so.key).slice(0, 200); } catch (e) { return []; } };
  const heartLists = () => ({ s: box.s.filter(x => !/^(p[fwd]|fd|fn|go|sp|uid|kv|kvx):/.test(x)).slice(0, 400), e: box.e.slice(0, 400), w: wishKeys(), g: box.s.filter(x => x.startsWith('go:')).map(x => x.slice(3)).slice(0, 100) });
  let heartTimer = null;
  function heartSync() {
    clearTimeout(heartTimer);
    heartTimer = setTimeout(() => {
      const h = heartLists(), sig = window.DATA.slVer([h.s.join('|'), h.e.join('|'), h.w.join('|'), h.g.join('|')]), was = boxRead(HEART_SENT);
      if (was && was.sig === sig) return;
      if (!was && !h.s.length && !h.e.length && !h.w.length && !h.g.length) return;
      const by = myUid(); window.SB_UID = by;
      formPost(`종류: 하트\n누가: ${by}\n하트곡: ${h.s.join('|')}\n하트일정: ${h.e.join('|')}\n소취곡: ${h.w.join('|')}\n갈일정: ${h.g.join('|')}`).then(() => boxWrite(HEART_SENT, { sig, s: h.s, e: h.e, w: h.w, g: h.g })).catch(() => { /* 다음에 다시 보내요 */ });
    }, 3000);
  }
  // 보여 줄 하트 수: 시트에 모인 수에서 내 예전 하트를 빼고 지금 하트를 더해요 (3개 이상일 때만)
  const heartN = (k, id) => {
    const H = data.hearts || { s: {}, e: {} }, mine = H.mine;
    return Math.max(0, (H[k][id] || 0) - (mine && (mine[k] || []).includes(id) ? 1 : 0) + (boxHas(k, id) ? 1 : 0));
  };
  const wishN = key => {
    const H = data.hearts || {}, mine = H.mine;
    return Math.max(0, ((H.w || {})[key] || 0) - (mine && (mine.w || []).includes(key) ? 1 : 0) + (wishKeys().includes(key) ? 1 : 0));
  };
  const wishTag = key => { const n = wishN(key); return n >= 3 ? `<p class="wish-n">🙏 ${n.toLocaleString()}명이 듣고 싶어 해요</p>` : ''; };
  const heartTag = (k, id) => { const n = heartN(k, id); return n >= 3 ? `<span class="heart-n" title="이 ${k === 's' ? '곡' : '일정'}에 하트를 누른 팬">♥ ${n.toLocaleString()}</span>` : ''; };
  // 이어 쓰기: 처음 연결한 폰의 숲별 번호(sb-uid)를 보관함에 'uid:번호'로 두고, 복구한 폰도 같은 번호를 써요
  // (숲별 이야기 ♥·내가 쓴 글·셋리 확인이 다른 폰에서도 내 것으로 보여요). 번호가 바뀌면 한 번 새로 불러요
  function uidSync() {
    if (!boxUser) return false;
    const u = box.s.find(x => x.startsWith('uid:'));
    if (!u) { boxSetS([...box.s, 'uid:' + myUid()]); return false; }
    const id = u.slice(4);
    if (!id || id === myUid()) return false;
    try { localStorage.setItem('sb-uid', id); } catch (err) { return false; }
    window.SB_UID = id; boxWrite(HEART_SENT, null);
    setTimeout(() => location.reload(), 300);
    return true;
  }
  // 앱을 열 때 서버 쪽이 더 새로우면 받아와요
  function boxPull() {
    if (!boxUser || !boxApi()) return;
    boxCall('load').then(r => {
      if (!r.ok || !r.data) return;
      const srv = boxClean(r.data);
      if (srv.t > box.t) { box = boxClean(srv); boxWrite(BOX_KEY, box); if (uidSync() | kvApply()) return; if (currentRoute() === 'box') renderBase('box'); }
      else if (box.t > srv.t) boxPush();
      if (!uidSync()) kvTouch();
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

  // ---------- 새 소식 (팬용 업데이트 안내) — 새 소식은 맨 위에 추가 ----------
  const NEWS = [
    { d: '2026-10-25', t: '화면 꾸미기가 생겼어요 🎨', s: '더보기의 \'화면 꾸미기\'에서 숲·밤하늘·벚꽃·바다·노을·라벤더 중 좋아하는 색을 고르고, 글씨 크기도 작게·보통·크게로 바꿀 수 있어요. 이 폰에만 기억해요.', a: '#/more' },
    { d: '2026-10-25', t: '숲별 이야기가 생겼어요 💬', s: '숲별들이 남긴 💡 TMI, 💬 좋아하는 가사, 📣 떼창 구간이 새로 올라온 순서로 한곳에 모여요. 바로 ♥를 누를 수 있고, ♥ 10개가 넘으면 BEST가 돼요. TMI에는 답글도 달 수 있고, 다른 나라 말로 쓴 글은 🌐 번역 보기로 바로 읽을 수 있어요.', a: '#/story' },
    { d: '2026-10-25', t: '좋아하는 가사를 카드로 만들어요 🖼', s: '좋아하는 가사·떼창 옆 🖼를 누르면 정사각형 이미지로 저장하거나 바로 공유할 수 있어요. 배경 5가지·글씨 4가지 중에 고를 수 있고, X에 올리면 곡 링크도 같이 적혀요.', a: '#/songs' },
    { d: '2026-10-25', t: '곡 아카이브가 새로워졌어요 🎵', s: '필터와 정렬(최근 부른 순·하트 많은 순 등)로 골라 보고, 언어별로도 볼 수 있어요. 오른쪽 \'보기 ▾\'에서 무대 수·언어·TMI 수처럼 보고 싶은 정보만 골라 띄울 수 있어요.', a: '#/songs' },
    { d: '2026-10-25', t: '모든 숲별의 하트·소취곡 수가 보여요 ♥', s: '곡과 일정에 숲별들이 누른 ♥ 수, 곡마다 🙏 듣고 싶어 하는 숲별 수가 떠요(3명 이상부터). 홈에는 \'듣고 싶은 곡 TOP 5\'가 생겼어요. 전에 골라 둔 것도 세어지도록 한 번 새로고침해 주세요.', a: '#/songs' },
    { d: '2026-10-25', t: '최애곡·소취곡·입덕곡을 골라 모아요 💚', s: '곡 화면에서 💚 최애곡·🙏 소취곡·🌱 입덕곡을 몇 곡이든 고를 수 있어요. 숲별 카드에 넣은 곡도 같이 보이고, 보관함 \'🎵 곡\'에 모여요.', a: '#/songs' },
    { d: '2026-10-25', t: '떼창 구간·좋아하는 가사·TMI를 나눠요 📣', s: '곡 화면에서 📣 떼창 구간과 💬 좋아하는 가사를, 곡·콘서트·일정 화면에서 💡 TMI를 남기고 숲별들과 공유할 수 있어요. 같은 걸 봤다면 ♥, 이상한 글은 🚩로 알려 주세요.', a: '#/songs' },
    { d: '2026-10-25', t: '예전 일정 80여 개가 들어왔어요 📅', s: '2017~2020년 라디오·방송·멤버 개인 일정을 더 채웠어요. 두훈 님 뮤지컬(빈센트 반 고흐·렌트·미드나잇) 회차 날짜도 들어가서 본 회차를 골라 직관을 누를 수 있어요.', a: '#/timeline' },
    { d: '2026-10-25', t: '숲별 발자국 지도에 일정이 훨씬 많아졌어요 👣', s: '멤버 개인 일정도 지도에 찍혀요. 지도 밑 \'위치 확인이 필요한 일정\'에서 장소를 하나씩 알려 주거나 \'한꺼번에 찾기\'로 여러 곳을 한 번에 찾을 수 있어요. 처음 알려 준 위치는 바로 지도에 들어가요.', a: '#/map' },
    { d: '2026-10-25', t: '일정 정보 고치기가 한 버튼으로 모였어요 ✏️', s: '일정 상세의 \'✏️ 정보 고치기\'를 누르면 날짜·장소·일정 이름·그 밖에 틀린 곳을 골라 보낼 수 있어요. 일정 이름도 이제 고칠 수 있어요.', a: '#/timeline' },
    { d: '2026-10-25', t: '유튜브·공연·공식 X를 필터로 골라 볼 수 있어요 🔍', s: '유튜브는 채널(방송사·소속사/제작사 따로)·종류·연도·멤버로, 공연·행사와 공식 X는 지역·종류·연도·달로 골라 볼 수 있어요. 고른 건 다음에 와도 기억해요.', a: '#/yt' },
    { d: '2026-10-23', t: '홈 화면을 내 마음대로 바꿀 수 있어요 ✎', s: '홈 맨 아래 \'✎ 홈 화면 편집\'에서 보고 싶은 칸만 켜고 순서를 바꿀 수 있어요. 더보기에서 고른 자주 쓰는 메뉴도 홈에 올릴 수 있어요.', a: '#/' },
    { d: '2026-10-23', t: '일정 장소를 알려 줄 수 있어요 📍', s: '일정 상세의 \'📍 장소 알려주기\'에서 공연장을 검색해 골라 주세요. 숲별 발자국 지도에도 그 자리로 찍혀요.', a: '#/timeline' },
    { d: '2026-10-23', t: '자주 쓰는 메뉴를 고정할 수 있어요 ⭐', s: '더보기 맨 위 \'☆ 자주 쓰는 메뉴 맨 위에 고정하기\'를 누르고 메뉴의 ☆를 눌러 보세요. 고른 메뉴가 맨 위에 아이콘으로 모여요.', a: '#/more' },
    { d: '2026-10-23', t: '숲별 발자국 지도가 열렸어요 👣', s: '보관함에서 🎫 직관했어요를 누른 공연이 한반도 지도에 지역별로 모여요. \'숲길 따라걷기\'를 누르면 처음 간 공연부터 차례로 따라가요. 멤버·종류·연도로 골라 볼 수 있어요.', a: '#/map' },
    { d: '2026-10-23', t: '숲별 카드가 더 예뻐졌어요 🎫', s: '티켓 · 영수증 · 플레이리스트 모양, 내 사진 스티커, 소취곡, 보관함 기록으로 받는 뱃지, 새 카드 색을 넣었어요.', a: '#/card' },
    { d: '2026-10-23', t: '콘서트 셋리를 직접 고칠 수 있어요', s: '콘서트 화면 아래 \'셋리 고치기\'로 1부·2부·앵콜까지 고쳐 보내 주세요. 다른 두 분이 맞다고 하면 확정돼요.', a: '#/concerts' },
    { d: '2026-10-23', t: '영어·일본어로도 볼 수 있어요 🌐', s: '홈 위 🌐 버튼이나 더보기의 언어에서 바꿀 수 있어요. 메뉴와 버튼이 바뀌고, 일정 이름까지 보려면 \'전체 번역\'을 눌러 주세요.', a: '#/more' },
    { d: '2026-10-23', t: '두훈 님 뮤지컬 일정이 들어왔어요', s: '공연 기간으로 들어가 있고, 출연한 회차는 팬분들이 직접 올려 주실 수 있어요. 내가 본 회차를 누르면 보관함 직관에 들어가요.', a: '#/e/20222' },
    { d: '2026-10-23', t: '팬 제보 현황을 한눈에 볼 수 있어요', s: '팬분들이 올린 일정 · 셋리 · 날짜 고치기가 몇 개인지, 확인이 필요한 게 뭔지 모아 봐요.', a: '#/fan' },
    { d: '2026-10-23', t: '의견에 사진을 붙일 수 있어요', s: '의견 남기기 · 틀린 곳 알려주기에서 "📷 사진 붙이기"로 캡처를 같이 보내 주세요. 사진은 관리자만 보고 30일 뒤 지워져요.', a: '#/opinion' },
    { d: '2026-10-23', t: '숲별 카드 한마디가 40자까지 늘었어요', s: '길면 글씨가 조금 작아지고 두 줄로 나와요. 좋아하는 가사도 넣어 보세요.', a: '#/card' },
    { d: '2026-10-23', t: '일정 날짜가 틀렸으면 고칠 수 있어요', s: '일정 상세에서 "📅 날짜가 달라요"로 알려주시고, 다른 두 분이 "맞아요"를 누르면 바뀌어요.' },
    { d: '2026-10-23', t: '의견 답글에 또 답글을 달 수 있어요', a: '#/opinion' },
    { d: '2026-10-23', t: '같은 일정을 또 등록하려고 하면 알려드려요', s: '앞뒤 하루에 비슷한 일정이 있으면 "이 일정에 붙이기"를 고를 수 있어요.', a: '#/add' },
    { d: '2026-10-22', t: '의견 남기기가 생겼어요', s: '정보 수정 · 오류 신고 · 기능 요청 · 응원 무엇이든 모든 화면 아래 💬 버튼으로 남겨 주세요.', a: '#/opinion' },
    { d: '2026-10-22', t: '빠진 일정을 직접 등록할 수 있어요', s: '연표의 "＋ 일정 등록"이나 더보기 → 일정 등록에서 올리면, 다른 두 분이 확인하면 확정돼요.', a: '#/add' },
    { d: '2026-10-22', t: '셋리스트를 알려주고 고칠 수 있어요', s: '일정 상세에서 셋리를 올리면 바로 붙고, 두 분이 "맞아요"를 누르면 확정돼요.' },
    { d: '2026-10-22', t: '숲별 카드를 만들 수 있어요', s: '입덕일 · 직관 · 최애곡을 카드로 그려서 저장해요.', a: '#/card' },
    { d: '2026-10-22', t: '콘서트 화면에 멤버 단독 공연이 생겼어요', a: '#/concerts' },
    { d: '2026-10-21', t: '보관함이 생겼어요', s: '일정 ♥ · 직관 · 방청 · 곡 ♥ · 들은 곡을 모아 봐요.', a: '#/box' },
    { d: '2026-10-21', t: '공연·행사를 지역별로 볼 수 있어요', a: '#/local' },
  ];
  const NEWS_SEEN = 'sb-news-seen';
  function newsSeen() {
    try { return localStorage.getItem(NEWS_SEEN); } catch (err) { return null; }
  }
  // 처음 온 분은 최근 3일 소식만 새 소식으로 세요
  function newsUnread() {
    const seen = newsSeen() || new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    return NEWS.filter(n => n.d > seen);
  }
  function newsView() {
    const unread = new Set(newsUnread());
    try { if (NEWS.length) localStorage.setItem(NEWS_SEEN, NEWS[0].d); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
    let last = '';
    return `
      <div class="about-top">
        <a class="back" href="#/more">‹ 더보기</a>
        <h1 class="h1">새 소식</h1>
        <p>숲별 기록장에 새로 생긴 기능이에요.</p>
      </div>
      <div class="news-list">${NEWS.map(n => {
        const day = n.d !== last ? `<div class="news-day">${n.d.slice(0, 4)}.${n.d.slice(5, 7)}.${n.d.slice(8)}</div>` : '';
        last = n.d;
        const body = `<span class="news-t">${unread.has(n) ? '<span class="news-new">NEW</span>' : ''}${esc(n.t)}</span>${n.s ? `<span class="news-s">${esc(n.s)}</span>` : ''}`;
        return day + (n.a ? `<a class="news-item" href="${n.a}">${body}<span class="news-go">›</span></a>` : `<div class="news-item">${body}</div>`);
      }).join('')}</div>`;
  }

  // ---------- 팬 제보 현황: 팬들이 올린 일정 · 셋리 · 날짜 고치기를 최근 순으로 ----------
  const FAN_K = { ev: '새 일정', join: '정보 더함', sl: '셋리 올림', slfix: '셋리 고침', dt: '날짜 고치기', slok: '셋리 맞아요', evok: '일정 맞아요', dtok: '날짜 맞아요', cast: '캐스팅 회차' };
  function fanState(l, e) {
    if (l.k === 'ev') return e.fanEvent && e.fanEvent.ok ? ['ok', '확정'] : ['wait', `확인 필요 ${(e.fanEvent || {}).n || 0}/2`];
    if (l.k === 'sl' || l.k === 'slfix') {
      const f = e.fanSet;
      if (!f || f.ver !== l.ver) return ['old', '새 판으로 바뀜'];
      return f.ok ? ['ok', '확정'] : ['wait', `확인 필요 ${f.n}/2`];
    }
    if (l.k === 'dt') {
      if (e.dateWas && e.date === l.to) return ['ok', '확정'];
      const p = (e.dateProps || []).find(x => x.to === l.to);
      return p ? ['wait', `확인 필요 ${p.n}/2`] : ['old', '반영 안 됨'];
    }
    return ['', ''];
  }
  function fanAgo(t) {
    const m = Math.round((Date.now() - t) / 6e4);
    if (!t) return '';
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    if (m < 1440) return Math.floor(m / 60) + '시간 전';
    const d = new Date(t + 9 * 3600e3);
    return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
  }
  function fanView() {
    const me = myUid(), log = data.fan || [];
    const row = l => {
      const e = data.byId.get(l.id);
      if (!e) return '';
      const [cls, st] = fanState(l, e);
      const what = l.k === 'cast' ? md2(l.to) : l.k === 'dt' ? `${md2(l.from || e.dateWas || e.date)} → ${md2(l.to)}` : l.k === 'dtok' ? `→ ${md2(l.to)}` : (l.k === 'sl' || l.k === 'slfix' || (l.k === 'join' && l.songs)) ? `${l.songs}곡` : '';
      return `<a class="fan-item${/ok$/.test(l.k) ? ' fan-small' : ''}" href="#/e/${encodeURIComponent(l.id)}">
        <span class="fan-top"><span class="fan-k fan-k-${l.k}">${FAN_K[l.k]}</span>${what ? `<span class="fan-what">${esc(what)}</span>` : ''}${st ? `<span class="fan-st fan-${cls}">${esc(st)}</span>` : ''}</span>
        <span class="fan-title">${esc(e.title)}</span>
        <span class="fan-sub">${esc(fmtDate(e.date))}${l.by && l.by === me ? ' · <b>내가 보냄</b>' : ''}<span class="fan-ago">${fanAgo(l.at)}</span></span></a>`;
    };
    // 확인 필요: 일정마다 아직 확정 안 된 최신 것만
    const seen = new Set(), wait = log.filter(l => {
      const e = data.byId.get(l.id);
      if (!e || !/^(ev|sl|slfix|dt)$/.test(l.k) || fanState(l, e)[0] !== 'wait') return false;
      const key = l.id + (l.k === 'dt' ? ':dt' + l.to : l.k === 'ev' ? ':ev' : ':sl');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const list = l => { const c = l.map(row).filter(Boolean); return c.length ? moreList(c, 20).replace('stack x-list', 'stack fan-list') : '<p class="empty">아직 없어요.</p>'; };
    // 대시보드 카드: 팬분들이 지금까지 몇 개 올렸는지 (확정 · 확인 필요)
    const evs = data.events.filter(e => e.fanEvent);
    const sls = data.events.filter(e => e.fanSet && e.fanSet.src === e.id);
    const dts = new Map();
    log.filter(l => l.k === 'dt').forEach(l => { const k = l.id + l.to; if (!dts.has(k)) dts.set(k, fanState(l, data.byId.get(l.id))[0]); });
    const newSongs = [...data.songs.values()].filter(songPending);
    const day = log.filter(l => Date.now() - l.at < 864e5).length;
    // 바뀐 사항: 셋리를 고친 것, 확정돼서 날짜가 바뀐 것, 이미 있던 일정에 시간·장소·영상·셋리를 더한 것
    const chg = log.filter(l => l.k === 'slfix' || l.k === 'join' || (l.k === 'dt' && fanState(l, data.byId.get(l.id))[0] === 'ok'));
    const f = new URLSearchParams(location.hash.split('?')[1] || '').get('f') || '';
    const card = (key, label, n, sub) => `<a class="fan-card${f === key ? ' on' : ''}" href="#/fan${f === key ? '' : '?f=' + key}"><span class="fan-card-l">${label}</span><b class="fan-card-n">${n}</b><span class="fan-card-s">${sub}</span></a>`;
    const split = (ok, all) => `확정 ${ok} · 확인 필요 ${all - ok}`;
    const cards = `<div class="fan-cards">
      ${card('ev', '등록된 일정', evs.length, split(evs.filter(e => e.fanEvent.ok).length, evs.length))}
      ${card('sl', '올라온 셋리', sls.length, split(sls.filter(e => e.fanSet.ok).length, sls.length))}
      ${card('song', '새로 들어온 곡', newSongs.length, '셋리 확정 전')}
      ${card('dt', '날짜 고치기', dts.size, split([...dts.values()].filter(x => x === 'ok').length, [...dts.values()].filter(x => x !== 'old').length))}
      ${card('chg', '바뀐 사항', chg.length, [['셋리', 'slfix'], ['날짜', 'dt'], ['정보 더함', 'join']].map(([w, k]) => [w, chg.filter(l => l.k === k).length]).filter(x => x[1]).map(x => x.join(' ')).join(' · ') || '아직 없어요')}
      ${card('day', '최근 24시간', day, '제보 + 맞아요')}
    </div>`;
    const kinds = { ev: /^(ev|join|evok)$/, sl: /^(sl|slfix|slok)$/, dt: /^(dt|dtok)$/ };
    let body;
    if (f === 'song') body = newSongs.length ? `<div class="stack fan-list">${newSongs.map(so => `<a class="fan-item" href="#/song/${encodeURIComponent(so.key)}"><span class="fan-top"><span class="fan-k fan-k-sl">새 곡</span><span class="fan-st fan-wait">확인 필요</span></span><span class="fan-title">${esc(so.name)}</span><span class="fan-sub">${esc(so.events.map(e => e.title).slice(0, 2).join(' · '))}</span></a>`).join('')}</div>` : '<p class="empty">아직 없어요.</p>';
    else if (f === 'chg') body = list(chg);
    else if (f === 'day') body = list(log.filter(l => Date.now() - l.at < 864e5));
    else if (kinds[f]) body = paneTabs([
      { label: '확인 필요', n: wait.filter(l => kinds[f].test(l.k)).length, html: list(wait.filter(l => kinds[f].test(l.k))) },
      { label: '전체 기록', n: 0, html: list(log.filter(l => kinds[f].test(l.k))) },
    ]);
    else body = paneTabs([
      { label: '확인 필요', n: wait.length, html: list(wait) },
      { label: '전체 기록', n: 0, html: list(log) },
    ]);
    return `
      <div class="about-top">
        <a class="back" href="#/more">‹ 더보기</a>
        <h1 class="h1">팬 제보 현황</h1>
        <p>팬분들이 올린 일정 · 셋리 · 날짜예요. 다른 두 분이 '맞아요'를 누르면 확정돼요.</p>
      </div>
      ${cards}
      ${f ? `<div class="fan-filter">${{ ev: '등록된 일정', sl: '올라온 셋리', song: '새로 들어온 곡', dt: '날짜 고치기', chg: '바뀐 사항', day: '최근 24시간' }[f] || ''}만 보는 중 <a href="#/fan">전체 보기</a></div>` : ''}
      ${body}`;
  }

  // ---------- 숲별 이야기: 숲별들이 남긴 TMI·가사·떼창을 최신순으로 (새 글 수는 이 폰에서 마지막으로 본 뒤로) ----------
  const STORY_SEEN = 'sb-story-seen';
  const STORY_KINDS = [['', '전체'], ['best', '🏆 BEST'], ['TMI', '💡 TMI'], ['가사', '💬 가사'], ['떼창', '📣 떼창']];
  const STORY_BEST = 10, STORY_PAGE = 30;
  let storyBase = null;
  // 오늘 올라온 글은 빨간 N (오늘이 아니어도 아직 안 본 글은 NEW)
  const storyToday = l => new Date(l.at).toDateString() === new Date().toDateString();
  const storyTag = (l, fresh) => storyToday(l) ? '<em class="n-dot" aria-label="오늘 올라온 글">N</em> ' : fresh.has(l.id) ? '<em class="nw-badge">NEW</em> ' : '';
  const storySeen = () => { const v = Number(boxRead(STORY_SEEN)); return v > 0 ? v : Date.now() - 3 * 864e5; };
  const storyAll = () => (data.lyrics || []).filter(l => l.kind !== 'TMI답글' && noteWhere(l));
  const storyUnread = () => { const seen = storySeen(), uid = myUid(); return storyAll().filter(l => l.at > seen && l.first !== uid); };
  const storyAgo = t => { const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? '오늘' : d < 30 ? `${d}일 전` : fmtDate(new Date(t).toISOString().slice(0, 10), false); };
  function storyRow(l, fresh) {
    const uid = myUid(), upLocal = new Set([...(boxRead('sb-ly-up') || []), ...(boxRead(CH_SENT) || []), ...(boxRead(TMI_SENT) || [])].map(x => x.id)), rpd = boxRead(RP_SENT) || [];
    const mine = l.first === uid, on = mine || l.who.includes(uid) || upLocal.has(l.id), n = l.n + (upLocal.has(l.id) && !l.who.includes(uid) ? 1 : 0);
    return `<div class="story-row${rpd.includes(l.id) ? ' rp-done' : ''}"><a class="x-card no-img note-card story-card" href="${noteHref(l)}"><span class="x-text"><span class="x-date">${l.n >= STORY_BEST ? '<em class="nw-badge best-badge">BEST</em> ' : ''}${storyTag(l, fresh)}${NOTE_ICON[l.kind] || l.kind} · ${esc(noteWhere(l))} · ${storyAgo(l.at)}</span><span class="x-body">${l.kind === '가사' ? '“' + esc(l.text) + '”' : esc(l.text)}</span>${l.src ? `<span class="story-src">출처: ${esc(l.src)}</span>` : ''}</span></a>
        <span class="story-acts">${trBtn(l.text)}<button type="button" class="bpill st-up${on ? ' on' : ''}" data-id="${esc(l.id)}"${on ? ' disabled' : ''} aria-label="${l.kind === 'TMI' ? '나도 봤어요' : '좋아요'}">${on ? '♥' : '♡'} ${n}</button>${mine ? '' : rpBtn(l)}${l.kind === 'TMI' ? `<a class="st-re" href="${noteHref(l)}">💬 ${treCount(l.id) || '답글'}</a>` : ''}</span></div>`;
    }
  // 화면 꾸미기: 테마 색·글씨 크기 (이 폰에만 기억, sb-deco). 처음 그릴 때 깜빡이지 않게 index.html 머리에서도 한 번 넣어요
  const DECO_T = [['', '숲', '#1C7A5E'], ['night', '밤하늘', '#1F2286'], ['sakura', '벚꽃', '#AB274A'], ['sea', '바다', '#1E5782'], ['sunset', '노을', '#A35425'], ['lavender', '라벤더', '#6C2397']];
  const DECO_F = [['s', '작게'], ['', '보통'], ['l', '크게']];
  const decoGet = () => { try { return JSON.parse(localStorage.getItem('sb-deco') || '{}'); } catch (err) { return {}; } };
  const decoApply = d => { const h = document.documentElement; if (d.t) h.dataset.theme = d.t; else delete h.dataset.theme; if (d.f) h.dataset.fs = d.f; else delete h.dataset.fs; };
  window.SB_DECO = {
    label: () => { const d = decoGet(); return (DECO_T.find(x => x[0] === (d.t || '')) || DECO_T[0])[1] + (d.f ? ' · 글씨 ' + DECO_F.find(x => x[0] === d.f)[1] : ''); },
    open() {
      const old = document.getElementById('deco-sheet'); if (old) { old.remove(); return; }
      const w = document.createElement('div'); w.id = 'deco-sheet'; w.className = 'lang-sheet deco-sheet';
      const draw = () => { const d = decoGet(); w.innerHTML = `<div class="lang-box" role="dialog" aria-label="화면 꾸미기"><b>🎨 화면 꾸미기</b><p>테마 색</p>
        <div class="deco-colors">${DECO_T.map(([k, l, c]) => `<button type="button" class="deco-c${(d.t || '') === k ? ' on' : ''}" data-t="${k}"><i style="background:${c}"></i>${l}</button>`).join('')}</div>
        <p>글씨 크기</p><div class="deco-fs">${DECO_F.map(([k, l]) => `<button type="button" class="${(d.f || '') === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
        <p>이 폰에만 기억해요.</p><button type="button" class="lang-x">닫기</button></div>`; };
      draw();
      w.onclick = ev => {
        const t = ev.target.closest('[data-t]'), f = ev.target.closest('[data-f]'), d = decoGet();
        if (t) d.t = t.dataset.t; else if (f) d.f = f.dataset.f;
        if (t || f) { try { localStorage.setItem('sb-deco', JSON.stringify(d)); } catch (err) { /* 괜찮아요 */ } decoApply(d); draw(); document.querySelectorAll('.lang-row b').forEach(b => { if (b.parentElement.getAttribute('onclick') === 'SB_DECO.open()') b.textContent = SB_DECO.label(); }); return; }
        if (ev.target === w || ev.target.closest('.lang-x')) w.remove();
      };
      document.body.appendChild(w);
    },
  };
  // 번역 보기: 사이트 언어가 한국어가 아니거나, 글이 한국어가 아니면 버튼이 보여요. 누르면 그 자리에서 바로 번역돼요.
  const trTo = () => { const g = (window.SB_LANG && SB_LANG.lang) || 'ko'; return g; };
  const trNeed = t => { const h = (t.match(/[가-힣]/g) || []).length; return trTo() !== 'ko' ? h > 0 : h < t.replace(/\s/g, '').length * 0.3; };
  const trBtn = t => trNeed(t) ? `<button type="button" class="st-tr">🌐 번역 보기</button>` : '';
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.st-tr');
    if (!b) return;
    const body = b.closest('.story-row')?.querySelector('.x-body');
    if (!body) return;
    if (body.dataset.orig != null) { body.textContent = body.dataset.orig; delete body.dataset.orig; b.textContent = '🌐 번역 보기'; return; }
    const orig = body.textContent;
    b.textContent = '번역 중…'; b.disabled = true;
    try {
      const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=' + trTo() + '&q=' + encodeURIComponent(orig));
      const j = await r.json(), out = (j[0] || []).map(x => x[0]).join('');
      if (!out) throw 0;
      body.dataset.orig = orig; body.textContent = out; b.textContent = '원문 보기';
    } catch (err) { b.textContent = '번역이 안 돼요 · 다시'; }
    b.disabled = false;
  });
  function storyView() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || ''), k = qs.get('k') || '', o = qs.get('o') || '', pg = Math.max(1, parseInt(qs.get('p'), 10) || 1);
    // 같은 방문 안에서 다시 그려도(자료 새로 받음·쪽 넘김) NEW가 그대로 보이게, 들어온 때의 기준을 1분 동안 써요
    if (!storyBase || Date.now() - storyBase.at > 60000) storyBase = { seen: storySeen(), at: Date.now() };
    storyBase.at = Date.now();
    const uid0 = myUid(), fresh = new Set(storyAll().filter(l => l.at > storyBase.seen && l.first !== uid0).map(l => l.id));
    const newest = Math.max(0, ...storyAll().map(l => l.at));
    if (newest > storySeen()) boxWrite(STORY_SEEN, newest);
    const all = storyAll(), list = all.filter(l => !k || (k === 'best' ? l.n >= STORY_BEST : l.kind === k)).sort((a, b) => o === 'heart' ? b.n - a.n || b.at - a.at : b.at - a.at);
    const ago = t => { const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? '오늘' : d < 30 ? `${d}일 전` : fmtDate(new Date(t).toISOString().slice(0, 10), false); };
    const href = (kk, oo, pp) => '#/story' + ((kk || oo || pp > 1) ? '?' + [kk && 'k=' + encodeURIComponent(kk), oo && 'o=' + oo, pp > 1 && 'p=' + pp].filter(Boolean).join('&') : '');
    const pages = Math.max(1, Math.ceil(list.length / STORY_PAGE)), cur = Math.min(pg, pages);
    // 쪽 번호: 처음·끝과 지금 쪽 앞뒤 두 쪽까지
    const nums = [...new Set([1, pages, ...[-2, -1, 0, 1, 2].map(d => cur + d)])].filter(x => x >= 1 && x <= pages).sort((a, b) => a - b);
    const pager = pages < 2 ? '' : `<nav class="pager">${cur > 1 ? `<a href="${href(k, o, cur - 1)}" aria-label="이전 쪽">‹</a>` : ''}${nums.map((x, i) => (i && x - nums[i - 1] > 1 ? '<span>…</span>' : '') + (x === cur ? `<b>${x}</b>` : `<a href="${href(k, o, x)}">${x}</a>`)).join('')}${cur < pages ? `<a href="${href(k, o, cur + 1)}" aria-label="다음 쪽">›</a>` : ''}</nav>`;
    const row = l => storyRow(l, fresh);
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">숲별 이야기${help('숲별들이 곡·콘서트·일정에 남긴 💡 TMI, 💬 좋아하는 가사, 📣 떼창 구간이 새로 올라온 순서로 모여요. 누르면 그 화면으로 가서 ♥나 🚩를 누를 수 있어요.')}</h1>
      <div class="box-tabs story-tabs">${STORY_KINDS.map(([v, l]) => `<a class="box-tab${v === k ? ' on' : ''}" href="${href(v, o)}">${l}</a>`).join('')}</div>
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}개${fresh.size ? ` · 새 글 ${fresh.size}` : ''}</p><span class="story-sort"><a class="${o ? '' : 'on'}" href="${href(k, '')}">최신순</a> · <a class="${o ? 'on' : ''}" href="${href(k, 'heart')}">♥ 많은 순</a></span></div>
      ${list.length ? `<div class="stack">${list.slice((cur - 1) * STORY_PAGE, cur * STORY_PAGE).map(row).join('')}</div>${pager}` : `<p class="empty">${k === 'best' ? `아직 ♥ ${STORY_BEST}개 넘은 이야기가 없어요.` : '아직 올라온 이야기가 없어요. 곡·콘서트 화면에서 처음으로 남겨 보세요.'}</p>`}`;
  }
  // 숲별 이야기에서 바로 ♥: 곡 화면에서 누를 때와 같은 줄을 보내요
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.st-up');
    if (!b || b.disabled) return;
    const l = (data.lyrics || []).find(x => x.id === b.dataset.id); if (!l) return;
    const by = myUid(), at = Date.now();
    const so = l.kind === 'TMI' ? null : data.songs.get(l.key);
    const text = l.kind === 'TMI' ? `종류: TMI\n곡: ${noteWhere(l)}\n곡키: ${l.key}\n출처: \n누가: ${by}\n내용: ${l.text}` : l.kind === '떼창' ? `종류: 떼창\n곡: ${so ? so.name : ''}\n곡키: ${l.key}\n누가: ${by}\n내용: ${l.text}` : `종류: 가사\n곡: ${so ? so.name : ''}\n곡키: ${l.key}\n누가: ${by}\n내용: ${l.text}`;
    b.disabled = true;
    formPost(text).then(() => {
      const item = { id: l.id, key: l.key, t: l.text, at, up: 1 };
      if (l.kind === 'TMI') boxWrite(TMI_SENT, [...(boxRead(TMI_SENT) || []).filter(x => x.id !== l.id), item].slice(-200));
      else if (l.kind === '떼창') boxWrite(CH_SENT, [...(boxRead(CH_SENT) || []).filter(x => x.id !== l.id), item].slice(-200));
      else { boxWrite('sb-ly-sent', [...(boxRead('sb-ly-sent') || []), l.id].slice(-300)); boxWrite('sb-ly-up', [...(boxRead('sb-ly-up') || []).filter(x => x.id !== l.id), item].slice(-300)); }
      b.classList.add('on'); b.textContent = '♥ ' + (l.n + 1);
      toast('♥ 눌렀어요. 보관함 \'♥ 누른 글\'에도 모여요.');
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  });
  function bindHome() {
    const nn = newsUnread().length, nb = document.getElementById('news-home');
    const sn = storyUnread().length;
    // 새 소식 · 숲별 이야기 새 글을 한 줄로 (0건인 쪽은 빠져요)
    if (nb && (nn || sn)) nb.innerHTML = `<div class="news-bar">${nn ? `<a href="#/news">${wi('news')}새 소식 <b>${nn}</b><span>›</span></a>` : ''}${sn ? `<a href="#/story">${wi('chat')}숲별 이야기 <b>${sn}</b><span>›</span></a>` : ''}</div>`;
    // 관리자 기기에서만: 아직 안 읽은 의견 수
    if (isAdmin()) loadOpinions().then(() => {
      const box = document.getElementById('op-home'), n = opUnread().length;
      const d = delPending().length;
      if (box && (n || d)) box.innerHTML = (n ? `<a class="op-home" href="#/opinion">💬 새 의견 <b>${n}</b>건 <span>바로가기 ›</span></a>` : '') + (d ? `<a class="op-home" href="#/admin">📮 삭제 요청 <b>${d}</b>건 <span>바로가기 ›</span></a>` : '');
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
    const range = { from: qs.get('from') || '', to: qs.get('to') || '' };
    if (nick) return { ...range, q: '', cat: qs.get('cat') || '', year: qs.get('year') || '', member: nick, video: qs.get('video') === '1', t: qs.get('t') || '', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
    return { ...range, q: qs.get('q') || '', cat: qs.get('cat') || '', year: qs.get('year') || '', member: qs.get('member') || '', video: qs.get('video') === '1', t: qs.get('t') || '', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
  }
  function writeParams(p) {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.cat) qs.set('cat', p.cat);
    if (p.year) qs.set('year', p.year);
    if (p.from) qs.set('from', p.from);
    if (p.to) qs.set('to', p.to);
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
      (!p.from || e.date >= p.from) && (!p.to || e.date <= p.to) &&
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
    const vids = (data.official || []).filter(v => hit(vidText(v)) && (!p.member || v.members.includes(p.member)) && (!p.year || v.date.startsWith(p.year)) && (!p.from || v.date >= p.from) && (!p.to || v.date <= p.to));
    const rels = [
      ...(data.albums || []).filter(a => hit(a.name) && (!p.member || a.member === p.member)).map(a => ({ href: albHref(a), kind: a.member ? a.member + ' 음반' : '음반', name: a.name, sub: a.date.replace(/-/g, '.'), img: a.img && imgSize(a.img, 'thumb') })),
      ...(data.concerts && data.concerts.length ? data.concerts : data.tours).filter(c => hit(c.name)).map(c => ({ href: '#/tour/' + encodeURIComponent(c.id), kind: '콘서트', name: c.name, sub: c.from ? c.from.replace(/-/g, '.') : '', img: c.img ? imgSize(c.img, 'thumb') : c.tour ? tourPic(c.tour) : c.events ? tourPic(c) : '' })),
      ...programList().map(p => p.name).filter(hit).map(pg => ({ href: progHref(pg), kind: '프로그램', name: pg + ' 모아보기', sub: '' })),
    ];
    // 공식 X: 글에 검색어가 있거나, 찾은 곡이 나온 글
    const xset = new Set((data.xFeed || []).filter(x => hit(x.raw)));
    songs.forEach(so => songX(so).forEach(x => xset.add(x)));
    const xs = [...xset].filter(x => (!p.member || x.m.includes(p.member)) && (!p.year || x.date.startsWith(p.year)) && (!p.from || x.date >= p.from) && (!p.to || x.date <= p.to)).sort((a, b) => b.date.localeCompare(a.date));
    // 팬들이 공유한 가사·떼창·TMI (글에 검색어가 있거나, 찾은 곡에 달린 것)
    const sk = new Set(songs.map(so => so.key));
    const notes = (data.lyrics || []).filter(l => l.kind !== 'TMI답글').filter(l => hit(l.text) || sk.has(l.key) || (l.kind === 'TMI' && sk.has(l.key.slice(2)))).filter(l => noteWhere(l)).sort((a, b) => (hit(b.text) - hit(a.text)) || b.n - a.n || b.at - a.at);
    // 📝 준비물 창 메모 (이 폰에만 있는 것)
    const rr = rd(), memos = !m ? [] : [...Object.entries(rr.evMemo || {}).filter(([id, t]) => t && hit(t) && data.byId.get(id)).map(([id, t]) => ({ id, t, e: data.byId.get(id) })).sort((a, b) => b.e.date.localeCompare(a.e.date)), ...(rr.memo && hit(rr.memo) ? [{ id: '', t: rr.memo }] : [])];
    return { songs, vids, rels, xs, notes, memos };
  }
  // 가사·떼창·TMI가 달린 곳 (곡 키, TMI는 's:곡키' 'e:일정ID' 't:투어ID')
  const noteHref = l => { const k = l.kind === 'TMI' ? l.key : 's:' + l.key; return k.startsWith('e:') ? '#/e/' + encodeURIComponent(k.slice(2)) : k.startsWith('t:') ? '#/tour/' + encodeURIComponent(k.slice(2)) : '#/song/' + encodeURIComponent(k.slice(2)); };
  const noteWhere = l => { const k = l.kind === 'TMI' ? l.key : 's:' + l.key, id = k.slice(2); return k.startsWith('e:') ? (data.byId.get(id) || {}).title : k.startsWith('t:') ? (((data.tours || []).find(t => t.id === id) || (data.concerts || []).find(c => c.id === id) || {}).name) : (data.songs.get(id) || {}).name; };
  const memoCard = x => `<a class="x-card no-img note-card"${x.e ? ` href="#/e/${encodeURIComponent(x.id)}"` : ' href="#/wait"'}><span class="x-text"><span class="x-date">📝 내 메모 · ${x.e ? `${esc(fmtDate(x.e.date, false))} ${esc(x.e.title)}` : '다음 공연에도 쓰는 메모'}</span><span class="x-body">${esc(x.t)}</span></span></a>`;
  const NOTE_ICON = { '가사': '💬 가사', '떼창': '📣 떼창', 'TMI': '💡 TMI' };
  const noteCard = l => `<a class="x-card no-img note-card" href="${noteHref(l)}"><span class="x-text"><span class="x-date">${NOTE_ICON[l.kind] || l.kind} · ${esc(noteWhere(l))}${l.n > 1 ? ` · ♥ ${l.n}` : ''}</span><span class="x-body">${l.kind === '가사' ? '“' + esc(l.text) + '”' : esc(l.text)}</span></span></a>`;
  const xMini = x => `<a class="x-card${x.img ? '' : ' no-img'}" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img ? `<img src="${esc(x.img)}?name=thumb" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="x-text"><span class="x-date">${esc(x.date.replace(/-/g, '.'))} · ${esc(x.cat)}</span>${esc(x.text || '(글 없음)')}</span></a>`;
  function searchTabs(p, evN) {
    const h = searchHits(p);
    const tabs = [['', '전체'], ['ev', '일정', evN], ['song', '곡', h.songs.length], ['yt', '유튜브', h.vids.length], ['rel', '음반·콘서트', h.rels.length], ['x', '공식 X', h.xs.length], ['note', '가사·TMI', h.notes.length], ['memo', '내 메모', h.memos.length]];
    return `<div class="chips s-tabs">${tabs.filter(([t, , n]) => n !== 0 || (p.t || '') === t).map(([t, l, n]) => `<a class="chip${(p.t || '') === t ? ' on' : ''}" href="#" data-t="${t}">${l}${n != null ? ` <b>${n.toLocaleString()}</b>` : ''}</a>`).join('')}</div>`;
  }
  const relCard = x => `<a class="x-card${x.img ? '' : ' no-img'}" href="${x.href}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="x-text"><span class="x-date">${esc(x.kind)}${x.sub ? ' · ' + esc(x.sub) : ''}</span><b>${esc(x.name)}</b></span></a>`;
  // 곡 요약 (곡 목록·검색 결과 공통)
  const songMeta = (so, plain) => [stageN(so) ? (plain ? `무대 ${stageN(so)}` : `<b>무대 ${stageN(so)}</b>`) : '', (so.official || []).length ? `영상 ${so.official.length}` : '', so.tours.length ? `콘서트 ${so.tours.length}` : '', so.titleOf.length ? '타이틀' : ''].filter(Boolean).join(' · ');
  const songCard = so => relCard({ href: '#/song/' + encodeURIComponent(so.key), kind: '곡', sub: songMeta(so, true), name: so.name, img: songPic(so) });
  function searchAll(p) {
    const h = searchHits(p);
    const { list, fuzzy } = runSearch(p);
    // 비슷한 결과(정확히 맞는 게 없을 때)는 다른 종류가 있으면 빼요
    const others = h.songs.length + h.vids.length + h.rels.length + h.xs.length + h.notes.length + h.memos.length;
    const evs = fuzzy && others ? [] : list;
    const head = searchTabs(p, evs.length);
    const more = (t, n, unit) => n ? `<a class="more s-more" href="#" data-t="${t}">${n.toLocaleString()}${unit} 모두 보기 ›</a>` : '';
    if (p.t === 'song') return head + (h.songs.length ? moreList(h.songs.map(songCard), 20) : '<p class="empty">찾는 곡이 없어요.</p>');
    if (p.t === 'yt') return head + (h.vids.length ? `<div class="view-row"><p class="sub">${h.vids.length.toLocaleString()}개</p>${albumBtn()}</div>${ytList(h.vids)}` : '<p class="empty">찾는 영상이 없어요.</p>');
    if (p.t === 'x') return head + (h.xs.length ? moreList(h.xs.map(xMini), 20) : '<p class="empty">찾는 공식 X 글이 없어요.</p>');
    if (p.t === 'memo') return head + (h.memos.length ? `<div class="stack x-list">${h.memos.map(memoCard).join('')}</div>` : '<p class="empty">찾는 메모가 없어요.</p>');
    if (p.t === 'note') return head + (h.notes.length ? moreList(h.notes.map(noteCard), 20) : '<p class="empty">찾는 가사·TMI가 없어요.</p>');
    if (p.t === 'rel') return head + (h.rels.length ? `<div class="stack x-list">${h.rels.map(relCard).join('')}</div>` : '<p class="empty">찾는 음반·콘서트가 없어요.</p>');
    const sec = (title, n, body, t, unit) => n ? `<section class="s-sec"><div class="block-head"><h2 class="h3">${title} <span class="song-count">${n.toLocaleString()}</span></h2>${more(t, n, unit)}</div>${body}</section>` : '';
    const any = evs.length || others;
    return head + (any ? [
      sec('곡', h.songs.length, `<div class="stack x-list s-group">${h.songs.slice(0, 3).map(songCard).join('')}</div>`, 'song', '곡'),
      sec(fuzzy ? '비슷한 일정' : '일정', evs.length, `<div class="stack s-group">${evs.slice(0, 4).map(resultCard).join('')}</div>`, 'ev', '건'),
      sec('공식 유튜브', h.vids.length, ytStrip(h.vids.slice(0, 8)), 'yt', '개'),
      sec('음반·콘서트', h.rels.length, `<div class="stack x-list s-group">${h.rels.slice(0, 3).map(relCard).join('')}</div>`, 'rel', '개'),
      sec('공식 X', h.xs.length, `<div class="stack x-list s-group">${h.xs.slice(0, 3).map(xMini).join('')}</div>`, 'x', '개'),
      sec('📝 내 메모', h.memos.length, `<div class="stack x-list s-group">${h.memos.slice(0, 3).map(memoCard).join('')}</div>`, 'memo', '개'),
      sec('가사·떼창·TMI', h.notes.length, `<div class="stack x-list s-group">${h.notes.slice(0, 3).map(noteCard).join('')}</div>`, 'note', '개'),
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
    const top = [...data.songs.values()].filter(so => stageN(so)).sort((a, b) => stageN(b) - stageN(a)).slice(0, 10);
    return `
      ${recent.length ? `<h2 class="h3 list-title">최근 검색어 <button type="button" class="link-btn" id="clear-recent">지우기</button></h2>
      <div class="chips wrap">${recent.map(q => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      <h2 class="h3 list-title">많이 부른 곡</h2>
      <div class="chips wrap">${top.map(so => `<a class="chip" href="#/song/${encodeURIComponent(so.key)}">${esc(so.name)}</a>`).join('')}</div>
      <button type="button" class="btn btn-soft" id="show-all">전체 일정 ${data.events.length.toLocaleString()}건 보기</button>`;
  }

  let showAll = false;
  // 필터는 일정을 볼 때만: 검색 전 첫 화면이나 일정 말고 다른 탭에선 숨겨요
  const fHide = p => p.q ? p.t !== 'ev' : !(p.cat || p.year || p.from || p.to || p.member || p.video || showAll);
  function searchResults(p) {
    if (!p.q && !p.cat && !p.year && !p.from && !p.to && !p.member && !p.video && !showAll) return searchHome();
    if (p.q && p.t !== 'ev') return searchAll(p);
    const { list, fuzzy } = runSearch(p);
    const desc = [p.q && `'${p.q}'`, p.cat, p.year && `${p.year}년`, (p.from || p.to) && `${p.from ? fmtDate(p.from, false) : ''} ~ ${p.to ? fmtDate(p.to, false) : ''}`, p.member, p.video && '영상 있음'].filter(Boolean).join(' · ');
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

  // 검색 필터 접기 (기억해 둬요)
  const searchFold = () => { try { return localStorage.getItem('sb-sfold') === '1'; } catch (err) { return false; } };
  function searchView() {
    const p = readParams();
    const cats = [...new Set(data.events.map(e => e.category).filter(Boolean))];
    const years = [...new Set(data.events.map(e => e.date.slice(0, 4)))].sort().reverse();
    const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `
      <div class="search-top${searchFold() ? ' f-folded' : ''}">
        <a class="back" href="#/">‹ 홈</a>
        <form class="searchbox" role="search" id="search-form">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" name="q" aria-label="검색어" placeholder="곡·방송·영상·음반 찾기 · 초성 OK" value="${esc(p.q)}" autocomplete="off">
        </form>
        <button type="button" class="link-btn f-tog" id="f-tog">${searchFold() ? '필터 펼치기 ▾' : '필터 접기 ▴'}</button>
        <div class="f-date"><div class="f-date-h"><span>기간으로 찾기</span><button type="button" class="link-btn" id="f-clear"${p.from || p.to ? '' : ' hidden'}>지우기</button></div><div class="f-date-in"><input type="date" id="f-from" aria-label="언제부터" value="${esc(p.from)}"><span>~</span><input type="date" id="f-to" aria-label="언제까지" value="${esc(p.to)}"></div></div>
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
    // 기간: 언제부터~언제까지 (한쪽만 골라도 돼요). 검색어가 있어도 항상 보여요
    const tog = document.getElementById('f-tog');
    tog.onclick = () => { const f = !searchFold(); try { localStorage.setItem('sb-sfold', f ? '1' : '0'); } catch (err) { /* 괜찮아요 */ } tog.closest('.search-top').classList.toggle('f-folded', f); tog.textContent = f ? '필터 펼치기 ▾' : '필터 접기 ▴'; };
    const ff = document.getElementById('f-from'), ft = document.getElementById('f-to'), fc = document.getElementById('f-clear');
    const setRange = () => { update({ from: ff.value, to: ft.value }); fc.hidden = !(ff.value || ft.value); };
    ff.onchange = setRange; ft.onchange = setRange;
    fc.onclick = () => { ff.value = ''; ft.value = ''; setRange(); };
    // 연도·멤버 칩: 한 번 더 누르면 풀려요
    ['year', 'member'].forEach(k => document.querySelectorAll(`.chip[data-${k}]`).forEach(b => b.onclick = () => {
      update({ [k]: readParams()[k] === b.dataset[k] ? '' : b.dataset[k] });
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
  // 곡 아카이브 필터·정렬은 주소에 들어가요: #/songs?c=분류&m=멤버&y=연도&my=내 곡&s=정렬
  let songBack = '#/songs';
  const SONG_SORTS = [['name', '가나다순'], ['many', '많이 부른 순'], ['first', '처음 부른 순'], ['recent', '최근 부른 순'], ['heart', '하트 많은 순'], ['wish', '소취 많은 순']];
  const SONG_CATS = { video: '영상 있음', album: '음반 수록곡', concert: '콘서트에서 부른 곡', title: '타이틀곡', ver: '버전 여러 개', chant: '📣 떼창 구간 있음', nochant: '떼창 구간 없음' };
  const SONG_MY = { heart: '♥ 하트', fav: '💚 최애곡', wish: '🙏 소취곡', debut: '🌱 입덕곡', heard: '🎫 직관에서 들은 곡' };
  // 마지막으로 부른 날: 확인된 무대·콘서트 셋리 중 가장 늦은 날 (오늘 뒤 날짜는 빼요)
  // 콘서트 셋리로 부른 날: 투어 날짜 + 그 콘서트 공연 일정 날짜 (곡이 따로 적힌 일정 날은 빼요, 오늘 뒤 날짜도 빼요)
  const tourDays = so => {
    if (so._tdAt === data) return so._td;
    const today = todayIso(), own = new Set(so.events.map(e => e.date)), ds = new Set();
    so.tours.forEach(t => {
      (t.dates || []).forEach(d => ds.add(d));
      (data.concerts || []).filter(c => c.tour === t).forEach(c => concertEvents(c).forEach(e => { if (!e.songs.length) ds.add(e.date); }));
    });
    so._tdAt = data; return (so._td = [...ds].filter(d => d <= today && !own.has(d)).sort());
  };
  // 무대 수 = 확인된 무대 + 콘서트에서 부른 날
  const stageN = so => so.events.length + tourDays(so).length;
  const songLast = so => {
    if (so._lastAt === data) return so._last;
    const today = todayIso();
    const ds = [so.last && so.last.date, ...tourDays(so)].filter(d => d && d <= today).sort();
    so._lastAt = data; return (so._last = ds[ds.length - 1] || '');
  };
  const daysAgo = d => Math.max(0, Math.round((new Date(new Date().toISOString().slice(0, 10)) - new Date(d)) / 864e5));
  // 그 해에 부른 곡·나온 곡 (무대·콘서트·음반)
  const songInYear = (so, y) => so.events.some(e => e.date.startsWith(y)) || so.tours.some(t => t.dates.some(d => d.startsWith(y))) || so.albums.some(a => (a.date || '').startsWith(y));
  // 멤버 혼자만 부른 곡: 무대가 모두 멤버 개인 일정([형호] …, 강형호 단독 콘서트)이고, 음반도 멤버 솔로 음반뿐이고, 포레스텔라 콘서트 셋리에 없는 곡
  const evMember = e => { const m = (e.title.match(/^\[(두훈|형호|민규|우림)\]/) || [])[1]; if (m) return m; const f = Object.keys(SOLO_SHORT).find(n => e.title.includes(n)); return f && !/포레스텔라|forestella/i.test(e.title) ? SOLO_SHORT[f] : ''; };
  const soloOf = so => {
    if (so.soloFix) return so.soloFix;
    if (so._solo !== undefined) return so._solo;
    const ms = new Set();
    let group = (so.tours || []).length > 0;
    so.albums.forEach(a => { if (a.member) ms.add(SOLO_SHORT[a.member] || a.member); else group = true; });
    so.events.forEach(e => { const m = evMember(e); if (m) ms.add(m); else group = true; });
    return (so._solo = !group && ms.size ? ['두훈', '형호', '민규', '우림'].filter(m => ms.has(m)) : []);
  };
  const playCount = so => stageN(so);

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
    if (xp) return imgSize(xp.img, 'thumb');
    // 그래도 없으면 이 곡을 부른 콘서트 포스터
    const tp = so.tours.slice().reverse().find(t => t.info && t.info.img);
    return tp ? imgSize(tp.info.img, 'thumb') : '';
  }

  function songState() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const sort = qs.get('s') || '';
    return { c: multiOf(qs, 'c'), m: multiOf(qs, 'm'), l: multiOf(qs, 'l'), y: multiOf(qs, 'y'), my: multiOf(qs, 'my'), s: SONG_SORTS.some(x => x[0] === sort) ? sort : '' };
  }
  function songF() {
    const all = [...data.songs.values()];
    const years = [...new Set(all.flatMap(so => [...so.events.map(e => e.date), ...so.tours.flatMap(t => t.dates), ...so.albums.map(a => a.date || '')]).map(d => d.slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse();
    return {
      base: '#/songs', keys: ['c', 'm', 'l', 'y', 'my'], noSort: true,
      F: { c: ['분류', x => SONG_CATS[x]], m: ['멤버', x => x + ' 개인곡'], l: ['언어', x => x], y: ['연도', x => x], my: ['내 곡', x => SONG_MY[x]] },
      opts: { c: Object.keys(SONG_CATS), m: ['두훈', '형호', '민규', '우림'], l: [...new Set([...window.DATA.SONG_LANGS, ...all.flatMap(so => so.langs || [])])].filter(x => all.some(so => (so.langs || []).includes(x))), y: years, my: Object.keys(SONG_MY) },
      cnt: (k, x) => all.filter(so => songPass(so, { c: [], m: [], l: [], y: [], my: [], [k]: [x] })).length,
    };
  }
  let songHeard = null;
  function songPass(so, st) {
    const cat = x => x === 'ver' ? hasVersions(so) : x === 'chant' ? chantOf(so).length : x === 'nochant' ? !chantOf(so).length : x === 'video' ? so.events.length || (so.official || []).length : x === 'album' ? so.albums.length : x === 'concert' ? so.tours.length : so.titleOf.length;
    const my = x => x === 'heart' ? boxHas('s', so.key) : x === 'heard' ? songHeard.has(so.key) : pickHas(x, so);
    return (!st.c.length || st.c.some(cat)) && (!st.m.length || soloOf(so).some(m => st.m.includes(m))) && (!st.l.length || st.l.some(l => (so.langs || []).includes(l))) && (!st.y.length || st.y.some(y => songInYear(so, y))) && (!st.my.length || st.my.some(my));
  }
  // 곡 목록 '보기' 설정: 오른쪽에 무엇을 보여 줄지 고르기 (이 폰 sb-song-show). 예전 '집계' 체크(sb-song-num)는 무대 수로 이어져요
  const SONG_SHOW = [['num', '🎤 무대·▶ 영상·🎫 콘서트 수'], ['lang', '🌐 언어'], ['tmi', '💡 TMI 수'], ['chant', '📣 떼창 수'], ['ver', '버전 메모 수'], ['last', '마지막 무대'], ['title', '타이틀곡 표시'], ['album', '음반 이름 (제목 아래)']];
  const songShow = () => { const v = boxRead('sb-song-show'); return Array.isArray(v) ? v : boxRead('sb-song-num') ? ['num', 'lang', 'title', 'album'] : ['album']; };
  const songLine = so => songShow().includes('album') && so.albums[0] ? esc(so.albums[0].name) : '';
  const songStat = so => {
    const on = songShow(), n = (k, v, t) => on.includes(k) && v ? t : '';
    const top = [n('num', stageN(so), `<b>🎤${stageN(so)}</b>`), n('num', (so.official || []).length, `▶${(so.official || []).length}`), n('num', so.tours.length, `🎫${so.tours.length}`), n('tmi', tmiOf('s:' + so.key).length, `💡${tmiOf('s:' + so.key).length}`), n('chant', chantOf(so).length, `📣${chantOf(so).length}`), n('ver', on.includes('ver') && songMemoN(so), `버전 ${songMemoN(so)}`)].filter(Boolean).join(' ');
    const bot = [n('title', so.titleOf.length, '타이틀'), n('lang', (so.langs || []).length, esc((so.langs || []).join('·'))), n('last', songLast(so), daysAgo(songLast(so)) ? `${daysAgo(songLast(so)).toLocaleString()}일 전` : '오늘')].filter(Boolean).join(' · ');
    return [top, bot].filter(Boolean).join('<br>');
  };
  function songsView() {
    const st = songState(), f = songF(), sort = st.s || 'heart';
    songBack = location.hash || '#/songs';
    songHeard = new Set(boxStats().heardList.map(([so]) => so.key));
    const list = [...data.songs.values()].filter(so => songPass(so, st)).sort((a, b) =>
      sort === 'first' ? (a.since || '9').localeCompare(b.since || '9') || hangulFirst(a.name, b.name)
        : sort === 'heart' ? heartN('s', b.key) - heartN('s', a.key) || hangulFirst(a.name, b.name)
        : sort === 'wish' ? wishN(b.key) - wishN(a.key) || heartN('s', b.key) - heartN('s', a.key) || hangulFirst(a.name, b.name)
        : sort === 'recent' ? (songLast(a) ? 0 : 1) - (songLast(b) ? 0 : 1) || songLast(b).localeCompare(songLast(a)) || hangulFirst(a.name, b.name)
          : sort === 'many' ? playCount(b) - playCount(a) || hangulFirst(a.name, b.name)
            : hangulFirst(a.name, b.name));
    const bar = fBar(f, st);
    const side = so => sort === 'first' && so.since ? fmtDate(so.since, false) : sort === 'recent' && songLast(so) ? (daysAgo(songLast(so)) ? `${daysAgo(songLast(so)).toLocaleString()}일 전` : '오늘') : '';
    const marks = so => SONG_PICKS.filter(([k]) => pickHas(k, so)).map(([, l]) => l.slice(0, 2)).join('');
    return `
      <h1 class="h1 page-title">곡 아카이브${help('무대 영상으로 확인된 곡, 음반 수록곡, 콘서트 셋리스트 곡을 모았어요. ‘보기’에서 🎤 영상으로 확인된 무대 · ▶ 공식 영상 · 🎫 콘서트 셋리 수, 언어, TMI 수 등을 골라 볼 수 있어요. ♡로 하트, ⋯로 최애곡·소취곡·입덕곡을 고를 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="song-q" aria-label="곡 찾기" placeholder="곡 찾기 · 초성 OK" autocomplete="off">
      </form>
      ${bar.row}
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}곡${bar.clear}</p><span class="song-opt"><button type="button" class="link-btn song-showb" id="song-show">보기 ▾</button><select id="song-sort" class="song-sort" aria-label="정렬">${SONG_SORTS.map(([v, l]) => `<option value="${v}"${v === sort ? ' selected' : ''}>${l}</option>`).join('')}</select></span></div>
      </div>
      ${st.my.includes('heard') && !box.w.length ? '<p class="src-note">일정에서 🎫 직관했어요를 누르면 그날 들은 곡이 여기 모여요.</p>' : ''}
      <div class="song-list">
        ${list.map(so => `<div class="song-row" data-n="${esc(norm(songText(so) + ' ' + (so.albums[0] ? so.albums[0].name : '')))}" data-c="${esc(chosung(songText(so)))}">
          <a class="song-item" href="#/song/${encodeURIComponent(so.key)}">
            ${songPic(so) ? `<img class="song-thumb" src="${esc(songPic(so))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'song-thumb'}))">` : '<span class="song-thumb"></span>'}
            <span class="song-name"><span class="song-t">${esc(so.name)}${marks(so) ? ` <span class="song-marks">${marks(so)}</span>` : ''}${chantOf(so).length ? ' <span class="solo-tag ch-tag">📣 떼창</span>' : ''}${soloOf(so).map(m => ` <span class="solo-tag">${m}</span>`).join('')}${songPending(so) ? ' <span class="new-tag">확인 필요</span>' : ''}</span><small>${songLine(so)}</small></span>
            ${side(so) ? `<span class="song-first">${side(so)}</span>` : ''}${songStat(so) ? `<span class="song-n song-stat">${songStat(so)}</span>` : ''}
          </a>
          <span class="song-acts">${wishN(so.key) >= 3 ? `<span class="song-wish" title="듣고 싶어 하는 숲별">🙏<small>${wishN(so.key)}</small></span>` : ''}<button type="button" class="song-hb${boxHas('s', so.key) ? ' on' : ''}" data-key="${esc(so.key)}" aria-label="이 곡 하트" aria-pressed="${boxHas('s', so.key)}">${boxHas('s', so.key) ? '♥' : '♡'}${heartN('s', so.key) >= 3 ? `<small>${heartN('s', so.key)}</small>` : ''}</button><button type="button" class="song-more" data-key="${esc(so.key)}" aria-label="최애곡·소취곡·입덕곡 고르기">⋯</button></span>
        </div>`).join('')}
      </div>
      <div class="yf-wrap" id="yf-wrap" hidden></div>`;
  }
  function bindSongs() {
    const st = songState();
    bindF(songF(), st);
    const ss = document.getElementById('song-sort');
    const sb = document.getElementById('song-show');
    if (sb) sb.onclick = () => {
      const w = document.getElementById('yf-wrap'), on = songShow();
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="목록에 보일 것"><div class="yf-head"><b>목록에 보일 것</b><span class="sub">이 폰에 기억해요</span></div>
        <div class="show-opts">${SONG_SHOW.map(([k, l]) => `<label class="show-opt"><input type="checkbox" value="${k}"${on.includes(k) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
        <button type="button" class="bpill yf-ok">적용</button></section>`;
      w.hidden = false;
      w.querySelector('.yf-back').onclick = () => { w.hidden = true; };
      w.querySelector('.yf-ok').onclick = () => { boxWrite('sb-song-show', [...w.querySelectorAll('.show-opt input:checked')].map(x => x.value)); w.hidden = true; renderBase('songs'); };
    };
    if (ss) ss.onchange = () => { location.hash = fLink('#/songs', { ...st, s: ss.value === 'heart' ? '' : ss.value }); };
    // 곡 이름 찾기: 다시 그리지 않고 목록에서 숨기기만 해요 (입력 중 자판이 닫히지 않게)
    const q = document.getElementById('song-q');
    if (q) q.oninput = () => {
      const v = norm(q.value), c = q.value.replace(/\s/g, ''), alt = aliasOf(q.value), na = alt && norm(alt);
      document.querySelectorAll('.song-row').forEach(a => {
        a.hidden = !!v && (isChosungOnly(c) ? !a.dataset.c.includes(c) : !a.dataset.n.includes(v) && !(na && a.dataset.n.includes(na)));
      });
    };
  }
  // 곡 목록 ♡ · ⋯ (다시 그리지 않고 그 줄만 바꿔요)
  document.addEventListener('click', ev => {
    const h = ev.target.closest('.song-hb'), m = ev.target.closest('.song-more');
    if (h) {
      const so = data.songs.get(h.dataset.key); if (!so) return;
      boxToggle('s', so.key);
      const on = boxHas('s', so.key), n = heartN('s', so.key);
      h.classList.toggle('on', on); h.setAttribute('aria-pressed', on); h.innerHTML = (on ? '♥' : '♡') + (n >= 3 ? `<small>${n}</small>` : '');
      return;
    }
    if (m) {
      const so = data.songs.get(m.dataset.key), w = document.getElementById('yf-wrap'); if (!so || !w) return;
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="내 곡 고르기"><div class="yf-head"><b>${esc(so.name)}</b><span class="sub">숲별 카드에 넣은 곡은 카드에서 빼요</span></div>${songPickRow(so)}${chantBox(so).replace(/<details class="song-memo ch-box" open>/, '<details class="song-memo ch-box">')}${lyricBox(so).replace(/<details class="song-memo ly-box" open>/, '<details class="song-memo ly-box">')}<button type="button" class="chip fd-btn" data-key="${esc(so.key)}">📁 폴더에 담기</button> <a class="chip sheet-go" href="#/song/${encodeURIComponent(so.key)}">곡 화면으로 ›</a></section>`;
      w.hidden = false;
      w.querySelector('.yf-back').onclick = () => { w.hidden = true; if (currentRoute() === 'songs') renderBase('songs'); };
    }
  });

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
    // 합쳐진 곡의 예전 주소도 열리게 (예: we are the champions → champions)
    const al = data.songAlias || {};
    const so = data.songs.get(key) || data.songs.get(al[key]) || data.songs.get(window.DATA.songKey(key)) || data.songs.get(al[window.DATA.songKey(key)]);
    if (!so) return `<p class="empty">이 곡을 찾지 못했어요. <a href="#/songs">곡 목록으로 ›</a></p>`;
    const stages = so.events.slice().reverse();
    const play = playAllUrl(stages);
    const xs = songX(so);
    // 수록 음반 (표지 + 음반 이야기 링크)
    const albumRow = so.albums.length ? `<div class="song-albums">${so.albums.map(a => `
      <a class="song-album" href="${albHref(a)}">
        ${a.img ? `<img src="${esc(imgSize(a.img, 'thumb'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createElement('span'))">` : '<span></span>'}
        <span><b>${esc(a.name)}${unsure(a.unsure)}</b><small>${a.member ? esc(a.member) + ' · ' : ''}${/^\d{4}-\d\d-\d\d$/.test(a.date) ? fmtDate(a.date, false) : esc(a.date.slice(0, 4))} · ${esc(a.kind || '')}${so.titleOf.includes(a) ? ' · 타이틀곡' : ''}</small></span>
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
      <a class="back" href="${esc(songBack)}">‹ 곡 아카이브</a>
      <section class="song-hero">
        <div class="block-head"><h1 class="song-title">${esc(so.name)}</h1><span class="head-side">${heartTag('s', so.key)}${boxBtn('s', so.key, 'heart-btn')}<button type="button" class="share-round fd-btn${folders().some(f => inFolder(f.id, so.key)) ? ' on' : ''}" data-key="${esc(so.key)}" aria-label="폴더에 담기">📁</button>${shareBtn('이 곡 공유하기', `포레스텔라 「${so.name}」 무대 모아보기 🏆\n${so.first ? `처음 확인된 무대 ${fmtDate(so.first.date, false)} ${so.first.title}부터\n` : ''}\n${TAGS}`, link('#/song/' + encodeURIComponent(so.key)))}</span></div>${wishTag(so.key)}
        <div class="song-pills"><span class="count-pill">${stageN(so) ? `<span>무대 ${stageN(so)}번${tourDays(so).length ? ` (콘서트 ${tourDays(so).length})` : ''}</span>` : '무대 영상 준비 중'}${so.titleOf.length ? ' · 타이틀곡' : ''}</span>${so.langs ? `<span class="count-pill lang-pill">🌐 ${esc(so.langs.join(' · '))}</span>` : ''}</div>
        ${songPending(so) ? '<p class="src-note">팬이 올린 셋리에서 새로 들어온 곡이에요. 셋리가 확정되면 이 표시도 사라져요.</p>' : ''}
        ${albumRow}
        ${so.first || songLast(so) ? `<div class="facts">
          ${so.first ? `<div class="fact"><b>처음 확인</b><span>${fmtDate(so.first.date, false)} · ${esc(so.first.title)}</span></div>
          ${so.events.length > 1 ? `<div class="fact"><b>최근 확인</b><span>${fmtDate(so.last.date, false)} · ${esc(so.last.title)}</span></div>` : ''}` : ''}
          ${songLast(so) ? `<div class="fact"><b>마지막 무대</b><span>${daysAgo(songLast(so)) ? `${daysAgo(songLast(so)).toLocaleString()}일 전` : '오늘'} · ${fmtDate(songLast(so), false)}</span></div>` : ''}
        </div>` : ''}
        ${songPickRow(so)}
        <div class="chips song-writes"><button type="button" class="chip song-write" data-t="떼창" data-f=".ch-in">📣 떼창 적기</button><button type="button" class="chip song-write" data-t="가사" data-f=".ly-in">💬 가사 저장</button><button type="button" class="chip song-write" data-t="TMI" data-f=".tmi-in">💡 TMI 남기기</button></div><button type="button" class="song-fix-go">✏️ 곡 정보 고치기 <small>이름 · 언어 · 같은 곡 · 개인곡</small></button>
        ${play ? `<a class="play-all" href="${play}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></svg>이 곡 무대 이어보기</a>` : ''}
        ${findRow('포레스텔라 ' + so.name)}
      </section>
      <div class="view-row">${albumBtn()}</div>
      ${paneTabs([
        { label: '무대', n: stages.length, html: stages.length ? yearBlocks : `<p class="empty">아직 영상으로 확인된 무대가 없어요.</p>` },
        { label: '유튜브', n: so.official.length, html: ytList(so.official) },
        { label: '음원', n: so.tracks.length, html: so.tracks.length || so.albums.length ? songTracks(so) : '' },
        { label: '콘서트', n: so.tours.length, html: so.tours.length ? `<p class="src-note">콘서트 셋리스트 기준이에요. 무대 목록과 달리 영상으로 확인한 건 아니에요.</p><div class="tour-chips">${so.tours.slice().sort((a, b) => (a.dates[0] < b.dates[0] ? 1 : -1)).map(t => `<a class="chip" href="#/tour/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>` : '' },
        { label: '공식 X', n: xs.length, html: xList(xs) },
        { label: '📣 떼창', n: chantOf(so).length, html: flatBox(chantBox(so)) },
        { label: '💬 가사', n: (data.lyrics || []).filter(l => l.key === so.key && l.kind !== '떼창').length, html: flatBox(lyricBox(so)) },
        { label: '💡 TMI', n: tmiOf('s:' + so.key).length, html: tmiBox('s:' + so.key, so.name) },
        { label: '버전', n: songMemoN(so), html: flatBox(songMemos(so)) },
      ])}
      ${songFixState(so)}${songEditBox(so)}`;
  }
  // 최애곡·소취곡·입덕곡: 숲별 카드에 고른 곡은 그대로 불러오고, 곡 화면에서 고른 곡은 개수 제한 없이 보관함에 따로 저장해요
  // (보관함 곡 목록 s에 'pf:곡키'처럼 넣어서 다른 폰 이어 쓰기도 같이 따라가요)
  const SONG_PICKS = [['fav', '💚 최애곡', 'pf:'], ['wish', '🙏 소취곡', 'pw:'], ['debut', '🌱 입덕곡', 'pd:']];
  const cardPicks = k => k === 'debut' ? [card.debut.trim()].filter(Boolean) : favList(card[k]);
  const pickSong = n => data.songs.get(window.DATA.songKey(n)) || [...data.songs.values()].find(x => x.name === n);
  const inCard = (k, so) => cardPicks(k).some(n => window.DATA.songKey(n) === so.key || n === so.name);
  const pickPre = k => SONG_PICKS.find(x => x[0] === k)[2];
  const pickHas = (k, so) => inCard(k, so) || box.s.includes(pickPre(k) + so.key);
  // 카드 곡 + 보관함 곡 (겹치면 한 번만)
  const pickList = k => { const out = []; [...cardPicks(k).map(pickSong), ...box.s.filter(x => x.startsWith(pickPre(k))).map(x => data.songs.get(x.slice(3)))].forEach(so => { if (so && !out.includes(so)) out.push(so); }); return out; };
  // 내 곡 폴더: 보관함 곡 목록 s에 'fn:폴더id:이름'(폴더)과 'fd:폴더id:곡키'(담은 곡)로 넣어서 다른 폰 이어 쓰기도 따라가요
  const folders = () => box.s.filter(x => x.startsWith('fn:')).map(x => { const i = x.indexOf(':', 3); return { id: x.slice(3, i), name: x.slice(i + 1), raw: x }; });
  const folderSongs = id => box.s.filter(x => x.startsWith('fd:' + id + ':')).map(x => data.songs.get(x.slice(4 + id.length))).filter(Boolean);
  const inFolder = (id, key) => box.s.includes(`fd:${id}:${key}`);
  const boxSetS = list => { box.s = list; box.t = Date.now(); boxDirty = true; boxWrite(BOX_KEY, box); boxPush(); };
  const fdName = v => v.replace(/\s+/g, ' ').trim().slice(0, 20);
  const fdNew = name => { const id = Date.now().toString(36); boxSetS([...box.s, 'fn:' + id + ':' + name]); return id; };
  function folderSheet(so) {
    let w = document.getElementById('fd-wrap');
    if (!w) { w = document.createElement('div'); w.id = 'fd-wrap'; w.className = 'yf-wrap'; document.body.appendChild(w); }
    const draw = () => {
      const fs = folders();
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="폴더에 담기"><div class="yf-head"><b>📁 폴더에 담기</b><span class="sub">${esc(so.name)}</span></div>
        ${fs.length ? `<div class="yf-opts fd-opts">${fs.map(f => `<button type="button" class="chip${inFolder(f.id, so.key) ? ' on' : ''}" data-fd="${esc(f.id)}">📁 ${esc(f.name)} <small>${folderSongs(f.id).length}</small></button>`).join('')}</div>` : '<p class="src-note">아직 폴더가 없어요. 아래에서 만들어 보세요.</p>'}
        <div class="fd-new"><input type="text" class="op-in fd-in" maxlength="20" placeholder="새 폴더 이름 (예: 겨울에 듣는 곡)"><button type="button" class="bpill fd-make">만들고 담기</button></div>
        <button type="button" class="bpill yf-ok fd-done">다 했어요</button></section>`;
      w.hidden = false;
      const close = () => { w.hidden = true; const r = currentRoute(); if (r === 'box' || r === 'song' || r === 'songs') { const y = scrollY; renderBase(r); scrollTo(0, y); } };
      w.querySelector('.yf-back').onclick = close;
      w.querySelector('.fd-done').onclick = close;
      w.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { const k = `fd:${b.dataset.fd}:${so.key}`; boxSetS(box.s.includes(k) ? box.s.filter(x => x !== k) : [...box.s, k]); draw(); });
      w.querySelector('.fd-make').onclick = () => { const n = fdName(w.querySelector('.fd-in').value); if (!n) { toast('폴더 이름을 적어 주세요.'); return; } const id = fdNew(n); boxSetS([...box.s, `fd:${id}:${so.key}`]); toast(`'${n}' 폴더에 담았어요.`); draw(); };
    };
    draw();
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.fd-btn');
    if (!b) return;
    const so = data.songs.get(b.dataset.key); if (!so) return;
    const w = document.getElementById('yf-wrap'); if (w) w.hidden = true;
    folderSheet(so);
  });
  const songPickRow = so => `<div class="chips song-picks">${SONG_PICKS.map(([k, l]) => `<button type="button" class="chip song-pick${pickHas(k, so) ? ' on' : ''}" data-pk="${k}" data-key="${esc(so.key)}" aria-pressed="${pickHas(k, so)}">${l}</button>`).join('')}</div>`;
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.song-pick');
    if (!b) return;
    const so = data.songs.get(b.dataset.key), k = b.dataset.pk, l = SONG_PICKS.find(x => x[0] === k)[1].slice(2);
    if (!so) return;
    if (inCard(k, so)) { toast(`숲별 카드에서 고른 ${l}이에요. 빼려면 숲별 카드에서 지워 주세요.`); return; }
    const had = pickHas(k, so);
    boxToggle('s', pickPre(k) + so.key);
    b.closest('.song-picks').outerHTML = songPickRow(so);
    toast(had ? `${l}에서 뺐어요.` : `${l}에 넣었어요. 보관함 '⭐ 내 곡'에 모여요.`);
  });
  // 곡 언어: 제목으로 짐작한 거라 틀릴 수 있어요. '언어가 달라요'로 보내고, 같은 언어를 3명(올린 사람+2명)이 보내면 바뀌어요
  function langBox(so) {
    if (!so.lang) return '';
    const sent = boxRead('sb-lang-sent') || [], uid = myUid();
    const props = (so.langProps || []).map(p => {
      const me = p.who.includes(uid) || sent.includes(so.key + '|' + p.lang);
      return `<div class="sl-state"><span class="src-badge">언어 확인 · ${Math.min(p.n, 3)}/3</span><span class="sl-state-msg"><b class="dt-chg">${esc(so.langs.join(' · '))} → ${esc(p.langs.join(' · '))}</b> ${me ? '보냈어요. 다른 분들이 맞다고 하면 바뀌어요.' : "맞으면 '맞아요'를 눌러 주세요."}</span>${me ? '' : `<button type="button" class="bpill lg-ok" data-key="${esc(so.key)}" data-l="${esc(p.lang)}">맞아요</button>`}${isAdmin() ? `<button type="button" class="link-btn lg-ok lg-adm" data-key="${esc(so.key)}" data-l="${esc(p.lang)}">바로 확정 (관리자)</button>` : ''}</div>`;
    }).join('');
    const opts = [...new Set([...window.DATA.SONG_LANGS, ...so.langs])];
    return `<div class="lang-row"><span class="lang-tag">🌐 ${esc(so.langs.join(' · '))}</span>${so.langWas ? okMini('언어 고침', `팬분들 확인을 받아 고쳤어요. (원래 ${esc(so.langWas)})`) : ''}
      <details class="lang-fix"><summary>언어가 달라요</summary>
        <p class="src-note">이 곡에서 부른 언어를 모두 골라 주세요. 여러 개 골라도 돼요.</p>
        <div class="chips wrap lg-chips">${opts.map(l => `<button type="button" class="chip${so.langs.includes(l) ? ' on' : ''}" data-l="${esc(l)}" aria-pressed="${so.langs.includes(l)}">${esc(l)}</button>`).join('')}</div>
        <form class="pin-find lg-new"><input type="text" class="lg-in" maxlength="8" placeholder="목록에 없는 언어 (예: 줄루어)"><button type="submit" class="chip">추가</button></form>
        <button type="button" class="bpill add-send lg-send" data-key="${esc(so.key)}">보내기</button>
        <p class="src-note">${isAdmin() ? '관리자 기기라 보내면 바로 바뀌어요.' : '같은 언어 조합을 다른 두 분이 더 고르면 바뀌어요.'}</p></details></div>${props}`;
  }
  const lgSend = (so, sig, b) => {
    const adm = isAdmin() && (b.classList.contains('lg-adm') || b.classList.contains('lg-send'));
    b.disabled = true;
    const p = formPost(`종류: 언어수정\n곡: ${so.name}\n곡키: ${so.key}\n언어: ${sig}\n누가: ${myUid()}`);
    (adm ? p.then(() => sendEvMark('lg' + window.DATA.slVer([so.key, sig]), '숨김')) : p).then(() => {
      boxWrite('sb-lang-sent', [...(boxRead('sb-lang-sent') || []), so.key + '|' + sig].slice(-200));
      toast(adm ? '바꿨어요. 5~10분쯤 뒤 모두에게 반영돼요.' : '보냈어요! 다른 분들이 맞다고 하면 바뀌어요.');
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('.lg-new');
    if (!f) return;
    ev.preventDefault();
    const inp = f.querySelector('.lg-in'), v = inp.value.trim();
    if (!/^[가-힣]{2,8}$/.test(v)) { toast("한글로 적어 주세요. (예: 줄루어)"); return; }
    const box = f.closest('.lang-fix').querySelector('.lg-chips');
    let c = [...box.children].find(x => x.dataset.l === v);
    if (!c) { box.insertAdjacentHTML('beforeend', `<button type="button" class="chip" data-l="${esc(v)}"></button>`); c = box.lastElementChild; c.textContent = v; }
    c.classList.add('on'); c.setAttribute('aria-pressed', 'true'); inp.value = '';
  });
  document.addEventListener('click', ev => {
    const c = ev.target.closest('.lg-chips .chip');
    if (c) { c.classList.toggle('on'); c.setAttribute('aria-pressed', c.classList.contains('on')); return; }
    const b = ev.target.closest('.lg-send, .lg-ok');
    if (!b) return;
    const so = data.songs.get(b.dataset.key);
    if (!so) return;
    if (b.classList.contains('lg-ok')) { lgSend(so, b.dataset.l, b); return; }
    const pick = [...b.closest('.lang-fix').querySelectorAll('.lg-chips .chip.on')].map(x => x.dataset.l);
    const at = x => { const i = window.DATA.SONG_LANGS.indexOf(x); return i < 0 ? 99 : i; };
    const sig = pick.sort((a, z) => at(a) - at(z) || a.localeCompare(z)).join(', ');
    if (!sig) { toast('언어를 하나 이상 골라 주세요.'); return; }
    if (sig === so.lang) { toast('지금 언어와 같아요.'); return; }
    lgSend(so, sig, b);
  });
  // 좋아하는 가사: 이 폰에 저장(sb-lyrics {곡키: [{t, sh, at}]}), '다른 팬과 공유'를 고른 줄만 제보 폼(종류: 가사)으로 올라가요
  const LY_KEY = 'sb-lyrics';
  const lyMine = () => boxRead(LY_KEY) || {};
  const lyId = (key, t) => window.DATA.slVer([key, t.replace(/\s+/g, ' ').trim().toLowerCase()]);
  const lyClean = t => t.replace(/\s+/g, ' ').trim().slice(0, 120);
  function lyricBox(so) {
    const mine = lyMine()[so.key] || [], uid = myUid();
    const shared = (data.lyrics || []).filter(l => l.key === so.key && l.kind !== '떼창').sort((a, b) => b.n - a.n || b.at - a.at);
    const sentLocal = boxRead('sb-ly-sent') || [];
    const row = l => {
      const me = l.who.includes(uid) || sentLocal.includes(l.id);
      return `<div class="ly-line"><q>${esc(l.text)}</q><span class="ly-side"><button type="button" class="bpill ly-up${me ? ' on' : ''}" data-key="${esc(so.key)}" data-t="${esc(l.text)}"${me ? ' disabled' : ''}>${me ? '♥' : '♡'} ${l.n + (sentLocal.includes(l.id) && !l.who.includes(uid) ? 1 : 0)}</button><button type="button" class="link-btn lyc-btn" data-key="${esc(so.key)}" data-t="${esc(l.text)}" aria-label="가사 카드 만들기">🖼</button>${me ? '' : rpBtn(l)}${isAdmin() ? `<button type="button" class="link-btn ly-hide" data-id="${esc(l.id)}">숨기기</button>` : ''}</span></div>`;
    };
    const myRow = (m, i) => `<div class="ly-line mine"><q>${esc(m.t)}</q><span class="ly-side"><small>${m.sh ? '공유함' : '🔒 나만'}</small><button type="button" class="link-btn lyc-btn" data-key="${esc(so.key)}" data-t="${esc(m.t)}" aria-label="가사 카드 만들기">🖼</button><button type="button" class="link-btn ly-del" data-key="${esc(so.key)}" data-i="${i}" aria-label="지우기">×</button></span></div>`;
    const n = shared.length + mine.filter(m => !m.sh).length;
    return `<details class="song-memo ly-box"${n ? ' open' : ''}><summary>💬 좋아하는 가사${n ? ` ${n}` : ''}</summary>
      ${shared.length ? `<p class="src-note">팬들이 고른 가사</p>${shared.map(row).join('')}` : ''}
      ${mine.length ? `<p class="src-note">내가 저장한 가사</p>${mine.map(myRow).join('')}` : ''}
      <div class="op-form ly-form"><textarea class="op-in ly-in" rows="2" maxlength="120" placeholder="좋아하는 가사 한두 줄"></textarea>
      <label class="ly-sh"><input type="checkbox" class="ly-share"> 다른 팬과 공유하기</label>
      <button type="button" class="bpill add-send ly-save" data-key="${esc(so.key)}">저장</button>
      <p class="src-note">저작권 때문에 한두 줄만 적어 주세요. 공유한 가사는 5~10분쯤 뒤 모두에게 보여요.</p></div>
      ${lyricLinks(so)}</details>`;
  }
  // ---------- 가사 카드: 고른 가사 한두 줄을 정사각형 이미지로 (폰 안에서 그려서 저장·공유) ----------
  const LYC_BG = [['album', '앨범'], ['photo', '📷 내 사진'], ['forest', '숲'], ['night', '밤'], ['dawn', '새벽'], ['cream', '크림'], ['custom', '🎨 내 색']];
  // 고른 색이 밝으면 글씨를 어둡게
  const lycLight = hex => { const n = parseInt((hex || '#1F5E46').slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150; };
  const lycShade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c + (k > 0 ? (255 - c) * k : c * k)))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join(''); };
  let lycPhoto = null;  // 내 사진: 이 화면에서만 써요 (저장 안 해요)
  const LYC_COL = { forest: ['#1F5E46', '#3E8E6A', '#A6D99B'], night: ['#0E1A2E', '#25385E', '#5B6FA8'], dawn: ['#F6C7B4', '#C9B7E8', '#8FB8E8'], cream: ['#FBF6EC', '#F3EAD7', '#E8DCC2'] };
  const LYC_FONT = [['myeong', '명조'], ['dodum', '둥근'], ['pen', '손글씨'], ['plex', '고딕']];
  const LYC_KEY = 'sb-lyc';
  // 그림 바탕으로 쓸 수 있는 앨범 표지: 이 사이트 표지(covers/)나 공식 X 사진만 (다른 곳 그림은 저장이 막혀요)
  const lycCover = so => { const al = so.albums.find(a => a.img && (/^covers\//.test(a.img) || /pbs\.twimg\.com/.test(a.img))); return al ? imgSize(al.img, 'medium') : ''; };
  let lycImg = null, lycImgSrc = '';
  function lycDraw(cv, so, text, o) {
    const S = 1080, ctx = cv.getContext('2d');
    cv.width = cv.height = S;
    const photoOn = o.bg === 'photo' && lycPhoto && lycPhoto.naturalWidth;
    const dark = o.bg === 'custom' ? !lycLight(o.color) : o.bg !== 'cream' && o.bg !== 'dawn';
    if (photoOn) {
      const iw = lycPhoto.naturalWidth, ih = lycPhoto.naturalHeight, m = Math.min(iw, ih);
      ctx.drawImage(lycPhoto, (iw - m) / 2, (ih - m) / 2, m, m, 0, 0, S, S);
      const g = ctx.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, `rgba(0,0,0,${o.dim * .6})`); g.addColorStop(.5, `rgba(0,0,0,${o.dim})`); g.addColorStop(1, `rgba(0,0,0,${Math.min(.85, o.dim + .2)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    } else if (o.bg === 'custom') {
      const g = ctx.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, lycShade(o.color, -.12)); g.addColorStop(.55, o.color); g.addColorStop(1, lycShade(o.color, .25));
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    } else if (o.bg === 'album' && lycImg && lycImg.complete && lycImg.naturalWidth) {
      // 흐리게: 아주 작게 그렸다가 크게 늘려요 (모든 폰에서 되는 방법)
      const t = document.createElement('canvas'); t.width = t.height = 24;
      const tc = t.getContext('2d'), iw = lycImg.naturalWidth, ih = lycImg.naturalHeight, m = Math.min(iw, ih);
      tc.drawImage(lycImg, (iw - m) / 2, (ih - m) / 2, m, m, 0, 0, 24, 24);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(t, -40, -40, S + 80, S + 80);
      ctx.fillStyle = 'rgba(10,20,16,.42)'; ctx.fillRect(0, 0, S, S);
      // 가운데 위 작은 표지
      const c = 150, cx = (S - c) / 2, cy = 120;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx, cy, c, c, 18) : ctx.rect(cx, cy, c, c); ctx.clip();
      ctx.drawImage(lycImg, (iw - m) / 2, (ih - m) / 2, m, m, cx, cy, c, c); ctx.restore();
    } else {
      const col = LYC_COL[o.bg] || LYC_COL.forest, g = ctx.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, col[0]); g.addColorStop(.6, col[1]); g.addColorStop(1, col[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }
    const img = o.bg === 'album' || photoOn;
    const ink = dark || img ? '#FFFFFF' : '#23332B', sub = dark || img ? 'rgba(255,255,255,.78)' : 'rgba(35,51,43,.7)';
    const F = CARD_FONTS[o.font] || CARD_FONTS.myeong;
    // 큰 따옴표
    ctx.fillStyle = dark || img ? 'rgba(255,255,255,.28)' : 'rgba(35,51,43,.18)';
    ctx.font = `800 220px ${CARD_FONTS.myeong.f}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!img) ctx.fillText('“', 90, 300);
    // 가사: 글자 크기를 줄여 가며 7줄 안에 맞춰요
    const maxW = S - 220, words = text.replace(/\s+/g, ' ').trim();
    let size = 66, lines = [];
    const wrap = sz => {
      ctx.font = `${F.big} ${Math.round(sz * F.k)}px ${F.f}`;
      const out = [];
      words.split(/\s*\/\s*/).forEach(part => {
        let cur = '';
        part.split(' ').forEach(w => {
          const next = cur ? cur + ' ' + w : w;
          if (ctx.measureText(next).width > maxW && cur) { out.push(cur); cur = w; } else cur = next;
          while (ctx.measureText(cur).width > maxW && cur.length > 1) { let i = cur.length - 1; while (i > 1 && ctx.measureText(cur.slice(0, i)).width > maxW) i--; out.push(cur.slice(0, i)); cur = cur.slice(i); }
        });
        if (cur) out.push(cur);
      });
      return out;
    };
    for (; size >= 38; size -= 4) { lines = wrap(size); if (lines.length <= 7) break; }
    lines = lines.slice(0, 8);
    const lh = Math.round(size * F.k * 1.55), top = o.bg === 'album' ? 330 : 300, room = S - top - 230;
    let y = top + Math.max(0, (room - lh * lines.length) / 2) + lh * .8;
    ctx.fillStyle = ink; ctx.textAlign = 'center';
    if (img) { ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14; }
    lines.forEach(l => { ctx.fillText(l, S / 2, y); y += lh; });
    ctx.shadowBlur = 0;
    // 아래: 곡 제목 · 음반 · 사이트 이름
    const al = so.albums[0];
    ctx.font = `700 40px ${CARD_SANS}`; ctx.fillStyle = ink; ctx.fillText(`「${so.name}」`, S / 2, S - 150);
    ctx.font = `400 28px ${CARD_SANS}`; ctx.fillStyle = sub;
    ctx.fillText([al ? al.member || '포레스텔라' : '포레스텔라', al ? al.name : ''].filter(Boolean).join(' · '), S / 2, S - 102);
    ctx.font = `700 24px ${CARD_SANS}`; ctx.fillStyle = sub; ctx.fillText('숲별 기록장 🌲', S / 2, S - 48);
  }
  function lycOpen(so, text) {
    let w = document.getElementById('lyc-wrap');
    if (!w) { w = document.createElement('div'); w.id = 'lyc-wrap'; w.className = 'yf-wrap'; document.body.appendChild(w); }
    const cover = lycCover(so), saved = boxRead(LYC_KEY) || {};
    const o = { bg: saved.bg && (saved.bg !== 'album' || cover) && (saved.bg !== 'photo' || lycPhoto) ? saved.bg : cover ? 'album' : 'forest', font: saved.font || 'myeong', color: /^#[0-9a-f]{6}$/i.test(saved.color || '') ? saved.color : '#7FB3A0', dim: saved.dim >= 0 && saved.dim <= .8 ? saved.dim : .4 };
    const bgs = LYC_BG.filter(([k]) => k !== 'album' || cover);
    w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet lyc-sheet" role="dialog" aria-label="가사 카드">
      <div class="yf-head"><b>🖼 가사 카드</b><span class="sub">${esc(so.name)}</span></div>
      <canvas class="lyc-cv" width="1080" height="1080"></canvas>
      <p class="src-note">배경</p><div class="chips lyc-opts">${bgs.map(([k, l]) => `<button type="button" class="chip${o.bg === k ? ' on' : ''}" data-bg="${k}">${l}</button>`).join('')}</div>
      <div class="lyc-extra lyc-custom"${o.bg === 'custom' ? '' : ' hidden'}><label>색 고르기 <input type="color" class="lyc-color" value="${o.color}"></label><span class="lyc-sw">${['#7FB3A0', '#F2B8C6', '#B9A7E0', '#F6D58E', '#8EC5E8', '#E8A07A', '#2D3A4A', '#FFFFFF'].map(c => `<button type="button" class="lyc-dot" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</span></div>
      <div class="lyc-extra lyc-photo"${o.bg === 'photo' ? '' : ' hidden'}><label class="chip lyc-pick">📷 사진 고르기<input type="file" accept="image/*" class="lyc-file" hidden></label><label class="lyc-dim">어둡게 <input type="range" min="0" max="0.8" step="0.05" value="${o.dim}" class="lyc-dimr"></label><p class="src-note">사진은 이 폰에서만 써요. 사이트에 올라가지 않아요.</p></div>
      <p class="src-note">글씨</p><div class="chips lyc-opts">${LYC_FONT.map(([k, l]) => `<button type="button" class="chip${o.font === k ? ' on' : ''}" data-font="${k}">${l}</button>`).join('')}</div>
      <div class="lyc-acts"><button type="button" class="bpill lyc-save">이미지 저장</button><button type="button" class="chip lyc-share">공유하기</button><button type="button" class="chip lyc-x">X에 올리기</button></div>
      <p class="src-note lyc-msg"></p></section>`;
    w.hidden = false;
    const cv = w.querySelector('.lyc-cv'), msg = w.querySelector('.lyc-msg');
    const redraw = () => { try { lycDraw(cv, so, text, o); } catch (err) { /* 그림 실패는 넘어가요 */ } };
    const fontsP = cardFontsReady(text).then(() => document.fonts && Promise.all(LYC_FONT.map(([k]) => document.fonts.load(`${CARD_FONTS[k].big} 60px ${CARD_FONTS[k].f}`, text))).catch(() => {}));
    if (cover && lycImgSrc !== cover) { lycImg = new Image(); lycImg.crossOrigin = 'anonymous'; lycImg.onload = redraw; lycImg.onerror = () => { lycImg = null; }; lycImg.src = lycImgSrc = cover; }
    redraw(); fontsP.then(redraw);
    const file = w.querySelector('.lyc-file');
    const setBg = k => { o.bg = k; w.querySelectorAll('[data-bg]').forEach(x => x.classList.toggle('on', x.dataset.bg === k)); w.querySelector('.lyc-custom').hidden = k !== 'custom'; w.querySelector('.lyc-photo').hidden = k !== 'photo'; boxWrite(LYC_KEY, o); redraw(); };
    file.onchange = () => {
      const f = file.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => { lycPhoto = im; setBg('photo'); }; im.src = r.result; };
      r.readAsDataURL(f);
    };
    w.querySelector('.lyc-color').oninput = e => { o.color = e.target.value; boxWrite(LYC_KEY, o); redraw(); };
    w.querySelectorAll('.lyc-dot').forEach(d => d.onclick = () => { o.color = d.dataset.c; w.querySelector('.lyc-color').value = o.color; boxWrite(LYC_KEY, o); redraw(); });
    w.querySelector('.lyc-dimr').oninput = e => { o.dim = +e.target.value; boxWrite(LYC_KEY, o); redraw(); };
    w.querySelectorAll('[data-bg],[data-font]').forEach(b => b.onclick = () => {
      if (b.dataset.bg) { if (b.dataset.bg === 'photo' && !lycPhoto) { setBg('photo'); file.click(); return; } setBg(b.dataset.bg); return; }
      o.font = b.dataset.font;
      w.querySelectorAll(b.dataset.bg ? '[data-bg]' : '[data-font]').forEach(x => x.classList.toggle('on', x === b));
      boxWrite(LYC_KEY, o); redraw();
    });
    w.querySelector('.yf-back').onclick = () => { w.hidden = true; };
    const blobOf = () => new Promise(res => { try { cv.toBlob(res, 'image/png'); } catch (err) { res(null); } });
    const fname = `숲별가사_${so.name.replace(/[\\/:*?"<>|]/g, '')}.png`;
    w.querySelector('.lyc-save').onclick = async () => {
      const b = await blobOf(); if (!b) { msg.textContent = '이 배경은 저장이 안 돼요. 다른 배경을 골라 주세요.'; return; }
      const file = new File([b], fname, { type: 'image/png' });
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (err) { if (err.name === 'AbortError') return; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      msg.textContent = '저장했어요. 갤러리나 다운로드 폴더에서 볼 수 있어요.';
    };
    // X는 글에 사진을 바로 못 붙여서: 먼저 이미지를 저장해 두고, 곡 링크가 적힌 글쓰기 창을 열어요
    w.querySelector('.lyc-x').onclick = async () => {
      const short = text.length > 60 ? text.slice(0, 58) + '…' : text;
      const t = `“${short}”\n포레스텔라 「${so.name}」\n#포레스텔라 #Forestella #숲별가사\n`;
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(link('#/song/' + encodeURIComponent(so.key))), '_blank', 'noopener');
      msg.textContent = '카드 이미지는 위 \'이미지 저장\'으로 저장한 뒤 X 글에 붙여 주세요.';
    };
    w.querySelector('.lyc-share').onclick = async () => {
      const b = await blobOf(); if (!b) { msg.textContent = '이 배경은 공유가 안 돼요. 다른 배경을 골라 주세요.'; return; }
      const file = new File([b], fname, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: `포레스텔라 「${so.name}」 #포레스텔라 #숲별가사\n${link('#/song/' + encodeURIComponent(so.key))}` }); } catch (err) { /* 닫음 */ } }
      else msg.textContent = '이 브라우저는 바로 공유가 안 돼요. 이미지 저장 후 올려 주세요.';
    };
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.lyc-btn');
    if (!b) return;
    const so = data.songs.get(b.dataset.key); if (!so) return;
    const yw = document.getElementById('yf-wrap'); if (yw) yw.hidden = true;
    lycOpen(so, b.dataset.t);
  });
  // 가사 찾아보기 바로가기 (음원 사이트 검색 → 곡 화면의 가사)
  function lyricLinks(so) {
    const artist = (so.albums[0] && so.albums[0].member) || '포레스텔라', name = (so.match || so.name).replace(/\s*\([^)]*\)\s*$/, '');
    const q = encodeURIComponent(artist + ' ' + name);
    const sites = [['멜론', 'https://www.melon.com/search/lyric/index.htm?q=' + encodeURIComponent(name)], ['지니', 'https://www.genie.co.kr/search/searchLyrics?query=' + q], ['벅스', 'https://music.bugs.co.kr/search/lyrics?q=' + q], ['구글', 'https://www.google.com/search?q=' + q + encodeURIComponent(' 가사')]];
    return `<p class="src-note">가사 찾아보기</p><div class="chips wrap">${sites.map(([n, u]) => `<a class="chip" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join('')}</div><p class="src-note ly-warn">가사 전체는 저작권 때문에 이 사이트에 옮겨 올 수 없어요. 음원 사이트에서 봐 주세요.</p>`;
  }
  const lyRedraw = so => { const d = document.querySelector('.ly-box'); if (!d) return; const flat = d.tagName === 'DIV'; d.outerHTML = flat ? flatBox(lyricBox(so)) : lyricBox(so); if (!flat) document.querySelector('.ly-box').open = true; };
  const lySend = (so, t) => {
    const by = myUid();
    return formPost(`종류: 가사\n곡: ${so.name}\n곡키: ${so.key}\n누가: ${by}\n내용: ${t}`).then(() => {
      boxWrite('sb-ly-sent', [...(boxRead('sb-ly-sent') || []), lyId(so.key, t)].slice(-300));
    });
  };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.ly-save, .ly-up, .ly-del, .ly-hide');
    if (!b) return;
    if (b.matches('.ly-hide')) { b.disabled = true; sendEvMark('ly' + b.dataset.id, '숨김').then(() => toast('숨겼어요. 5~10분쯤 뒤 모두에게서 빠져요.')).catch(() => { b.disabled = false; }); return; }
    const so = data.songs.get(b.dataset.key);
    if (!so) return;
    const all = lyMine(), list = all[so.key] || [];
    if (b.matches('.ly-save')) {
      const box = b.closest('.ly-form'), t = lyClean(box.querySelector('.ly-in').value), sh = box.querySelector('.ly-share').checked;
      if (!t) return;
      if (!list.some(m => m.t === t)) list.unshift({ t, sh, at: Date.now() });
      all[so.key] = list; boxWrite(LY_KEY, all);
      if (sh && banned()) { toast(banMsg()); return; }
      if (sh) { b.disabled = true; lySend(so, t).then(() => { toast('공유했어요. 5~10분쯤 뒤 모두에게 보여요.'); lyRedraw(so); }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); }); }
      else { toast('이 폰에 저장했어요.'); lyRedraw(so); }
    } else if (b.matches('.ly-up')) {
      b.disabled = true; lySend(so, b.dataset.t).then(() => { boxWrite('sb-ly-up', [...(boxRead('sb-ly-up') || []).filter(x => x.id !== lyId(so.key, b.dataset.t)), { id: lyId(so.key, b.dataset.t), key: so.key, t: b.dataset.t, at: Date.now() }].slice(-300)); lyRedraw(so); }).catch(() => { b.disabled = false; });
    } else {
      const m = list[Number(b.dataset.i)];
      if (!m) return;
      list.splice(Number(b.dataset.i), 1);
      all[so.key] = list; if (!list.length) delete all[so.key]; boxWrite(LY_KEY, Object.keys(all).length ? all : null);
      if (m.sh) formPost(`종류: 가사삭제\n번호: ${window.DATA.slVer([myUid(), so.key, m.t.toLowerCase()])}\n누가: ${myUid()}`).catch(() => {});
      toast(m.sh ? '지웠어요. 공유한 가사도 5~10분쯤 뒤 빠져요.' : '지웠어요.');
      lyRedraw(so);
    }
  });
  // 떼창 구간: 팬이 적어서 바로 모두와 공유해요 (종류: 떼창). 같은 글은 ♥로 모이고, 올린 사람은 지울 수 있어요
  const CH_SENT = 'sb-ch-sent';
  const chantOf = so => (data.lyrics || []).filter(l => l.key === so.key && l.kind === '떼창');
  const chClean = t => t.replace(/\s+/g, ' ').trim().slice(0, 300);
  function chantBox(so) {
    const uid = myUid(), sent = boxRead(CH_SENT) || [];
    const ids = new Set(sent.map(x => x.id)), list = chantOf(so).sort((a, b) => b.n - a.n || a.at - b.at);
    // 방금 보낸 글은 반영 전에도 이 폰엔 보여요
    sent.filter(x => x.key === so.key && !list.some(l => l.id === x.id) && !x.del).forEach(x => list.push({ id: x.id, text: x.t, n: 1, who: [uid], at: x.at, wait: true }));
    const row = l => {
      const me = l.who.includes(uid) || ids.has(l.id);
      return `<div class="ly-line"><span class="ch-t">${esc(l.text)}${l.wait ? ' <small class="src-note">반영 중</small>' : ''}</span><span class="ly-side"><button type="button" class="bpill ch-up${me ? ' on' : ''}" data-key="${esc(so.key)}" data-t="${esc(l.text)}"${me ? ' disabled' : ''} aria-label="나도 이렇게 불러요">${me ? '♥' : '♡'} ${l.n + (ids.has(l.id) && !l.who.includes(uid) && !l.wait ? 1 : 0)}</button><button type="button" class="link-btn lyc-btn" data-key="${esc(so.key)}" data-t="${esc(l.text)}" aria-label="가사 카드 만들기">🖼</button>${me ? `<button type="button" class="link-btn ch-del" data-key="${esc(so.key)}" data-t="${esc(l.text)}" aria-label="지우기">×</button>` : rpBtn(l)}${isAdmin() ? `<button type="button" class="link-btn ly-hide" data-id="${esc(l.id)}">숨기기</button>` : ''}</span></div>`;
    };
    return `<details class="song-memo ch-box"${list.length ? ' open' : ''}><summary>📣 떼창 구간${list.length ? ` ${list.length}` : ''}</summary>
      ${list.map(row).join('')}
      <div class="op-form ly-form"><textarea class="op-in ch-in" rows="2" maxlength="300" placeholder="예: 후렴 끝 '…' 부분 다 같이 / 2절 뒤 '오~' 따라 부르기"></textarea>
      <button type="button" class="bpill add-send ch-send" data-key="${esc(so.key)}">공유하기</button>
      <p class="src-note">콘서트에서 같이 부르는 곳을 적어 주세요. 같은 내용이면 ♥를 눌러 주세요. 가사는 짧게만 적어 주세요.</p></div></details>`;
  }
  const chRedraw = so => { const d = document.querySelector('.ch-box'); if (!d) return; const flat = d.tagName === 'DIV'; d.outerHTML = flat ? flatBox(chantBox(so)) : chantBox(so); if (!flat) document.querySelector('.ch-box').open = true; };
  const chId = (key, t) => window.DATA.slVer(['떼창', key, t.replace(/\s+/g, ' ').toLowerCase()]);
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.ch-send, .ch-up, .ch-del');
    if (!b) return;
    const so = data.songs.get(b.dataset.key);
    if (!so) return;
    const by = myUid(), sent = boxRead(CH_SENT) || [];
    if (b.matches('.ch-del')) {
      const t = b.dataset.t;
      formPost(`종류: 가사삭제\n번호: ${window.DATA.slVer([by, '떼창', so.key, t.replace(/\s+/g, ' ').toLowerCase()])}\n누가: ${by}`).catch(() => {});
      boxWrite(CH_SENT, sent.map(x => x.id === chId(so.key, t) ? { ...x, del: true } : x));
      toast('지웠어요. 5~10분쯤 뒤 모두에게서 빠져요.');
      const row = b.closest('.ly-line'); if (row) row.remove();
      return;
    }
    const t = b.matches('.ch-up') ? b.dataset.t : chClean(b.closest('.ly-form').querySelector('.ch-in').value);
    if (!t) return;
    if (banned()) { toast(banMsg()); return; }
    b.disabled = true;
    formPost(`종류: 떼창\n곡: ${so.name}\n곡키: ${so.key}\n누가: ${by}\n내용: ${t}`).then(() => {
      boxWrite(CH_SENT, [...sent.filter(x => x.id !== chId(so.key, t)), { id: chId(so.key, t), key: so.key, t, at: Date.now(), ...(b.matches('.ch-up') ? { up: 1 } : {}) }].slice(-200));
      toast(b.matches('.ch-up') ? '♥ 눌렀어요.' : '공유했어요. 5~10분쯤 뒤 모두에게 보여요.');
      chRedraw(so);
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  });
  // ---------- 🚩 신고 · 글쓰기 막기 ----------
  // 다른 사람 글(떼창·공유 가사·TMI)에 신고(종류: 신고 번호/누가). 3명이면 자동으로 숨겨지고 관리자 화면에만 떠요.
  const RP_SENT = 'sb-rp-sent';
  const rpBtn = l => l.wait ? '' : `<button type="button" class="link-btn rp-btn" data-id="${esc(l.id)}" aria-label="숨김 요청 · 신고" title="숨김 요청 · 신고">⋯</button>`;
  const banned = () => (data.bans || {})[myUid()] > Date.now();
  const banMsg = () => { const d = new Date((data.bans || {})[myUid()]); return `신고가 쌓여 ${d.getMonth() + 1}월 ${d.getDate()}일까지 이 기기에선 글을 올릴 수 없어요.`; };
  // ⋯ → 🙈 숨김 요청(관리자에게 의견과 함께, 이 폰에선 바로 안 보여요) · 🚩 신고(사유 필수, 세 분이면 자동 숨김)
  const HQ_SENT = 'sb-hq-sent';
  const myHide = d => { const h = new Set(boxRead(HQ_SENT) || []); if (h.size && d && d.lyrics) d.lyrics = d.lyrics.filter(l => !h.has(l.id)); return d; };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.rp-btn');
    if (!b) return;
    const id = b.dataset.id, row = b.closest('.ly-line, .story-row, .tre-row');
    const w = document.createElement('div'); w.className = 'lang-sheet rp-sheet';
    const pick = () => { w.innerHTML = `<div class="lang-box" role="dialog" aria-label="숨김 요청 · 신고"><b>이 글을</b>
      <button type="button" class="lang-opt" data-k="hq">🙈 숨김 요청 <small>신고할 정도는 아니지만 안 보였으면 해요 · 관리자가 확인해요</small></button>
      <button type="button" class="lang-opt" data-k="rp">🚩 신고 <small>규칙에 어긋나는 글이에요 · 세 분이 신고하면 숨겨져요</small></button>
      <button type="button" class="lang-x">닫기</button></div>`; };
    const form = k => { w.innerHTML = `<div class="lang-box" role="dialog"><b>${k === 'hq' ? '🙈 숨김 요청' : '🚩 신고'}</b>
      <p>${k === 'hq' ? '왜 숨겼으면 하는지 관리자에게 남겨 주세요. 이 폰에선 바로 안 보여요.' : '신고 사유를 적어 주세요.'}</p>
      <textarea class="rp-why" rows="3" maxlength="300" placeholder="${k === 'hq' ? '예: 스포일러 같아요 / 사실과 달라요' : '예: 욕설 / 광고 / 다른 사람을 공격해요'}"></textarea>
      <button type="button" class="bpill add-send rp-go" data-k="${k}">보내기</button><button type="button" class="lang-x">닫기</button></div>`; w.querySelector('.rp-why').focus(); };
    if ((boxRead(RP_SENT) || []).includes(id) && (boxRead(HQ_SENT) || []).includes(id)) { toast('이미 보냈어요.'); return; }
    pick();
    w.onclick = e2 => {
      const o = e2.target.closest('[data-k]');
      if (o && o.classList.contains('lang-opt')) {
        if ((boxRead(o.dataset.k === 'hq' ? HQ_SENT : RP_SENT) || []).includes(id)) { toast(o.dataset.k === 'hq' ? '이미 숨김 요청했어요.' : '이미 신고했어요.'); return; }
        form(o.dataset.k); return;
      }
      const g = e2.target.closest('.rp-go');
      if (g) {
        const t = w.querySelector('.rp-why').value.trim(), k = g.dataset.k;
        if (t.length < 2) { toast(k === 'hq' ? '숨김 요청 의견을 적어 주세요.' : '신고 사유를 적어 주세요.'); return; }
        g.disabled = true;
        formPost(`종류: ${k === 'hq' ? '숨김요청' : '신고'}\n번호: ${id}\n누가: ${myUid()}\n내용: ${t}`).then(() => {
          const key = k === 'hq' ? HQ_SENT : RP_SENT;
          boxWrite(key, [...(boxRead(key) || []), id].slice(-300));
          if (k === 'hq') { myHide(data); if (row) row.remove(); } else if (row) row.classList.add('rp-done');
          w.remove(); toast(k === 'hq' ? '숨김 요청을 보냈어요. 이 폰에선 안 보여요.' : '신고했어요. 고마워요!');
        }).catch(() => { g.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
        return;
      }
      if (e2.target === w || e2.target.closest('.lang-x')) w.remove();
    };
    document.body.appendChild(w);
  });
  // ---------- 💡 TMI ----------
  // 곡('s:곡키')·일정('e:일정ID')·콘서트('t:투어ID')마다 팬이 TMI를 달아요 (종류: TMI 곡키/출처/누가/내용). ♥ '나도 봤어요'가 많은 순.
  const TMI_SENT = 'sb-tmi-sent';
  const tmiOf = key => (data.lyrics || []).filter(l => l.kind === 'TMI' && l.key === key);
  // TMI 답글: 답글은 한 단계 더(답글의 답글)까지. 방금 단 답글은 반영 전에도 이 폰엔 보여요
  const treId = (par, t) => window.DATA.slVer(['TMI답글', par, t.replace(/\s+/g, ' ').toLowerCase()]);
  const treOf = par => {
    const uid = myUid(), sent = (boxRead(TMI_SENT) || []).filter(x => x.re && x.parent === par && !x.del);
    const list = (data.lyrics || []).filter(l => l.kind === 'TMI답글' && l.parent === par);
    sent.filter(x => !x.up && !list.some(l => l.id === x.id)).forEach(x => list.push({ id: x.id, key: x.key, text: x.t, parent: par, n: 1, who: [uid], first: uid, at: x.at, wait: true }));
    return list.sort((a, b) => a.at - b.at);
  };
  const treCount = par => { const l = treOf(par); return l.length + l.reduce((n, x) => n + treOf(x.id).length, 0); };
  function treBox(l, key, depth = 0) {
    const uid = myUid(), sent = boxRead(TMI_SENT) || [], ids = new Set(sent.map(x => x.id)), list = treOf(l.id), rpd = boxRead(RP_SENT) || [];
    const row = r => {
      const me = r.first === uid || (ids.has(r.id) && !(sent.find(x => x.id === r.id) || {}).up), on = me || r.who.includes(uid) || ids.has(r.id);
      return `<div class="tre-row${rpd.includes(r.id) ? ' rp-done' : ''}"><div class="ly-line tre-line"><span class="ch-t">↳ ${esc(r.text)}${r.wait ? ' <small class="src-note">반영 중</small>' : ''}</span><span class="ly-side"><button type="button" class="bpill tre-up${on ? ' on' : ''}" data-key="${esc(key)}" data-p="${esc(l.id)}" data-t="${esc(r.text)}"${on ? ' disabled' : ''} aria-label="좋아요">${on ? '♥' : '♡'} ${r.n + (ids.has(r.id) && !r.who.includes(uid) && !r.wait ? 1 : 0)}</button>${me ? `<button type="button" class="link-btn tre-del" data-p="${esc(l.id)}" data-t="${esc(r.text)}" aria-label="지우기">×</button>` : rpBtn(r)}${isAdmin() && !r.wait ? `<button type="button" class="link-btn ly-hide" data-id="${esc(r.id)}">숨기기</button>` : ''}</span></div>${depth < 1 && !r.wait ? treBox(r, key, depth + 1) : ''}</div>`;
    };
    const n = depth ? list.length : treCount(l.id);
    return `<details class="tre-box${depth ? ' tre-sub' : ''}" data-p="${esc(l.id)}"><summary>💬 답글${n ? ` ${n}` : ' 달기'}</summary>${list.map(row).join('')}
      <div class="tre-form"><input type="text" class="op-in tre-in" maxlength="200" placeholder="${depth ? '답글에 답글 달기' : '답글 달기'}"><button type="button" class="bpill tre-send" data-key="${esc(key)}" data-p="${esc(l.id)}">달기</button></div></details>`;
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.tre-send, .tre-up, .tre-del');
    if (!b) return;
    const by = myUid(), sent = boxRead(TMI_SENT) || [], par = b.dataset.p;
    if (b.matches('.tre-del')) {
      const t = b.dataset.t;
      formPost(`종류: 가사삭제\n번호: ${window.DATA.slVer([by, 'TMI답글', par, t.replace(/\s+/g, ' ').toLowerCase()])}\n누가: ${by}`).catch(() => {});
      boxWrite(TMI_SENT, sent.map(x => x.id === treId(par, t) ? { ...x, del: true } : x));
      toast('지웠어요. 5~10분쯤 뒤 모두에게서 빠져요.');
      const row = b.closest('.tre-row'); if (row) row.remove();
      return;
    }
    const box = b.closest('.tre-box'), inp = box && box.querySelector(':scope > .tre-form .tre-in');
    const t = b.matches('.tre-up') ? b.dataset.t : (inp ? inp.value : '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!t) return;
    if (banned()) { toast(banMsg()); return; }
    b.disabled = true;
    formPost(`종류: TMI답글\n곡키: ${b.dataset.key}\n답글: ${par}\n누가: ${by}\n내용: ${t}`).then(() => {
      boxWrite(TMI_SENT, [...sent.filter(x => x.id !== treId(par, t)), { id: treId(par, t), key: b.dataset.key, parent: par, re: 1, t, at: Date.now(), ...(b.matches('.tre-up') ? { up: 1 } : {}) }].slice(-300));
      if (b.matches('.tre-up')) { b.classList.add('on'); b.textContent = '♥ ' + (parseInt(b.textContent.replace(/\D/g, ''), 10) + 1); toast('♥ 눌렀어요.'); return; }
      toast('답글을 달았어요. 5~10분쯤 뒤 모두에게 보여요.');
      const d = b.closest('.tre-box'), l = { id: par }, depth = d.classList.contains('tre-sub') ? 1 : 0;
      const tmp = document.createElement('div'); tmp.innerHTML = treBox(l, b.dataset.key, depth); const nb = tmp.firstElementChild; nb.open = true; d.replaceWith(nb);
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  });
  const tmiId = (key, t) => window.DATA.slVer(['TMI', key, t.replace(/\s+/g, ' ').toLowerCase()]);
  function tmiBox(key, title) {
    const uid = myUid(), sent = boxRead(TMI_SENT) || [], ids = new Set(sent.map(x => x.id)), rpd = boxRead(RP_SENT) || [];
    const list = tmiOf(key).sort((a, b) => b.n - a.n || a.at - b.at);
    sent.filter(x => x.key === key && !x.del && !list.some(l => l.id === x.id)).forEach(x => list.push({ id: x.id, text: x.t, src: x.src, n: 1, who: [uid], at: x.at, wait: true }));
    const srcHtml = u => !u ? '' : /^https?:\/\//.test(u) ? `<a class="tmi-src" href="${esc(u)}" target="_blank" rel="noopener">출처 ↗</a>` : `<span class="tmi-src">출처: ${esc(u)}</span>`;
    const row = l => {
      const me = l.who.includes(uid) || ids.has(l.id);
      return `<div class="ly-line${rpd.includes(l.id) ? ' rp-done' : ''}"><span class="ch-t">${esc(l.text)} ${srcHtml(l.src)}${l.wait ? ' <small class="src-note">반영 중</small>' : ''}</span><span class="ly-side"><button type="button" class="bpill tmi-up${me ? ' on' : ''}" data-key="${esc(key)}" data-t="${esc(l.text)}"${me ? ' disabled' : ''} aria-label="나도 봤어요">${me ? '♥' : '♡'} ${l.n + (ids.has(l.id) && !l.who.includes(uid) && !l.wait ? 1 : 0)}</button>${me ? `<button type="button" class="link-btn tmi-del" data-key="${esc(key)}" data-t="${esc(l.text)}" aria-label="지우기">×</button>` : rpBtn(l)}${isAdmin() ? `<button type="button" class="link-btn ly-hide" data-id="${esc(l.id)}">숨기기</button>` : ''}</span></div>${l.wait ? '' : treBox(l, key)}`;
    };
    return `<section class="tmi-box" data-key="${esc(key)}" data-title="${esc(title)}"><div class="block-head"><h2 class="h3">💡 TMI${list.length ? ` <span class="song-count">${list.length}</span>` : ''}</h2></div>
      ${list.length ? list.map(row).join('') : '<p class="src-note">아직 TMI가 없어요. 알고 있는 뒷이야기를 남겨 주세요.</p>'}
      <details class="tmi-add"><summary>＋ TMI 남기기</summary><div class="op-form ly-form">
        <textarea class="op-in tmi-in" rows="3" maxlength="300" placeholder="예: 앵콜 때 형호가 가사를 바꿔 불렀어요"></textarea>
        <input type="text" class="tmi-src-in" maxlength="200" placeholder="출처 (선택) — 영상 몇 분, 링크 등">
        <button type="button" class="bpill add-send tmi-send" data-key="${esc(key)}">남기기</button>
        <p class="src-note">마음에 들거나 같은 걸 봤다면 ♥를 눌러 주세요. 멤버 건강·사생활 추측이나 깎아내리는 글은 숨겨질 수 있어요. 이상한 글은 🚩로 알려 주세요.</p></div></details></section>`;
  }
  // 화면 위쪽 'TMI 남기기' 버튼: 아래 TMI 칸으로 내려가서 입력칸을 열어요
  const tmiJump = key => { const n = tmiOf(key).length; return `<div class="chips tmi-jumps"><button type="button" class="chip tmi-jump" data-key="${esc(key)}">💡 TMI${n ? ` ${n}` : ''} · 남기기</button></div>`; };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.tmi-jump');
    if (!b) return;
    const box = document.querySelector(`.tmi-box[data-key="${CSS.escape(b.dataset.key)}"]`);
    if (!box) return;
    const d = box.querySelector('.tmi-add'); if (d) d.open = true;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const i = box.querySelector('.tmi-in'); if (i) i.focus({ preventScroll: true }); }, 400);
  });
  const tmiRedraw = key => { const d = document.querySelector(`.tmi-box[data-key="${CSS.escape(key)}"]`); if (d) d.outerHTML = tmiBox(key, d.dataset.title); };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.tmi-send, .tmi-up, .tmi-del');
    if (!b) return;
    const key = b.dataset.key, by = myUid(), sent = boxRead(TMI_SENT) || [], title = (b.closest('.tmi-box') || {}).dataset ? b.closest('.tmi-box').dataset.title : key;
    if (b.matches('.tmi-del')) {
      const t = b.dataset.t;
      formPost(`종류: 가사삭제\n번호: ${window.DATA.slVer([by, 'TMI', key, t.replace(/\s+/g, ' ').toLowerCase()])}\n누가: ${by}`).catch(() => {});
      boxWrite(TMI_SENT, sent.map(x => x.id === tmiId(key, t) ? { ...x, del: true } : x));
      toast('지웠어요. 5~10분쯤 뒤 모두에게서 빠져요.');
      const row = b.closest('.ly-line'); if (row) row.remove();
      return;
    }
    const form = b.closest('.ly-form');
    const t = b.matches('.tmi-up') ? b.dataset.t : form.querySelector('.tmi-in').value.replace(/\s+/g, ' ').trim().slice(0, 300);
    const src = form ? form.querySelector('.tmi-src-in').value.trim().slice(0, 200) : '';
    if (!t) return;
    if (banned()) { toast(banMsg()); return; }
    b.disabled = true;
    formPost(`종류: TMI\n곡: ${title}\n곡키: ${key}\n출처: ${src}\n누가: ${by}\n내용: ${t}`).then(() => {
      boxWrite(TMI_SENT, [...sent.filter(x => x.id !== tmiId(key, t)), { id: tmiId(key, t), key, t, src, at: Date.now(), ...(b.matches('.tmi-up') ? { up: 1 } : {}) }].slice(-200));
      toast(b.matches('.tmi-up') ? '♥ 눌렀어요.' : '남겼어요. 5~10분쯤 뒤 모두에게 보여요.');
      tmiRedraw(key);
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  });
  // 버전 메모: 무대 기록 곡 이름에 붙은 설명(무반주·솔로·with OO 등)과 투어 셋리 메모를 날짜와 함께
  // 곡 화면 위 '적기' 버튼: 그 탭을 열고 입력칸으로 가요
  document.addEventListener('click', ev => {
    const g = ev.target.closest('.song-fix-go');
    if (g) { const d = document.querySelector('.song-edit'); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    const b = ev.target.closest('.song-write');
    if (!b) return;
    const tab = [...document.querySelectorAll('.pane-tabs button')].find(x => x.textContent.includes(b.dataset.t));
    if (!tab) return;
    tab.click();
    const pane = [...document.querySelectorAll('.pane-wrap > .pane')].find(p => !p.hidden), add = pane && pane.querySelector('.tmi-add');
    if (add) add.open = true;
    const inp = pane && pane.querySelector(b.dataset.f);
    if (inp) { inp.scrollIntoView({ block: 'center' }); setTimeout(() => inp.focus(), 250); }
  });
  // 곡 화면 탭 안에서는 접는 칸 없이 펼쳐서 보여요
  const flatBox = html => html.replace(/^\s*<details class="song-memo([^"]*)"[^>]*><summary>[\s\S]*?<\/summary>/, '<div class="tab-box$1">').replace(/<\/details>\s*$/, '</div>');
  const songMemoN = so => (songMemos(so).match(/class="box-ev"/g) || []).length;
  // 버전 메모가 두 가지 이상인 곡 (분류 필터 '버전 여러 개')
  const hasVersions = so => { if (so._vAt !== data) { so._vAt = data; so._v = new Set((songMemos(so).match(/<b>[^<]*<\/b>/g) || [])).size >= 2; } return so._v; };
  function songMemos(so) {
    const loose = t => t.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const own = loose(so.name + ' ' + so.key + ' ' + Object.keys(so.names || {}).join(' '));
    const memoOf = raw => {
      const parts = [];
      let n = raw.trim().replace(/^\(([^)]*)\)\s*/, (m, x) => { parts.push(x); return ''; });
      n = n.replace(/\s*-\s*([가-힣&·, ]+)$/, (m, x) => { parts.push(x); return ''; });
      [...n.matchAll(/[(\[]([^)\]]+)[)\]]/g)].forEach(m => parts.push(m[1]));
      return parts.map(x => x.trim()).filter(x => x && !/^\d+곡$|신곡예정/.test(x) && !own.includes(loose(x)) && loose(x) !== loose(so.name));
    };
    const rows = [];
    so.events.forEach(e => e.songs.forEach(x => {
      if (window.DATA.songKey(x) !== so.key) return;
      const m = memoOf(x);
      if (m.length) rows.push({ d: e.date, memo: m.join(' · '), href: '#/e/' + encodeURIComponent(e.id), t: e.title });
    }));
    so.tours.forEach(t => t.songs.forEach(x => {
      if (!x.note || window.DATA.songKey(window.DATA.setlistName(x.t.split(' / ')[0])) !== so.key && !x.t.split(/ \/ |\s+[+&]\s+/).some(p => window.DATA.songKey(window.DATA.setlistName(p)) === so.key)) return;
      const note = x.note.replace(/^\d부( 첫 곡| 마지막)?( · )?/, '').trim();
      if (note || /메들리/.test(x.t)) rows.push({ d: t.dates[0] || '', memo: [/^메들리/.test(x.t) ? '메들리' : '', note].filter(Boolean).join(' · '), href: '#/tour/' + encodeURIComponent(t.id), t: t.name });
    }));
    if (!rows.length) return '';
    const seen = new Set(), list = rows.sort((a, b) => b.d.localeCompare(a.d)).filter(r => { const k = r.href + r.memo; if (seen.has(k)) return false; seen.add(k); return true; });
    return `<details class="song-memo"${list.length <= 3 ? ' open' : ''}><summary>버전 메모 ${list.length}개</summary>
      ${list.map(r => `<a class="box-ev" href="${r.href}"><span>${r.d ? fmtDate(r.d, false) : ''}</span><b>${esc(r.memo)}</b><small>${esc(r.t)}</small></a>`).join('')}</details>`;
  }
  // ---------- 곡 정보 고치기 ----------
  // 곡 이름·같은 곡 합치기·개인곡 멤버(종류: 곡수정)와 언어(종류: 언어수정)는 올린 사람 + 다른 2명이 같은 걸 보내면 바뀌어요. 관리자 폰은 바로 확정.
  const SF_WHAT = { 이름: '곡 이름', 합치기: '같은 곡 합치기', 개인곡: '개인곡 멤버' };
  const sfSent = () => boxRead('sb-sf-sent') || [];
  const sfLabel = (v) => v.what === '합치기' ? `「${esc((data.songs.get(v.val) || {}).name || v.val)}」에 합치기` : v.what === '개인곡' ? (v.val === '없음' ? '개인곡 아님' : esc(v.val.split(',').join('·')) + ' 개인곡') : `이름 → ${esc(v.val)}`;
  function songFixState(so) {
    const uid = myUid(), sent = sfSent();
    const done = [so.nameWas ? okMini('이름 고침', `확인을 받아 이름을 고쳤어요. (원래 ${esc(so.nameWas)})`) : '', (so.mergedFrom || []).length ? okMini('같은 곡 합침', `확인을 받아 「${esc(so.mergedFrom.join('」, 「'))}」을 이 곡으로 합쳤어요.`) : ''].join('');
    const rows = (so.fixProps || []).map(v => {
      const me = v.who.includes(uid) || sent.includes([v.k, v.what, v.val].join('|'));
      return `<div class="sl-state"><span class="src-badge">${SF_WHAT[v.what]} · ${Math.min(v.n, 3)}/3</span><span class="sl-state-msg"><b class="dt-chg">${sfLabel(v)}</b> ${me ? '보냈어요. 다른 분들이 맞다고 하면 바뀌어요.' : "맞으면 '맞아요'를 눌러 주세요."}</span>${me ? '' : `<button type="button" class="bpill sf-send" data-k="${esc(v.k)}" data-w="${esc(v.what)}" data-v="${esc(v.val)}">맞아요</button>`}${isAdmin() ? `<button type="button" class="link-btn sf-send" data-k="${esc(v.k)}" data-w="${esc(v.what)}" data-v="${esc(v.val)}">바로 확정 (관리자)</button>` : ''}</div>`;
    }).join('');
    return done || rows ? `<div class="song-fix-state">${done}${rows}</div>` : '';
  }
  function songEditBox(so) {
    const tip = `<p class="src-note">${isAdmin() ? '관리자 기기라 보내면 바로 바뀌어요.' : '다른 두 분이 같은 내용으로 맞다고 하면 바뀌어요.'}</p>`;
    const solo = soloOf(so);
    const body = {
      nm: `<div class="op-form"><label class="add-f"><span>바른 곡 이름</span><input type="text" class="sf-in" maxlength="100" value="${esc(so.name)}"></label><button type="button" class="bpill add-send sf-go" data-k="${esc(so.key)}" data-w="이름">보내기</button>${tip}</div>`,
      same: `<div class="op-form"><label class="add-f"><span>같은 곡 (이 곡을 그 곡으로 합쳐요)</span><input type="text" class="sf-in" list="ss-list" maxlength="100" placeholder="곡 이름으로 찾기" autocomplete="off"></label>
        <datalist id="ss-list">${[...data.songs.values()].filter(x => x !== so).map(x => `<option value="${esc(x.name)}">`).join('')}</datalist>
        <button type="button" class="bpill add-send sf-go" data-k="${esc(so.key)}" data-w="합치기">보내기</button>${tip}</div>`,
      lang: langBox(so).replace('<details class="lang-fix">', '<details class="lang-fix" open>'),
      solo: `<div class="op-form"><p class="src-note">멤버 혼자 부른 곡이면 그 멤버를, 포레스텔라가 같이 부른 곡이면 '개인곡 아님'을 골라 주세요.</p>
        <div class="chips wrap sf-solo">${['두훈', '형호', '민규', '우림'].map(m => `<button type="button" class="chip${solo.includes(m) ? ' on' : ''}" data-m="${m}">${m}</button>`).join('')}<button type="button" class="chip${solo.length ? '' : ' on'}" data-m="없음">개인곡 아님</button></div>
        <button type="button" class="bpill add-send sf-go" data-k="${esc(so.key)}" data-w="개인곡">보내기</button>${tip}</div>`,
      etc: `<div class="op-form"><textarea class="op-in sf-etc" rows="3" maxlength="1000" placeholder="예: 수록 음반이 틀렸어요, 타이틀곡이 아니에요"></textarea><button type="button" class="bpill add-send sf-etc-send" data-k="${esc(so.key)}">보내기</button><p class="src-note">의견 탭에 '정보 수정'으로 올라가요.</p></div>`,
    };
    const tabs = [['nm', '🏷 곡 이름'], ['same', '🔁 같은 곡'], ['lang', '🌐 언어'], ['solo', '👤 개인곡'], ['etc', '✏️ 그 밖에']];
    return `<details class="fix-box edit-box song-edit"><summary>✏️ 곡 정보 고치기</summary>
      <div class="chips edit-tabs">${tabs.map(([k, l]) => `<button type="button" class="chip" data-edit="${k}">${l}</button>`).join('')}</div>
      ${tabs.map(([k]) => `<div class="edit-pane" data-pane="${k}">${body[k]}</div>`).join('')}</details>`;
  }
  const sfPost = (k, what, val, b) => {
    const so = data.songs.get(k), adm = isAdmin();
    b.disabled = true;
    const p = formPost(`종류: 곡수정\n곡: ${so ? so.name : k}\n곡키: ${k}\n항목: ${what}\n값: ${val}\n누가: ${myUid()}`);
    (adm ? p.then(() => sendEvMark('sf' + window.DATA.slVer([k, what, val]), '숨김')) : p).then(() => {
      boxWrite('sb-sf-sent', [...sfSent(), [k, what, val].join('|')].slice(-200));
      b.textContent = '보냈어요 ✓';
      toast(adm ? '바꿨어요. 5~10분쯤 뒤 모두에게 반영돼요.' : '보냈어요! 다른 두 분이 맞다고 하면 바뀌어요.');
    }).catch(() => { b.disabled = false; toast('보내지 못했어요. 잠시 뒤 다시 해 주세요.'); });
  };
  document.addEventListener('click', ev => {
    const c = ev.target.closest('.sf-solo .chip');
    if (c) {
      const box = c.parentNode;
      if (c.dataset.m === '없음') box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
      else { c.classList.toggle('on'); box.querySelector('[data-m="없음"]').classList.toggle('on', !box.querySelector('.chip.on:not([data-m="없음"])')); }
      return;
    }
    const s1 = ev.target.closest('.sf-send');
    if (s1) { sfPost(s1.dataset.k, s1.dataset.w, s1.dataset.v, s1); return; }
    const e1 = ev.target.closest('.sf-etc-send');
    if (e1) {
      const so = data.songs.get(e1.dataset.k), t = e1.closest('.op-form').querySelector('.sf-etc').value.trim();
      if (!so || !t) return;
      e1.disabled = true;
      formPost(`종류: 의견\n분류: 정보 수정\n곡: ${so.name}\n이름: \n누가: ${myUid()}\n내용: 「${so.name}」 ${t}`).then(() => { e1.textContent = '보냈어요 ✓'; toast('고마워요! 의견 탭에서 처리됐는지 볼 수 있어요.'); }).catch(() => { e1.disabled = false; });
      return;
    }
    const g = ev.target.closest('.sf-go');
    if (!g) return;
    const so = data.songs.get(g.dataset.k), what = g.dataset.w, pane = g.closest('.op-form');
    if (!so) return;
    let val = '';
    if (what === '이름') { val = pane.querySelector('.sf-in').value.trim(); if (!val || val === so.name) { toast('바꿀 이름을 적어 주세요.'); return; } }
    else if (what === '합치기') {
      const n = pane.querySelector('.sf-in').value.trim(), to = [...data.songs.values()].find(x => x.name === n) || data.songs.get(window.DATA.songKey(n));
      if (!to || to === so) { toast('목록에 있는 곡 이름을 골라 주세요.'); return; }
      val = to.key;
    } else {
      const on = [...pane.querySelectorAll('.sf-solo .chip.on')].map(x => x.dataset.m);
      val = on.includes('없음') || !on.length ? '없음' : on.join(',');
    }
    sfPost(so.key, what, val, g);
  });

  // ---------- 연표 ----------
  const FIRST_YEAR = 2018;   // 포레스텔라 데뷔 해
  const CALENDAR_START = '2021-08';   // 팬카페 캘린더가 시작된 달

  // 같은 공연이 이틀 연속 열리면 연표에서 한 줄로 묶어요
  const samePlace = (a, b) => (a || '').replace(/\s+/g, '') === (b || '').replace(/\s+/g, '');
  // 콘서트 기간 안이라도 그 콘서트 공연 날(shows·투어 날짜)이거나 이름이 같은 일정만 콘서트로 봐요
  const cDays = new Map();
  function concertDays(c) {
    if (cDays.has(c)) return cDays.get(c);
    const o = new Set((c.tour && c.tour.dates) || []);
    (c.shows || []).forEach(x => {
      const m = String(x).match(/(\d{4})-(\d\d)-(\d\d)(?:~(?:(\d\d)-)?(\d\d))?/);
      if (!m) return;
      const a = Date.UTC(+m[1], m[2] - 1, +m[3]), b = m[5] ? Date.UTC(+m[1], (m[4] || m[2]) - 1, +m[5]) : a;
      for (let d = a; d <= b; d += 864e5) o.add(new Date(d).toISOString().slice(0, 10));
    });
    cDays.set(c, o);
    return o;
  }
  const nsp = t => (t || '').replace(/\s+/g, '').toLowerCase();
  function inConcert(c, e) {
    if (!c.from || e.date < c.from || e.date > (c.to || c.from)) return false;
    const ds = concertDays(c);
    if (!ds.size || ds.has(e.date)) return true;
    const core = nsp(c.name.replace(/\s*\(.*$/, ''));
    return core.length > 3 && nsp(e.title).includes(core);
  }
  // 연표 썸네일: 콘서트 포스터 → 무대·공식 영상 → 공식 X 후기 사진 (확실히 이어진 것만)
  function evPic(run) {
    const e = run[0];
    if (e.category === '공연') {
      const solo = /^\[/.test(e.title) ? soloInfos().find(c => c.evs.includes(e)) : null;
      if (solo && solo.img) return solo.img;
      const c = !/^\[/.test(e.title) && (data.concerts || []).find(c => inConcert(c, e));
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

  // 연표·공연·행사 공통: 멤버 칩(포레스텔라 = 그룹 일정)과 검색창
  const MEM_CHIPS = [['', '모든 멤버'], ['g', '포레스텔라'], ['배두훈', '두훈'], ['강형호', '형호'], ['조민규', '민규'], ['고우림', '우림']];
  const memChips = (m, href) => MEM_CHIPS.map(([v, l]) => `<a class="chip${v === m ? ' on' : ''}" href="${href(v)}">${l}</a>`).join('');
  const memOk = m => e => !m || (m === 'g' ? !(e.members || []).length : (e.members || []).includes(m));
  const qMatch = q => { if (!q.trim()) return null; return new Set(runSearch({ q, cat: '', year: '', from: '', to: '', member: '', video: '', sort: 'old' }).list.map(e => e.id)); };
  const filterBox = (id, ph, v) => `<form class="searchbox song-search" role="search" onsubmit="return false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="${id}" aria-label="${ph}" placeholder="${ph}" autocomplete="off" value="${esc(v)}">
      </form>`;
  const bindFilterBox = (id, set, fill) => {
    const q = document.getElementById(id); if (!q) return;
    let t = 0;
    q.oninput = () => { clearTimeout(t); t = setTimeout(() => { set(q.value); fill(); }, 200); };
  };
  let tlQ = '';
  const tlParams = () => { const qs = new URLSearchParams(location.hash.split('?')[1] || ''); return { qs, cat: qs.get('cat') || '', m: qs.get('m') || '' }; };
  function tlLastYear() { return data.events.length ? Number(data.events[data.events.length - 1].date.slice(0, 4)) : new Date().getFullYear(); }
  function tlContent() {
    const { qs, cat, m } = tlParams();
    const ym = qs.get('ym') || '';
    const year = qs.get('y') || (ym ? ym.slice(0, 4) : String(tlLastYear()));
    const hit = qMatch(tlQ);
    // 검색할 땐 모든 해에서 찾아요
    const events = data.events.filter(e => (hit ? hit.has(e.id) : e.date.startsWith(year)) && memOk(m)(e) && (!cat || e.category === cat));
    const months = new Map();
    events.forEach(e => {
      const m = e.date.slice(0, 7);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(e);
    });
    if (hit) return `<p class="sub tl-found">모든 해에서 찾은 일정 ${events.length}개</p>${months.size ? tlMonths(months) : '<p class="empty">찾는 일정이 없어요. 다른 말로 찾아보거나 일정을 등록해 주세요.</p>'}`;
    const gapText = year < CALENDAR_START.slice(0, 4) ? `${year}년` :
      year === CALENDAR_START.slice(0, 4) ? `${year}년 1~${Number(CALENDAR_START.slice(5)) - 1}월` : '';
    const gapHas = data.events.some(e => e.date.startsWith(year) && e.date.slice(0, 7) < CALENDAR_START);
    const gap = gapText && !gapHas ? `
      <div class="gap-card">
        <b>${gapText}</b>
        <span>이 시기 기록은 아직 비어 있어요. 기억나는 무대가 있다면 알려주세요.</span>
        <a href="#/add">일정 등록하기 ›</a>
      </div>` : '';
    const body = tlMonths(months);
    return `${gap}${body || (gap ? '' : `<p class="empty">${cat || m ? '조건에 맞는 기록이 이 해엔 없어요.' : '이 해의 기록이 아직 없어요.'}</p>`)}`;
  }
  function tlMonths(months) {
    return [...months.entries()].map(([m, list]) => `
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

  }
  function timelineView() {
    const { qs, cat, m } = tlParams();
    const ym = qs.get('ym') || '';
    const years = [];
    const lastYear = tlLastYear();
    // 일정이 있는 가장 이른 해부터 (데뷔 전 멤버 뮤지컬 등)
    const firstYear = Math.min(FIRST_YEAR, ...data.events.map(e => +e.date.slice(0, 4)).filter(y => y > 2000));
    for (let y = firstYear; y <= lastYear; y++) years.push(String(y));
    const has = new Set(data.events.map(e => e.date.slice(0, 4)));
    const year = qs.get('y') || (ym ? ym.slice(0, 4) : String(lastYear));
    const yearEvents = data.events.filter(e => e.date.startsWith(year) && memOk(m)(e));
    const cats = [...new Set(yearEvents.map(e => e.category).concat(cat || []).filter(Boolean))];
    const tlHref = (y, c, mm) => `#/timeline?y=${y}${c ? '&cat=' + encodeURIComponent(c) : ''}${mm ? '&m=' + encodeURIComponent(mm) : ''}`;
    return `
      <div class="tl-top">
        <h1 class="h1">연표</h1>
        ${filterBox('tl-q', '일정 찾기 · 이름, 장소, 곡', tlQ)}
        <div class="chips" id="years">
          ${years.map(y => `<a class="yr${y === year ? ' on' : ''}${has.has(y) ? '' : ' gap'}" href="${tlHref(y, cat, m)}"${y === year ? ' aria-current="true"' : ''}>${y}</a>`).join('')}
        </div>
        <div class="chips tl-cats">${cats.length > 1 ? ['', ...cats].map(c => `<a class="chip${c === cat ? ' on' : ''}" href="${tlHref(year, c, m)}"${c === cat ? ' aria-current="true"' : ''}>${c || '전체'} <b>${c ? yearEvents.filter(e => e.category === c).length : yearEvents.length}</b></a>`).join('') + '<span class="chip-sep" aria-hidden="true"></span>' : ''}${memChips(m, v => tlHref(year, cat, v))}</div>
        <div class="add-bar">${addQuick()}</div>
      </div>
      <div class="tl" id="tl-body">${tlContent()}</div>`;
  }
  function bindTimeline() {
    const q = view.querySelector('.add-quick'); if (q) bindAdd(q);
    bindFilterBox('tl-q', v => { tlQ = v; }, () => { const b = document.getElementById('tl-body'); if (b) b.innerHTML = tlContent(); });
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
    ['짠한형', '유튜브 예능', /짠한형/],
    ['지편한세상', '유튜브 예능', /지편한\s?세상/],
    ['카니버 X 포레스텔라', '유튜브 예능', /카니버/],
    ['준호지민 · 한끼줄게', '유튜브 예능', /준호\s?지민|한\s?끼\s?줄게/],
    ['알바구함', '유튜브 예능', /알바\s?구함/],
    ['일일칠 냉터뷰', '유튜브 예능', /냉터뷰/],
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
  const PROGRAM_TYPES = ['음악 경연', '음악쇼', '음악방송', '연말 · 시상식', '예능', '라디오', '유튜브 예능', '웹 콘텐츠', '지역 방송', '특집 · 행사', '모음'];
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
      let d = defOf(e.title);
      // 이름만 '열린음악회'인 지역 행사(KBS 방송 아님)는 프로그램에서 빼요
      if (d && d[0] === '열린음악회' && e.category !== 'TV' && !/kbs/i.test(e.title)) d = null;
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
    // 숨긴 일정은 data.byId에 없어서 빠지고, 원본에 합친 중복은 원본 하나로 세요
    // 뮤지컬 회차 직관은 'ID@날짜' 또는 'ID@날짜T시간'으로 저장해서, 그 회차 날짜의 일정으로 쳐요
    const one = id => { const [b, k] = id.split('@'), e = data.byId.get(b) || data.byId.get(boxMg()[b]); return e && k ? { ...e, date: k.slice(0, 10), start: k.slice(11) || e.start, endDate: '', castKey: id } : e; };
    const evs = ids => [...new Map(ids.map(one).filter(Boolean).map(e => [e.castKey || e.id, e])).values()];
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
    return { evs, wentAll, isBc, went, seen, liked, songs, heardList, topRegion, first, regionN: regions.size };
  }
  function boxView() {
    const { wentAll, went, seen, liked, songs, heardList, topRegion, first } = boxStats();
    const row = e => `<a class="box-ev" href="#/e/${encodeURIComponent(e.id)}"><span>${fmtDate(e.date, false)}</span><b>${esc(e.title)}</b></a>`;
    const empty = !wentAll.length && !seen.length && !liked.length && !songs.length && !SONG_PICKS.some(([k]) => pickList(k).length) && !(boxRead('sb-tmi-sent') || []).some(x => !x.del) && !Object.keys(lyMine()).length && !(boxRead(CH_SENT) || []).some(x => !x.del) && !(data.lyrics || []).some(l => l.who.includes(myUid()) && l.first !== myUid()) && !(boxRead('sb-ly-up') || []).length && !folders().length;
    const LIMIT = 8;
    const songChip = (so, n) => `<a class="chip" href="#/song/${encodeURIComponent(so.key)}">${esc(so.name)}${n > 1 ? ` ×${n}` : ''}</a>`;
    // 탭은 일정 · 곡 · 내 글 세 개, 안에서 작은 칩으로 골라요 (주소 #/box?t=그룹&s=칩&y=연도)
    const evRow = e => `<a class="box-ev" href="#/e/${encodeURIComponent(e.id)}"><span>${fmtDate(e.date, false)}</span><b>${esc(e.title)}${e.category ? `<small>${esc(e.category)}</small>` : ''}</b></a>`;
    // 곡은 칩 말고 곡 아카이브처럼 사진 + 이름 + 음반 줄로 (위 칩 필터와 헷갈리지 않게)
    const songRowB = (so, n) => `<a class="song-item box-song" href="#/song/${encodeURIComponent(so.key)}">${songPic(so) ? `<img class="song-thumb" src="${esc(songPic(so))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'song-thumb'}))">` : '<span class="song-thumb"></span>'}<span class="song-name"><span class="song-t">${esc(so.name)}</span><small>${so.albums[0] ? esc(so.albums[0].name) : ''}</small></span>${n > 1 ? `<span class="song-n"><b>${n}번</b></span>` : ''}</a>`;
    // 보관함 일정은 연표처럼 달별로 (같은 공연 여러 날은 한 줄로 묶여요)
    const boxTl = list => { const ms = new Map(); [...list].sort((a, b) => b.date.localeCompare(a.date)).forEach(e => { const k = e.date.slice(0, 7); if (!ms.has(k)) ms.set(k, []); ms.get(k).push(e); }); return `<div class="tl box-tl">${tlMonths(ms)}</div>`; };
    const chipsOf = list => `<div class="song-list box-songlist">${list.map(x => Array.isArray(x) ? songRowB(x[0], x[1]) : songRowB(x)).join('')}</div>`;
    const tmHref = k => k.startsWith('e:') ? '#/e/' + encodeURIComponent(k.slice(2)) : k.startsWith('t:') ? '#/tour/' + encodeURIComponent(k.slice(2)) : '#/song/' + encodeURIComponent(k.slice(2));
    const tmWhere = k => k.startsWith('e:') ? ((data.byId.get(k.slice(2)) || {}).title || '일정') : k.startsWith('t:') ? (((data.tours || []).find(t => t.id === k.slice(2)) || (data.concerts || []).find(c => c.id === k.slice(2)) || {}).name || '콘서트') : ((data.songs.get(k.slice(2)) || {}).name || '곡');
    // 내가 ♥ 누른 남의 글: 시트에서 내 번호가 든 글(첫 글쓴이가 내가 아닌 것) + 이 폰에 남긴 ♥ 기록
    const uid = myUid(), othersUp = new Map((data.lyrics || []).filter(l => l.who.includes(uid) && l.first && l.first !== uid).map(l => [l.id, l]));
    // 💬 가사는 내가 쓴(저장한) 것만: 남의 가사에 ♥ 누른 건 '♥ 누른 글'로 따로
    const lyUpIds = new Set([...othersUp.keys(), ...(boxRead('sb-ly-up') || []).map(x => x.id)]);
    const lyFirst = new Map((data.lyrics || []).map(l => [l.id, l.first]));
    const ly = Object.entries(lyMine()).flatMap(([k, list]) => list.map(m => [data.songs.get(k), m])).filter(x => x[0] && !(lyUpIds.has(lyId(x[0].key, x[1].t)) && lyFirst.get(lyId(x[0].key, x[1].t)) !== uid)).sort((a, b) => b[1].at - a[1].at);
    const ch = (boxRead(CH_SENT) || []).filter(x => !x.del && !x.up && !othersUp.has(x.id) && data.songs.get(x.key)).sort((a, b) => b.at - a.at);
    const tmLocal = (boxRead('sb-tmi-sent') || []).filter(x => !x.del && !x.up && !othersUp.has(x.id));
    // 다른 폰에서 쓴 내 TMI·답글도 (시트에서 첫 글쓴이가 나인 것)
    const tm = [...tmLocal, ...(data.lyrics || []).filter(l => l.first === uid && /^TMI/.test(l.kind) && !tmLocal.some(x => x.id === l.id)).map(l => ({ id: l.id, key: l.key, t: l.text, at: l.at, re: l.kind === 'TMI답글' }))].sort((a, b) => b.at - a.at);
    const ups = new Map([...othersUp.values()].map(l => [l.id, { kind: l.kind === 'TMI답글' ? 'TMI' : l.kind, key: l.key, t: l.text, at: l.at }]));
    // 내 TMI(와 내 답글)에 남이 단 새 답글: 보관함 '내 글'에 빨간 N
    const myIds = new Set([...tm.map(x => x.id), ...(data.lyrics || []).filter(l => l.first === uid && /^TMI/.test(l.kind)).map(l => l.id)]);
    const reSeen = Number(boxRead('sb-re-seen')) || 0;
    const newRe = (data.lyrics || []).filter(l => l.kind === 'TMI답글' && myIds.has(l.parent) && l.first !== uid && l.at > reSeen);
    const reBy = new Set(newRe.map(l => l.parent));
    (boxRead('sb-ly-up') || []).forEach(x => ups.has(x.id) || ups.set(x.id, { kind: '가사', key: x.key, t: x.t, at: x.at }));
    (boxRead(CH_SENT) || []).filter(x => x.up && !x.del).forEach(x => ups.has(x.id) || ups.set(x.id, { kind: '떼창', key: x.key, t: x.t, at: x.at }));
    (boxRead('sb-tmi-sent') || []).filter(x => x.up && !x.del).forEach(x => ups.has(x.id) || ups.set(x.id, { kind: 'TMI', key: x.key, t: x.t, at: x.at }));
    const upList = [...ups.values()].filter(x => x.kind === 'TMI' || data.songs.get(x.key)).sort((a, b) => b.at - a.at);
    const UP_ICON = { '가사': '💬', '떼창': '📣', 'TMI': '💡' };
    const upRow = x => { const tmi = x.kind === 'TMI'; return `<a class="box-ev box-note" href="${tmi ? tmHref(x.key) : '#/song/' + encodeURIComponent(x.key)}"><span>${esc(tmi ? tmWhere(x.key) : data.songs.get(x.key).name)}</span><b>${UP_ICON[x.kind] || ''} ${esc(x.t)}</b></a>`; };
    const lyRow = ([so, m]) => `<a class="box-ev box-note" href="#/song/${encodeURIComponent(so.key)}"><span>${esc(so.name)}</span><b>“${esc(m.t)}”</b></a>`;
    const chRow = x => `<a class="box-ev box-note" href="#/song/${encodeURIComponent(x.key)}"><span>${esc(data.songs.get(x.key).name)}</span><b>📣 ${esc(x.t)}</b></a>`;
    const tmRow = x => `<a class="box-ev box-note" href="${tmHref(x.key)}"><span>${reBy.has(x.id) ? '<em class="n-dot" aria-label="새 답글">N</em> ' : ''}${esc(tmWhere(x.key))}</span><b>${x.re ? '↳ ' : ''}${esc(x.t)}</b></a>`;
    const groups = [
      ['ev', '🎫 일정', [['w', '🎫 직관', went, 'ev'], ['b', '📺 시청', seen, 'ev'], ['e', '♥ 좋아요', liked, 'ev']]],
      ['song', '🎵 곡', [['s', '♥ 하트', songs, 'chip'], ...SONG_PICKS.map(([k, l]) => [k, l, pickList(k), 'chip']), ['h', '🎧 들은 곡', heardList, 'chip'], ...folders().map(f => ['f-' + f.id, '📁 ' + f.name, folderSongs(f.id), 'chip', true])]],
      ['my', '✍️ 내 글' + (newRe.length ? ' <em class="n-dot">N</em>' : ''), [['l', '💬 가사', ly, lyRow, !ch.length && !tm.length], ['c', '📣 떼창', ch, chRow], ['tmi', '💡 TMI' + (newRe.length ? ' <em class="n-dot">N</em>' : ''), tm, tmRow]]],
      ['up', '♥ 누른 글', [['all', '전체', upList, upRow, true], ['l', '💬 가사', upList.filter(x => x.kind === '가사'), upRow], ['c', '📣 떼창', upList.filter(x => x.kind === '떼창'), upRow], ['tmi', '💡 TMI', upList.filter(x => x.kind === 'TMI'), upRow]]],
    ].map(([k, l, subs]) => [k, l, subs.filter(x => x[2].length || x[4])]).filter(g => g[2].length);
    // 예전 주소(#/box?t=w 등)는 그 칩이 든 탭으로
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    let t = q.get('t') || '', sub = q.get('s') || '';
    if (t === 'my' && sub === 'up') { t = 'up'; sub = ''; }
    const old = groups.find(g => g[2].some(x => x[0] === t || (t === 'p' && SONG_PICKS.some(([k]) => k === x[0]))));
    if (old && !groups.some(g => g[0] === t)) { sub = t === 'p' ? '' : t; t = old[0]; }
    const g = groups.find(x => x[0] === t) || groups[0] || ['', '', []];
    t = g[0];
    const sc = g[2].find(x => x[0] === sub) || g[2][0] || ['', '', [], 'ev'];
    sub = sc[0];
    let list = sc[2], yearBar = '';
    const link = (tt, ss, yy) => `#/box?t=${tt}${ss ? '&s=' + ss : ''}${yy ? '&y=' + yy : ''}`;
    if (sc[3] === 'ev') {
      const years = [...new Set(list.map(e => e.date.slice(0, 4)))].sort().reverse(), y = years.includes(q.get('y')) ? q.get('y') : '';
      if (years.length > 1) yearBar = `<select class="box-year" aria-label="연도"><option value="${link(t, sub)}">전체 연도</option>${years.map(x => `<option value="${link(t, sub, x)}"${x === y ? ' selected' : ''}>${x} · ${list.filter(e => e.date.startsWith(x)).length}</option>`).join('')}</select>`;
      if (y) list = list.filter(e => e.date.startsWith(y));
    }
    const fdCur = sub.startsWith('f-') ? folders().find(f => 'f-' + f.id === sub) : null;
    const fdTools = t === 'song' ? `<div class="fd-tools">${fdCur ? `<button type="button" class="link-btn fd-ren" data-id="${esc(fdCur.id)}">이름 바꾸기</button><button type="button" class="link-btn fd-del" data-id="${esc(fdCur.id)}">폴더 지우기</button>` : ''}<button type="button" class="link-btn fd-add">＋ 새 폴더</button></div>` : '';
    const html = fdTools + (fdCur && !list.length ? '<p class="empty">아직 빈 폴더예요. 곡 화면의 📁 버튼으로 곡을 담아 보세요.</p>' : '') + (sc[3] === 'ev' ? boxTl(list) : sc[3] === 'chip' ? chipsOf(list) + (SONG_PICKS.some(([k]) => k === sub) ? '<p class="src-note">곡 화면에서 몇 곡이든 고를 수 있어요. 숲별 카드에 넣은 곡도 같이 보여요.</p>' : '') : list.map(sc[3]).join(''));
    // 비어 있는 탭(아직 쓴 글·♥ 누른 글이 없을 때) 안내
    const emptyMsg = !list.length && t === 'my' ? '<p class="empty">아직 쓴 글이 없어요. 곡 화면에서 좋아하는 가사 · 떼창 구간 · TMI를 남겨 보세요.</p>' : !list.length && t === 'up' ? '<p class="empty">아직 ♥ 누른 글이 없어요. 숲별 이야기에서 마음에 드는 글에 ♥를 눌러 보세요.</p>' : '';
    const cur = { n: list.length, html: html + emptyMsg };
    if (t === 'my' && sub === 'tmi' && newRe.length) boxWrite('sb-re-seen', Math.max(...newRe.map(l => l.at)));
    const subBar = g[2].length > 1 || yearBar ? `<div class="box-subrow"><div class="box-subs">${g[2].length > 1 ? g[2].map(x => `<a class="box-sub${x[0] === sub ? ' on' : ''}" href="${link(t, x[0])}">${x[1]} <small>${x[2].length}</small></a>`).join('') : ''}</div>${yearBar}</div>` : '';
    // 검색용: 일정·곡·내 글을 한 목록에
    const findAttr = t => `data-n="${esc(norm(t))}" data-c="${esc(chosung(t))}"`;
    const allEv = [...new Map([...liked, ...wentAll, ...seen].map(e => [e.castKey || e.id, e])).values()].sort((a, b) => b.date.localeCompare(a.date));
    const songMarks = new Map();
    const mark = (so, m) => { if (so) songMarks.set(so, (songMarks.get(so) || '') + m); };
    songs.forEach(so => mark(so, '♥')); SONG_PICKS.forEach(([k, l]) => pickList(k).forEach(so => mark(so, l.split(' ')[0])));
    const hitRow = (h, label, text, find) => `<a class="box-ev box-hit" ${findAttr(find)} href="${h}"><span>${esc(label)}</span><b>${esc(text)}</b></a>`;
    const allItems = allEv.map(e => `<a class="box-ev box-hit" ${findAttr(e.title + ' ' + (e.place || ''))} href="#/e/${encodeURIComponent(e.id)}"><span>${fmtDate(e.date, false)}</span><b>${e.castKey || boxHas('w', e.id) ? '🎫 ' : ''}${boxHas('v', e.id) ? '📺 ' : ''}${boxHas('e', e.id) ? '♥ ' : ''}${esc(e.title)}</b></a>`).join('')
      + (songMarks.size ? `<div class="chips box-songs">${[...songMarks].map(([so, m]) => `<a class="chip box-hit" ${findAttr(so.name)} href="#/song/${encodeURIComponent(so.key)}">${m} ${esc(so.name)}</a>`).join('')}</div>` : '')
      + ly.map(([so, m]) => hitRow('#/song/' + encodeURIComponent(so.key), so.name, '“' + m.t + '”', so.name + ' ' + m.t)).join('')
      + ch.map(x => hitRow('#/song/' + encodeURIComponent(x.key), data.songs.get(x.key).name, '📣 ' + x.t, data.songs.get(x.key).name + ' ' + x.t)).join('')
      + tm.map(x => hitRow(tmHref(x.key), tmWhere(x.key), '💡 ' + x.t, tmWhere(x.key) + ' ' + x.t)).join('');
    const pickN = SONG_PICKS.map(([k, l]) => [l, pickList(k).length]).filter(x => x[1]);
    const songLine = [...pickN.map(([l, n]) => `${l} ${n}`), songs.length ? `♥ 곡 ${songs.length}` : '', liked.length ? `♥ 일정 ${liked.length}` : ''].filter(Boolean).join(' · ');
    const sync = !boxApi() ? '' : boxUser ? `
      <details class="box-sync box-sync-on">
        <summary>☁️ 다른 폰에서도 이어 쓰는 중 · <b>${esc(boxUser.name)}</b></summary>
        <span>이름 <b>${esc(boxUser.name)}</b>${boxUser.at ? ` · 마지막 저장 ${new Date(boxUser.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
        <button type="button" class="link-btn" id="box-out">이 폰에서 연결 끊기</button>
      </details>` : `
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
        <div class="box-nums"><span><b>${went.length}</b>번 직관</span><span><b>${seen.length}</b>번 시청</span><span><b>${heardList.length}</b>곡 들음</span></div>
        ${first ? `<p class="sub">첫 직관 · ${fmtDate(first.date, false)} ${esc(first.title)}</p>` : ''}
        ${songLine ? `<p class="sub box-line">${songLine}</p>` : ''}
        <a class="map-entry" href="#/map">👣 숲별 발자국 · 지도로 되돌아보기 <span>›</span></a>
      </section>` : songLine ? `<p class="sub box-line">${songLine}</p>` : ''}
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
      <div class="box-tabs">${groups.map(([k, label]) => `<a class="box-tab${k === t ? ' on' : ''}" href="#/box?t=${k}"${k === t ? ' aria-current="true"' : ''}>${label}</a>`).join('')}</div>
      ${subBar}
      <section class="block box-list${cur.n > LIMIT ? ' short' : ''}">
        ${cur.html || '<p class="empty">아직 없어요.</p>'}
        ${cur.n > LIMIT ? `<button type="button" class="link-btn box-more">${cur.n}개 전체 보기</button>` : ''}
      </section>
      </div>`}
      ${sync}`;
  }
  // ---------- 직관 지도: 내가 간 일정을 지도에 찍고, 날짜순으로 따라가며 되돌아봐요 ----------
  // 지도 프로그램(Leaflet)과 공연장 좌표(data/places.json)는 이 화면을 열 때만 불러와요
  const REGION_C = { '서울': [37.5665, 126.978], '경기·인천': [37.42, 126.95], '강원': [37.75, 128.3], '충청': [36.55, 127.2], '전라': [35.35, 127.0], '경상': [35.75, 128.75], '제주': [33.42, 126.55] };
  // 한반도 전체로 볼 때 숫자 풍선 자리 (서로 안 겹치게 조금씩 옮긴 자리)
  const REGION_V = { '서울': [37.9, 127.0], '경기·인천': [37.2, 126.55], '강원': [37.6, 128.8], '충청': [36.5, 127.1], '전라': [35.2, 126.95], '경상': [35.85, 128.85], '제주': [33.38, 126.55] };
  const KOREA_B = [[33.1, 125.4], [38.6, 129.7]];
  // 따라걷기 속도 (이 폰에 기억). 제일 빠르면 거의 바로바로 넘어가요
  const MAP_SPEEDS = [['느리게', 5000], ['보통', 3000], ['빠르게', 1200], ['쉬시식', 350]];
  const MAP_SP = 'sb-map-sp', mapSp = () => { const v = boxRead(MAP_SP); return Number.isInteger(v) && v >= 0 && v < MAP_SPEEDS.length ? v : 1; };
  const MAP_H = 'sb-map-h';
  const MAP_AHEAD = 'sb-map-ahead'; // true면 앞으로 갈 초록 점선을 숨겨요
  const MAP_Z = 'sb-map-z', mapZ = () => { const z = boxRead(MAP_Z); return z >= 10 && z <= 17 ? z : 11; };
  let leafletP = null, placesP = null, mapSt = { mode: '', i: -1, pin: null, from: '', to: '', tour: false, play: false, mem: '', kind: '', uz: 0 }, lmap = null, mapPlay = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return leafletP = leafletP || new Promise((ok, no) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'lib/leaflet/leaflet.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'lib/leaflet/leaflet.js'; js.onload = () => ok(window.L); js.onerror = () => { leafletP = null; no(new Error('지도')); };
      document.head.appendChild(js);
    });
  }
  const loadPlaces = () => placesP = placesP || fetch('data/places.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => j.found || {});
  // 일정 장소 이름: 장소 칸, 없으면 내용의 '장소:' 줄
  const placeOf = e => (e.place || '').trim() || (((e.content || '').match(/장소\s*[:：]\s*(.+)/) || [])[1] || '').trim();
  const PLACE_PRIV = '비공개';
  function locOf(e, found) {
    if (placeOf(e) === PLACE_PRIV) return { lat: null, lng: null, exact: false, place: PLACE_PRIV, region: PLACE_PRIV };
    // 큰 지역은 일정 글자(장소·제목)로 먼저 정하고, 모르면 좌표로
    const r = regionOf(e), rk = REGION_C[r] ? r : '';
    if (e.placeLoc) return { ...e.placeLoc, exact: true, place: placeOf(e), region: rk || regionNear(e.placeLoc) };
    const p = placeOf(e), pin = p && (data.pins || {})[p];
    if (pin && pin.ok) return { ...pin.ok, exact: true, place: p, region: rk || regionNear(pin.ok), nid: found[p] && found[p].nid };
    if (p && found[p]) return { lat: found[p].lat, lng: found[p].lng, exact: true, place: p, addr: found[p].addr || '', region: rk || regionNear(found[p]), nid: found[p].nid };
    if (r && REGION_C[r]) return { lat: REGION_C[r][0], lng: REGION_C[r][1], exact: false, place: p, region: r };
    return { lat: null, lng: null, exact: false, place: p, region: r || '' };
  }
  // 조금 확대하면 시·도 17개로 나눠 보여요 (주소 첫 낱말 → 일정 글자 → 큰 지역 안에서 가장 가까운 중심)
  const SIDO = [['서울', '서울', 37.5665, 126.978, /서울/], ['인천', '경기·인천', 37.4563, 126.7052, /인천|송도|인스파이어|계양|Incheon/i], ['경기', '경기·인천', 37.35, 127.25, /경기|수원|고양|킨텍스|성남|분당|용인|부천|광명|안성|의정부|가평|자라섬|과천|파주|화성|평택|안양|김포|하남|남양주|이천|여주|포천|양평|오산|시흥|군포|구리|양주|Suwon|Goyang/i],
    ['강원', '강원', 37.75, 128.3, /./], ['대전', '충청', 36.3504, 127.3845, /대전|Daejeon|in DA(?!EGU)/i], ['세종', '충청', 36.48, 127.289, /세종시|세종특별/], ['충북', '충청', 36.8, 127.7, /충북|충청북|청주|충주|제천|Cheongju/i], ['충남', '충청', 36.5, 126.8, /충남|충청남|천안|아산|공주|보령|서산|당진|논산|계룡|예산|부여|홍성|이순신/],
    ['광주', '전라', 35.1595, 126.8526, /광주|Gwangju|김대중컨벤션|지스트|타이거즈/i], ['전북', '전라', 35.72, 127.15, /전북|전라북|전주|익산|군산|남원|광한루|정읍|고창|원광|Jeonju/i], ['전남', '전라', 34.86, 126.99, /전남|전라남|목포|여수|순천|나주|광양|화순|함평|영광|곡성|장흥|보림사|드래곤즈/],
    ['부산', '경상', 35.1796, 129.0756, /부산|Busan|벡스코|BNK|영도|in BU/i], ['대구', '경상', 35.8714, 128.6014, /대구|Daegu|엑스코/i], ['울산', '경상', 35.5384, 129.3114, /울산|Ulsan|태화강/i], ['경북', '경상', 36.4, 128.75, /경북|경상북|경주|포항|안동|구미|김천|칠곡|영덕|울진|직지사|예주/], ['경남', '경상', 35.3, 128.3, /경남|경상남|창원|김해|통영|용호도|진주|거제|3\.15|Changwon/i], ['제주', '제주', 33.42, 126.55, /./]];
  const SIDO_C = Object.fromEntries(SIDO.map(x => [x[0], [x[2], x[3]]]));
  function sidoOf(x) {
    const big = x.l.region, cand = SIDO.filter(d => d[1] === big);
    if (!cand.length) return big;
    const a = (x.l.addr || '').trim().split(/\s+/)[0] || '';
    const byAddr = a && SIDO.find(d => a.startsWith(d[0]) || (d[0] === '충북' && a.startsWith('충청북')) || (d[0] === '충남' && a.startsWith('충청남')) || (d[0] === '전북' && a.startsWith('전라북')) || (d[0] === '전남' && a.startsWith('전라남')) || (d[0] === '경북' && a.startsWith('경상북')) || (d[0] === '경남' && a.startsWith('경상남')));
    if (byAddr) return byAddr[0];
    if (cand.length === 1) return cand[0][0];
    const t = `${x.l.place || ''} ${x.e.title || ''}`, hit = cand.find(d => d[4].test(t));
    if (hit && !(hit[0] === '광주' && /경기 광주/.test(t))) return hit[0];
    if (x.l.lat == null || !x.l.exact) return big;
    let best = cand[0][0], d0 = 1e9;
    cand.forEach(d => { const dd = (d[2] - x.l.lat) ** 2 + (d[3] - x.l.lng) ** 2; if (dd < d0) { d0 = dd; best = d[0]; } });
    return best;
  }
  // 정확한 좌표도 '큰 지역'에 묶어 멀리서 볼 때 숫자로 보여요 (지역을 모르면 가장 가까운 중심으로)
  function regionNear(l) {
    // 서울은 대략 네모 칸 안이면 서울 (가까운 중심만 보면 관악·서초가 경기로 잡혀요)
    if (l.lat > 37.42 && l.lat < 37.70 && l.lng > 126.79 && l.lng < 127.18) return '서울';
    let best = '', d0 = 1e9;
    Object.entries(REGION_C).forEach(([k, [a, b]]) => { const d = (a - l.lat) ** 2 + (b - l.lng) ** 2; if (d < d0) { d0 = d; best = k; } });
    return best;
  }
  function mapList(found) {
    const bs = boxStats();
    const mine = bs.wentAll.slice().sort((a, b) => a.date.localeCompare(b.date));
    const st = mapParams();
    mapSt.mode = st.s || (mine.length ? 'w' : 'all');
    const list = mapSt.mode === 'w' ? mine : data.events.filter(e => isLocalEvent(e) && !MAP_ONLINE.test(e.title) && !MAP_ONLINE.test(placeOf(e)) && !(/팬사인회|팬싸인회|팬싸/.test(e.title) && !placeOf(e))).sort((a, b) => a.date.localeCompare(b.date));
    const years = [...new Set(list.map(e => e.date.slice(0, 4)))].sort();
    // 기간 고르기: from/to는 'YYYY-MM'
    const inRange = x => (!st.m.length || st.m.some(v => memOk(v)(x.e))) && (!st.k.length || st.k.includes(mapKind(x.e))) && (!st.y.length || st.y.includes(x.e.date.slice(0, 4))) && (!st.r.length || st.r.includes(mapRegion(x.l)));
    const base = list.map(e => ({ e, l: locOf(e, found) })), items = base.filter(inRange);
    return { base, st, all: items, on: items.filter(x => x.l.lat != null), off: items.filter(x => x.l.lat == null), mine: mine.length, years, first: list[0], last: list[list.length - 1] };
  }
  // 온라인으로만 본 공연은 갈 수 있는 곳이 아니라서 '모든 일정' 지도에선 빼요
  // 팬사인회는 장소를 당첨자에게만 알려줘서, 장소가 없으면 '모든 일정' 지도에선 빼요 (내 직관 지도엔 남아요)
  const MAP_ONLINE = /온택트|온라인|비대면|랜선|웹뮤지컬/;
  // 종류: 콘서트·팬미팅 / 뮤지컬 / 그 밖의 행사
  const MAP_KINDS = [['', '모든 종류'], ['c', '콘서트·팬미팅'], ['ev', '행사·축제'], ['mu', '뮤지컬']];
  const mapKind = e => e.category === '뮤지컬' ? 'mu' : /콘서트|concert|투어|tour|팬미팅|팬콘|단독 공연|리사이틀/i.test(e.title) && !/게스트|축하/.test(e.title) ? 'c' : 'ev';
  // 필터 2.0: 멤버·종류·지역·연도 여러 개 (주소 #/map?s=w|all&m=&k=&r=&y=). 주소에 아무것도 없으면 이 폰에 기억한 필터로
  const MAP_F = 'sb-map-f';
  const mapRegion = l => l.region === '해외' || l.region === PLACE_PRIV ? (l.region === '해외' ? '해외' : '비공개') : l.region || (l.lat != null ? regionNear(l) : '모름');
  const MAP_REGS = ['서울', '경기·인천', '강원', '충청', '전라', '경상', '제주', '해외'];
  function mapParams() {
    const q = location.hash.split('?')[1];
    let qs = new URLSearchParams(q || '');
    if (!q) { const sv = boxRead(MAP_F); if (sv) qs = new URLSearchParams(sv); }
    else boxWrite(MAP_F, q);
    return { s: qs.get('s') || '', m: multiOf(qs, 'm'), k: multiOf(qs, 'k'), r: multiOf(qs, 'r'), y: multiOf(qs, 'y') };
  }
  function mapF(ml) {
    const memL = Object.fromEntries(MEM_CHIPS), kindL = Object.fromEntries(MAP_KINDS);
    const all = ml.base;
    return {
      base: '#/map', keys: ['m', 'k', 'r', 'y'], noSort: true,
      F: { m: ['멤버', x => memL[x] || x], k: ['종류', x => kindL[x] || x], r: ['지역', x => x], y: ['연도', x => x] },
      opts: { m: MEM_CHIPS.slice(1).map(x => x[0]).filter(v => all.some(x => memOk(v)(x.e))), k: MAP_KINDS.slice(1).map(x => x[0]).filter(v => all.some(x => mapKind(x.e) === v)), r: MAP_REGS.filter(v => all.some(x => mapRegion(x.l) === v)), y: [...new Set(all.map(x => x.e.date.slice(0, 4)))].sort().reverse() },
      cnt: (k, v) => all.filter(x => k === 'm' ? memOk(v)(x.e) : k === 'k' ? mapKind(x.e) === v : k === 'r' ? mapRegion(x.l) === v : x.e.date.startsWith(v)).length,
    };
  }
  // 못 찍은 일정: 해외와 장소 모름을 나눠서, 장소 모름엔 📍 장소 알려주기를 달아요 (MAP_OFF_PL이 켜져 있을 때)
  const MAP_OFF_PL = true;
  // 라디오는 장소를 몰라도 '위치 확인이 필요한 일정'에 안 넣어요 (스튜디오라 찾을 필요가 없어요)
  const needLoc = x => x.e.category !== '라디오' && !MAP_ONLINE.test(placeOf(x.e));
  function offList(off, rough = []) {
    const abroad = off.filter(x => x.l.region === '해외'), priv = off.filter(x => x.l.region === PLACE_PRIV), none = off.filter(x => x.l.region !== '해외' && x.l.region !== PLACE_PRIV);
    const row = (x, pl, pv) => `<div class="map-off-row"><a class="box-ev" href="#/e/${encodeURIComponent(x.e.id)}"><span>${fmtDate(x.e.date, false)}</span><b>${esc(x.e.title)}</b></a>${pl ? `<span class="map-off-act"><a class="chip map-off-pl" href="#/e/${encodeURIComponent(x.e.id)}?pl=1">📍 장소 알려주기</a></span>` : ''}</div>`;
    const how = MAP_OFF_PL ? `<div class="map-off-how"><p><b>하나씩 찾기</b> · 아래 줄마다 📍 장소 알려주기를 눌러 그 일정 장소를 골라요</p><p><b>한 번에 찾기</b> · 장소 이름으로 차례로 검색해 맞는 곳만 골라 담아요. 네이버 지도 링크를 여러 개 보내도 돼요</p><p><b>🔒 비공개</b> · 팬사인회처럼 장소를 당첨자에게만 알려 준 일정은 📍 장소 알려주기 창에서 비공개를 골라 주세요</p><div class="drive-btns"><a class="bpill" href="#/placefind">🔎 한꺼번에 찾기</a><a class="chip" href="#/opinion?w=map">🗺 네이버 링크 여러 곳 보내기</a></div></div>` : '';
    return how + (none.length ? `<h3 class="map-off-h">장소 모름 ${none.length}</h3>${none.map(x => row(x, MAP_OFF_PL, !placeOf(x.e))).join('')}` : '')
      + (rough.length ? `<h3 class="map-off-h">대략 위치로만 찍힘 ${rough.length}</h3><p class="map-off-n">공연장 좌표를 몰라서 지역 가운데에 찍혀 있어요</p>${rough.map(x => row(x, MAP_OFF_PL)).join('')}` : '')
      + (abroad.length ? `<h3 class="map-off-h">✈ 해외 ${abroad.length}</h3>${abroad.map(x => row(x, false)).join('')}` : '')
      + (priv.length ? `<h3 class="map-off-h">🔒 장소 비공개 ${priv.length}</h3><p class="map-off-n">장소를 당첨자에게만 알려 준 일정이에요</p>${priv.map(x => row(x, false)).join('')}` : '');
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.map-off-pv');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const k = 'pv:' + e.id;
    if (sendQHas(k)) { sendQDel(k); b.classList.remove('on'); b.textContent = '🔒 비공개'; return; }
    sendQAdd({ k, label: `🔒 ${fmtDate(e.date, false)} ${e.title} → 장소 비공개`, text: privText(e), slok: `pl:${e.id}:${PLACE_PRIV}` });
    b.classList.add('on'); b.textContent = '🔒 담았어요';
  });
  function mapView() {
    return `
      <a class="back" href="#/box">‹ 보관함</a>
      <h1 class="h1 page-title">숲별 발자국${help('🎫 직관했어요를 누른 일정이 지도에 떠요. 정확한 공연장을 모르는 곳은 큰 지역으로 묶어 보여요. 위치가 틀리면 📍 위치 고치기로 알려 주세요. 다른 두 분이 맞다고 하면 바뀌어요.')}</h1>
      ${driveBox()}
      <div id="map-root"><p class="empty">지도를 불러오는 중…</p></div>`;
  }
  let mapGen = 0;
  async function bindMap() {
    const root = document.getElementById('map-root'), gen = ++mapGen;
    let L, found;
    try { [L, found] = await Promise.all([loadLeaflet(), loadPlaces()]); } catch (err) { if (root) root.innerHTML = '<p class="empty">지도를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    if (!root || !root.isConnected || gen !== mapGen) return;
    if (lmap) { mapStop(); try { lmap.stop(); lmap.off(); lmap.remove(); } catch (err) { /* 이미 없어요 */ } lmap = null; }
    const ml = mapList(found);
    if (mapSt.i < 0 || mapSt.i >= ml.on.length) mapSt.i = ml.on.length - 1;
    root.innerHTML = `
      <div class="box-tabs map-modes"><a class="box-tab${mapSt.mode === 'w' ? ' on' : ''}" href="${fLink('#/map', { ...ml.st, s: 'w' })}">👣 내 발자국 ${ml.mine}</a><a class="box-tab${mapSt.mode === 'all' ? ' on' : ''}" href="${fLink('#/map', { ...ml.st, s: 'all' })}">포레스텔라 전체</a></div>
      ${(() => { const f = mapF(ml), st = { ...ml.st, s: mapSt.mode }, bar = fBar(f, st); return `<div class="map-period">${bar.row}<p class="sub map-count">${ml.all.length.toLocaleString()}개 · 장소 ${new Set(ml.on.map(x => x.l.exact ? x.l.lat.toFixed(4) + ',' + x.l.lng.toFixed(4) : x.l.region)).size}곳 · ${new Set(ml.all.map(x => mapRegion(x.l)).filter(r => r !== '모름' && r !== '비공개')).size}개 지역${bar.clear}</p></div><div class="yf-wrap" id="yf-wrap" hidden></div>`; })()}
      ${ml.on.length ? `
      ${mapSt.tour ? `<button type="button" class="link-btn map-car-t" id="map-car-t">${boxRead(MAP_H + '-car') ? '📷 사진 펼치기 ▾' : '📷 사진 접기 ▴'}</button>` : ''}
      <div class="map-car" id="map-car"${mapSt.tour && !boxRead(MAP_H + '-car') ? '' : ' hidden'}></div>
      <div class="map-stage${mapSt.tour ? '' : ' map-ov'}">
        <div id="map"${(() => { const h = boxRead(mapSt.tour ? MAP_H : MAP_H + '-ov'); return h >= 160 && h <= 900 ? ` style="height:${h}px"` : ''; })()}></div>
        <div class="map-tools">${mapSt.tour ? '<button type="button" class="map-trip" id="map-ov">🗺 전체 지도</button>' : '<button type="button" class="map-trip" id="map-trip">👣 숲길 따라걷기<small>가만히 두면 저절로 넘어가요</small></button>'}<button type="button" class="map-tool" id="map-zin" aria-label="확대">＋</button><button type="button" class="map-tool" id="map-zout" aria-label="축소">－</button><button type="button" class="map-tool" id="map-me" aria-label="내 위치 (이 폰 화면에만 써요)" title="내 위치 (이 폰 화면에만 써요)">📍</button>${mapSt.tour ? '<button type="button" class="map-tool" id="map-all" aria-label="전체 보기">⤢</button><button type="button" class="map-tool" id="map-here" aria-label="지금 일정으로">◎</button>' : ''}</div>
        <div class="map-grip" id="map-grip" role="separator" aria-label="지도 높이 조절"><span></span></div>
      </div>
      <div class="map-panel${mapSt.tour ? '' : ' map-sum'}" id="map-nav"></div>
      ${mapSt.tour ? `<div class="map-playbar"><button type="button" class="chip on" id="map-play">▶ 재생</button><span class="map-sp-l">속도</span>${MAP_SPEEDS.map(([l], k) => `<button type="button" class="chip${k === mapSp() ? ' on' : ''}" data-sp="${k}">${l}</button>`).join('')}<button type="button" class="chip${boxRead(MAP_AHEAD) ? '' : ' on'}" id="map-ahead" aria-pressed="${boxRead(MAP_AHEAD) ? 'false' : 'true'}">┄ 갈 길</button></div>` : ''}
      <div class="map-pinbar" id="map-pinbar" hidden></div>
      <div class="map-fixbox" id="map-fix"></div>
      <div id="map-venue"></div>
      ${ml.off.filter(needLoc).length || ml.on.some(x => !x.l.exact && needLoc(x)) ? `<details class="map-off"><summary>위치 확인이 필요한 일정 ${ml.off.filter(x => needLoc(x) && x.l.region !== PLACE_PRIV).length + ml.on.filter(x => !x.l.exact && needLoc(x)).length}개</summary>${offList(ml.off.filter(needLoc), ml.on.filter(x => !x.l.exact && needLoc(x)))}<button type="button" class="link-btn map-off-x" onclick="this.closest('details').open=false">접기 ▴</button></details>` : ''}
      <p class="src-note map-src">지도 © OpenStreetMap 기여자 · 공연장 위치는 자동으로 찾은 거라 틀릴 수 있어요.</p>`
      : ml.off.length ? `<p class="empty">이 기간 일정 ${ml.off.length}개는 장소를 몰라서 지도에 못 찍었어요. 아는 분은 📍 장소 알려주기로 알려 주세요.</p><div class="map-off">${offList(ml.off.filter(needLoc))}</div>` : `<p class="empty">${mapSt.mode === 'w' ? '아직 발자국이 없어요. 일정에서 🎫 직관했어요를 누르면 여기에 찍혀요.' : '지도에 찍을 일정이 없어요.'}</p>`}`;
    // 다녀간 순서대로 이은 거리(직선, km): cum[i] = 처음부터 i번째까지
    const rad = d => d * Math.PI / 180, hav = (a, b) => { const x = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
    const cum = ml.on.reduce((a, x, i) => (a.push(i ? a[i - 1] + hav(ml.on[i - 1].l, x.l) : 0), a), []);
    const km = v => `${Math.round(v).toLocaleString()}km`;
    const reset = () => { mapSt.i = -1; mapSt.tour = false; mapSt.uz = 0; mapStop(); bindMap(); };
    bindF(mapF(ml), { ...ml.st, s: mapSt.mode });
    if (!ml.on.length) return;
    const m = lmap = L.map('map', { zoomControl: false, attributionControl: false, minZoom: 5, maxZoom: 18, zoomSnap: 0.25 }).setView([36.3, 127.8], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    const layer = L.layerGroup().addTo(m);
    const pinIcon = L.divIcon({ className: '', html: '<span class="map-pin">📍</span>', iconSize: null });
    let curMark = null;
    const bubble = (n, cls, label) => L.divIcon({ className: '', html: `<span class="map-b ${cls}"><b>${n}</b>${label ? `<small>${esc(label)}</small>` : ''}</span>`, iconSize: null });
    const draw = () => {
      layer.clearLayers();
      const z = m.getZoom(), groups = new Map();
      ml.on.forEach(x => {
        // 멀리: 큰 지역 7개 · 조금 확대: 시·도 17개 · 더 확대: 공연장마다 (많이 확대하면 공연장 이름도)
        const key = z < 8 ? 'r:' + (x.l.region || regionNear(x.l)) : z < 10 ? 's:' + sidoOf(x) : x.l.exact ? 'p:' + x.l.lat.toFixed(4) + ',' + x.l.lng.toFixed(4) : 'r:' + x.l.region;
        const g = groups.get(key) || groups.set(key, { key, items: [] }).get(key);
        g.items.push(x);
      });
      // 다녀간 순서대로 잇는 길: 지나온 길은 진하게, 남은 길은 점선
      const pt = x => [x.l.lat, x.l.lng], cut = Math.max(0, mapSt.i);
      if (mapSt.tour && ml.on.length > 1) {
        if (!boxRead(MAP_AHEAD)) L.polyline(ml.on.slice(cut).map(pt), { color: '#2E8B57', weight: 2, opacity: .45, dashArray: '4 6', interactive: false }).addTo(layer);
        if (cut > 0) L.polyline(ml.on.slice(0, cut + 1).map(pt), { color: '#2E8B57', weight: 3, opacity: .8, interactive: false }).addTo(layer);
        // 지금 걷고 있는 구간 (바로 전 → 지금)
        if (cut > 0) L.polyline([pt(ml.on[cut - 1]), pt(ml.on[cut])], { color: '#F07B2A', weight: 5, opacity: .95, interactive: false }).addTo(layer);
      }
      // 공연장 이름은 겹치지 않는 것만 (많이 간 곳 먼저). 점을 누르면 아래에 그곳 일정이 나와요
      const shortP = p => { const t = String(p || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim(); return t.length > 14 ? t.slice(0, 13) + '…' : t; };
      const named = new Set();
      if (z >= 12) {
        const boxes = [];
        [...groups.values()].filter(g => g.key.startsWith('p:')).sort((a, b) => b.items.length - a.items.length).forEach(g => {
          const pt0 = m.latLngToContainerPoint([g.items[0].l.lat, g.items[0].l.lng]), w = shortP(g.items[0].l.place).length * 11 + 10;
          const r = { x1: pt0.x - w / 2, x2: pt0.x + w / 2, y1: pt0.y - 16, y2: pt0.y + 32 };
          if (boxes.some(o => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1)) return;
          boxes.push(r); named.add(g.key);
        });
      }
      groups.forEach(g => {
        const sido = g.key.startsWith('s:'), reg = sido || g.key.startsWith('r:'), name = g.key.slice(2), first = g.items[0].l, far = z < 10;
        const at = reg ? (sido ? SIDO_C[name] || REGION_C[name] : z < 8 ? REGION_V[name] : REGION_C[name]) || [first.lat, first.lng] : [first.lat, first.lng];
        const now = mapSt.tour && g.items.includes(ml.on[mapSt.i]);
        const mk = L.marker(at, { zIndexOffset: now ? 1000 : 0, icon: bubble(g.items.length, (now ? 'now ' : '') + (reg ? (far ? (mapSt.tour ? 'big' : 'ov') : 'fuzzy') : 'pin'), reg ? (far ? name : name + ' 어딘가') : named.has(g.key) ? shortP(first.place) : '') }).addTo(layer);
        mk.on('click', () => {
          if (reg && far && !mapSt.tour) { showVenue(g.items, name); document.getElementById('map-venue').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
          if (reg && far) { m.flyTo(at, z < 8 ? 8.5 : 10, { duration: 0.8 }); return; }
          // 점을 누르면 아래 안내판(날짜·일정·재생 막대)이 그곳 일정으로 넘어가요 (여러 번 간 곳은 가장 최근)
          const idx = ml.on.indexOf(g.items[g.items.length - 1]);
          if (mapSt.tour) { mapStop(); go(idx); return; }
          mapSt.tour = true; mapSt.play = false; mapSt.i = idx; bindMap();
        });
      });
      const cur = ml.on[mapSt.i];
      if (curMark) curMark.remove();
      if (!mapSt.tour) return;
      curMark = L.marker([cur.l.lat, cur.l.lng], { icon: L.divIcon({ className: '', html: '<span class="map-now"></span>', iconSize: null }), interactive: false, zIndexOffset: -100 }).addTo(m);
    };
    m.on('zoomend', draw);
    // 지도 아래 손잡이를 끌어서 높이 바꾸기 (이 폰에 기억, 전체 지도·따라걷기 따로)
    const ct = document.getElementById('map-car-t');
    if (ct) ct.onclick = () => { const c = document.getElementById('map-car'), off = !c.hidden; c.hidden = off; boxWrite(MAP_H + '-car', off ? 1 : 0); ct.textContent = off ? '📷 사진 펼치기 ▾' : '📷 사진 접기 ▴'; };
    const grip = document.getElementById('map-grip'), mapEl = document.getElementById('map');
    grip.onpointerdown = ev => {
      ev.preventDefault(); grip.setPointerCapture(ev.pointerId);
      const y0 = ev.clientY, h0 = mapEl.offsetHeight, max = Math.round(innerHeight * 0.85);
      let raf = 0;
      grip.onpointermove = e2 => { mapEl.style.height = Math.min(max, Math.max(160, h0 + e2.clientY - y0)) + 'px'; if (!raf) raf = requestAnimationFrame(() => { raf = 0; m.invalidateSize(); }); };
      grip.onpointerup = grip.onpointercancel = () => { grip.onpointermove = grip.onpointerup = grip.onpointercancel = null; m.invalidateSize(); boxWrite(mapSt.tour ? MAP_H : MAP_H + '-ov', mapEl.offsetHeight); };
    };
    // 사용자가 직접(손가락·＋/－) 바꾼 배율은 다음 장소에서도 그대로 써요. 프로그램이 움직일 땐 auto
    let auto = false;
    const moveAuto = f => { auto = true; m.once('moveend', () => setTimeout(() => { auto = false; }, 50)); f(); };
    m.on('zoomend', () => { if (!auto && mapSt.tour) mapSt.uz = m.getZoom(); });
    const showVenue = (items, name) => {
      const box = document.getElementById('map-venue');
      box.innerHTML = `<section class="map-venue"><div class="map-venue-h"><b>${esc(name || '장소')}</b><span>${items.length}번 <button type="button" class="link-btn map-venue-x">접기 ✕</button></span></div>${items.slice().reverse().map(x => `<button type="button" class="box-ev map-go" data-id="${esc(x.e.id)}"><span>${fmtDate(x.e.date, false)}</span><b>${esc(x.e.title)}</b></button>`).join('')}</section>`;
      box.querySelector('.map-venue-x').onclick = () => { box.innerHTML = ''; };
      box.querySelectorAll('.map-go').forEach(b => b.onclick = () => { go(ml.on.findIndex(x => x.e.id === b.dataset.id)); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    };
    const car = e => {
      const it = [];
      // 진짜 공연 포스터만 (영상 썸네일·X 사진은 아래에서 따로)
      const pic = e.category === '공연' ? evPic([e]) : '';
      if (pic && !/ytimg/.test(pic) && !(e.xPost && e.xPost.img && pic === imgSize(e.xPost.img, 'thumb'))) it.push(`<a class="map-c" href="#/e/${encodeURIComponent(e.id)}"><img src="${esc(pic)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><span>포스터</span></a>`);
      if (e.xPost && e.xPost.img) it.push(`<a class="map-c" href="${esc(e.xPost.url || '#/e/' + encodeURIComponent(e.id))}" target="_blank" rel="noopener"><img src="${esc(imgSize(e.xPost.img, 'small'))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><span>공식 X</span></a>`);
      const vids = [...new Map([e.videoId && { id: e.videoId, t: '영상' }, e.ytMain && { id: e.ytMain.id, t: '공식 영상' }, ...(e.ytStage || []).map(v => ({ id: v.id, t: '무대' })), ...(e.ytBehind || []).map(v => ({ id: v.id, t: '비하인드' })), ...e.related.map(v => ({ id: v.videoId, t: v.source || '영상' }))].filter(v => v && v.id).map(v => [v.id, v])).values()].slice(0, 8);
      vids.forEach(v => it.push(`<a class="map-c" href="${ytWatch(v.id)}" target="_blank" rel="noopener"><img src="${ytThumbUrl(v.id)}" alt="" loading="lazy" onerror="this.parentNode.remove()"><span>▶ ${esc(v.t)}</span></a>`));
      const songs = e.songSource !== '참고' && e.songs.length ? e.songs : e.setlist ? e.setlist.songs.map(x => x.t) : [];
      if (songs.length) it.push(`<a class="map-c map-c-sl" href="#/e/${encodeURIComponent(e.id)}"><b>♪ 셋리스트 ${songs.length}곡</b><ol>${songs.slice(0, 3).map(t => `<li>${esc(t)}</li>`).join('')}</ol>${songs.length > 3 ? `<small>외 ${songs.length - 3}곡 더 보기 ›</small>` : ''}</a>`);
      return it.length ? it.join('') : `<a class="map-c map-c-sl" href="#/e/${encodeURIComponent(e.id)}"><b>자세히 보기</b><small>아직 모인 자료가 없어요</small></a>`;
    };
    const fixHtml = x => {
      const p = x.l.place, pin = p && (data.pins || {})[p], me = myUid();
      if (!p) return '';
      const pend = ((pin && pin.pend) || []).map(k => `<div class="map-pend"><span>📍 팬이 고친 위치 · 확인 ${k.n}/2</span><button type="button" class="link-btn map-see" data-c="${k.c}">보기</button>${k.by !== me && !slOked('gp:' + p + ':' + k.c) ? `<button type="button" class="chip map-ok" data-c="${k.c}">맞아요</button>` : ''}${isAdmin() ? `<button type="button" class="link-btn map-adm" data-id="${k.id}">바로 확정 (관리자)</button>` : ''}</div>`).join('');
      return `${pend}<button type="button" class="link-btn map-fix">📍 ${x.l.exact ? '위치가 달라요' : '정확한 위치 알려주기'}</button>`;
    };
    const dots = () => {
      const n = ml.on.length, i = mapSt.i;
      if (n <= 14) return `<div class="map-dots">${ml.on.map((x, k) => `<button type="button" class="map-dot${k === i ? ' on' : k < i ? ' past' : ''}" data-k="${k}" aria-label="${k + 1}번째"></button>`).join('')}</div>`;
      return `<input type="range" class="map-seek" id="map-seek" min="0" max="${n - 1}" value="${Math.max(0, i)}" aria-label="발자국 고르기" style="--p:${Math.round(Math.max(0, i) / (n - 1) * 100)}%">`;
    };
    let seeking = false;
    // 전체 지도: 지역별 횟수 한눈에, 아래엔 요약만
    const sum = () => {
      const cnt = new Map();
      ml.on.forEach(x => { const r = x.l.region || regionNear(x.l); cnt.set(r, (cnt.get(r) || 0) + 1); });
      const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
      const venues = new Set(ml.on.map(x => x.l.exact ? x.l.lat.toFixed(3) + x.l.lng.toFixed(3) : x.l.region)).size;
      document.getElementById('map-nav').innerHTML = `<div class="map-info"><span class="map-meta">${mapSt.mode === 'w' ? '👣 내 발자국' : '포레스텔라 공연'} ${ml.on.length}개 · 장소 ${venues}곳 · ${cnt.size}개 지역${cum.length > 1 ? ` · 이으면 ${km(cum[cum.length - 1])}` : ''}</span><span class="map-now-t">${top ? `제일 많이 간 곳은 ${esc(top[0])} ${top[1]}번` : ''}</span><span class="map-place">지역 숫자를 누르면 다녀간 일정이 보여요</span></div>`;
    };
    // 처음부터 끝까지 걸리는 시간 (지금 속도 기준)
    const dur = () => {
      const el = document.getElementById('map-dur'); if (!el) return;
      const ms = MAP_SPEEDS[mapSp()][1], t = s => s >= 60 ? `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ''}` : `${s}초`;
      const all = Math.round(ml.on.length * ms / 1000), left = Math.round((ml.on.length - 1 - Math.max(0, mapSt.i)) * ms / 1000);
      el.textContent = `전체 ${t(all)}${left > 0 && left < all ? ` · 남은 시간 ${t(left)}` : ''}`;
    };
    const nav = () => {
      if (!mapSt.tour) { sum(); return; }
      const x = ml.on[mapSt.i], navEl = document.getElementById('map-nav');
      // 진행 줄을 끄는 중엔 글자만 바꿔요 (줄을 다시 그리면 손가락이 놓쳐요)
      if (seeking && navEl.querySelector('.map-seek')) {
        navEl.querySelector('.map-meta').textContent = `${fmtDate(x.e.date, false)} · ${mapSt.i + 1}/${ml.on.length} · ${km(cum[mapSt.i])} 걸었어요`;
        navEl.querySelector('.map-now-t').textContent = x.e.title;
        navEl.querySelector('.map-place').textContent = x.l.place || (x.l.region ? x.l.region + ' 어딘가' : '');
        navEl.querySelector('.map-seek').style.setProperty('--p', Math.round(mapSt.i / (ml.on.length - 1) * 100) + '%');
        dur(); return;
      }
      const prev = ml.on[mapSt.i - 1], next = ml.on[mapSt.i + 1];
      const carEl = document.getElementById('map-car');
      carEl.innerHTML = car(x.e); carEl.scrollLeft = 0;
      document.getElementById('map-nav').innerHTML = `
        <button type="button" class="map-arrow" id="map-prev"${prev ? '' : ' disabled'} aria-label="이전 발자국">‹</button>
        <div class="map-info">
          <span class="map-meta">${fmtDate(x.e.date, false)} · ${mapSt.i + 1}/${ml.on.length} · ${km(cum[mapSt.i])} 걸었어요</span>
          <a href="#/e/${encodeURIComponent(x.e.id)}" class="map-now-t">${esc(x.e.title)}</a>
          <span class="map-place">${x.l.place ? esc(x.l.place) : ''}${x.l.exact ? '' : `${x.l.place ? ' · ' : ''}<em>${esc(x.l.region)} 어딘가</em>`}</span>
          ${x.l.exact && x.l.lat ? `<span class="map-acts"><button type="button" class="map-act map-route" data-lat="${x.l.lat}" data-lng="${x.l.lng}" data-name="${esc((x.l.place || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim())}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>길찾기</button>${x.l.nid ? `<a class="map-act map-naver" href="https://map.naver.com/p/entry/place/${encodeURIComponent(x.l.nid)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>네이버 지도</a>` : ''}</span>` : ''}
          <span class="map-dur" id="map-dur"></span>
          ${dots()}
        </div>
        <button type="button" class="map-arrow" id="map-next"${next ? '' : ' disabled'} aria-label="다음 발자국">›</button>`;
      dur();
      const sk = document.getElementById('map-seek');
      if (sk) {
        sk.oninput = () => { mapStop(); seeking = true; go(+sk.value); };
        sk.onchange = () => { seeking = false; nav(); };
      }
      document.getElementById('map-prev').onclick = () => go(mapSt.i - 1);
      document.getElementById('map-next').onclick = () => go(mapSt.i + 1);
      document.querySelectorAll('.map-dot').forEach(d => d.onclick = () => go(+d.dataset.k));
      const fb = document.getElementById('map-fix');
      fb.innerHTML = fixHtml(x);
      fb.querySelector('.map-fix') && (fb.querySelector('.map-fix').onclick = () => startPin(x));
      fb.querySelectorAll('.map-see').forEach(b => b.onclick = () => { const [a, c] = b.dataset.c.split(',').map(Number); m.flyTo([a, c], 16); L.marker([a, c], { icon: pinIcon }).addTo(layer).bindTooltip('팬이 고친 위치').openTooltip(); });
      fb.querySelectorAll('.map-ok').forEach(b => b.onclick = async () => {
        b.disabled = true;
        await formPost(`종류: 좌표확인\n장소: ${x.l.place}\n좌표: ${b.dataset.c}\n일정: [ID ${x.e.id}] ${x.e.title}\n누가: ${myUid()}`).catch(() => {});
        slOkAdd('gp:' + x.l.place + ':' + b.dataset.c); b.replaceWith(Object.assign(document.createElement('span'), { className: 'src-note', textContent: '고마워요! 5~10분쯤 뒤 반영돼요.' }));
      });
      fb.querySelectorAll('.map-adm').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = '확정하는 중…'; try { await sendEvMark(b.dataset.id, '숨김'); } catch (err) { b.disabled = false; b.textContent = '다시 눌러 주세요'; } });
    };
    const go = i => {
      if (!document.getElementById('map')) { mapStop(); return; }
      if (i < 0 || i >= ml.on.length) return;
      mapSt.i = i;
      const x = ml.on[i];
      // 빠를수록 멀리서 봐요: 빠르게는 도시, 쉬시식은 한반도 반쯤
      const ms = MAP_SPEEDS[mapSp()][1], far = mapPlay ? (ms < 1000 ? 7 : ms < 2000 ? 8.5 : 0) : 0, z = mapSt.uz || far || (x.l.exact ? mapZ() : 9);
      // 아래 안내판에 안 가리게 살짝 위쪽에 오도록
      const at = m.unproject(m.project([x.l.lat, x.l.lng], z).add([0, 0]), z);
      moveAuto(() => seeking ? m.setView(at, z, { animate: false }) : mapPlay && ms < 1000 ? m.setView(at, z, { animate: true, pan: { duration: 0.3 } }) : m.flyTo(at, z, { duration: mapPlay && ms < 2000 ? 0.6 : 1.1 }));
      nav(); draw();
    };
    if (mapSt.tour) document.getElementById('map-here').onclick = () => { mapStop(); go(mapSt.i); };
    // 확대 정도: ＋/－로 바꾸면 다음 장소로 갈 때도 그 배율로 가요 (이 폰에 기억)
    const zoomBy = d => { const z = Math.min(17, Math.max(5, (mapSt.tour && mapSt.uz || m.getZoom()) + d)); if (mapSt.tour) mapSt.uz = z; m.setZoom(z); if (z >= 10) boxWrite(MAP_Z, z); };
    document.getElementById('map-zin').onclick = () => zoomBy(1);
    document.getElementById('map-zout').onclick = () => zoomBy(-1);
    // 🚇 길찾기: 내 위치 → 공연장 좌표로 카카오맵(웹·앱) 또는 네이버 지도 앱을 열어요
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.map-route'); if (!b) return;
    const { lat, lng, name } = b.dataset, nm = name || '공연장';
    waitSheet(`<div class="yf-head"><b>🚇 길찾기</b><span class="sub">${esc(nm)}</span></div>
      <a class="bpill route-go" href="https://map.kakao.com/link/to/${encodeURIComponent(nm)},${lat},${lng}" target="_blank" rel="noopener">카카오맵으로 길찾기</a>
      <a class="bpill route-go" href="nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(nm)}&appname=${encodeURIComponent(location.hostname)}">네이버 지도 앱으로 길찾기</a>
      <p class="src-note">출발지는 지금 내 위치예요. 네이버는 폰에 네이버 지도 앱이 있어야 열려요.</p>`);
  });
  // 📍 내 위치: 누를 때만 폰에 물어보고 이 화면에만 파란 점으로 (어디에도 안 보내요)
    let meDot = null;
    document.getElementById('map-me').onclick = () => {
      if (!navigator.geolocation) { toast('이 브라우저는 위치를 못 알려 줘요'); return; }
      mapStop();
      toast('내 위치는 이 폰 화면에만 쓰고 어디에도 보내지 않아요');
      navigator.geolocation.getCurrentPosition(p => {
        const at = [p.coords.latitude, p.coords.longitude];
        if (meDot) meDot.remove();
        meDot = L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#2D7FF9', fillOpacity: 1, interactive: false }).addTo(m);
        moveAuto(() => m.flyTo(at, Math.max(m.getZoom(), 13), { duration: 0.8 }));
      }, () => toast('위치를 못 가져왔어요. 위치 권한을 확인해 주세요'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    };
    const all = () => m.fitBounds(L.latLngBounds(ml.on.map(x => [x.l.lat, x.l.lng])).pad(0.25), { maxZoom: 11, animate: false });
    const play = () => {
      mapStop();
      if (mapSt.i >= ml.on.length - 1) mapSt.i = -1;
      mapPlay = setInterval(() => { if (mapSt.i >= ml.on.length - 1) mapStop(); else go(mapSt.i + 1); }, MAP_SPEEDS[mapSp()][1]);
      mapPlayBtn();
      if (mapSt.i < 0) go(0);
    };
    const pb = document.getElementById('map-play');
    if (pb) pb.onclick = () => { if (mapPlay) mapStop(); else play(); };
    const ab = document.getElementById('map-ahead');
    if (ab) ab.onclick = () => { const off = !boxRead(MAP_AHEAD); boxWrite(MAP_AHEAD, off || null); ab.classList.toggle('on', !off); ab.setAttribute('aria-pressed', String(!off)); draw(); };
    root.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => {
      boxWrite(MAP_SP, +b.dataset.sp);
      root.querySelectorAll('[data-sp]').forEach(o => o.classList.toggle('on', o === b));
      dur();
      if (mapPlay) play();
    });
    // 숲길 따라걷기: 첫 발자국부터 3.5초마다 다음으로 (지도·버튼을 만지면 멈춰요)
    const trip = document.getElementById('map-trip'), ov = document.getElementById('map-ov');
    if (trip) trip.onclick = () => { mapSt.tour = true; mapSt.play = true; mapSt.i = 0; bindMap(); };
    if (ov) ov.onclick = () => { mapSt.tour = false; mapStop(); document.getElementById('map-venue').innerHTML = ''; bindMap(); };
    m.on('dragstart', mapStop);
    document.getElementById('map-nav').addEventListener('click', ev => { if (ev.isTrusted && ev.target.closest('.map-arrow, .map-dot')) mapStop(); }, true);
    if (mapSt.tour) document.getElementById('map-all').onclick = () => { mapStop(); moveAuto(() => m.flyToBounds(L.latLngBounds(ml.on.map(x => [x.l.lat, x.l.lng])).pad(0.25), { maxZoom: 11, duration: 0.9 })); };
    // 위치 고치기: 지도를 누르면 핀이 꽂히고, 보내기를 누르면 제보로 가요
    const startPin = x => {
      const bar = document.getElementById('map-pinbar');
      let mk = null, at = null;
      bar.hidden = false;
      bar.innerHTML = `<span><b>${esc(x.l.place)}</b> 위치를 찾아 주세요</span>
        <form class="pin-find" id="pin-find"><input type="search" id="pin-q" value="${esc(x.l.place)}" placeholder="장소 이름이나 주소" enterkeyhint="search"><button type="submit" class="chip">찾기</button></form>
        <div class="pin-res" id="pin-res"></div>
        <span class="src-note">찾은 곳을 고르거나 지도를 직접 눌러 핀을 찍어 주세요. 다시 누르면 핀이 옮겨져요.</span>
        <label class="add-f pl-nv"><span>또는 네이버 지도 링크</span><input type="url" id="pin-link" inputmode="url" placeholder="네이버 지도 앱 → 장소 → 공유 → 링크 복사" autocomplete="off"></label>
        <span class="src-note" id="pin-lmsg"></span>
        <button type="button" class="chip on" id="pin-send" disabled>이 위치로 보내기</button><button type="button" class="link-btn" id="pin-no">취소</button>`;
      bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      let link = '';
      const put = ll => { at = ll; if (mk) mk.setLatLng(at); else mk = L.marker(at, { icon: pinIcon }).addTo(m); document.getElementById('pin-send').disabled = false; };
      // 네이버 지도 링크를 붙이면 핀 대신 링크로 보내요 (깃허브가 15분마다 좌표를 읽어 와요)
      const li = document.getElementById('pin-link'), lm = document.getElementById('pin-lmsg');
      li.addEventListener('input', () => {
        const mm = li.value.match(/https?:\/\/(?:naver\.me\/[\w-]+|(?:m\.)?map\.naver\.com\/[^\s"'<>]+|(?:m|pcmap)\.place\.naver\.com\/[^\s"'<>]+)/);
        link = mm ? mm[0] : '';
        lm.textContent = link ? '네이버 지도 링크예요. 보내면 15~30분쯤 뒤 지도 위치가 들어가요.' : li.value.trim() ? '네이버 지도 링크가 아니에요. 장소 화면의 공유 → 링크 복사로 받은 주소를 붙여 주세요.' : '';
        document.getElementById('pin-send').disabled = !(link || at);
      });
      const onClick = ev => put(ev.latlng);
      m.on('click', onClick);
      // 장소 이름·주소로 찾기 (OpenStreetMap 검색). '37.51, 127.12'처럼 좌표를 붙여 넣어도 돼요
      document.getElementById('pin-find').onsubmit = async ev => {
        ev.preventDefault();
        const q = document.getElementById('pin-q').value.trim(), res = document.getElementById('pin-res');
        if (!q) return;
        const c = q.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)/);
        if (c) { put(L.latLng(+c[1], +c[2])); m.flyTo([+c[1], +c[2]], 16); res.innerHTML = ''; return; }
        res.innerHTML = '<span class="src-note">찾는 중…</span>';
        try {
          const r = await (await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'kr', limit: 10, 'accept-language': 'ko' }))).json();
          res.innerHTML = r.length ? r.map((h, i) => `<button type="button" class="pin-hit" data-i="${i}"><b>${esc(h.name || h.display_name.split(',')[0])}</b><small>${esc(h.display_name.split(',').slice(1, 4).join(','))}</small></button>`).join('') : '<span class="src-note">못 찾았어요. 건물 이름이나 도로명 주소로 다시 찾아 주세요.</span>';
          res.querySelectorAll('.pin-hit').forEach(b => b.onclick = () => { const h = r[+b.dataset.i]; put(L.latLng(+h.lat, +h.lon)); m.flyTo([+h.lat, +h.lon], 16); res.querySelectorAll('.pin-hit').forEach(o => o.classList.toggle('on', o === b)); });
        } catch (err) { res.innerHTML = '<span class="src-note">지금은 찾기가 안 돼요. 지도를 직접 눌러 주세요.</span>'; }
      };
      const end = () => { m.off('click', onClick); if (mk) mk.remove(); bar.hidden = true; };
      document.getElementById('pin-no').onclick = end;
      document.getElementById('pin-send').onclick = async () => {
        if (link) {
          await formPost(`종류: 장소수정\n날짜: ${x.e.date}\n일정: [ID ${x.e.id}] ${x.e.title}\n전: ${x.e.place || ''}\n후: \n링크: ${link}\n누가: ${myUid()}`).catch(() => {});
          end();
          const fb = document.getElementById('map-fix');
          if (fb) fb.innerHTML = '<p class="src-note">보냈어요! 15~30분쯤 뒤 지도 위치가 들어가요.</p>';
          return;
        }
        const c = at.lat.toFixed(5) + ',' + at.lng.toFixed(5);
        await formPost(`종류: 장소좌표\n장소: ${x.l.place}\n좌표: ${c}\n일정: [ID ${x.e.id}] ${x.e.title}\n누가: ${myUid()}`).catch(() => {});
        end();
        const fb = document.getElementById('map-fix');
        if (fb) fb.innerHTML = '<p class="src-note">보냈어요! 다른 두 분이 맞다고 하면 지도에 반영돼요. (5~10분쯤 뒤부터 보여요)</p>';
      };
    };
    nav(); draw();
    if (!mapSt.tour) { m.fitBounds(KOREA_B, { paddingTopLeft: [8, 50], paddingBottomRight: [8, 8], animate: false }); return; }
    if (mapSt.play) {
      mapSt.play = false; moveAuto(all); document.querySelector('.map-stage').scrollIntoView({ block: 'center', behavior: 'smooth' }); go(0);
      play();
    } else { const x0 = ml.on[mapSt.i]; moveAuto(() => m.setView([x0.l.lat, x0.l.lng], mapSt.uz || (x0.l.exact ? mapZ() : 9))); }
  }
  // ---------- 지도 장소 한꺼번에 찾기 (관리자): 이 폰 브라우저로 OpenStreetMap을 검색해서, 맞는 후보를 누르면 바로 확정해요 ----------
  let pfAll = null;
  const PF_DONE = 'sb-pf-done', pfDone = () => boxRead(PF_DONE) || {};
  function placeFindView() {
    const adm = isAdmin();
    return `
      <a class="back" href="${adm ? '#/admin' : '#/map'}">‹ ${adm ? '관리자 기기' : '숲별 발자국'}</a>
      <h1 class="h1 page-title">장소 한꺼번에 찾기</h1>
      <p class="sub">지도에서 정확한 위치를 못 찾은 장소예요. 이 폰이 차례로 검색해서 후보를 보여줘요. ${adm ? '맞는 후보를 누르면 바로 확정돼요.' : "맞는 후보를 누르면 오른쪽 위 '📤 보낼 목록'에 담겨요. 다 고른 뒤 한 번에 보내 주세요. 처음 알려 주는 위치는 바로 지도에 들어가요."} 없으면 검색어를 고쳐서 다시 찾아 주세요.</p>
      ${(() => { const ok = Object.entries(data.pins || {}).filter(([, v]) => v.ok); return ok.length ? `<p class="src-note">확정한 위치 ${ok.length}곳 <button type="button" class="chip" id="pf-copy" data-t="${esc(ok.map(([k, v]) => k + ' | ' + v.ok.lat + ',' + v.ok.lng).join('\n'))}">복사하기</button></p>` : ''; })()}
      <div id="pf-list"><p class="src-note">장소 목록을 불러오는 중…</p></div>`;
  }
  async function bindPlaceFind() {
    const box = document.getElementById('pf-list');
    if (!box) return;
    const cp = document.getElementById('pf-copy');
    if (cp) cp.onclick = () => { const t = cp.dataset.t, done = () => { cp.textContent = '복사했어요 ✓'; }; navigator.clipboard.writeText(t).then(done, () => { prompt('복사해 주세요', t); }); };
    if (!pfAll) pfAll = await fetch('data/places.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({}));
    const pins = data.pins || {}, cnt = new Map();
    data.events.forEach(e => { const p = placeOf(e); if (p && e.category !== '라디오') cnt.set(p, (cnt.get(p) || 0) + 1); });
    const hint = pfAll.hint || {}, fd = pfAll.found || {}, maybe = Object.entries(fd).filter(([, v]) => v.c !== 'ok').map(([k]) => k);
    // 일정에 쓰인 장소 중 정확한 좌표가 없는 곳 (해외·비공개·팬이 정확한 위치를 이미 알려 준 곳은 빼요)
    // 정확한 위치가 이미 있거나, 일정 화면에서 새 장소(좌표 포함)를 보내 확인을 기다리는 곳은 빼요
    const exactEv = new Set(data.events.filter(e => e.placeLoc || (e.placeProps || []).some(p => p.loc)).map(e => placeOf(e)));
    const todo = [...cnt.keys()].filter(p => !(fd[p] && fd[p].c === 'ok') && !(pins[p] && pins[p].ok) && p !== PLACE_PRIV && !exactEv.has(p) && regionOf({ place: p, title: '', id: '' }) !== '해외')
      .sort((a, b) => (maybe.includes(b) - maybe.includes(a)) || cnt.get(b) - cnt.get(a));
    if (!todo.length) { box.innerHTML = '<p class="src-note">찾을 장소가 없어요. 다 찾았어요!</p>'; return; }
    const done = pfDone();
    box.innerHTML = todo.map((p, i) => `<section class="pf-item${done[p] ? ' pf-done' : ''}" data-i="${i}">
        <div class="pf-h"><b>${esc(p)}</b><span>${done[p] ? `확정했어요 ✓ ${esc(done[p])} · 5~10분 뒤 지도에 반영돼요` : sendQHas('pin:' + p) ? '📤 보낼 목록에 담았어요' : `일정 ${cnt.get(p)}개${maybe.includes(p) ? ' · 자동으로 찾았지만 확실치 않음' : ''}${pins[p] && pins[p].pend && pins[p].pend.length ? ' · 다른 분이 찾은 위치가 확인을 기다려요' : ''}`}</span></div>
        <form class="pin-find"><input type="search" value="${esc(hint[p] || p)}" enterkeyhint="search"><button type="submit" class="chip">찾기</button></form>
        <div class="pin-res"><span class="src-note">차례를 기다리는 중…</span></div></section>`).join('');
    const items = [...box.querySelectorAll('.pf-item')];
    const search = async el => {
      const p = todo[+el.dataset.i], q = el.querySelector('input').value.trim(), res = el.querySelector('.pin-res');
      res.innerHTML = '<span class="src-note">찾는 중…</span>';
      let r = [];
      try { r = await (await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'kr', limit: 8, 'accept-language': 'ko' }))).json(); } catch (err) { res.innerHTML = '<span class="src-note">검색이 안 됐어요. 찾기를 다시 눌러 주세요.</span>'; return; }
      // 깃허브가 네이버에서 미리 찾아 둔 후보를 맨 위에 (data/places.json naverCand)
      r = [...((pfAll.naverCand || {})[p] || []).map(x => ({ name: '네이버 · ' + x.name, display_name: x.name + ',' + x.addr, lat: x.lat, lon: x.lng })), ...r];
      res.innerHTML = r.length ? r.map((h, j) => `<button type="button" class="pin-hit" data-j="${j}"><b>${esc(h.name || h.display_name.split(',')[0])}</b><small>${esc(h.display_name.split(',').slice(1, 5).join(','))}</small></button>`).join('') + `<a class="link-btn" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}" target="_blank" rel="noopener">지도에서 보기</a>`
        : '<span class="src-note">못 찾았어요. 건물 이름이나 도로명 주소로 고쳐서 다시 찾아 주세요.</span>';
      res.querySelectorAll('.pin-hit').forEach(b => b.onclick = async () => {
        const h = r[+b.dataset.j], c = (+h.lat).toFixed(5) + ',' + (+h.lon).toFixed(5);
        res.querySelectorAll('.pin-hit').forEach(o => { o.disabled = true; });
        b.classList.add('on');
        if (!isAdmin()) {
          sendQAdd({ k: 'pin:' + p, label: `📍 ${p} → ${h.name || c}`, text: `종류: 장소좌표\n장소: ${p}\n좌표: ${c}\n누가: ${myUid()}` });
          el.querySelector('.pf-h span').textContent = `📤 보낼 목록에 담았어요 · ${h.name || ''}`;
          res.querySelectorAll('.pin-hit').forEach(o => { o.disabled = false; });
          return;
        }
        try {
          await formPost(`종류: 장소좌표\n장소: ${p}\n좌표: ${c}\n누가: ${myUid()}`);
          boxWrite(PF_DONE, { ...pfDone(), [p]: h.name || c });
          await sendEvMark('g' + window.DATA.slVer([p, c]), '숨김');
          el.classList.add('pf-done');
          el.querySelector('.pf-h span').textContent = `확정했어요 ✓ ${h.name || ''} · 5~10분 뒤 지도에 반영돼요`;
          res.innerHTML = '';
        } catch (err) { res.querySelectorAll('.pin-hit').forEach(o => { o.disabled = false; }); b.classList.remove('on'); res.insertAdjacentHTML('beforeend', '<span class="src-note">보내지 못했어요. 다시 눌러 주세요.</span>'); }
      });
    };
    items.forEach(el => { el.querySelector('form').onsubmit = ev => { ev.preventDefault(); search(el); }; });
    // OpenStreetMap 검색 규칙(1초에 한 번)에 맞춰 차례로 찾아요
    for (const el of items) { if (!document.body.contains(el)) return; if (el.classList.contains('pf-done')) continue; await search(el); await new Promise(r => setTimeout(r, 1100)); }
  }
  function mapStop() { if (mapPlay) { clearInterval(mapPlay); mapPlay = null; } mapPlayBtn(); }
  function mapPlayBtn() { const b = document.getElementById('map-play'); if (b) b.textContent = mapPlay ? '⏸ 멈춤' : '▶ 재생'; }
  const ym = v => v ? `${v.slice(2, 4)}년 ${+v.slice(5, 7)}월` : '';


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
    sky: { bg: ['#DDEBF6'], ink: '#1F3346', mute: 'rgba(31,51,70,.55)', line: 'rgba(31,51,70,.15)', acc: '#3C7FB5', name: '하늘' },
    mint: { bg: ['#E6F3DF', '#D3EEE7'], ink: '#21402F', mute: 'rgba(33,64,47,.55)', line: 'rgba(33,64,47,.15)', acc: '#3D9A6A', name: '연두' },
    lilac: { bg: ['#ECE5F6'], ink: '#3A3050', mute: 'rgba(58,48,80,.55)', line: 'rgba(58,48,80,.15)', acc: '#7B62B8', name: '라벤더' },
    blossom: { bg: ['#FCE7EC'], ink: '#4A2A35', mute: 'rgba(74,42,53,.55)', line: 'rgba(74,42,53,.15)', acc: '#D0587E', name: '벚꽃' },
    aurora: { bg: ['#1B2B4A', '#3B2357'], ink: '#F1ECFA', mute: 'rgba(241,236,250,.58)', line: 'rgba(241,236,250,.17)', acc: '#9EE6C8', name: '오로라' },
    sumi: { bg: ['#26272B'], ink: '#EDEBE6', mute: 'rgba(237,235,230,.55)', line: 'rgba(237,235,230,.16)', acc: '#F0A85A', name: '먹' },
  };
  // 카드 틀 모양
  const CARD_FRAMES = { round: '기본', ticket: '티켓', receipt: '영수증', playlist: '플레이리스트' };
  // 뱃지: 보관함 기록으로 받은 것만 골라 넣을 수 있어요 (최대 3개)
  const tourOfDate = d => (data.tours || []).find(t => (t.dates || []).includes(d));
  const CARD_BADGES = [
    ['first', '🌱', '첫 발자국', '직관 1번', s => s.went.length >= 1],
    ['walk', '🌿', '숲길 산책', '직관 5번', s => s.went.length >= 5],
    ['keeper', '🌲', '숲지기', '직관 10번', s => s.went.length >= 10],
    ['grand', '🏕️', '숲의 터줏대감', '직관 30번', s => s.went.length >= 30],
    ['trip', '🧭', '숲 원정대', '직관 지역 3곳 이상', s => s.regionN >= 3],
    ['ncha', '🎟️', 'N차 숲별', '같은 투어 2번 이상', s => { const m = new Map(); s.went.forEach(e => { const t = tourOfDate(e.date); if (t) m.set(t.id, (m.get(t.id) || 0) + 1); }); const n = Math.max(0, ...m.values()); return n >= 2 && `${n}차 숲별`; }],
    ['studio', '📺', '방청 요정', '방송 방청 1번', s => s.went.some(s.isBc)],
    ['og', '🌰', '원조 숲별', '2018년까지 직관', s => s.went.some(e => e.date < '2019')],
    ['ear', '🎧', '귀명창', '들은 곡 50곡', s => s.heardList.length >= 50],
    ['heart', '💚', '최애곡 부자', '♥ 곡 20곡', s => s.songs.length >= 20],
    ['y1', '⭐', '1년차 숲별', '입덕 1년', () => ddayOf(card.since) > 365],
    ['y3', '🌟', '3년차 숲별', '입덕 3년', () => ddayOf(card.since) > 365 * 3],
    ['y5', '✨', '5년차 숲별', '입덕 5년', () => ddayOf(card.since) > 365 * 5],
  ];
  const cardBadges = (st = boxStats()) => CARD_BADGES.map(([k, ic, name, how, f]) => { const r = f(st); return { k, ic, name: typeof r === 'string' ? r : name, how: typeof r === 'string' ? `같은 투어 ${parseInt(r, 10)}번 직관` : how, got: !!r }; });
  const STK_KEY = 'sb-card-stk';
  let cardStk = boxRead(STK_KEY) || [];  // [{ src, x, y, w, r, shape }] 카드 바깥 틀 기준 위치
  let cardStkImg = new Map(), cardSel = -1, cardExport = false;
  // 글씨체: 이름·D+·곡 이름·한마디에 써요 (k: 손글씨는 글자가 작아 보여서 키워요)
  const CARD_FONTS = {
    myeong: { f: '"Nanum Myeongjo", serif', w: 700, big: 800, k: 1, name: '명조' },
    plex: { f: '"IBM Plex Sans KR", sans-serif', w: 700, big: 700, k: 1, name: '고딕' },
    dodum: { f: '"Gowun Dodum", sans-serif', w: 400, big: 400, k: 1, name: '둥근' },
    pen: { f: '"Nanum Pen Script", cursive', w: 400, big: 400, k: 1.3, name: '손글씨' },
  };
  const CARD_SANS = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
  const cardDefault = () => ({ nick: '', since: '', gen: [], debut: '', fav: '', mem: [], best: '', line: '', color: 'forest', font: 'myeong', stats: ['w', 'b', 'first', 'h', 'r'], hideAsk: false, wish: '', frame: 'round', badges: [] });
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
  const favList = t => [...new Set((t || '').split(/\s*[·,]\s*/).map(x => x.trim()).filter(Boolean))].slice(0, 10);
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
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;700&family=Nanum+Myeongjo:wght@700;800&family=Gowun+Dodum&family=Nanum+Pen+Script&family=Nanum+Gothic+Coding:wght@400;700&display=swap';
      l.onload = l.onerror = res;
      document.head.appendChild(l);
      setTimeout(res, 4000);
    });
    const F = CARD_FONTS[card.font] || CARD_FONTS.myeong;
    return cardFontsP.then(() => document.fonts ? Promise.all([
      document.fonts.load(`${F.big} 50px ${F.f}`, text), document.fonts.load(`${F.w} 25px ${F.f}`, text),
      document.fonts.load(`400 12px ${CARD_SANS}`, text), document.fonts.load(`700 12px ${CARD_SANS}`, text), document.fonts.load(`400 12px ${CARD_MONO}`, text), document.fonts.load(`700 12px ${CARD_MONO}`, text), document.fonts.load('400 18px "Nanum Pen Script"', text),
    ]).catch(() => {}) : null);
  }

  let cardImg = null, cardImgSrc = '';
  // 카드 그리기: 미리보기와 저장 이미지가 같은 그림이에요 (340 너비 기준, 3배로 그려요)
  // 내 사진 스티커 (틀 위에 자유롭게)
  function paintStickers(ctx) {
    cardStk.forEach((k, i) => {
      const im = cardStkImg.get(k.src);
      if (!im || !im.complete || !im.naturalWidth) return;
      const iw = im.naturalWidth, ih = im.naturalHeight;
      const sq = k.shape !== 'rect', w = k.w, h = sq ? k.w : k.w * ih / iw;
      ctx.save();
      ctx.translate(k.x, k.y); ctx.rotate((k.r || 0) * Math.PI / 180);
      const shape = (m) => {
        ctx.beginPath();
        if (k.shape === 'circle') ctx.arc(0, 0, w / 2 + m, 0, Math.PI * 2);
        else if (k.shape === 'heart') { const a = w / 2 + m; ctx.moveTo(0, a * 0.95); ctx.bezierCurveTo(-a * 1.25, a * 0.1, -a * 0.75, -a * 1.05, 0, -a * 0.45); ctx.bezierCurveTo(a * 0.75, -a * 1.05, a * 1.25, a * 0.1, 0, a * 0.95); }
        else ctx.roundRect ? ctx.roundRect(-w / 2 - m, -h / 2 - m, w + m * 2, h + m * 2, 8 + m) : ctx.rect(-w / 2 - m, -h / 2 - m, w + m * 2, h + m * 2);
      };
      ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      shape(4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.shadowColor = 'transparent';
      shape(0); ctx.clip();
      const sc = sq ? Math.max(w / iw, w / ih) : w / iw;
      ctx.drawImage(im, -iw * sc / 2, -ih * sc / 2, iw * sc, ih * sc);
      ctx.restore();
      if (i === cardSel && !cardExport) {
        ctx.save(); ctx.translate(k.x, k.y); ctx.rotate((k.r || 0) * Math.PI / 180);
        ctx.strokeStyle = '#2F7A5A'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.strokeRect(-w / 2 - 9, -h / 2 - 9, w + 18, h + 18); ctx.restore();
      }
    });
  }

  // ---------- 사진 없는 테마: 영수증 · 신용카드 · 플레이리스트 ----------
  const CARD_MONO = '"Nanum Gothic Coding", "IBM Plex Mono", monospace';
  function cardBits() {
    const { cells, lines } = cardNums();
    const gens = CARD_GENS.filter(g => card.gen.includes(g));
    const mems = CARD_MEMS.filter(m => card.mem.includes(m));
    const bdg = cardBadges().filter(b => b.got && (card.badges || []).includes(b.k));
    const best = card.best && data.byId.get(card.best);
    return { cells, lines, gens, mems, bdg, best, favs: favList(card.fav), wishes: favList(card.wish), nick: card.nick.trim() || '숲별', dd: ddayText(), line: card.line.trim() };
  }
  const cardTools = ctx => {
    const fit = (t, max) => { t = String(t); if (ctx.measureText(t).width <= max) return t; while (t && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
    const wrap = (t, max, n) => {
      const out = []; let cur = '';
      for (const w of String(t).split(/(\s+)/)) { if (ctx.measureText(cur + w).width <= max || !cur.trim()) cur += w; else { out.push(cur.trim()); cur = w.trimStart(); } }
      if (cur.trim()) out.push(cur.trim());
      if (out.length > n) { out.length = n; out[n - 1] = fit(out[n - 1] + '…', max).replace(/……$/, '…'); }
      return out.map(l => fit(l, max));
    };
    const spaced = (t, x, y, ls, align = 'left') => { let w = 0; for (const ch of t) w += ctx.measureText(ch).width + ls; w -= ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of t) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; } };
    return { fit, wrap, spaced };
  };
  const barcode = (ctx, x, y, w, h, seedText) => {
    let seed = 7; for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    for (let bx = x; bx < x + w;) { seed = (seed * 1103515245 + 12345) >>> 0; const bw = 1 + (seed >>> 16) % 3; ctx.fillRect(bx, y, Math.min(bw, x + w - bx), h); bx += bw + 1 + (seed >>> 20) % 3; }
  };

  // 영수증: 긴 감열지, 품목처럼 기록을 적고 합계가 D+
  function drawReceipt(cv) {
    const F = CARD_FONTS[card.font] || CARD_FONTS.myeong, C = CARD_COLORS[card.color] || CARD_COLORS.forest;
    const B = cardBits(), W = 300, P = 20, IN = W - P * 2, S = 3, ZZ = 7;
    const ctx = cv.getContext('2d'), T = cardTools(ctx), ops = [];
    const mono = (w, px) => `${w} ${px}px ${CARD_MONO}`;
    const INK = '#26282A', MUTE = '#7A7D80';
    let y = ZZ + 22;
    const row = (l, r, o = {}) => {
      const yy = y, sz = o.sz || 12.5;
      ctx.font = mono(o.b ? 700 : 400, sz);
      const rw = Math.min(ctx.measureText(String(r)).width, IN * 0.68);
      const lt = T.fit(l, IN - rw - 10);
      const rt = T.fit(String(r), IN - ctx.measureText(lt).width - 10);
      ops.push(() => { ctx.font = mono(o.b ? 700 : 400, sz); ctx.fillStyle = o.c || INK; ctx.fillText(lt, P, yy); ctx.textAlign = 'right'; ctx.fillText(rt, W - P, yy); ctx.textAlign = 'left'; });
      y += sz + 8;
    };
    const center = (t, sz, w = 400, c = INK, fam) => { const yy = y; ops.push(() => { ctx.font = fam ? `${w} ${sz}px ${fam}` : mono(w, sz); ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.fillText(T.fit(t, IN), W / 2, yy); ctx.textAlign = 'left'; }); y += sz + 7; };
    const dash = () => { y += 3; const yy = y; ops.push(() => { ctx.font = mono(400, 12); ctx.fillStyle = MUTE; let t = ''; while (ctx.measureText(t + '-').width < IN) t += '-'; ctx.fillText(t, P, yy); }); y += 18; };
    const block = (label, items) => {
      if (!items.length) return;
      ctx.font = mono(400, 12.5);
      const lw = ctx.measureText(label + '  ').width;
      items.forEach((it, i) => { const yy = y, lt = T.fit(it, IN - lw); ops.push(() => { ctx.font = mono(400, 12.5); ctx.fillStyle = MUTE; if (!i) ctx.fillText(label, P, yy); ctx.fillStyle = INK; ctx.fillText(lt, P + lw, yy); }); y += 20; });
    };
    center('✦ 숲별 기록장 ✦', 17, 700);
    center('FORESTELLA · SOOPBYEOL RECEIPT', 9.5, 400, MUTE);
    y += 4; dash();
    const now = new Date(), t = todayParts();
    row('일시', `${t.y}.${String(t.m).padStart(2, '0')}.${String(t.d).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    row('손님', B.nick);
    if (card.since) row('입덕', card.since.replace(/-/g, '.'));
    if (B.gens.length) row('숲별 기수', B.gens.join('·'));
    if (B.mems.length) row('최애', B.mems.join(' · '));
    dash();
    row('품목', '수량', { c: MUTE });
    B.cells.forEach(([lb, v, u]) => row(lb, v + (u || '')));
    B.lines.forEach(([lb, v]) => row(lb, v));
    if (B.cells.length || B.lines.length) dash();
    block('입덕곡', card.debut.trim() ? [card.debut.trim()] : []);
    block('최애곡', B.favs.slice(0, 6));
    block('소취곡', B.wishes.slice(0, 6));
    if (B.best) block('최고의 날', [B.best.date.replace(/-/g, '.'), B.best.title]);
    if (B.bdg.length) block('뱃지', B.bdg.map(b => `${b.ic} ${b.name} (${b.how})`));
    if (card.debut.trim() || B.favs.length || B.wishes.length || B.best || B.bdg.length) dash();
    row('합계', B.dd || 'D+', { b: true, sz: 20 });
    row('결제', '평생 할부 · 숲별카드', { c: MUTE, sz: 11 });
    dash();
    if (B.line) {
      ctx.font = `${F.w} ${14 * F.k}px ${F.f}`;
      T.wrap('“' + B.line + '”', IN, 2).forEach(l => center(l, 14 * F.k, F.w, INK, F.f));
      y += 6;
    }
    const yBar = y; y += 44;
    ops.push(() => { ctx.fillStyle = INK; barcode(ctx, P + 20, yBar, IN - 40, 34, B.nick + card.since); });
    center(String(ddayOf(card.since) || 0).padStart(6, '0') + ' ' + (card.since || '').replace(/-/g, ''), 9.5, 400, MUTE);
    center('감사합니다. 또 만나요 ♥', 11.5, 400, INK);
    center('sujeonghan78-lgtm.github.io/forestella-archive', 8.5, 400, MUTE);
    const H = Math.ceil(y + 14 + ZZ);
    cv.width = W * S; cv.height = H * S; cv.dataset.h = H; cv.dataset.w = W;
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.textBaseline = 'top';
    // 위아래 톱니 모양 종이
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, ZZ);
    for (let x = 0; x < W; x += ZZ * 2) { ctx.lineTo(x + ZZ, 0); ctx.lineTo(Math.min(W, x + ZZ * 2), ZZ); }
    ctx.lineTo(W, H - ZZ);
    for (let x = W; x > 0; x -= ZZ * 2) { ctx.lineTo(x - ZZ, H); ctx.lineTo(Math.max(0, x - ZZ * 2), H - ZZ); }
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#FBFAF6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.acc; ctx.globalAlpha = .9; ctx.fillRect(0, 0, W, ZZ + 3); ctx.globalAlpha = 1;
    ops.forEach(f => f());
    ctx.restore();
    paintStickers(ctx);
    return { PH: 0, OX: 0, OY: 0, OW: W, OH: H };
  }

  // 플레이리스트: 음악 앱 재생 화면처럼 (앨범 자리엔 숲별 그림, 곡 목록은 최애곡·소취곡)
  function drawPlaylist(cv) {
    const F = CARD_FONTS[card.font] || CARD_FONTS.myeong, C = CARD_COLORS[card.color] || CARD_COLORS.forest;
    const B = cardBits(), W = 320, P = 22, IN = W - P * 2, S = 3;
    const ctx = cv.getContext('2d'), T = cardTools(ctx);
    const sans = (w, px) => `${w} ${px}px ${CARD_SANS}`;
    const tracks = [...(card.debut.trim() ? [[card.debut.trim(), '입덕곡']] : []), ...B.favs.map(f => [f, '최애곡']), ...B.wishes.map(f => [f, '소취곡'])].slice(0, 9);
    const AH = IN, H = Math.ceil(24 + 30 + AH + 20 + 70 + 44 + 34 + tracks.length * 34 + (B.line ? 46 : 0) + 40);
    cv.width = W * S; cv.height = H * S; cv.dataset.h = H; cv.dataset.w = W;
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.textBaseline = 'top';
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, W, H, 22) : ctx.rect(0, 0, W, H); ctx.clip();
    if (C.bg.length > 1) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg[0]); g.addColorStop(1, C.bg[1]); ctx.fillStyle = g; } else ctx.fillStyle = C.bg[0];
    ctx.fillRect(0, 0, W, H);
    let y = 24;
    ctx.font = sans(600, 9); ctx.fillStyle = C.mute; T.spaced('PLAYING FROM 숲별 기록장', W / 2, y, 1.4, 'center');
    y += 30;
    // 앨범 자리: 사진이 있으면 사진, 없으면 숲과 별 그림
    const hasPhoto = !!(cardPhoto && cardImg && cardImg.complete && cardImg.naturalWidth);
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(P, y, IN, AH, 14) : ctx.rect(P, y, IN, AH); ctx.clip();
    if (hasPhoto) {
      const iw = cardImg.naturalWidth, ih = cardImg.naturalHeight, sc = Math.max(IN / iw, AH / ih);
      ctx.drawImage(cardImg, P - (iw * sc - IN) * (cardPhoto.x ?? .5), y - (ih * sc - AH) * (cardPhoto.y ?? .5), iw * sc, ih * sc);
    } else {
      const g = ctx.createLinearGradient(0, y, 0, y + AH); g.addColorStop(0, '#22345A'); g.addColorStop(1, '#2F6B52'); ctx.fillStyle = g; ctx.fillRect(P, y, IN, AH);
      let sd = 3; for (const ch of B.nick) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0;
      ctx.fillStyle = '#F4EFD0';
      for (let i = 0; i < 40; i++) { sd = (sd * 1103515245 + 12345) >>> 0; const sx = P + (sd >>> 8) % IN, sy = y + (sd >>> 4) % Math.round(AH * .55); ctx.globalAlpha = .4 + (sd % 6) / 10; ctx.fillRect(sx, sy, 1.6, 1.6); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#F3E7A0'; ctx.beginPath(); ctx.arc(P + IN * .74, y + AH * .26, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16301F';
      for (let i = -1; i < 9; i++) { const bx = P + i * IN / 8, th = AH * (.32 + ((i * 37) % 5) / 20); ctx.beginPath(); ctx.moveTo(bx - 4, y + AH); ctx.lineTo(bx + IN / 16, y + AH - th); ctx.lineTo(bx + IN / 8 + 4, y + AH); ctx.fill(); }
      ctx.font = `${F.big} ${30 * F.k}px ${F.f}`; ctx.fillStyle = '#F4EFE4'; ctx.textAlign = 'center'; ctx.fillText(B.dd || '숲별', P + IN / 2, y + AH * .4); ctx.textAlign = 'left';
    }
    ctx.restore();
    y += AH + 20;
    ctx.font = `${F.w} ${21 * F.k}px ${F.f}`; ctx.fillStyle = C.ink; ctx.fillText(T.fit(B.nick + '의 숲별 플레이리스트', IN - 24), P, y);
    ctx.fillStyle = C.acc; ctx.font = sans(400, 18); ctx.textAlign = 'right'; ctx.fillText('♥', W - P, y + 2); ctx.textAlign = 'left';
    y += 21 * F.k + 8;
    ctx.font = sans(400, 11.5); ctx.fillStyle = C.mute;
    ctx.fillText(T.fit([B.mems.length ? B.mems.join(' · ') : 'Forestella', card.since ? card.since.replace(/-/g, '.') + ' 입덕' : ''].filter(Boolean).join(' · '), IN), P, y);
    y += 30;
    // 재생 막대: 입덕일부터 오늘까지, 끝없이 이어지는 중
    ctx.fillStyle = C.line; ctx.fillRect(P, y, IN, 3);
    ctx.fillStyle = C.ink; ctx.fillRect(P, y, IN * .72, 3); ctx.beginPath(); ctx.arc(P + IN * .72, y + 1.5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = sans(500, 9.5); ctx.fillStyle = C.mute; ctx.fillText(B.dd || 'D+0', P, y + 10); ctx.textAlign = 'right'; ctx.fillText('∞', W - P, y + 10); ctx.textAlign = 'left';
    y += 30;
    // 버튼 줄
    const mid = W / 2;
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(mid, y + 14, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.bg[0]; ctx.fillRect(mid - 6, y + 6, 4, 16); ctx.fillRect(mid + 2, y + 6, 4, 16);
    ctx.fillStyle = C.ink;
    [[-1, mid - 62], [1, mid + 62]].forEach(([d, x]) => { ctx.beginPath(); ctx.moveTo(x - 8 * d, y + 6); ctx.lineTo(x + 4 * d, y + 14); ctx.lineTo(x - 8 * d, y + 22); ctx.fill(); ctx.fillRect(x + 4 * d - (d > 0 ? 0 : 2), y + 6, 2, 16); });
    ctx.font = sans(400, 14); ctx.fillStyle = C.mute; ctx.fillText('⇄', P, y + 6); ctx.textAlign = 'right'; ctx.fillText('↻', W - P, y + 6); ctx.textAlign = 'left';
    y += 50;
    ctx.font = sans(700, 10); ctx.fillStyle = C.mute; T.spaced('NEXT UP', P, y, 1.5); y += 22;
    tracks.forEach(([n, tag], i) => {
      ctx.font = sans(500, 11); ctx.fillStyle = C.mute; ctx.fillText(String(i + 1).padStart(2, '0'), P, y + 3);
      ctx.font = `${F.w} ${14 * F.k}px ${F.f}`; ctx.fillStyle = tag === '소취곡' ? C.acc : C.ink; ctx.fillText(T.fit(n, IN - 90), P + 26, y + 1 - (F.k > 1 ? 2 : 0));
      ctx.font = sans(500, 9.5); ctx.fillStyle = C.mute; ctx.textAlign = 'right'; ctx.fillText(tag, W - P, y + 4); ctx.textAlign = 'left';
      ctx.fillStyle = C.line; ctx.fillRect(P, y + 26, IN, 1);
      y += 34;
    });
    if (B.line) { y += 10; ctx.font = `${F.w} ${14 * F.k}px ${F.f}`; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(T.fit('“' + B.line + '”', IN), W / 2, y); ctx.textAlign = 'left'; y += 36; }
    ctx.font = sans(400, 8); ctx.fillStyle = C.mute; ctx.fillText('숲별 기록장', P, H - 24); ctx.textAlign = 'right'; ctx.fillText('sujeonghan78-lgtm.github.io/forestella-archive', W - P, H - 24); ctx.textAlign = 'left';
    ctx.restore();
    paintStickers(ctx);
    return { PH: 0, OX: 0, OY: 0, OW: W, OH: H };
  }

  function drawCard(cv) {
    if (card.frame === 'receipt') return drawReceipt(cv);
    if (card.frame === 'playlist') return drawPlaylist(cv);
    const C = CARD_COLORS[card.color] || CARD_COLORS.forest, F = CARD_FONTS[card.font] || CARD_FONTS.myeong;
    const fr = CARD_FRAMES[card.frame] ? card.frame : 'round';
    const W = 340, P = 22, IN = W - P * 2, S = 3, PH = 190;
    const hasPhoto = !!(cardPhoto && cardImg && cardImg.complete && cardImg.naturalWidth);
    const ctx = cv.getContext('2d');
    const ops = [];
    const font = (w, px, fam = CARD_SANS) => `${w} ${px}px ${fam}`;
    const fit = (t, max) => { if (ctx.measureText(t).width <= max) return t; while (t && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
    const wrap = (t, max, n, sep = /(\s+)/) => {
      const out = []; let cur = '';
      for (const w of t.split(sep)) {
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
    // 뱃지
    const bdg = cardBadges().filter(b => b.got && (card.badges || []).includes(b.k));
    if (bdg.length) {
      y += 6;
      // 뱃지 이름 옆에 받은 기준을 작게 (예: 🌱 첫 발자국 직관 1번)
      let bx = P, by = y;
      bdg.forEach(b => {
        const t = b.ic + ' ' + b.name;
        ctx.font = font(600, 10.5); const tw = ctx.measureText(t).width;
        ctx.font = font(400, 8.5); const hw = ctx.measureText(b.how).width;
        const w = tw + 5 + hw + 18;
        if (bx > P && bx + w > P + IN) { bx = P; by += 26; }
        const x0 = bx, y1 = by;
        ops.push(() => {
          ctx.strokeStyle = C.acc; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 + .5, y1 + .5, w - 1, 21, 11) : ctx.rect(x0, y1, w, 21); ctx.stroke();
          ctx.font = font(600, 10.5); ctx.fillStyle = C.ink; ctx.fillText(t, x0 + 9, y1 + 5);
          ctx.font = font(400, 8.5); ctx.fillStyle = C.mute; ctx.fillText(b.how, x0 + 9 + tw + 5, y1 + 6.5);
        });
        bx += w + 6;
      });
      y = by + 21 + 4;
    }
    // 입덕곡 · 최애곡 (최애곡은 ' · '로 여러 곡)
    const favs = favList(card.fav);
    const songsRow = [['입덕곡', card.debut.trim()], ['최애곡', favs.join(' · ')]].filter(x => x[1]);
    const wishes = favList(card.wish);
    if (songsRow.length || wishes.length) {
      y += 10; hline(y); y += 11;
      const two = songsRow.length > 1 && favs.length < 2;
      const colW = (IN - 12) / 2;
      songsRow.forEach(([lb, v], i) => {
        const x = two ? P + i * (colW + 12) : P, yS = y;
        label(lb, x, yS);
        // 최애곡이 많으면(6곡~) 글씨를 줄이고 4줄까지
        const many = lb === '최애곡' && favs.length > 5, sz = (many ? 13.5 : 16) * F.k;
        ctx.font = font(F.w, sz, F.f);
        const ls = two ? [fit(v, colW)] : (lb === '최애곡' ? wrap(v, IN, many ? 4 : 2, /( · )/) : wrap(v, IN, 2));
        ls.forEach((l, j) => ops.push(() => { ctx.font = font(F.w, sz, F.f); ctx.fillStyle = C.ink; ctx.fillText(l, x, yS + 15 - (F.k > 1 ? 2 : 0) + j * sz * 1.25); }));
        if (!two || i === songsRow.length - 1) y += 15 + sz * 1.2 + (ls.length - 1) * sz * 1.25 + (two ? 0 : 6);
      });
      // 소취곡: 듣고 싶은 곡
      if (wishes.length) {
        const yS = y, sz = (wishes.length > 5 ? 13.5 : 15) * F.k;
        label('소취곡 · 듣고 싶은 곡', P, yS);
        ctx.font = font(F.w, sz, F.f);
        const ls = wrap(wishes.join(' · '), IN, wishes.length > 5 ? 3 : 2, /( · )/);
        ls.forEach((l, j) => ops.push(() => { ctx.font = font(F.w, sz, F.f); ctx.fillStyle = C.acc; ctx.fillText(l, P, yS + 15 - (F.k > 1 ? 2 : 0) + j * sz * 1.25); }));
        y += 15 + sz * 1.2 + (ls.length - 1) * sz * 1.25 + 6;
      }
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
    // 길면 글씨를 조금 줄이고, 그래도 넘치면 두 줄로 나눠요 (가사 한 줄 정도는 들어가게)
    let qSize = 15 * F.k, qLines = [];
    if (lineT) {
      const q = '“' + lineT + '”';
      for (; qSize > 12 * F.k; qSize -= 0.5) { ctx.font = font(F.w, qSize, F.f); if (ctx.measureText(q).width <= IN) break; }
      ctx.font = font(F.w, qSize, F.f);
      qLines = ctx.measureText(q).width <= IN ? [q] : wrap(q, IN, 2);
    }
    const qH = lineT ? qSize * 1.45 * qLines.length + qSize * 0.25 + 6 : 0;
    const H = Math.ceil(Math.max(y + 14 + qH + 26, hasPhoto ? 690 : 520));
    if (lineT) {
      const yQ = H - 26 - qH;
      ops.push(() => { ctx.font = font(F.w, qSize, F.f); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; qLines.forEach((l, i) => ctx.fillText(i === qLines.length - 1 ? fit(l, IN) : l, W / 2, yQ + i * qSize * 1.45)); ctx.textAlign = 'left'; });
    }
    ops.push(() => { ctx.font = font(400, 8.5); ctx.fillStyle = C.mute; ctx.fillText('숲별 기록장', P, H - 26); ctx.textAlign = 'right'; ctx.fillText('sujeonghan78-lgtm.github.io/forestella-archive', W - P, H - 26); ctx.textAlign = 'left'; });

    // 실제로 그리기: 틀 모양에 따라 바깥 크기가 달라요 (폴라로이드는 흰 테두리, 티켓은 아래 떼는 부분)
    const OX = 0, OY = 0, STUB = fr === 'ticket' ? 58 : 0;
    const OW = W, OH = H + STUB, BH = H + STUB;
    cv.width = OW * S; cv.height = OH * S;
    cv.dataset.h = OH; cv.dataset.w = OW;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.textBaseline = 'top';
    ctx.save();
    ctx.translate(OX, OY);
    ctx.beginPath();
    if (fr === 'ticket') {
      // 네 귀퉁이를 안으로 둥글게 파고, 떼는 줄 양옆에 반원 홈
      const r = 14, n = 10;
      ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.arc(W, 0, r, Math.PI, Math.PI / 2, true);
      ctx.lineTo(W, H - n); ctx.arc(W, H, n, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(W, BH - r); ctx.arc(W, BH, r, -Math.PI / 2, Math.PI, true);
      ctx.lineTo(r, BH); ctx.arc(0, BH, r, 0, -Math.PI / 2, true);
      ctx.lineTo(0, H + n); ctx.arc(0, H, n, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, 0, true);
      ctx.closePath();
    } else ctx.roundRect ? ctx.roundRect(0, 0, W, H, 20) : ctx.rect(0, 0, W, H);
    ctx.clip();
    if (C.bg.length > 1) { const g = ctx.createLinearGradient(0, 0, W * 0.35, BH); g.addColorStop(0, C.bg[0]); g.addColorStop(1, C.bg[1]); ctx.fillStyle = g; } else ctx.fillStyle = C.bg[0];
    ctx.fillRect(0, 0, W, BH);
    const photoH = PH;
    if (hasPhoto) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
      const iw = cardImg.naturalWidth, ih = cardImg.naturalHeight, sc = Math.max(W / iw, photoH / ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(cardImg, -(dw - W) * (cardPhoto.x ?? .5), -(dh - photoH) * (cardPhoto.y ?? .5), dw, dh);
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
    if (fr === 'ticket') {
      // 떼는 부분: 점선 + ADMIT ONE + 바코드
      ctx.strokeStyle = C.mute; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(14, H); ctx.lineTo(W - 14, H); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = font(700, 11); ctx.fillStyle = C.ink; spaced('ADMIT ONE', P, H + 17, 2.4);
      ctx.font = font(500, 9); ctx.fillStyle = C.mute; spaced('SOOPBYEOL · ' + (ddayText() || 'FORESTELLA'), P, H + 34, 1.4);
      let seed = 0; for (const ch of card.nick + card.since) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      ctx.fillStyle = C.ink;
      for (let bx = W - P - 96; bx < W - P;) { seed = (seed * 1103515245 + 12345) >>> 0; const w = 1 + (seed >>> 16) % 3; ctx.fillRect(bx, H + 15, w, 28); bx += w + 1 + (seed >>> 20) % 3; }
    }
    ctx.restore();
    paintStickers(ctx);
    return { PH: hasPhoto ? photoH : 0, OX, OY, OW, OH };
  }

  // 카드 슬롯: 지금 꾸민 카드(글·색·틀·사진·스티커)를 3칸까지 이 폰에 저장해요. 입덕일은 슬롯과 상관없이 하나예요
  const SLOT_KEY = 'sb-card-slots';
  const slotsRead = () => { const a = boxRead(SLOT_KEY); return Array.isArray(a) ? [0, 1, 2].map(i => a[i] || null) : [null, null, null]; };
  let slotPick = -1, slotOpen = false;
  function slotBar() {
    const sl = slotsRead();
    const lab = (x, i) => x ? `<b>슬롯 ${i + 1}</b><span>${esc(CARD_FRAMES[x.card.frame] || '기본')}</span><small>${esc(x.at)}</small>` : `<b>슬롯 ${i + 1}</b><span>비어 있음</span><small>&nbsp;</small>`;
    const x = sl[slotPick];
    const acts = slotPick < 0 ? '' : x
      ? `<button type="button" class="chip on" data-slot-act="load">불러오기</button><button type="button" class="chip" data-slot-act="save">지금 카드로 바꾸기</button><button type="button" class="link-btn" data-slot-act="del">비우기</button>`
      : `<button type="button" class="chip on" data-slot-act="save">지금 카드를 여기에 저장</button>`;
    const n = sl.filter(Boolean).length;
    return `<div class="cf-slots${slotOpen ? ' open' : ''}" id="cf-slots">
      <div class="slot-top"><button type="button" class="chip slot-toggle" aria-expanded="${slotOpen}">💾 카드 슬롯 ${n}/3 ${slotOpen ? '▴' : '▾'}</button>${help('지금 숲별 카드를 저장해 둘 수 있어요. 3개까지 저장해 두고 언제든 불러와요.')}</div>
      ${slotOpen ? `<div class="slot-row">${sl.map((x, i) => `<button type="button" class="slot${x ? ' full' : ''}${i === slotPick ? ' on' : ''}" data-slot="${i}" aria-pressed="${i === slotPick}">${lab(x, i)}</button>`).join('')}</div>
      ${acts ? `<div class="slot-acts">${acts}</div>` : ''}` : ''}
    </div>`;
  }
  function bindSlots() {
    const box = document.getElementById('cf-slots');
    if (!box) return;
    box.onclick = ev => {
      if (ev.target.closest('.slot-toggle')) { slotOpen = !slotOpen; slotPick = -1; box.outerHTML = slotBar(); bindSlots(); return; }
      const b = ev.target.closest('[data-slot]'), a = ev.target.closest('[data-slot-act]');
      if (b) { slotPick = slotPick === +b.dataset.slot ? -1 : +b.dataset.slot; box.outerHTML = slotBar(); bindSlots(); return; }
      if (!a || slotPick < 0) return;
      const sl = slotsRead(), act = a.dataset.slotAct;
      if (act === 'save') {
        const t = todayParts(), now = new Date();
        const { since, hideAsk, ...rest } = card;
        sl[slotPick] = { card: rest, photo: cardPhoto || null, stk: cardStk, at: `${t.m}.${t.d} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
        try { localStorage.setItem(SLOT_KEY, JSON.stringify(sl)); kvTouch(); toast(`${slotPick + 1}번 슬롯에 저장했어요.`); }
        catch (err) { toast('폰 저장 공간이 모자라요. 사진이나 스티커를 줄이거나 다른 슬롯을 비워 주세요.'); return; }
      } else if (act === 'load' && sl[slotPick]) {
        const x = sl[slotPick];
        card = Object.assign(cardDefault(), x.card, { since: card.since, hideAsk: card.hideAsk });
        cardPhoto = x.photo || null; cardStk = x.stk || [];
        cardSave(); boxWrite(PHOTO_KEY, cardPhoto); boxWrite(STK_KEY, cardStk);
        cardImg = null; cardImgSrc = ''; cardSel = -1;
        toast(`${slotPick + 1}번 슬롯 카드를 불러왔어요.`);
        renderBase('card'); return;
      } else if (act === 'del') {
        sl[slotPick] = null; boxWrite(SLOT_KEY, sl); toast(`${slotPick + 1}번 슬롯을 비웠어요.`);
      }
      box.outerHTML = slotBar(); bindSlots();
    };
  }

  function cardView() {
    const st = boxStats();
    const bestList = [...new Map([...st.liked, ...st.wentAll].map(e => [e.castKey || e.id, e])).values()].sort((a, b) => b.date.localeCompare(a.date));
    const chip = (grp, v, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-grp="${grp}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">숲별 카드${help('내 숲별 기록을 카드 한 장으로 만들어요. 넣은 내용과 사진은 이 폰에만 저장돼요.')}</h1>
      ${slotBar()}
      <form class="card-form" id="card-form" onsubmit="return false">
        <label><span class="cf-l">닉네임</span><input id="cf-nick" maxlength="16" value="${esc(card.nick)}" placeholder="숲별홍길동" autocomplete="off"></label>
        <label><span class="cf-l">입덕 날짜</span><input type="date" id="cf-since" value="${esc(card.since)}" max="${todayIso()}" min="2017-01-01"></label>
        <div class="cf-g"><span class="cf-l">공식 팬클럽 숲별 기수 <small>여러 개 골라도 돼요</small></span><div class="chips cf-chips">${CARD_GENS.map(g => chip('gen', g, g, card.gen.includes(g))).join('')}</div></div>
        <div class="cf-two">
          <label><span class="cf-l">입덕곡</span><span class="cf-ac"><input id="cf-debut" maxlength="40" value="${esc(card.debut)}" placeholder="곡 이름·초성" autocomplete="off"><span class="cf-sug" hidden></span></span></label>
          <label><span class="cf-l">최애곡</span><span class="cf-ac"><input id="cf-fav" maxlength="300" value="${esc(card.fav)}" placeholder="여러 곡 골라도 돼요" autocomplete="off" data-multi="1"><span class="cf-sug" hidden></span></span></label>
        </div>
        <label><span class="cf-l">소취곡 <small>공연에서 듣고 싶은 곡, 여러 곡 골라도 돼요</small></span><span class="cf-ac"><input id="cf-wish" maxlength="300" value="${esc(card.wish)}" placeholder="곡 이름·초성" autocomplete="off" data-multi="1"><span class="cf-sug" hidden></span></span></label>
        <div class="cf-g"><span class="cf-l">최애 <small>여러 명 골라도 돼요</small></span><div class="chips cf-chips">${CARD_MEMS.map(m => chip('mem', m, m, card.mem.includes(m))).join('')}</div></div>
        <label><span class="cf-l">제일 좋았던 일정 <small>직관·♥ 일정에서 골라요</small></span>
          <select id="cf-best"><option value="">${bestList.length ? '안 넣을래요' : '보관함에 직관·♥ 일정이 아직 없어요'}</option>${bestList.map(e => `<option value="${esc(e.id)}"${e.id === card.best ? ' selected' : ''}>${fmtDate(e.date, false)} ${esc(e.title)}</option>`).join('')}</select></label>
        <div class="cf-g"><span class="cf-l">사진 <small>안 넣어도 돼요</small></span>
          <div class="cf-photo"><label class="chip cf-file">📷 ${cardPhoto ? '사진 바꾸기' : '폰에서 사진 고르기'}<input type="file" id="cf-photo" accept="image/*" hidden></label>${cardPhoto ? '<button type="button" class="link-btn" id="cf-photo-x">사진 빼기</button>' : ''}</div>
          <p class="src-note">직접 찍었거나 공유해도 되는 사진을 넣어 주세요. 사진은 이 폰에만 있어요.${cardPhoto ? ' 미리보기에서 사진을 끌어서 위치를 맞출 수 있어요.' : ''}</p></div>
        <details class="cf-g cf-bd"><summary><span class="cf-l">뱃지 <small>${(() => { const bs = cardBadges(st), on = bs.filter(b => b.got && (card.badges || []).includes(b.k)); return on.length ? esc(on.map(b => b.ic + ' ' + b.name).join(' · ')) : `받은 뱃지 ${bs.filter(b => b.got).length}개 · 3개까지 넣어요`; })()}</small></span><span class="cf-bd-t">펼치기</span></summary><div class="cf-badges">${cardBadges(st).map(b => `<button type="button" class="cf-badge${(card.badges || []).includes(b.k) && b.got ? ' on' : ''}" data-grp="badges" data-v="${b.k}" aria-pressed="${(card.badges || []).includes(b.k) && b.got}"${b.got ? '' : ' disabled'}><span>${b.ic}</span><b>${esc(b.name)}</b><small>${esc(b.got ? '받았어요' : b.how)}</small></button>`).join('')}</div></details>
        <label><span class="cf-l">한마디 <small>안 써도 돼요</small></span><input id="cf-line" maxlength="40" value="${esc(card.line)}" placeholder="숲별이라 행복해" autocomplete="off"></label>
        <div class="cf-g"><span class="cf-l">글씨체</span><div class="cf-fonts">${Object.entries(CARD_FONTS).map(([k, f]) => `<button type="button" class="cf-font${card.font === k ? ' on' : ''}" data-grp="font" data-v="${k}" aria-pressed="${card.font === k}" style="font-family:${esc(f.f)};font-weight:${f.w}${k === 'pen' ? ';font-size:21px' : ''}">${f.name} 숲별</button>`).join('')}</div></div>
        <div class="cf-g"><span class="cf-l">틀 모양</span><div class="chips cf-chips">${Object.entries(CARD_FRAMES).map(([k, n]) => chip('frame', k, n, (card.frame || 'round') === k)).join('')}</div></div>
        <div class="cf-g"><span class="cf-l">카드 색</span><div class="cf-colors">${Object.entries(CARD_COLORS).map(([k, c]) => `<button type="button" class="cf-color${card.color === k ? ' on' : ''}" data-grp="color" data-v="${k}" aria-pressed="${card.color === k}" style="background:${c.bg.length > 1 ? `linear-gradient(135deg,${c.bg.join(',')})` : c.bg[0]}"><span class="sr">${c.name}</span></button>`).join('')}</div></div>
        <div class="cf-g"><span class="cf-l">카드에 넣을 기록 <small>보관함에서 자동</small></span><div class="chips cf-chips">${CARD_STATS.map(([k, l]) => chip('stats', k, l, card.stats.includes(k))).join('')}</div></div>
      </form>
      <div class="cf-l cf-pv-l">미리보기</div>
      <div class="cf-pv"><canvas id="card-cv"${cardPhoto || cardStk.length ? ' class="has-photo"' : ''} aria-label="숲별 카드 미리보기"></canvas></div>
      <div class="stk-bar">
        <div class="stk-head"><b>🖼 내 사진 스티커</b><label class="chip cf-file">＋ 스티커 붙이기<input type="file" id="cf-stk" accept="image/*" multiple hidden></label></div>
        <p class="src-note">${cardStk.length ? '스티커를 누르면 크기·모양을 바꿀 수 있어요. 끌어서 옮기고, 두 손가락으로 키우거나 돌려도 돼요.' : '갤러리 사진을 카드 위에 스티커로 붙여요. 사진은 이 폰에만 있어요.'}</p>
      <div class="stk-tools" id="stk-tools" hidden>
        <label><span>크기</span><input type="range" id="stk-w" min="40" max="300"></label>
        <label><span>돌리기</span><input type="range" id="stk-r" min="-180" max="180"></label>
        <div class="chips">${[['circle', '동그라미'], ['heart', '하트'], ['rect', '네모']].map(([k, n]) => `<button type="button" class="chip stk-shape" data-v="${k}">${n}</button>`).join('')}<button type="button" class="chip stk-del">스티커 빼기</button><button type="button" class="link-btn stk-done">다 했어요</button></div>
      </div>
      </div>
      <div class="cf-btns"><button type="button" class="btn" id="card-save">이미지로 저장</button><button type="button" class="btn ghost" id="card-x">X에 올리기</button></div>
      <p class="src-note cf-msg" id="card-msg">X에 올릴 땐 저장한 카드 이미지를 글에 붙여 주세요.</p>`;
  }

  function bindCard() {
    const cv = document.getElementById('card-cv');
    if (!cv) return;
    bindSlots();
    let geo = { PH: 0 }, tick = 0;
    const redraw = () => {
      const my = ++tick;
      const text = [card.nick, card.debut, card.fav, card.wish, card.line, '소취곡 듣고 싶은 곡 ADMIT ONE 영수증 품목 수량 합계 결제 평생 할부 일시 손님 입덕 기수 최고의 날 감사합니다 또 만나요 뱃지 숲별의 플레이리스트 NEXT UP PLAYING FROM ' + CARD_BADGES.map(b => b[2]).join(' '), ddayText(), 'FORESTELLA SOOPBYEOL CARD DAYS WITH 숲별 입덕 공식 팬클럽 기수 직관 시청 들은 곡 많이 간 곳 첫 제일 좋았던 일정 기록장 번 무대 0123456789.·♥…“”', (data.byId.get(card.best) || {}).title || ''].join(' ');
      geo = drawCard(cv);
      cardFontsReady(text).then(() => { if (my === tick) geo = drawCard(cv); });
    };
    if (cardPhoto && cardImgSrc !== cardPhoto.src) { cardImg = new Image(); cardImg.onload = redraw; cardImg.src = cardImgSrc = cardPhoto.src; }
    const form = document.getElementById('card-form');
    const txt = { 'cf-nick': 'nick', 'cf-debut': 'debut', 'cf-fav': 'fav', 'cf-wish': 'wish', 'cf-line': 'line', 'cf-since': 'since', 'cf-best': 'best' };
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
      if (g === 'badges' && !(card.badges || []).includes(v) && (card.badges || []).filter(k => cardBadges().some(b => b.k === k && b.got)).length >= 3) { toast('뱃지는 3개까지 넣을 수 있어요.'); return; }
      if (g === 'font' || g === 'color' || g === 'frame') {
        card[g] = v;
        form.querySelectorAll(`[data-grp="${g}"]`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      } else {
        card[g] = card[g] || [];
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
    // 미리보기: 스티커는 눌러서 고르고 끌어 옮겨요(두 손가락이면 크기·돌리기), 위쪽 사진은 끌어서 위치 맞추기
    let drag = null;
    const pts = new Map();
    const tools = document.getElementById('stk-tools');
    const toolSync = () => {
      const k = cardStk[cardSel];
      tools.hidden = !k;
      if (!k) return;
      document.getElementById('stk-w').value = k.w; document.getElementById('stk-r').value = k.r || 0;
      tools.querySelectorAll('.stk-shape').forEach(b => b.classList.toggle('on', b.dataset.v === (k.shape || 'circle')));
    };
    const stkSave = () => boxWrite(STK_KEY, cardStk);
    const toCard = ev => { const r = cv.getBoundingClientRect(), k = (geo.OW || 340) / r.width; return { x: (ev.clientX - r.left) * k, y: (ev.clientY - r.top) * k, k }; };
    const hitStk = p => { for (let i = cardStk.length - 1; i >= 0; i--) { const k = cardStk[i]; if (Math.hypot(p.x - k.x, p.y - k.y) <= k.w * 0.62 + 6) return i; } return -1; };
    cv.onpointerdown = ev => {
      const p = toCard(ev);
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      cv.setPointerCapture(ev.pointerId);
      if (pts.size === 2 && cardSel >= 0) {
        const [a, b] = [...pts.values()], k = cardStk[cardSel];
        drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), w0: k.w, r0: k.r || 0 };
        return;
      }
      const i = hitStk(p);
      if (i >= 0) {
        // 고른 스티커는 맨 위로
        if (i !== cardStk.length - 1) cardStk.push(cardStk.splice(i, 1)[0]);
        cardSel = cardStk.length - 1;
        const k = cardStk[cardSel];
        drag = { stk: true, x: p.x, y: p.y, sx: k.x, sy: k.y };
        toolSync(); drawCard(cv);
        return;
      }
      if (cardSel >= 0) { cardSel = -1; toolSync(); drawCard(cv); }
      const py = p.y - (geo.OY || 0);
      if (!geo.PH || !cardImg || py < 0 || py > geo.PH) return;
      drag = { x: ev.clientX, y: ev.clientY, px: cardPhoto.x ?? .5, py: cardPhoto.y ?? .5, k: p.k };
    };
    cv.onpointermove = ev => {
      if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (!drag) return;
      if (drag.pinch) {
        if (pts.size < 2) return;
        const [a, b] = [...pts.values()], k = cardStk[cardSel];
        k.w = Math.min(300, Math.max(40, drag.w0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0));
        k.r = Math.round(drag.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180 / Math.PI);
        toolSync(); drawCard(cv); return;
      }
      if (drag.stk) {
        const p = toCard(ev), k = cardStk[cardSel];
        k.x = Math.min(geo.OW, Math.max(0, drag.sx + p.x - drag.x)); k.y = Math.min(geo.OH, Math.max(0, drag.sy + p.y - drag.y));
        drawCard(cv); return;
      }
      const iw = cardImg.naturalWidth, ih = cardImg.naturalHeight, sc = Math.max(340 / iw, geo.PH / ih);
      const ox = iw * sc - 340, oy = ih * sc - geo.PH;
      const cl = v => Math.min(1, Math.max(0, v));
      cardPhoto.x = ox > 1 ? cl(drag.px - (ev.clientX - drag.x) * drag.k / ox) : .5;
      cardPhoto.y = oy > 1 ? cl(drag.py - (ev.clientY - drag.y) * drag.k / oy) : .5;
      drawCard(cv);
    };
    cv.onpointerup = cv.onpointercancel = ev => {
      pts.delete(ev.pointerId);
      if (!drag) return;
      if (drag.stk || drag.pinch) stkSave(); else boxWrite(PHOTO_KEY, cardPhoto);
      drag = null;
    };
    document.getElementById('stk-w').oninput = ev => { const k = cardStk[cardSel]; if (k) { k.w = +ev.target.value; drawCard(cv); stkSave(); } };
    document.getElementById('stk-r').oninput = ev => { const k = cardStk[cardSel]; if (k) { k.r = +ev.target.value; drawCard(cv); stkSave(); } };
    tools.onclick = ev => {
      const k = cardStk[cardSel];
      if (!k) return;
      const sh = ev.target.closest('.stk-shape');
      if (sh) { k.shape = sh.dataset.v; stkSave(); toolSync(); drawCard(cv); }
      if (ev.target.closest('.stk-del')) { cardStk.splice(cardSel, 1); cardSel = -1; stkSave(); renderBase('card'); }
      if (ev.target.closest('.stk-done')) { cardSel = -1; toolSync(); drawCard(cv); }
    };
    // 스티커 사진: 긴 쪽 500px로 줄여서 이 폰에만 (최대 8장)
    const loadStk = () => cardStk.forEach(k => { if (!cardStkImg.has(k.src)) { const im = new Image(); im.onload = () => drawCard(cv); im.src = k.src; cardStkImg.set(k.src, im); } });
    loadStk();
    document.getElementById('cf-stk').onchange = ev => {
      const files = [...(ev.target.files || [])].slice(0, Math.max(0, 8 - cardStk.length));
      if (!files.length) { toast('스티커는 8장까지 붙일 수 있어요.'); return; }
      Promise.all(files.map(f => new Promise(res => {
        const img = new Image(), url = URL.createObjectURL(f);
        img.onload = () => {
          const sc = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => res(null);
        img.src = url;
      }))).then(srcs => {
        srcs.filter(Boolean).forEach((src, i) => cardStk.push({ src, x: (geo.OW || 340) / 2 + i * 24, y: 150 + i * 24, w: 110, r: [-8, 6, -3, 10][i % 4], shape: 'circle' }));
        cardSel = cardStk.length - 1;
        stkSave(); renderBase('card');
      });
    };
    // 저장: 공유 창이 되면 공유 창(사진 앱에 저장 가능), 아니면 내려받기
    const msg = document.getElementById('card-msg');
    const blobOf = () => { cardExport = true; drawCard(cv); return new Promise(res => cv.toBlob(b => { cardExport = false; drawCard(cv); res(b); }, 'image/png')); };
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

  const isRun = e => e.category === '뮤지컬' && e.endDate && e.endDate > e.date;
  // ---------- 뮤지컬 캐스팅 회차: 누구나 회차를 올리고, 직관은 그 회차 중에서 골라요 ----------
  const CAST_ADD = 'sb-cast-added';
  const castLocal = () => { try { return JSON.parse(localStorage.getItem(CAST_ADD) || '{}'); } catch (err) { return {}; } };
  const castKey = (e, c) => `${e.id}@${c.d}${c.t ? 'T' + c.t : ''}`;
  const castList = e => {
    const have = e.casts || [], mine = (castLocal()[e.id] || []).filter(c => !have.some(x => x.d === c.d && x.t === c.t));
    return [...have, ...mine.map(c => ({ ...c, wait: true }))].sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  };
  const wd = d => '일월화수목금토'[new Date(d + 'T00:00:00').getDay()];
  function castBlock(e) {
    if (!isRun(e)) return '';
    const list = castList(e), went = list.filter(c => boxHas('w', castKey(e, c))).length;
    // 달마다 묶어서 작은 버튼으로 (관리자는 '회차 정리'를 눌렀을 때만 × 가 보여요)
    const pill = (c, timeOnly) => { const k = castKey(e, c), on = boxHas('w', k), lab = timeOnly ? c.t || '시간 모름' : `${+c.d.slice(8)}(${wd(c.d)})${c.t ? ' ' + c.t : ''}`;
      return `<span class="cast-row${c.wait ? ' wait' : ''}"><button type="button" class="box-btn cast-btn" data-box="w" data-ic="" data-id="${esc(k)}" data-label="${esc(lab)}" aria-pressed="${on}"${c.wait ? ' title="올리는 중 · 5~10분 뒤 모두에게 보여요"' : ''}>${on ? '✓ ' : ''}${esc(lab)}</button>${isAdmin() && c.id ? `<button type="button" class="cast-del" data-id="${esc(c.id)}" aria-label="이 회차 지우기">×</button>` : ''}</span>`; };
    const months = [...new Set(list.map(c => c.d.slice(0, 7)))];
    // 같은 날 낮공·밤공은 한 칸에: '16(토) 14:00 19:30'
    const day = cs => cs.length === 1 ? pill(cs[0]) : `<span class="cast-day"><span class="cast-dl">${+cs[0].d.slice(8)}(${wd(cs[0].d)})</span>${cs.map(c => pill(c, true)).join('')}</span>`;
    const rows = months.map(m => { const ds = [...new Set(list.filter(c => c.d.startsWith(m)).map(c => c.d))]; return `<div class="cast-m"><span class="cast-mh">${m.slice(2, 4)}.${m.slice(5)}</span><div class="cast-list">${ds.map(d => day(list.filter(c => c.d === d))).join('')}</div></div>`; }).join('');
    return `<hr class="divider"><section class="d-block cast">
      <div class="block-head"><h2 class="h3">캐스팅 회차 <span class="song-count">${list.length}</span>${help('공연 기간 중 출연한 날을 팬들이 올려 주신 거예요. 내가 본 회차를 누르면 보관함 직관에 들어가요.')}</h2></div>
      ${list.length ? `<p class="sub">${went ? `🎫 ${went}회 봤어요 · ` : ''}본 회차를 눌러 주세요.${list.some(c => c.wait) ? ' 점선은 올리는 중인 회차예요.' : ''}</p><div class="cast-months">${rows}</div>${isAdmin() ? '<button type="button" class="link-btn cast-edit">회차 정리 (관리자)</button>' : ''}` : '<p class="sub">아직 올라온 회차가 없어요. 아는 회차를 올려 주세요.</p>'}
      <details class="fix-box"><summary>＋ 회차 올리기</summary><div class="op-form">
        <label class="add-f"><span>날짜</span><input type="date" class="cast-d" min="${esc(e.date)}" max="${esc(e.endDate)}" value="${esc(e.date)}"></label>
        <label class="add-f"><span>시간 (몰라도 돼요)</span><input type="time" class="cast-t"></label>
        <button type="button" class="bpill add-send cast-send" data-id="${esc(e.id)}">보내기</button>
        <p class="src-note cast-msg">캐스팅 일정표에서 확인한 날만 올려 주세요.</p></div></details>
    </section>`;
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.cast-send');
    if (!b) return;
    const e = data.byId.get(b.dataset.id), f = b.closest('.op-form');
    if (!e) return;
    const d = f.querySelector('.cast-d').value, t = f.querySelector('.cast-t').value, msg = f.querySelector('.cast-msg');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < e.date || d > e.endDate) { msg.textContent = `공연 기간(${md2(e.date)}~${md2(e.endDate)}) 안의 날짜를 골라 주세요.`; return; }
    if (castList(e).some(c => c.d === d && c.t === t)) { msg.textContent = '이미 있는 회차예요.'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: 캐스팅\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n회차: ${d}\n시간: ${t}\n누가: ${myUid()}`)
      .then(() => {
        const all = castLocal(); all[e.id] = [...(all[e.id] || []), { d, t }].slice(-60);
        try { localStorage.setItem(CAST_ADD, JSON.stringify(all)); } catch (err) { /* 괜찮아요 */ }
        const sec = b.closest('.cast'); sec.outerHTML = castBlock(e).replace(/^<hr class="divider">/, '');
      })
      .catch(() => { b.disabled = false; b.textContent = '다시 보내기'; });
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.cast-edit');
    if (!b) return;
    const on = b.closest('.cast').classList.toggle('cast-editing');
    b.textContent = on ? '정리 끝' : '회차 정리 (관리자)';
  });
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.cast-del');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '…';
    try { await sendEvMark(b.dataset.id, '숨김'); b.closest('.cast-row').remove(); } catch (err) { b.disabled = false; b.textContent = '×'; }
  });

  // 같은 공연이 이틀 이상이면 직관은 날짜마다 따로 눌러요
  const wentBtns = e => {
    const tk = t => (t || '').replace(/[\s'"‘’“”<>《》「」()]/g, '').toLowerCase();
    const near = data.events.filter(x => tk(x.title) === tk(e.title) && samePlace(x.place, e.place) && Math.abs(new Date(x.date) - new Date(e.date)) <= 7 * 864e5);
    // 방송은 현장에서 본 '직관'과 방송으로 본 '시청'을 따로 눌러요
    if (isWatch(e)) return boxBtn('v', e.id, 'bpill');
    if (/TV|라디오/.test(e.category)) return boxBtn('w', e.id, 'bpill');
    // 기간 공연(뮤지컬)은 아래 '캐스팅 회차'에서 본 회차를 골라요
    if (isRun(e)) return '';
    if (near.length < 2) return boxBtn('w', e.id, 'bpill');
    return near.map(x => { const on = boxHas('w', x.id), lab = x.date.slice(5).replace('-', '.') + ' 직관'; return `<button type="button" class="bpill box-btn" data-box="w" data-id="${esc(x.id)}" data-label="${lab}" aria-pressed="${on}">${on ? '✓ ' : '🎫 '}${lab}</button>`; }).join('');
  };
  function bindBox() {
    if (/[?&]sync=1/.test(location.hash)) { const d = document.querySelector('.box-sync'); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'center' }), 100); } }
    const fa = document.querySelector('.fd-add');
    if (fa) fa.onclick = () => { const n = fdName(prompt('새 폴더 이름', '') || ''); if (!n) return; const id = fdNew(n); location.hash = '#/box?t=song&s=f-' + id; };
    const fr = document.querySelector('.fd-ren');
    if (fr) fr.onclick = () => { const f = folders().find(x => x.id === fr.dataset.id); if (!f) return; const n = fdName(prompt('폴더 이름', f.name) || ''); if (!n || n === f.name) return; boxSetS(box.s.map(x => x === f.raw ? 'fn:' + f.id + ':' + n : x)); renderBase('box'); };
    const fx = document.querySelector('.fd-del');
    if (fx) fx.onclick = () => { const f = folders().find(x => x.id === fx.dataset.id); if (!f || !confirm(`'${f.name}' 폴더를 지울까요? 곡은 다른 곳에 그대로 있어요.`)) return; boxSetS(box.s.filter(x => x !== f.raw && !x.startsWith('fd:' + f.id + ':'))); location.hash = '#/box?t=song'; };
    const yr = document.querySelector('.box-year');
    if (yr) yr.onchange = () => { location.hash = yr.value; };
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
        if (uidSync() | kvApply()) return false;
        renderBase('box');
      } catch (err) { boxUser = null; msg.textContent = '지금은 연결이 안 돼요. 잠시 뒤 다시 해 주세요.'; }
      return false;
    };
  }

  // ---------- 공연·행사 (축제·기업 행사·지역 공연) ----------
  // 단독 투어·게스트·셋리스트 있는 콘서트는 빼고, 장소·행사명 낱말로 지역을 나눠요 (보충 파일 region으로 고칠 수 있어요)
  const REGIONS = [
    ['해외', /두바이|해외|일본|미국|도쿄|N\.?AMERICA|North America|뉴욕|로스앤젤레스|시애틀|댈러스|애틀랜타|밴쿠버|Atlanta|Dallas|New York|Vancouver|\bin LA\b/i],
    ['경기·인천', /경기 광주|인천|송도|부천|광명|안성|분당|성남|고양|킨텍스|수원|의정부|신한대|인스파이어|계양|자라섬|jarasum|가평|용인|경기도|과천|렛츠런파크(?! 제주)|Incheon|Suwon|Goyang/i],
    ['제주', /제주/],
    ['강원', /Gangn[eu]+ng|Gangneong|강원|원주|춘천|강릉|인제|동해(?!문화예술관)|속초|평창|삼척|홍천/],
    ['충청', /Daejeon|Cheongju|in DA(?!EGU)|대전|세종시|충남|충북|충청|천안|아산|이순신종합운동장|이순신 종합운동장|계룡|예산|제천|청주|공주|금강|대백제전|당진|서산|논산|충주/],
    ['전라', /Gwangju|Jeonju|광주|타이거즈|전남|전북|전라|목포|여수|나주|순천|장흥|보림사|곡성|익산|원광|남원|광한루|영광|화순|지스트|엘로우시티|드래곤즈|광양|함평|군산|전주|고창|정읍|해남|강진|수묵/],
    ['경상', /Busan|Daegu|Ulsan|Changwon|in BU|부산|대구|울산|경북|경남|경상|창원|김해|통영|용호도|경주|칠곡|직지사|김천|영도|벡스코|BNK|포항|안동|구미|영덕|예주|울진|연호문화센터|태화강|3\.15|거제|진주|양산|APEC|창녕|밀양|상주|문경/],
    ['서울', /서울|seoul|대학로|동숭|충무아트|디큐브|백암아트|아트원씨어터|동양예술극장|유니플렉스|이해랑|예스24스테이지|두산아트센터|경희대|광운대|건국대|성수|압구정|잠실|올림픽공원|올림픽홀|88잔디|롯데콘서트홀|코엑스|장충|은평|서리풀|홍대|노량진|동작|세종대|고려대|한전아트센터|유니버설아트센터|플라자호텔|KBS홀|블루스퀘어|예술의전당(?!.*(광주|대구|경주|부산))/i],
  ];
  const regionOf = e => {
    const fix = ((data.extra || {}).region || {})[e.id];
    if (fix) return fix;
    const t = `${e.place || ''} ${e.title}`;
    const r = REGIONS.find(([, rx]) => rx.test(t));
    return r ? r[0] : '그 외';
  };
  // 공연 + 뮤지컬 + '기타'로 들어온 축제·행사·팬사인회도 같이 보여줘요 (방송 녹화·영화 개봉은 빼요)
  // 음반 발매일은 가는 행사가 아니라서 빼요 (발매 기념 팬싸인회·쇼케이스는 남겨요)
  const isLocalEvent = e => !e.ytOnly && !/발매(\s*\([^)]*\))?\s*$/.test(e.title || '') && (e.category === '공연' || e.category === '뮤지컬' || (e.category === '기타' && !/녹화|개봉/.test(e.title)));
  const hasVideo = e => !!(e.videoId || e.related.length || e.ytMain || (e.ytStage || []).length);
  let localQ = '';
  const LOCAL_REG = ['서울', '경기·인천', '강원', '충청', '전라', '경상', '제주', '해외', '그 외'];
  const localParams = () => { const qs = new URLSearchParams(location.hash.split('?')[1] || ''); return { r: multiOf(qs, 'r'), y: multiOf(qs, 'y'), m: multiOf(qs, 'm'), o: qs.get('o') || '' }; };
  function localF() {
    const all = data.events.filter(isLocalEvent), memL = Object.fromEntries(MEM_CHIPS);
    return {
      base: '#/local', keys: ['r', 'y', 'm'],
      F: { r: ['지역', x => x], y: ['연도', x => x], m: ['멤버', x => memL[x] || x] },
      opts: { r: LOCAL_REG.filter(n => all.some(e => regionOf(e) === n)), y: [...new Set(all.map(e => e.date.slice(0, 4)))].sort().reverse(), m: MEM_CHIPS.slice(1).map(x => x[0]) },
      cnt: (k, x) => all.filter(e => k === 'r' ? regionOf(e) === x : k === 'y' ? e.date.startsWith(x) : memOk(x)(e)).length,
    };
  }
  function localList() {
    const { r, y, m, o } = localParams(), hit = qMatch(localQ);
    const list = data.events.filter(e => isLocalEvent(e) && (!r.length || r.includes(regionOf(e))) && (!y.length || y.includes(e.date.slice(0, 4))) && (!m.length || m.some(x => memOk(x)(e))) && (!hit || hit.has(e.id)));
    return o === 'old' ? list : list.slice().reverse();
  }
  function localView() {
    const st = localParams(), bar = fBar(localF(), st);
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">공연·행사${help('축제·기획 공연·기업 행사처럼 단독 콘서트가 아닌 공연을 지역별로 모았어요. 지역은 장소와 행사 이름으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      ${filterBox('local-q', '행사 찾기 · 이름, 장소, 곡', localQ)}
      ${bar.row}
      <p class="sub" id="local-count">${localCount()}</p>
      </div>
      <div class="tl" id="local-body">${localBody()}</div>
      <div class="yf-wrap" id="yf-wrap" hidden></div>`;
  }
  const localCount = () => { const list = localList(); return `${list.length}개 · 영상 ${list.filter(hasVideo).length}개${fBar(localF(), localParams()).clear} ${addLink('', 'add-mini')}`; };
  function localBody() {
    const r = localParams().r.length === 1, list = localList();
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
    return list.length ? [...years.entries()].map(([y, es]) => `<h2 class="month">${y}년</h2>${groupRuns(es).map(row).join('')}`).join('') : '<p class="empty">조건에 맞는 행사가 없어요.</p>';
  }
  function bindLocal() {
    bindF(localF(), localParams());
    bindFilterBox('local-q', v => { localQ = v; }, () => { const b = document.getElementById('local-body'); if (b) b.innerHTML = localBody(); document.getElementById('local-count').innerHTML = localCount(); });
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
    if (e) return e.videoId || e.ytMain.id;
    // 유튜브 예능처럼 일정에 따로 붙인 영상(extra videos)만 있는 프로그램
    const r = p.events.map(x => (x.related || []).find(v => v.videoId)).find(Boolean);
    return r ? r.videoId : '';
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
  // 자주 쓰는 메뉴: 더보기 메뉴에서 ☆ 고른 것을 맨 위에 아이콘 칸으로 (이 폰에 저장)
  const PIN_KEY = 'sb-pins', pinsGet = () => { const v = boxRead(PIN_KEY); return Array.isArray(v) ? v : []; };
  let moreEdit = false, moreAll = [];
  const pinTiles = got => `<div class="pin-grid">${got.map(x => `<a class="pin-t" href="${x.href}"${x.ext ? ' target="_blank" rel="noopener"' : ''}>${menuIcon(x.icon)}<span>${x.label}</span></a>`).join('')}</div>`;
  const pinsGot = () => { if (!moreAll.length) moreView(); return pinsGet().map(h => moreAll.find(x => x.href === h)).filter(Boolean); };
  function moreView() {
    const pins = pinsGet(), all = [];
    // 메뉴는 네 묶음(내 기록·아카이브·숲별 소통·설정), 한 줄에 3칸 아이콘. NEW·확인 필요 수는 아이콘 위 작은 뱃지
    const item = (href, icon, label, badge, ext) => {
      all.push({ href, icon, label, ext });
      const on = pins.includes(href);
      return `<a class="mi mt" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''} data-pin="${esc(href)}">${menuIcon(icon)}${badge ? `<b class="mt-b">${badge}</b>` : ''}<span class="mt-l">${label}</span><span class="mi-pin${on ? ' on' : ''}" aria-label="${on ? '고정 풀기' : '위에 고정'}">${on ? '★' : '☆'}</span></a>`;
    };
    const grp = (t, html) => `<section class="mg"><h2 class="mg-h">${t}</h2><div class="mt-grid">${html}</div></section>`;
    const nNew = n => n ? (n > 99 ? '99+' : String(n)) : '';
    const fanN = (data.fan || []).filter(l => /^(ev|sl|slfix|dt)$/.test(l.k) && data.byId.get(l.id) && fanState(l, data.byId.get(l.id))[0] === 'wait').map(l => l.id + l.k + (l.to || '')).filter((x, i, a) => a.indexOf(x) === i).length;
    const menu = `
        ${grp('내 기록', `
          ${item('#/box', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', '보관함')}
          ${WAIT_ON() ? item('#/wait', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>', '기다리는 일정', goIds().length ? String(goIds().length) : '') : ''}
          ${item('#/card', '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h5M4 15.5h16" stroke-dasharray="2 2"/>', '숲별 카드')}
          ${item('#/map', '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', '숲별 발자국')}`)}
        ${grp('아카이브', `
          ${item('#/concerts', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', '콘서트')}
          ${item('#/local', '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', '공연·행사')}
          ${item('#/program', '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/>', '프로그램별')}
          ${item('#/timeline', '<path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="15" r="2"/><path d="M14 7h6M4 15h6"/>', '연표')}
          ${item('#/releases', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>', '음반 이야기')}
          ${item('#/members', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', '멤버 개인 활동')}
          ${item('#/search?cat=' + encodeURIComponent('생일'), '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '기념일')}`)}
        ${grp('숲별 소통', `
          ${item('#/story', '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>', '숲별 이야기', nNew(storyUnread().length) && 'NEW ' + nNew(storyUnread().length))}
          ${item('#/news', '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/>', '새 소식', nNew(newsUnread().length) && 'NEW ' + nNew(newsUnread().length))}
          ${item('#/opinion', '<path d="M4 5h16v11H9l-5 4z"/>', '의견')}
          ${item('#/add', '<path d="M12 5v14M5 12h14"/>', '일정 등록')}
          ${item('#/fan', '<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>', '팬 제보 현황', nNew(fanN))}`)}
        <section class="mg mg-set"><h2 class="mg-h">설정</h2><div class="more-set">
          <button type="button" class="bpill lang-keep" onclick="SB_LANG.open()">🌐 ${window.SB_LANG ? window.SB_LANG.label() : '한국어'}</button>
          <button type="button" class="bpill" onclick="SB_DECO.open()">🎨 ${SB_DECO.label()}</button>
          <a class="bpill" href="#/box?sync=1">☁️ 이어 쓰기 · 복구</a>
          <button type="button" class="bpill" data-act="homeedit">✎ 홈 화면 편집</button>
          ${item('#/install', '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6M9 11l3 3 3-3"/>', '앱처럼 쓰기').replace('mi mt', 'mi mt mt-s')}
          ${item('#/about', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', '이 사이트에 대해').replace('mi mt', 'mi mt mt-s')}
        </div></section>`;
    moreAll = all;
    const got = pins.map(h => all.find(x => x.href === h)).filter(Boolean);
    return `
      <h1 class="h1 page-title">더보기</h1>
      ${got.length ? `<section class="pin-box">
        <div class="pin-h"><b>자주 쓰는 메뉴</b><button type="button" class="link-btn" id="more-edit">${moreEdit ? '완료' : '편집'}</button></div>
        ${pinTiles(got)}
      </section>` : `<button type="button" class="pin-ask" id="more-edit">${moreEdit ? '✓ 다 골랐어요' : '☆ 자주 쓰는 메뉴 맨 위에 고정하기'}</button>`}
      ${moreEdit ? '<p class="src-note pin-tip">고정할 메뉴의 ☆를 눌러 주세요. 다시 누르면 풀려요.</p>' : ''}
      <nav aria-label="더보기 메뉴" class="${moreEdit ? 'more-edit' : ''}">
        ${menu}
      </nav>
      <a class="check-link" href="#/check">자동 연결 점검 (관리용) ›</a>
      <a class="check-link" href="#/admin">관리자 기기 ›</a>`;
  }

  function bindMore() {
    const he = document.querySelector('[data-act="homeedit"]');
    if (he) he.onclick = () => { homeEdit = true; location.hash = '#/'; setTimeout(() => { const x = document.querySelector('.home-edit'); if (x) x.scrollIntoView({ block: 'start' }); }, 400); };
    const eb = document.getElementById('more-edit');
    if (eb) eb.onclick = () => { moreEdit = !moreEdit; renderBase('more'); };
    const nav = document.querySelector('nav.more-edit');
    if (nav) nav.addEventListener('click', ev => {
      const a = ev.target.closest('.mi'); if (!a) return;
      ev.preventDefault();
      const h = a.dataset.pin, p = pinsGet(), k = p.indexOf(h);
      if (k >= 0) p.splice(k, 1); else p.push(h);
      boxWrite(PIN_KEY, p); renderBase('more');
    });
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
        { label: '일정', n: evs.length, html: evs.length ? `<div class="view-row">${albumBtn()}</div>${moreList(evs.map(resultCard), 10)}<a class="more mem-all" href="#/search?member=${q}">검색에서 걸러 보기 ›</a>` : '' },
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
        <h2 class="h3">무엇을 할 수 있나요?</h2>
        <ul class="about-list">
          <li><b>기록 찾기</b>: 2013년부터의 일정 · 곡 · 콘서트 셋리스트 · 음반 · 방송 프로그램 · 공식 X · 유튜브 영상을 한곳에서 찾아요. 초성 검색도 돼요.</li>
          <li><b>내 기록</b>: 직관 · 시청 · 좋아요 · 최애곡을 보관함에 모으고, 숲별 발자국 지도와 숲별 카드로 돌아봐요.</li>
          <li><b>기다리는 일정</b>: 갈 공연을 골라 D-day를 세고, 준비물을 챙기고, 셋리를 예측해 점수를 받아요.</li>
          <li><b>숲별 이야기</b>: 곡마다 좋아하는 가사 · 떼창 구간 · TMI를 다른 숲별들과 나눠요.</li>
        </ul>
      </section>
      <section class="sec">
        <h2 class="h3">일정은 어디서 왔나요?</h2>
        <p>공식 팬카페 캘린더에 올라온 일정을 자동으로 옮겨 와요. 카페 캘린더가 2021년 8월부터라, 그 이전은 나무위키 · 방송사 영상 · 팬들이 정리한 기록으로 채웠어요. 카페 회원만 볼 수 있는 일정(응모 · 방청 신청 같은 것)은 올리지 않아요.</p>
      </section>
      <section class="sec">
        <h2 class="h3">영상과 곡은 어디서 오나요?</h2>
        <p>아래 채널의 영상을 매일 자동으로 모아서, 제목을 보고 곡 · 일정 · 음반 · 콘서트 · 프로그램에 붙여요. 제목으로 붙이는 거라 가끔 틀릴 수 있어요.</p>
        <ul class="about-list">
          <li><b>포레스텔라 공식 유튜브</b>와 멤버 공식 채널 (강형호 · 조민규 · 고우림)</li>
          <li><b>방송사 공식 유튜브</b> (KBS · MBC · SBS · JTBC · Mnet 등)와 <b>소속사 · 제작사 채널</b></li>
          <li><b>공식 X</b> (@official_fore) 글</li>
          <li><b>콘서트 셋리스트</b>는 나무위키 · 뉴스 기사 · 팬들이 알려 준 기록을 모았어요</li>
        </ul>
      </section>
      <section class="sec">
        <h2 class="h3">일정의 '이날 부른 곡'</h2>
        <p>영상이나 팬 제보로 확인된 곡을 적어요. 영상이 없는 곡은 빠져 있을 수 있어요. 출처는 이렇게 표시해요.</p>
        <div class="badges">
          ${badge('bd-tv', '방송사 영상', '방송사 공식 채널 영상으로 확인')}
          ${badge('bd-official', '공식채널', '포레스텔라 공식 유튜브로 확인')}
          ${badge('bd-fan', '팬 영상', '팬 영상 제목 기준이라 틀릴 수 있어요. 링크는 걸지 않아요')}
          ${badge('bd-ref', '참고', '녹화일 · 연속 방송이라 곡을 정하지 않았어요')}
        </div>
      </section>
      <section class="sec">
        <h2 class="h3">숲별들이 함께 채워요</h2>
        <p>빠진 일정은 연표의 '＋ 일정 등록'으로, 셋리는 일정 화면의 '셋리 알려주기'로, 틀린 곳은 일정 · 곡 화면 아래 '✏️ 정보 고치기'로 알려 주세요. 올리면 바로 '확인 필요'로 보이고, 다른 숲별 2명이 '맞아요'를 누르면 확정돼요. 그 밖의 의견은 <a href="#/opinion">의견 탭</a>에 남겨 주세요.</p>
      </section>
      <section class="sec">
        <h2 class="h3">내 기록은 어디에 저장되나요?</h2>
        <p>로그인 없이 쓰는 사이트라, 보관함 · 숲별 카드 · 준비물은 <b>지금 쓰는 폰(브라우저)에만</b> 저장돼요. 다른 폰에서도 보려면 보관함의 '☁️ 이어 쓰기'에서 이름과 숫자 4자리를 정해 두세요. 하트 수 · 같이 기다리는 숲별 · 셋리 예측 평균은 이름 없이 임의 번호로만 모아서 세요.</p>
      </section>
      <section class="sec">
        <h2 class="h3">문의 · 삭제 요청</h2>
        <p>X(트위터) <a href="https://x.com/duun1122" target="_blank" rel="noopener">@duun1122</a>로 연락해 주세요.</p>
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

  // 홈 화면 편집: 칸 켜기·끄기, 순서 바꾸기 (이 폰에 저장). '자주 쓰는 메뉴'는 처음엔 꺼져 있어요
  const HOME_KEY = 'sb-home';
  // ---------- ⏳ 기다리는 일정: 🙋 갈 거예요 · D-day · 같이 기다리는 숲별 · 🎯 셋리 예측 · 🎒 준비물 ----------
  // 갈 거예요는 보관함 곡 칸(box.s)에 'go:일정ID', 셋리 예측은 'sp:일정ID:곡키|곡키'로 넣어서 이어 쓰기로 따라가요
  // 단색 선 아이콘 (테마 글씨색을 따라가요)
  const WI = {
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
    bag: '<path d="M6 9a6 6 0 0 1 12 0v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9M9 15h6"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.5 14.2A4.6 4.6 0 0 1 21 18.6"/>',
    go: '<circle cx="10" cy="8" r="3.2"/><path d="M4 20a6 6 0 0 1 10.5-4M18 13v6M15 16h6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    news: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    chat: '<path d="M4 5h16v11H9l-4 3.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  };
  const wi = (k, cls = '') => `<svg class="wi ${cls}" viewBox="0 0 24 24" aria-hidden="true">${WI[k]}</svg>`;
  // 같이 기다리는 숲별: 겹친 동그라미 + 한 문장
  const goTogether = n => n >= 2 ? `<p class="go-tg"><span class="go-av" aria-hidden="true">${'<i></i>'.repeat(Math.min(n, 3))}</span><span>숲별 <b>${n.toLocaleString()}명</b>이 같이 기다려요</span></p>` : '';
  // 가는 일정 / 보는 일정: TV·라디오 방송일(녹화분 포함)과 온라인 공연은 '볼 거예요'·시청, 녹화·방청·공개방송은 가는 일정
  const isWatch = e => !!e && (/녹화분/.test(e.title || '') || (/TV|라디오/.test(e.category || '') && !/녹화|방청|공개\s*방송|사녹/.test(e.title || '')) || /온라인|온택트|랜선|생중계/.test(e.title || ''));
  const goWord = id => isWatch(data.byId.get(id)) ? '볼 거예요' : '갈 거예요';
  const goLab = id => (goHas(id) ? wi('check') : wi('go')) + goWord(id);
  const WAIT_ON = () => true;  // 시험할 땐 () => isAdmin()으로 관리자 기기에만
  const goHas = id => box.s.includes('go:' + id);
  const goIds = () => box.s.filter(x => x.startsWith('go:')).map(x => x.slice(3));
  const goToggle = id => { boxSetS(goHas(id) ? box.s.filter(x => x !== 'go:' + id) : ['go:' + id, ...box.s]); heartSync(); };
  const goN = id => { const H = data.hearts || {}, mine = H.mine, n = Math.max(0, ((H.g || {})[id] || 0) - (mine && (mine.g || []).includes(id) ? 1 : 0) + (goHas(id) ? 1 : 0)); return GO_DEMO && isAdmin() ? Math.max(n, GO_DEMO) : n; };
  const GO_DEMO = 0;  // 시험용: 관리자 기기에서만 같이 기다리는 숲별을 최소 3명으로 보여 줘요 (0이면 끔)
  const goable = e => !e.ytOnly && !/생일|유튜브|네이버TV/.test(e.category) && !/발매(\s*\([^)]*\))?\s*$/.test(e.title || '');
  const ddOf = e => { const d = Math.round((new Date(e.date) - new Date(todayIso())) / 864e5); return d === 0 ? 'D-DAY' : d > 0 ? 'D-' + d : 'D+' + -d; };
  // 오늘 일정도 끝나는 시간이 지나면(또는 config.slOpen으로 일찍 끝났다고 연 일정) 끝난 걸로 봐요
  const evEnded = e => e.date < todayIso() || (e.date === todayIso() && ((window.CONFIG.slOpen || []).includes(e.id) || (slEndAt(e) != null && Date.now() > slEndAt(e))));
  const goBtn = e => WAIT_ON() && e.date >= todayIso() && goable(e) && !evEnded(e) ? `<button type="button" class="bpill go-btn" data-go="${esc(e.id)}" aria-pressed="${goHas(e.id)}">${goLab(e.id)}</button>` : '';
  const goWith = id => { const n = goN(id); return n >= 2 ? `${wi('people')}같이 기다리는 숲별 ${n.toLocaleString()}명` : ''; };
  const WK = '일월화수목금토', wkOf = d => WK[new Date(d + 'T00:00:00').getDay()];
  // 티켓 모양 카드: 왼쪽 떼는 부분에 D-day, 오른쪽에 일정
  const tkCard = (e, body, href) => `<div class="tk"><a class="tk-stub" href="${href || '#/e/' + encodeURIComponent(e.id)}"><b>${ddOf(e)}</b><small>${e.date.slice(5).replace('-', '.')} ${wkOf(e.date)}</small></a><div class="tk-body">${body}</div></div>`;
  const tkHead = e => `<a class="tk-title" href="#/e/${encodeURIComponent(e.id)}">${esc(e.title)}</a><small class="tk-meta">${[e.start && e.start !== '종일' ? e.start : '', e.place].filter(Boolean).map(esc).join(' · ') || fmtDate(e.date)}</small>`;
  const rdBar = id => { const n = rdItems(id).length, d = rdDone(id).length; return `<span class="tk-bar"><i style="width:${n ? Math.round(d / n * 100) : 0}%"></i></span>`; };
  const songOfName = n => { const al = data.songAlias || {}, k = window.DATA.songKey(n); return data.songs.get(k) || data.songs.get(al[k]) || null; };
  const spGet = id => { const x = box.s.find(x => x.startsWith('sp:' + id + ':')); return x ? x.slice(4 + id.length).split('|').filter(k => data.songs.has(k)) : []; };
  const spTimer = {};
  const spSet = (id, keys) => {
    boxSetS([...box.s.filter(x => !x.startsWith('sp:' + id + ':')), ...(keys.length ? ['sp:' + id + ':' + keys.join('|')] : [])]);
    clearTimeout(spTimer[id]);
    spTimer[id] = setTimeout(() => formPost(`종류: 셋리예측\n일정: ${id}\n누가: ${myUid()}\n곡: ${keys.join('|')}`).catch(() => { /* 다음에 다시 보내요 */ }), 4000);
  };
  const soloEv = e => /^\s*\[[^\]]*(두훈|형호|민규|우림)/.test(e.title || '');
  // 최근에 부른 곡 20개: 이 일정 전 무대들에서 최근 것부터 (멤버 개인 일정이면 개인 일정끼리)
  function recentSongs(e, n = 20) {
    const out = [], seen = new Set(), solo = soloEv(e);
    data.events.filter(x => x.date < e.date && x.songs.length && x.songSource !== '참고' && soloEv(x) === solo).sort((a, b) => b.date.localeCompare(a.date)).some(x => {
      x.songs.forEach(nm => { const so = songOfName(nm); if (so && !seen.has(so.key) && out.length < n) { seen.add(so.key); out.push(so); } });
      return out.length >= n;
    });
    return out;
  }
  // 이날 곡이 없으면 (공연이 끝난 뒤에만) 투어 셋리스트로 매겨요
  const spReal = e => { if (e.songSource === '참고') return []; const names = e.songs.length ? e.songs : e.date < todayIso() && e.setlist ? e.setlist.songs.map(x => x.t) : []; return [...new Set(names.map(n => (songOfName(n) || {}).key).filter(Boolean))]; };
  // 점수 = 맞힌 곡 ÷ (실제 곡 수와 고른 곡 수 중 큰 것) × 100 — 많이 고른다고 점수가 오르지 않아요
  const spScore = (real, keys) => { if (!real.length || !keys.length) return null; const hit = keys.filter(k => real.includes(k)).length; return { hit, score: Math.round(hit / Math.max(real.length, keys.length) * 100) }; };
  // 시작 시각(시간이 없으면 그날 밤 12시)에 예측이 잠기고, 시작 2시간 뒤(시간 없으면 다음 날)부터 '다녀오셨어요?'
  const startAt = e => { const m = String(e.start || e.time || '').match(/(\d{1,2}):(\d{2})/); return m ? Date.parse(`${e.date}T${m[1].padStart(2, '0')}:${m[2]}:00+09:00`) : null; };
  const dayEnd = e => Date.parse(`${e.date}T00:00:00+09:00`) + 864e5;
  const doneAt = e => startAt(e) != null ? startAt(e) + 2 * 36e5 : dayEnd(e);
  const over = e => Date.now() >= doneAt(e);
  // 리허설로 셋리가 미리 알려질 수 있어 시작 5시간 전에 마감 (시간 없으면 그날 0시)
  const spLockAt = e => startAt(e) != null ? startAt(e) - 5 * 36e5 : Date.parse(`${e.date}T00:00:00+09:00`);
  const spLocked = e => Date.now() >= spLockAt(e) || spReal(e).length > 0;
  const SP_ON = () => !rd().spOff;  // 셋리 예측 끄기 (기다리는 일정 화면에서)
  const myScore = e => { if (!SP_ON()) return null; return myScore0(e); };
  const myScore0 = e => { const k = spGet(e.id), real = spReal(e); return k.length && real.length ? { ...spScore(real, k), real: real.length } : null; };
  const scoreBox = sc => `<div class="sp-score wt-score"><div class="sp-ring" style="--p:${sc.score}"><b>${sc.score}</b><small>점</small></div><div class="sp-sum"><b>셋리 예측 ${sc.real}곡 중 ${sc.hit}곡 맞혔어요</b></div></div>`;
  // 셋리 예측 칸 · 최근 부른 곡은 접을 수 있어요 (sb-sp-fold 기억, 기본 펼침)
  const spFold = () => boxRead('sb-sp-fold') || {};
  // 셋리 예측한 사람들 (나 포함, 곡 고른 사람만)
  const spAll = id => { const me = myUid(), mine = spGet(id); return [...((data.preds || {})[id] || []).filter(p => p.by !== me).map(p => p.keys), mine].filter(k => k.length); };
  const spCnt = id => SP_ON() && data.byId.get(id) && spable(data.byId.get(id)) ? spAll(id).length : 0;
  // 곡마다 고른 사람 수 (마감 뒤에만 보여요, 따라 고르지 않게)
  const spPickN = id => { const m = new Map(); spAll(id).forEach(ks => new Set(ks).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return m; };
  function spBlock(e) {
    const h = spBlock0(e), f = spFold(), cn = spCnt(e.id);
    if (!h) return '';
    const i = h.indexOf('<h2 class="h3 wi-h">'), j = h.indexOf('</h2>', i) + 5, k = h.lastIndexOf('</section>');
    return `${h.slice(0, i)}<details class="sp-fold" data-f="box"${f.box === 0 ? '' : ' open'}><summary>${h.slice(i, j)}${cn ? `<span class="sp-cnt">${cn.toLocaleString()}명 참여</span>` : ''}<svg class="sp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary>${h.slice(j, k)}</details></section>`;
  }
  document.addEventListener('toggle', ev => { const d = ev.target; if (!d.matches || !d.matches('details.sp-fold[data-f]')) return; const f = spFold(); f[d.dataset.f] = d.open ? 1 : 0; boxWrite('sb-sp-fold', f); }, true);
  document.addEventListener('click', ev => { if (ev.target.closest('.sp-fold > summary .help, .sp-fold > summary .help-pop')) ev.preventDefault(); }, true);
  // 노래하는 일정에만 셋리 예측 (뮤지컬·사인회·전시·팝업 같은 건 빼요)
  const SP_NO = /사인회|팬싸|영통|전시|팝업|시사회|인터뷰|기자간담회|쇼케이스 ?취재|라이브 ?방송|브이앱|V ?LIVE|위버스|굿즈|생일 ?카페/i;
  const spable = e => goable(e) && !/뮤지컬/.test(e.category || '') && !SP_NO.test(e.title || '') && !/녹화분/.test(e.title || '');   // 녹화분 방송은 이미 부른 곡이라 예측 안 해요
  function spBlock0(e) {
    if (!WAIT_ON() || !SP_ON() || !spable(e)) return '';
    const mine = spGet(e.id), real = spReal(e), locked = spLocked(e);
    if (locked && !mine.length) return '';
    const head = `<h2 class="h3 wi-h">${wi('target')}셋리 예측${help('공연에서 부를 것 같은 곡을 골라요. 셋리가 올라오면 맞힌 곡으로 점수가 나와요. 점수는 맞힌 곡 ÷ (실제 곡 수와 고른 곡 수 중 큰 수)예요. 예측한 숲별이 10명 이상이면 다른 숲별 평균 점수도 볼 수 있어요.')}</h2>`;
    const nm = k => esc(data.songs.get(k).name);
    const pn = locked ? spPickN(e.id) : null, tot = locked ? spAll(e.id).length : 0;
    const pc = k => tot >= 2 && pn.get(k) ? `<small class="sp-pc">${pn.get(k)}명</small>` : '';
    // 마감 뒤: 숲별이 많이 고른 곡 5개
    const topPick = () => { if (tot < 2) return ''; const t = [...pn].filter(([k, c]) => c >= 2 && data.songs.get(k)).sort((a, b) => b[1] - a[1]).slice(0, 5); return t.length ? `<p class="sp-l">숲별이 많이 고른 곡</p><ol class="sp-list sp-top">${t.map(([k, c], i) => `<li><span class="sp-n">${i + 1}</span><span class="sp-nm">${nm(k)}</span><small class="sp-pc">${c}명</small></li>`).join('')}</ol>` : ''; };
    if (locked) {
      if (!real.length) return `<section class="d-block sp-box">${head}<p class="sub">셋리가 올라오면 점수가 나와요.</p><ol class="sp-list">${mine.map((k, i) => `<li><span class="sp-n">${i + 1}</span><span class="sp-nm">${nm(k)}</span>${pc(k)}</li>`).join('')}</ol>${topPick()}</section>`;
      const sc = spScore(real, mine), others = (data.preds || {})[e.id] || [], me = myUid();
      const all = [...others.filter(p => p.by !== me).map(p => p.keys), mine].filter(k => k.length);
      // 10명 넘으면 '숲별 점수 보기'를 눌러야 평균 점수가 보여요 (최고 점수·순위는 안 보여요)
      const scs = all.map(k => spScore(real, k).score), avg = all.length >= 10 ? Math.round(scs.reduce((a, x) => a + x, 0) / scs.length) : null;
      const best = avg != null && sc.score > 0 && sc.score >= Math.max(...scs);   // 1등한테만 살짝 알려요
      const picked = new Set(all.flat()), surprise = all.length >= 4 ? real.filter(k => !picked.has(k)) : [];
      return `<section class="d-block sp-box">${head}
        <div class="sp-score"><div class="sp-ring" style="--p:${sc.score}"><b>${sc.score}</b><small>점</small></div><div class="sp-sum"><b>${real.length}곡 중 ${sc.hit}곡 맞혔어요</b><small>고른 곡 ${mine.length}곡</small>${best ? `<small class="sp-best">${wi('star')}이번 예측 최고 점수예요</small>` : ''}</div></div>
        ${avg == null ? '<p class="sp-avg-nt">예측한 숲별이 10명 이상이면 평균 점수도 볼 수 있어요</p>' : ''}${avg != null ? `<details class="sp-avg"><summary>다른 숲별 점수 보기 <span class="sp-avg-ar" aria-hidden="true">▾</span></summary><p class="sp-avg-in">숲별 평균 <b>${avg}점</b><span aria-hidden="true">·</span><b>${all.length}명</b> 참여</p></details>` : ''}
        ${surprise.length ? `<p class="sp-sur">${wi('star')}아무도 예상 못 한 곡 · ${surprise.map(nm).join(', ')}</p>` : ''}
        <ol class="sp-list sp-real">${real.map((k, i) => `<li class="${mine.includes(k) ? 'hit' : ''}"><span class="sp-n">${i + 1}</span><span class="sp-nm">${nm(k)}</span>${pc(k)}${mine.includes(k) ? '<span class="sp-ok">' + wi('check') + '</span>' : ''}</li>`).join('')}</ol></section>`;
    }
    const rec = recentSongs(e).filter(so => !mine.includes(so.key));
    const la = new Date(spLockAt(e) + 9 * 36e5), lt = `${la.getUTCMonth() + 1}.${la.getUTCDate()} ${String(la.getUTCHours()).padStart(2, '0')}:${String(la.getUTCMinutes()).padStart(2, '0')}`;
    return `<section class="d-block sp-box" data-id="${esc(e.id)}">${head}
      <p class="sub sp-due">${lt} 마감 · 리허설로 셋리가 알려질 수 있어 시작 5시간 전에 닫혀요</p>
      <div class="sp-mine"><p class="sp-l">내 예측 셋리 <b>${mine.length}곡</b></p>
      ${mine.length ? `<ol class="sp-list">${mine.map((k, i) => `<li><span class="sp-n">${i + 1}</span><span class="sp-nm">${nm(k)}</span><button type="button" class="sp-chip sp-x" data-k="${esc(k)}" aria-label="빼기">×</button></li>`).join('')}</ol>` : '<p class="sp-empty">아래에서 곡을 눌러 넣어요</p>'}</div>
      ${rec.length ? `<details class="sp-fold sp-recf" data-f="rec"${spFold().rec === 0 ? '' : ' open'}><summary><span class="sp-l">최근에 부른 곡</span><svg class="sp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary><div class="sp-chips">${rec.map(so => `<button type="button" class="sp-chip sp-add" data-k="${esc(so.key)}">＋ ${esc(so.name)}</button>`).join('')}</div></details>` : ''}
      <label class="sp-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg><input type="search" class="sp-q" placeholder="다른 곡 찾아서 넣기" autocomplete="off"></label><div class="sp-chips sp-found"></div></section>`;
  }
  // 🎒 준비물: 기본 목록 + 내가 더한 것, 일정마다 체크
  const RD_KEY = 'sb-ready', RD_BASE = ['티켓 · 예매 내역', '신분증', '응원봉', '보조배터리', '슬로건', '포레 인형'];
  const rd = () => ({ add: [], off: [], done: {}, shown: {}, ev: {}, hid: {}, scored: {}, keep: true, ...(boxRead(RD_KEY) || {}) });
  // '다음 공연에도 쓰기'를 끄고 더하거나 뺀 건 그 일정에만 (r.ev[일정ID] = {add, off})
  const rdItems = id => { const r = rd(), e = (id && r.ev[id]) || { add: [], off: [] }; return [...new Set([...RD_BASE, ...r.add, ...e.add])].filter(x => (RD_BASE.includes(x) ? !r.off.includes(x) : r.add.includes(x) || e.add.includes(x)) && !e.off.includes(x)); };
  const rdDone = id => (rd().done[id] || []).filter(x => rdItems(id).includes(x));
  const rdBox = id => `<div class="rd-box" data-id="${esc(id)}">${rdItems(id).map(x => `<label class="rd-row"><input type="checkbox" data-rd="${esc(x)}"${rdDone(id).includes(x) ? ' checked' : ''}><span>${esc(x)}</span><button type="button" class="rd-x" data-rdx="${esc(x)}" aria-label="${esc(x)} 빼기">×</button></label>`).join('')}
    <div class="rd-new"><input type="text" class="op-in rd-in" maxlength="20" placeholder="＋ 내 준비물 더하기 (예: 담요)"><button type="button" class="bpill rd-add">더하기</button></div><label class="rd-keep"><input type="checkbox" class="rd-kp"${rd().keep ? ' checked' : ''}> 더하거나 뺀 것을 다음 공연에도 쓰기</label>${rdMemo(id)}</div>`;
  // 📝 메모: 이 일정에만(r.evMemo[일정ID]) 또는 '다음 공연에도 쓰기'(r.memo). 이 폰(+복구 코드)에만 저장돼요
  const rdMemoOf = id => { const r = rd(), m = r.evMemo || {}; return id in m ? { t: m[id], keep: false } : { t: r.memo || '', keep: !!r.memo }; };
  const rdMemo = id => {
    const r = rd();
    if (r.memoOff) return `<button type="button" class="link-btn rd-mon">📝 메모 칸 켜기</button>`;
    const m = rdMemoOf(id);
    return `<details class="rd-memo"${r.memoOpen === 0 ? '' : ' open'}><summary>📝 메모${m.t ? ' <small>●</small>' : ''}</summary>
      <textarea class="op-in rd-mt" maxlength="500" rows="3" placeholder="좌석, 굿즈 예약 번호, 만날 사람, 막차 시간…">${esc(m.t)}</textarea>
      <div class="rd-mf"><label class="rd-keep"><input type="checkbox" class="rd-mk"${m.keep ? ' checked' : ''}> 다음 공연에도 이 메모 쓰기</label><button type="button" class="link-btn rd-moff">메모 칸 끄기</button></div></details>`;
  };
  const rdMemoSave = (b, keep) => {
    const r = rd(), id = b.dataset.id, t = b.querySelector('.rd-mt').value.slice(0, 500), em = r.evMemo = r.evMemo || {};
    if (keep) { r.memo = t; delete em[id]; } else em[id] = t;
    boxWrite(RD_KEY, r);
  };
  function homeWait() {
    if (!WAIT_ON()) return '';
    const t = todayIso(), r = rd(), mine = goIds().map(id => data.byId.get(id)).filter(e => e && !r.hid[e.id]);
    // 공연이 끝난 일정은 다음 날 밤까지 남아요 (✕로 지우면 사라져요)
    const done = mine.filter(e => over(e) && Date.now() < dayEnd(e) + 864e5).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (done) {
      const sc = myScore(done), x = `<button type="button" class="wh-x" data-whx="${esc(done.id)}" aria-label="지우기">×</button>`;
      const body = sc ? `<a class="tk-btn" href="#/e/${encodeURIComponent(done.id)}?sp=1">셋리 예측 <b>${sc.score}점</b></a>` : SP_ON() && spGet(done.id).length ? '<span class="tk-n">셋리가 올라오면 점수가 나와요</span>' : '';
      return `<section class="wait-home open">${x}${tkCard(done, `${tkHead(done)}<div class="tk-foot">${(() => { const k = isWatch(done) ? 'v' : 'w', lab = k === 'v' ? '봤어요' : '다녀왔어요'; return boxHas(k, done.id) ? `<span class="tk-n">${k === 'v' ? '시청' : '직관'} 기록했어요</span>` : `<button type="button" class="tk-btn" data-box="${k}" data-id="${esc(done.id)}" data-label="${lab}" data-ic="">${lab}</button>`; })()}${body}</div>`)}</section>`;
    }
    // 갈 거예요가 아니어도(못 갔어요 포함) 셋리 예측을 한 공연은 끝나고 다음 날 밤까지 점수 카드로 남아요
    const spDone = SP_ON() ? [...new Set(box.s.filter(x => x.startsWith('sp:')).map(x => x.slice(3, x.indexOf(':', 3))))].map(id => data.byId.get(id)).filter(e => e && !r.hid[e.id] && (over(e) || evEnded(e)) && Date.now() < dayEnd(e) + 864e5 && spGet(e.id).length).sort((a, b) => b.date.localeCompare(a.date))[0] : null;
    if (spDone) {
      const sc = myScore(spDone), x = `<button type="button" class="wh-x" data-whx="${esc(spDone.id)}" aria-label="지우기">×</button>`;
      const body = sc ? `<a class="tk-btn" href="#/e/${encodeURIComponent(spDone.id)}?sp=1">셋리 예측 <b>${sc.score}점</b></a>` : '<span class="tk-n">셋리가 올라오면 점수가 나와요</span>';
      return `<section class="wait-home open">${x}${tkCard(spDone, `${tkHead(spDone)}<div class="tk-foot">${body}</div>`)}</section>`;
    }
    // 누구에게나: 방금 끝난 공연 하나를 다음 날 밤까지 한 줄로 (셋리 보기·알려주기)
    const rec = data.events.filter(e => e.date <= t && goable(e) && spable(e) && !r.hid[e.id] && (over(e) || evEnded(e)) && Date.now() < dayEnd(e) + 864e5).sort((a, b) => b.date.localeCompare(a.date) || (startAt(b) || 0) - (startAt(a) || 0))[0];
    const recRow = rec ? `<div class="wh-mini wh-recent"><a href="#/e/${encodeURIComponent(rec.id)}"><b>${rec.date === t ? '오늘' : '어제'}</b><span>${esc(rec.title)}</span><em>${rec.songs.length ? `셋리 ${rec.songs.length}곡` : '셋리 알려주기'} ›</em></a><button type="button" class="wh-ix" data-whx="${esc(rec.id)}" aria-label="닫기">×</button></div>` : '';
    const withRec = html => recRow ? html.replace(/^<section class="wait-home( open)?">/, m => m + recRow) : html;
    const next = mine.filter(e => e.date >= t && !over(e)).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!next && recRow) return `<section class="wait-home">${recRow}</section>`;
    // 처음 한 번: 기다리는 일정 안내 한 줄 (누르거나 ✕하면 다시 안 떠요)
    if (!next) return goIds().length || boxRead('sb-wait-intro') ? '' : `<section class="wait-home"><div class="wh-mini wh-intro"><a href="#/wait" data-wintro="1"><b>NEW</b><span>갈 공연을 골라 D-day를 세어 봐요</span></a><button type="button" class="wh-ix" data-wintro="1" aria-label="닫기">×</button></div></section>`;
    const n = goN(next.id);
    // 평소엔 D-day + 제목 한 줄, 누르면 펼쳐요 (sb-wait-open 기억)
    const openH = boxRead('sb-wait-open') === 1;
    if (!openH) return withRec(`<section class="wait-home"><button type="button" class="wh-mini wh-tg" aria-expanded="false"><b>${ddOf(next)}</b><span>${esc(next.title)}</span>${n >= 2 ? `<em class="wh-n" aria-label="숲별 ${n}명이 같이 기다려요"><span class="go-av" aria-hidden="true">${'<i></i>'.repeat(Math.min(n, 3))}</span>${n.toLocaleString()}</em>` : ''}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></section>`);
    return withRec(`<section class="wait-home open"><button type="button" class="wh-tg wh-fold" aria-expanded="true" aria-label="접기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>${tkCard(next, `${tkHead(next)}<div class="tk-foot">${SP_ON() && spable(next) ? `<a class="tk-btn" href="#/e/${encodeURIComponent(next.id)}?sp=1">셋리 <b>${spGet(next.id).length}</b></a>` : ''}<button type="button" class="tk-btn rd-open" data-id="${esc(next.id)}">준비물 <b>${rdDone(next.id).length}/${rdItems(next.id).length}</b></button><a class="tk-more" href="#/wait" aria-label="기다리는 일정 전체">›</a></div>${goTogether(n)}${spCnt(next.id) >= 2 ? `<p class="tk-spn">${wi('target')}셋리 예측 ${spCnt(next.id).toLocaleString()}명 참여</p>` : ''}`, '#/wait')}</section>`);
  }
  function waitView() {
    if (!WAIT_ON()) return '<p class="empty">준비 중인 화면이에요. <a href="#/more">더보기로 ›</a></p>';
    const t = todayIso(), mineAll = goIds().map(id => data.byId.get(id)).filter(Boolean);
    const up = mineAll.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    const until = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
        const others = data.events.filter(e => e.date >= t && e.date <= until && goable(e) && !goHas(e.id) && !evEnded(e)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 60);
    const past = [...new Set(box.s.filter(x => x.startsWith('sp:')).map(x => x.slice(3, x.indexOf(':', 3))))].map(id => data.byId.get(id)).filter(e => e && spLocked(e) && spReal(e).length).sort((a, b) => b.date.localeCompare(a.date));
    const card = e => { const n = goN(e.id); return `<article class="wait-card">${tkCard(e, `${tkHead(e)}<button type="button" class="go-mini" data-go="${esc(e.id)}" data-mini="1" aria-pressed="true" aria-label="갈 거예요 취소">${wi('check')}</button>
      ${SP_ON() && spable(e) ? `<a class="tk-line" href="#/e/${encodeURIComponent(e.id)}?sp=1">${wi('target')}셋리 예측 <b>${spGet(e.id).length}곡</b>${spCnt(e.id) >= 2 ? `<small class="tk-spn2">${spCnt(e.id).toLocaleString()}명 참여</small>` : ''}<span class="tk-more">›</span></a>` : ''}
      ${isWatch(e) ? '' : `<button type="button" class="tk-line rd-open" data-id="${esc(e.id)}">${wi('bag')}준비물 <b>${rdDone(e.id).length}/${rdItems(e.id).length}</b>${rdBar(e.id)}<span class="tk-more">›</span></button>`}
      ${goTogether(n)}`)}</article>`; };
    let lastM = '';
    const row = e => { const m = e.date.slice(0, 7), h = m !== lastM ? `<h3 class="wm-h">${+m.slice(0, 4)}년 ${+m.slice(5)}월</h3>` : ''; lastM = m; const n = goN(e.id);
      return `${h}<div class="wait-row"><span class="cal"><small>${+e.date.slice(5, 7)}월</small><b>${e.date.slice(8)}</b><small>${wkOf(e.date)}</small></span><a class="wr-t" href="#/e/${encodeURIComponent(e.id)}">${esc(e.title)}<small>${esc(e.place || '')}${n >= 2 ? ` · ${wi('people')}${n}` : ''}</small></a><button type="button" class="go-mini" data-go="${esc(e.id)}" data-mini="1" aria-pressed="false" aria-label="갈 거예요">${wi('go')}</button></div>`; };
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">기다리는 일정${help('갈 거예요를 누른 일정이 모여요. 같이 기다리는 숲별 수는 이름 없이 숫자만 세요.')}</h1>
      ${isAdmin() ? `<div class="wt-demo"><span>알림창 미리보기</span><button type="button" class="bpill" data-popdemo="today">공연 당일</button><button type="button" class="bpill" data-popdemo="past">다녀오셨어요?</button><button type="button" class="bpill" data-popdemo="score">점수 알림</button></div>` : ''}
      <label class="rd-keep sp-sw"><input type="checkbox" class="sp-onoff"${SP_ON() ? ' checked' : ''}> 셋리 예측 쓰기</label>
      ${up.length ? up.map(card).join('') : '<p class="empty">아직 기다리는 일정이 없어요. 아래 다가오는 일정에서 갈 거예요를 눌러 보세요.</p>'}
      <hr class="divider"><h2 class="h2">다가오는 일정</h2>
      ${others.length ? others.map(row).join('') : '<p class="empty">120일 안에 등록된 일정이 없어요.</p>'}
      ${SP_ON() && past.length ? `<hr class="divider"><h2 class="h2">지난 셋리 예측</h2>${past.map(e => { const s = spScore(spReal(e), spGet(e.id)); return `<a class="wait-row" href="#/e/${encodeURIComponent(e.id)}"><span class="cal"><small>${e.date.slice(0, 4)}</small><b>${e.date.slice(5).replace('-', '.')}</b></span><span class="wr-t">${esc(e.title)}</span><span class="sp-ring sm" style="--p:${s ? s.score : 0}"><b>${s ? s.score : '-'}</b></span></a>`; }).join('')}` : ''}`;
  }
  // 버튼들 (일정 상세 · 기다리는 일정 · 홈 · 팝업 어디서든)
  document.addEventListener('click', ev => {
    const g = ev.target.closest('[data-go]');
    if (g) {
      ev.preventDefault(); const id = g.dataset.go; goToggle(id);
      document.querySelectorAll(`[data-go="${CSS.escape(id)}"]`).forEach(b => { b.setAttribute('aria-pressed', goHas(id)); b.innerHTML = b.dataset.mini ? wi(goHas(id) ? 'check' : 'go') : goLab(id); });
      const gw = document.querySelector(`.go-with[data-id="${CSS.escape(id)}"]`); if (gw) gw.innerHTML = goWith(id);
      if (goHas(id)) toast('기다리는 일정에 넣었어요');
      if (currentRoute() === 'wait') { const y = scrollY; renderBase('wait'); scrollTo(0, y); }
      return;
    }
    const sc = ev.target.closest('.sp-chip');
    if (sc) {
      const boxEl = sc.closest('.sp-box'), id = boxEl.dataset.id, k = sc.dataset.k, mine = spGet(id);
      spSet(id, mine.includes(k) ? mine.filter(x => x !== k) : [...mine, k]);
      const e = data.byId.get(id); boxEl.outerHTML = spBlock(e);
      return;
    }
    const ro = ev.target.closest('.rd-open');
    if (ro) { const e = data.byId.get(ro.dataset.id); if (!e) return; const x = waitSheet(`<div class="yf-head"><b class="wi-h">${wi('bag')}준비물</b><span class="sub">${esc(e.title)}</span></div>${rdBox(e.id)}<button type="button" class="bpill yf-ok wt-yes">다 했어요</button>`); x.querySelector('.wt-yes').onclick = () => { x.hidden = true; if (currentRoute() === 'wait' || currentRoute() === 'home') { const y = scrollY; renderBase(currentRoute()); scrollTo(0, y); } }; return; }
    const mo = ev.target.closest('.rd-moff, .rd-mon');
    if (mo) { const r = rd(), b = mo.closest('.rd-box'); r.memoOff = mo.classList.contains('rd-moff'); if (!r.memoOff) r.memoOpen = 1; boxWrite(RD_KEY, r); rdRefresh(b); return; }
    const rx = ev.target.closest('[data-rdx]');
    if (rx) {
      ev.preventDefault(); const r = rd(), x = rx.dataset.rdx, b = rx.closest('.rd-box'), id = b.dataset.id, e = r.ev[id] = r.ev[id] || { add: [], off: [] };
      if (!r.keep) { e.add = e.add.filter(y => y !== x); if (!e.off.includes(x)) e.off.push(x); }
      else { if (RD_BASE.includes(x)) r.off = [...r.off, x]; else r.add = r.add.filter(y => y !== x); e.add = e.add.filter(y => y !== x); }
      boxWrite(RD_KEY, r); rdRefresh(rx.closest('.rd-box')); return;
    }
    const ra = ev.target.closest('.rd-add');
    if (ra) {
      const b = ra.closest('.rd-box'), v = b.querySelector('.rd-in').value.trim().slice(0, 20); if (!v) return;
      const r = rd(), id = b.dataset.id, e = r.ev[id] = r.ev[id] || { add: [], off: [] };
      e.off = e.off.filter(y => y !== v);
      if (!r.keep) { if (!RD_BASE.includes(v) && !r.add.includes(v) && !e.add.includes(v)) e.add.push(v); }
      else if (RD_BASE.includes(v)) r.off = r.off.filter(y => y !== v); else if (!r.add.includes(v)) r.add = [...r.add, v];
      boxWrite(RD_KEY, r); rdRefresh(b); return;
    }
  });
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-wintro]'); if (!b) return; boxWrite('sb-wait-intro', 1); if (b.tagName === 'BUTTON') { const w = b.closest('.wait-home'); if (w) w.remove(); } });
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-whx]'); if (!b) return; const r = rd(); r.hid[b.dataset.whx] = 1; boxWrite(RD_KEY, r); const w = b.closest('.wait-home'); if (w) w.outerHTML = homeWait(); });
  document.addEventListener('click', ev => { const b = ev.target.closest('.wh-tg'); if (!b) return; boxWrite('sb-wait-open', b.getAttribute('aria-expanded') === 'true' ? 0 : 1); const w = b.closest('.wait-home'); if (!w) return; const t = document.createElement('div'); t.innerHTML = homeWait(); const n = t.firstElementChild; if (!n) return; n.classList.add('anim'); w.replaceWith(n); });
  document.addEventListener('change', ev => {
    const so = ev.target.closest('.sp-onoff'); if (so) { const r = rd(); r.spOff = !so.checked; boxWrite(RD_KEY, r); const y = scrollY; renderBase('wait'); scrollTo(0, y); return; }
    const kp = ev.target.closest('.rd-kp'); if (kp) { const r = rd(); r.keep = kp.checked; boxWrite(RD_KEY, r); return; }
    const mk = ev.target.closest('.rd-mk'); if (mk) { rdMemoSave(mk.closest('.rd-box'), mk.checked); return; }
    const c = ev.target.closest('[data-rd]'); if (!c) return;
    const id = c.closest('.rd-box').dataset.id, r = rd(), x = c.dataset.rd, d = new Set(r.done[id] || []);
    c.checked ? d.add(x) : d.delete(x); r.done[id] = [...d]; boxWrite(RD_KEY, r);
  });
  document.addEventListener('input', ev => {
    const mt = ev.target.closest('.rd-mt'); if (mt) { const b = mt.closest('.rd-box'); rdMemoSave(b, b.querySelector('.rd-mk').checked); return; }
    const q = ev.target.closest('.sp-q'); if (!q) return;
    const boxEl = q.closest('.sp-box'), mine = spGet(boxEl.dataset.id), v = q.value.trim().toLowerCase().replace(/\s+/g, '');
    const out = boxEl.querySelector('.sp-found');
    if (!v) { out.innerHTML = ''; return; }
    const hits = [...data.songs.values()].filter(so => !mine.includes(so.key) && (so.name.toLowerCase().replace(/\s+/g, '').includes(v) || so.key.replace(/\s+/g, '').includes(v) || koOf(so.name).replace(/\s+/g, '').includes(v))).slice(0, 10);
    out.innerHTML = hits.length ? hits.map(so => `<button type="button" class="sp-chip sp-add" data-k="${esc(so.key)}">＋ ${esc(so.name)}</button>`).join('') : '<span class="sub">찾는 곡이 없어요</span>';
  });
  document.addEventListener('toggle', ev => { const d = ev.target; if (!d.classList || !d.classList.contains('rd-memo')) return; const r = rd(); r.memoOpen = d.open ? 1 : 0; boxWrite(RD_KEY, r); }, true);
  const rdRefresh = b => { if (!b) return; const id = b.dataset.id; b.outerHTML = rdBox(id); };
  // 팝업: 공연 당일 '다 챙기셨나요?', 지난 일정 '다녀오셨어요?'
  const waitSkip = new Set();
  addEventListener('hashchange', () => { const w = document.getElementById('wt-wrap'); if (w) w.hidden = true; });
  function waitSheet(html) {
    let w = document.getElementById('wt-wrap');
    if (!w) { w = document.createElement('div'); w.id = 'wt-wrap'; w.className = 'yf-wrap'; document.body.appendChild(w); }
    w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet wt-sheet" role="dialog">${html}</section>`; w.hidden = false;
    w.querySelector('.yf-back').onclick = () => { w.hidden = true; };
    return w;
  }
  const popTodayHtml = e => `<div class="wt-big">${wi('bag')}</div><b class="wt-t">오늘은 ${esc(e.title)} 가는 날!</b><p class="sub">다 챙기셨나요?${goWith(e.id) ? ' 같이 기다리는 숲별 ' + goN(e.id) + '명이 같이 가요.' : ''}</p>${rdBox(e.id)}<button type="button" class="bpill yf-ok wt-yes wt-ok">다 챙겼어요</button>`;
  const popPastHtml = (e, demoSc) => `<div class="wt-big">${wi('ticket')}</div><b class="wt-t">${esc(e.title)}</b><p class="sub">${fmtDate(e.date)} · 다녀오셨어요? 직관으로 옮길까요?</p>${demoSc ? scoreBox(demoSc) : myScore(e) ? scoreBox(myScore(e)) : ''}
      <button type="button" class="bpill yf-ok wt-yes">다녀왔어요 · 직관으로 옮기기</button><div class="wt-row"><button type="button" class="wt-no">못 갔어요</button><span aria-hidden="true">·</span><button type="button" class="wt-later">나중에</button></div>`;
  // 미리보기: 기록은 안 바꾸고 모양만 보여 줘요
  function waitPopDemo(kind) {
    const t = todayIso(), e = goIds().map(id => data.byId.get(id)).filter(x => x && x.date >= t)[0] || data.events.find(x => x.date >= t && goable(x));
    if (!e) return;
    const demo = { score: 78, hit: 14, real: 18 };  // 미리보기용 가짜 점수
    const html = kind === 'today' ? popTodayHtml(e) : kind === 'score' ? `<div class="wt-big">${wi('target')}</div><b class="wt-t">셋리가 올라왔어요!</b><p class="sub">${esc(e.title)}</p>${scoreBox(demo)}<button type="button" class="bpill yf-ok wt-yes">맞힌 곡 보기</button><div class="wt-row"><button type="button" class="wt-later">닫기</button></div>` : popPastHtml(e, demo);
    const x = waitSheet(html + '<p class="src-note">미리보기예요. 점수는 가짜이고, 눌러도 기록은 안 바뀌어요.</p>');
    x.querySelector('.wt-sheet').classList.add('wt-pop');
    x.querySelectorAll('.wt-yes, .wt-no, .wt-later').forEach(b => { b.onclick = () => { x.hidden = true; }; });
  }
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-popdemo]'); if (b) waitPopDemo(b.dataset.popdemo); });
  function waitPop() {
    if (!WAIT_ON() || !data || !data.byId || document.querySelector('#wt-wrap:not([hidden])')) return;
    const t = todayIso(), evs = goIds().map(id => data.byId.get(id)).filter(Boolean), r = rd();
    const open = html => { const x = waitSheet(html); x.querySelector('.wt-sheet').classList.add('wt-pop'); return x; };
    // 시작 시간 2시간 뒤부터 '다녀오셨어요?' (시간이 없으면 다음 날부터)
    const today = evs.find(e => !isWatch(e) && e.date === t && !over(e) && r.shown[e.id] !== t);
    if (today) {
      const x = open(popTodayHtml(today));
      r.shown[today.id] = t; boxWrite(RD_KEY, r);
      x.querySelector('.wt-ok').onclick = () => { x.hidden = true; };
      return;
    }
    const past = evs.filter(e => !isWatch(e) && over(e) && !boxHas('w', e.id) && !waitSkip.has(e.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!past) {
      // 셋리가 나중에 올라오면 점수 알림 (한 번만, 2주 안 일정)
      const ids = [...new Set(box.s.filter(x => x.startsWith('sp:')).map(x => x.slice(3, x.indexOf(':', 3))))];
      const sc = ids.map(id => data.byId.get(id)).filter(e => e && !r.scored[e.id] && Date.now() - dayEnd(e) < 14 * 864e5 && myScore(e))[0];
      if (!sc) return;
      r.scored[sc.id] = 1; boxWrite(RD_KEY, r);
      const y = open(`<div class="wt-big">${wi('target')}</div><b class="wt-t">셋리가 올라왔어요!</b><p class="sub">${esc(sc.title)}</p>${scoreBox(myScore(sc))}<a class="bpill yf-ok wt-yes" href="#/e/${encodeURIComponent(sc.id)}?sp=1">맞힌 곡 보기</a><div class="wt-row"><button type="button" class="wt-later">닫기</button></div>`);
      y.querySelector('.wt-later').onclick = () => { y.hidden = true; };
      return;
    }
    if (myScore(past)) { r.scored[past.id] = 1; boxWrite(RD_KEY, r); }
    const x = open(popPastHtml(past));
    const done = () => { x.hidden = true; const rt = currentRoute(); if (rt === 'wait' || rt === 'home') { const y = scrollY; renderBase(rt); scrollTo(0, y); } setTimeout(waitPop, 400); };
    x.querySelector('.wt-yes').onclick = () => { if (!boxHas('w', past.id)) boxToggle('w', past.id); toast('보관함 직관에 넣었어요'); done(); };
    x.querySelector('.wt-no').onclick = () => { boxSetS(box.s.filter(y => y !== 'go:' + past.id)); heartSync(); done(); };
    x.querySelector('.wt-later').onclick = () => { waitSkip.add(past.id); x.hidden = true; };
  }
  const HOME_SECS = [
    ['pins', '자주 쓰는 메뉴', () => { const g = pinsGot(); return `<section class="block pin-box home-pins"><div class="pin-h"><b>자주 쓰는 메뉴</b><a class="link-btn" href="#/more">${g.length ? '바꾸기' : '고르기'}</a></div>${g.length ? pinTiles(g) : '<p class="src-note">더보기에서 ☆를 눌러 메뉴를 골라 주세요.</p>'}</section>`; }, true],
    ['random', '오늘의 랜덤 무대', () => homeRandom()],
    ['members', '멤버별 활동', () => homeMembers()],
    ['story', '숲별 이야기', () => homeStory()],
    ['wish', '듣고 싶은 곡 TOP 5', () => homeWish()],
    ['videos', '유튜브 새 영상', () => homeVideos()],
    ['shortcuts', '음반 · 콘서트', () => homeShortcuts()],
    ['programs', '프로그램별 모아보기', () => homePrograms()],
    ['ago', '지난 오늘', () => homeAgo()],
    ['month', '이달의 기록', () => homeMonth()],
  ];
  // 소취곡: 3명 이상이 듣고 싶어 하는 곡만, 많은 순 5곡
  // 숲별 이야기 최신 3개 (홈에서 봐도 '본 것'으로 치지 않아요)
  function homeStory() {
    const all = storyAll().sort((a, b) => b.at - a.at), fresh = new Set(storyUnread().map(l => l.id));
    if (!all.length) return '';
    return `<section class="block home-story"><div class="block-head"><h2 class="h2">💬 숲별 이야기${fresh.size ? ` <b class="news-cnt">NEW ${fresh.size}</b>` : ''}</h2><a class="more" href="#/story">모두 보기 ›</a></div>
      <div class="stack home-story-list">${all.slice(0, 3).map(l => storyRow(l, fresh)).join('')}</div></section>`;
  }
  function homeWish() {
    const top = [...data.songs.values()].map(so => [so, wishN(so.key)]).filter(x => x[1] >= 3).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, 5);
    if (!top.length) return '';
    return `<section class="block home-wish"><div class="block-head"><h2 class="h2">🙏 듣고 싶은 곡 TOP 5${help('곡 화면이나 숲별 카드에서 🙏 소취곡으로 고른 팬 수예요. 3명 이상 모인 곡만 보여요.')}</h2><a class="more" href="#/songs?s=wish">더 보기</a></div>
      ${top.map(([so, n], i) => `<a class="box-ev wish-row" href="#/song/${encodeURIComponent(so.key)}"><span class="wish-rank">${i + 1}</span><b>${esc(so.name)}</b><small>🙏 ${n.toLocaleString()}</small></a>`).join('')}</section>`;
  }
  const HOME_HR = new Set(['videos', 'ago']);
  let homeEdit = false;
  function homeCfg() {
    const v = boxRead(HOME_KEY) || {}, keys = HOME_SECS.map(x => x[0]);
    const order = (Array.isArray(v.order) ? v.order.filter(k => keys.includes(k)) : []);
    keys.forEach(k => { if (!order.includes(k)) order.push(k); });
    const on = k => Array.isArray(v.on) && v.on.includes(k) ? true : Array.isArray(v.off) && v.off.includes(k) ? false : !HOME_SECS.find(x => x[0] === k)[3];
    return { order, on, raw: v };
  }
  function homeBody() {
    const c = homeCfg(), out = ['<hr class="divider">'];
    c.order.filter(c.on).forEach((k, i) => {
      const html = HOME_SECS.find(x => x[0] === k)[2]();
      if (!html) return;
      if (i && HOME_HR.has(k) && out[out.length - 1] !== '<hr class="divider">') out.push('<hr class="divider">');
      out.push(html);
    });
    out.push(homeEdit ? `<section class="block home-edit">
        <div class="block-head"><h2 class="h2">홈 화면 편집</h2><button type="button" class="link-btn" id="home-reset">처음대로</button></div>
        <p class="src-note">보고 싶은 칸만 켜고 ▲▼로 순서를 바꿔요. 이 폰에만 저장돼요.</p>
        ${c.order.map((k, i) => `<div class="he-row${c.on(k) ? '' : ' off'}"><label class="he-sw"><input type="checkbox" data-he="${k}"${c.on(k) ? ' checked' : ''}><span></span></label><span class="he-l">${HOME_SECS.find(x => x[0] === k)[1]}</span><button type="button" class="he-mv" data-up="${k}"${i ? '' : ' disabled'} aria-label="위로">▲</button><button type="button" class="he-mv" data-dn="${k}"${i < c.order.length - 1 ? '' : ' disabled'} aria-label="아래로">▼</button></div>`).join('')}
        <button type="button" class="chip on he-done" id="home-edit">다 했어요</button>
      </section>` : '<button type="button" class="link-btn home-edit-btn" id="home-edit">✎ 홈 화면 편집</button>');
    return out.join('\n');
  }
  function bindHomeEdit() {
    const save = f => { const c = homeCfg(), v = { order: c.order.slice(), on: (c.raw.on || []).slice(), off: (c.raw.off || []).slice() }; f(v); boxWrite(HOME_KEY, v); const y = scrollY; renderBase('home'); scrollTo(0, y); };
    const eb = document.getElementById('home-edit');
    if (eb) eb.onclick = () => { homeEdit = !homeEdit; const y = scrollY; renderBase('home'); if (homeEdit) document.querySelector('.home-edit').scrollIntoView({ block: 'start' }); else scrollTo(0, y); };
    const rs = document.getElementById('home-reset');
    if (rs) rs.onclick = () => { boxWrite(HOME_KEY, null); const y = scrollY; renderBase('home'); scrollTo(0, y); };
    document.querySelectorAll('[data-he]').forEach(b => b.onchange = () => save(v => { const k = b.dataset.he; v.on = v.on.filter(x => x !== k); v.off = v.off.filter(x => x !== k); (b.checked ? v.on : v.off).push(k); }));
    document.querySelectorAll('[data-up],[data-dn]').forEach(b => b.onclick = () => save(v => { const k = b.dataset.up || b.dataset.dn, i = v.order.indexOf(k), j = i + (b.dataset.up ? -1 : 1); [v.order[i], v.order[j]] = [v.order[j], v.order[i]]; }));
  }

  // ---------- 공연장 위치 모으기 (기간 한정 안내) ----------
  // 하트 수 안내: 새로고침 한 번 부탁 (✕로 닫으면 이 폰에선 다시 안 떠요, config.heartNotice로 끔)
  // 2026-11-01 0시(한국 시간)부터는 저절로 안 떠요
  const HEART_NT_END = Date.parse('2026-11-01T00:00:00+09:00');
  const heartNotice = () => window.CONFIG.heartNotice === false || boxRead('sb-heart-nt2') || Date.now() >= HEART_NT_END ? '' : `<section class="drive heart-nt"><b class="drive-t">💚 곡마다 숲별들과 같이 나눠요</b>
      <p class="drive-s"><a href="#/songs">곡 화면</a>에서 ♥ 하트·🙏 소취곡, 📣 떼창 구간·💬 좋아하는 가사·💡 TMI를 숲별들과 공유할 수 있어요. 하트·소취곡 수는 3명 이상 모이면 보여요. 전에 골라 둔 것도 세어지도록 <b>화면을 한 번만 새로고침</b>해 주세요.</p>
      <button type="button" class="heart-nt-x" aria-label="닫기">✕</button></section>`;
  document.addEventListener('click', ev => { const b = ev.target.closest('.heart-nt-x'); if (!b) return; boxWrite('sb-heart-nt2', 1); b.closest('.heart-nt').remove(); });
  // config.placeDrive가 켜져 있을 때만 홈·숲별 발자국 맨 위에 떠요. 보낸 건 의견(분류 '지도 링크', 기본 비밀글)으로 들어가요
  const DRIVE_X = 'sb-drive-x';
  const driveOn = () => !!(window.CONFIG.placeDrive && (window.CONFIG.form || {}).fields);
  function driveBox() {
    if (!driveOn()) return '';
    // 기본은 한 줄로 접혀 있고, 펼친 상태는 이 폰에 기억해요 (안내 자체는 사이트에서 끌 때까지 그대로)
    const open = !!boxRead(DRIVE_X);
    return `<section class="drive${open ? ' open' : ''}">
      <button type="button" class="drive-head" data-drive="toggle" aria-expanded="${open}"><b class="drive-t">📍 공연장 위치를 모아요</b><span class="drive-tog">${open ? '접기 ▴' : '펼치기 ▾'}</span></button>
      <div class="drive-in"${open ? '' : ' hidden'}>
      <p class="drive-s">숲별 발자국 지도에 공연장을 정확히 찍으려고 해요. <b>네이버 지도 저장 리스트 링크</b>나 <b>장소 링크</b>를 보내 주세요. 장소 링크면 어떤 공연인지(날짜·공연명)도 같이 적어 주세요.</p>
      <p class="drive-s">공연장 말고도 <b>일정과 관련된 곳이면 다 괜찮아요</b> (행사장, 방송 녹화장, 팬사인회 장소 등). 지도에 이미 찍혀 있는 곳도 실제와 다를 수 있어서 다 모아서 확인할게요.</p>
      <p class="drive-n">보낸 링크는 비밀글로 관리자만 봐요. 장소 등록이 얼추 끝날 때까지 모으고, 다 모이면 이 안내는 사라져요.</p>
      <div class="drive-btns"><button type="button" class="bpill" data-drive="form">여기서 장소 하나 간단하게 보내기</button><a class="chip" href="#/opinion?w=map">의견 쓰는 곳으로 ›</a></div>
      <div class="drive-body" hidden>
        <details class="drive-how"><summary>링크는 어떻게 복사해요?</summary><p>· 저장 리스트: 네이버 지도 앱 → 저장 → 리스트 고르기 → 공유 → 링크 복사 (리스트를 공개로 해 주세요)<br>· 장소 하나: 장소 화면 → 공유 → 링크 복사<br>· 저장할 때 메모에 공연 날짜나 이름을 적어 두면 더 정확하게 넣을 수 있어요.</p></details>
        <textarea class="op-in drive-link" rows="3" placeholder="네이버 지도 링크를 붙여 주세요 (여러 개도 돼요)"></textarea>
        <input type="search" class="drive-ev" maxlength="120" placeholder="어떤 공연·일정인지 검색 (예: 레거시 서울, 2024.07)" autocomplete="off">
        <div class="drive-list drive-hits" hidden></div>
        <button type="button" class="link-btn drive-miss">위치가 아직 없는 공연 보기 ▾</button>
        <div class="drive-list" hidden></div>
        <input type="text" class="drive-name" maxlength="20" placeholder="닉네임 (선택)">
        <label class="op-secret"><input type="checkbox" class="drive-sec" checked> 🔒 비밀글 <small>관리자만 볼 수 있어요</small></label>
        <button type="button" class="bpill add-send drive-send" disabled>보내기</button>
        <p class="src-note drive-msg"></p>
      </div></div></section>`;
  }
  const DRIVE_LINK = /https?:\/\/(?:naver\.me\/[\w-]+|(?:m\.)?map\.naver\.com\/[^\s"'<>]+|(?:m|pcmap)\.place\.naver\.com\/[^\s"'<>]+|pages\.map\.naver\.com\/[^\s"'<>]+)/g;
  document.addEventListener('click', async ev => {
    const d = ev.target.closest('[data-drive], .drive-miss, .drive-send, .drive-pick');
    if (!d) return;
    const box = d.closest('.drive, .map-add');
    if (d.dataset.drive === 'toggle') {
      const inn = box.querySelector('.drive-in'), op = inn.hidden;
      inn.hidden = !op; box.classList.toggle('open', op); d.setAttribute('aria-expanded', op); d.querySelector('.drive-tog').textContent = op ? '접기 ▴' : '펼치기 ▾';
      boxWrite(DRIVE_X, op ? 1 : null); return;
    }
    if (d.dataset.drive === 'form') { const b = box.querySelector('.drive-body'); b.hidden = !b.hidden; if (!b.hidden) box.querySelector('.drive-link').focus(); return; }
    if (d.classList.contains('drive-pick')) { const i = box.querySelector('.drive-ev'); i.value = d.dataset.v; i.dataset.id = d.dataset.id; box.querySelector('.drive-hits').hidden = true; i.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (d.classList.contains('drive-miss')) {
      const l = box.querySelector('.drive-list:not(.drive-hits)');
      if (!l.hidden) { l.hidden = true; d.textContent = '위치가 아직 없는 공연 보기 ▾'; return; }
      l.hidden = false; l.innerHTML = '<p class="src-note">불러오는 중…</p>';
      const [found] = await Promise.all([loadPlaces().catch(() => ({})), driveLoad().catch(() => {})]);
      const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      // 지난 국내 공연만 (해외·앞으로 할 공연은 빼요)
      const miss = data.events.filter(e => isLocalEvent(e) && e.date <= today && regionOf(e) !== '해외' && !locOf(e, found).exact).slice().reverse();
      d.textContent = `위치가 아직 없는 공연 ${miss.length}개 ▴`;
      l.innerHTML = miss.length ? `<p class="src-note">특히 이 공연들이 궁금해요! 누르면 '어떤 공연·일정인지' 칸에 들어가요.</p>` + miss.map(drivePick).join('') : '<p class="src-note">모든 공연에 위치가 있어요! 🎉</p>';
      return;
    }
    if (d.classList.contains('drive-send')) {
      const links = (box.querySelector('.drive-link').value.match(DRIVE_LINK) || []), evText = box.querySelector('.drive-ev').value.trim(), evId = box.querySelector('.drive-ev').dataset.id || '', name = box.querySelector('.drive-name').value.trim(), sec = box.querySelector('.drive-sec').checked;
      if (!links.length) return;
      const text = links.join('\n') + (evText ? `\n공연: ${evText}` : ''), f = window.CONFIG.form, by = myUid();
      d.disabled = true; d.textContent = '보내는 중…';
      try {
        let sent = text, myKey = null;
        if (sec) { myKey = await mySecKey(); sent = await opSeal(text, [myKey]); }
        await fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ [f.fields.content]: `종류: 의견\n분류: 지도 링크\n이름: ${name}\n누가: ${by}${myKey ? `\n열쇠: ${myKey.x}.${myKey.y}` : ''}${evId ? `\n대상일정: ${evId}` : ''}\n내용: ${sent}` }) });
        if (sec) { const m = secMine(); m[sent] = text; try { localStorage.setItem(OP_SEC, JSON.stringify(m)); } catch (err) { /* 괜찮아요 */ } }
        const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text: sent, ...(sec ? { sec: true, plain: text } : {}), name, cat: '지도 링크', by, evs: evId ? [evId] : [], at: Date.now() });
        try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); } catch (err) { /* 괜찮아요 */ }
        box.querySelector('.drive-link').value = ''; box.querySelector('.drive-ev').value = ''; box.querySelector('.drive-ev').dataset.id = '';
        d.textContent = '보냈어요 ✓'; setTimeout(() => { d.textContent = '보내기'; }, 2500);
        driveN = null; box.querySelector('.drive-msg').textContent = `고마워요! 링크 ${links.length}개를 보냈어요. 더 있으면 이어서 보내 주세요.`;
      } catch (err) { d.disabled = false; d.textContent = '다시 보내기'; box.querySelector('.drive-msg').textContent = '보내지 못했어요. 잠시 뒤 다시 눌러 주세요.'; }
    }
  });
  // 일정 검색: 공연·행사·방송 다 찾아요 (초성 OK). 고르면 '날짜 일정명'이 들어가요
  // 이미 링크가 들어온 일정 (의견 '지도 링크'에 공개로 붙은 일정 번호 + 내가 방금 보낸 것)
  function driveDone() {
    const n = new Map(), add = id => n.set(id, (n.get(id) || 0) + 1);
    const gone = opData ? opGone() : new Set();
    ((opData && opData.ops) || []).filter(o => !gone.has(o.id)).forEach(o => (o.evs || []).forEach(add));
    opMine().filter(o => !(opData && opData.ops.some(x => x.by === o.by && x.text === o.text))).forEach(o => (o.evs || []).forEach(add));
    return n;
  }
  let driveN = null, driveF = null;
  const drivePick = e => { const n = (driveN || new Map()).get(e.id); return `<button type="button" class="drive-pick${n ? ' sent' : ''}" data-id="${esc(e.id)}" data-v="${esc(e.date.replace(/-/g, '.') + ' ' + e.title)}"><span>${esc(e.date.replace(/-/g, '.'))}</span>${esc(e.title)}${driveF && locOf(e, driveF).exact ? '<em class="drive-has">📍 지도에 등록됨</em>' : ''}${n ? `<em class="drive-sent">✓ 이미 제출된 장소${n > 1 ? ` ${n}건` : ''}</em>` : ''}${e.place ? `<small>${esc(e.place)}</small>` : ''}</button>`; };
  // 검색·목록을 열 때 의견을 한 번 불러와서 '이미 제출됨'을 세요
  const driveLoad = () => Promise.all([opData ? null : loadOpinions(), loadPlaces().catch(() => ({}))]).then(([, f]) => { driveN = driveDone(); driveF = f; });
  document.addEventListener('input', ev => {
    const t = ev.target.closest && ev.target.closest('.drive-ev');
    if (!t) return;
    t.dataset.id = '';
    if (!driveN) driveLoad().then(() => { if (t.value.trim().length >= 2) t.dispatchEvent(new Event('input', { bubbles: true })); });
    const h = t.closest('.drive, .map-add').querySelector('.drive-hits'), q = t.value.trim();
    if (q.length < 2) { h.hidden = true; return; }
    const ms = q.split(/\s+/).map(matcher).filter(Boolean), txt = e => `${e.date} ${e.date.replace(/-/g, '.')} ${e.title} ${e.place || ''}`;
    // 띄어 쓴 낱말은 모두 들어 있어야 해요 (예: 레거시 서울)
    const hits = data.events.filter(e => !e.ytOnly && ms.every(m => m(txt(e)))).slice().reverse();
    h.hidden = false;
    h.innerHTML = hits.length ? hits.slice(0, 30).map(drivePick).join('') + (hits.length > 30 ? `<p class="src-note">${hits.length}개 중 30개만 보여요. 더 자세히 적어 주세요.</p>` : '') : '<p class="src-note">못 찾았어요. 찾는 일정이 없으면 그대로 적어서 보내 주세요.</p>';
  });
  document.addEventListener('input', ev => {
    const t = ev.target.closest && ev.target.closest('.drive-link');
    if (!t) return;
    const box = t.closest('.drive'), n = (t.value.match(DRIVE_LINK) || []).length;
    box.querySelector('.drive-send').disabled = !n;
    box.querySelector('.drive-msg').textContent = n ? `네이버 지도 링크 ${n}개가 들어 있어요. 보내기를 눌러 주세요.` : t.value.trim() ? '네이버 지도 링크가 아니에요. 공유 → 링크 복사로 받은 주소를 붙여 주세요.' : '';
  });

  const routes = {
    home: () => `
      ${header()}
      ${homeWait()}
      ${driveBox()}
      <div id="op-home"></div>
      <div id="news-home"></div>
      ${homeAsk()}
      ${homeSearchBox()}
      ${homeBody()}`,
    search: searchView,
    program: programView,
    local: localView,
    box: boxView,
    card: cardView, wait: waitView,
    songs: songsView,
    song: songView,
    timeline: timelineView,
    more: moreView,
    members: membersView,
    about: aboutView,
    install: installView,
    concerts: concertsView,
    tour: () => { const h = tourView(), id = decodeURIComponent(location.hash.split('/')[2] || '').split('?')[0]; return h.includes('class="empty"') && !h.includes('<h1') ? h : h.replace(/(<\/h1>[\s\S]*?<\/div>)/, '$1' + tmiJump('t:' + id)) + `<hr class="divider">${tmiBox('t:' + id, id)}`; },
    add: addView,
    opinion: opinionView,
    news: newsView,
    story: storyView,
    fan: fanView,
    map: mapView,
    placefind: placeFindView,
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


  // ---------- 공식 유튜브 모아보기 ----------
  // 필터 2.0: 한 줄 버튼(채널·종류·연도·멤버·정렬) → 아래에서 올라오는 선택 창, 고른 건 ✕ 알약으로. 마지막 필터는 이 폰에 기억(sb-yt-f)
  const YT_KINDS = ['M/V', '무대', '직캠', '라이브', '클립', '가사 영상', '비하인드', '티저', '쇼츠', '영상'];
  const YT_KEY = 'sb-yt-f';
  const YT_CH_NAMES = { 강형호: '[PITTA]강형호 & 이용우', 조민규: '조민규 ChoMinGyu', 고우림: 'Official KOWOORIM' };
  // 방송사 채널 중 제작사·소속사 채널(data.js PROD_CH + 음반사)은 따로 '소속사·제작사'로 나눠요
  const YT_PROD = /아트앤아티스트|블루스테이지|비트인터렉티브|스프링이엔티|유니버설뮤직/;
  const ytChOf = (v, c) => c === '포레스텔라' ? !v.ch && !v.bc : c === '방송사' ? v.bc && !YT_PROD.test(v.bc) : c === '소속사·제작사' ? v.bc && YT_PROD.test(v.bc) : v.ch === c;
  const ytChLabel = c => c === '포레스텔라' || c === '방송사' || c === '소속사·제작사' ? c : YT_CH_NAMES[c] || c + ' 채널';
  const YT_SORTS = { '': '최신순', old: '오래된순' };
  function ytState() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    return { ch: multiOf(qs, 'ch'), kind: multiOf(qs, 'kind'), y: multiOf(qs, 'y'), m: multiOf(qs, 'm'), o: qs.get('o') || '', q: qs.get('q') || '' };
  }
  const ytLink = st => { const s = new URLSearchParams(Object.entries(st).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]).filter(x => x[1])).toString(); return '#/yt' + (s ? '?' + s : ''); };
  function ytOpts(all) {
    return {
      ch: ['포레스텔라', ...MEMBER_LIST.filter(m => all.some(v => v.ch === m)), ...['방송사', '소속사·제작사'].filter(c => all.some(v => ytChOf(v, c)))],
      kind: YT_KINDS.filter(k => all.some(v => v.kind === k)),
      y: [...new Set(all.map(v => v.date.slice(0, 4)))].sort().reverse(),
      m: MEMBER_LIST,
    };
  }
  const YT_F = { ch: ['채널', ytChLabel], kind: ['종류', x => x], y: ['연도', x => x], m: ['멤버', m => m.slice(1)] };
  // 연도가 3해 넘게 이어지면 '2019~2022'처럼 줄여 보여줘요
  const yRange = ys => { const n = ys.map(Number).sort((a, b) => a - b); return n.length > 2 && n[n.length - 1] - n[0] === n.length - 1 ? `${n[0]}~${n[n.length - 1]}` : ''; };
  // 고른 건 아래 알약에 다 보이니 버튼엔 이름과 개수만
  const ytBtnLabel = (k, sel) => `${YT_F[k][0]}${sel.length ? `<b>${sel.length}</b>` : ' ▾'}`;
  function ytView() {
    // 다른 화면에서 그냥 들어오면 마지막에 고른 필터로 열어요 (유튜브 화면 안에서 지운 건 그대로)
    const saved = boxRead(YT_KEY);
    if (location.hash === '#/yt' && !document.getElementById('yt-form') && typeof saved === 'string' && saved.startsWith('#/yt?')) { location.replace(saved); return ''; }
    const st = ytState();
    const all = data.official || [];
    const qm = matcher(st.q);
    const chOk = v => !st.ch.length || st.ch.some(c => ytChOf(v, c));
    let list = all.filter(v => chOk(v) && (!st.kind.length || st.kind.includes(v.kind)) && (!st.y.length || st.y.includes(v.date.slice(0, 4))) && (!st.m.length || st.m.some(m => v.members.includes(m))) && (!qm || qm(vidText(v))));
    list = [...list].sort((a, b) => st.o === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    const btn = k => `<button type="button" class="yf-btn${st[k].length ? ' on' : ''}" data-yf="${k}">${ytBtnLabel(k, st[k])}</button>`;
    const pill = (lab, next) => `<a class="yf-pill" href="${ytLink(next)}">${esc(lab)} <span aria-hidden="true">✕</span></a>`;
    const pills = [];
    Object.keys(YT_F).forEach(k => {
      if (k === 'y' && yRange(st.y)) { pills.push(pill(yRange(st.y), { ...st, y: [] })); return; }
      st[k].forEach(x => pills.push(pill(YT_F[k][1](x), { ...st, [k]: st[k].filter(z => z !== x) })));
    });
    return `
      <h1 class="h1 page-title">공식 유튜브${help('포레스텔라 공식 유튜브 채널(@officialforestella)과 강형호·조민규·고우림 공식 채널, 그리고 KBS·MBC·JTBC·Mnet 같은 방송사 공식 채널에 올라온 포레스텔라 영상(조회수 1만 이상)을 매일 자동으로 모아요. 종류와 멤버는 제목으로 나눠서 가끔 틀릴 수 있어요.')}</h1>
      <div class="stick">
      <form class="searchbox song-search" role="search" id="yt-form">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="yt-q" value="${esc(st.q)}" placeholder="영상 찾기 · 초성 OK" aria-label="영상 찾기" autocomplete="off">
      </form>
      <div class="yf-row">${['ch', 'kind', 'y', 'm'].map(btn).join('')}<button type="button" class="yf-btn yf-sort" data-yf="o">${st.o === 'old' ? '오래된' : '최신'} ⇅</button></div>
      ${pills.length ? `<div class="yf-pills">${pills.join('')}</div>` : ''}
      <div class="view-row"><p class="sub">${list.length.toLocaleString()}개${pills.length ? ` · <a class="yf-clear" href="${ytLink({ q: st.q })}">모두 지우기</a>` : ''}</p>${albumBtn()}</div>
      </div>
      ${list.length ? moreList(list.map(ytCard), 20) : '<p class="empty">해당하는 영상이 없어요.</p>'}
      <div class="yf-wrap" id="yf-wrap" hidden></div>`;
  }
  // 아래에서 올라오는 선택 창: 여러 개 고르고 '적용'
  function ytSheet(k) {
    const st = ytState(), all = data.official || [];
    const w = document.getElementById('yf-wrap');
    if (!w) return;
    if (k === 'o') {
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="정렬"><div class="yf-head"><b>정렬</b></div>
        <div class="yf-opts">${Object.entries(YT_SORTS).map(([v, t]) => `<a class="chip${st.o === v ? ' on' : ''}" href="${ytLink({ ...st, o: v })}">${t}</a>`).join('')}</div></section>`;
    } else {
      const opts = ytOpts(all)[k], [name, lab] = YT_F[k];
      const cnt = x => all.filter(v => k === 'ch' ? ytChOf(v, x) : k === 'kind' ? v.kind === x : k === 'y' ? v.date.startsWith(x) : v.members.includes(x)).length;
      const asc = [...opts].sort();
      const range = k === 'y' ? `<div class="yf-range"><span>기간</span><select id="yf-from">${asc.map(y => `<option${y === asc[0] ? ' selected' : ''}>${y}</option>`).join('')}</select><span>~</span><select id="yf-to">${asc.map(y => `<option${y === asc[asc.length - 1] ? ' selected' : ''}>${y}</option>`).join('')}</select><button type="button" class="bpill yf-rng">기간으로 고르기</button></div>` : '';
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="${name} 고르기">
        <div class="yf-head"><b>${name}</b><span class="sub">여러 개 고를 수 있어요</span><button type="button" class="link-btn yf-none">전체</button></div>
        ${range}
        <div class="yf-opts">${opts.map(x => `<button type="button" class="chip${st[k].includes(x) ? ' on' : ''}" data-v="${esc(x)}">${esc(lab(x))} <small>${cnt(x).toLocaleString()}</small></button>`).join('')}</div>
        <button type="button" class="bpill yf-ok">적용</button></section>`;
      const sheet = w.querySelector('.yf-sheet');
      sheet.querySelectorAll('.yf-opts .chip').forEach(c => { c.onclick = () => c.classList.toggle('on'); });
      sheet.querySelector('.yf-none').onclick = () => sheet.querySelectorAll('.yf-opts .chip').forEach(c => c.classList.remove('on'));
      const rng = sheet.querySelector('.yf-rng');
      if (rng) rng.onclick = () => {
        let a = +sheet.querySelector('#yf-from').value, b = +sheet.querySelector('#yf-to').value;
        if (a > b) [a, b] = [b, a];
        sheet.querySelectorAll('.yf-opts .chip').forEach(c => c.classList.toggle('on', +c.dataset.v >= a && +c.dataset.v <= b));
      };
      sheet.querySelector('.yf-ok').onclick = () => {
        const sel = [...sheet.querySelectorAll('.yf-opts .chip.on')].map(c => c.dataset.v);
        location.hash = ytLink({ ...st, [k]: sel.length === opts.length && k !== 'y' ? [] : sel });
      };
    }
    w.hidden = false;
    w.querySelector('.yf-back').onclick = () => { w.hidden = true; };
  }
  function bindYt() {
    const f = document.getElementById('yt-form');
    if (!f) return;
    // 마지막으로 고른 필터 기억 (검색어는 빼고)
    const st = ytState();
    boxWrite(YT_KEY, ytLink({ ...st, q: '' }));
    f.onsubmit = ev => {
      ev.preventDefault();
      location.hash = ytLink({ ...ytState(), q: document.getElementById('yt-q').value.trim() });
    };
    document.querySelectorAll('.yf-btn').forEach(b => { b.onclick = () => ytSheet(b.dataset.yf); });
  }

  // ---------- 필터 2.0 공통 (공연·행사 · 공식 X) ----------
  // f = { base, keys, F: {키: [이름, 보이는 글자]}, opts: {키: [값…]}, cnt(키, 값) }. 고른 값은 주소에 'a,b'로 들어가요
  const fLink = (base, st) => { const s = new URLSearchParams(Object.entries(st).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]).filter(x => x[1])).toString(); return base + (s ? '?' + s : ''); };
  function fBar(f, st) {
    const btn = k => `<button type="button" class="yf-btn${st[k].length ? ' on' : ''}" data-ff="${k}">${f.F[k][0]}${st[k].length ? `<b>${st[k].length}</b>` : ' ▾'}</button>`;
    const pill = (lab, next) => `<a class="yf-pill" href="${fLink(f.base, next)}">${esc(lab)} <span aria-hidden="true">✕</span></a>`;
    const pills = [];
    f.keys.forEach(k => {
      if (k === 'y' && yRange(st.y)) { pills.push(pill(yRange(st.y), { ...st, y: [] })); return; }
      st[k].forEach(x => pills.push(pill(f.F[k][1](x), { ...st, [k]: st[k].filter(z => z !== x) })));
    });
    return {
      row: `<div class="yf-row">${f.keys.map(btn).join('')}${f.noSort ? '' : `<button type="button" class="yf-btn yf-sort" data-ff="o">${st.o === 'old' ? '오래된' : '최신'} ⇅</button>`}</div>${pills.length ? `<div class="yf-pills">${pills.join('')}</div>` : ''}`,
      clear: pills.length ? ` · <a class="yf-clear" href="${fLink(f.base, f.noSort ? { s: st.s } : { o: st.o })}">모두 지우기</a>` : '',
    };
  }
  function fSheet(f, st, k) {
    const w = document.getElementById('yf-wrap');
    if (!w) return;
    if (k === 'o') {
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="정렬"><div class="yf-head"><b>정렬</b></div>
        <div class="yf-opts">${Object.entries(YT_SORTS).map(([v, t]) => `<a class="chip${st.o === v ? ' on' : ''}" href="${fLink(f.base, { ...st, o: v })}">${t}</a>`).join('')}</div></section>`;
    } else {
      const opts = f.opts[k], [name, lab] = f.F[k], asc = [...opts].sort();
      const range = k === 'y' ? `<div class="yf-range"><span>기간</span><select id="yf-from">${asc.map(y => `<option${y === asc[0] ? ' selected' : ''}>${y}</option>`).join('')}</select><span>~</span><select id="yf-to">${asc.map(y => `<option${y === asc[asc.length - 1] ? ' selected' : ''}>${y}</option>`).join('')}</select><button type="button" class="bpill yf-rng">기간으로 고르기</button></div>` : '';
      w.innerHTML = `<div class="yf-back"></div><section class="yf-sheet" role="dialog" aria-label="${name} 고르기">
        <div class="yf-head"><b>${name}</b><span class="sub">여러 개 고를 수 있어요</span><button type="button" class="link-btn yf-none">전체</button></div>
        ${range}
        <div class="yf-opts">${opts.map(x => `<button type="button" class="chip${st[k].includes(x) ? ' on' : ''}" data-v="${esc(x)}">${esc(lab(x))} <small>${f.cnt(k, x).toLocaleString()}</small></button>`).join('')}</div>
        <button type="button" class="bpill yf-ok">적용</button></section>`;
      const sheet = w.querySelector('.yf-sheet');
      sheet.querySelectorAll('.yf-opts .chip').forEach(c => { c.onclick = () => c.classList.toggle('on'); });
      sheet.querySelector('.yf-none').onclick = () => sheet.querySelectorAll('.yf-opts .chip').forEach(c => c.classList.remove('on'));
      const rng = sheet.querySelector('.yf-rng');
      if (rng) rng.onclick = () => {
        let a = +sheet.querySelector('#yf-from').value, b = +sheet.querySelector('#yf-to').value;
        if (a > b) [a, b] = [b, a];
        sheet.querySelectorAll('.yf-opts .chip').forEach(c => c.classList.toggle('on', +c.dataset.v >= a && +c.dataset.v <= b));
      };
      sheet.querySelector('.yf-ok').onclick = () => {
        const sel = [...sheet.querySelectorAll('.yf-opts .chip.on')].map(c => c.dataset.v);
        location.hash = fLink(f.base, { ...st, [k]: sel.length === opts.length && k !== 'y' ? [] : sel });
      };
    }
    w.hidden = false;
    w.querySelector('.yf-back').onclick = () => { w.hidden = true; };
  }
  const bindF = (f, st) => document.querySelectorAll('[data-ff]').forEach(b => { b.onclick = () => fSheet(f, st, b.dataset.ff); });

  // ---------- 셋리 알려주기 ----------
  // 팬이 셋리 글을 통째로 붙여넣으면 곡으로 나눠 사이트 곡과 맞춰 보여주고, 제보 폼("종류: 셋리스트")으로 보내요.
  // 곡의 60% 이상이 사이트에 있는 곡이면 data.js가 그 일정에 바로 붙여요.
  const SL_SKIP = /^(앵콜|앵코르|앙코르|encore|vcr|ment|멘트|토크|인트로|intro|인터미션|intermission|셋리스트|셋리|setlist|오프닝|엔딩|\d+부|part\s*\d+)$/i;
  function slParse(t) {
    let lines = t.split(/\n+/);
    if (lines.filter(l => l.trim()).length < 3) lines = t.split(/\s*(?:\/|,|→|>|\|)\s*/);
    return lines.map(l => l
      .replace(/[\u{1F000}-\u{1FAFF}☀-➿️‍]/gu, '')
      .replace(/^[\s\-–—•·*#~|>]+/, '')
      // 앞 번호(1. 2) 03 …)만 지워요. '10월의 어느 멋진 날에'처럼 숫자로 시작하는 곡은 그대로
      .replace(/^\d{1,2}\s*[.)\]:]\s*|^\d{1,2}\s+(?=[^\s월])/, '').replace(/^[\s\-–—•·*#~|>]+/, '')
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
  try { window.SB_UID = localStorage.getItem('sb-uid') || ''; } catch (err) { /* 괜찮아요 */ }
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
    if (f.ok) return okMini('확정', msg);
    // 사람마다 다르게 올린 판: 지금 보이는 판 말고 다른 판도 펼쳐 보고 '맞아요'를 눌러요
    const others = (f.alts || []).filter(a => a.ver !== f.ver);
    const altBtn = a => (window.CONFIG.form || {}).fields && a.by !== myUid() && !slOked((f.src || e.id) + ':' + a.ver) ? `<button type="button" class="bpill sl-ok" data-id="${esc(f.src || e.id)}" data-ver="${esc(a.ver)}">이 판이 맞아요</button>` : '';
    const alt = others.length ? `<details class="sl-alts"><summary>다르게 올라온 판 ${others.length}개 더 있어요</summary>${others.map((a, i) => `<div class="sl-alt"><p class="sl-alt-h">판 ${i + 2} · ${a.songs.length}곡 · 확인 ${a.n}/2${a.by === myUid() ? ' · 내가 올린 판' : ''}</p><ol>${a.songs.map(t => `<li>${esc(t)}</li>`).join('')}</ol>${altBtn(a)}</div>`).join('')}</details>` : '';
    return `<div class="sl-state${f.ok ? ' ok' : ''}"><span class="src-badge">${f.ok ? '확정' : `확인 필요 · ${f.n}/2`}</span><span class="sl-state-msg">${msg}${others.length ? ' 지금 보이는 건 판 1이에요.' : ''}</span>${btn}${alt}</div>`;
  }
  // 하루 두 번 공연은 제목 끝 (낮공)·(밤공)으로 나눠 둬요
  const showTag = e => { const m = e.title.match(/\((낮공|밤공)\)$/); return m ? ' ' + m[1] : ''; };
  // 공연 날 셋리: 시작하면 적을 수 있고(이 폰에 임시저장), 끝나고 2시간 뒤부터 등록돼요. config.slOpen에 넣은 일정은 바로 등록돼요(일찍 끝난 날)
  const SL_DRAFT = 'sb-sl-draft';
  const slEndAt = e => { const st = startAt(e); if (st == null) return null; const m = String(e.end || '').match(/(\d{1,2}):(\d{2})/); let en = m ? Date.parse(`${e.date}T${m[1].padStart(2, '0')}:${m[2]}:00+09:00`) : st + 3 * 36e5; if (en < st) en += 864e5; return en; };
  const slGate = e => { if ((window.CONFIG.slOpen || []).includes(e.id)) return 'open'; const st = startAt(e), en = slEndAt(e), now = Date.now(); if (st == null || now >= en + 2 * 36e5) return 'open'; return now < st ? 'before' : 'draft'; };
  const slOpenAt = e => { const d = new Date(slEndAt(e) + 2 * 36e5 + 9 * 36e5); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const slDrafts = () => { try { return JSON.parse(localStorage.getItem(SL_DRAFT) || '{}'); } catch (err) { return {}; } };
  const slDraftSet = (id, t) => { try { const d = slDrafts(); if (t) d[id] = t; else delete d[id]; localStorage.setItem(SL_DRAFT, JSON.stringify(d)); } catch (err) { /* 저장 못 해도 괜찮아요 */ } };
  function slForm(evs) {
    if (!evs.length || !(window.CONFIG.form || {}).fields) return '';
    if (evs.length === 1 && slGate(evs[0]) === 'before') return '';
    // 곡이 이미 있으면 그 목록을 채워 두고 '셋리 고치기'로 보여줘요
    const one = evs.find(e => e.songs.length && e.songSource !== '참고') || evs[0];
    const fs = one && (one.fanSet || (one.songs.length && one.songSource !== '참고' ? { songs: one.songs } : null));
    const gate = slGate(one);
    const opt = e => `${e.date.slice(5).replace('-', '.')}${showTag(e)}${e.place ? ' ' + e.place : ''}`;
    return `
      <details class="sl-add">
        <summary>${fs ? '✏️ 셋리 고치기' : '📝 셋리 알려주기'}</summary>
        <div class="sl-box">
          ${evs.length > 1 ? `<select class="sl-ev">${evs.map(e => `<option value="${esc(e.id)}"${e === one ? ' selected' : ''}>${esc(opt(e))}</option>`).join('')}</select>` : `<input type="hidden" class="sl-ev" value="${esc(evs[0].id)}">`}
          <textarea class="sl-in" rows="8" placeholder="한 줄에 한 곡씩 붙여넣어 주세요. 보랩·넬판 같은 줄임말도 알아들어요.&#10;&#10;예)&#10;Save our lives&#10;스카페&#10;넬판&#10;Inner Universe&#10;아리랑">${esc(slDrafts()[one.id] || (fs ? fs.songs.join('\n') : ''))}</textarea>
          <ol class="sl-pre"></ol>
          <p class="src-note sl-msg">✓는 사이트에 있는 곡, ?는 처음 보는 곡이에요. 보내면 '확인 필요'로 붙고, 다른 두 분이 맞다고 하면 확정돼요.${fs && fs.ver ? ' 고쳐서 보내면 확인은 처음부터 다시 받아요.' : ''} 사이트에 반영되기까지 5~10분쯤 걸려요.</p>
          ${gate === 'draft' ? `<p class="sl-gate">적은 건 이 폰에만 임시저장돼요. 공연 끝나고 2시간 뒤(${slOpenAt(one)})부터 등록할 수 있어요.</p>` : ''}
          <button type="button" class="bpill sl-send" disabled${gate === 'draft' ? ' data-wait="1"' : ''}>${gate === 'draft' ? `${slOpenAt(one)}부터 등록돼요` : fs ? '보내기' : '셋리 등록'}</button>
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
    const sb = box.querySelector('.sl-send');
    sb.disabled = !list.length || !!sb.dataset.wait;
    const ev2 = box.querySelector('.sl-ev');
    if (ev2 && ev.isTrusted) slDraftSet(ev2.value, ev.target.value.trim());
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.sl-send');
    if (!b) return;
    const box = b.closest('.sl-box');
    const id = box.querySelector('.sl-ev').value, e = data.events.find(x => x.id === id);
    const songs = [...new Set(slParse(box.querySelector('.sl-in').value).map(n => slMatch(n) || n))];
    if (!e || !songs.length || slGate(e) === 'draft' || slGate(e) === 'before') return;
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 셋리스트\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n곡: ${songs.join(' / ')}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => { slDraftSet(id, ''); b.textContent = '보냈어요 ✓'; box.querySelector('.sl-msg').textContent = `${songs.length}곡을 보냈어요. 고마워요! 5~10분쯤 뒤 새로 열면 사이트에 붙어 있어요.`; })
      .catch(() => { b.disabled = false; b.textContent = '다시 보내기'; box.querySelector('.sl-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; });
  });

  document.addEventListener('click', ev => {
    const b = ev.target.closest('.sl-ok');
    if (!b) return;
    const tt = b.dataset.id.startsWith('T-') && data.tours.find(x => 'T-' + x.id === b.dataset.id);
    const e = tt ? { id: b.dataset.id, date: '', title: tt.name, fanSet: tt.fanSet } : data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 셋리확인${e.date ? '\n날짜: ' + e.date : ''}\n일정: [ID ${e.id}] ${e.title}\n버전: ${b.dataset.ver}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => {
        try { const a = JSON.parse(localStorage.getItem(SL_OK) || '[]'); a.push(e.id + ':' + b.dataset.ver); localStorage.setItem(SL_OK, JSON.stringify(a.slice(-300))); } catch (err) { /* 저장 못 해도 괜찮아요 */ }
        document.querySelectorAll(`.sl-ok[data-id="${CSS.escape(e.id)}"]`).forEach(x => { x.closest('.sl-state').outerHTML = slState(e); });
      })
      .catch(() => { b.disabled = false; b.textContent = '다시 누르기'; });
  });

  // ---------- 투어 셋리 고치기 ----------
  // 1부·2부·앵콜은 [1부]처럼 한 줄로, 곡 옆 메모는 괄호로 적어요. 보낼 땐 '#1부', '곡 {메모}'로 바꿔 보내요(일정: [ID T-투어id])
  const TSL_SEC = /^\[?\s*(\d부|앵콜|앙코르|encore)\s*\]?$/i;
  function tslText(t) {
    let last = '';
    return t.songs.map(x => {
      const m = (x.note || '').match(/^(1부|2부|3부|4부|앵콜)(\s*·\s*)?/), sec = m ? m[1] : '', memo = (m ? x.note.slice(m[0].length) : x.note || '').trim();
      const head = sec && sec !== last ? `[${sec}]\n` : '';
      if (sec) last = sec;
      return head + x.t + (memo ? ` (${memo})` : '');
    }).join('\n');
  }
  function tslParse(text) {
    return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
      const h = l.match(TSL_SEC);
      if (h) return { sec: /^\d/.test(h[1]) ? h[1] : '앵콜' };
      l = l.replace(/^\d{1,2}\s*[.)\]:]\s*/, '').replace(/^[\s\-–—•·*]+/, '');
      const m = l.match(/^(.*?)\s*[(（]([^)）]*)[)）]\s*$/), name = (m ? m[1] : l).trim(), memo = m ? m[2].trim() : '';
      const hit = slMatch(name);
      return name ? { name: hit || name, ok: !!hit, memo } : null;
    }).filter(Boolean);
  }
  function tourSlForm(t) {
    if (!(window.CONFIG.form || {}).fields) return '';
    return `
      <details class="sl-add">
        <summary>✏️ 셋리 고치기</summary>
        <div class="sl-box tsl-box" data-tour="${esc(t.id)}">
          <textarea class="tsl-in" rows="12" placeholder="한 줄에 한 곡씩 적어 주세요.">${esc(tslText(t))}</textarea>
          <ol class="sl-pre"></ol>
          <p class="src-note sl-msg">[1부] [2부] [앵콜]처럼 한 줄로 나누고, 곡 옆 메모는 괄호로 적어 주세요. 예) 사랑의 찬가 (조민규 솔로)<br>보내면 '확인 필요'로 바뀌고, 다른 두 분이 맞다고 하면 확정돼요. 사이트에 반영되기까지 5~10분쯤 걸려요.</p>
          <button type="button" class="bpill tsl-send" disabled>보내기</button>
        </div>
      </details>`;
  }
  document.addEventListener('toggle', ev => { const t = ev.target.matches && ev.target.matches('.sl-add') && ev.target.open && ev.target.querySelector('.tsl-in'); if (t) t.dispatchEvent(new Event('input', { bubbles: true })); }, true);
  document.addEventListener('input', ev => {
    if (!ev.target.matches('.tsl-in')) return;
    const box = ev.target.closest('.sl-box'), list = tslParse(ev.target.value);
    let n = 0;
    box.querySelector('.sl-pre').innerHTML = list.map(x => x.sec ? `<li class="sl-sec">${esc(x.sec)}</li>` : `<li value="${++n}" class="${x.ok ? 'ok' : 'new'}">${x.ok ? '✓' : '?'} ${esc(x.name)}${x.memo ? ` <small>${esc(x.memo)}</small>` : ''}</li>`).join('');
    box.querySelector('.tsl-send').disabled = !list.some(x => x.name);
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.tsl-send');
    if (!b) return;
    const box = b.closest('.sl-box'), t = data.tours.find(x => x.id === box.dataset.tour);
    const list = tslParse(box.querySelector('.tsl-in').value);
    if (!t || !list.some(x => x.name)) return;
    const clean = x => x.replace(/\s+\/\s+/g, '/').replace(/[{}]/g, '');
    const items = list.map(x => x.sec ? '#' + x.sec : clean(x.name) + (x.memo ? ` {${clean(x.memo)}}` : ''));
    const f = window.CONFIG.form;
    const body = new URLSearchParams({ [f.fields.content]: `종류: 셋리스트\n일정: [ID T-${t.id}] ${t.name}\n곡: ${items.join(' / ')}\n누가: ${myUid()}` });
    b.disabled = true; b.textContent = '보내는 중…';
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body })
      .then(() => { slDraftSet(id, ''); b.textContent = '보냈어요 ✓'; box.querySelector('.sl-msg').textContent = `${list.filter(x => x.name).length}곡을 보냈어요. 고마워요! 5~10분쯤 뒤 새로 열면 바뀌어 있어요.`; })
      .catch(() => { b.disabled = false; b.textContent = '다시 보내기'; box.querySelector('.sl-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; });
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
      songs: [...new Set(slParse(c.querySelector('.a-songs').value).map(n => slMatch(n) || n))], merge: c.dataset.merge || '', pick: c.dataset.pick || '' };
  };
  // 같은 날(앞뒤 하루) 이미 있는 일정을 보여주고, 같은 일정이면 거기에 붙일지 새로 등록할지 고르게 해요
  const addNear = date => data.events.filter(e => !e.ytOnly && Math.abs(new Date(e.date) - new Date(date)) <= 864e5).slice(0, 8);
  function addCheck(c) {
    const v = addRead(c), box = c.querySelector('.a-dup');
    // 뮤지컬 공연 기간 안이면: 새로 만들지 말고 그 뮤지컬 화면의 '캐스팅 회차'에서 추가하라고 알려요
    const sp0 = x => (x || '').replace(/\[[^\]]*\]|[\s\-–·:：,.()<>'"!~]+/g, '').toLowerCase();
    const run = v.date && data.events.find(e => e.category === '뮤지컬' && e.endDate && e.date <= v.date && v.date <= e.endDate && (v.cat === '뮤지컬' || (w => w.length >= 2 && sp0(v.title).includes(w))(sp0(e.title.replace(/^.*?(뮤지컬|연극)\s*/, '')))));
    const runHtml = run ? `<span class="a-run">🎭 <b>이미 있는 뮤지컬이에요</b> · ${esc(run.title)} (${run.date.slice(2).replace(/-/g, '.')}~${run.endDate.slice(2).replace(/-/g, '.')})<br>공연 하루하루는 새 일정 대신 그 뮤지컬 화면의 <b>'캐스팅 회차'</b>에서 추가하거나 맞는지 확인해 주세요.<a class="a-run-go" href="#/e/${esc(run.id)}">캐스팅 회차 보러 가기 ›</a></span>` : '';
    const near = v.date ? addNear(v.date) : [];
    c.dataset.run = run ? run.id : '';
    if (run) { if (box.dataset.h !== runHtml) { box.innerHTML = runHtml; box.dataset.h = runHtml; } delete c.dataset.merge; delete c.dataset.pick; c.classList.remove('merging'); return; }
    if (!near.length) { box.innerHTML = ''; box.dataset.h = ''; delete c.dataset.merge; delete c.dataset.pick; c.classList.remove('merging'); return; }
    if (c.dataset.merge && !near.some(e => e.id === c.dataset.merge)) delete c.dataset.merge;
    const m = c.dataset.merge || '', pick = c.dataset.pick || '';
    const md = d => d.slice(5).replace('-', '.');
    const html = `<b>이날 이미 있는 일정이에요.</b> 등록하려는 게 이 중에 있나요?
      <span class="a-near">${near.map(e => `<button type="button" class="a-pick${m === e.id ? ' on' : ''}" data-id="${esc(e.id)}"><span>${md(e.date)}</span>${esc(e.title)}</button>`).join('')}</span>
      <span class="a-choose"><button type="button" class="chip a-mode${pick === 'merge' ? ' on' : ''}" data-mode="merge"${m ? '' : ' disabled'}>이 일정에 붙이기</button><button type="button" class="chip a-mode${pick === 'new' ? ' on' : ''}" data-mode="new">다른 일정이라 새로 등록</button></span>
      ${pick === 'merge' && m ? '<span class="a-note">새로 만들지 않고, 적은 장소·시간·영상·셋리만 이 일정에 붙여요. 원래 있던 칸은 안 바뀌어요.</span>' : pick === 'new' ? '<span class="a-note">새 일정으로 등록해요.</span>' : '<span class="a-note">같은 일정이면 위에서 고르고 \'이 일정에 붙이기\'를, 아니면 \'새로 등록\'을 눌러 주세요.</span>'}`;
    // 같은 내용이면 다시 그리지 않아요 (칸에서 나갈 때 다시 그리면 버튼 누른 게 씹혀요)
    if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
    c.classList.toggle('merging', pick === 'merge' && !!m);
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
      const pk = ev.target.closest('.a-pick'), md = ev.target.closest('.a-mode');
      if (pk || md) {
        const c = ev.target.closest('.add-card');
        if (pk) { c.dataset.merge = c.dataset.merge === pk.dataset.id ? '' : pk.dataset.id; if (c.dataset.merge) c.dataset.pick = 'merge'; else if (c.dataset.pick === 'merge') delete c.dataset.pick; }
        if (md) c.dataset.pick = md.dataset.mode;
        addCheck(c);
        return;
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
      const merging = v => v.pick === 'merge' && v.merge;
      const bad = items.findIndex(v => !v.date || (!v.title && !merging(v)));
      if (bad >= 0) { msg.textContent = `${bad + 1}번째 칸에 날짜와 일정 이름을 적어 주세요.`; cards[bad].scrollIntoView({ block: 'center' }); return; }
      const undecided = items.findIndex((v, i) => v.date && addNear(v.date).length && !v.pick && !(cards[i] && cards[i].dataset.run));
      if (undecided >= 0) { msg.textContent = `${undecided + 1}번째 칸: 이날 이미 있는 일정에 붙일지, 새로 등록할지 골라 주세요.`; cards[undecided].scrollIntoView({ block: 'center' }); return; }
      const f = window.CONFIG.form;
      b.disabled = true;
      let sent = 0;
      for (const v of items) {
        b.textContent = `보내는 중… ${sent + 1}/${items.length}`;
        const to = merging(v) && data.events.find(e => e.id === v.merge);
        const body = new URLSearchParams({ [f.fields.content]: [`종류: 새일정`, `날짜: ${to ? to.date : v.date}`, `시간: ${v.time}`, `누구: ${v.mem.length ? v.mem.join(', ') : '포레스텔라'}`, `분류: ${v.cat}`, `일정: ${to ? to.title : v.title}`, `장소: ${v.place}`, `링크: ${v.link}`, `곡: ${v.songs.join(' / ')}`, ...(to ? [`합치기: ${to.id}`] : v.pick === 'new' ? ['새로: 예'] : []), `누가: ${myUid()}`].join('\n') });
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
  // 확정된 건 작은 배지만, 누르면 설명이 보여요
  const okMini = (label, msg) => `<details class="ok-mini"><summary>✓ ${label}</summary><span>${msg}</span></details>`;
  function evState(e) {
    const f = e.fanEvent;
    if (!f) return '';
    const mine = f.by && f.by === myUid(), done = slOked('ev:' + e.id);
    const btn = !f.ok && !mine && !done ? `<button type="button" class="bpill ev-ok" data-id="${esc(e.id)}">맞아요</button>` : '';
    const msg = f.ok ? `팬 ${f.n}명이 확인한 일정이에요.` : mine ? '내가 등록한 일정이에요. 다른 두 분이 맞다고 하면 확정돼요.' : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.' : "팬이 등록한 일정이에요. 맞으면 '맞아요'를 눌러 주세요.";
    if (f.ok) return okMini('확정', msg);
    // 사람마다 다르게 올린 판: 지금 보이는 판 말고 다른 판도 펼쳐 보고 '맞아요'를 눌러요
    const others = (f.alts || []).filter(a => a.ver !== f.ver);
    const altBtn = a => (window.CONFIG.form || {}).fields && a.by !== myUid() && !slOked((f.src || e.id) + ':' + a.ver) ? `<button type="button" class="bpill sl-ok" data-id="${esc(f.src || e.id)}" data-ver="${esc(a.ver)}">이 판이 맞아요</button>` : '';
    const alt = others.length ? `<details class="sl-alts"><summary>다르게 올라온 판 ${others.length}개 더 있어요</summary>${others.map((a, i) => `<div class="sl-alt"><p class="sl-alt-h">판 ${i + 2} · ${a.songs.length}곡 · 확인 ${a.n}/2${a.by === myUid() ? ' · 내가 올린 판' : ''}</p><ol>${a.songs.map(t => `<li>${esc(t)}</li>`).join('')}</ol>${altBtn(a)}</div>`).join('')}</details>` : '';
    return `<div class="sl-state${f.ok ? ' ok' : ''}"><span class="src-badge">${f.ok ? '확정' : `확인 필요 · ${f.n}/2`}</span><span class="sl-state-msg">${msg}${others.length ? ' 지금 보이는 건 판 1이에요.' : ''}</span>${btn}${alt}</div>`;
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
  // ---------- 날짜 고치기 ----------
  // 누구나 '날짜가 달라요'로 바뀐 날짜를 보내요(종류: 날짜수정). 확정 전엔 원래 날짜 그대로 두고 '원래 → 바뀔 날짜'를 같이 보여줘요.
  // 올린 사람 말고 두 명이 '맞아요'(종류: 날짜확인)를 누르거나 관리자가 확정하면 사이트와 시트(Apps Script) 날짜가 바뀌어요
  const md2 = d => d.slice(5).replace('-', '.');
  function dtState(e) {
    const was = e.dateWas ? okMini('날짜 고침', `확인을 받아 날짜를 고쳤어요. (원래 ${esc(md2(e.dateWas))})`) : '';
    return was + (e.dateProps || []).map(p => {
      const mine = p.by === myUid(), done = slOked(`dt:${e.id}:${p.to}`);
      const btn = !mine && !done ? `<button type="button" class="bpill dt-ok" data-id="${esc(e.id)}" data-to="${esc(p.to)}">맞아요</button><button type="button" class="bpill dt-no" data-id="${esc(e.id)}" data-to="${esc(p.to)}">아니에요</button>` : '';
      const adm = isAdmin() ? `<button type="button" class="link-btn dt-adm" data-id="${esc(e.id)}" data-to="${esc(p.to)}" data-state="확정">바로 확정 (관리자)</button><button type="button" class="link-btn dt-adm" data-id="${esc(e.id)}" data-to="${esc(p.to)}" data-state="거절">거절 (관리자)</button>` : '';
      const msg = mine ? '내가 보낸 날짜예요. 다른 두 분이 맞다고 하면 바뀌어요.' : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.' : "새 날짜가 맞으면 '맞아요', 원래 날짜가 맞으면 '아니에요'를 눌러 주세요. 두 분이 아니라고 하면 이 제안은 사라져요.";
      return `<div class="sl-state dt-state"><span class="src-badge">날짜 확인 · ${p.n}/2</span><span class="sl-state-msg"><b class="dt-chg">${esc(md2(e.date))} → ${esc(md2(p.to))}</b>${p.to.slice(0, 4) !== e.date.slice(0, 4) ? ` (${esc(p.to.slice(0, 4))}년)` : ''} 날짜가 바뀔 수도 있어요. ${msg}</span>${btn}${adm}</div>`;
    }).join('');
  }
  // '아니에요': 원래 날짜가 맞다고 알려요 (종류: 날짜아님)
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.dt-no'); if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id); if (!e) return;
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: 날짜아님\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n후: ${b.dataset.to}\n누가: ${myUid()}`)
      .then(() => { slOkAdd(`dt:${e.id}:${b.dataset.to}`); const st = b.closest('.dt-state'); st.querySelectorAll('.dt-ok, .dt-no').forEach(x => x.remove()); st.querySelector('.sl-state-msg').insertAdjacentHTML('beforeend', ' <b>알려 줘서 고마워요!</b>'); })
      .catch(() => { b.disabled = false; b.textContent = '다시 누르기'; });
  });
  const dtForm = e => e.ytOnly ? '' : `<details class="fix-box"><summary>📅 날짜가 달라요</summary><div class="op-form">
      <label class="add-f"><span>지금 날짜</span><input type="date" value="${esc(e.date)}" disabled></label>
      <label class="add-f"><span>맞는 날짜</span><input type="date" class="dt-in" value="${esc(e.date)}"></label>
      <button type="button" class="bpill add-send dt-send" data-id="${esc(e.id)}">보내기</button>
      <p class="src-note dt-msg">다른 두 분이 맞다고 하면 날짜가 바뀌어요. 그 전엔 원래 날짜 옆에 같이 보여요.</p></div></details>`;
  // 폼 보내기: fetch가 막히면(일부 브라우저·광고 차단) sendBeacon으로 한 번 더 보내요
  const formPost = text => {
    const f = window.CONFIG.form, url = f.url.replace(/viewform.*$/, 'formResponse'), body = () => new URLSearchParams({ [f.fields.content]: text });
    return fetch(url, { method: 'POST', mode: 'no-cors', body: body() }).catch(err => {
      if (navigator.sendBeacon && navigator.sendBeacon(url, body())) return null;
      throw err;
    });
  };
  // 📤 보낼 목록: 한꺼번에 찾기·비공개 표시처럼 여러 개를 고를 땐 바로 안 보내고 모았다가 한 번에 보내요 (이 폰에만 저장)
  const SEND_Q = 'sb-send-q';
  const sendQ = () => boxRead(SEND_Q) || [];
  const sendQAdd = it => { boxWrite(SEND_Q, [...sendQ().filter(x => x.k !== it.k), it]); sendQRender(); };
  const sendQDel = k => { const q = sendQ().filter(x => x.k !== k); boxWrite(SEND_Q, q.length ? q : null); sendQRender(); };
  const sendQHas = k => sendQ().some(x => x.k === k);
  function sendQRender() {
    let b = document.getElementById('sendq-btn');
    const n = sendQ().length;
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'sendq-btn'; b.className = 'sendq-btn'; document.body.appendChild(b); b.onclick = sendQOpen; }
    b.hidden = !n; b.innerHTML = `📤 보낼 목록 <b>${n}</b>`;
  }
  function sendQOpen() {
    let pn = document.getElementById('sendq-panel');
    if (!pn) { pn = document.createElement('div'); pn.id = 'sendq-panel'; pn.className = 'sendq-panel'; document.body.appendChild(pn); }
    const q = sendQ();
    pn.hidden = false;
    pn.innerHTML = `<div class="sendq-box" role="dialog" aria-label="보낼 목록"><div class="sendq-h"><b>📤 보낼 목록 ${q.length}개</b><button type="button" class="link-btn sendq-x">닫기</button></div>
      ${q.length ? `<ul class="sendq-list">${q.map(x => `<li><span>${esc(x.label)}</span><button type="button" class="link-btn sendq-del" data-k="${esc(x.k)}" aria-label="빼기">✕</button></li>`).join('')}</ul>
      <button type="button" class="bpill add-send sendq-go">모두 보내기</button><p class="src-note sendq-msg">보내면 다른 두 분이 맞다고 할 때 확정돼요.</p>` : '<p class="src-note">담은 게 없어요.</p>'}</div>`;
    pn.querySelector('.sendq-x').onclick = () => { pn.hidden = true; };
    pn.onclick = ev => { if (ev.target === pn) pn.hidden = true; };
    pn.querySelectorAll('.sendq-del').forEach(d => d.onclick = () => { sendQDel(d.dataset.k); sendQOpen(); });
    const go = pn.querySelector('.sendq-go');
    if (go) go.onclick = async () => {
      go.disabled = true;
      let ok = 0, bad = 0;
      for (const x of sendQ()) {
        go.textContent = `보내는 중… ${ok + bad + 1}/${q.length}`;
        try { await formPost(x.text); if (x.mark && isAdmin()) await sendEvMark(x.mark, '숨김'); if (x.slok) slOkAdd(x.slok); sendQDel(x.k); ok++; } catch (err) { bad++; }
        await new Promise(r => setTimeout(r, 400));
      }
      go.textContent = bad ? '다시 보내기' : '보냈어요 ✓'; go.disabled = false;
      pn.querySelector('.sendq-msg').textContent = bad ? `${ok}개 보냈고 ${bad}개는 못 보냈어요. 다시 보내기를 눌러 주세요.` : `${ok}개 모두 보냈어요! 5~10분쯤 뒤 반영돼요.`;
      if (!bad) setTimeout(() => { pn.hidden = true; }, 1500);
    };
  }
  setTimeout(sendQRender, 0);
  const slOkAdd = k => { try { const a = JSON.parse(localStorage.getItem(SL_OK) || '[]'); a.push(k); localStorage.setItem(SL_OK, JSON.stringify(a.slice(-300))); } catch (err) { /* 괜찮아요 */ } };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.dt-send, .dt-ok');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const send = b.classList.contains('dt-send'), box = b.closest('.op-form');
    const to = send ? box.querySelector('.dt-in').value : b.dataset.to;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return;
    if (send && to === e.date) { box.querySelector('.dt-msg').textContent = '지금 날짜와 같아요. 맞는 날짜를 골라 주세요.'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: ${send ? '날짜수정' : '날짜확인'}\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n전: ${e.date}\n후: ${to}\n누가: ${myUid()}`)
      .then(() => {
        slOkAdd(`dt:${e.id}:${to}`);
        // 관리자 기기에서 보낸 날짜는 바로 확정해요 (장소 알려주기와 같아요)
        if (send && isAdmin()) { b.textContent = '확정하는 중…'; dtAdminMark(e.id, '확정', to).then(() => { b.textContent = '확정했어요 ✓'; box.querySelector('.dt-msg').textContent = `관리자 확정: ${md2(e.date)} → ${md2(to)}. 5~10분쯤 뒤 모두에게 바뀌어요.`; }).catch(() => { b.textContent = '보냈어요 ✓'; box.querySelector('.dt-msg').textContent = "보냈지만 확정은 못 했어요. 일정 위 '바로 확정'을 눌러 주세요."; }); }
        else if (send) { b.textContent = '보냈어요 ✓'; box.querySelector('.dt-msg').textContent = `보냈어요: ${md2(e.date)} → ${md2(to)}. 5~10분쯤 뒤 일정에 같이 떠요.`; }
        else b.closest('.dt-state').outerHTML = dtState({ ...e, dateWas: '', dateProps: (e.dateProps || []).filter(p => p.to === to) });
      })
      .catch(() => { b.disabled = false; b.textContent = send ? '다시 보내기' : '다시 누르기'; if (send) box.querySelector('.dt-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하거나, 광고 차단·보안 기능을 잠깐 끄고 다시 보내 주세요.'; });
  });
  // ---------- 일정 이름 고치기 ----------
  // 남이 올린 일정 이름도 고칠 수 있어요. 다른 두 분이 맞다고 하거나 관리자가 확정하면 바뀌어요
  const nmForm = e => e.ytOnly ? '' : `<details class="fix-box"><summary>🏷 일정 이름</summary><div class="op-form">
      <label class="add-f"><span>지금 이름</span><input type="text" value="${esc(e.title)}" disabled></label>
      <label class="add-f"><span>맞는 이름</span><input type="text" class="nm-in" maxlength="120" value="${esc(e.title)}"></label>
      <button type="button" class="bpill add-send nm-send" data-id="${esc(e.id)}">보내기</button>
      <p class="src-note nm-msg">앞의 [두훈] 같은 멤버 표시는 그대로 두면 돼요. 다른 두 분이 맞다고 하면 이름이 바뀌어요.</p></div></details>`;
  function nmState(e) {
    const was = e.titleWas ? okMini('이름 고침', `확인을 받아 이름을 고쳤어요. (원래 ${esc(e.titleWas)})`) : '';
    return was + (e.nameProps || []).map(p => {
      const mine = p.by === myUid(), done = slOked(`nm:${e.id}:${p.to}`);
      const btn = !mine && !done ? `<button type="button" class="bpill nm-ok" data-id="${esc(e.id)}" data-to="${esc(p.to)}">맞아요</button>` : '';
      const adm = isAdmin() ? `<button type="button" class="link-btn pl-adm" data-mid="${esc(p.id)}">바로 확정 (관리자)</button>` : '';
      const msg = mine ? '내가 보낸 이름이에요. 다른 두 분이 맞다고 하면 바뀌어요.' : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.' : "이 이름이 맞으면 '맞아요'를 눌러 주세요.";
      return `<div class="sl-state nm-state"><span class="src-badge">이름 확인 · ${p.n}/2</span><span class="sl-state-msg"><b class="dt-chg">🏷 ${esc(p.to)}</b> ${msg}</span>${btn}${adm}</div>`;
    }).join('');
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.nm-send, .nm-ok');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const send = b.classList.contains('nm-send'), box = b.closest('.op-form');
    const to = (send ? box.querySelector('.nm-in').value : b.dataset.to || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (send && (!to || to === e.title)) { box.querySelector('.nm-msg').textContent = to ? '지금 이름과 같아요.' : '맞는 이름을 적어 주세요.'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: ${send ? '이름수정' : '이름확인'}\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n전: ${e.title}\n후: ${to}\n누가: ${myUid()}`)
      .then(() => {
        slOkAdd(`nm:${e.id}:${to}`);
        if (send) { b.textContent = '보냈어요 ✓'; box.querySelector('.nm-msg').textContent = `보냈어요: 🏷 ${to}. 5~10분쯤 뒤 일정에 확인 요청으로 떠요.`; }
        else b.closest('.nm-state').outerHTML = nmState({ ...e, titleWas: '', nameProps: (e.nameProps || []).filter(p => p.to === to) });
      })
      .catch(() => { b.disabled = false; b.textContent = send ? '다시 보내기' : '다시 누르기'; });
  });
  // ---------- ✏️ 정보 고치기: 날짜·장소·이름·그 밖·삭제 요청을 한 버튼 안에 모아요 ----------
  function editBox(e) {
    if (e.ytOnly) return fixBox(e);
    const pl = !!new URLSearchParams(location.hash.split('?')[1] || '').get('pl');
    const tabs = [['dt', '📅 날짜'], ['pl', '📍 장소'], ['nm', '🏷 일정 이름'], ['fx', '✏️ 그 밖에 틀린 곳'], ...(isAdmin() ? [] : [['del', '삭제 요청']])];
    const body = { dt: dtForm(e), pl: plForm(e), nm: nmForm(e), fx: fixBox(e), del: delBox(e) };
    return `<details class="fix-box edit-box"${pl ? ' open' : ''}><summary>✏️ 정보 고치기</summary>
      <div class="chips edit-tabs">${tabs.map(([k, l]) => `<button type="button" class="chip${k === 'del' ? ' edit-del' : ''}${pl && k === 'pl' ? ' on' : ''}" data-edit="${k}">${l}</button>`).join('')}</div>
      ${tabs.map(([k]) => `<div class="edit-pane${pl && k === 'pl' ? ' on' : ''}" data-pane="${k}">${body[k]}</div>`).join('')}</details>`;
  }
  document.addEventListener('click', ev => {
    const c = ev.target.closest('.edit-tabs [data-edit]');
    if (!c) return;
    const box = c.closest('.edit-box'), k = c.dataset.edit, was = c.classList.contains('on');
    box.querySelectorAll('[data-edit]').forEach(x => x.classList.toggle('on', !was && x === c));
    box.querySelectorAll('.edit-pane').forEach(p => { const on = !was && p.dataset.pane === k; p.classList.toggle('on', on); const d = p.querySelector('details'); if (d) d.open = on; });
  });
  // ---------- 장소 고치기 ----------
  // 장소가 비어 있으면 보낸 장소가 바로 들어가고(확인 n/2), 있던 장소를 바꾸는 건 다른 두 분이 맞다고 하면 바뀌어요
  function plState(e) {
    const was = e.placeWas != null ? okMini('장소 고침', e.placeWas ? `확인을 받아 장소를 고쳤어요. (원래 ${esc(e.placeWas)})` : '팬분이 알려 주시고 확인을 받은 장소예요.') : '';
    return was + (e.placeProps || []).map(p => {
      const mine = p.by === myUid(), done = slOked(`pl:${e.id}:${p.to}`);
      const btn = !mine && !done ? `<button type="button" class="bpill pl-ok" data-id="${esc(e.id)}" data-to="${esc(p.to)}">맞아요</button>` : '';
      const adm = isAdmin() ? `<button type="button" class="link-btn pl-adm" data-mid="${esc(p.id)}">바로 확정 (관리자)</button>` : '';
      const msg = mine ? '내가 보낸 장소예요. 다른 두 분이 맞다고 하면 확정돼요.' : done ? '확인해 줘서 고마워요! 5~10분쯤 뒤 반영돼요.' : "이 장소가 맞으면 '맞아요'를 눌러 주세요.";
      return `<div class="sl-state pl-state"><span class="src-badge">장소 확인 · ${p.n}/2</span><span class="sl-state-msg"><b class="dt-chg">📍 ${p.now ? esc(p.to) : `${esc(e.place)} → ${esc(p.to)}`}</b> ${msg}</span>${btn}${adm}</div>`;
    }).join('');
  }
  const plForm = e => e.ytOnly ? '' : `<details class="fix-box"${new URLSearchParams(location.hash.split('?')[1] || '').get('pl') ? ' open id="pl-open"' : ''}><summary>📍 ${e.place ? '장소가 달라요' : '장소 알려주기'}</summary><div class="op-form">
      ${e.place === PLACE_PRIV ? '' : `<div class="pl-kind"><button type="button" class="chip on" data-k="pub">📍 장소 공개됨</button><button type="button" class="chip" data-k="priv">🔒 장소 비공개</button><button type="button" class="chip" data-k="online">💻 온라인</button></div>`}
      ${e.place ? `<label class="add-f"><span>지금 장소</span><input type="text" value="${esc(e.place)}" disabled></label>` : ''}
      <form class="pl-find" hidden><input type="hidden" class="pl-in" value="${esc(e.place && e.place !== PLACE_PRIV ? e.place : '')}"></form>
      <div class="pin-res pl-res"></div>
      <label class="add-f pl-nv"><span>또는 네이버 지도 링크</span><input type="url" class="pl-link" inputmode="url" placeholder="네이버 지도 앱 → 장소 → 공유 → 링크 복사" autocomplete="off"></label>
      <div class="pl-ns"><a class="map-act pl-nsearch" href="https://search.naver.com/search.naver?query=${encodeURIComponent(['포레스텔라', e.title.replace(/^\[[^\]]*\]\s*/, ''), e.date.slice(0, 4) + '.' + +e.date.slice(5, 7) + '.' + +e.date.slice(8), e.place && e.place !== PLACE_PRIV ? e.place : ''].filter(Boolean).join(' '))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>이 일정 검색</a><a class="map-act pl-nsearch" href="https://map.naver.com/p/search/${encodeURIComponent((e.place && e.place !== PLACE_PRIV ? e.place : e.title.replace(/^\[[^\]]*\]\s*/, '')).replace(/\s*\([^)]*\)\s*/g, ' ').trim())}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>네이버 지도에서 찾기</a></div>
      <button type="button" class="bpill add-send pl-send" data-id="${esc(e.id)}" disabled>보내기</button>
      ${e.place === PLACE_PRIV ? '' : `<div class="pl-privbox" hidden><p class="src-note">팬사인회처럼 장소를 당첨자에게만 알려 준 일정이에요. 보내면 지도에서 '🔒 장소 비공개'로 따로 묶여요.</p><button type="button" class="bpill add-send pl-priv" data-id="${esc(e.id)}">🔒 비공개로 보내기</button></div><div class="pl-privbox pl-onbox" hidden><p class="src-note">유튜브·온라인 생중계처럼 장소 없이 진행한 일정이에요. 보내면 지도에서 빠지고 위치 확인 목록에도 안 나와요.</p><button type="button" class="bpill add-send pl-priv" data-to="온라인" data-id="${esc(e.id)}">💻 온라인으로 보내기</button></div>`}
      <p class="src-note pl-msg">위치 후보 중 맞는 곳을 누르면 바로 보내져요. 없으면 네이버 지도에서 그 장소를 공유한 링크를 붙여 주세요. 지도에도 그 자리로 찍혀요. ${e.place ? '정확한 위치가 없던 곳은 바로 들어가고, 이미 위치가 있는 곳은 다른 두 분이 맞다고 하면 바뀌어요.' : '보내면 바로 장소에 들어가고, 다른 두 분이 맞다고 하면 확정돼요.'}</p></div></details>`;
  const privText = e => `종류: 장소수정\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n전: ${e.place || ''}\n후: ${PLACE_PRIV}\n누가: ${myUid()}`;
  // 장소 알려주기를 펼치면 네이버 후보를 바로 띄워요
  document.addEventListener('toggle', ev => { const d = ev.target; if (!d.open || !d.querySelector) return; const f = d.querySelector(':scope > .op-form > .pl-find'); if (f && !f.dataset.done) { f.dataset.done = 1; f.requestSubmit(); } }, true);
  let plFullP = null;
  const plFull = () => plFullP = plFullP || fetch('data/places.json', { cache: 'no-cache' }).then(x => x.json()).catch(() => ({}));
  // 장소 찾기: OpenStreetMap 검색 결과 중 하나를 고르면 이름·좌표를 같이 보내요
  document.addEventListener('submit', async ev => {
    const f = ev.target.closest('.pl-find');
    if (!f) return;
    ev.preventDefault();
    const box = f.closest('.op-form'), q = f.querySelector('.pl-in').value.trim(), res = box.querySelector('.pl-res'), sb = box.querySelector('.pl-send');
    sb.disabled = true; delete sb.dataset.to;
    res.innerHTML = '<span class="src-note">찾는 중…</span>';
    try {
      let r = [];
      // 깃허브가 네이버에서 미리 찾아 둔 이 장소 후보를 맨 위에 (data/places.json naverCand)
      const ev0 = data.byId.get(sb.dataset.id), nc = ((await plFull()).naverCand || {})[ev0 ? placeOf(ev0) : ''] || [];
      r = [...nc.map(x => ({ name: '네이버 · ' + x.name, display_name: x.name + ',' + x.addr, lat: x.lat, lon: x.lng, nvc: 1 })), ...r];
      res.innerHTML = r.length ? r.map((h, i) => `<button type="button" class="pin-hit" data-i="${i}"><b>${esc(h.name || h.display_name.split(',')[0])}</b><small>${esc(h.display_name.split(',').slice(1, 5).join(','))}</small></button>`).join('') : '<span class="src-note">미리 찾아 둔 위치 후보가 없어요. 아래에 네이버 지도 링크를 붙여 주세요.</span>';
      res.querySelectorAll('.pin-hit').forEach(b => b.onclick = () => {
        const h = r[+b.dataset.i];
        res.querySelectorAll('.pin-hit').forEach(o => o.classList.toggle('on', o === b));
        // 네이버 후보: 장소 이름은 그대로 두고 그 장소의 좌표로 보내요 (같은 장소 일정 모두에 찍혀요, 처음이면 바로 확정)
        const pl0 = ev0 && placeOf(ev0);
        if (h.nvc && pl0) {
          const c = (+h.lat).toFixed(5) + ',' + (+h.lon).toFixed(5), msg = box.querySelector('.pl-msg');
          res.querySelectorAll('.pin-hit').forEach(o => { o.disabled = true; });
          formPost(`종류: 장소좌표\n장소: ${pl0}\n좌표: ${c}\n누가: ${myUid()}`)
            .then(() => isAdmin() ? sendEvMark('g' + window.DATA.slVer([pl0, c]), '숨김').catch(() => {}) : null)
            .then(() => { msg.textContent = `보냈어요: 📍 ${pl0} 위치. 5~10분쯤 뒤 지도에 찍혀요.`; })
            .catch(() => { res.querySelectorAll('.pin-hit').forEach(o => { o.disabled = false; }); msg.textContent = '보내지 못했어요. 잠시 뒤 다시 눌러 주세요.'; });
          return;
        }
        sb.dataset.to = (h.name || h.display_name.split(',')[0]).trim().slice(0, 80);
        sb.dataset.c = (+h.lat).toFixed(5) + ',' + (+h.lon).toFixed(5);
        sb.disabled = false;
        sb.click();  // 고르면 바로 보내요
      });
    } catch (err) { res.innerHTML = '<span class="src-note">지금은 찾기가 안 돼요. 잠시 뒤 다시 찾아 주세요.</span>'; }
  });
  // 네이버 지도 링크: 붙여넣은 글에서 주소만 꺼내요 ('[네이버지도] 장소명 https://naver.me/…' 모양도 OK)
  const NV_LINK = /https?:\/\/(?:naver\.me\/[\w-]+|(?:m\.)?map\.naver\.com\/[^\s"'<>]+|(?:m|pcmap)\.place\.naver\.com\/[^\s"'<>]+)/;
  document.addEventListener('input', ev => {
    const t = ev.target.closest && ev.target.closest('.pl-link');
    if (!t) return;
    const box = t.closest('.op-form'), sb = box.querySelector('.pl-send'), m = t.value.match(NV_LINK);
    box.querySelectorAll('.pin-hit.on').forEach(o => o.classList.remove('on'));
    delete sb.dataset.to; delete sb.dataset.c;
    if (m) sb.dataset.link = m[0]; else delete sb.dataset.link;
    sb.disabled = !m;
    box.querySelector('.pl-msg').textContent = m ? '네이버 지도 링크예요. 보내면 15~30분쯤 뒤 장소와 지도 위치가 들어가요.' : t.value.trim() ? '네이버 지도 링크가 아니에요. 장소 화면의 공유 → 링크 복사로 받은 주소를 붙여 주세요.' : '';
  });
  document.addEventListener('click', ev => {
    const h = ev.target.closest('.pl-res .pin-hit');
    if (!h) return;
    const box = h.closest('.op-form'), l = box.querySelector('.pl-link');
    if (l) l.value = '';
    delete box.querySelector('.pl-send').dataset.link;
  }, true);
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.pl-send, .pl-ok');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const send = b.classList.contains('pl-send'), box = b.closest('.op-form');
    const to = (b.dataset.to || '').replace(/\s+/g, ' ').trim(), link = send ? b.dataset.link || '' : '';
    if (!to && !link) { if (send) box.querySelector('.pl-msg').textContent = '찾은 곳 중에 하나를 고르거나 네이버 지도 링크를 붙여 주세요.'; return; }
    if (send && to && to === e.place) { box.querySelector('.pl-msg').textContent = '지금 장소와 같아요.'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: ${send ? '장소수정' : '장소확인'}\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n전: ${e.place || ''}\n후: ${to}${send && b.dataset.c ? `\n좌표: ${b.dataset.c}` : ''}${link ? `\n링크: ${link}` : ''}\n누가: ${myUid()}`)
      // 관리자 기기에서 보낸 장소는 바로 확정해요 (서명된 숨김 줄, 번호 'pl'+일정·장소)
      .then(() => send && to && e.place && isAdmin() ? sendEvMark('pl' + window.DATA.slVer([e.id, to]), '숨김').catch(() => {}) : null)
      .then(() => {
        if (to) slOkAdd(`pl:${e.id}:${to}`);
        if (send) { b.textContent = '보냈어요 ✓'; box.querySelector('.pl-msg').textContent = link ? '보냈어요! 15~30분쯤 뒤 장소와 지도 위치가 들어가요.' : `보냈어요: 📍 ${to}. 5~10분쯤 뒤 일정에 떠요.`; }
        else b.closest('.pl-state').outerHTML = plState({ ...e, placeWas: undefined, placeProps: (e.placeProps || []).filter(p => p.to === to) });
      })
      .catch(() => { b.disabled = false; b.textContent = send ? '다시 보내기' : '다시 누르기'; });
  });
  // 장소 알려주기 창 위 '공개됨 / 비공개' 고르기: 비공개면 검색 칸을 숨기고 비공개 보내기만 보여요
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.pl-kind .chip');
    if (!b) return;
    const f = b.closest('.op-form'), k = b.dataset.k;
    b.parentNode.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    f.querySelectorAll(':scope > :not(.pl-kind):not(.pl-privbox)').forEach(el => { el.style.display = k !== 'pub' ? 'none' : ''; });
    f.querySelectorAll('.pl-privbox').forEach(x => { x.hidden = x.classList.contains('pl-onbox') ? k !== 'online' : k !== 'priv'; });
  });
  // 장소 비공개(팬사인회처럼 당첨자에게만 알려 준 곳): 장소를 '비공개'로 보내요. 다른 두 분이 맞다고 하면 확정이에요
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.pl-priv');
    if (!b) return;
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    const to = b.dataset.to || PLACE_PRIV;
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(privText(e).replace(`\n후: ${PLACE_PRIV}\n`, `\n후: ${to}\n`))
      .then(() => isAdmin() ? sendEvMark('pl' + window.DATA.slVer([e.id, to]), '숨김').catch(() => {}) : null)
      .then(() => { slOkAdd(`pl:${e.id}:${to}`); b.textContent = to === PLACE_PRIV ? '보냈어요 ✓ 장소 비공개로 알렸어요' : '보냈어요 ✓ 온라인으로 알렸어요'; }).catch(() => { b.disabled = false; b.textContent = '다시 누르기'; });
  });
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.pl-adm');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '확정하는 중…';
    try { await sendEvMark(b.dataset.mid, '숨김'); b.textContent = '확정했어요 ✓'; } catch (err) { b.disabled = false; b.textContent = '다시 누르기'; }
  });
  // 관리자 확정·거절: 사이트용 서명 + 시트용 확인을 같이 보내요
  const DT_MARK = 'sb-dt-mark';
  const dtMsg = m => new TextEncoder().encode(`dt:${m.id}:${m.state}:${m.n}:${m.to}`);
  const dtMarkLocal = () => { try { return JSON.parse(localStorage.getItem(DT_MARK) || '[]'); } catch (err) { return []; } };
  try { window.SB_DT_ADMIN = JSON.parse(localStorage.getItem(DT_MARK + '-ok') || '{}'); } catch (err) { window.SB_DT_ADMIN = {}; }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.dt-adm');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '보내는 중…';
    try { await dtAdminMark(b.dataset.id, b.dataset.state, b.dataset.to); } catch (err) { b.disabled = false; b.textContent = '다시 누르기'; }
  });
  async function dtAdminMark(id, state, to) {
    const key = await crypto.subtle.importKey('jwk', { ...adminJwk(), kty: 'EC', crv: 'P-256', ext: true }, ECDSA, false, ['sign']);
    const m = { id, state, n: String(Date.now()), to };
    m.sig = b64u(await crypto.subtle.sign(SIGN, key, dtMsg(m)));
    const check = await sheetCheck({ id: 'dt:' + m.id, state: m.state, n: m.n, to: m.to });
    await formPost(`종류: 날짜확정\n대상: ${m.id}\n후: ${m.to}\n상태: ${m.state}\n번호: ${m.n}\n서명: ${m.sig}\n확인: ${check}`);
    try { localStorage.setItem(DT_MARK, JSON.stringify(dtMarkLocal().concat(m).slice(-100))); } catch (err) { /* 괜찮아요 */ }
    await syncHides();
  }
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
  const OP_MINE = 'sb-op-mine', ADMIN_KEY = 'sb-admin-key', OP_MARK = 'sb-op-mark';
  const opMarkLocal = () => { try { return JSON.parse(localStorage.getItem(OP_MARK) || '[]'); } catch (err) { return []; } };
  const opMine = () => { try { return JSON.parse(localStorage.getItem(OP_MINE) || '[]'); } catch (err) { return []; } };
  const adminJwk = () => { try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); } catch (err) { return null; } };
  const adminKeys = () => window.CONFIG.adminKeys || (window.CONFIG.adminKey ? [window.CONFIG.adminKey] : []);
  const isAdmin = () => { const k = adminJwk(); return !!(k && adminKeys().some(c => k.x === c.x && k.y === c.y)); };
  const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' }, SIGN = { name: 'ECDSA', hash: 'SHA-256' };
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const opMsg = m => new TextEncoder().encode(`${m.id}:${m.state}:${m.n}`);
  // 비밀글: 관리자 공개 열쇠로 잠가서 보내요 (시트엔 알아볼 수 없는 글자만 남고, 관리자 기기에서만 풀려요)
  const SEC = 'SEC1:', OP_SEC = 'sb-op-sec', ECDH = { name: 'ECDH', namedCurve: 'P-256' };
  const secMine = () => { try { return JSON.parse(localStorage.getItem(OP_SEC) || '{}'); } catch (err) { return {}; } };
  const aesOf = bits => crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
  // 이 기기의 비밀글 열쇠: 내 비밀글에 달린 답글을 나도 읽을 수 있게 글에 공개 열쇠(열쇠: x.y)를 같이 적어 둬요
  async function mySecKey() {
    let k = boxRead('sb-sec-key');
    if (!k || !k.d) {
      const kp = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']), j = await crypto.subtle.exportKey('jwk', kp.privateKey);
      k = { d: j.d, x: j.x, y: j.y }; boxWrite('sb-sec-key', k);
    }
    return k;
  }
  async function opSeal(text, extra = []) {
    const eph = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']), ej = await crypto.subtle.exportKey('jwk', eph.publicKey);
    const to = adminKeys().concat(extra.filter(c => c && c.x && c.y && !adminKeys().some(a => a.x === c.x)));
    const parts = await Promise.all(to.map(async c => {
      const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: c.x, y: c.y, ext: true }, ECDH, false, []);
      const key = await aesOf(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, eph.privateKey, 256));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      return b64u(iv) + '.' + b64u(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
    }));
    return `${SEC}${ej.x}.${ej.y}:${parts.join(',')}`;
  }
  async function opOpen(s) {
    if (!s.startsWith(SEC)) return null;
    const mine = [isAdmin() && adminJwk(), boxRead('sb-sec-key')].filter(k => k && k.d);
    const [ep, cts] = s.slice(SEC.length).split(':'), [x, y] = (ep || '').split('.');
    const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, ECDH, false, []);
    for (const k of mine) {
      const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: k.d, x: k.x, y: k.y, ext: true }, ECDH, false, ['deriveBits']);
      const key = await aesOf(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
      for (const c of (cts || '').split(',')) {
        const [iv, ct] = c.split('.');
        try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, key, unb64u(ct))); } catch (err) { /* 다른 사람 몫 */ }
      }
    }
    return null;
  }
  const keyOf = s => { const [x, y] = (s || '').split('.'); return x && y ? { x, y } : null; };
  // 답글이 달린 맨 위 의견 (비밀글로 바꾼 글은 새 글로)
  function opRoot(id) {
    const ops = (opData && opData.ops) || [], byId = new Map(ops.map(o => [o.id, o]));
    let o = byId.get(id);
    for (let i = 0; o && o.parent && i < 20; i++) o = byId.get(o.parent);
    if (o) { const nw = ops.find(x => x.prev === o.id && x.by === o.by); if (nw) o = nw; }
    return o;
  }
  let opData = null, opDone = new Map(), opLoading = null;
  async function verifyMarks(marks, msg = opMsg, on = '처리') {
    const done = new Map();
    if (!adminKeys().length || !crypto.subtle) return done;
    const keys = await Promise.all(adminKeys().map(c => crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: c.x, y: c.y, ext: true }, ECDSA, false, ['verify'])));
    // 같은 의견에 여러 번 눌렀으면 번호가 가장 큰(가장 최근) 것만 봐요
    const last = new Map();
    for (const m of marks) {
      let ok = false;
      for (const key of keys) { if (ok) break; try { ok = await crypto.subtle.verify(SIGN, key, unb64u(m.sig), msg(m)); } catch (err) { ok = false; } }
      if (ok && (!last.has(m.id) || Number(m.n) > Number(last.get(m.id).n))) last.set(m.id, m);
    }
    last.forEach((m, id) => { if (m.state === on) done.set(id, m); });
    return done;
  }
  function loadOpinions() {
    return opLoading = opLoading || window.DATA.fetchText(window.CONFIG.sheets.reports).then(async t => {
      opData = window.DATA.buildOpinions(t);
      // 이 기기에서 방금 누른 처리 표시는 시트에 들어오기 전까지 이 기기에 들고 있어요 (시트에 같은 번호가 오면 지워요)
      const local = opMarkLocal().filter(m => !opData.marks.some(x => x.id === m.id && x.n === m.n) && Date.now() - Number(m.n) < 864e5);
      try { localStorage.setItem(OP_MARK, JSON.stringify(local)); } catch (err) { /* 괜찮아요 */ }
      opDone = await verifyMarks(opData.marks.concat(local));
      // 비밀글: 내가 쓴 건 이 기기에 둔 원문으로, 관리자 기기는 열쇠로 풀어서 보여줘요
      const mineSec = secMine();
      for (const o of opData.ops) {
        if (!o.text.startsWith(SEC)) continue;
        o.sec = true;
        o.plain = mineSec[o.text] || await opOpen(o.text).catch(() => null);
      }
    }).catch(() => { opData = opData || { ops: [], marks: [] }; }).finally(() => { opLoading = null; });
  }
  const OP_CATS = ['정보 수정', '오류 신고', '지도 링크', '기능 요청', '자유·응원'];
  const OP_MAP_EX = '네이버 지도에서 공유한 링크를 붙여 주세요. 저장 폴더 링크도 좋아요.\n장소마다 메모에 공연 날짜나 이름을 적어 두면 더 정확하게 넣을 수 있어요.';
  // 무엇을 어떻게 고칠지 알 수 있게 쓰는 양식 (처음 쓰는 칸 예시 + 관리자가 답글로 되묻는 양식)
  const OP_FIX_EX = '어떻게 고치면 될지 적어 주세요.\n예) 날짜를 06.13에서 06.14로 바꿔 주세요\n예) 제목을 ○○에서 ○○로 바꿔 주세요\n예) ○○ 일정과 중복이라 지워 주세요';
  const OP_ASK_TAG = '(양식으로 답변)';
  const OP_ASK = OP_ASK_TAG + '\n알려주셔서 감사합니다 ☺️ 어떻게 수정하면 될지 아래 양식에 맞춰 알려주세요\n- 날짜를 ○○에서 ○○로 바꿔 주세요\n- 제목을 ○○에서 ○○로 바꿔 주세요\n- ○○ 일정과 중복이니 삭제해 주세요\n- 그 밖에: 무엇을 어떻게 바꾸면 되는지';
  // 읽음 표시: 의견 탭을 열 때 본 의견 번호를 이 기기에 저장해요
  const OP_SEEN = 'sb-op-seen';
  const opSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(OP_SEEN) || '[]')); } catch (err) { return new Set(); } };
  const opUnread = () => { const seen = opSeen(); if (!opData) return []; const gone = opGone(); return opData.ops.filter(o => !seen.has(o.id) && !gone.has(o.id)); };
  let opNewIds = null;  // 이번에 열었을 때 새로 본 의견 (다시 그려도 유지)
  const opQs = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const opFilter = () => opQs().get('f') || '';
  // 지운 의견: 쓴 사람이 보낸 '의견삭제'만 인정하고, 처리했어요가 붙은 의견은 못 지워요
  const OP_DEL = 'sb-op-del';
  const opDelMine = () => { try { return JSON.parse(localStorage.getItem(OP_DEL) || '[]'); } catch (err) { return []; } };
  // 관리자: 의견 글을 일정 이름·번호와 같이 복사 (Claude에게 붙여 넣어 고치게). 목록이 나중에 그려져서 문서에서 받아요
  const copyPlain = x => { const done = () => toast('글을 복사했어요'); const old = () => { const ta = document.createElement('textarea'); ta.value = x; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { /* 아래로 */ } ta.remove(); ok ? done() : window.prompt('이 글을 복사해 주세요', x); }; navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(x).then(done, old) : old(); };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.op-copy'); if (!b) return;
    const c = b.closest('.op-item'); if (!c) return;
    const t = c.querySelector('.op-text'), e = c.querySelector('.op-ev'), cat = c.querySelector('.op-head .new-t, .op-head .op-cat');
    const id = e ? decodeURIComponent((e.getAttribute('href') || '').replace('#/e/', '')) : '';
    const lines = [cat ? '분류: ' + cat.innerText.trim() : '', e ? `일정: [ID ${id}] ${e.innerText.replace(/^📅\s*/, '').trim()}` : '', '내용: ' + (t ? t.innerText.trim() : '')].filter(Boolean);
    copyPlain(lines.join('\n'));
  });
  function opGone() {
    const gone = new Set(opDelMine()), by = new Map(opData.ops.map(o => [o.id, o.by]));
    (opData.dels || []).forEach(d => { if (by.get(d.id) === d.by) gone.add(d.id); });
    opDone.forEach((m, id) => gone.delete(id));
    return gone;
  }
  // 답글에도 또 답글을 달 수 있어요. 들여쓰기는 몇 단계까지만 하고, 누구에게 단 답글인지 '↳ 이름'으로 보여줘요
  function opItem(o, me, admin, isNew, kidsMap, toName) {
    const done = opDone.has(o.id), mine = o.by && o.by === me, kids = (kidsMap && kidsMap.get(o.id)) || [];
    const count = (function n(id) { return ((kidsMap && kidsMap.get(id)) || []).reduce((a, k) => a + 1 + n(k.id), 0); })(o.id);
    return `<div class="op-item${done ? ' done' : ''}${o.parent ? ' op-reply' : ''}">
          <div class="op-head"><span class="op-who">${isNew ? '<span class="op-new">N</span> ' : ''}${o.parent ? '' : `<span class="new-tag op-cat">${esc(o.cat || '자유·응원')}</span> `}${toName ? `<span class="op-to">↳ ${esc(toName)}</span> ` : ''}${esc(o.name || '익명')}${mine ? (o.parent ? ' · 내 답글' : ' · 내 의견') : ''}</span><span class="op-time">${esc(o.local ? '방금 보냄 · 반영 중' : String(o.time).replace(/:\d\d$/, ''))}</span></div>
          ${o.ev ? (id => `<a class="op-ev" href="#/e/${encodeURIComponent(id)}">📅 ${esc(o.ev.replace(/^\[ID [^\]]+\]\s*/, ''))}</a>`)((o.ev.match(/\[ID ([^\]]+)\]/) || [])[1] || '') : ''}
          ${o.sec || o.text.startsWith(SEC) ? (o.plain ? `<span class="op-auto op-sec">🔒 비밀글</span><p class="op-text">${esc(o.plain)}</p>` : '<p class="op-text op-text-auto">🔒 비밀글이에요. 관리자만 볼 수 있어요.</p>') : o.text.startsWith(OP_ASK_TAG) ? `<span class="op-auto">양식으로 답변</span><p class="op-text op-text-auto">${esc(o.text.slice(OP_ASK_TAG.length).replace(/^\s+/, ''))}</p>` : `<p class="op-text">${esc(o.text)}</p>`}
          <div class="op-foot">${photoLink(o)}${o.parent ? '' : done ? '<span class="op-done">✓ 처리했어요</span>' : '<span class="op-todo">확인 중</span>'}${admin && !o.local && !o.parent ? `<button type="button" class="link-btn op-mark" data-id="${esc(o.id)}" data-state="${done ? '취소' : '처리'}">${done ? '처리 취소' : '처리했어요'}</button>` : ''}${!o.local ? `<button type="button" class="link-btn op-re" data-id="${esc(o.id)}">답글${!o.parent && count ? ' ' + count : ''}</button>` : ''}${admin && !o.parent && !o.local && !done ? `<button type="button" class="link-btn op-ask" data-id="${esc(o.id)}">양식으로 묻기</button>` : ''}${admin ? '<button type="button" class="link-btn op-copy">글 복사</button>' : ''}${mine && !o.local && !done && !o.parent && !o.sec && adminKeys().length ? `<button type="button" class="link-btn op-lock" data-id="${esc(o.id)}">🔒 비밀글로</button>` : ''}${mine && !o.local && !done ? `<button type="button" class="link-btn op-del" data-id="${esc(o.id)}">삭제</button>` : ''}</div>
          ${o.local ? '' : `<div class="op-form op-re-box" data-id="${esc(o.id)}" hidden><textarea class="op-in op-re-in" rows="2" maxlength="1000" placeholder="${o.parent ? `${esc(o.name || '익명')}님에게 답글` : '답글을 적어 주세요'}"></textarea><button type="button" class="bpill add-send op-re-send" data-id="${esc(o.id)}">답글 달기</button></div>`}
          ${kids.map(k => opItem(k, me, admin, opNewIds && opNewIds.has(k.id), kidsMap, o.parent ? (o.name || '익명') : '')).join('')}
        </div>`;
  }
  function opListHtml() {
    if (!opData) return '<p class="empty">의견 불러오는 중…</p>';
    // 내가 보낸 의견은 시트에 들어오기 전까지 '방금 보냄'으로 먼저 보여줘요 (같은 사람·같은 글이면 시트 것만)
    const me = myUid(), gone = opGone();
    const all = opMine().filter(o => !opData.ops.some(x => x.by === o.by && x.text === o.text)).reverse().map(o => ({ ...o, local: true })).concat(opData.ops.slice().reverse()).filter(o => !gone.has(o.id));
    // 비밀글로 바꾼 의견(이어: 원래 번호)은 원래 글에 달린 답글을 그대로 데려와요 (같은 사람이 쓴 것만)
    const byId = new Map(opData.ops.map(o => [o.id, o])), alias = {};
    all.forEach(o => { const was = o.prev && byId.get(o.prev); if (was && was.by === o.by) alias[o.prev] = o.id; });
    const kids = new Map();
    all.slice().reverse().forEach(o => { const pa = alias[o.parent] || o.parent; if (pa) kids.set(pa, (kids.get(pa) || []).concat(o)); });
    const list = all.filter(o => !o.parent);
    const f = opFilter(), c = opQs().get('c') || '';
    const shown = list.filter(o => (!f || (f === 'done' ? opDone.has(o.id) : !opDone.has(o.id))) && (!c || (o.cat || '자유·응원') === c));
    const admin = isAdmin();
    const href = (ff, cc) => '#/opinion' + ((ff || cc) ? '?' + new URLSearchParams(Object.entries({ f: ff, c: cc }).filter(x => x[1])).toString() : '');
    const chip = (v, l) => `<a class="chip${f === v ? ' on' : ''}" href="${href(v, c)}">${l}</a>`;
    const cchip = (v, l) => `<a class="chip${c === v ? ' on' : ''}" href="${href(f, v)}">${l}</a>`;
    return `
      <div class="chips tl-cats">${chip('', `전체 ${list.length}`)}${chip('todo', `처리 전 ${list.filter(o => !opDone.has(o.id)).length}`)}${chip('done', `처리됨 ${list.filter(o => opDone.has(o.id)).length}`)}</div>
      <div class="chips tl-cats">${cchip('', '모든 분류')}${OP_CATS.map(x => cchip(x, x)).join('')}${data.reports.length ? cchip('제보 폼', `📮 제보 폼 ${repOpen().length}`) : ''}</div>
      ${c === '제보 폼' ? repListHtml(f) : shown.length ? shown.map((o, i) => `${!o.local && opNewIds && !opNewIds.has(o.id) && shown.slice(0, i).some(x => opNewIds.has(x.id)) && !shown.slice(0, i).some(x => !x.local && !opNewIds.has(x.id)) ? '<div class="op-read">여기까지 새 의견이에요 · 아래는 읽은 의견</div>' : ''}
        ${opItem(o, me, admin, opNewIds && opNewIds.has(o.id), kids)}`).join('') : '<p class="empty">아직 의견이 없어요.</p>'}`;
  }
  function opinionView() {
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">의견</h1>
      <p class="sub">사이트에 바라는 점, 틀린 곳, 고마운 말 무엇이든 남겨 주세요. 남긴 의견은 이 화면에 모두에게 보여요.</p>
      <div class="op-form">
        <div class="chips a-mem op-cats">${OP_CATS.map(x => `<button type="button" class="chip${x === (opQs().get('w') === 'map' ? '지도 링크' : '자유·응원') ? ' on' : ''}" data-c="${x}">${x}</button>`).join('')}</div>
        <div class="map-add"${opQs().get('w') === 'map' ? '' : ' hidden'}>
          <p class="map-add-t">네이버 지도 링크를 하나씩 목록에 담아서 한 번에 보내요.</p>
          <p class="ma-hint">저장 리스트 링크는 일정을 고르지 않아도 돼요. 아래 칸에 메모만 적어 주세요.</p>
          <label class="ma-f"><span>① 링크</span><input type="url" class="ma-link" inputmode="url" placeholder="네이버 지도 링크 붙여넣기" autocomplete="off"></label>
          <label class="ma-f"><span>② 일정 <small>선택</small></span><input type="search" class="drive-ev ma-ev" maxlength="120" placeholder="어떤 일정인지 검색 (예: 레거시 서울)" autocomplete="off"></label>
          <div class="drive-list drive-hits" hidden></div>
          <button type="button" class="bpill ma-add" disabled>＋ 목록에 담기</button>
          <div class="ma-list"></div>
        </div>
        <input type="text" class="op-name" maxlength="20" placeholder="닉네임 (선택)">
        <textarea class="op-in" rows="${opQs().get('w') === 'map' ? 2 : 4}" maxlength="1000" placeholder="${opQs().get('w') === 'map' ? '더 하고 싶은 말 (선택)' : '의견을 적어 주세요'}"></textarea>
        ${photoPick()}
        ${adminKeys().length ? `<label class="op-secret"><input type="checkbox" class="op-sec-in"${opQs().get('w') === 'map' ? ' checked' : ''}> 🔒 비밀글 <small>관리자만 볼 수 있어요</small></label>` : ''}
        <button type="button" class="bpill add-send op-send" disabled>보내기</button>
        <p class="src-note op-msg">보낸 의견은 내 화면엔 바로 보이고, 다른 분들 화면엔 5~10분쯤 뒤에 보여요.</p>
        ${HOW_TIP}
      </div>
      ${isAdmin() ? '<p class="src-note">관리자 기기예요. 의견마다 \'처리했어요\'를 누를 수 있어요.</p><button type="button" class="chip op-maplinks">🗺 처리 전 지도 링크 모아 복사</button>' : ''}
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
    // 지도 링크: 담은 목록(링크 + 일정 메모)을 글 앞에 붙여 보내요
    let maItems = [];
    const curCat = () => (view.querySelector('.op-cats .on') || {}).dataset.c || '자유·응원';
    const mapMode = () => curCat() === '지도 링크';
    const canSend = () => { b.disabled = !(t.value.trim() || (mapMode() && maItems.length)); };
    canSend();
    t.addEventListener('input', () => { canSend(); try { sessionStorage.setItem('sb-op-draft', t.value); } catch (err) { /* 괜찮아요 */ } });
    b.onclick = async () => {
      const name = view.querySelector('.op-name').value.trim(), cat = curCat(), useMa = mapMode() && maItems.length;
      const text = [useMa ? maItems.map(i => i.link + (i.memo ? '\n' + i.memo : '')).join('\n\n') : '', t.value.trim()].filter(Boolean).join('\n\n');
      t.dataset.evs = useMa ? [...new Set(maItems.map(i => i.id).filter(Boolean))].join(',') : '';
      if (!text) return;
      const f = window.CONFIG.form, by = myUid();
      b.disabled = true; b.textContent = '보내는 중…';
      let photo = '';
      try { photo = await photoSend(b.closest('.op-form')); } catch (err) { b.disabled = false; b.textContent = '다시 보내기'; view.querySelector('.op-msg').textContent = '사진을 올리지 못했어요. 사진을 빼거나 잠시 뒤 다시 보내 주세요.'; return; }
      const pi = b.closest('.op-form').querySelector('.op-photo-in'); if (pi) { pi.value = ''; pi.dispatchEvent(new Event('change', { bubbles: true })); }
      const secOn = !!(view.querySelector('.op-sec-in') || {}).checked;
      let sent = text;
      let myKey = null;
      if (secOn) { try { myKey = await mySecKey(); sent = await opSeal(text, [myKey]); } catch (err) { b.disabled = false; b.textContent = '다시 보내기'; view.querySelector('.op-msg').textContent = '이 브라우저에선 비밀글을 만들 수 없어요. 비밀글을 끄고 보내 주세요.'; return; } }
      const body = new URLSearchParams({ [f.fields.content]: `종류: 의견\n분류: ${cat}\n이름: ${name}\n누가: ${by}${photo ? `\n사진: ${photo}` : ''}${myKey ? `\n열쇠: ${myKey.x}.${myKey.y}` : ''}${cat === '지도 링크' && t.dataset.evs ? `\n대상일정: ${t.dataset.evs}` : ''}\n내용: ${sent}` });
      fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body }).then(() => {
        // 비밀글 원문은 이 기기에만 둬요 (내 화면에선 계속 보여요)
        if (secOn) { const m = secMine(); m[sent] = text; const ks = Object.keys(m); ks.slice(0, -50).forEach(k => delete m[k]); try { localStorage.setItem(OP_SEC, JSON.stringify(m)); } catch (err) { /* 괜찮아요 */ } }
        // 시트에 들어간 시각을 몰라서, 시트에서 돌아오면 같은 글인지 글 내용으로 맞춰 봐요
        const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text: sent, ...(secOn ? { sec: true, plain: text } : {}), name, cat, by, photo, evs: cat === '지도 링크' && t.dataset.evs ? t.dataset.evs.split(',') : [], at: Date.now() }); t.dataset.evs = ''; driveN = null;
        try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); sessionStorage.removeItem('sb-op-draft'); } catch (err) { /* 괜찮아요 */ }
        t.value = ''; if (useMa) { maItems = []; maDraw(); } b.textContent = '보냈어요 ✓'; setTimeout(() => { b.textContent = mapMode() ? '목록 보내기' : '보내기'; }, 2500);
        view.querySelector('.op-msg').textContent = '고마워요! 다른 분들 화면엔 5~10분쯤 뒤에 보여요.';
        fill();
      }).catch(() => { b.disabled = false; b.textContent = '다시 보내기'; view.querySelector('.op-msg').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; });
    };
    view.querySelector('.op-cats').addEventListener('click', ev => { const x = ev.target.closest('.chip'); if (!x) return; view.querySelectorAll('.op-cats .chip').forEach(y => y.classList.toggle('on', y === x)); t.placeholder = /정보 수정|오류 신고/.test(x.dataset.c) ? OP_FIX_EX : x.dataset.c === '지도 링크' ? '더 하고 싶은 말 (선택)' : '의견을 적어 주세요'; t.rows = /정보 수정|오류 신고/.test(x.dataset.c) ? 5 : x.dataset.c === '지도 링크' ? 2 : 4; b.textContent = x.dataset.c === '지도 링크' ? '목록 보내기' : '보내기'; canSend();
      // 지도 링크는 개인 장소가 섞일 수 있어서 비밀글로 먼저 체크해 둬요 (끌 수 있어요)
      const sc = view.querySelector('.op-sec-in'); if (sc) sc.checked = x.dataset.c === '지도 링크';
      const ma = view.querySelector('.map-add'); if (ma) ma.hidden = x.dataset.c !== '지도 링크'; });
    // 지도 링크 목록에 담기: 링크(필수) + 일정(선택). 담은 건 카드로 보이고 ✕로 뺄 수 있어요
    const ma = view.querySelector('.map-add');
    function maDraw() {
      if (!ma) return;
      ma.querySelector('.ma-list').innerHTML = maItems.length ? `<b class="ma-cnt">보낼 목록 ${maItems.length}개</b>` + maItems.map((i, n) => `<div class="ma-item"><span>📍 ${esc(i.link.replace(/^https?:\/\//, ''))}<small>${i.memo ? esc(i.memo) : '일정 메모 없음'}</small></span><button type="button" class="ma-x" data-n="${n}" aria-label="빼기">✕</button></div>`).join('') : '';
      canSend();
    }
    if (ma) {
      const li = ma.querySelector('.ma-link'), ei = ma.querySelector('.ma-ev'), ab = ma.querySelector('.ma-add');
      const ok = () => { ab.disabled = !DRIVE_LINK.test(li.value); DRIVE_LINK.lastIndex = 0; };
      li.addEventListener('input', ok);
      ab.onclick = () => {
        const link = (li.value.match(DRIVE_LINK) || [])[0];
        if (!link) return;
        maItems.push({ link, memo: ei.value.trim(), id: ei.dataset.id || '' });
        li.value = ''; ei.value = ''; ei.dataset.id = ''; ma.querySelector('.drive-hits').hidden = true; ok(); maDraw(); li.focus();
      };
      ma.querySelector('.ma-list').addEventListener('click', ev => { const x = ev.target.closest('.ma-x'); if (!x) return; maItems.splice(+x.dataset.n, 1); maDraw(); });
      if (mapMode()) b.textContent = '목록 보내기';
    }
    // 관리자: 처리 전 '지도 링크' 의견(비밀글은 푼 글)을 한 번에 복사 → Claude에게 붙여 주면 한꺼번에 넣어요
    const ml = view.querySelector('.op-maplinks');
    if (ml) ml.onclick = async () => {
      await loadOpinions();
      const all = opData.ops.filter(o => !opDone.has(o.id) && !opGone().has(o.id));
      const roots = all.filter(o => !o.parent && o.cat === '지도 링크'), txt = roots.map(o => [`[${o.time}] ${o.name || '익명'} (${o.id})`, o.sec ? o.plain || '(못 푼 비밀글)' : o.text, ...all.filter(k => k.parent === o.id).map(k => '  ↳ ' + (k.sec ? k.plain || '(비밀 답글)' : k.text))].join('\n')).join('\n\n');
      if (!txt) { ml.textContent = '처리 전 지도 링크가 없어요'; return; }
      try { await navigator.clipboard.writeText(txt); ml.textContent = `${roots.length}건 복사했어요 ✓`; } catch (err) { ml.insertAdjacentHTML('afterend', `<textarea class="op-in" rows="6" readonly>${esc(txt)}</textarea>`); ml.textContent = '아래 글을 길게 눌러 복사해 주세요'; }
    };
    // view는 화면이 바뀌어도 그대로라서 한 번만 붙여요 (두 번 붙으면 두 번 보내져요)
    if (bindOpinion.bound) return;
    bindOpinion.bound = true;
    const post = text => { const f = window.CONFIG.form; return fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ [f.fields.content]: text }) }); };
    view.addEventListener('click', ev => {
      if (currentRoute() !== 'opinion') return;
      const q = ev.target.closest('.op-ask');
      if (q) { const box = view.querySelector(`.op-re-box[data-id="${q.dataset.id}"]`); if (box) { box.hidden = false; const ta = box.querySelector('textarea'); if (!ta.value.trim()) ta.value = OP_ASK; ta.rows = 6; ta.focus(); } return; }
      const r = ev.target.closest('.op-re');
      if (r) { const box = view.querySelector(`.op-re-box[data-id="${r.dataset.id}"]`); if (box) { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('textarea').focus(); } return; }
      const s = ev.target.closest('.op-re-send');
      if (s) {
        const t = s.parentNode.querySelector('.op-re-in'), text = t.value.trim(), by = myUid(), name = view.querySelector('.op-name').value.trim();
        if (!text) return;
        s.disabled = true; s.textContent = '보내는 중…';
        // 비밀글에 다는 답글은 관리자·글쓴이·나만 읽게 잠가요
        const root = opRoot(s.dataset.id), sec = !!(root && root.sec);
        (sec ? mySecKey().then(k => opSeal(text, [keyOf(root.key), k])) : Promise.resolve(text)).then(sent => post(`종류: 의견\n답글: ${s.dataset.id}\n이름: ${name}\n누가: ${by}\n내용: ${sent}`).then(() => sent)).then(sent => {
          if (sec) { const m = secMine(); m[sent] = text; try { localStorage.setItem(OP_SEC, JSON.stringify(m)); } catch (err) { /* 괜찮아요 */ } }
          const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text: sent, ...(sec ? { sec: true, plain: text } : {}), name, by, parent: s.dataset.id, at: Date.now() });
          try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); } catch (err) { /* 괜찮아요 */ }
          fill();
        }).catch(() => { s.disabled = false; s.textContent = '다시 보내기'; });
        return;
      }
      // 내가 쓴 공개 의견을 비밀글로: 잠근 글을 새로 보내고 원래 글은 지워요
      const lk = ev.target.closest('.op-lock');
      if (lk) {
        const o = opData && opData.ops.find(x => x.id === lk.dataset.id);
        if (!o) return;
        if (!lk.classList.contains('sure')) { lk.classList.add('sure'); lk.textContent = '비밀글로 바꿀까요?'; return; }
        lk.disabled = true; lk.textContent = '바꾸는 중…';
        mySecKey().then(k => opSeal(o.text, [k]).then(sent => post(`종류: 의견\n분류: ${o.cat || '자유·응원'}\n이름: ${o.name || ''}\n누가: ${myUid()}${o.photo ? `\n사진: ${o.photo}` : ''}${o.ev ? `\n일정: ${o.ev}` : ''}\n이어: ${o.id}\n열쇠: ${k.x}.${k.y}\n내용: ${sent}`).then(() => sent)))
          .then(sent => {
            const m = secMine(); m[sent] = o.text; try { localStorage.setItem(OP_SEC, JSON.stringify(m)); } catch (err) { /* 괜찮아요 */ }
            const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text: sent, sec: true, plain: o.text, prev: o.id, name: o.name, cat: o.cat, by: myUid(), photo: o.photo, at: Date.now() });
            try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); } catch (err) { /* 괜찮아요 */ }
            return post(`종류: 의견삭제\n대상: ${o.id}\n누가: ${myUid()}`);
          })
          .then(() => { const del = opDelMine(); del.push(o.id); try { localStorage.setItem(OP_DEL, JSON.stringify(del.slice(-200))); } catch (err) { /* 괜찮아요 */ } fill(); })
          .catch(() => { lk.disabled = false; lk.textContent = '다시 누르기'; });
        return;
      }
      const d = ev.target.closest('.op-del');
      if (d) {
        // 한 번 더 눌러야 지워져요
        if (!d.classList.contains('sure')) { d.classList.add('sure'); d.textContent = '정말 삭제할까요?'; return; }
        d.disabled = true; d.textContent = '지우는 중…';
        post(`종류: 의견삭제\n대상: ${d.dataset.id}\n누가: ${myUid()}`).then(() => {
          const del = opDelMine(); del.push(d.dataset.id);
          try { localStorage.setItem(OP_DEL, JSON.stringify(del.slice(-200))); } catch (err) { /* 괜찮아요 */ }
          fill();
        }).catch(() => { d.disabled = false; d.textContent = '다시 삭제'; });
      }
    });
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
        try { localStorage.setItem(OP_MARK, JSON.stringify(opMarkLocal().concat(mark).slice(-100))); } catch (err) { /* 괜찮아요 */ }
        fill();
      } catch (err) { m.disabled = false; m.textContent = '다시 누르기'; }
    });
  }
  // ---------- 일정 숨기기 (관리자) ----------
  // 관리자 기기에서 '숨기기'를 누르면 폼으로 '종류: 일정숨김' 줄을 보내요.
  // 서명(사이트용)이 맞으면 모두에게 숨기고, 확인(시트용)이 맞으면 시트 Apps Script가 일정 탭 공개여부를 '숨김'으로 바꿔요
  const EV_HIDE = 'sb-ev-hide', EV_MARK = 'sb-ev-mark';
  const evMsg = m => new TextEncoder().encode(`ev:${m.id}:${m.state}:${m.n}${m.to ? ':' + m.to : ''}`);
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  async function sheetKey() { const k = adminJwk(); return k && k.d ? hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sb-sheet:' + k.d))) : ''; }
  async function sheetCheck(m) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(await sheetKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${m.id}:${m.state}:${m.n}${m.to ? ':' + m.to : ''}`)));
  }
  const evMarkLocal = () => { try { return JSON.parse(localStorage.getItem(EV_MARK) || '[]'); } catch (err) { return []; } };
  try { window.SB_EV_HIDE = new Set(JSON.parse(localStorage.getItem(EV_HIDE) || '[]')); window.SB_EV_MERGE = JSON.parse(localStorage.getItem(EV_HIDE + '-to') || '{}'); } catch (err) { window.SB_EV_HIDE = new Set(); window.SB_EV_MERGE = {}; }
  async function syncHides() {
    if (!data || !data.evMarks) return;
    const local = evMarkLocal().filter(m => !data.evMarks.some(x => x.id === m.id && x.n === m.n) && Date.now() - Number(m.n) < 864e5);
    try { localStorage.setItem(EV_MARK, JSON.stringify(local)); } catch (err) { /* 괜찮아요 */ }
    const ok = await verifyMarks(data.evMarks.concat(local), evMsg, '숨김');
    const set = new Set(ok.keys()), merge = {};
    ok.forEach((m, id) => { if (m.to) merge[id] = m.to; });
    // 날짜 확정·거절(관리자): 일정마다 가장 최근 것만 써요
    const dl = dtMarkLocal().filter(m => !(data.dtMarks || []).some(x => x.id === m.id && x.n === m.n) && Date.now() - Number(m.n) < 864e5);
    try { localStorage.setItem(DT_MARK, JSON.stringify(dl)); } catch (err) { /* 괜찮아요 */ }
    const dm = (data.dtMarks || []).concat(dl), dt = {};
    for (const st of ['확정', '거절']) (await verifyMarks(dm, dtMsg, st)).forEach((m, id) => { dt[id] = { to: m.to, state: m.state }; });
    const old = window.SB_EV_HIDE, oldM = JSON.stringify(window.SB_EV_MERGE || {}), oldD = JSON.stringify(window.SB_DT_ADMIN || {});
    if (set.size === old.size && [...set].every(x => old.has(x)) && oldM === JSON.stringify(merge) && oldD === JSON.stringify(dt)) return;
    window.SB_EV_HIDE = set; window.SB_EV_MERGE = merge; window.SB_DT_ADMIN = dt;
    try { localStorage.setItem(DT_MARK + '-ok', JSON.stringify(dt)); } catch (err) { /* 괜찮아요 */ }
    try { localStorage.setItem(EV_HIDE, JSON.stringify([...set])); localStorage.setItem(EV_HIDE + '-to', JSON.stringify(merge)); } catch (err) { /* 괜찮아요 */ }
    const next = window.DATA.rebuild();
    if (next) { data = myHide(next); searchIndex = null; baseHash = null; render(); }
  }
  // 반영한 팬 제보 숨기기(관리자): 일정 숨김과 같은 서명 줄로 보내요 (번호가 r로 시작해서 시트 일정 탭은 안 건드려요)
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.rep-done');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '숨기는 중…';
    try {
      await sendEvMark(b.dataset.id, '숨김');
      const box = b.closest('.report');
      if (box && box.closest('#op-list')) { (window.SB_EV_HIDE = window.SB_EV_HIDE || new Set()).add(b.dataset.id); const r = data.reports.find(x => x.id === b.dataset.id); if (r) box.outerHTML = repItem(r); } else if (box) box.remove();
    } catch (err) { b.disabled = false; b.textContent = '다시 눌러 주세요'; }
  });
  // 반영 취소(관리자): 같은 번호에 '보이기' 서명 줄을 보내서 다시 처리 전으로 돌려요
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.rep-undo');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '되돌리는 중…';
    try {
      await sendEvMark(b.dataset.id, '보이기');
      (window.SB_EV_HIDE || new Set()).delete(b.dataset.id);
      const r = data.reports.find(x => x.id === b.dataset.id), box = b.closest('.report');
      if (r && box) box.outerHTML = repItem(r);
    } catch (err) { b.disabled = false; b.textContent = '다시 눌러 주세요'; }
  });
  async function sendEvMark(id, state, to = '') {
    const key = await crypto.subtle.importKey('jwk', { ...adminJwk(), kty: 'EC', crv: 'P-256', ext: true }, ECDSA, false, ['sign']);
    const m = { id, state, n: String(Date.now()), ...(to ? { to } : {}) };
    m.sig = b64u(await crypto.subtle.sign(SIGN, key, evMsg(m)));
    const check = await sheetCheck(m);
    const f = window.CONFIG.form;
    await fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ [f.fields.content]: `종류: 일정숨김\n대상: ${id}\n상태: ${state}\n번호: ${m.n}${to ? `\n원본: ${to}` : ''}\n서명: ${m.sig}\n확인: ${check}` }) });
    try { localStorage.setItem(EV_MARK, JSON.stringify(evMarkLocal().concat(m).slice(-100))); } catch (err) { /* 괜찮아요 */ }
    await syncHides();
  }
  // 중복이면 원본 일정에 합치기: 이 일정의 장소·시간·영상·셋리를 원본의 빈 칸에 옮기고 이 일정은 숨겨요
  const mergeBox = e => {
    const near = data.events.filter(x => x !== e && !x.ytOnly && Math.abs(new Date(x.date) - new Date(e.date)) <= 3 * 864e5);
    return near.length ? `<details class="fix-box"><summary>🔗 중복이면 원본에 합치기 (관리자)</summary><div class="op-form">
      <p class="src-note">원본 일정을 고르면 이 일정의 장소·시간·영상·셋리가 원본의 빈 칸으로 옮겨지고, 이 일정은 숨겨져요.</p>
      ${near.map(x => `<button type="button" class="link-btn ev-merge" data-id="${esc(e.id)}" data-to="${esc(x.id)}">${esc(x.date.slice(5).replace('-', '.'))} ${esc(x.title)} ← 여기로 합치기</button>`).join('')}</div></details>` : '';
  };
  const hideBtn = e => isAdmin() ? `${delAdminBox(e)}${mergeBox(e)}<button type="button" class="link-btn ev-hide" data-id="${esc(e.id)}">🙈 이 일정 숨기기 (관리자)</button>` : '';
  // ---------- 삭제 요청 ----------
  // 누구나 이유를 적어 삭제 요청(종류: 삭제요청)을 보내요. 요청은 관리자 기기에만 보이고, 승인하면 일정 숨기기와 같아요(시트 공개여부도 숨김)
  const delPending = () => {
    if (!data.delReqs) return [];
    const marks = (data.evMarks || []).concat(evMarkLocal());
    return data.delReqs.filter(q => data.events.some(e => e.id === q.id) && !marks.some(m => m.id === q.id && Number(m.n) > q.at));
  };
  const delReqHtml = (q, withEv) => `<div class="op-item del-req"><div class="op-head"><span class="op-who">${withEv ? `<a href="#/e/${encodeURIComponent(q.id)}">${esc(q.date ? q.date.slice(5).replace('-', '.') + ' ' : '')}${esc(q.title)}</a>` : '삭제 요청'}</span><span class="op-time">${esc(String(q.time).replace(/:\d\d$/, ''))}</span></div><p class="op-text">${esc(q.reason || '(이유 없음)')}</p></div>`;
  const delActs = id => `<div class="op-foot"><button type="button" class="link-btn ev-hide del-ok" data-id="${esc(id)}">승인 (숨기기)</button><button type="button" class="link-btn del-no" data-id="${esc(id)}">거절</button></div>`;
  const delAdminBox = e => {
    const qs = delPending().filter(q => q.id === e.id);
    return qs.length ? `<div class="del-box"><b>삭제 요청 ${qs.length}건</b>${qs.map(q => delReqHtml(q, false)).join('')}${delActs(e.id)}</div>` : '';
  };
  const delBox = e => isAdmin() || e.ytOnly ? '' : `<details class="fix-box del-quiet"><summary>이 일정 삭제 요청</summary><div class="op-form">
      <textarea class="op-in del-in" rows="3" maxlength="1000" placeholder="왜 지워야 하는지 적어 주세요. 예) 다른 일정과 중복이에요 / 없던 일정이에요"></textarea>
      <button type="button" class="bpill add-send del-send" data-id="${esc(e.id)}">요청 보내기</button>
      <p class="src-note del-msg">관리자가 확인하고 지워요.</p></div></details>`;
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.del-send');
    if (!b) return;
    const box = b.closest('.op-form'), text = box.querySelector('.del-in').value.trim(), e = data.events.find(x => x.id === b.dataset.id);
    if (!e) return;
    if (!text) { box.querySelector('.del-msg').textContent = '지워야 하는 이유를 적어 주세요.'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    formPost(`종류: 삭제요청\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n누가: ${myUid()}\n내용: ${text}`)
      .then(() => { b.textContent = '보냈어요 ✓'; box.querySelector('.del-in').value = ''; box.querySelector('.del-msg').textContent = '고마워요! 관리자가 확인하고 지울게요.'; })
      .catch(() => { b.disabled = false; b.textContent = '다시 보내기'; });
  });
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.del-no');
    if (!b || !isAdmin()) return;
    b.disabled = true; b.textContent = '보내는 중…';
    try { await sendEvMark(b.dataset.id, '보이기'); if (currentRoute() === 'admin') renderBase('admin'); else b.closest('.del-box').remove(); } catch (err) { b.disabled = false; b.textContent = '다시 누르기'; }
  });
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.ev-hide, .ev-unhide, .ev-merge');
    if (!b || !isAdmin()) return;
    const hide = !b.classList.contains('ev-unhide');
    if (hide && !b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = b.dataset.to ? '정말 합칠까요? 한 번 더 누르면 합쳐져요' : '정말 숨길까요? 한 번 더 누르면 모두에게 안 보여요'; return; }
    b.disabled = true; b.textContent = '보내는 중…';
    try {
      await sendEvMark(b.dataset.id, hide ? '숨김' : '보이기', b.dataset.to || '');
      if (hide) { if (currentRoute() === 'e') history.back(); else if (currentRoute() === 'admin') renderBase('admin'); }
      else if (currentRoute() === 'admin') renderBase('admin');
    } catch (err) { b.disabled = false; b.textContent = '다시 누르기'; }
  });

  // 관리자 기기 정하기: 이 기기 안에서 열쇠를 만들고, 공개 열쇠만 보여줘요
  // 신고된 글(떼창·공유 가사·TMI): 3명이면 자동 숨김. '복구'는 'ok'+번호(다시 자동으로 안 숨김), '숨김 유지'는 'ly'+번호
  function flagHtml() {
    const fl = (data.flagged || []).filter(f => !f.restored && !(f.kept && !f.reports));
    const where = k => k.startsWith('e:') ? ((data.byId.get(k.slice(2)) || {}).title || '일정') : k.startsWith('t:') ? '콘서트 ' + k.slice(2) : k.startsWith('s:') ? ((data.songs.get(k.slice(2)) || {}).name || '곡') : ((data.songs.get(k) || {}).name || k);
    const bans = Object.entries(data.bans || {}).filter(([, t]) => t > Date.now());
    return (fl.length ? fl.map(f => `<div class="op-item${f.hidden ? '' : ' rep-ok'}"><div class="op-head"><span class="op-who">${esc(f.kind)} · ${esc(where(f.key))}</span><span class="op-when">${f.reports ? `신고 ${f.reports} · ` : ''}${(f.hideReqs || []).length ? `숨김 요청 ${f.hideReqs.length} · ` : ''}${f.kept ? '숨김 유지' : f.hidden ? '자동 숨김' : '보이는 중'}</span></div><p class="op-text">${esc(f.text)}</p>${(f.why || []).map(t => `<p class="src-note">🚩 ${esc(t)}</p>`).join('')}${(f.hideReqs || []).filter(Boolean).map(t => `<p class="src-note">🙈 ${esc(t)}</p>`).join('')}<div class="op-foot">${f.kept ? '' : `<button type="button" class="link-btn fl-keep" data-id="${esc(f.id)}">${f.hidden ? '숨김 유지' : '숨기기'}</button>`}<button type="button" class="link-btn fl-ok" data-id="${esc(f.id)}">복구 (문제없음)</button><small class="src-note">기기 ${esc(f.author || '')}</small></div></div>`).join('') : '<p class="src-note">신고된 글이 없어요.</p>')
      + (bans.length ? `<p class="src-note">글쓰기 막힌 기기: ${bans.map(([u, t]) => `${esc(u)} (${new Date(t).getMonth() + 1}/${new Date(t).getDate()}까지)`).join(', ')}</p>` : '');
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('.fl-keep, .fl-ok');
    if (!b) return;
    b.disabled = true;
    sendEvMark((b.matches('.fl-ok') ? 'ok' : 'ly') + b.dataset.id, '숨김').then(() => { toast(b.matches('.fl-ok') ? '복구했어요. 5~10분쯤 뒤 다시 보여요.' : '숨김을 유지해요.'); b.closest('.op-item').classList.add('rep-ok'); }).catch(() => { b.disabled = false; });
  });
  function adminView() {
    const k = adminJwk(), c = adminKeys().length;
    const pub = k ? JSON.stringify({ x: k.x, y: k.y }) : '';
    return `
      <a class="back" href="#/more">‹ 더보기</a>
      <h1 class="h1 page-title">관리자 기기</h1>
      ${!k ? `<p class="sub">이 기기를 관리자 기기로 정하면 의견에 '처리했어요'를 누를 수 있어요. 열쇠는 이 기기 안에만 저장돼요.</p>
        <button type="button" class="bpill add-send" id="admin-make">이 기기를 관리자 기기로</button>`
      : isAdmin() ? `<p class="sub">이 기기는 관리자 기기예요. <a href="#/opinion">의견 탭</a>에서 처리 표시를, 일정 화면에서 숨기기를 할 수 있어요.</p>
        <h2 class="h3 list-title">삭제 요청</h2>
        ${(q => q.length ? [...new Set(q.map(x => x.id))].map(id => `<div class="del-box">${q.filter(x => x.id === id).map(x => delReqHtml(x, true)).join('')}${delActs(id)}</div>`).join('') : '<p class="src-note">새 삭제 요청이 없어요.</p>')(delPending())}
        <h2 class="h3 list-title">🚩 신고 · 🙈 숨김 요청된 글</h2>
        ${flagHtml()}
        <a class="map-entry" href="#/placefind">📍 지도 장소 한꺼번에 찾기 <span>›</span></a>
        <h2 class="h3 list-title">숨긴 일정</h2>
        ${(data.hidden || []).length ? data.hidden.map(h => `<div class="op-item"><div class="op-head"><span class="op-who">${esc(h.date)} ${esc(h.title)}</span></div><div class="op-foot"><button type="button" class="link-btn ev-unhide" data-id="${esc(h.id)}">다시 보이기</button></div></div>`).join('') : '<p class="src-note">숨긴 일정이 없어요.</p>'}
        <h2 class="h3 list-title">시트 연결 번호</h2>
        <p class="src-note">시트 Apps Script의 KEY 칸에 넣는 번호예요. 다른 사람에게 보내지 마세요.</p>
        <button type="button" class="bpill" id="sheet-key">번호 보기·복사</button>`
      : `<p class="sub">아래 확인용 번호를 복사해서 보내 주세요. 사이트에 넣으면 이 기기가 관리자 기기가 돼요.</p>
        <textarea class="op-in" rows="4" readonly>${esc(pub)}</textarea>
        <button type="button" class="bpill" data-copy="${esc(pub)}">복사</button>${c ? '<p class="src-note">지금 사이트에 들어 있는 번호와 달라요. 다른 기기가 관리자 기기로 정해져 있어요.</p>' : ''}`}`;
  }
  function bindAdmin() {
    const sk = document.getElementById('sheet-key');
    if (sk) sk.onclick = async () => { const v = await sheetKey(); sk.insertAdjacentHTML('afterend', `<textarea class="op-in" rows="3" readonly>${esc(v)}</textarea>`); try { await navigator.clipboard.writeText(v); sk.textContent = '복사했어요 ✓'; } catch (err) { sk.textContent = '아래 번호를 길게 눌러 복사해 주세요'; } sk.disabled = true; };
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
  // ---------- 의견·제보 사진 ----------
  // 사진은 보관함 Apps Script가 수정 드라이브(공유 안 함)에 저장하고, 폼엔 '사진: 파일번호'만 남겨요. 관리자 기기에서만 '사진 보기'가 떠요
  const photoOn = () => !!(window.CONFIG.photoUpload && boxApi());
  const photoPick = () => photoOn() ? `<label class="op-photo"><input type="file" accept="image/*" class="op-photo-in" hidden><span class="op-photo-lab">📷 사진 붙이기 (선택)</span></label>` : '';
  document.addEventListener('change', ev => {
    const i = ev.target.closest('.op-photo-in');
    if (!i) return;
    const f = i.files[0], lab = i.parentNode.querySelector('.op-photo-lab');
    if (f && f.size > 15 * 1024 * 1024) { i.value = ''; lab.textContent = '사진이 너무 커요 (15MB까지)'; return; }
    lab.textContent = f ? `📷 ${f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name} · 다시 고르기` : '📷 사진 붙이기 (선택)';
  });
  // 고른 사진을 긴 쪽 1600px JPEG로 줄여서 올리고 파일번호를 돌려줘요 (없으면 '')
  async function photoSend(box) {
    const i = box && box.querySelector('.op-photo-in'), f = i && i.files[0];
    if (!f) return '';
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = no; m.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const r = await fetch(boxApi(), { method: 'POST', body: JSON.stringify({ action: 'photo', img: c.toDataURL('image/jpeg', 0.82) }) }).then(x => x.json());
      if (!r.ok) throw new Error(r.err || 'fail');
      return r.id;
    } finally { URL.revokeObjectURL(url); }
  }
  const photoLink = o => o.photo && /^[\w-]{20,}$/.test(o.photo) ? (isAdmin() ? `<a class="link-btn op-photo-view" href="https://drive.google.com/file/d/${esc(o.photo)}/view" target="_blank" rel="noopener">📷 사진 보기</a>` : '<span class="op-photo-has">📷 사진 있음</span>') : '';
  // 날짜 변경·삭제는 일정 화면에서 바로 요청할 수 있다는 작은 안내 (의견·정보 수정·제보 쓰는 곳)
  const HOW_TIP = '<p class="src-note how-tip">날짜·장소·일정 이름이 틀렸거나 지워야 하는 일정이면, 그 일정 화면 아래 \'✏️ 정보 고치기\'에서 골라 보내 주세요. 더 빨리 반영돼요.</p>';
  const fixBox = e => `<details class="fix-box"><summary>✏️ 틀린 곳 알려주기</summary><div class="op-form">
      <textarea class="op-in fix-in" rows="4" maxlength="1000" placeholder="${esc(OP_FIX_EX)}"></textarea>
      ${photoPick()}
      <button type="button" class="bpill add-send fix-send" data-id="${esc(e.id)}">보내기</button>
      <p class="src-note fix-msg">의견 탭에 '정보 수정'으로 올라가요. 반영까지 5~10분쯤 걸려요.</p><p class="src-note how-tip">날짜·장소·일정 이름은 위 칸에서 고르면 더 빨라요.</p></div></details>`;
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.fix-send');
    if (!b) return;
    const box = b.closest('.op-form'), t = box.querySelector('.fix-in'), text = t.value.trim();
    const e = data.events.find(x => x.id === b.dataset.id);
    if (!text || !e) return;
    const f = window.CONFIG.form, by = myUid();
    b.disabled = true; b.textContent = '보내는 중…';
    let photo = '';
    try { photo = await photoSend(box); } catch (err) { b.disabled = false; b.textContent = '다시 보내기'; box.querySelector('.fix-msg').textContent = '사진을 올리지 못했어요. 사진을 빼거나 잠시 뒤 다시 보내 주세요.'; return; }
    const body = new URLSearchParams({ [f.fields.content]: `종류: 의견\n분류: 정보 수정\n날짜: ${e.date}\n일정: [ID ${e.id}] ${e.title}\n이름: \n누가: ${by}${photo ? `\n사진: ${photo}` : ''}\n내용: ${text}` });
    fetch(f.url.replace(/viewform.*$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body }).then(() => {
      const mine = opMine(); mine.push({ id: 'tmp' + Date.now(), text, name: '', cat: '정보 수정', ev: `[ID ${e.id}] ${e.title}`, by, photo, at: Date.now() });
      try { localStorage.setItem(OP_MINE, JSON.stringify(mine.slice(-50))); } catch (err) { /* 괜찮아요 */ }
      t.value = ''; b.textContent = '보냈어요 ✓';
      box.querySelector('.fix-msg').innerHTML = '고마워요! <a href="#/opinion">의견 탭</a>에서 처리됐는지 볼 수 있어요.';
    }).catch(() => { b.disabled = false; b.textContent = '다시 보내기'; });
  });
  const opBtn = () => `<a class="op-fab" href="#/opinion">💬 의견 남기기</a>`;

  // ---------- 공식 X 모아보기 ----------
  const X_CATS = ['일정 후기', '일정 현장', '비하인드·직캠', '사진·일상', '영상', '음반·컴백', '공지·안내', '기사', '생일', '투표·이벤트'];
  const X_MEMBERS = ['배두훈', '강형호', '조민규', '고우림'];
  function xF() {
    const all = data.xFeed || [];
    return {
      base: '#/xfeed', keys: ['cat', 'y', 'm'],
      F: { cat: ['종류', x => x], y: ['연도', x => x], m: ['멤버', m => m.slice(1)] },
      opts: { cat: X_CATS.filter(c => all.some(p => p.cat === c)), y: [...new Set(all.map(p => p.date.slice(0, 4)))].sort().reverse(), m: X_MEMBERS },
      cnt: (k, x) => all.filter(p => k === 'cat' ? p.cat === x : k === 'y' ? p.date.startsWith(x) : p.m.includes(x)).length,
    };
  }
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
    const st = { cat: multiOf(qs, 'cat'), y: multiOf(qs, 'y'), m: multiOf(qs, 'm'), o: qs.get('o') || '' };
    if (qs.has('q')) xQuery = qs.get('q');  // 통합 검색에서 넘어온 검색어
    let n = 0;
    const fill = () => {
      const box = document.getElementById('xfeed');
      if (!box) return;
      const qm = rel ? null : matcher(xQuery);
      const have = new Set((data.xFeed || []).map(p => p.id));
      const mine = rel ? [] : xAdded().filter(id => !have.has(id)).map(id => ({ id, url: 'https://x.com/official_fore/status/' + id, date: xIdDate(id), cat: '내가 올린 링크', m: [], text: '눌러서 X에서 보기 · 내용은 확인되면 채워져요', raw: '', img: '', imgs: [] }));
      let list = mine.concat(data.xFeed || []).filter(p => p.cat === '내가 올린 링크' || (rel || ((!st.cat.length || st.cat.includes(p.cat)) && (!st.m.length || st.m.some(m => p.m.includes(m))) && (!st.y.length || st.y.includes(p.date.slice(0, 4))))) && (!rel || p.rel === rel) && (!qm || qm(p.raw)));
      if (rel || st.o === 'old') list = list.slice().reverse();  // 음반 이야기는 처음부터 순서대로
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
      if (!rel) bindF(xF(), st);
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
    const xBar = rel ? null : fBar(xF(), st);
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
      ${xBar.row}
      <div class="view-row"><p class="sub"><span id="xcount"></span>${xBar.clear}</p>${albumBtn()}</div>
      </div>
      <div id="xfeed"><p class="empty">불러오는 중…</p></div>
      <div class="yf-wrap" id="yf-wrap" hidden></div>`}`;
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
  const concertEvents = c => c.from ? data.events.filter(e => e.category === '공연' && !/^\[/.test(e.title) && inConcert(c, e)) : [];
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
      ${t.fanSet ? slState({ id: 'T-' + t.id, fanSet: t.fanSet }) : ''}
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
        ${t.fanSet ? '' : `<p class="src-note"><a href="${esc(t.source.url)}" target="_blank" rel="noopener nofollow">${esc(t.source.name)}</a> 기준이라 틀릴 수 있어요.</p>`}
        ${tourSlForm(t)}
      </div>`;
  }

  // 관리자 기기: 아직 숨기지 않은 제보 폼 제보 전체 (최근 것부터)와 그 제보가 붙는 일정
  const repDone = r => (window.SB_EV_HIDE || new Set()).has(r.id);
  const repAll = () => data.reports.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const repOpen = () => repAll().filter(r => !repDone(r));
  const repEvent = r => data.events.find(e => r.date === e.date && (!r.title || norm(e.title).includes(norm(r.title)) || norm(r.title).includes(norm(e.title))));
  const repBtn = r => !isAdmin() ? '' : repDone(r) ? `<button type="button" class="link-btn rep-undo" data-id="${esc(r.id)}">반영 취소</button>` : `<button type="button" class="link-btn rep-done" data-id="${esc(r.id)}">반영했어요</button>`;
  const repItem = r => { const e = repEvent(r), d = repDone(r); return `<div class="report${d ? ' rep-ok' : ''}">
            <span class="report-badge">${esc(fmtDate(r.date, false) || '날짜 없음')}${d ? ' · ✓ 반영함' : ''}</span>
            ${e ? `<a href="#/e/${encodeURIComponent(e.id)}"><b>${esc(e.title)}</b></a>` : `<b>${esc(r.title || '일정 없음')}</b>`}
            <span>${esc([r.type, r.song].filter(Boolean).join(' · '))}</span>
            ${r.message ? `<span class="report-msg">${esc(r.message)}</span>` : ''}
            ${/^https?:\/\//.test(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener nofollow">근거 링크 ›</a>` : ''}
            ${repBtn(r)}
          </div>`; };
  // 의견 탭 '제보 폼' 분류: 예전 제보 폼으로 들어온 노란 제보. 반영한 것도 초록 바탕으로 같이 보여요 (처리 전·처리됨 칩으로 나눠 볼 수 있어요)
  const repListHtml = f => { const l = repAll().filter(r => !f || (f === 'done') === repDone(r)); return `<p class="src-note">제보 폼으로 들어온 제보예요. 일정 이름을 누르면 그 일정으로 가요.</p>${l.length ? l.map(repItem).join('') : '<p class="src-note">제보가 없어요.</p>'}`; };
  function reportsFor(e) {
    const t = norm(e.title);
    const done = window.SB_EV_HIDE || new Set();
    return data.reports.filter(r => !done.has(r.id) && r.date === e.date && (!r.title || t.includes(norm(r.title)) || norm(r.title).includes(t)));
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
    return `<div class="yt-strip">${list.map(v => `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener"><i class="yt-thumb"><img src="${ytThumbUrl(v.id)}" alt="" loading="lazy" onerror="this.remove()">${isNew && isNew(v) ? '<em class="nw-badge">NEW</em>' : ''}</i><span>${esc(ytTitle(v.title))}</span>${v.bc ? `<small class="yt-src">${esc(v.bc)}</small>` : ''}</a>`).join('')}</div>`;
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
    } else if (e.setlist && e.setlist.songs.length) {
      // 이날 곡이 따로 없으면 투어 셋리스트를 보여줘요 (공연마다 조금 다를 수 있어요)
      songs = `
        <p class="src-note">이 투어 셋리스트예요. 공연마다 조금 다를 수 있어요. <a href="#/tour/${encodeURIComponent(e.setlist.id)}">투어 보기 ›</a></p>
        <div class="day-songs">${e.setlist.songs.map(x => songRow(x.t, e)).join('')}</div>`;
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
            ${isAdmin() ? `<button type="button" class="link-btn rep-done" data-id="${esc(r.id)}">반영했어요 · 숨기기 (관리자)</button>` : ''}
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

    // 확정 배지·하트 수는 제목 위 한 줄에 작게
    const sts = [evState(e), dtState(e), plState(e), nmState(e)], isMini = x => x.trim().startsWith('<details class="ok-mini"') && !/<div|<section|<form/.test(x);
    const minis = sts.filter(isMini).join(''), rest = sts.filter(x => !isMini(x)).join('\n');
    return `
      <div class="sheet-grab" aria-hidden="true"><span></span></div>
      <button type="button" class="sheet-close" id="sheet-close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="sheet-body">
        <div class="meta">${tag(e.category)}<span>${fmtDate(e.date)}${period}${time}</span>${upcoming(e)}${minis}${heartTag('e', e.id)}</div>
        <h1 class="d-title">${esc(e.title)}</h1>
        ${rest}
        ${e.place || e.note ? `<p class="sub">${esc([e.place, e.note].filter(Boolean).join(' · '))}</p>` : ''}
        <div class="box-row">${goBtn(e)}${boxBtn('e', e.id, 'bpill')}${/생일|유튜브|네이버TV/.test(e.category) ? '' : wentBtns(e)}${e.ytOnly ? '' : `<button type="button" class="bpill tmi-jump" data-key="${esc('e:' + e.id)}">💡 TMI${tmiOf('e:' + e.id).length ? ' ' + tmiOf('e:' + e.id).length : ''}</button>`}</div>
        ${goBtn(e) ? `<p class="sub go-with" data-id="${esc(e.id)}">${goWith(e.id)}</p>` : ''}
        ${spBlock(e)}
        ${e.auto ? `<p class="src-note">공식 팬카페 스케줄에서 자동으로 가져온 일정이에요.</p>` : ''}
        ${thumb}
        <div class="share-row">
          <button type="button" class="act act-wide" data-share data-text="${esc(eventShareText(e))}" data-url="${esc(link('#/e/' + encodeURIComponent(e.id)))}">${shareIcon}공유하기</button>
          <a class="act" href="${xUrl(eventShareText(e), link('#/e/' + encodeURIComponent(e.id)))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg>X</a>
          <button type="button" class="act" data-copy="${esc(link('#/e/' + encodeURIComponent(e.id)))}" aria-label="링크 복사"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>복사</button>
        </div>
        ${findRow(findQuery(e.title))}
        ${castBlock(e)}
        ${e.ytOnly ? '' : tmiBox('e:' + e.id, e.title)}
        ${editBox(e)}
        ${hideBtn(e)}
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
    const plo = box.querySelector('#pl-open');
    if (plo) setTimeout(() => plo.scrollIntoView({ block: 'start' }), 50);
    const spo = /[?&]sp=1/.test(location.hash) && box.querySelector('.sp-box');
    if (spo) setTimeout(() => spo.scrollIntoView({ block: 'start' }), 50);
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

  // 하단 바 공식 X·유튜브 NEW 숫자: 마지막으로 그 탭을 본 뒤 새로 올라온 글·영상 수 (처음엔 지금까지를 본 걸로 쳐요)
  const TAB_SEEN = { xfeed: ['sb-x-seen', () => data.xFeed || []], yt: ['sb-yt-seen', () => data.official || []] };
  const seenMark = (key, list) => { const d = list.reduce((m, x) => x.date > m ? x.date : m, ''); boxWrite(key, { d, ids: list.filter(x => x.date === d).map(x => x.id) }); };
  const tabNew = tab => {
    const [key, get] = TAB_SEEN[tab], list = get(), sn = boxRead(key);
    if (!list.length) return 0;
    if (!sn || !sn.d) { seenMark(key, list); return 0; }
    return list.filter(x => x.date > sn.d || (x.date === sn.d && !(sn.ids || []).includes(x.id))).length;
  };
  function tabBadges(cur) {
    if (!data) return;
    Object.keys(TAB_SEEN).forEach(tab => {
      if (tab === cur) seenMark(TAB_SEEN[tab][0], TAB_SEEN[tab][1]());
      const a = document.querySelector(`.tab[data-tab="${tab}"]`); if (!a) return;
      const n = tab === cur ? 0 : tabNew(tab);
      let b = a.querySelector('.tab-b');
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('b'); b.className = 'tab-b'; a.appendChild(b); }
      b.textContent = n > 99 ? '99+' : String(n);
    });
  }
  function setTabs(name) {
    const tabName = name === 'xfeed' && /[?&]rel=/.test(location.hash) ? 'home' : { song: 'songs', program: 'home', members: 'more', card: 'more', wait: 'more', concerts: 'more', tour: 'more', search: 'home', timeline: 'more', add: 'more', opinion: 'more', news: 'more', fan: 'more', map: 'more', placefind: 'more', admin: 'more', releases: 'home', about: 'more', install: 'more' }[name] || name;
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === tabName;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    tabBadges(name);
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
    if (name !== 'map' && lmap) { mapStop(); try { lmap.stop(); lmap.off(); lmap.remove(); } catch (err) { /* 이미 없어요 */ } lmap = null; }
    if (name !== 'opinion') opNewIds = null;
    setTabs(name);
    view.innerHTML = ddayBadge(name) + routes[name]() + (/^(opinion|admin|add|card)$/.test(name) ? '' : opBtn());
    fillSyncNote(name);
    if (name === 'home') { bindHome(); bindHomeEdit(); }
    if (name === 'search') bindSearch();
    if (name === 'songs') bindSongs();
    if (name === 'releases') bindReleases();
    if (name === 'concerts') bindSolo();
    if (name === 'program') bindPrograms();
    if (name === 'box') bindBox();
    if (name === 'card') bindCard();
    setTimeout(waitPop, 800);
    if (name === 'map') bindMap();
    if (name === 'more') bindMore();
    if (name === 'placefind') bindPlaceFind();
    if (name === 'home') bindAsk();
    if (name === 'yt') bindYt();
    if (name === 'timeline') bindTimeline();
    if (name === 'local') bindLocal();
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
      data = myHide(await window.DATA.load(next => { data = myHide(next); searchIndex = null; if (currentRoute() !== 'e') baseHash = null; render(); syncHides(); }));
      render();
      syncHides();
      boxPull();
      setTimeout(heartSync, 4000);
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
