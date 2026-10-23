// 사이트 설정. 시트·폼 주소가 바뀌면 여기만 고치면 돼요.
window.CONFIG = {
  sheets: {
    events: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=1306269272&single=true&output=csv',
    videos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=1124775229&single=true&output=csv',
    reports: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=77904645&single=true&output=csv',
    albums: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=1927596948&single=true&output=csv',  // 음반 정보 탭
    concerts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=1669749288&single=true&output=csv',  // 콘서트 정보 탭
    x: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNdG6P8rWav2itwJt2z9Om7q3WNU-KBojmWOqYTMdXFb7WadSBc2rql_KJB8h1fCnurF6PAdKbkXmH/pub?gid=1934245955&single=true&output=csv',  // 공식X 탭
  },
  form: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdyRlcj5T7KazqvC4mT6KPIM-c13neDsXk0dxXL74yjXK-IKw/viewform',
    fields: {
      content: 'entry.1225620977',  // 통합형 질문 "제보 내용" (종류·날짜·일정·곡·링크·내용을 줄로 넣어요)
    },
  },
  // 보관함(♡·직관)을 다른 폰에서 이어 쓰는 Apps Script 웹 앱 주소. 비어 있으면 이 폰에만 저장해요.
  // 의견·제보 사진 올리기: 보관함 Apps Script에 사진 받는 코드를 붙인 뒤 true로 켜요
  photoUpload: true,
  boxApi: 'https://script.google.com/macros/s/AKfycbwYlE1fytf4V0tpm9HkRHvGZqA7Pnv6YwwM2Cek6cKHPFg_RpxCev9vhv8ZdBF3e5Fkfg/exec',
  // 의견 '처리했어요' 표시는 관리자 기기(#/admin에서 만든 열쇠)의 서명만 인정해요. 여기는 확인용 공개 열쇠예요.
  // 관리자 기기가 여러 대면 줄을 더해요
  adminKeys: [
    { x: "hH6GY2b1cKRyeOZw2fB4N6ATdnayMeX49cNyN0BN85g", y: "YJFmSOEKMzmmJseemhAOcaFqnlrWybmXQaLWbdkPVt8" },
    { x: "CbodUyYm9EYGu3_cXa_vZpv5dHOWIKoSenvolDJbbq8", y: "vWgQiPAv-8U_6RXRs_TOkwOdPrnhX6WnDRytlcKqMsg" },
  ],
  // 저장해 둔 데이터를 이 시간(분)이 지나면 새로 받아요.
  cacheMinutes: 30,
  // 시트를 크게 고쳤을 때 이 숫자를 올리면 모든 폰이 저장본을 버리고 바로 새로 받아요.
  dataVer: 97,
  // 의견 시간 고치기: 이 시각(시트에 찍힌 글자 기준) 전 줄은 +16시간 (시트가 미국 시간대였던 때)
  tsFix: { before: '2026-10-23 06:00', hours: 16 },
};
