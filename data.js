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

  // withX가 false면 공식X 탭(가장 큰 시트)은 빼고 받아요. 처음 방문 때 화면을 먼저 띄우려고요.
  async function fetchAll(withX = true) {
    const s = window.CONFIG.sheets;
    const [events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt] = await Promise.all([
      fetchText(s.events),
      fetchText(s.videos),
      fetchText(s.reports).catch(() => ''),
      fetchText('cafe.json').catch(() => ''),
      fetchText('setlists.json').catch(() => ''),
      withX ? fetchText(s.x).catch(() => '') : '',
      s.albums ? fetchText(s.albums).catch(() => '') : '',
      s.concerts ? fetchText(s.concerts).catch(() => '') : '',
      fetchText('data/yt_videos.json').catch(() => ''),
    ]);
    return { events, videos, reports, cafe, setlists, xsheet, albums, concerts, yt, sheets: JSON.stringify(s), savedAt: Date.now() };
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
    const xFeed = toObjects(raw.xsheet || '').filter(r => r['링크']).map(r => ({
      id: r['링크'].split('/').pop(),
      url: r['링크'],
      date: normDate(r['날짜']) || r['날짜'],
      cat: r['종류'] || '사진·일상',
      m: (r['멤버'] || '').split(',').map(x => x.trim()).filter(Boolean),
      text: xClean(r['글'] || ''),
      raw: r['글'] || '',
      img: r['사진'] || '',
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
    const songByLoose = new Map([...songs.values()].map(so => [so.key.replace(/[^0-9a-z가-힣]/g, ''), so]));
    songs.forEach(so => { so.official = []; });
    official.forEach(v => {
      v.kind = /shorts/i.test(v.title) || v.sec <= 60 ? '쇼츠' : /M\/V|뮤직비디오/i.test(v.title) ? 'M/V' : /live clip|라이브|live/i.test(v.title) ? '라이브' : /special clip|clip/i.test(v.title) ? '클립' : /lyric/i.test(v.title) ? '가사 영상' : /behind|비하인드|포레미파솔/i.test(v.title) ? '비하인드' : /teaser|hint|티저|logo/i.test(v.title) ? '티저' : '영상';
      const seen = new Set();
      // 따옴표 안 이름 (In un'altra vita처럼 글자 사이 '는 건너뛰어요)
      [...[...v.title.matchAll(/[‘’'"“](.+?)[’'"”](?![0-9A-Za-z가-힣])/g)].map(m => m[0]), ...[...v.title.matchAll(/ - ([^(\[|]+?)\s*(?=\(|\[|\||$)/g)].map(m => `'${m[1]}'`)].forEach(q => {
        const so = songByLoose.get(songKey(q.slice(1, -1).replace(/\s*\([^)]*\)\s*$/, '')).replace(/[^0-9a-z가-힣]/g, ''));
        if (so && !seen.has(so)) { seen.add(so); so.official.push(v); }
      });
    });
    // 영상 → 멤버·음반·콘서트·일정 (제목 기준, 자동이라 가끔 틀릴 수 있어요)
    const flat = t => String(t).normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
    const ENG = { 배두훈: /baedoohoon|doohoon/i, 강형호: /kanghyungho|hyungho/i, 조민규: /chomingyu|mingyu/i, 고우림: /kowoorim|woorim/i };
    const GENERIC = new Set(['포레스텔라', 'forestella', '콘서트', '공연', '비하인드', '기념', '축하무대', '촬영', '현장', '특집', '단독', '초청', '함께하는', '시민과', '행사', '축제', '페스티벌', '열린음악회', 'kbs', 'kbs1', 'kbs2', 'mbc', 'sbs', 'festival', 'concert', 'live', 'behind', 'part', 'feat']);
    const words = t => (String(t).normalize('NFKC').match(/[0-9A-Za-z가-힣]{2,}/g) || []).map(w => w.toLowerCase()).filter(w => !GENERIC.has(w) && !/^\d+$|^\d+주년$/.test(w) && !/^포레미파솔/.test(w));
    const evWords = events.filter(e => !e.auto || e.title).map(e => ({ e, w: new Set(words(e.title)) }));
    const concertKeys = [...tours.map(t => ({ id: t.id, key: flat(t.name.replace(/^[\d-]+\s*/, '')), from: t.dates[0], to: t.dates[t.dates.length - 1] })),
      ...concerts.filter(c => !tours.some(t => t.id === c.id) && c.from).map(c => ({ id: c.id, key: flat(c.name.replace(/\(.*\)|[\d-]{4,}|포레스텔라|전국투어|콘서트|forestella|concert|show|\+\s*encore/gi, '')), from: c.from, to: c.to || c.from }))];
    const days = (a, b) => (new Date(a) - new Date(b)) / 864e5;
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
      if (v.kind === '비하인드' && !v.tour && !/m\/v|jacket|making|shooting/i.test(t)) {
        const yymmdd = (t.match(/\b(\d{2})(\d{2})(\d{2})\b/) || []);
        const vw = words(t);
        let best = null, score = 0;
        evWords.forEach(({ e, w }) => {
          const gap = days(v.date, e.date);
          if (gap < 0 || gap > 400) return;
          let sc = vw.filter(x => w.has(x)).reduce((n, x) => n + x.length, 0);
          if (yymmdd[0] && e.date === `20${yymmdd[1]}-${yymmdd[2]}-${yymmdd[3]}`) sc += 10;
          if (sc > score || (sc === score && best && gap < days(v.date, best.date))) { if (sc) { score = sc; best = e; } }
        });
        if (best && score >= 3) { v.event = best; (best.ytBehind = best.ytBehind || []).push(v); }
      }
    });
    return { events, videos, reports, byId, songs, tours, xFeed, albums, concerts, official, savedAt: raw.savedAt };
  }

  // 저장된 데이터가 있으면 바로 보여주고, 오래됐으면 뒤에서 새로 받아요.
  // onUpdate는 새 데이터가 도착했을 때 다시 그리라고 불러요.
  async function load(onUpdate) {
    const cached = readCache();
    // 시트 주소가 바뀌었으면(새 탭 연결 등) 저장본을 버려요.
    const fresh = cached && cached.sheets === JSON.stringify(window.CONFIG.sheets) && Date.now() - cached.savedAt < window.CONFIG.cacheMinutes * 60000;
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

  window.DATA = { load, parseCSV, normDate, songKey, setlistName };
})();
