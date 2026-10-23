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
    // "Prelude de la Luna + 달의 아들", "Hijo de la Luna & The Show Must Go On"처럼 이어 부른 곡은 각각 세요
    return String(s || '').split('/').flatMap(x => x.split(/\s+[+&]\s+/)).map(x => x.trim()).filter(Boolean);
  }

  // 곡 아카이브에서 같은 곡으로 묶기 위한 이름.
  // "Piano Man (스페셜 크로스오버상 수상)", "Arabian Nights(고우림)", "꽃병 외 10곡"처럼
  // 한글 설명이 붙은 괄호와 "외 N곡"은 떼고, 대소문자는 구분하지 않아요.
  // "White Night 소개"(소개만 한 곡)와 "참고:"로 시작하는 메모는 곡으로 세지 않아요.
  function songBase(name) {
    let n = String(name).trim();
    if (/^참고/.test(n) || /\s소개$/.test(n)) return '';
    n = n.replace(/\s*외\s*\d+\s*곡$/, '').replace(/^\((앵콜|앵코르|앙코르|encore)\)\s*/i, '').replace(/[`´‘’]/g, "'");
    // 끝의 (한글)·(with …)·(… ver.)·(Special Track)·(feat. …) 같은 꼬리표는 여러 개여도 빼요
    let prev;
    do { prev = n; n = n.replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => /[가-힣]|^with\s|ver\.?$|version|special track|^feat\.|remaster|^inst|^to\.\s/i.test(inner) || inner.trim().toLowerCase() === n.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase() ? '' : m); } while (n !== prev);
    return n.trim();
  }
  // 같은 곡인데 표기가 다른 것 (왼쪽 → 오른쪽 이름으로 합쳐요)
  // '월의 어느 멋진날에(무반주 한소절)'처럼 뒤가 달라도 앞 '10'만 되살려요
  const slFix = x => x.replace(/^월의\s*어느\s*멋진/, '10월의 어느 멋진');
  const SONG_SAME = { '10월의 어느 멋진날에': '10월의 어느 멋진 날에', "l'immensità": "l'immensita", 'parla più piano': 'parla piu piano', '마마(mama)': 'mama', '화이트 나이트': 'white night', '피아노맨': 'piano man', '세이브 아워 라이브즈': 'save our lives', '샤갈스 드림': "chagall's dream", 'hijo de la luna': '달의 아들', '달의 아들 (hijo de la luna)': '달의 아들', '넬라 판타지아': 'nella fantasia', 'time travel': '시간여행', 'la ultima noche': 'ultima noche', '김경호&강형호 - 정신차려': '정신차려', '곤드레만드레': '곤드레 만드레', "dell'amore non si sa": "dell' amore non si sa",
    // 유튜브 뮤직 영어 제목 → 한국어 제목 (2026-10-18 유튜브 뮤직·음반 정보 수록곡 대조)
    'magic castle': '마법의 성', 'flower vase': '꽃병', nocturne: '야상곡', 'dear moon': '달하 노피곰 도다샤', 'and spring': '그리고 봄', changgwi: '창귀',
    'bird, bird, blue bird': '새야 새야 파랑새야', 'words from the wind': '바람이 건네준 말', together: '함께라는 이유', ties: '연', '연(緣)': '연',
    'alone with tears': '눈물 속에 홀로', 'the innocent macho': '순정마초', 'i still remember': '아직도 기억하고 있어요', stay: '멀어지지 말아주세요',
    'the forest song': '숲의 노래', 'your song': '당신이 듣던', 'close your eyes': '눈을 감아도', 'the journey of love': '사랑의 여정',
    // 같은 곡 표기 차이 (2026-10-22 곡 목록 점검)
    'the phantom of the opera': 'phantom of the opera', 'bohemian rapsody': 'bohemian rhapsody', '그날들 (the days)': '그날들',
    '전설속의 누군가처럼': '전설 속의 누군가처럼', 'hand clap': 'handclap', '딴따라블루스': '딴따라 블루스', '새야새야 파랑새야': '새야 새야 파랑새야', '좋은걸 어떡해': '좋은 걸 어떡해',
    // 사랑의 찬가 표기 합치기 (2026-10-24 팬 의견)
    "사랑의 찬가(hymne à l'amour)": '사랑의 찬가', "사랑의 찬가 (hymne à l'amour)": '사랑의 찬가', "hymne à l'amour": '사랑의 찬가', "hymne a l'amour": '사랑의 찬가', "l'hymne à l'amour": '사랑의 찬가', "사랑의 찬가(hymne a l'amour)": '사랑의 찬가', "사랑의 찬가 (hymne a l'amour)": '사랑의 찬가' };
  // 자동 연결 점검에서 '틀려요'로 고른 연결 (영상ID>ev:일정ID · 영상ID>song:곡키 · x:글ID>song:곡키)
  const PROD_CH = /아트앤아티스트|블루스테이지|비트인터렉티브|스프링이엔티/;
  const LINK_SKIP = new Set([
    'ZSleXc9DR_Q>ev:10166', 'r05dSSCyGjc>ev:120245', 'r05dSSCyGjc>ev:120246',
  ]);
  const songKey = name => { const k = songBase(name).toLowerCase().replace(/\s+/g, ' '); return SONG_SAME[k] || k; };

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

  // 비고의 "출처: …" 작업 메모는 화면에 안 보이게 빼고, "출연: …"만 남겨요
  const cleanNote = v => /^출처:/.test(v || '') ? ((v.match(/출연:.*/) || [''])[0]) : (v || '');
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
        note: cleanNote(r['비고']),
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
        note: cleanNote(r['비고']),
      }));
  }

  // 구글 폼 응답 탭은 질문 제목이 열 이름이 돼서, 이름 일부로 찾아요.
  // 셋리 판 구분 번호: 곡 목록이 같으면 같은 번호
  const slVer = songs => { let h = 5381; songs.join('/').split('').forEach(ch => { h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; }); return h.toString(36); };
  const line0 = (r, key) => (((r.raw || '').match(new RegExp('^[ \\t]*' + key + '[ \\t]*[:：][ \\t]*(.*)$', 'm')) || [])[1] || '').trim();
  function buildReports(rows, all) {
    const pick = (r, word) => {
      const k = Object.keys(r).find(k => k.includes(word));
      return k ? r[k] : '';
    };
    // 통합형 폼: "제보 내용" 한 칸에 "종류: … / 날짜: … / 일정: … / 곡: … / 링크: … / 내용: …" 줄로 들어와요 (예전 칸 나뉜 응답도 읽어요)
    const line = (txt, key) => { const v = (((txt || '').match(new RegExp('^[ \\t]*' + key + '[ \\t]*[:：][ \\t]*(.*)$', 'm')) || [])[1] || '').trim(); return /중 하나$/.test(v) ? '' : v; };
    return rows.map(r => {
      const c = pick(r, '내용');
      const free = c && !/^\s*(종류|날짜|일정|곡|링크|내용)\s*[:：]/m.test(c) ? c.trim() : '';
      return {
        time: pick(r, '타임스탬프'),
        type: line(c, '종류') || pick(r, '종류'),
        date: normDate(line(c, '날짜') || pick(r, '날짜')),
        title: line(c, '일정') || pick(r, '일정'),
        song: line(c, '곡') || pick(r, '곡'),
        link: line(c, '링크') || pick(r, '링크'),
        message: line(c, '내용') || free || pick(r, '말'),
        by: line(c, '누가'), ver: line(c, '버전'), raw: c,
      };
    // 공식 X 링크 올리기로 들어온 줄은 제보가 아니라서 빼요
    }).filter(r => all || (r.type !== '공식X' && r.type !== '셋리스트' && r.type !== '셋리확인' && r.type !== '새일정' && r.type !== '일정확인' && r.type !== '의견' && r.type !== '의견처리' && r.type !== '의견삭제' && r.type !== '일정숨김' && r.type !== '날짜수정' && r.type !== '날짜확인' && r.type !== '날짜확정' && r.type !== '삭제요청' && r.type !== '장소좌표' && r.type !== '좌표확인' && r.type !== '장소수정' && r.type !== '장소확인' && r.type !== '캐스팅' && !/^공식X\s/.test(r.title))).filter(r => r.title || r.song || r.date || r.message || (all && /^(의견처리|의견삭제|일정숨김|날짜확정)$/.test(r.type)));
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`시트를 불러오지 못했어요 (${res.status})`);
    return res.text();
  }

  // withX가 false면 공식X 탭(가장 큰 시트)은 빼고 받아요. 처음 방문 때 화면을 먼저 띄우려고요.
  async function fetchAll(withX = true) {
    const s = window.CONFIG.sheets;
    const [events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt, ytbc, ytm, ytml, xlinks, xphotos, xauto, xextra, extra, career, naver] = await Promise.all([
      fetchText(s.events),
      fetchText(s.videos),
      fetchText(s.reports).catch(() => ''),
      fetchText('cafe.json').catch(() => ''),
      fetchText('setlists.json').catch(() => ''),
      withX ? fetchText(s.x).catch(() => '') : '',
      s.albums ? fetchText(s.albums).catch(() => '') : '',
      s.concerts ? fetchText(s.concerts).catch(() => '') : '',
      fetchText('data/yt_videos.json').catch(() => ''),
      fetchText('data/yt_bc.json').catch(() => ''),
      fetchText('data/ytm_tracks.json').catch(() => ''),
      fetchText('data/ytm_links.json').catch(() => ''),
      fetchText('data/x_links.json').catch(() => ''),
      fetchText('data/x_photos.json').catch(() => ''),
      fetchText('data/x_auto.json').catch(() => ''),
      fetchText('data/x_extra.json').catch(() => ''),
      fetchText('data/extra_events.json').catch(() => ''),
      fetchText('data/member_career.json').catch(() => ''),
      fetchText('data/naver_links.json').catch(() => ''),
    ]);
    return { events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt, ytbc, ytm, ytml, xlinks, xphotos, xauto, xextra, extra, career, naver, sheets: JSON.stringify(s) + (window.CONFIG.dataVer || ''), savedAt: Date.now() };
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function writeCache(raw) {
    // 저장 공간이 모자라면 옛 저장본이 남아 예전 데이터가 먼저 보이니, 지우고 다시 넣어 봐요
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (e) {
      try { localStorage.removeItem(CACHE_KEY); localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (e2) { try { localStorage.removeItem(CACHE_KEY); } catch (e3) { /* 넘어가요 */ } }
    }
  }

  // 카페 스케줄에서 자동으로 가져온 일정 중 시트에 아직 없는 것 (숨김 처리한 일정도 시트에 있는 것으로 봐요)
  function buildCafe(text, sheetRows) {
    let list = [];
    try { list = JSON.parse(text).events || []; } catch (e) { return []; }
    const known = new Set(sheetRows.map(r => r['ID']).filter(Boolean));
    return list.filter(c => c.id && c.date && !known.has(c.id)).map(c => ({
      id: c.id, date: c.date, endDate: c.endDate || '', start: c.start || '', end: c.end || '',
      category: c.category || '기타', title: c.title, place: c.place || '',
      content: '', note: '', videoId: '', songs: [], songSource: '', videoMemo: '',
      members: membersOf(c.title), songKeys: [], auto: true,
    }));
  }

  // 셋리스트 곡 이름에서 "메들리:"와 도시 표시를 떼어 곡 페이지와 맞춰요
  const setlistName = part => part.replace(/^메들리:\s*/, '').replace(/\s*\((서울|대구|부산|고양|앙코르|LA\/[^)]*|Dallas\/[^)]*)\)$/, '');

  let lastRaw = null;
  function build(raw) {
    lastRaw = raw;
    const sheetRows = toObjects(raw.events);
    // 저장소의 보충 자료(data/extra_events.json): 시트에 없는 일정 추가, 비어 있는 확인된 곡 채우기, 중복 숨기기
    let extra = {};
    try { extra = JSON.parse(raw.extra || '{}'); } catch (e) { /* 없으면 넘어가요 */ }
    const sheetIds = new Set(sheetRows.map(r => r['ID']));
    (extra.rows || []).forEach(r => { if (!sheetIds.has(r['ID'])) sheetRows.push(r); });
    // eventFix: 시트 일정 칸을 고쳐요 {일정ID: {열 이름: 값}} (팬 의견으로 확인된 날짜·이름 고치기)
    Object.entries(extra.eventFix || {}).forEach(([id, f]) => { const r = sheetRows.find(x => x['ID'] === id); if (r) Object.assign(r, f); });
    const hide = new Set(extra.hide || []);
    const events = buildEvents(sheetRows.filter(r => !hide.has(r['ID']))).concat(raw.cafe ? buildCafe(raw.cafe, sheetRows) : [])
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    // placeFix: 시트에 장소가 비어 있는 일정만 채워요
    Object.entries(extra.placeFix || {}).forEach(([id, p]) => { const e = events.find(x => x.id === id); if (e && !e.place) e.place = p; });
    Object.entries(extra.songs || {}).forEach(([id, s]) => {
      const e = events.find(x => x.id === id);
      if (e && !e.songs.length) { e.songs = splitSongs(s); e.songKeys = [...new Set(e.songs.map(songKey).filter(Boolean))]; e.songSource = (extra.songSrc || {})[id] || e.songSource || '나무위키'; }
    });
    // addSongs: 시트 곡은 그대로 두고 빠진 곡만 더해요
    Object.entries(extra.addSongs || {}).forEach(([id, s]) => {
      const e = events.find(x => x.id === id);
      if (e && e.songSource !== '참고') splitSongs(s).forEach(n => { const k = songKey(n); if (k && !e.songKeys.includes(k)) { e.songs.push(n); e.songKeys.push(k); } });
    });
    // fanSongs: 팬이 X에 올린 셋리스트. 곡이 비어 있는 일정에만 넣고 원글 링크를 같이 둬요
    Object.entries(extra.fanSongs || {}).forEach(([id, f]) => {
      const e = events.find(x => x.id === id);
      if (!e || e.songSource === '참고') return;
      // 곡이 이미 있으면 빠진 곡만 더해요
      const add = splitSongs(f.songs).filter(n => { const k = songKey(n); return k && !e.songKeys.includes(k); });
      if (!add.length) return;
      if (!e.songs.length) e.songSource = '팬 기록';
      add.forEach(n => { e.songs.push(n); e.songKeys.push(songKey(n)); });
      e.fanSrc = f;
    });
    // 이틀 공연이 한 줄로 적혀 있으면 날마다 따로 나눠요 (직관·날짜 버튼을 날마다 누를 수 있게). 둘째 날 ID는 '원래ID-d2'
    events.filter(e => e.category === '공연' && e.endDate && (new Date(e.endDate) - new Date(e.date)) / 864e5 === 1).forEach(e => {
      events.push({ ...e, id: e.id + '-d2', date: e.endDate, endDate: '', songs: e.songs.slice(), songKeys: e.songKeys.slice() });
      e.endDate = '';
    });
    // 팬이 사이트에서 보낸 셋리(제보 폼 '종류: 셋리스트'): 보내면 바로 '확인 필요'로 붙고, 누구나 고쳐 다시 보낼 수 있어요.
    // 가장 최근 판을 다른 두 사람이 '맞아요'(종류: 셋리확인, 같은 버전)로 누르면 확정이에요. 사람 구분은 브라우저마다 만든 임의 번호(누가:)로 해요
    // 팬 제보 현황 화면(#/fan)에 쓸 기록: 언제 · 무엇을 · 어느 일정에
    const fanLog = [];
    const tourFan = new Map();
    if (raw.reports) {
      const rows = buildReports(toObjects(raw.reports), true);
      const idOf = r => (r.title.match(/\[ID ([\w-]+)\]/) || [])[1];
      // 팬이 사이트 '일정 등록'에서 보낸 새 일정(종류: 새일정): 바로 '확인 필요'로 뜨고, 올린 사람 말고 두 명이 '맞아요'(종류: 일정확인)면 확정이에요
      const sp0 = x => (x || '').replace(/\[[^\]]*\]|[\s\-–·:：,.()<>'"!~]+/g, '').toLowerCase();
      rows.filter(r => r.type === '새일정' && r.date && r.title).forEach(r => {
        const id = 'u' + slVer([r.time, r.by, r.date, r.title]);
        if (events.some(x => x.id === id)) return;
        // 이미 있는 일정(같은 날, 이름이 겹침)이면 새로 만들지 않고 셋리만 그 일정에 붙여요
        const t0 = sp0(r.title);
        // extra.eventMerge {날짜: {낱말: 일정ID}}: 이름이 많이 달라도 같은 일정이면 여기로 붙여요
        const mg = Object.entries((extra.eventMerge || {})[r.date] || {}).find(([w]) => t0.includes(sp0(w)));
        // 등록할 때 '이 일정에 붙이기'를 골랐으면(합치기: ID) 그 일정에, '새로 등록'을 골랐으면 이름이 비슷해도 새로 만들어요
        const pickTo = line0(r, '합치기'), fresh = line0(r, '새로') === '예';
        // 뮤지컬 공연 기간 안의 하루를 따로 올린 거면(제목에 작품 이름이 있음) 새 일정 대신 그 뮤지컬의 캐스팅 회차로 붙여요
        const run = !pickTo && !fresh && events.find(x => x.category === '뮤지컬' && x.endDate && x.date <= r.date && r.date <= x.endDate && (w => w.length >= 2 && t0.includes(w))(sp0(x.title.replace(/^.*?(뮤지컬|연극)\s*/, ''))));
        if (run) {
          const t = (line0(r, '시간').match(/^\d{1,2}:\d{2}/) || [''])[0].padStart(5, '0').replace(/^0{5}$/, '');
          (run.fanCasts = run.fanCasts || []).push({ d: r.date, t, by: r.by, at: tsMs(r.time) });
          fanLog.push({ k: 'cast', id: run.id, at: tsMs(r.time), by: r.by, to: r.date });
          return;
        }
        const same = (pickTo && events.find(x => x.id === pickTo)) || (mg && events.find(x => x.id === mg[1])) || (!fresh && events.find(x => x.date === r.date && (sp0(x.title) === t0 || (t0.length >= 4 && (sp0(x.title).includes(t0) || t0.includes(sp0(x.title)))))));
        if (!same) {
          const mem = String(line0(r, '누구')).split(/[,/·\s]+/).map(x => SHORT[x] || (MEMBERS.includes(x) ? x : '')).filter(Boolean);
          const solo = mem.length && mem.length < 4 ? `[${mem.map(m => m.slice(1)).join('/')}] ` : '';
          const vid = ((r.link || '').match(/(?:youtu\.be\/|v=|shorts\/|live\/)([\w-]{11})/) || [])[1] || '';
          const who = new Set(rows.filter(x => x.type === '일정확인' && idOf(x) === id && x.by && x.by !== r.by).map(x => x.by));
          events.push({
            id, date: r.date, endDate: '', start: line0(r, '시간'), end: '', category: line0(r, '분류') || '기타',
            title: solo + r.title.replace(/^\[[^\]]*\]\s*/, ''), place: line0(r, '장소'), content: '', note: '', videoId: vid,
            songs: [], songSource: '', videoMemo: '', members: mem.length < 4 ? mem : [], songKeys: [],
            fanEvent: { by: r.by, n: who.size, ok: who.size >= 2 },
          });
        }
        // 이미 있는 일정에 붙을 때도 비어 있는 시간·장소·영상은 팬이 적은 걸로 채워요
        if (same) {
          const vid = ((r.link || '').match(/(?:youtu\.be\/|v=|shorts\/|live\/)([\w-]{11})/) || [])[1] || '';
          if (!same.start && line0(r, '시간')) same.start = line0(r, '시간');
          if (!same.place && line0(r, '장소')) same.place = line0(r, '장소');
          if (!same.videoId && vid) same.videoId = vid;
        }
        fanLog.push({ k: same ? 'join' : 'ev', id: same ? same.id : id, at: tsMs(r.time), by: r.by, title: r.title, songs: r.song ? r.song.split(/\s+\/\s+/).filter(Boolean).length : 0 });
        if (r.song) rows.push({ type: '셋리스트', title: `[ID ${same ? same.id : id}]`, song: r.song, by: r.by, newEv: true });
      });
      const latest = new Map();
      rows.filter(r => r.type === '셋리스트').forEach(r => {
        const id = idOf(r);
        const songs = (r.song || '').split(/\s+\/\s+/).map(x => x.trim()).filter(Boolean).slice(0, 60);
        if (id && songs.length) {
          if (!r.newEv && !id.startsWith('T-')) fanLog.push({ k: latest.has(id) ? 'slfix' : 'sl', id, at: tsMs(r.time), by: r.by, ver: slVer(songs), songs: songs.length });
          latest.set(id, { songs, by: r.by, edits: ((latest.get(id) || {}).edits || 0) + 1, fromEv: !!r.newEv });
        }
      });
      rows.filter(r => (r.type === '셋리확인' || r.type === '일정확인') && r.by).forEach(r => { const id = idOf(r); if (id && !id.startsWith('T-')) fanLog.push({ k: r.type === '셋리확인' ? 'slok' : 'evok', id, at: tsMs(r.time), by: r.by, ver: r.ver }); });
      latest.forEach((f, id) => {
        // 콘서트 투어 셋리(일정: [ID T-투어id]): 투어를 읽은 뒤에 바꿔요
        if (id.startsWith('T-')) {
          const ver = slVer(f.songs);
          const who = new Set(rows.filter(r => r.type === '셋리확인' && idOf(r) === id && r.ver === ver && r.by && r.by !== f.by).map(r => r.by));
          tourFan.set(id.slice(2), { ver, songs: f.songs, by: f.by, n: who.size, ok: who.size >= 2, edits: f.edits, src: id });
          return;
        }
        const e = events.find(x => x.id === id);
        if (!e || e.songSource === '참고') return;
        const ver = slVer(f.songs);
        const who = new Set(rows.filter(r => r.type === '셋리확인' && idOf(r) === id && r.ver === ver && r.by && r.by !== f.by).map(r => r.by));
        // 새 일정과 같이 올라온 셋리는 그 일정을 '맞아요'한 사람도 같이 확인한 걸로 쳐요 (등록 화면에서 곡까지 같이 봤어요)
        if (f.fromEv && e.fanEvent) rows.filter(r => r.type === '일정확인' && idOf(r) === id && r.by && r.by !== f.by).forEach(r => who.add(r.by));
        // 원래 곡 목록이 있어도 최근 판으로 통째로 바꿔요 (틀린 곡을 고칠 수 있게). 원래 목록은 시트 제보 줄을 지우면 돌아와요
        // 예전 셋리 알려주기가 곡 앞 숫자를 번호로 알고 지웠던 것 되돌리기 (버전 번호는 원래 글자 그대로)
        e.songs = f.songs.map(slFix); e.songKeys = [...new Set(e.songs.map(songKey).filter(Boolean))];
        e.songSource = '팬 기록';
        e.fanSrc = e.fanSrc || { note: '' };
        e.fanSet = { ver, songs: f.songs, by: f.by, n: who.size, ok: who.size >= 2, edits: f.edits, src: e.id };
      });
      // 같은 공연 여러 날(같은 제목·장소, 3일 안): 하루치만 올라와도 곡이 없는 다른 날에 같이 붙고, 확인도 같이 세요
      const sp = x => (x || '').replace(/\s+/g, '');
      events.filter(e => e.fanSet && e.fanSet.src === e.id && e.category === '공연').forEach(e => {
        events.filter(x => x !== e && x.category === '공연' && !x.fanSet && !x.songs.length && x.title === e.title && sp(x.place) === sp(e.place) && Math.abs(new Date(x.date) - new Date(e.date)) <= 3 * 864e5).forEach(x => {
          x.songs = e.songs.slice(); x.songKeys = e.songKeys.slice(); x.songSource = '팬 기록'; x.fanSrc = e.fanSrc; x.fanSet = e.fanSet;
        });
      });
    }
    // 분류 정리: 비어 있거나 표기가 다른 분류를 맞춰서, 어느 화면에서도 빠지지 않게 해요
    // (공연·행사 화면은 공연·뮤지컬·기타, 프로그램 화면은 TV·라디오를 봐요)
    events.forEach(e => {
      const c = String(e.category || '').trim(), t = e.title || '';
      if (/^youtube$/i.test(c)) e.category = '유튜브';
      else if (c === '기타' && /녹화|방청/.test(t)) e.category = 'TV';
      else if (!c) e.category = /생일/.test(t) ? '생일'
        : /라디오|FM|러브FM|파워FM|컬투|두시탈출/.test(t) ? '라디오'
        : /녹화|방청|KBS|MBC|SBS|JTBC|tvN|MBN|TV조선|채널A|EBS|Mnet|ENA/i.test(t) ? 'TV'
        : /유튜브|youtube|라이브|V LIVE|브이라이브|네이버\s*TV/i.test(t) ? '유튜브'
        : /뮤지컬/.test(t) ? '뮤지컬'
        : /콘서트|공연|페스티벌|축제|음악회|팬미팅|팬사인회|쇼케이스/.test(t) ? '공연' : '기타';
    });
    // 날짜 고치기(종류: 날짜수정 전/후 → 다른 사람 '맞아요'는 종류: 날짜확인 후): 올린 사람 말고 두 명이 맞다고 하거나
    // (같은 날짜로 고치자고 한 사람도 셈) 관리자가 확정하면 날짜가 바뀌어요. 확정 전에는 원래 날짜 그대로 두고 상세에 같이 보여줘요
    if (raw.reports) {
      const fx = {}, isD = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
      buildReports(toObjects(raw.reports), true).forEach(r => {
        if ((r.type !== '날짜수정' && r.type !== '날짜확인') || !r.by) return;
        const id = (r.title.match(/\[ID ([\w-]+)\]/) || [])[1], to = normDate(line0(r, '후'));
        if (!id || !isD(to)) return;
        const o = fx[id] = fx[id] || {}, p = o[to] = o[to] || { to, from: '', by: '', who: new Set() };
        if (r.type === '날짜수정' && !p.by) { p.by = r.by; p.from = normDate(line0(r, '전')); } else p.who.add(r.by);
        fanLog.push({ k: r.type === '날짜수정' ? 'dt' : 'dtok', id, at: tsMs(r.time), by: r.by, to, from: r.type === '날짜수정' ? normDate(line0(r, '전')) : '' });
      });
      const adm = window.SB_DT_ADMIN || {};
      events.forEach(e => {
        const a = adm[e.id], cur = e.date;
        const ps = Object.values(fx[e.id] || {}).filter(p => p.by && p.to !== cur && (!p.from || p.from === cur) && !(a && a.state === '거절' && a.to === p.to));
        ps.forEach(p => { p.who.delete(p.by); p.n = Math.min(p.who.size, 2); });
        const done = a && a.state === '확정' && a.to !== cur ? a.to : ((ps.filter(p => p.who.size >= 2).sort((x, y) => y.who.size - x.who.size)[0]) || {}).to;
        if (done) {
          if (e.endDate) e.endDate = new Date(new Date(e.endDate).getTime() + (new Date(done) - new Date(cur))).toISOString().slice(0, 10);
          e.date = done; e.dateWas = cur;
        } else if (ps.length) e.dateProps = ps.map(p => ({ to: p.to, by: p.by, n: p.n }));
      });
    }
    // 장소 고치기(종류: 장소수정 일정/전/후 → '맞아요'는 종류: 장소확인): 장소가 비어 있던 일정은 바로 채우고 확인을 기다려요.
    // 있던 장소를 바꾸는 건 올린 사람 말고 두 명이 맞다고 하거나 관리자가 확정(서명된 숨김 줄, 번호 'pl'+일정·장소)하면 바뀌어요
    if (raw.reports) {
      const px = {}, okMark = window.SB_EV_HIDE || new Set();
      // 네이버 지도 링크로 보낸 장소는 깃허브가 찾아 둔 이름·좌표(data/naver_links.json)로 채워요. 아직 못 찾았으면 기다려요
      let nv = {};
      try { nv = JSON.parse(raw.naver || '{}').links || {}; } catch (err) { /* 없어도 괜찮아요 */ }
      buildReports(toObjects(raw.reports), true).forEach(r => {
        if ((r.type !== '장소수정' && r.type !== '장소확인') || !r.by) return;
        const link = r.type === '장소수정' ? line0(r, '링크') : '', nl = link && nv[link];
        if (link && (!nl || nl.t !== 'place')) return;
        const id = (r.title.match(/\[ID ([\w-]+)\]/) || [])[1], to = (line0(r, '후') || (nl ? nl.name : '')).slice(0, 80);
        if (!id || !to) return;
        const o = px[id] = px[id] || {}, p = o[to] = o[to] || { to, from: '', by: '', who: new Set(), at: 0 };
        if (r.type === '장소수정' && !p.by) {
          p.by = r.by; p.from = line0(r, '전'); p.at = tsMs(r.time);
          const m = line0(r, '좌표').match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
          if (m) p.loc = { lat: +m[1], lng: +m[2] };
          if (nl) p.loc = { lat: nl.lat, lng: nl.lng };
        } else p.who.add(r.by);
      });
      events.forEach(e => {
        const ps = Object.values(px[e.id] || {}).filter(p => p.by && p.to !== e.place);
        if (!ps.length) return;
        ps.forEach(p => { p.who.delete(p.by); p.n = Math.min(p.who.size, 2); p.id = 'pl' + slVer([e.id, p.to]); p.done = p.who.size >= 2 || okMark.has(p.id); });
        const done = ps.filter(p => p.done).sort((a, b) => b.at - a.at)[0];
        if (done) { e.placeWas = e.place || ''; e.place = done.to; if (done.loc) e.placeLoc = done.loc; return; }
        // 비어 있던 장소: 가장 먼저 온 걸 바로 채우고 확인을 기다려요
        if (!e.place) { const f = ps.sort((a, b) => a.at - b.at)[0]; e.place = f.to; e.placeNew = f; if (f.loc) e.placeLoc = f.loc; }
        e.placeProps = ps.map(p => ({ to: p.to, by: p.by, n: p.n, id: p.id, now: p === e.placeNew }));
      });
    }
    // 관리자가 숨긴 일정: 사이트가 서명을 확인한 번호만 window.SB_EV_HIDE에 들어와요
    // 관리자가 '원본에 합치기'를 한 일정은 장소·시간·영상·셋리를 원본의 빈 칸에 옮기고 숨겨요
    const evHide = window.SB_EV_HIDE || new Set(), evTo = window.SB_EV_MERGE || {}, hidden = [];
    events.filter(e => evHide.has(e.id) && evTo[e.id]).forEach(e => {
      const t = events.find(x => x.id === evTo[e.id]);
      if (!t) return;
      if (!t.place && e.place) t.place = e.place;
      if (!t.start && e.start) t.start = e.start;
      if (!t.videoId && e.videoId) t.videoId = e.videoId;
      if (!t.songs.length && e.songs.length) Object.assign(t, { songs: e.songs.slice(), songKeys: e.songKeys.slice(), songSource: e.songSource, fanSet: e.fanSet, fanSrc: e.fanSrc });
    });
    for (let i = events.length - 1; i >= 0; i--) if (evHide.has(events[i].id)) hidden.push(events.splice(i, 1)[0]);
    const dtMarks = raw.reports ? buildReports(toObjects(raw.reports), true).filter(r => r.type === '날짜확정').map(r => ({ id: line0(r, '대상'), state: line0(r, '상태'), n: line0(r, '번호'), to: normDate(line0(r, '후')), sig: line0(r, '서명') })).filter(m => m.id && m.sig) : [];
    // 삭제 요청(종류: 삭제요청): 관리자 화면에만 보여요. 관리자가 숨기거나 거절하면(그 뒤에 찍힌 숨김·보이기 줄) 끝난 요청이에요
    const delReqs = raw.reports ? buildReports(toObjects(raw.reports), true).filter(r => r.type === '삭제요청').map(r => ({ id: (r.title.match(/\[ID ([\w-]+)\]/) || [])[1], title: r.title.replace(/^\[ID [^\]]+\]\s*/, ''), date: r.date, reason: ((r.raw || '').match(/^[ \t]*내용[ \t]*[:：][ \t]*([\s\S]*)$/m) || [])[1] || r.message, by: r.by, time: fixTs(r.time), at: tsMs(r.time) })).filter(q => q.id) : [];
    const evMarks = raw.reports ? buildReports(toObjects(raw.reports), true).filter(r => r.type === '일정숨김').map(r => ({ id: line0(r, '대상'), state: line0(r, '상태'), n: line0(r, '번호'), sig: line0(r, '서명'), ...(line0(r, '원본') ? { to: line0(r, '원본') } : {}) })).filter(m => m.id && m.sig) : [];
    events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    // 뮤지컬 캐스팅 회차(종류: 캐스팅 일정/날짜/시간): 누구나 올리면 바로 그 일정에 회차로 붙고, 직관은 회차 중에서 골라요.
    // 관리자가 지우면(서명된 숨김 줄, 번호 'c'+일정·날짜·시간) 빠져요
    if (raw.reports) {
      const gone = window.SB_EV_HIDE || new Set(), byEv = new Map(events.map(e => [e.id, e]));
      buildReports(toObjects(raw.reports), true).forEach(r => {
        if (r.type !== '캐스팅' || !r.by) return;
        const e = byEv.get((r.title.match(/\[ID ([\w-]+)\]/) || [])[1]), d = normDate(line0(r, '회차'));
        const t = (line0(r, '시간').match(/^\d{1,2}:\d{2}$/) || [''])[0].padStart(5, '0').replace(/^0{5}$/, '');
        if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < e.date || d > (e.endDate || e.date)) return;
        const id = 'c' + slVer([e.id, d, t]);
        if (gone.has(id) || (e.casts || []).some(c => c.id === id)) return;
        (e.casts = e.casts || []).push({ d, t, id, by: r.by, at: tsMs(r.time) });
        fanLog.push({ k: 'cast', id: e.id, at: tsMs(r.time), by: r.by, to: d });
      });
      // 보충 파일 casts {일정ID: [{d, t}]}: 따로 등록됐다 지운 공연 날짜 등을 회차로 넣어요
      Object.entries(extra.casts || {}).forEach(([id, list]) => { const e = byEv.get(id); if (e) list.forEach(c => { const cid = 'c' + slVer([e.id, c.d, c.t || '']); if (!gone.has(cid) && !(e.casts || []).some(x => x.id === cid)) (e.casts = e.casts || []).push({ d: c.d, t: c.t || '', id: cid, by: '' }); }); });
      events.forEach(e => (e.fanCasts || []).forEach(c => { const cid = 'c' + slVer([e.id, c.d, c.t]); if (!gone.has(cid) && !(e.casts || []).some(x => x.id === cid)) (e.casts = e.casts || []).push({ ...c, id: cid }); }));
      events.forEach(e => e.casts && e.casts.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t)));
    }
    // 숨기거나 지운 일정에 대한 제보는 빼고, 최근 것부터
    const evIds = new Set(events.map(e => e.id));
    const fan = fanLog.filter(l => evIds.has(l.id)).sort((a, b) => b.at - a.at);
    // 지도 위치 고치기(종류: 장소좌표 장소/좌표 → '맞아요'는 종류: 좌표확인): 올린 사람 말고 두 명이 맞다고 하거나
    // 관리자가 확정하면(서명된 숨김 줄, 번호 'g'+장소·좌표) 그 장소는 이 좌표로 찍어요. 확정된 것 중 가장 최근 것을 써요
    const pins = {};
    if (raw.reports) {
      const okMark = window.SB_EV_HIDE || new Set();
      buildReports(toObjects(raw.reports), true).forEach(r => {
        if ((r.type !== '장소좌표' && r.type !== '좌표확인') || !r.by) return;
        const place = line0(r, '장소'), m = line0(r, '좌표').match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!place || !m) return;
        const lat = +(+m[1]).toFixed(5), lng = +(+m[2]).toFixed(5), c = lat + ',' + lng;
        const o = pins[place] = pins[place] || { cands: {} }, k = o.cands[c] = o.cands[c] || { lat, lng, c, by: '', who: new Set(), at: 0 };
        if (r.type === '장소좌표' && !k.by) { k.by = r.by; k.at = tsMs(r.time); } else k.who.add(r.by);
      });
      Object.entries(pins).forEach(([place, o]) => {
        const cs = Object.values(o.cands).filter(k => k.by);
        cs.forEach(k => { k.who.delete(k.by); k.n = Math.min(k.who.size, 2); k.id = 'g' + slVer([place, k.c]); k.done = k.who.size >= 2 || okMark.has(k.id); });
        const done = cs.filter(k => k.done).sort((a, b) => b.at - a.at)[0];
        pins[place] = { ok: done ? { lat: done.lat, lng: done.lng } : null, pend: cs.filter(k => !k.done && (!done || k.at > done.at)).map(k => ({ lat: k.lat, lng: k.lng, c: k.c, by: k.by, n: k.n, id: k.id })) };
      });
    }
    const videos = buildVideos(toObjects(raw.videos));
    // 시트에 없는 관련 영상(보충 파일 videos): 같은 영상이 시트에 있으면 시트 우선
    const sheetVids = new Set(videos.map(v => v.videoId));
    buildVideos((extra.videos || []).filter(r => !sheetVids.has(r['영상ID']))).forEach(v => videos.push(v));
    // 예전 제보 폼 제보: 번호('r'+…)를 붙여 관리자가 '반영했어요'로 숨길 수 있게 해요. extra.reportHide {date, has}는 저장소에서 직접 숨긴 것
    const repHide = extra.reportHide || [];
    const reports = (raw.reports ? buildReports(toObjects(raw.reports)) : []).map(r => ({ ...r, id: 'r' + slVer([r.time, r.raw || r.message]) }))
      .filter(r => !repHide.some(h => r.date === h.date && (r.raw || r.message || '').includes(h.has)));
    const byId = new Map(events.map(e => [e.id, e]));
    events.forEach(e => { e.related = []; });
    // 콘서트 셋리스트 (나무위키·기사 기준) 붙이기
    let tours = [];
    try { tours = JSON.parse(raw.setlists || '{}').tours || []; } catch (err) { /* 없으면 넘어가요 */ }
    tours.forEach(t => { t.events = []; });
    // 팬이 고친 투어 셋리: '#1부' 같은 줄은 구역, '곡 {메모}'는 곡 옆 작은 메모예요
    tours.forEach(t => {
      const f = tourFan.get(t.id);
      if (!f) return;
      let sec = '', last = '';
      const list = [];
      f.songs.forEach(x => {
        if (x.startsWith('#')) { sec = x.slice(1).trim(); return; }
        const m = x.match(/^(.*?)\s*\{([^}]*)\}\s*$/), name = slFix((m ? m[1] : x).trim()), memo = m ? m[2].trim() : '';
        const head = sec && sec !== last ? sec : '';
        if (sec) last = sec;
        list.push({ t: name, note: [head, memo].filter(Boolean).join(' · '), ok: f.ok });
      });
      if (list.length) { t.songs = list; t.complete = true; t.fanSet = f; }
    });
    events.forEach(e => {
      if (e.category !== '공연') return;
      const t = tours.find(x => x.dates.includes(e.date));
      if (t) { e.setlist = t; t.events.push(e); }
    });
    // 공식 X (시트 "공식X" 탭: 한 줄이 글 하나, 후기·비하인드 일정ID로 일정에 붙여요)
    const xClean = t => {
      const body = t.replace(/^\[[^\]]*\]\s*/, '').replace(/#\S+/g, '').replace(/https?:\/\/\s?\S+/g, '').replace('더보기', '').replace(/\s+/g, ' ').trim();
      return (body || (t.match(/#(\S+)/g) || []).map(h => h.slice(1)).filter(h => !/^(포레스텔라|forestella)$/i.test(h)).join(' ')).slice(0, 120);
    };
    // 글 속 링크: 본문에 보이는 주소 + t.co를 풀어둔 주소(data/x_links.json)
    let xLinks = {};
    try { xLinks = JSON.parse(raw.xlinks || '{}'); } catch (err) { /* 없으면 넘어가요 */ }
    // 글마다 사진 전부 (앨범 보기에서 써요)
    let xPhotos = {};
    try { xPhotos = JSON.parse(raw.xphotos || '{}'); } catch (err) { /* 없으면 넘어가요 */ }
    const linksOf = (id, text) => {
      const seen = new Set();
      const short = xLinks._short || {};
      return [...(text.match(/https?:\/\/\s?[^\s…]+/g) || []).map(u => u.replace(/\s/g, '')), ...(xLinks[id] || [])]
        .map(u => short[u.replace(/^https?:\/\//, '')] || u)
        .filter(u => !/\/\/t\.co\//.test(u) && /^https?:\/\/[^/]+\.[a-z]{2,}/i.test(u) && !/(twitter|x)\.com\/[^/]+\/status/.test(u))
        .filter(u => !seen.has(u) && seen.add(u));
    };
    // 시트에 아직 없는 최근 글·링크만 붙인 글은 자동으로 받아 둔 것(data/x_auto.json, 1시간마다)으로 채워요
    let xAuto = [];
    try { xAuto = JSON.parse(raw.xauto || '{}').posts || []; } catch (err) { /* 없으면 넘어가요 */ }
    // 공식 계정이 자기 글에 이어 단 타래 글 (data/x_extra.json, 웹 아카이브에서 찾은 것)
    try { const seenA = new Set(xAuto.map(p => p.id)); xAuto = xAuto.concat((JSON.parse(raw.xextra || '{}').posts || []).filter(p => !seenA.has(p.id))); } catch (err) { /* 없으면 넘어가요 */ }
    const autoById = new Map(xAuto.map(p => [p.id, p]));
    // 글 번호로 올린 시각을 알 수 있어요 (X 글 번호 앞부분이 시각)
    const idDate = id => { try { return new Date(Number(BigInt(id) >> 22n) + 1288834974657 + 9 * 3600e3).toISOString().slice(0, 10); } catch (e) { return ''; } };
    const xFeed = toObjects(raw.xsheet || '').filter(r => r['링크']).map(r => {
      const id = (r['링크'].match(/status(?:es)?\/(\d{15,20})/) || [, r['링크'].split('/').pop()])[1];
      const au = !(r['글'] || '').trim() && autoById.get(id);
      const body = r['글'] || (au ? au.text : '');
      return {
        id,
        url: 'https://x.com/official_fore/status/' + id,
        date: normDate(r['날짜']) || (au && au.date) || idDate(id) || r['날짜'],
        cat: r['종류'] || (au && au.cat) || '사진·일상',
        m: r['멤버'] ? r['멤버'].split(',').map(x => x.trim()).filter(Boolean) : (au && au.m) || [],
        text: xClean(body) || '공식 X에 새 글이 올라왔어요',
        raw: body,
        links: linksOf(id, body),
        img: r['사진'] || (au && (au.imgs || [])[0]) || '',
        imgs: xPhotos[id] || (au && au.imgs) || [],
        after: r['후기 일정ID'] || '',
        behind: r['비하인드 일정ID'] || '',
        rel: r['음반'] || '',
      };
    });
    const xIds = new Set(xFeed.map(p => p.id));
    xAuto.filter(p => !xIds.has(p.id)).forEach(p => xFeed.push({
      id: p.id, url: 'https://x.com/official_fore/status/' + p.id, date: p.date, cat: p.cat, m: p.m || [],
      text: xClean(p.text || ''), raw: p.text || '', links: linksOf(p.id, p.text || ''),
      img: (p.imgs || [])[0] || '', imgs: p.imgs || [], after: '', behind: '', rel: '', auto: true,
    }));
    xFeed.sort((a, b) => (a.id.length - b.id.length) || (a.id < b.id ? -1 : 1));
    // 음반 이야기: 시트 "음반" 칸이 있으면 그걸, 없으면 글 속 이름으로 (위에 있을수록 먼저 맞춰요)
    const RELEASES = [
      ['THE LEGACY', /the legacy|정규\s?4집/], ['Etude', /etude|에튀드/], ['Nella Notte', /nella notte/], ['Still Here', /still here/],
      ['창귀', /창귀/], ['그리고 봄', /그리고 봄/], ['Everything', /everything/], ['Apocalypse', /apocalypse/],
      ['Piano Man', /piano man/], ['Unfinished', /unfinished/], ['KOOL', /\bkool\b/], ['White Night', /white night|백야/], ['The Bloom : UTOPIA', /utopia|the bloom/],
      ['The Beginning : World Tree', /world tree|the beginning|save our lives/],
    ];
    xFeed.forEach(p => {
      if (p.rel || !/음반|투표/.test(p.cat)) return;
      const t = p.raw.normalize('NFKC').toLowerCase();
      const hit = RELEASES.find(([, rx]) => rx.test(t));
      if (hit) p.rel = hit[0];
    });
    events.forEach(e => { e.xBehind = []; });
    xFeed.forEach(p => {
      const a = byId.get(p.after), b = byId.get(p.behind);
      if (a && !a.xPost) a.xPost = p;
      if (b) b.xBehind.push(p);
    });
    xFeed.reverse();  // 모아보기는 최신 글부터
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
    // 곡마다 셋리스트에 들어 있는 투어 ("A / B"처럼 날마다 달랐던 곡은 각각 셈)
    songs.forEach(so => { so.tours = []; });
    tours.forEach(t => t.songs.forEach(s => s.t.split(' / ').flatMap(x => x.split(/\s+[+&]\s+/)).forEach(part => {
      const so = songs.get(songKey(setlistName(part)));
      if (so && !so.tours.includes(t)) so.tours.push(t);
    })));
    // 음반 정보 (시트 "음반 정보" 탭)
    // 보충 음반(extra.albums, 시트 열 이름 그대로): 시트에 같은 멤버·앨범명이 없을 때만 얹어요
    const albRows = toObjects(raw.albums || '');
    (extra.albums || []).forEach(r => { if (!albRows.some(a => a['멤버'] === r['멤버'] && a['앨범명'] === r['앨범명'])) albRows.push(r); });
    // albumFix {"멤버|앨범명": {열: 값}}: 확인된 칸만 시트 값을 고쳐요
    albRows.forEach(a => Object.assign(a, (extra.albumFix || {})[a['멤버'] + '|' + a['앨범명']] || {}));
    const albums = albRows.filter(a => a['앨범명']).map(a => ({
      name: a['앨범명'], member: a['멤버'] || '', kind: a['종류'], date: normDate(a['발매일']) || a['발매일'], title: a['타이틀곡'],
      tracks: (a['수록곡'] || '').split(' / ').map(t => t.trim()).filter(Boolean), credit: a['타이틀 작사·작곡'],
      label: a['기획사·유통사'], rel: a['음반 이야기 이름'], img: a['사진'],
      src: [a['출처1'], a['출처2']].filter(u => /^https?:/.test(u || '')), ok: a['확인'] !== '확인 중', note: a['비고'], unsure: a['불확실'] || '',
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
    // 콘서트 정보 (시트 "콘서트 정보" 탭). 투어ID가 셋리스트와 같으면 서로 이어 붙여요.
    const urls = t => (t || '').split(/[\s;]+/).filter(u => /^https?:/.test(u));
    // 보충 콘서트(extra.concerts, 시트 열 이름 그대로): 시트에 없는 투어ID만 얹고, concertFix는 확인된 칸만 고쳐요
    const conRows = toObjects(raw.concerts || '');
    (extra.concerts || []).forEach(r => { if (!conRows.some(c => c['투어ID'] === r['투어ID'])) conRows.push(r); });
    conRows.forEach(c => Object.assign(c, (extra.concertFix || {})[c['투어ID']] || {}));
    // posterFix: 시트 포스터가 빈 투어만 예매처 포스터로 채워요
    conRows.forEach(c => { const f = (extra.posterFix || {})[c['투어ID']]; if (f && !c['포스터']) c['포스터'] = f; });
    const concerts = conRows.filter(c => c['투어ID'] && c['공연명']).map(c => {
      const [from, to] = (c['기간'] || '').split('~').map(x => x.trim());
      return {
        id: c['투어ID'], name: c['공연명'], from, to: to || from, count: c['회차'], org: c['주최·기획'],
        shows: (c['공연 일정'] || '').split(' / ').map(x => x.trim()).filter(Boolean),
        facts: (c['특징'] || '').split(' / ').map(x => x.trim()).filter(Boolean),
        img: c['포스터'], imgPost: c['포스터 글'], src: [...urls(c['출처1']), ...urls(c['출처2'])].slice(0, 6),
        ok: c['확인'] !== '확인 중', note: c['비고'],
      };
    }).sort((a, b) => (a.from < b.from ? 1 : -1));
    concerts.forEach(c => { c.tour = tours.find(t => t.id === c.id); if (c.tour) c.tour.info = c; });
    // 무대 영상이 없어도 음반 수록곡·셋리스트 곡은 곡 목록에 넣어요.
    // 띄어쓰기·기호만 다른 이름(곤드레 만드레 / 곤드레만드레)은 같은 곡으로 봐요. 반주(Inst·MR)는 빼요.
    const loose = k => k.replace(/[^0-9a-z가-힣]/g, '');
    const byLoose = new Map([...songs.keys()].map(k => [loose(k), k]));
    const addSong = name => {
      if (/\b(inst\.?|instrumental|mr)\b/i.test(name)) return null;
      let key = songKey(name);
      if (!key) return null;
      if (!songs.has(key) && byLoose.has(loose(key))) key = byLoose.get(loose(key));
      byLoose.set(loose(key), key);
      if (!songs.has(key)) songs.set(key, { key, name: songBase(name), names: {}, events: [], tours: [], albums: [], titleOf: [] });
      return songs.get(key);
    };
    tours.forEach(t => t.songs.forEach(s => s.t.split(' / ').flatMap(x => x.split(/\s+[+&]\s+/)).forEach(part => {
      const so = addSong(setlistName(part));
      if (so && !so.tours.includes(t)) so.tours.push(t);
    })));
    songs.forEach(so => { so.albums = []; so.titleOf = []; });
    albums.slice().reverse().forEach(a => {
      const titles = (a.title || '').split(/[,/]/).map(x => songKey(x)).filter(Boolean);
      a.tracks.forEach(t => {
        const so = addSong(t);
        if (!so) return;
        if (!so.albums.includes(a)) so.albums.push(a);
        if (titles.includes(so.key) && !so.titleOf.includes(a)) so.titleOf.push(a);
      });
    });
    // 처음 만난 날: 무대·콘서트·음반 중 가장 이른 날
    songs.forEach(so => {
      so.albums = so.albums || []; so.titleOf = so.titleOf || [];
      const ds = [so.first && so.first.date, ...so.tours.map(t => t.dates[0]), ...so.albums.map(a => a.date)].filter(Boolean).sort();
      so.since = ds[0] || '';
    });
    // 공식 유튜브 (data/yt_videos.json, 매일 자동): 제목의 '곡 이름'으로 곡에 붙여요
    let official = [];
    try { official = JSON.parse(raw.yt || '{}').videos || []; } catch (err) { /* 없으면 넘어가요 */ }
    // 방송사 공식 채널 영상 (data/yt_bc.json, 매일 자동): v.bc = 채널 이름, 날짜는 방송일
    try { const seenId = new Set(official.map(v => v.id)); official = official.concat((JSON.parse(raw.ytbc || '{}').videos || []).filter(v => !seenId.has(v.id))).sort((a, b) => b.date.localeCompare(a.date)); } catch (err) { /* 없으면 넘어가요 */ }
    const VIDEO_SONG_ALIAS = [
      [/spread silk on my heart|내 마음의 주단을 깔고/i, '내 마음에 주단을 깔고'], [/as i live|살다가/i, '살다가'], [/(^|[^a-z])till([^a-z]|$)/i, '사랑의 맹세(till)'],
      [/마마\s*\(mama\)|mama\s*\((원곡|original)|^mama\s*\(original/i, 'mama'], [/l'?immensit[aá]/i, "l'immensita"], [/my eden/i, 'my eden'], [/(^|[^a-z])angel([^a-z]|$)/i, 'angel'], [/내 나라 내 겨[례레]/, '내 나라 내 겨레'],
    ];
    const songByLoose = new Map([...songs.values()].map(so => [so.key.replace(/[^0-9a-z가-힣]/g, ''), so]));
    songs.forEach(so => { so.official = []; });
    const songScan = [...songs.values()].map(so => {
      const k = so.key, eng = !/[가-힣]/.test(k), words = k.match(/[0-9a-z']+/g) || [];
      if (eng ? words.length < 2 || k.length < 8 : k.replace(/[^가-힣0-9]/g, '').length < 4) return null;
      const body = eng ? words.map(w => w.replace(/'/g, "['’`]?")).join("[^0-9a-z]+") : k.replace(/[^가-힣0-9]/g, '').split('').join('\\s*');
      return [new RegExp(eng ? `(^|[^0-9a-z])${body}($|[^0-9a-z])` : `(?<![가-힣])${body}`, 'i'), so];
    }).filter(Boolean);
    official.forEach(v => {
      v.kind = v.bc && /직캠|fancam|focus|페이스캠/i.test(v.title) ? '직캠' : /shorts/i.test(v.title) || v.sec <= 60 ? '쇼츠' : /M\/V|\[MV\]|\bMV\b|뮤직비디오/.test(v.title) ? 'M/V' : /포레미파솔|behind|비하인드/i.test(v.title) ? '비하인드' : /live clip|라이브|live/i.test(v.title) ? '라이브' : /special clip|clip/i.test(v.title) ? '클립' : /lyric|리릭/i.test(v.title) ? '가사 영상' : /behind|비하인드|포레미파솔/i.test(v.title) ? '비하인드' : /teaser|hint|티저|logo/i.test(v.title) ? '티저' : /인터뷰|interview|티저|teaser|spot/i.test(v.title) ? '영상' : v.bc && !/모음|몰아보기|compilation|레전드 무대|댓글/i.test(v.title) && / - |무대|stage/i.test(v.title) ? '무대' : '영상';
      const seen = new Set();
      // 따옴표 안 이름 (In un'altra vita처럼 글자 사이 '는 건너뛰어요)
      [...[...v.title.matchAll(/[‘’'"“](.+?)[’'"”](?![0-9A-Za-z가-힣])/g)].map(m => m[0]), ...[...v.title.matchAll(/ - ([^(\[\]|]+?)\s*(?=\(|\[|\]|\||$)/g)].map(m => `'${m[1]}'`), ...[...v.title.matchAll(/^([^\-\[|]+?)\s+-\s+(?:포레스텔라|forestella)/gi)].map(m => `'${m[1]}'`)].forEach(q => {
        const so = songByLoose.get(songKey(q.slice(1, -1).replace(/\s*\([^)]*\)\s*$/, '')).replace(/[^0-9a-z가-힣]/g, ''));
        if (so && !seen.has(so) && !LINK_SKIP.has(`${v.id}>song:${so.key}`)) { seen.add(so); so.official.push(v); }
      });
      // 따옴표·'- 곡명' 꼴이 없으면 제목 속 곡 이름을 그대로 찾아요 (두 낱말 이상 영어 곡, 네 글자 이상 한글 곡만)
      if (!seen.size) songScan.forEach(([rx, so]) => {
        // 멤버 솔로 곡은 그 멤버 채널이거나 제목에 그 멤버 이름이 있을 때만 (엠카운트다운 → 카운트다운 같은 오연결 막기)
        const solo = !so.events.length && !so.tours.length && so.albums.length && so.albums.every(a => a.member) ? so.albums[0].member : '';
        if (solo && v.ch !== solo && !v.title.includes(solo.slice(1))) return;
        if (!seen.has(so) && rx.test(v.title) && !LINK_SKIP.has(`${v.id}>song:${so.key}`)) { seen.add(so); so.official.push(v); (v.loose = v.loose || []).push(so.key); }
      });
      // 짧은 곡 이름·영어 제목·오타는 따로 맞춰요 (Spread Silk On My Heart = 내 마음에 주단을 깔고 등)
      VIDEO_SONG_ALIAS.forEach(([rx, key]) => {
        const so = songs.get(key);
        if (so && !seen.has(so) && rx.test(v.title) && !LINK_SKIP.has(`${v.id}>song:${so.key}`)) { seen.add(so); so.official.push(v); }
      });
    });
    // 영상 → 멤버·음반·콘서트·일정 (제목 기준, 자동이라 가끔 틀릴 수 있어요)
    const flat = t => String(t).normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const ENG = { 배두훈: /baedoohoon|doohoon/i, 강형호: /kanghyungho|hyungho/i, 조민규: /chomingyu|mingyu/i, 고우림: /kowoorim|woorim/i };
    const GENERIC = new Set(['포레스텔라', 'forestella', '콘서트', '공연', '비하인드', '기념', '축하무대', '촬영', '현장', '특집', '단독', '초청', '함께하는', '시민과', '행사', '축제', '페스티벌', '열린음악회', 'kbs', 'kbs1', 'kbs2', 'mbc', 'sbs', 'festival', 'concert', 'live', 'behind', 'part', 'feat', '생일', '축하해', 'the', 'in', 'of', 'and', 'with', 'for', 'on', 'to', 'at', 'by', 'ep', 'vol', 'ver',
      // 멤버 이름·팬미팅 같은 말은 일정마다 겹쳐서 빼요
      '배두훈', '강형호', '조민규', '고우림', '두훈', '형호', '민규', '우림', 'pitta', 'kowoorim', '팬미팅', 'fanmeeting', 'fan', 'meeting', '앙코르', 'encore', '단독콘서트', 'log', 'vlog', '브이로그']);
    const words = t => (String(t).normalize('NFKC').match(/[0-9A-Za-z가-힣]{2,}/g) || []).map(w => w.toLowerCase()).filter(w => !GENERIC.has(w) && !/^\d+$|^\d+주년$/.test(w) && !/^포레미파솔/.test(w));
    const evWords = events.filter(e => !e.auto || e.title).map(e => ({ e, w: new Set(words(e.title)) }));
    const concertKeys = [...tours.map(t => ({ id: t.id, key: flat(t.name.replace(/^[\d-]+\s*/, '')), from: t.dates[0], to: t.dates[t.dates.length - 1] })),
      ...concerts.filter(c => !tours.some(t => t.id === c.id) && c.from).map(c => ({ id: c.id, key: flat(c.name.replace(/\(.*\)|[\d-]{4,}|포레스텔라|전국투어|콘서트|forestella|concert|show|\+\s*encore/gi, '')), from: c.from, to: c.to || c.from }))];
    const days = (a, b) => (new Date(a) - new Date(b)) / 864e5;
    // 방송 프로그램 이름 낱말 (일정명에서 [KBS2]·[멤버] 같은 머리말과 방송사 이름은 빼요) + 영어 제목 별칭
    const PROG_STOP = new Set(['kbs', 'kbs1', 'kbs2', 'mbc', 'sbs', 'jtbc', 'mnet', 'mbn', 'tvn', 'ebs', '포레스텔라', 'forestella', '방송', '특집', '출연', '녹화', '본방', '재방']);
    const progWords = t => (String(t).replace(/^\[[^\]]*\]\s*/, '').normalize('NFKC').match(/[0-9A-Za-z가-힣]{2,}/g) || []).map(w => w.toLowerCase()).filter(w => !PROG_STOP.has(w) && !/^\d+$/.test(w));
    const PROG_ALIAS = { 불후의: /immortal songs/i, 명곡: /immortal songs/i, 열린음악회: /open concert/i, 스케치북: /sketchbook/i, 뮤직뱅크: /music ?bank/i, 음악중심: /music ?core|예능연구소/i, 엠카운트다운: /m ?countdown|엠카/i, 가요대축제: /song festival/i, 복면가왕: /king of mask/i, 편스토랑: /fun_?staurant/i };
    official.forEach(v => {
      const t = v.title, ft = flat(t);
      v.members = MEMBERS.filter(m => t.includes(m) || t.includes(m.slice(1)) || ENG[m].test(t));
      if (v.members.length === 4) v.members = [];
      if (v.ch && !v.members.includes(v.ch)) v.members.unshift(v.ch);  // 멤버 개인 채널 영상
      const hit = RELEASES.find(([, rx]) => rx.test(t.normalize('NFKC').toLowerCase()));
      v.rel = hit && v.kind !== '쇼츠' ? hit[0] : '';
      const cs = concertKeys.filter(c => c.key.length >= 4 && ft.includes(c.key) && days(v.date, c.from) >= -90)
        .sort((a, b) => b.key.length - a.key.length || Math.abs(days(v.date, a.to)) - Math.abs(days(v.date, b.to)));
      v.tour = cs[0] && !/m\/v|teaser|lyric|highlight medley|jacket|album|앨범|coming soon/i.test(t) ? cs[0].id : '';
      v.event = null;
      // 비하인드는 행사 뒤 400일까지, 무대·클립 영상은 60일까지 (쇼츠·M/V·가사·티저는 빼요)
      const behind = v.kind === '비하인드' && !/m\/v|jacket|making|shooting/i.test(t);
      const stage = ['라이브', '클립', '영상', '무대', '직캠'].includes(v.kind) && !/recap|인사|greeting|예고|preview|d-\d|exhibition|메이킹|making/i.test(t);
      if (v.bc) {
        // 방송사 영상: 방송 일정(공연 제외)만, 프로그램 이름이 제목에 있고 날짜가 가까운 것 (재업로드가 많아 날짜만으로는 안 붙여요)
        if (v.tour || !(behind || stage) || /모음|몰아보기|compilation|댓글|리액션/i.test(v.title)) return;
        const fv = flat(v.title) + ' ' + Object.entries(PROG_ALIAS).filter(([, rx]) => rx.test(v.title)).map(([k]) => k).join(' ');
        let best = null, score = 0, bgap = 1e9;
        const cand = [];
        events.forEach(e => {
          if (e.category === '공연' || LINK_SKIP.has(`${v.id}>ev:${e.id}`)) return;
          const gap = days(v.date, e.date);
          if (gap < -1 || gap > (behind ? 400 : 14)) return;
          // 제작사·소속사 채널은 방송사가 아니라서 그날(하루 차이까지) 일정에만 붙여요
          if (PROD_CH.test(v.bc) && Math.abs(gap) > 1) return;
          const sc = progWords(e.title).filter(w => fv.includes(w)).reduce((n, w) => n + w.length, 0);
          if (sc >= 2) cand.push({ sc, gap: Math.abs(gap) });
          if (sc >= 2 && (sc > score || (sc === score && Math.abs(gap) < bgap))) { best = e; score = sc; bgap = Math.abs(gap); }
        });
        // 프로그램 이름이 제목에 없으면: 같은 날(하루 차이까지) 같은 방송사 방송 일정이 딱 하나일 때만 붙여요
        const net = (v.bc.match(/^(KBS|MBC|SBS|JTBC|Mnet|MBN|tvN|EBS)/i) || [])[1];
        if (!best && net && !behind && !Object.keys(PROG_ALIAS).some(k => fv.includes(k))) {
          const same = events.filter(e => e.category !== '공연' && !LINK_SKIP.has(`${v.id}>ev:${e.id}`) && new RegExp(net, 'i').test(e.title) && days(v.date, e.date) >= 0 && days(v.date, e.date) <= 1);
          if (same.length === 1) { best = same[0]; bgap = days(v.date, best.date); score = 0; }
        }
        if (best) { v.event = best; const tie = cand.filter(c => c.sc >= score && Math.abs(c.gap - bgap) <= 2).length - 1;
          v.evWhy = [bgap >= 3 && `날짜 ${Math.round(bgap)}일 차이`, tie > 0 && `비슷한 일정 ${tie + 1}개 중 하나`, !score && '제목에 프로그램 이름이 없어 날짜·방송사로 붙임'].filter(Boolean); (behind ? (best.ytBehind = best.ytBehind || []) : (best.ytStage = best.ytStage || [])).push(v); }
        return;
      }
      if (!v.tour && (behind || stage)) {
        const yymmdd = (t.match(/\b(\d{2})(\d{2})(\d{2})\b/) || []);
        const vw = words(t);
        // 제목 따옴표 속 곡('Abracadabra')이 있는데, 곡이 정해진 일정의 곡 목록에 없으면 그 일정엔 안 붙여요
        const qs = (t.match(/['‘"“]([^'’"”]{2,40})['’"”]/) || [])[1];
        const qk = qs && songKey(qs);
        let best = null, score = 0;
        const cands = [];
        evWords.forEach(({ e, w }) => {
          if (LINK_SKIP.has(`${v.id}>ev:${e.id}`)) return;
          if (qk && e.songKeys.length && songs.has(qk) && !e.songKeys.includes(qk)) return;
          const gap = days(v.date, e.date);
          if (gap < 0 || gap > (behind ? 400 : 60)) return;
          let sc = vw.filter(x => w.has(x)).reduce((n, x) => n + x.length, 0);
          if (yymmdd[0] && e.date === `20${yymmdd[1]}-${yymmdd[2]}-${yymmdd[3]}`) sc += 10;
          if (sc) cands.push({ e, sc });
          if (sc > score || (sc === score && best && gap < days(v.date, best.date))) { if (sc) { score = sc; best = e; } }
        });
        if (best && score >= (behind ? 3 : 4)) {
          v.event = best;
          const g = days(v.date, best.date);
          v.evWhy = [!behind && g >= 7 && `날짜 ${Math.round(g)}일 차이`, score < 6 && '제목 낱말이 조금만 겹침'].filter(Boolean);
          // "연예대상, 연기대상"처럼 한 영상에 행사가 여럿이면 가까운 날(30일 안) 비슷하게 맞는 일정에도 붙여요
          const more = cands.filter(c => c.e !== best && c.sc >= 3 && c.sc >= score * 0.6 && Math.abs(days(c.e.date, best.date)) <= 30).map(c => c.e).slice(0, 3);
          if (more.length) { v.evMore = more; v.evWhy.push(`일정 ${more.length + 1}곳에 같이 붙음`); }
          [best, ...more].forEach(e => {
            if (behind) (e.ytBehind = e.ytBehind || []).push(v);
            else (e.ytStage = e.ytStage || []).push(v);
          });
        }
      }
    });
    // 일정 대표 영상: 시트 영상ID가 없으면 공식 무대 영상 → 공식 비하인드 순으로
    events.forEach(e => {
      if (e.videoId) return;
      const v = (e.ytStage || [])[0] || (e.ytBehind || [])[0];
      if (v) e.ytMain = v;
    });
    // 방송사 무대 영상 → 곡 무대 목록: 이어진 일정(또는 같은 날 방송 일정)이 있으면 그 일정에 곡을 붙이고, 없으면 영상만으로 무대 한 줄을 만들어요
    const ytStages = new Map();
    songs.forEach(so => {
      let added = false;
      so.official.filter(v => v.bc && ['무대', '직캠', '라이브'].includes(v.kind)).sort((a, b) => (a.kind === '직캠') - (b.kind === '직캠')).forEach(v => {
        const e = v.event;
        if (e) {
          if (!so.events.includes(e)) { so.events.push(e); added = true; }
          if (!e.songKeys.includes(so.key)) { e.songs.push(so.name); e.songKeys.push(so.key); }
          if (!e.videoId && !e.ytMain) e.ytMain = v;
          return;
        }
        if (so.events.some(x => x.date === v.date)) return;  // 같은 날 직캠·풀버전은 한 줄만
        const prog = ((v.title.match(/\[([^\]]+)\]/g) || []).map(s => s.slice(1, -1).split(/[/,|]/)[0].trim()).find(s => !/직캠|focus|4k|eng|페이스캠|가로|세로|fancam/i.test(s)) || v.bc).replace(/\s*EP\.?\s*\d+.*$/i, '');
        const st = { id: 'yt-' + v.id, ytOnly: v, date: v.date, category: 'TV', title: prog, place: v.bc, songs: [so.name], songKeys: [so.key], related: [], members: v.members || [], videoId: v.id };
        so.events.push(st); added = true;
        ytStages.set(st.id, st);
        byId.set(st.id, st);  // 일정 상세 창으로 열 수 있게
      });
      if (added) {
        so.events.sort((a, b) => a.date.localeCompare(b.date));
        so.first = so.events[0]; so.last = so.events[so.events.length - 1];
      }
    });
    // 유튜브 뮤직 공식 음원 → 곡의 '음원' 칸 (앨범의 그 곡 링크, 연주곡은 빼요)
    let ytm = [];
    try { ytm = JSON.parse(raw.ytm || '{}').tracks || []; } catch (err) { /* 없으면 넘어가요 */ }
    let ytml = {};
    try { ytml = JSON.parse(raw.ytml || '{}'); } catch (err) { /* 없으면 넘어가요 */ }
    ytm.forEach(t => { t.links = ytml[t.id] || {}; });
    const looseKey = k => k.replace(/[^0-9a-z가-힣]/g, '');
    const songLoose = new Map([...songs.values()].map(so => [looseKey(so.key), so]));
    ytm.forEach(t => {
      if (!t.date || /instrumental|\(inst|- inst/i.test(t.title)) return;
      const clean = t.title.replace(/[`’]/g, "'").replace(/\s+-\s+.*$/, '');
      const k = songKey(clean);
      const so = songs.get(k) || songLoose.get(looseKey(k));
      if (!so) return;
      so.tracks = so.tracks || [];
      if (!so.tracks.some(x => x.album === t.album)) so.tracks.push(t);
    });
    songs.forEach(so => { so.tracks = (so.tracks || []).sort((a, b) => a.date.localeCompare(b.date)); });
    // 수정 님이 올려 준 표지 (저장소 covers/ 폴더). 시트 "사진" 칸이 비어 있을 때 써요
    const LOCAL_COVERS = {
      '새야 새야 파랑새야 (녹두꽃 OST Part.1)': 'nokdu-ost1', '춘향난봉가 OST (AUX)': 'chunhyang-ost', 'Melody In Sad Love (JG 하모니)': 'melody-in-sad-love',
      '후니제이 (Huni.J) The First Mini Album': 'hunij-mini1', 'Sizzle 너와 나 사이 (이주원)': 'sizzle-between', '연후애': 'yeonhooae', '가슴으로': 'gaseumeuro',
      'VANTA BLACK (벤타블랙 X PITTA) OST': 'vanta-black-ost', '조립식 가족 OST Part 2': 'assembled-family-ost2', '감사합니다 OST Part 1': 'thank-you-ost1', '이 노래': 'i-norae', '해무 (feat. 박다울)': 'haemu',
      '디 엠파이어: 법의 제국 OST Part 3': 'the-empire-ost3', '오페라 콜라주 카사노바 길들이기': 'taming-casanova',
      'ID: PITTA': 'id-pitta', 'New Normal Life': 'new-normal-life', 'Paradox': 'paradox', '로또싱어 4회': 'lotto-singer-ep4', '로또싱어 5회': 'lotto-singer-ep5', '로또싱어 15회': 'lotto-singer-ep15',
    };
    albums.forEach(al => { if (!al.img && LOCAL_COVERS[al.name]) al.img = 'covers/' + LOCAL_COVERS[al.name] + '.jpg'; });
    // 시트에 표지가 없는 음반은 유튜브 뮤직 공식 음원 썸네일(앨범 아트)로 채워요. 발매일이 가장 가까운 음원으로
    albums.forEach(al => {
      if (al.img) return;
      const day = s => Date.parse(s || '') || 0;
      const cand = (al.tracks || []).flatMap(t => { const so = songs.get(songKey(t)); return so ? so.tracks || [] : []; });
      const best = cand.sort((x, y) => Math.abs(day(x.date) - day(al.date)) - Math.abs(day(y.date) - day(al.date)))[0];
      if (best) { al.img = `https://i.ytimg.com/vi/${best.id}/hqdefault.jpg`; al.imgYt = true; }
    });
    // 음반에 붙는 영상·글: 발매 150일 전 ~ 180일 뒤 것만 남기고(나중 무대·콘서트 영상은 곡 페이지에서 봐요),
    // RELEASES에 없는 음반은 앨범명·타이틀곡으로 찾아요. 멤버 음반은 그 멤버 영상·글만
    const relDay = s => Date.parse(s || '') || 0;
    const inWin = (d, a) => { const g = (relDay(d) - relDay(a.date)) / 864e5; return g >= -150 && g <= 180; };
    const albOfKey = new Map(albums.map(a => [a.rel || a.name, a]));
    const relLow = t => t.normalize('NFKC').toLowerCase();
    const relEsc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const albPats = albums.filter(a => a.date && !/방송 음원/.test(a.kind || '') && !albOfKey.get(a.rel || a.name).rel).map(a => {
      const words = new Set();
      const nm = relLow(a.name);
      nm.split(/\s*[()]\s*/).forEach(w => words.add(w.replace(/\s*ost.*$/, '').trim()));
      if ((a.tracks || []).length <= 3 || a.title) (a.title ? a.title.split(' / ') : a.tracks).forEach(t => words.add(relLow(t).replace(/\s*\(.*$/, '').trim()));
      const ws = [...words].filter(w => w.length >= 3 && !/^(intro|inst\.?|mr)$/.test(w));
      return ws.length ? { a, key: a.rel || a.name, rx: new RegExp(ws.map(w => (/^[a-z]/.test(w) ? '\\b' : '') + relEsc(w) + (/[a-z]$/.test(w) ? '\\b' : '')).join('|')) } : null;
    }).filter(Boolean);
    const relFor = (text, date, mems) => {
      const t = relLow(text);
      const hit = albPats.filter(x => inWin(date, x.a) && x.rx.test(t) && (!x.a.member || mems.includes(x.a.member)))
        .sort((x, y) => Math.abs(relDay(date) - relDay(x.a.date)) - Math.abs(relDay(date) - relDay(y.a.date)))[0];
      return hit ? hit.key : '';
    };
    xFeed.forEach(p => {
      const a = p.rel && albOfKey.get(p.rel);
      if (a && !inWin(p.date, a)) p.rel = '';
      if (!p.rel && /음반|컴백|투표/.test(p.cat)) p.rel = relFor(p.raw, p.date, p.m || []);
    });
    official.forEach(v => {
      const a = v.rel && albOfKey.get(v.rel);
      if (a && !inWin(v.date, a)) v.rel = '';
      if (!v.rel && v.kind !== '쇼츠' && !v.bc) v.rel = relFor(v.title, v.date, v.members || []);
    });
    // 공식 X 글 → 콘서트: 공연 일정에 붙은 글 + 글에 콘서트 이름이 나오고 공연 앞 120일~뒤 60일 안의 글
    const tourOfEv = new Map();
    tours.forEach(t => (t.events || []).forEach(e => tourOfEv.set(e.id, t.id)));
    xFeed.forEach(p => {
      p.tour = tourOfEv.get(p.after) || tourOfEv.get(p.behind) || '';
      if (p.tour || p.rel || /음반|컴백/.test(p.cat)) return;
      const ft = flat(p.raw);
      const c = concertKeys.filter(c => c.key.length >= 4 && ft.includes(c.key) && days(p.date, c.from) >= -120 && days(p.date, c.to) <= 60)
        .sort((a, b) => b.key.length - a.key.length)[0];
      if (c) p.tour = c.id;
    });
    // 합친 곡의 대표 이름
    // 한국어 제목이 있는 곡은 '한국어 (영어)'로 (유튜브 뮤직 공식 음원 기준). so.match는 글·영상 찾을 때 쓰는 원래 이름
    const SONG_NAME = { mama: 'MAMA', '정신차려': '정신차려', 'nella fantasia': 'Nella Fantasia', '시간여행': '시간여행 (Time Travel)', '달의 아들': '달의 아들 (Hijo de la Luna)', 'white night': '백야 (White Night)',
      '그리고 봄': '그리고 봄 (And Spring)', '창귀': '창귀 (CHANGGWI)', '달하 노피곰 도다샤': '달하 노피곰 도다샤 (Dear Moon)', '마법의 성': '마법의 성 (Magic Castle)',
      '꽃병': '꽃병 (Flower Vase)', '야상곡': '야상곡 (Nocturne)', '새야 새야 파랑새야': '새야 새야 파랑새야 (Bird, Bird, Blue Bird)', '바람이 건네준 말': '바람이 건네준 말 (Words From The Wind)',
      '함께라는 이유': '함께라는 이유 (Together)', '연': '연 (Ties)', '눈물 속에 홀로': '눈물 속에 홀로 (Alone With Tears)', '순정마초': '순정마초 (The Innocent Macho)',
      '아직도 기억하고 있어요': '아직도 기억하고 있어요 (I Still Remember)', '멀어지지 말아주세요': '멀어지지 말아주세요 (Stay)', '숲의 노래': '숲의 노래 (The Forest Song)',
      '당신이 듣던': '당신이 듣던 (Your Song)', '눈을 감아도': '눈을 감아도 (Close Your Eyes)', '사랑의 여정': '사랑의 여정 (The Journey of Love)',
      'thorn bird': '가시나무새 (Thorn Bird)', gashiri: '가시리 (Gashiri)', 'wrongful encounter': '악연 (Wrongful Encounter)', '사랑의 맹세(till)': '사랑의 맹세 (Till)' };
    songs.forEach(so => { so.match = so.match || so.name; if (SONG_NAME[so.key]) so.name = SONG_NAME[so.key]; });
    let career = [];
    try { career = JSON.parse(raw.career || '{}').items || []; } catch (e) { /* 없으면 넘어가요 */ }
    return { events, videos, reports, byId, songs, tours, xFeed, albums, concerts, official, career, extra, evMarks, dtMarks, delReqs, fan, pins, hidden: hidden.map(e => ({ id: e.id, date: e.date, title: e.title })), savedAt: raw.savedAt };
  }

  // 저장된 데이터가 있으면 바로 보여주고, 오래됐으면 뒤에서 새로 받아요.
  // onUpdate는 새 데이터가 도착했을 때 다시 그리라고 불러요.
  async function load(onUpdate) {
    const cached = readCache();
    // 시트 주소가 바뀌었으면(새 탭 연결 등) 저장본을 버려요.
    const fresh = cached && 'ytml' in cached && cached.sheets === JSON.stringify(window.CONFIG.sheets) + (window.CONFIG.dataVer || '') && Date.now() - cached.savedAt < window.CONFIG.cacheMinutes * 60000;
    // 하루 넘은 저장본은 너무 옛날 거라 먼저 보여주지 않고 새로 받아요
    const tooOld = cached && Date.now() - cached.savedAt > 24 * 3600e3;
    if (cached && !tooOld) {
      if (!fresh) {
        const again = (n) => fetchAll().then(raw => { writeCache(raw); onUpdate(build(raw)); }).catch(() => { if (n) setTimeout(() => again(n - 1), 5000); });
        again(2);
      }
      return build(cached);
    }
    // 처음 방문: X 글은 따로 받아서, 도착하면 다시 그려요
    const xText = fetchText(window.CONFIG.sheets.x).catch(() => '');
    const raw = await fetchAll(false);
    // 화면에 첫 데이터가 들어간 다음에 바꿔 끼우도록 한 박자 늦춰요
    xText.then(x => setTimeout(() => { raw.xsheet = x; writeCache(raw); if (x) onUpdate(build(raw)); }, 0));
    return Object.assign(build(raw), { xPending: true });
  }

  window.DATA_LINK_SKIP = LINK_SKIP;
  // 의견 탭: 제보 폼 '종류: 의견' 줄과 '종류: 의견처리'(관리자 서명) 줄
  // 시트 시간대가 미국 시간이던 동안 들어온 줄은 16시간 늦게 찍혀 있어요 → 화면에선 한국 시간으로 고쳐 보여줘요 (config.tsFix)
  function fixTs(t) {
    const fx = (window.CONFIG || {}).tsFix, m = String(t || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!fx || !m) return t;
    const h = Number(m[5]) % 12 + (m[4] === '오후' ? 12 : 0);
    const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], h, +m[6], +(m[7] || 0)));
    if (d.toISOString().slice(0, 16).replace('T', ' ') >= fx.before) return t;
    d.setUTCHours(d.getUTCHours() + fx.hours);
    const H = d.getUTCHours(), p2 = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()} ${H < 12 ? '오전' : '오후'} ${H % 12 || 12}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  }
  // 시트 시간 글자 → 숫자(ms, 한국 시간)
  function tsMs(t) {
    const m = String(fixTs(t) || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return 0;
    return Date.UTC(+m[1], m[2] - 1, +m[3], Number(m[5]) % 12 + (m[4] === '오후' ? 12 : 0), +m[6], +(m[7] || 0)) - 9 * 3600e3;
  }
  function buildOpinions(text) {
    const rows = buildReports(toObjects(text || ''), true);
    const ops = rows.filter(r => r.type === '의견' && r.message).map(r => ({ id: 'o' + slVer([r.time, r.by, r.message]), time: fixTs(r.time), cat: line0(r, '분류'), ev: r.title, text: ((r.raw || '').match(/^[ \t]*내용[ \t]*[:：][ \t]*([\s\S]*)$/m) || [])[1] || r.message, name: line0(r, '이름'), by: r.by, parent: line0(r, '답글'), prev: line0(r, '이어'), key: line0(r, '열쇠'), photo: line0(r, '사진') }));
    const marks = rows.filter(r => r.type === '의견처리').map(r => ({ id: line0(r, '대상'), state: line0(r, '상태'), n: line0(r, '번호'), sig: line0(r, '서명') })).filter(m => m.id && m.sig);
    // 지우기: 쓴 사람(누가)이 같을 때만 앱에서 인정해요
    const dels = rows.filter(r => r.type === '의견삭제').map(r => ({ id: line0(r, '대상'), by: r.by })).filter(d => d.id && d.by);
    return { ops, marks, dels };
  }
  window.DATA = { load, rebuild: () => lastRaw && build(lastRaw), parseCSV, normDate, songKey, setlistName, slVer, buildOpinions, fetchText };
})();
