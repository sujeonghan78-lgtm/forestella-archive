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
    '숲별 이야기': ['Fan stories', 'ファンの話'], '💬 숲별 이야기': ['💬 Fan stories', '💬 ファンの話'], '모두 보기 ›': ['See all ›', 'すべて見る ›'],
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
    // 10-30 추가: 셋리 예측 평균·셋리 등록·판·준비물 메모·지도 버튼·장소 알려주기·날짜 아니에요
    '다른 숲별 점수 보기': ['See other fans\' scores', 'みんなの点数を見る'], '숲별 평균': ['Fan average', 'みんなの平均'], '참여': ['joined', '参加'],
    '이번 예측 최고 점수예요': ['Top score this time!', '今回の最高点です'], '예측한 숲별이 10명 이상이면 평균 점수도 볼 수 있어요': ['With 10+ guesses, you can see the average score', '予想が10人以上集まると平均点が見られます'],
    '아무도 예상 못 한 곡': ['Nobody guessed', '誰も予想しなかった曲'],
    '셋리 등록': ['Post setlist', 'セトリを登録'], '이 판이 맞아요': ['This version is right', 'この版が正しい'], '셋리 알려주기': ['Share the setlist', 'セトリを教える'], '📝 셋리 알려주기': ['📝 Share the setlist', '📝 セトリを教える'], '✏️ 셋리 고치기': ['✏️ Fix setlist', '✏️ セトリを直す'],
    '📝 메모': ['📝 Memo', '📝 メモ'], '📝 메모 칸 켜기': ['📝 Show memo', '📝 メモを表示'], '메모 칸 끄기': ['Hide memo', 'メモを隠す'], '다음 공연에도 이 메모 쓰기': ['Use this memo for next shows', 'このメモを次の公演にも使う'], '내 메모': ['My memos', 'マイメモ'],
    '길찾기': ['Directions', '道案内'], '네이버 지도': ['Naver Map', 'NAVERマップ'], '네이버 지도에서 찾기': ['Find on Naver Map', 'NAVERマップで探す'], '이 일정 검색': ['Search this', 'この予定を検索'], '┄ 갈 길': ['┄ Path ahead', '┄ この先'],
    '📍 장소 공개됨': ['📍 Public venue', '📍 公開会場'], '🔒 장소 비공개': ['🔒 Venue undisclosed', '🔒 会場非公開'], '💻 온라인': ['💻 Online', '💻 オンライン'],
    '볼 거예요': ['Will watch', '見ます'], '봤어요': ['Watched', '見ました'],
    '아니에요': ['Not right', '違います'], '셋리 알려주기 ›': ['Share the setlist ›', 'セトリを教える ›'], '오늘': ['Today', '今日'], '어제': ['Yesterday', '昨日'],
    '갈 거예요 취소': ['Cancel going', '行くを取り消す'], '기다리는 일정 전체': ['All waiting', 'すべて見る'], '접기': ['Collapse', '閉じる'], '지우기': ['Remove', '消す'],
  });

  // 취향 테스트 · 취향 궁합 (v617)
  const LB = {
    '음원파': ['Listener', '音源派'], '무대파': ['Stage fan', 'ステージ派'], '오리지널파': ['Original fan', 'オリジナル派'], '변주파': ['Arrange fan', 'アレンジ派'],
    '대표곡파': ['Hits fan', '代表曲派'], '숨은 명곡파': ['Hidden-gem fan', '隠れ名曲派'], '클래식파': ['Classical fan', 'クラシック派'], '팝파': ['Pop fan', 'ポップ派'],
    '숨죽여 듣기파': ['Quiet listener', '静かに聴く派'], '떼창파': ['Sing-along fan', '合唱派'], '오리지널 곡파': ['Originals fan', 'オリジナル曲派'], '커버곡파': ['Covers fan', 'カバー曲派'],
    '처음 버전파': ['First-version fan', '初版派'], '편곡 버전파': ['New-arrangement fan', '新編曲派'], '큰 공연장파': ['Big-venue fan', '大会場派'], '소극장·행사파': ['Small-venue fan', '小劇場・イベント派'],
    '외국곡파': ['Foreign-song fan', '外国語曲派'], '한국어곡파': ['Korean-song fan', '韓国語曲派'], '직관파': ['Live-goer', '現場派'], '기록파': ['Record-keeper', '記録派'], '방구석파': ['Couch fan', 'おうち派'],
  };
  const SH = {
    '음원': ['Listen', '音源'], '무대': ['Stage', 'ステージ'], '오리지널': ['Original', 'オリジナル'], '변주': ['Arrange', 'アレンジ'], '대표곡': ['Hits', '代表曲'], '숨은 명곡': ['Hidden gems', '隠れ名曲'],
    '클래식': ['Classical', 'クラシック'], '팝': ['Pop', 'ポップ'], '숨죽여 듣기': ['quiet listening', '静かに聴く'], '떼창': ['sing-along', '合唱'], '오리지널 곡': ['originals', 'オリジナル曲'], '커버곡': ['covers', 'カバー曲'],
    '처음 버전': ['first version', '初版'], '편곡 버전': ['new arrangement', '新編曲'], '큰 공연장': ['big venues', '大会場'], '소극장·행사': ['small venues', '小劇場・イベント'], '외국곡': ['foreign songs', '外国語曲'], '한국어곡': ['Korean songs', '韓国語曲'],
  };
  const VSO = {
    '음반으로 듣기': ['Listen to albums', '音源で聴く'], '무대 영상으로 보기': ['Watch stage videos', 'ステージ映像で見る'], '포레 오리지널 곡': ['Forestella originals', 'フォレのオリジナル曲'], '커버곡·재해석곡': ['Covers & reinterpretations', 'カバー・再解釈曲'],
    '대놓고 유명곡': ['Famous hits', '誰もが知る名曲'], '숨어 듣는 명곡': ['Hidden gems', 'こっそり聴く名曲'], '클래식 크로스오버': ['Classical crossover', 'クラシカル・クロスオーバー'], '록·팝': ['Rock & pop', 'ロック・ポップ'],
    '숨죽여 듣기': ['Listen quietly', '静かに聴く'], '떼창': ['Sing along', '合唱'], '처음 부른 버전': ['The first version', '最初のバージョン'], '새로 편곡한 버전': ['A new arrangement', '新しい編曲'],
    '큰 공연장 콘서트': ['Big-venue concerts', '大会場コンサート'], '소극장·지역 행사': ['Small halls & local events', '小劇場・地方イベント'], '외국어 곡': ['Foreign-language songs', '外国語の曲'], '한국어 곡': ['Korean songs', '韓国語の曲'],
  };
  Object.assign(T, LB, VSO, {
    '취향 궁합': ['Taste match', '好み相性'], '숲별 취향 궁합': ['Soopbyeol taste match', 'スッピョル好み相性'], '‹ 취향 궁합': ['‹ Taste match', '‹ 好み相性'], '‹ 이전': ['‹ Back', '‹ 戻る'], '‹ 함께한 기념일': ['‹ Our anniversaries', '‹ 一緒の記念日'],
    '나랑 취향이 얼마나 비슷할까?': ['How alike are our tastes?', '私と好みはどれくらい似てる?'], '링크를 보내면 친구 기록이랑 바로 비교돼요': ['Send a link and compare with a friend\'s records', 'リンクを送ると友だちの記録とすぐ比べられます'],
    '취향 테스트 먼저 해 볼래요?': ['Try the taste test first?', 'まず好みテストをしてみる?'], '9문항 · 1분이면 끝나요. 기록이 없어도 궁합을 볼 수 있어요': ['9 questions · 1 minute. Works even without any records', '9問・1分で完了。記録がなくても相性が見られます'],
    '아직 비교할 기록이 없어요. 곡에 ♥나 💚 최애곡, 일정에 🎫 직관을 눌러 두면 궁합을 볼 수 있어요.': ['Nothing to compare yet. Tap ♥ or 💚 favorite on songs, or 🎫 attended on schedules.', 'まだ比べる記録がありません。曲に♥や💚最推し曲、予定に🎫現場を押すと相性が見られます。'],
    '곡 아카이브 가기': ['Go to song archive', '曲アーカイブへ'], '나의 취향 유형': ['My taste type', '私の好みタイプ'], '결과 보기 ›': ['See result ›', '結果を見る ›'],
    '링크에 보일 이름': ['Name shown in the link', 'リンクに表示する名前'], '링크에 담을 것': ['What to include', 'リンクに入れるもの'], '체크한 것만 보내요': ['Only checked items are sent', 'チェックした項目だけ送ります'],
    '취향 테스트': ['Taste test', '好みテスト'], '최애곡': ['Favorite songs', '最推し曲'], '소취곡': ['Wish songs', '聴きたい曲'], '♥ 곡': ['♥ songs', '♥曲'], '직관': ['Attended', '現場'], '최애 멤버': ['Favorite member', '推しメン'], '입덕일': ['Fan since', 'ファンになった日'],
    '없음': ['None', 'なし'], '안 함': ['Not taken', '未実施'], '내 궁합 링크 보내기': ['Send my match link', '相性リンクを送る'],
    '다음': ['Next', '次へ'], '마지막 질문으로': ['To the last question', '最後の質問へ'], '반반': ['Half & half', '半々'], 'VS': ['VS', 'VS'],
    '나의 덕질 스타일은?': ['What\'s your fan style?', 'あなたの推し活スタイルは?'], '공연은 직접 봐야지': ['Shows are meant to be seen live', '公演は生で見なきゃ'], '날짜·셋리 정리가 행복해': ['Organizing dates and setlists makes me happy', '日付・セトリ整理が幸せ'], '영상으로 충분해': ['Videos are enough', '映像で十分'],
    '나의 숲별 취향 유형': ['My Soopbyeol taste type', '私のスッピョル好みタイプ'], '나는 어디쯤?': ['Where am I?', '私はどのあたり?'], '사분면 이미지 저장': ['Save quadrant image', '四象限画像を保存'],
    '나의 취향 지도': ['My taste map', '私の好みマップ'], '즐기는 방식': ['How you enjoy', '楽しみ方'], '좋아하는 버전': ['Favorite version', '好きなバージョン'], '곡 고르는 눈': ['Song taste', '曲を選ぶ目'], '음악 장르': ['Genre', 'ジャンル'], '덕질 스타일': ['Fan style', '推し活スタイル'],
    '딱 반반이라 첫 답으로 정했어요': ['Exactly half, so your first answer decided', 'ちょうど半々なので最初の答えで決めました'], '거의 반반이에요': ['Almost half & half', 'ほぼ半々です'],
    '숲별 통계': ['Fan stats', 'みんなの統計'], '축마다 숲별은': ['Fans on each axis', '軸ごとのみんな'], '숲별 통계에 내 결과 넣지 않기': ['Leave my result out of fan stats', 'みんなの統計に自分の結果を入れない'], '이름은 안 들어가요': ['No names are sent', '名前は入りません'],
    '16가지 유형 모두 보기': ['See all 16 types', '16タイプをすべて見る'], '4×4 유형표 이미지 저장': ['Save 4×4 type chart', '4×4タイプ表を保存'], '친구랑 궁합 보기': ['Check match with a friend', '友だちと相性を見る'], '테스트 다시 하기': ['Retake the test', 'もう一度テスト'], '유형 코드': ['Type code', 'タイプコード'],
    '정통 오페라 하우스형': ['Opera House Purist', '王道オペラハウス型'], '명곡을 원곡 그대로, 볼륨은 크게': ['Classics as they are, volume up', '名曲は原曲のまま、音量は大きく'],
    '플레이리스트 장인형': ['Playlist Master', 'プレイリスト職人型'], '타이틀곡 가사는 이미 다 외웠어요': ['Already knows every title-track lyric', 'タイトル曲の歌詞はもう全部覚えた'],
    '비밀 서재의 아리아 수집가': ['Secret-Library Aria Collector', '秘密の書斎のアリア収集家'], '아는 사람만 아는 아리아를 아껴 들어요': ['Treasures arias only insiders know', '知る人ぞ知るアリアを大切に聴く'],
    '새벽 라디오 디깅러': ['Late-Night Radio Digger', '夜明けのラジオ・ディガー'], '새벽에 혼자 듣는 수록곡이 제일 좋아요': ['B-sides alone at dawn are the best', '夜明けにひとりで聴く収録曲が一番'],
    '편곡 감별사': ['Arrangement Connoisseur', '編曲鑑定士'], '같은 곡도 버전마다 다른 걸 귀신같이 알아요': ['Spots every difference between versions', '同じ曲でもバージョンの違いを見抜く'],
    '재해석 탐험가': ['Reinterpretation Explorer', '再解釈探検家'], '포레가 부른 커버로 원곡까지 찾아 들어요': ['Finds the originals through Forestella covers', 'フォレのカバーから原曲まで探して聴く'],
    '달빛 커버 수집가': ['Moonlight Cover Collector', '月明かりのカバー収集家'], '한 번뿐인 커버 음원을 소중히 모아요': ['Collects one-of-a-kind cover recordings', '一度きりのカバー音源を大切に集める'],
    '숨은 커버 채집가': ['Hidden Cover Hunter', '隠れカバー採集家'], '방송에서 딱 한 번 부른 곡을 기억해요': ['Remembers songs sung just once on TV', '放送で一度だけ歌った曲を覚えている'],
    '대극장 VIP석형': ['Grand Theater VIP', '大劇場VIP席型'], '웅장한 무대는 큰 공연장에서 봐야 제맛': ['Epic stages belong in big halls', '壮大なステージは大会場で見てこそ'],
    '떼창 대장': ['Sing-along Captain', '合唱隊長'], '전주만 나와도 목소리가 먼저 나가요': ['Starts singing at the first note', 'イントロだけでもう声が出る'],
    '소극장 아리아 사냥꾼': ['Small-Hall Aria Hunter', '小劇場アリアハンター'], '가까이서 듣는 성악 발성에 반했어요': ['Fell for classical voices up close', '間近で聴く声楽の発声に惚れた'],
    '숨은 무대 발굴단': ['Hidden Stage Finder', '隠れステージ発掘団'], '지역 행사 무대 영상까지 다 찾아봐요': ['Tracks down even local event videos', '地方イベントの映像まで全部探す'],
    '그랜드 피날레형': ['Grand Finale', 'グランドフィナーレ型'], '편곡이 터지는 마지막 무대를 기다려요': ['Waits for the explosive final arrangement', '編曲が炸裂するラストを待つ'],
    '무대 위 록스타형': ['Rock Star on Stage', 'ステージのロックスター型'], '록 편곡 무대에선 같이 헤드뱅잉': ['Headbangs along to rock arrangements', 'ロック編曲では一緒にヘドバン'],
    '한 번뿐인 무대 수집가': ['One-time Stage Collector', '一度きりのステージ収集家'], '다시 없을 무대를 기억하는 게 행복해요': ['Happiest remembering stages that won\'t return', '二度とないステージを覚えているのが幸せ'],
    '레전드 편곡 덕후': ['Legend Arrangement Fan', '伝説編曲オタク'], '레전드 편곡 무대를 몇 번이고 돌려 봐요': ['Replays legendary arrangements again and again', '伝説の編曲ステージを何度も見返す'],
    '음반·음원으로 조용히 듣는 걸 더 좋아해요': ['Prefers listening quietly to albums and tracks', 'アルバム・音源で静かに聴くのが好き'], '무대 영상과 떼창, 현장 분위기를 더 즐겨요': ['Enjoys stage videos, sing-alongs and the live mood', 'ステージ映像や合唱、現場の雰囲気が好き'],
    '포레 오리지널 곡과 처음 버전을 아껴요': ['Loves Forestella originals and first versions', 'フォレのオリジナル曲と初版を大切に'], '커버곡·재해석과 새 편곡에 더 끌려요': ['Drawn to covers, reinterpretations and new arrangements', 'カバー・再解釈や新編曲に惹かれる'],
    '다들 아는 대표곡과 큰 공연장 무대를 좋아해요': ['Likes the well-known hits and big-venue stages', 'みんなが知る代表曲と大会場ステージが好き'], '숨은 명곡과 소극장·행사 무대를 찾아다녀요': ['Seeks out hidden gems and small-venue stages', '隠れ名曲と小劇場・イベントを探し回る'],
    '클래식 크로스오버와 외국어 곡에 끌려요': ['Drawn to classical crossover and foreign-language songs', 'クラシカル・クロスオーバーと外国語曲に惹かれる'], '록·팝 편곡과 한국어 곡을 더 자주 들어요': ['Listens more to rock/pop arrangements and Korean songs', 'ロック・ポップ編曲と韓国語曲をよく聴く'],
    '취향 테스트 메이트': ['Taste-test mates', 'テスト仲間'], '최애곡 메이트': ['Favorite-song mates', '最推し曲仲間'], '플레이리스트 메이트': ['Playlist mates', 'プレイリスト仲間'], '직관 메이트': ['Concert mates', '現場仲間'], '소취 동지': ['Wish-song buddies', '聴きたい曲の同志'], '같은 멤버 러버': ['Same-member lovers', '同じ推しメン'],
    '플레이리스트를 바꿔 끼워도 아무도 모를 사이': ['You could swap playlists and nobody would notice', 'プレイリストを入れ替えても誰も気づかない仲'],
    '옆자리 예약 메이트': ['Reserved-seat mates', '隣の席予約仲間'], '티켓팅 성공하면 옆자리는 무조건 이 사람': ['Win the ticketing and the seat next to you is theirs', 'チケットが取れたら隣の席は絶対この人'],
    '같은 바람 맞는 사이': ['Same-breeze friends', '同じ風に吹かれる仲'], '같은 무대에서 같이 소름 돋는 사이': ['You get chills at the same stages', '同じステージで一緒に鳥肌が立つ仲'],
    '겹치는 곡엔 같이 환호, 안 겹치는 곡은 영업 타임': ['Cheer together on shared songs, recommend the rest', '重なる曲では一緒に歓声、重ならない曲は布教タイム'],
    '내가 모르는 명곡은 다 이 사람이 알아요': ['They know all the gems you don’t', '私の知らない名曲は全部この人が知ってる'],
    '도토리 친구': ['Acorn buddies', 'どんぐり友だち'], '작지만 확실한 공통점이 있어요': ['Small but sure things in common', '小さいけど確かな共通点'],
    '낙엽 친구': ['Fallen-leaf friends', '落ち葉友だち'], '가끔 겹치는 곡에 깜짝 반가운 사이': ['Delighted when a song overlaps now and then', 'たまに重なる曲にびっくり嬉しい仲'],
    '달라서 더 재밌어요. 덕질 영역이 두 배': ['Different is more fun. Double the fandom', '違うからもっと楽しい。推し活の範囲が2倍'],
    '다른 은하 숲별': ['Fans from another galaxy', '別の銀河のスッピョル'], '같은 포레, 다른 은하. 만나면 할 얘기가 산더미': ['Same Forestella, different galaxy. So much to talk about', '同じフォレ、違う銀河。話すことが山ほど'],
    '한마음 숲': ['One-heart forest', '一心の森'], '다 같이 같은 곡에서 울고 웃는 모임': ['Laughing and crying at the same songs together', 'みんなで同じ曲で泣いて笑う集まり'],
    '어느 공연을 가도 단체 사진 각': ['A group photo at every show', 'どの公演でも集合写真'], '떼창 구간에서 목소리가 딱 맞는 조합': ['Voices that match at every sing-along', '合唱パートで声がぴったり合う組み合わせ'],
    '최애곡 돌려 듣기만 해도 하루가 가요': ['Swapping favorites takes a whole day', '最愛曲を回し聴きするだけで1日が終わる'], '취향이 다 달라서 단톡방이 조용할 날이 없어요': ['Everyone differs, so the group chat is never quiet', '好みが全員違うのでグループチャットが静かな日はない'],
    '천생연분': ['Soulmates', '運命の相手'], '0% 평행우주 숲별': ['0% Parallel-universe fans', '0% パラレルワールドのスッピョル'], '평행우주 숲별': ['Parallel-universe fans', 'パラレルワールドのスッピョル'],
    '200% 천생연분': ['200% Soulmates', '200% 運命の相手'], '취향도, 덕질 스타일도, 최애 멤버도, 플레이리스트도, 객석까지 같아요': ['Same taste, same style, same favorite member, same playlist, even the same seats', '好みも推し活スタイルも最推しもプレイリストも客席まで同じ'], '모든 게 다 같아야 열려요': ['Opens only if everything matches', 'すべてが同じなら開きます'],
    '0% 평행우주 숲별': ['0% Parallel-universe fans', '0% パラレルワールドのスッピョル'], '같은 포레를 좋아하는데 어떻게 하나도 안 겹치죠?': ['Same Forestella, yet nothing overlaps. How?', '同じフォレが好きなのに、どうして何も重ならないの?'], '아무것도 안 겹치면…?': ['If nothing overlaps…?', '何も重ならなかったら…?'],
    '직관 전우': ['Concert comrades', '現場の戦友'], '같은 객석에서 10번 넘게 함께했어요': ['Together in the audience 10+ times', '同じ客席で10回以上一緒でした'], '같은 객석에 자주 있었다면': ['If you were often in the same audience', '同じ客席によくいたなら'],
    '모임 전원이 같은 취향 유형이에요': ['Everyone in the group has the same type', '全員が同じ好みタイプです'], '모임 모두가 같은 유형이면': ['If everyone has the same type', '全員が同じタイプなら'],
    '소취 동맹': ['Wish-song alliance', '聴きたい曲同盟'], '이 곡 불러 줄 때까지 같이 기다려요': ['Waiting together until they sing it', 'この曲を歌ってくれるまで一緒に待とう'], '듣고 싶은 곡이 같다면': ['If you wish for the same songs', '聴きたい曲が同じなら'],
    '기수 동기': ['Same-generation fans', '同期スッピョル'], '같은 시기에 입덕한 숲별 동기예요': ['You became fans in the same era', '同じ時期にファンになった同期です'], '입덕한 때가 비슷하면': ['If you became fans around the same time', 'ファンになった時期が近いなら'],
    '숲별 선후배': ['Senior & junior fans', '先輩後輩スッピョル'], '입덕 차이 5년 이상! 선배님, 그때 얘기 해 주세요': ['5+ years apart! Senpai, tell me about those days', 'ファン歴の差5年以上! 先輩、あの頃の話を聞かせて'], '입덕 차이가 많이 나면': ['If your fan years are far apart', 'ファン歴の差が大きいなら'],
    '4인 4색': ['Four colors of four', '4人4色'], '최애 멤버를 모으니 네 명이 다 모였어요. 우리 모임 포레스텔라 결성!': ['Your favorite members add up to all four. Forestella, assemble!', '最推しを集めたら4人そろいました。私たちの集まりでフォレステラ結成!'], '모임 최애 멤버를 모아 보면': ['If you gather everyone’s favorite member', 'みんなの最推しを集めたら'],
    '단체 관람단': ['Group audience', '団体観覧団'], '모임 전원이 같이 간 공연이 있어요': ['There’s a show everyone went to', '全員が一緒に行った公演があります'], '모두 같은 객석에 있었다면': ['If everyone was in the same audience', '全員が同じ客席にいたなら'],
    '같은 날 입덕한 운명': ['Same fan day, destiny', '同じ日にファンになった運命'], '입덕한 날이 똑같아요. 이건 운명이에요': ['You became fans on the very same day. It’s fate', 'ファンになった日がまったく同じ。これは運命'],
    '딱 반반 숲별': ['Exactly-half fans', 'ちょうど半々のスッピョル'], '정확히 50%. 반은 같고 반은 달라요': ['Exactly 50%. Half same, half different', 'ぴったり50%。半分同じで半分違う'],
    '럭키 77': ['Lucky 77', 'ラッキー77'], '정확히 77%! 오늘 뭔가 좋은 일이 생길 거예요': ['Exactly 77%! Something good is coming today', 'ぴったり77%! 今日はいいことがありそう'],
    '혹시 같은 사람이 폰 두 개 쓰는 거 아니죠?': ['Wait, are you one person with two phones?', 'もしかして同じ人がスマホ2台使ってる?'], '딱 하나 달라서 수다가 끝이 안 나요': ['Just one difference, so the chat never ends', 'ひとつだけ違うからおしゃべりが終わらない'],
    '반은 맞장구, 반은 "오 그 곡 뭐야?"': ['Half "same!", half "ooh, what song is that?"', '半分は相づち、半分は「その曲なに?」'], '취향은 정반대인데 이상하게 잘 통해요': ['Opposite tastes, yet you click', '好みは正反対なのに不思議と気が合う'],
    '거울 숲별': ['Mirror fans', '鏡のスッピョル'], '취향 축 4개가 다 같아요. 서로의 플레이리스트를 믿어도 돼요': ['All 4 axes match. You can trust each other\'s playlists', '好みの軸が4つとも同じ。お互いのプレイリストを信じてOK'],
    '단짝 숲별': ['Best-buddy fans', '親友スッピョル'], '거의 다 맞고 하나만 달라서 대화가 끊이지 않아요': ['Almost all match, one differs, so the talk never ends', 'ほとんど同じで一つだけ違うから話が尽きない'],
    '서로 채워주는 짝꿍': ['Complementary pair', '補い合うペア'], '반은 같고 반은 달라서 서로 새 곡을 알려 줘요': ['Half same, half different: you share new songs', '半分同じで半分違うから新しい曲を教え合える'],
    '정반대라 끌리는 사이': ['Opposites attract', '正反対だから惹かれ合う'], '취향이 정반대라 오히려 덕질이 두 배로 넓어져요': ['Opposite tastes double your fandom world', '好みが正反対だからこそ推し活が2倍広がる'],
    '포레 취향 쌍둥이': ['Forestella taste twins', 'フォレ好みの双子'], '플레이리스트를 바꿔 들어도 모를 사이예요': ['You could swap playlists and not notice', 'プレイリストを交換しても気づかない仲'],
    '같은 숲길 산책 메이트': ['Same forest-trail mates', '同じ森の散歩仲間'], '좋아하는 무대가 거의 다 겹쳐요': ['Your favorite stages almost all overlap', '好きなステージがほとんど重なる'],
    '옆 나무 이웃': ['Neighboring trees', '隣の木のご近所さん'], '반은 같고 반은 서로 추천해 주기 좋은 사이': ['Half the same, half to recommend', '半分同じ、半分はおすすめし合える仲'],
    '서로의 숲 가이드': ['Each other\'s forest guide', 'お互いの森のガイド'], '서로 모르는 명곡을 알려 줄 수 있어요': ['You can show each other unknown gems', '知らない名曲を教え合える'],
    '다른 숲의 탐험가': ['Explorers of different forests', '別の森の探検家'], '취향이 달라서 덕질이 두 배로 넓어져요': ['Different tastes double your fandom world', '好みが違うから推し活が2倍広がる'],
    '한 그루 숲': ['A single-tree forest', '一本の木の森'], '이 모임은 사실 한 사람이에요': ['This group is basically one person', 'このグループは実は一人です'],
    '같은 숲 소풍단': ['Same-forest picnic crew', '同じ森のピクニック隊'], '어느 공연을 같이 가도 신나는 모임': ['Fun together at any show', 'どの公演に一緒に行っても楽しい'],
    '숲속 합창단': ['Forest choir', '森の合唱団'], '떼창 맞추기 딱 좋은 조합이에요': ['Perfect for singing along together', '合唱を合わせるのにぴったり'],
    '각자 다른 숲길 원정대': ['Different-trail expedition', 'それぞれの森の道の遠征隊'], '서로의 최애곡을 돌려 듣기 좋아요': ['Great for swapping favorite songs', 'お互いの最推し曲を回して聴こう'],
    '숲 다양성 연구회': ['Forest diversity club', '森の多様性研究会'], '취향이 다 달라서 이야기할 게 많아요': ['All different, so lots to talk about', 'みんな違うから話すことがたくさん'],
    '우리의 숲별 취향 궁합': ['Our taste match', '私たちの好み相性'], '내 기록도 같이 비교했어요. 아래 \'결과 링크 보내기\'를 누르면 나도 링크에 들어가요.': ['Your records were compared too. Tap "Send result link" below to add yourself.', '自分の記録も比べました。下の「結果リンクを送る」を押すと自分もリンクに入ります。'],
    '취향 사분면': ['Taste quadrant', '好み四象限'], '우리 취향 유형': ['Our taste types', '私たちの好みタイプ'], '우리 모임은': ['Our group', '私たちのグループは'], '모두': ['All', '全員'], '같은 답': ['Same answers', '同じ答え'],
    '하나도 안 겹쳐요. 그래서 더 재밌어요': ['Nothing overlaps. That makes it more fun', '一つも重ならない。だからもっと楽しい'], '여기선 갈렸어요': ['Where you differ', 'ここで分かれました'], '둘 다': ['Both', '二人とも'],
    '제일 잘 맞는 짝꿍': ['Best-matched pairs', '一番相性のいいペア'], '숲별 선배는?': ['Who\'s the senior fan?', '先輩スッピョルは?'], '결과 링크 보내기': ['Send result link', '結果リンクを送る'],
    '결과 링크 보내기 · 다음 사람도 넣을 수 있어요': ['Send result link · the next person can join', '結果リンクを送る・次の人も参加できます'], '결과 이미지 저장': ['Save result image', '結果画像を保存'], '내 링크 새로 만들기': ['Make a new link', '新しいリンクを作る'],
    '비교할 기록이 서로 달라요': ['Your records don\'t overlap', '比べられる記録が違います'], '한 명은 테스트, 한 명은 ♥ 곡처럼 담은 게 달라서 아직 궁합을 잴 수 없어요. 같은 항목을 담아 다시 보내 봐요': ['One shared the test and the other only ♥ songs, so there\'s nothing to compare yet. Send again with the same items.', '一人はテスト、一人は♥曲など入れた項目が違うので、まだ相性を測れません。同じ項目を入れて送り直してみて。'],
    '아직 겹치는 게 없어요': ['Nothing in common yet', 'まだ重なるものがありません'], '서로의 ♥ 곡을 들어 보고 다시 해 봐요': ['Listen to each other\'s ♥ songs and try again', 'お互いの♥曲を聴いてからもう一度'],
    '같이 간 공연': ['Shows you both went to', '一緒に行った公演'], '다 같이 간 공연': ['Shows everyone went to', 'みんなで行った公演'], '어쩌면 같은 공연장에 있었을지도 몰라요': ['You may have been in the same hall', '同じ会場にいたかも'],
    '둘 다 최애곡': ['Both favorites', '二人の最推し曲'], '모두의 최애곡': ['Everyone\'s favorites', 'みんなの最推し曲'], '같이 기다리는 소취곡': ['Wish songs you share', '一緒に待つ聴きたい曲'], '같이 소원 빌어요': ['Let\'s wish together', '一緒に願おう'],
    '둘 다 ♥한 곡': ['Songs you both ♥', '二人とも♥した曲'], '모두 ♥한 곡': ['Songs everyone ♥', 'みんなが♥した曲'], '여럿이 ♥한 곡': ['Songs several of you ♥', '何人かが♥した曲'], '같은 최애 멤버': ['Same favorite member', '同じ推しメン'],
    '내가 만든 궁합 링크예요. 친구가 열면 둘의 궁합이 보여요.': ['This is your own match link. When a friend opens it, they\'ll see your match.', '自分で作った相性リンクです。友だちが開くと二人の相性が見られます。'],
    '님이 궁합 링크를 보냈어요. 내 기록이 있어야 비교할 수 있어요.': [' sent you a match link. You need some records to compare.', 'さんが相性リンクを送りました。比べるには自分の記録が必要です。'],
    '이미지를 저장했어요': ['Image saved', '画像を保存しました'], '나': ['Me', '私'], '(나)': ['(me)', '(私)'], '나의 숲별 취향 지도': ['My taste map', '私の好みマップ'], '우리는 어디쯤?': ['Where are we?', '私たちはどのあたり?'], '숲별 취향 유형 16': ['16 taste types', '好みタイプ16'],
    '숲별 기록장 · 취향 테스트': ['Soopbyeol Archive · Taste test', 'スッピョル記録帳・好みテスト'], '숲별 기록장 · 취향 궁합': ['Soopbyeol Archive · Taste match', 'スッピョル記録帳・好み相性'],
  });
  const RD = { 로: ['Lo', 'ロ'], 라: ['La', 'ラ'], 소: ['So', 'ソ'], 사: ['Sa', 'サ'], 믹: ['mik', 'ミック'], 밉: ['mip', 'ミップ'], 닉: ['nik', 'ニック'], 닙: ['nip', 'ニップ'] };
  const lb = w => (LB[w] || SH[w] || [w, w])[lang === 'ja' ? 1 : 0];
  function trTaste(k) {
    let m;
    if ((m = k.match(/^([로라소사])([믹밉닉닙])$/))) return RD[m[1]][i] + RD[m[2]][i];
    if ((m = k.match(/^(.+) VS (.+)$/)) && VSO[m[1]] && VSO[m[2]]) return `${VSO[m[1]][i]} VS ${VSO[m[2]][i]}`;
    if ((m = k.match(/^완전 (.+)$/)) && SH[m[1]]) return lang === 'ja' ? `完全に${SH[m[1]][1]}` : `Totally ${SH[m[1]][0]}`;
    if ((m = k.match(/^(.+) 쪽$/)) && SH[m[1]]) return lang === 'ja' ? `やや${SH[m[1]][1]}` : `Leaning ${SH[m[1]][0]}`;
    if ((m = k.match(/^(: |· )?(.+) 반반$/))) { const pr = m[2].split('·');  // '큰 공연장·소극장·행사'처럼 가운데 점이 여러 개여도 맞는 곳에서 나눠요
      for (let i = 1; i < pr.length; i++) { const x = pr.slice(0, i).join('·'), y = pr.slice(i).join('·'); if (SH[x] && SH[y]) return `${m[1] || ''}${lang === 'ja' ? `${SH[x][1]}・${SH[y][1]} 半々` : `Half ${SH[x][0]} / ${SH[y][0]}`}`; } }
    if ((m = k.match(/^(×\s*)?([^·]+)·([^·]+)$/)) && SH[m[2]] && SH[m[3]]) return `${m[1] || ''}${SH[m[2]][i]}·${SH[m[3]][i]}`;
    if ((m = k.match(/^: (.+)$/)) && LB[m[1]]) return ': ' + LB[m[1]][i];
    if ((m = k.match(/^내 답: (.+)$/))) return (lang === 'ja' ? '私の答え: ' : 'My answers: ') + (LB[m[1]] ? LB[m[1]][i] : (trTaste(m[1]) || m[1]));
    if ((m = k.match(/^(.+)·(.+) × (.+)·(.+) 취향 지도$/)) && LB[m[1]] && LB[m[3]]) return `${lb(m[1])}·${lb(m[2])} × ${lb(m[3])}·${lb(m[4])} ${lang === 'ja' ? '好みマップ' : 'taste map'}`;
    if ((m = k.match(/^(\w+) · (.+)$/)) && LB[m[2]]) return `${m[1]} · ${LB[m[2]][i]}`;
    if ((m = k.match(/^반대는 (\w) (\w+) · (.+)$/)) && LB[m[3]]) return lang === 'ja' ? `反対は ${m[1]} ${m[2]} · ${LB[m[3]][1]}` : `Opposite: ${m[1]} ${m[2]} · ${LB[m[3]][0]}`;
    if ((m = k.match(/^(.+) · (직관파|기록파|방구석파)$/)) && T[m[1]]) return `${T[m[1]][i]} · ${LB[m[2]][i]}`;
    if ((m = k.match(/^(\d+)명의 숲별 취향 궁합$/))) return lang === 'ja' ? `${m[1]}人の好み相性` : `Taste match of ${m[1]}`;
    if ((m = k.match(/^(\d+)명의 숲별 취향 지도$/))) return lang === 'ja' ? `${m[1]}人の好みマップ` : `Taste map of ${m[1]}`;
    if ((m = k.match(/^(\d+)위$/))) return lang === 'ja' ? m[1] + '位' : '#' + m[1];
    if ((m = k.match(/^(\d+)일$/))) return lang === 'ja' ? m[1] + '日' : m[1] + ' days';
    if ((m = k.match(/^(.*) \(나\)$/))) return `${m[1]} ${lang === 'ja' ? '(私)' : '(me)'}`;
    if (LB[k]) return LB[k][i];
    if (SH[k]) return SH[k][i];
    if ((m = k.match(/^([^가-힣\s]+) (.+)$/)) && T[m[2]]) return `${m[1]} ${T[m[2]][i]}`;
    return null;
  }
  function tr(s) {
    const k = s.trim();
    let m0;
    if (!k || !/[가-힣]/.test(k)) return null;
    if (T[k]) return s.replace(k, T[k][i]);
    { const t2 = trTaste(k); if (t2 != null) return s.replace(k, t2); }
    if (k === '숲별') return s.replace(k, lang === 'ja' ? 'スプビョル' : 'Soopbyeol');
    if ((m0 = k.match(/^(\d+)명$/))) return s.replace(k, lang === 'ja' ? m0[1] + '人' : m0[1] + ' fans');
    if ((m0 = k.match(/^(\d+)곡 중 (\d+)곡 맞혔어요$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}曲中${m0[2]}曲当たり` : `${m0[2]} of ${m0[1]} songs right`);
    if ((m0 = k.match(/^셋리 예측 (\d+)곡 중 (\d+)곡 맞혔어요$/))) return s.replace(k, lang === 'ja' ? `セトリ予想 ${m0[1]}曲中${m0[2]}曲当たり` : `Setlist guess: ${m0[2]} of ${m0[1]} right`);
    if ((m0 = k.match(/^고른 곡 (\d+)곡$/))) return s.replace(k, lang === 'ja' ? `選んだ曲 ${m0[1]}曲` : `${m0[1]} picked`);
    if ((m0 = k.match(/^최근 (\d\d\.\d\d\.\d\d)$/))) return s.replace(k, lang === 'ja' ? `最近 ${m0[1]}` : `Latest ${m0[1]}`);
    if ((m0 = k.match(/^(\d+)점$/))) return s.replace(k, lang === 'ja' ? m0[1] + '点' : m0[1] + ' pts');
    if ((m0 = k.match(/^(\d{4})년 (\d{1,2})월$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}年${m0[2]}月` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m0[2]-1] + ' ' + m0[1]);
    if ((m0 = k.match(/^(\d{1,2})월$/))) return s.replace(k, lang === 'ja' ? m0[1] + '月' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m0[1] - 1]);
    if ((m0 = k.match(/^(\d+\.\d+ \d\d:\d\d) 마감 · 리허설로 셋리가 알려질 수 있어 시작 5시간 전에 닫혀요$/))) return s.replace(k, lang === 'ja' ? `${m0[1]} 締切 · リハでセトリが知られることがあるため開始5時間前に締め切ります` : `Closes ${m0[1]} · 5 hours before start, as rehearsals can reveal the setlist`);
    if ((m0 = k.match(/^셋리 (\d+)곡 ›$/))) return s.replace(k, lang === 'ja' ? `セトリ ${m0[1]}曲 ›` : `Setlist ${m0[1]} songs ›`);
    if ((m0 = k.match(/^(\d+)부터 등록돼요$/)) || (m0 = k.match(/^(\d\d:\d\d)부터 등록돼요$/))) return s.replace(k, lang === 'ja' ? `${m0[1]}から登録できます` : `Opens at ${m0[1]}`);
    if ((m0 = k.match(/^다르게 올라온 판 (\d+)개 더 있어요$/))) return s.replace(k, lang === 'ja' ? `別の版が${m0[1]}件あります` : `${m0[1]} other version(s)`);
    if ((m0 = k.match(/^무대 (\d+)번(?: \(콘서트 (\d+)\))?$/))) return s.replace(k, lang === 'ja' ? `ステージ${m0[1]}回${m0[2] ? `(コンサート${m0[2]})` : ''}` : `${m0[1]} stages${m0[2] ? ` (${m0[2]} concerts)` : ''}`);
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
  const SKIP = 'script,style,textarea,input,.ev-title,.d-title,.song-name,.x-text,.fan-title,.op-body,.lang-keep,.mt-av,.mt-roster b,.mt-pp small,.tsq-dot,.tsq-leg span';
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
