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
    // 끝의 (한글)·(with …)·(… ver.)·(Special Track)·(feat. …) 같은 꼬리표는 여러 개여도 빼요
    let prev;
    do { prev = n; n = n.replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => /[가-힣]|^with\s|ver\.?$|version|special track|^feat\.|remaster|^inst|^to\.\s/i.test(inner) || inner.trim().toLowerCase() === n.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase() ? '' : m); } while (n !== prev);
    return n.trim();
  }
  // 같은 곡인데 표기가 다른 것 (왼쪽 → 오른쪽 이름으로 합쳐요)
  const SONG_SAME = { "l'immensità": "l'immensita", 'parla più piano': 'parla piu piano', '마마(mama)': 'mama', '화이트 나이트': 'white night', '피아노맨': 'piano man', '세이브 아워 라이브즈': 'save our lives', '샤갈스 드림': "chagall's dream", 'hijo de la luna': '달의 아들', '달의 아들 (hijo de la luna)': '달의 아들', '넬라 판타지아': 'nella fantasia', 'time travel': '시간여행', 'la ultima noche': 'ultima noche', '김경호&강형호 - 정신차려': '정신차려',
    // 유튜브 뮤직 영어 제목 → 한국어 제목 (2026-10-18 유튜브 뮤직·음반 정보 수록곡 대조)
    'magic castle': '마법의 성', 'flower vase': '꽃병', nocturne: '야상곡', 'dear moon': '달하 노피곰 도다샤', 'and spring': '그리고 봄', changgwi: '창귀',
    'bird, bird, blue bird': '새야 새야 파랑새야', 'words from the wind': '바람이 건네준 말', together: '함께라는 이유', ties: '연', '연(緣)': '연',
    'alone with tears': '눈물 속에 홀로', 'the innocent macho': '순정마초', 'i still remember': '아직도 기억하고 있어요', stay: '멀어지지 말아주세요',
    'the forest song': '숲의 노래', 'your song': '당신이 듣던', 'close your eyes': '눈을 감아도', 'the journey of love': '사랑의 여정' };
  // 자동 연결 점검에서 '틀려요'로 고른 연결 (영상ID>ev:일정ID · 영상ID>song:곡키 · x:글ID>song:곡키)
  const LINK_SKIP = new Set([
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

  // withX가 false면 공식X 탭(가장 큰 시트)은 빼고 받아요. 처음 방문 때 화면을 먼저 띄우려고요.
  async function fetchAll(withX = true) {
    const s = window.CONFIG.sheets;
    const [events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt, ytbc, ytm, ytml, xlinks, xphotos] = await Promise.all([
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
    ]);
    return { events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt, ytbc, ytm, ytml, xlinks, xphotos, sheets: JSON.stringify(s), savedAt: Date.now() };
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function writeCache(raw) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (e) { /* 저장 공간이 없으면 넘어가요 */ }
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

  function build(raw) {
    const sheetRows = toObjects(raw.events);
    const events = buildEvents(sheetRows).concat(raw.cafe ? buildCafe(raw.cafe, sheetRows) : [])
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const videos = buildVideos(toObjects(raw.videos));
    const reports = raw.reports ? buildReports(toObjects(raw.reports)) : [];
    const byId = new Map(events.map(e => [e.id, e]));
    events.forEach(e => { e.related = []; });
    // 콘서트 셋리스트 (나무위키·기사 기준) 붙이기
    let tours = [];
    try { tours = JSON.parse(raw.setlists || '{}').tours || []; } catch (err) { /* 없으면 넘어가요 */ }
    tours.forEach(t => { t.events = []; });
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
    const xFeed = toObjects(raw.xsheet || '').filter(r => r['링크']).map(r => ({
      id: r['링크'].split('/').pop(),
      url: r['링크'],
      date: normDate(r['날짜']) || r['날짜'],
      cat: r['종류'] || '사진·일상',
      m: (r['멤버'] || '').split(',').map(x => x.trim()).filter(Boolean),
      text: xClean(r['글'] || ''),
      raw: r['글'] || '',
      links: linksOf(r['링크'].split('/').pop(), r['글'] || ''),
      img: r['사진'] || '',
      imgs: xPhotos[r['링크'].split('/').pop()] || [],
      after: r['후기 일정ID'] || '',
      behind: r['비하인드 일정ID'] || '',
      rel: r['음반'] || '',
    })).sort((a, b) => (a.id.length - b.id.length) || (a.id < b.id ? -1 : 1));
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
    tours.forEach(t => t.songs.forEach(s => s.t.split(' / ').forEach(part => {
      const so = songs.get(songKey(setlistName(part)));
      if (so && !so.tours.includes(t)) so.tours.push(t);
    })));
    // 음반 정보 (시트 "음반 정보" 탭)
    const albums = toObjects(raw.albums || '').filter(a => a['앨범명']).map(a => ({
      name: a['앨범명'], member: a['멤버'] || '', kind: a['종류'], date: normDate(a['발매일']) || a['발매일'], title: a['타이틀곡'],
      tracks: (a['수록곡'] || '').split(' / ').map(t => t.trim()).filter(Boolean), credit: a['타이틀 작사·작곡'],
      label: a['기획사·유통사'], rel: a['음반 이야기 이름'], img: a['사진'],
      src: [a['출처1'], a['출처2']].filter(u => /^https?:/.test(u || '')), ok: a['확인'] !== '확인 중', note: a['비고'],
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
    // 콘서트 정보 (시트 "콘서트 정보" 탭). 투어ID가 셋리스트와 같으면 서로 이어 붙여요.
    const urls = t => (t || '').split(/[\s;]+/).filter(u => /^https?:/.test(u));
    const concerts = toObjects(raw.concerts || '').filter(c => c['투어ID'] && c['공연명']).map(c => {
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
    tours.forEach(t => t.songs.forEach(s => s.t.split(' / ').forEach(part => {
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
    const songByLoose = new Map([...songs.values()].map(so => [so.key.replace(/[^0-9a-z가-힣]/g, ''), so]));
    songs.forEach(so => { so.official = []; });
    const songScan = [...songs.values()].map(so => {
      const k = so.key, eng = !/[가-힣]/.test(k), words = k.match(/[0-9a-z']+/g) || [];
      if (eng ? words.length < 2 || k.length < 8 : k.replace(/[^가-힣0-9]/g, '').length < 4) return null;
      const body = eng ? words.map(w => w.replace(/'/g, "['’`]?")).join("[^0-9a-z]+") : k.replace(/[^가-힣0-9]/g, '').split('').join('\\s*');
      return [new RegExp(eng ? `(^|[^0-9a-z])${body}($|[^0-9a-z])` : `(?<![가-힣])${body}`, 'i'), so];
    }).filter(Boolean);
    official.forEach(v => {
      v.kind = v.bc && /직캠|fancam|focus|페이스캠/i.test(v.title) ? '직캠' : /shorts/i.test(v.title) || v.sec <= 60 ? '쇼츠' : /M\/V|뮤직비디오/i.test(v.title) ? 'M/V' : /포레미파솔|behind|비하인드/i.test(v.title) ? '비하인드' : /live clip|라이브|live/i.test(v.title) ? '라이브' : /special clip|clip/i.test(v.title) ? '클립' : /lyric/i.test(v.title) ? '가사 영상' : /behind|비하인드|포레미파솔/i.test(v.title) ? '비하인드' : /teaser|hint|티저|logo/i.test(v.title) ? '티저' : v.bc && !/모음|몰아보기|compilation|레전드 무대|댓글/i.test(v.title) && / - |무대|stage/i.test(v.title) ? '무대' : '영상';
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
    });
    // 영상 → 멤버·음반·콘서트·일정 (제목 기준, 자동이라 가끔 틀릴 수 있어요)
    const flat = t => String(t).normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const ENG = { 배두훈: /baedoohoon|doohoon/i, 강형호: /kanghyungho|hyungho/i, 조민규: /chomingyu|mingyu/i, 고우림: /kowoorim|woorim/i };
    const GENERIC = new Set(['포레스텔라', 'forestella', '콘서트', '공연', '비하인드', '기념', '축하무대', '촬영', '현장', '특집', '단독', '초청', '함께하는', '시민과', '행사', '축제', '페스티벌', '열린음악회', 'kbs', 'kbs1', 'kbs2', 'mbc', 'sbs', 'festival', 'concert', 'live', 'behind', 'part', 'feat', '생일', '축하해', 'the', 'in', 'of', 'and', 'with', 'for', 'on', 'to', 'at', 'by', 'ep', 'vol', 'ver']);
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
          const sc = progWords(e.title).filter(w => fv.includes(w)).reduce((n, w) => n + w.length, 0);
          if (sc >= 2) cand.push({ sc, gap: Math.abs(gap) });
          if (sc >= 2 && (sc > score || (sc === score && Math.abs(gap) < bgap))) { best = e; score = sc; bgap = Math.abs(gap); }
        });
        if (best) { v.event = best; const tie = cand.filter(c => c.sc >= score && Math.abs(c.gap - bgap) <= 2).length - 1;
          v.evWhy = [bgap >= 3 && `날짜 ${Math.round(bgap)}일 차이`, tie > 0 && `비슷한 일정 ${tie + 1}개 중 하나`].filter(Boolean); (behind ? (best.ytBehind = best.ytBehind || []) : (best.ytStage = best.ytStage || [])).push(v); }
        return;
      }
      if (!v.tour && (behind || stage)) {
        const yymmdd = (t.match(/\b(\d{2})(\d{2})(\d{2})\b/) || []);
        const vw = words(t);
        let best = null, score = 0;
        const cands = [];
        evWords.forEach(({ e, w }) => {
          if (LINK_SKIP.has(`${v.id}>ev:${e.id}`)) return;
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
    return { events, videos, reports, byId, songs, tours, xFeed, albums, concerts, official, savedAt: raw.savedAt };
  }

  // 저장된 데이터가 있으면 바로 보여주고, 오래됐으면 뒤에서 새로 받아요.
  // onUpdate는 새 데이터가 도착했을 때 다시 그리라고 불러요.
  async function load(onUpdate) {
    const cached = readCache();
    // 시트 주소가 바뀌었으면(새 탭 연결 등) 저장본을 버려요.
    const fresh = cached && 'ytml' in cached && cached.sheets === JSON.stringify(window.CONFIG.sheets) && Date.now() - cached.savedAt < window.CONFIG.cacheMinutes * 60000;
    if (cached) {
      if (!fresh) {
        fetchAll().then(raw => { writeCache(raw); onUpdate(build(raw)); }).catch(() => {});
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
  window.DATA = { load, parseCSV, normDate, songKey, setlistName };
})();
