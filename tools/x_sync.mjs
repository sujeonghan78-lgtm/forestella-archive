// 공식 X(@official_fore) 최근 글을 X 공개 임베드 타임라인(syndication)에서 받아 data/x_auto.json 에 쌓아요.
// 사이트는 시트 "공식X" 탭에 없는 글만 이걸로 보여줘요. 목록이 비어 오면(막힘) 실패로 끝내서 깃허브 메일이 가게 해요.
// 사용: node tools/x_sync.mjs
import fs from 'node:fs';

const OUT = 'data/x_auto.json';
const URL = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/official_fore?showReplies=false&lang=ko';

// tools/x_classify.py 와 같은 규칙 (위에서부터 처음 맞는 것 하나)
const CATS = [
  ['생일', /HBD|생일|가장빛나던날|Happy\s?\w*\s?Day/i],
  ['일정 후기', /완료|종료|마쳤|무사히|함께해\s?주신/i],
  ['투표·이벤트', /투표|후보|EVENT|이벤트|포요고사|퀴즈|응모|추첨/i],
  ['음반·컴백', /COMEBACK|NEWSONG|앨범|정규\s?\d|미니\s?\d|선공개곡|PocaAlbum|포카앨범|발매|음원|티저|트랙\s?리스트|Lyric Video|\bM\/?V\b/i],
  ['비하인드·직캠', /포레미파솔|비하인드|Behind|직캠|Fancam|Choreo/i],
  ['영상', /VIDEO|youtu|LIVE CLIP|라이브 클립/i],
  ['공지·안내', /NOTICE|안내|공지|명단|인원 체크|티켓|예매|팬클럽|응원봉|굿즈|MD|입금|환불|일정|멤버십|멤버쉽|fromm|판매/i],
  ['기사', /NEWS|naver\.me|기사|인터뷰|화보|매거진|Magazine/i],
];
const STAGE = /음중|LEGACY|ROYAL|ILLUSIONIST|THE WAVE|SYMPHONY|D-\d|불후|명곡|열린음악회|음악중심|뮤직뱅크|인기가요|가요|콘서트|공연|축제|페스티벌|무대|녹화|출근길|퇴근길|대기실|백스테이지|리허설|방송|라디오|팬사인|시구|시상식|대상|투어|TOUR|LIVE/i;
const MEMBERS = [['배두훈', /두훈|DOOHOON/i], ['강형호', /형호|HYUNGHO/i], ['조민규', /민규|MINGYU/i], ['고우림', /우림|WOORIM/i]];
const classify = text => {
  const t = text.replace(/(https?:\/\/\s?[\w.]+)\S*/g, '$1');
  const cat = (CATS.find(([, rx]) => rx.test(t)) || [])[0] || (STAGE.test(t) ? '일정 현장' : '사진·일상');
  const m = MEMBERS.filter(([, rx]) => rx.test(t)).map(([n]) => n);
  return { cat, m: m.length < 4 ? m : [] };
};
// 한국 시간 날짜
const kstDate = s => new Date(Date.parse(s) + 9 * 3600e3).toISOString().slice(0, 10);

const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { posts: [] };
const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'ko' } });
const html = await r.text();
const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
let entries = [];
try { entries = JSON.parse(m[1]).props.pageProps.timeline.entries || []; } catch (e) { /* 아래에서 실패 처리 */ }
const got = entries.map(e => e.content && e.content.tweet).filter(t => t && t.id_str && !t.retweeted_status && (t.user || {}).screen_name?.toLowerCase() === 'official_fore');
if (!got.length) {
  console.log(`::error::공식 X 최근 글을 못 받았어요 (HTTP ${r.status}, ${html.length}자, 항목 ${entries.length}개). X가 막았을 수 있어요.`);
  process.exit(1);
}
const byId = new Map(old.posts.map(p => [p.id, p]));
let added = 0;
for (const t of got) {
  if (byId.has(t.id_str)) continue;
  const text = (t.full_text || t.text || '').replace(/\s*https:\/\/t\.co\/\w+$/, '');
  const media = ((t.extended_entities || t.entities || {}).media || []).map(x => x.media_url_https).filter(Boolean);
  byId.set(t.id_str, { id: t.id_str, date: kstDate(t.created_at), ...classify(text), text, imgs: media });
  added++;
}
const posts = [...byId.values()].sort((a, b) => (b.id.length - a.id.length) || (b.id > a.id ? 1 : -1)).slice(0, 300);
fs.writeFileSync(OUT, JSON.stringify({ source: '포레스텔라 공식 X @official_fore (자동)', posts }, null, 0));
console.log(`::notice::받은 글 ${got.length} / 새 글 ${added} / 쌓인 글 ${posts.length}`);
