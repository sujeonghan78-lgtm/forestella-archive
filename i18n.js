// 여러 나라 말: 자주 보는 메뉴·버튼·제목만 직접 번역하고, 나머지(일정 이름·긴 설명)는 '전체 번역'(구글 번역)으로 봐요.
// 화면을 그린 뒤 글자를 사전에서 찾아 바꿔요. 사전에 없는 글자는 한국어 그대로 둬요.
(function () {
  const KEY = 'sb-lang';
  const LANGS = { ko: '한국어', en: 'English', ja: '日本語' };
  let lang = 'ko';
  try { lang = localStorage.getItem(KEY) || ''; } catch (err) { /* 괜찮아요 */ }
  if (!LANGS[lang]) { const n = (navigator.language || 'ko').toLowerCase(); lang = n.startsWith('ko') ? 'ko' : n.startsWith('ja') ? 'ja' : 'en'; }

  // 한국어: [English, 日本語]
  const T = {
    // 아래 탭 · 더보기
    '홈': ['Home', 'ホーム'], '곡': ['Songs', '曲'], '공식 X': ['Official X', '公式X'], '유튜브': ['YouTube', 'YouTube'], '더보기': ['More', 'その他'],
    '‹ 더보기': ['‹ More', '‹ その他'], '‹ 홈': ['‹ Home', '‹ ホーム'], '‹ 보관함': ['‹ Saved', '‹ 保存'], '‹ 관리자 기기': ['‹ Admin', '‹ 管理者'],
    '새 소식': ['What\'s new', 'お知らせ'], '🆕 새 소식': ['🆕 What\'s new', '🆕 お知らせ'], '팬 제보 현황': ['Fan reports', 'ファン情報'], '일정 등록': ['Add a schedule', '予定を登録'], '＋ 일정 등록': ['＋ Add a schedule', '＋ 予定を登録'],
    '의견': ['Feedback', 'ご意見'], '💬 의견 남기기': ['💬 Leave feedback', '💬 ご意見を送る'], '보관함': ['Saved', '保存'], '숲별 카드': ['Soopbyeol card', 'スッピョルカード'], '공연·행사': ['Shows & events', '公演・イベント'],
    '연표': ['Timeline', '年表'], '멤버 개인 활동': ['Members', 'メンバー個人活動'], '이 사이트에 대해': ['About this site', 'このサイトについて'], '콘서트': ['Concerts', 'コンサート'],
    '음반 이야기': ['Albums', 'アルバム'], '프로그램별 모아보기': ['By program', '番組別'], '앱처럼 쓰기': ['Use like an app', 'アプリのように使う'], '숲별 발자국': ['Soopbyeol footprints', 'スッピョルの足あと'],
    '곡 아카이브': ['Song archive', '曲アーカイブ'], '공식 X 모아보기': ['Official X posts', '公式Xまとめ'], '공식 유튜브': ['Official YouTube', '公式YouTube'],
    '숲별 기록장': ['Soopbyeol Archive', 'スッピョル記録帳'], '포레스텔라 비공식 팬 아카이브': ['Unofficial Forestella fan archive', 'フォレステラ非公式ファンアーカイブ'],
    // 홈
    '통합 검색': ['Search', '検索'], '오늘의 랜덤 무대': ['Random stage of the day', '今日のランダムステージ'], '다시 뽑기': ['Pick again', 'もう一度'], '멤버별 활동': ['By member', 'メンバー別'],
    '유튜브 새 영상': ['New on YouTube', 'YouTube新着'], '1년 전 오늘 올라온 영상': ['Posted a year ago today', '1年前の今日の動画'], '음반 · 콘서트': ['Albums · Concerts', 'アルバム・コンサート'], '음반·콘서트': ['Albums · Concerts', 'アルバム・コンサート'],
    '전체 ›': ['All ›', 'すべて ›'], '지난 오늘': ['On this day', '過去の今日'], '랜덤 무대 공유하기': ['Share random stage', 'ランダムステージを共有'], '지난 오늘 공유하기': ['Share on this day', '過去の今日を共有'],
    '무엇이든 찾기 · 초성 OK': ['Search anything', '何でも検索'], '입덕일을 알려 주세요': ['When did you become a fan?', 'ファンになった日は？'], '입덕일 설정하기': ['Set fan date', 'ファン記念日を設定'], '보러가기 ›': ['See ›', '見る ›'],
    '연말 · 시상식': ['Year-end · Awards', '年末・授賞式'], '음악방송': ['Music shows', '音楽番組'],
    // 공통 버튼
    '♡ 좋아요': ['♡ Like', '♡ いいね'], '♥ 좋아요': ['♥ Liked', '♥ いいね'], '🎫 직관했어요': ['🎫 I was there', '🎫 現場で見た'], '🎫 직관 ✓': ['🎫 Attended ✓', '🎫 現場 ✓'], '📺 시청했어요': ['📺 I watched', '📺 見た'], '📺 시청 ✓': ['📺 Watched ✓', '📺 視聴 ✓'],
    '공유하기': ['Share', '共有'], '복사': ['Copy', 'コピー'], '링크 복사': ['Copy link', 'リンクをコピー'], '유튜브에서 검색': ['Search YouTube', 'YouTubeで検索'], 'X에서 검색': ['Search X', 'Xで検索'],
    '닫기': ['Close', '閉じる'], '보내기': ['Send', '送信'], '더 보기': ['Show more', 'もっと見る'], '전체 보기': ['View all', 'すべて見る'], '펼치기 ▾': ['Expand ▾', '開く ▾'], '접기 ▴': ['Collapse ▴', '閉じる ▴'], '필터 접기 ▴': ['Hide filters ▴', 'フィルターを閉じる ▴'],
    '앨범으로 보기': ['Grid view', 'グリッド表示'], '목록으로 보기': ['List view', 'リスト表示'], '지우기': ['Clear', 'クリア'], '설명 보기': ['Details', '説明'], '맞아요': ['Correct', '合ってます'], '전체': ['All', 'すべて'], '선택': ['Select', '選択'],
    // 일정
    '일정 상세': ['Schedule', 'スケジュール詳細'], '이날 부른 곡': ['Songs this day', 'この日の曲'], '확인된 곡': ['Confirmed songs', '確認済みの曲'], '관련 영상': ['Related videos', '関連動画'], '방송 영상': ['Broadcast clips', '放送映像'],
    '공식 유튜브 비하인드': ['Official YouTube behind', '公式YouTubeビハインド'], '팬 제보': ['Fan reports', 'ファン情報'], '투어 보기 ›': ['Tour ›', 'ツアー ›'], '공연 보기': ['View show', '公演を見る'], '셋리스트': ['Setlist', 'セットリスト'],
    '📅 날짜가 달라요': ['📅 Wrong date', '📅 日付が違う'], '✏️ 틀린 곳 알려주기': ['✏️ Report a mistake', '✏️ 間違いを報告'], '이 일정 삭제 요청': ['Request deletion', '削除をリクエスト'], '지금 날짜': ['Current date', '現在の日付'], '맞는 날짜': ['Correct date', '正しい日付'],
    '캐스팅 회차': ['Performances', 'キャスティング回'], '＋ 회차 올리기': ['＋ Add a performance', '＋ 公演回を追加'], '본 회차를 눌러 주세요.': ['Tap the performance you saw.', '見た回をタップしてください。'],
    '예정': ['Upcoming', '予定'], '영상 있음': ['Has video', '動画あり'], '▶ 영상 있음': ['▶ Has video', '▶ 動画あり'], '아직 확인된 곡이 없어요.': ['No confirmed songs yet.', 'まだ確認された曲はありません。'],
    '확정': ['Confirmed', '確定'], '✓ 확정': ['✓ Confirmed', '✓ 確定'], '확인 필요': ['Needs check', '確認待ち'],
    // 분류
    '공연': ['Show', '公演'], '뮤지컬': ['Musical', 'ミュージカル'], '라디오': ['Radio', 'ラジオ'], '기타': ['Other', 'その他'], '생일': ['Birthday', '誕生日'], '방송사': ['Broadcasters', '放送局'],
    '무대': ['Stage', 'ステージ'], '직캠': ['Fancam', '直カム'], '라이브': ['Live', 'ライブ'], '클립': ['Clip', 'クリップ'], '가사 영상': ['Lyric video', '歌詞動画'], '비하인드': ['Behind', 'ビハインド'], '티저': ['Teaser', 'ティザー'], '쇼츠': ['Shorts', 'ショート'],
    '채널 전체': ['All channels', '全チャンネル'], '종류 전체': ['All types', '全種類'], '연도 전체': ['All years', '全年'], '멤버 전체': ['All members', '全メンバー'], '모든 멤버': ['All members', '全メンバー'], '분류 전체': ['All categories', '全分類'], '모든 해': ['All years', '全年'],
    '일정': ['Schedules', 'スケジュール'], '음반': ['Albums', 'アルバム'], '활동 이력': ['Career', '活動履歴'], '영상': ['Videos', '動画'],
    '가나다순': ['A–Z', '五十音順'], '많이 부른 순': ['Most performed', 'よく歌った順'], '처음 부른 순': ['First performed', '初披露順'], '음반 수록곡': ['Album tracks', 'アルバム収録曲'], '콘서트에서 부른 곡': ['Sung in concerts', 'コンサートで歌った曲'], '많이 부른 곡': ['Most performed songs', 'よく歌った曲'],
    '곡 찾기 · 초성 OK': ['Find a song', '曲を検索'], '영상 찾기 · 초성 OK': ['Find a video', '動画を検索'], '공식 X 글 찾기 · 초성 OK': ['Search official X', '公式Xを検索'], '곡·방송·영상·음반 찾기 · 초성 OK': ['Songs, shows, videos, albums', '曲・番組・動画・アルバム検索'],
    '기간으로 찾기': ['Search by period', '期間で検索'], '언제부터': ['From', 'から'], '언제까지': ['To', 'まで'],
    // 공식 X 분류
    '일정 후기': ['Event recaps', 'イベント後記'], '일정 현장': ['On site', '現場'], '비하인드·직캠': ['Behind · Fancams', 'ビハインド・直カム'], '사진·일상': ['Photos · Daily', '写真・日常'], '음반·컴백': ['Albums · Comeback', 'アルバム・カムバック'], '공지·안내': ['Notices', 'お知らせ'], '기사': ['News', '記事'], '투표·이벤트': ['Votes · Events', '投票・イベント'],
    // 지역
    '서울': ['Seoul', 'ソウル'], '경기·인천': ['Gyeonggi · Incheon', '京畿・仁川'], '강원': ['Gangwon', '江原'], '충청': ['Chungcheong', '忠清'], '전라': ['Jeolla', '全羅'], '경상': ['Gyeongsang', '慶尚'], '제주': ['Jeju', '済州'], '해외': ['Overseas', '海外'], '그 외': ['Other', 'その他'],
    // 멤버
    '포레스텔라': ['Forestella', 'フォレステラ'], '배두훈': ['Bae Doo-hoon', 'ペ・ドゥフン'], '강형호': ['Kang Hyung-ho', 'カン・ヒョンホ'], '조민규': ['Cho Min-gyu', 'チョ・ミンギュ'], '고우림': ['Ko Woo-rim', 'コ・ウリム'],
    '두훈': ['Doohoon', 'ドゥフン'], '형호': ['Hyungho', 'ヒョンホ'], '민규': ['Mingyu', 'ミンギュ'], '우림': ['Woorim', 'ウリム'],
    // 보관함
    '좋아요 · 직관 ›': ['Likes · Attended ›', 'いいね・現場 ›'], '번 직관': ['shows attended', '回現場'], '곡 들음': ['songs heard', '曲聴いた'], '많이 간 곳': ['Most visited', 'よく行った所'],
    // 의견
    '정보 수정': ['Fix info', '情報修正'], '오류 신고': ['Bug report', 'エラー報告'], '기능 요청': ['Feature request', '機能リクエスト'], '자유·응원': ['Chat · Cheers', 'フリー・応援'], '답글': ['Reply', '返信'], '답글 달기': ['Reply', '返信する'], '🌐 번역 보기': ['🌐 Translate', '🌐 翻訳する'], '원문 보기': ['See original', '原文を見る'], '번역 중…': ['Translating…', '翻訳中…'], '번역이 안 돼요 · 다시': ['Failed · Retry', '失敗・再試行'],
    // 더보기 설명
    '기록은 이렇게 모았어요': ['How we collect records', '記録の集め方'], '일정은 공식 팬카페 캘린더(2021년 7월 이전은 나무위키·방송 영상), 곡은 영상으로 확인된 것만 적었어요. 빠지거나 틀린 게 있으면 알려주세요.': ['Schedules come from the official fan cafe calendar (before July 2021: Namuwiki and broadcast videos). Songs are listed only when confirmed by video. Let us know if anything is missing or wrong.', 'スケジュールは公式ファンカフェのカレンダー（2021年7月以前はナムウィキ・放送映像）から、曲は映像で確認できたものだけを載せています。抜けや間違いがあれば教えてください。'],
    '빠진 일정 알려주기': ['Tell us a missing schedule', '抜けた予定を教える'], '남기기 · 모아보기': ['Write · Browse', '書く・見る'], '좋아요 · 직관': ['Likes · Attended', 'いいね・現場'], '내 기록을 카드로': ['Your records as a card', '記録をカードに'],
    '축제 · 기획 공연 · 지역별': ['Festivals · Shows · By region', 'フェス・企画公演・地域別'], '연도·월별 기록': ['By year and month', '年・月別'], '앨범 · 싱글별 공식 X': ['Official X by album', 'アルバム別公式X'], '새로 생긴 기능': ['New features', '新機能'], '일정 · 셋리 · 날짜': ['Schedules · Setlists · Dates', '予定・セトリ・日付'],
    '지도로 되돌아보기 · 관리자만 보여요': ['Look back on a map · admin only', '地図で振り返る・管理者のみ'],
    '숲별이 된 지 며칠째인지 세어 드려요. 이 폰에만 저장돼요.': ['We count the days since you became a fan. Saved only on this phone.', 'ファンになって何日目か数えます。この端末にだけ保存されます。'],
    '숲별': ['Soopbyeol', 'スッピョル'],
    // 언어
    '🌐 언어': ['🌐 Language', '🌐 言語'],
  };
  const DAY = { 일: ['Sun', '日'], 월: ['Mon', '月'], 화: ['Tue', '火'], 수: ['Wed', '水'], 목: ['Thu', '木'], 금: ['Fri', '金'], 토: ['Sat', '土'] };
  // 숫자가 붙는 짧은 말 (무대 3, 영상 2 · 콘서트 1 ›, 출연 35, 8회, 12곡 …)
  const WORD = { 무대: ['Stages', 'ステージ'], 영상: ['Videos', '動画'], 콘서트: ['Concerts', 'コンサート'], 타이틀: ['Title', 'タイトル'], 출연: ['Appearances', '出演'], 일정: ['Schedules', 'スケジュール'], 음반: ['Albums', 'アルバム'], '활동 이력': ['Career', '活動履歴'], 직관: ['Attended', '現場'] };
  const i = lang === 'ja' ? 1 : 0;
  // 기다리는 일정 (v509)
  Object.assign(T, {
    '기다리는 일정': ['Waiting for', '待ちわびる予定'], '갈 거예요': ['I\'m going', '行きます'], '갈 공연을 골라 D-day를 세어 봐요': ['Pick shows you\'ll go to and count down', '行く公演を選んでカウントダウン'],
    '갈 일정 · D-day · 셋리 예측': ['Going · D-day · Setlist guess', '行く予定 · D-day · セトリ予想'],
    '셋리': ['Setlist', 'セトリ'], '준비물': ['Checklist', '持ち物'], '셋리 예측': ['Setlist guess', 'セトリ予想'], '셋리 예측 쓰기': ['Use setlist guess', 'セトリ予想を使う'],
    '이 같이 기다려요': [' waiting together', 'が一緒に待っています'],
    '다가오는 일정': ['Upcoming', '今後の予定'], '지난 셋리 예측': ['Past setlist guesses', '過去のセトリ予想'], '내 예측 셋리': ['My setlist guess', '私のセトリ予想'],
    '누르면 빠져요': ['tap to remove', 'タップで外す'], '최근에 부른 곡': ['Recently sung', '最近歌った曲'], '아래에서 곡을 눌러 넣어요': ['Tap songs below to add', '下の曲をタップして追加'],
    '다른 곡 찾아서 넣기': ['Search other songs', '他の曲を探して追加'], '찾는 곡이 없어요': ['No songs found', '見つかりません'],
    '셋리가 올라오면 점수가 나와요.': ['Your score appears once the setlist is posted.', 'セトリが上がるとスコアが出ます。'], '셋리가 올라오면 점수가 나와요': ['Score appears once the setlist is posted', 'セトリが上がるとスコアが出ます'],
    '점': ['pts', '点'], '다녀왔어요': ['I went', '行きました'], '직관 기록했어요': ['Marked as attended', '現場参加を記録済み'], '다녀왔어요 · 직관으로 옮기기': ['I went · Mark as attended', '行きました · 現場参加に記録'],
    '못 갔어요': ['Couldn\'t go', '行けませんでした'], '나중에': ['Later', 'あとで'], '다 챙겼어요': ['All packed', '準備OK'], '다 챙기셨나요?': ['Got everything?', '持ち物は大丈夫?'],
    '셋리가 올라왔어요!': ['The setlist is up!', 'セトリが上がりました!'], '맞힌 곡 보기': ['See matched songs', '当たった曲を見る'], '다 했어요': ['Done', '完了'],
    '＋ 내 준비물 더하기 (예: 담요)': ['＋ Add an item (e.g. blanket)', '＋ 持ち物を追加 (例: ブランケット)'], '더하기': ['Add', '追加'], '더하거나 뺀 것을 다음 공연에도 쓰기': ['Keep these changes for next shows', '変更を次の公演にも使う'],
    '티켓 · 예매 내역': ['Ticket · booking', 'チケット · 予約内容'], '신분증': ['ID card', '身分証'], '응원봉': ['Light stick', 'ペンライト'], '보조배터리': ['Power bank', 'モバイルバッテリー'], '슬로건': ['Slogan', 'スローガン'], '포레 인형': ['Forestella doll', 'フォレ人形'],
    '보관함 직관에 넣었어요': ['Saved as attended', '現場参加に保存しました'], '기다리는 일정에 넣었어요': ['Added to Waiting for', '待ちわびる予定に追加しました'],
    '숲별이 많이 고른 곡': ['Most picked by fans', 'みんながよく選んだ曲'],
    '120일 안에 등록된 일정이 없어요.': ['No schedules in the next 120 days.', '120日以内の予定はありません。'],
    '아직 기다리는 일정이 없어요. 아래 다가오는 일정에서 갈 거예요를 눌러 보세요.': ['Nothing yet. Tap "I\'m going" on an upcoming schedule below.', 'まだありません。下の予定で「行きます」を押してみてください。'],
    '갈 거예요 취소': ['Cancel going', '行くを取り消す'], '기다리는 일정 전체': ['All waiting', 'すべて見る'], '접기': ['Collapse', '閉じる'], '지우기': ['Remove', '消す'],
  });
  function tr(s) {
    const k = s.trim();
    let m0;
    if (!k || !/[가-힣]/.test(k)) return null;
    if (T[k]) return s.replace(k, T[k][i]);
    if (k === '숲별') return s.replace(k, lang === 'ja' ? 'スプビョル' : 'Soopbyeol');
    if ((m0 = k.match(/^(\d+)명$/))) return s.replace(k, lang === 'ja' ? m0[1] + '人' : m0[1] + ' fans');
    if ((m0 = k.match(/^(\d+)곡 중 (\d+)곡 맞혔어요$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}曲中${m0[2]}曲当たり` : `${m0[2]} of ${m0[1]} songs right`);
    if ((m0 = k.match(/^셋리 예측 (\d+)곡 중 (\d+)곡 맞혔어요$/))) return s.replace(k, lang === 'ja' ? `セトリ予想 ${m0[1]}曲中${m0[2]}曲当たり` : `Setlist guess: ${m0[2]} of ${m0[1]} right`);
    if ((m0 = k.match(/^고른 곡 (\d+)곡$/))) return s.replace(k, lang === 'ja' ? `選んだ曲 ${m0[1]}曲` : `${m0[1]} picked`);
    if ((m0 = k.match(/^(\d+)점$/))) return s.replace(k, lang === 'ja' ? m0[1] + '点' : m0[1] + ' pts');
    if ((m0 = k.match(/^(\d{4})년 (\d{1,2})월$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}年${m0[2]}月` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m0[2]-1] + ' ' + m0[1]);
    if ((m0 = k.match(/^(\d{1,2})월$/))) return s.replace(k, lang === 'ja' ? m0[1] + '月' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m0[1] - 1]);
    if ((m0 = k.match(/^(\d+\.\d+ \d\d:\d\d) 마감 · 리허설로 셋리가 알려질 수 있어 시작 5시간 전에 닫혀요$/))) return s.replace(k, lang === 'ja' ? `${m0[1]} 締切 · リハでセトリが知られることがあるため開始5時間前に締め切ります` : `Closes ${m0[1]} · 5 hours before start, as rehearsals can reveal the setlist`);
    if ((m0 = k.match(/^(\d+)명 참여$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}人参加` : `${m0[1]} joined`);
    if ((m0 = k.match(/^셋리 예측 (\d+)명 참여$/))) return s.replace(k, lang === 'ja' ? `セトリ予想 ${m0[1]}人参加` : `Setlist guess · ${m0[1]} joined`);
    if ((m0 = k.match(/^갈 거예요 (\d+)개$/))) return s.replace(k, lang === 'ja' ? `行く予定 ${m0[1]}件` : `Going to ${m0[1]}`);
    if ((m0 = k.match(/^오늘은 (.+) 가는 날!$/))) return s.replace(k, lang === 'ja' ? `今日は${m0[1]}の日!` : `Today: ${m0[1]}!`);
    if ((m0 = k.match(/^(.+) · 다녀오셨어요\? 직관으로 옮길까요\?$/))) return s.replace(k, lang === 'ja' ? `${m0[1]} · 行きましたか? 現場参加に記録しますか?` : `${m0[1]} · Did you go? Mark as attended?`);
    if ((m0 = k.match(/^(\d\d\.\d\d) (일|월|화|수|목|금|토)$/)) && DAY[m0[2]]) return s.replace(k, `${m0[1]} ${DAY[m0[2]][i]}`);
    if (k.length === 1 && DAY[k]) return s.replace(k, DAY[k][i]);
    { const b = k.match(/^(.+?)\s*›$/); if (b && T[b[1]]) return s.replace(k, T[b[1]][i] + ' ›'); }
    let m;
    if ((m = k.match(/^(·\s*)?((무대|영상|콘서트|타이틀|출연|일정|음반|활동 이력|직관)( \d+)?( · )?)+( ›)?$/))) return s.replace(k, k.replace(/무대|영상|콘서트|타이틀|출연|일정|음반|활동 이력|직관/g, w => WORD[w][i]));
    if ((m = k.match(/^확인 필요 (\d+(?:\/2)?)( ›)?$/))) return s.replace(k, (lang === 'ja' ? '確認待ち ' : 'Needs check ') + m[1] + (m[2] || ''));
    if ((m = k.match(/^(\d\d\.\d\d) 직관$/))) return s.replace(k, m[1] + (lang === 'ja' ? ' 現場' : ' attended'));
    if (k === '건' || k === '개') return s.replace(k, lang === 'ja' ? '件' : '');
    if ((m = k.match(/^(\d+)(회|곡|개|건|번)( ›)?$/))) return s.replace(k, m[1] + (lang === 'ja' ? { 회: '回', 곡: '曲', 개: '件', 건: '件', 번: '回' } : { 회: ' times', 곡: ' songs', 개: '', 건: '', 번: ' times' })[m[2]] + (m[3] || ''));
    if ((m = k.match(/^(\d+)(회|곡|개|건|번)$/))) return s.replace(k, m[1] + (lang === 'ja' ? { 회: '回', 곡: '曲', 개: '件', 건: '件', 번: '回' } : { 회: ' times', 곡: ' songs', 개: '', 건: '', 번: ' times' })[m[2]]);
    if ((m = k.match(/^(.*\d)\s*\((일|월|화|수|목|금|토)\)(.*)$/)) && !/[가-힣]/.test(m[1] + m[3])) return s.replace(k, `${m[1]} (${DAY[m[2]][i]})${m[3]}`);
    return null;
  }
  const SKIP = 'script,style,textarea,input,.ev-title,.d-title,.song-name,.x-text,.fan-title,.op-body,.lang-keep';
  const orig = new WeakMap();
  function walk(root) {
    if (lang === 'ko' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement && n.parentElement.closest(SKIP)) continue;
      const t = tr(n.nodeValue);
      if (t != null && t !== n.nodeValue) { orig.set(n, n.nodeValue); n.nodeValue = t; }
    }
    (root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label]') : []).forEach(e => ['placeholder', 'aria-label'].forEach(a => { const v = e.getAttribute(a); const t = v && tr(v); if (t) e.setAttribute(a, t); }));
  }
  let busy = false;
  const mo = new MutationObserver(ms => {
    if (busy) return;
    busy = true;
    ms.forEach(m => m.addedNodes.forEach(x => { if (x.nodeType === 1) walk(x); else if (x.nodeType === 3 && x.parentElement) walk(x.parentElement); }));
    busy = false;
  });
  // 전체 번역: 구글 번역 주소로 지금 화면을 열어요 (일정 이름·설명까지)
  function fullUrl(to) {
    const u = new URL(location.href);
    const host = u.hostname.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog';
    return `https://${host}${u.pathname}?_x_tr_sl=ko&_x_tr_tl=${to}&_x_tr_hl=${to}${u.hash}`;
  }
  function open() {
    const old = document.getElementById('lang-sheet');
    if (old) { old.remove(); return; }
    const d = document.createElement('div');
    d.id = 'lang-sheet';
    d.className = 'lang-sheet lang-keep';
    const full = lang === 'ko' ? 'en' : lang;
    d.innerHTML = `<div class="lang-box" role="dialog" aria-label="Language">
      <b>🌐 언어 · Language · 言語</b>
      ${Object.entries(LANGS).map(([k, v]) => `<button type="button" class="lang-opt${k === lang ? ' on' : ''}" data-l="${k}">${v}${k === lang ? ' ✓' : ''}</button>`).join('')}
      <p>${lang === 'ja' ? 'メニューとボタンだけ翻訳しています。スケジュール名なども見るには：' : lang === 'en' ? 'Menus and buttons are translated. To also translate schedule names and descriptions:' : '메뉴와 버튼만 번역돼요. 일정 이름·설명까지 보려면:'}</p>
      <a class="lang-full" href="${fullUrl(full)}" target="_blank" rel="noopener">${lang === 'ja' ? 'Google翻訳で全体を見る ↗' : lang === 'en' ? 'Translate everything (Google) ↗' : '전체 번역 (구글 번역) ↗'}</a>
      <button type="button" class="lang-x">${lang === 'ja' ? '閉じる' : lang === 'en' ? 'Close' : '닫기'}</button></div>`;
    d.onclick = ev => {
      const b = ev.target.closest('[data-l]');
      if (b) { try { localStorage.setItem(KEY, b.dataset.l); } catch (err) { /* 괜찮아요 */ } location.reload(); return; }
      if (ev.target === d || ev.target.closest('.lang-x')) d.remove();
    };
    document.body.appendChild(d);
  }
  window.SB_LANG = { lang, open, tr, label: () => LANGS[lang] };
  document.documentElement.lang = lang;
  if (lang !== 'ko') {
    const start = () => { walk(document.body); mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
})();
