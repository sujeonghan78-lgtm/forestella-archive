// 방송사 공식 채널에 올라온 포레스텔라 영상을 data/yt_bc.json 에 저장해요 (깃허브 액션, YOUTUBE_API_KEY 필요).
// 조건: 제목에 포레스텔라·멤버 이름, 조회수 1만 이상. 처음(또는 --full)엔 전체, 다음부터는 최근 7일만 찾아요.
import fs from 'fs';
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.log('::error::YOUTUBE_API_KEY 비밀값이 없어요'); process.exit(1); }
const OUT = 'data/yt_bc.json';
const api = async (path, q) => {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...q, key: KEY })}`);
  const d = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error?.message || ''}`);
  return d;
};
// 믿을 만한 방송사·음악 채널 (2026-10-18 yt_bc_scan으로 포레스텔라 영상 많은 채널 확인). 이름은 사이트에 보이는 짧은 이름
const CHANNELS = [
  ['@legendkpop', 'KBS 레전드 케이팝'], ['@kbskpop', 'KBS Kpop'], ['@1004kbs', 'KBS'], ['@kbsent', 'KBS Entertain'],
  ['@kbsworldtv', 'KBS WORLD'], ['@kbs_startv', 'KBS StarTV'], ['@kbs-together', 'KBS 같이삽시다'], ['@kbsjj', 'KBS전주'],
  ['@kbsculturedocumentary2173', 'KBS대전'], ['@MBCkpop', 'MBCkpop'], ['@MBCentertainment', 'MBC 예능'], ['@sbskpop', 'SBS KPOP'],
  ['@jtbcentertainment', 'JTBC'], ['@jtbcvoyage', 'JTBC Voyage'], ['@jtbcmusic', 'JTBC Music'], ['@mbn_entertainment', 'MBN'],
  ['@playmnet', 'Mnet TV'], ['@mnet', 'Mnet K-POP'], ['@dingomusic', '딩고 뮤직'], ['@universalmusicclassics', '유니버설뮤직 클래식'],
  // 뮤지컬 제작사·소속사·공연 주관사 (2026-10-23 추가): 조회수가 적어도 받아요 (세 번째 칸 = 최소 조회수)
  ['@artsnartists', '아트앤아티스트', 0], ['@bluestagemusical', '블루스테이지', 0], ['@beatinteractive', '비트인터렉티브', 0], ['@springent', '스프링이엔티', 0],
];
const NAME = /포레스텔라|forestella|배두훈|강형호|고우림/i;  // 조민규는 다른 사람과 이름이 같아서 혼자로는 안 받아요
const MIN_VIEWS = 10000;
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { channels: [], videos: [] };
// --only=@a,@b : 그 채널만 처음부터 전부 찾아요 (새로 넣은 채널용)
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const full = process.argv.includes('--full') || !old.videos.length || only.length > 0;
const since = new Date(Date.now() - 7 * 864e5).toISOString();
const minOf = Object.fromEntries(CHANNELS.map(c => [c[1], c[2] ?? MIN_VIEWS]));
const chOf = {}, found = [], missing = [];
let stopped = '';
try {
  for (const [handle, name] of CHANNELS.filter(c => !only.length || only.includes(c[0]))) {
    const ch = (await api('channels', { part: 'id', forHandle: handle })).items?.[0];
    if (!ch) { missing.push(handle); continue; }
    found.push({ id: ch.id, handle, name });
    let page = '';
    do {
      const d = await api('search', { part: 'id', type: 'video', channelId: ch.id, q: '포레스텔라|Forestella|고우림|강형호|배두훈', maxResults: 50, order: 'date', ...(full ? {} : { publishedAfter: since }), ...(page && { pageToken: page }) });
      d.items.forEach(i => { chOf[i.id.videoId] ||= name; });
      page = d.nextPageToken;
    } while (page);
  }
  // 채널 안 검색은 유튜브 쪽 한계로 빠지는 영상이 많아요 (2026-10-26 확인: 열린음악회 바람의 노래 544만 등).
  // 처음·일요일·--wide 땐 전체 검색(조회수 순)으로 한 번 더 찾아서, 위 채널이나 아래 방송사 공식 채널 영상만 받아요
  const WIDE = new Date(Date.now() + 9 * 3600e3).getUTCDay() === 0 || full || process.argv.includes('--wide');
  const WIDE_CH = { 'Mhz 므흐즈: MBC RADIO': 'MBC 라디오', 'KBS 해피투게더': 'KBS 해피투게더', '엠뚜루마뚜루 : MBC 공식 종합 채널': 'MBC 엠뚜루마뚜루', '유 퀴즈 온 더 튜브': 'tvN 유퀴즈', '스브스 예능맛집': 'SBS 예능', '울산MBC_뮤직': 'MBC울산', '에헤라 티비 : KBS LIFE': 'KBS LIFE', 'KBS창원': 'KBS창원', 'THE K-POP2': 'SBS THE K-POP', 'MBN Entertainment': 'MBN', 'KBS 한국방송': 'KBS', 'JTBC Entertainment': 'JTBC' };
  const byId = Object.fromEntries(found.map(f => [f.id, f.name]));
  if (WIDE && !only.length) for (const q of ['포레스텔라', 'Forestella', '포레스텔라 무대', '포레스텔라 예능', '고우림', '강형호', '배두훈']) {
    const d = await api('search', { part: 'snippet', type: 'video', q, maxResults: 50, order: 'viewCount', regionCode: 'KR' });
    d.items.forEach(i => { const name = byId[i.snippet.channelId] || WIDE_CH[i.snippet.channelTitle]; if (name) chOf[i.id.videoId] ||= name; });
  }
} catch (e) { stopped = e.message; }  // 하루 사용량이 다 되면 받은 데까지만 저장해요
const sec = s => { const m = (s || '').match(/(\d+)H|(\d+)M|(\d+)S/g) || []; return m.reduce((t, x) => t + parseInt(x) * (x.endsWith('H') ? 3600 : x.endsWith('M') ? 60 : 1), 0); };
const kst = iso => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
// 방송 날짜: 제목의 "220101 방송", "2022.01.01" 같은 날짜 (재업로드 영상이 많아서 올린 날보다 이게 정확해요)
const aired = (t, up) => {
  const m = t.match(/(\d{2})(\d{2})(\d{2})\s*방송/) || t.match(/(?:KBS|MBC|SBS|JTBC|Mnet|MBN|TV)\s*(\d{2})(\d{2})(\d{2})(?!\d)/) || t.match(/(?<!\d)(20\d{2})[.\-/]?(\d{2})[.\-/]?(\d{2})(?!\d)/);
  if (!m) return '';
  const y = m[1].length === 2 ? '20' + m[1] : m[1], d = `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return d >= '2017-01-01' && d <= up && !isNaN(new Date(d)) ? d : '';
};
const ids = Object.keys(chOf).filter(id => !old.videos.some(v => v.id === id));
const add = [];
for (let i = 0; i < ids.length && !stopped; i += 50) {
  const d = await api('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(',') });
  for (const v of d.items) {
    const views = Number(v.statistics.viewCount || 0), t = v.snippet.title;
    if (!NAME.test(t) || views < (minOf[chOf[v.id]] ?? MIN_VIEWS)) continue;
    const up = kst(v.snippet.publishedAt), air = aired(t, up);
    add.push({ id: v.id, date: air || up, ...(air && air !== up && { up }), title: t, sec: sec(v.contentDetails.duration), views, bc: chOf[v.id] });
  }
}
const all = [...old.videos, ...add].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
const channels = [...old.channels.filter(c => !found.some(f => f.id === c.id)), ...found];
fs.writeFileSync(OUT, JSON.stringify({ channels, videos: all }, null, 0).replace(/},{/g, '},\n{'));
const per = {}; all.forEach(v => { per[v.bc] = (per[v.bc] || 0) + 1; });
console.log(`::notice::새 영상 ${add.length} / 전체 ${all.length} / 채널별 ${Object.entries(per).map(([k, n]) => k + ':' + n).join(' ')}${missing.length ? ' / 못 찾은 채널 ' + missing.join(',') : ''}${stopped ? ' / 중간에 멈춤: ' + stopped : ''}`);
