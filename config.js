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
  boxApi: 'https://script.google.com/macros/s/AKfycbwYlE1fytf4V0tpm9HkRHvGZqA7Pnv6YwwM2Cek6cKHPFg_RpxCev9vhv8ZdBF3e5Fkfg/exec',
  // 저장해 둔 데이터를 이 시간(분)이 지나면 새로 받아요.
  cacheMinutes: 30,
  // 시트를 크게 고쳤을 때 이 숫자를 올리면 모든 폰이 저장본을 버리고 바로 새로 받아요.
  dataVer: 70,
};
