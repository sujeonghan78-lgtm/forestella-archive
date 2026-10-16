// 시트(CSV)를 불러와서 사이트에서 쓰기 좋은 모양으로 바꿔요.
(function () {
  const CACHE_KEY = 'soopbyeol-data-v1';

  // 따옴표 안의 쉼표·줄바꿈까지 처리하는 CSV 읽기
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ''));
  }

  function toObjects(text) {
    const [head, ...rows] = parseCSV(text);
    if (!head) return [];
    const keys = head.map(h => h.trim());
    return rows.map(r => {
      const o = {};
      keys.forEach((k, i) => { o[k] = (r[i] || '').trim(); });
      return o;
    });
  }

  // "2021-08-31", "2021. 8. 31", "2021/8/31" 모두 "2021-08-31"로
  function normDate(s) {
    const m = String(s || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return '';
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  function splitSongs(s) {
    return String(s || '').split('/').map(x => x.trim()).filter(Boolean);
  }

  // 곡 아카이브에서 같은 곡으로 묶기 위한 이름.
  // "Piano Man (스페셜 크로스오버상 수상)", "Arabian Nights(고우림)", "꽃병 외 10곡"처럼
  // 한글 설명이 붙은 괄호와 "외 N곡"은 떼고, 대소문자는 구분하지 않아요.
  // "White Night 소개"(소개만 한 곡)와 "참고:"로 시작하는 메모는 곡으로 세지 않아요.
  function songBase(name) {
    let n = String(name).trim();
    if (/^참고/.test(n) || /\s소개$/.test(n)) return '';
    n = n.replace(/\s*외\s*\d+\s*곡$/, '');
    n = n.replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => /[가-힣]|^with\s/i.test(inner) ? '' : m);
    return n.trim();
  }
  const songKey = name => songBase(name).toLowerCase().replace(/\s+/g, ' ');

  // 일정명 앞의 [강형호], [두훈/우림] 같은 표시에서 멤버 뽑기
  const MEMBERS = ['배두훈', '강형호', '조민규', '고우림'];
  const SHORT = { 두훈: '배두훈', 형호: '강형호', 민규: '조민규', 우림: '고우림' };
  function membersOf(title) {
    const found = new Set();
    const tags = String(title).match(/\[([^\]]+)\]|\(([^)]+)\)|<([^>]+)>/g) || [];
    tags.forEach(t => {
      MEMBERS.forEach(m => { if (t.includes(m)) found.add(m); });
      Object.keys(SHORT).forEach(k => { if (t.includes(k)) found.add(SHORT[k]); });
    });
    return [...found];
  }

  function buildEvents(rows) {
    return rows
      .filter(r => r['ID'] && r['공개여부'] !== '숨김')
      .map(r => ({
        id: r['ID'],
        date: normDate(r['날짜']),
        endDate: normDate(r['종료일']),
        start: r['시작'],
        end: r['종료'],
        category: r['분류'],
        title: r['일정명'],
        place: r['장소'],
        content: r['내용'],
        note: r['비고'],
        videoId: r['영상ID'],
        songs: splitSongs(r['확인된 곡']),
        songSource: r['곡 확인 출처'],
        videoMemo: r['영상 메모'],
        members: membersOf(r['일정명']),
      }))
      .map(e => Object.assign(e, {
        songKeys: e.songSource === '참고' ? [] : [...new Set(e.songs.map(songKey).filter(Boolean))],
      }))
      .filter(e => e.date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  function buildVideos(rows) {
    return rows
      .filter(r => r['영상ID'])
      .map(r => ({
        eventId: r['일정ID'],
        date: normDate(r['날짜']),
        source: r['출처'],
        title: r['제목'],
        videoId: r['영상ID'],
        note: r['비고'],
      }));
  }

  // 구글 폼 응답 탭은 질문 제목이 열 이름이 돼서, 이름 일부로 찾아요.
  function buildReports(rows) {
    const pick = (r, word) => {
      const k = Object.keys(r).find(k => k.includes(word));
      return k ? r[k] : '';
    };
    return rows.map(r => ({
      time: pick(r, '타임스탬프'),
      type: pick(r, '종류'),
      date: normDate(pick(r, '날짜')),
      title: pick(r, '일정'),
      song: pick(r, '곡'),
      link: pick(r, '링크'),
      message: pick(r, '말'),
    })).filter(r => r.title || r.song || r.date);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`시트를 불러오지 못했어요 (${res.status})`);
    return res.text();
  }

  async function fetchAll() {
    const s = window.CONFIG.sheets;
    const [events, videos, reports] = await Promise.all([
      fetchText(s.events),
      fetchText(s.videos),
      fetchText(s.reports).catch(() => ''),
    ]);
    return { events, videos, reports, savedAt: Date.now() };
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function writeCache(raw) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (e) { /* 저장 공간이 없으면 넘어가요 */ }
  }

  function build(raw) {
    const events = buildEvents(toObjects(raw.events));
    const videos = buildVideos(toObjects(raw.videos));
    const reports = raw.reports ? buildReports(toObjects(raw.reports)) : [];
    const byId = new Map(events.map(e => [e.id, e]));
    events.forEach(e => { e.related = []; });
    videos.forEach(v => { const e = byId.get(v.eventId); if (e) e.related.push(v); });
    // 곡별로 확인된 무대 모으기 (이름은 가장 많이 쓰인 표기로)
    const songs = new Map();
    events.forEach(e => {
      if (e.songSource === '참고') return;
      e.songs.forEach(name => {
        const key = songKey(name);
        if (!key) return;
        if (!songs.has(key)) songs.set(key, { key, names: {}, events: [] });
        const so = songs.get(key);
        const base = songBase(name);
        so.names[base] = (so.names[base] || 0) + 1;
        if (!so.events.includes(e)) so.events.push(e);
      });
    });
    songs.forEach(so => {
      so.name = Object.keys(so.names).sort((a, b) => so.names[b] - so.names[a])[0];
      so.first = so.events[0];
      so.last = so.events[so.events.length - 1];
    });
    return { events, videos, reports, byId, songs, savedAt: raw.savedAt };
  }

  // 저장된 데이터가 있으면 바로 보여주고, 오래됐으면 뒤에서 새로 받아요.
  // onUpdate는 새 데이터가 도착했을 때 다시 그리라고 불러요.
  async function load(onUpdate) {
    const cached = readCache();
    const fresh = cached && Date.now() - cached.savedAt < window.CONFIG.cacheMinutes * 60000;
    if (cached) {
      if (!fresh) {
        fetchAll().then(raw => { writeCache(raw); onUpdate(build(raw)); }).catch(() => {});
      }
      return build(cached);
    }
    const raw = await fetchAll();
    writeCache(raw);
    return build(raw);
  }

  window.DATA = { load, parseCSV, normDate, songKey };
})();
