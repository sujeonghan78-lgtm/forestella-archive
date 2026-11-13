# 라이브 방송 정리(txt, NotebookLM 양식) → data/live_notes.json
# 쓰는 법: python3 tools/live_notes.py <정리 폴더>   (파일 이름: YYYYMMDD_정리[1|2].txt)
import json, re, sys, os
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'live_notes.json')
# 파일 이름 → 유튜브 영상 ID
VID = {'20210818': 'x4j9nWcl48c', '20210907_1': '6BseXLp3iCY', '20210907_2': 'cZlwVAuH9d4', '20211104': 'v3dFc2YP3y4',
       '20211224': 'FM6G1NiURXY', '20220203': 'V_-_Mgr37vE', '20220331': 'N_ctndUTkdM', '20220428': 'a5J3R0O6gMY',
       '20220818': 'mdn8ulBi_-A', '20221222': '14ob3B8oAn4', '20230314': '0hn5rQp47lg', '20231117_1': 'NWvxIvzI5aA',
       '20231117_2': 'EEjP0k1zYMI', '20240122': 'VRUJ4ecaLhM', '20240523_1': 'bIg48oHKHGs', '20240523_2': 'kimi5epNzXM',
       '20240814': 'nSOf6X9Gvlc', '20250519': 'VhZjhtRQQQA', '20250709': '9kFcBEPfzOQ', '20251221': '8mh4KGjytEk',
       '20260422': 'pcnI-GHOJZk'}
SECS = [('sum', r'요약'), ('tl', r'타임라인'), ('songs', r'부른 곡'), ('mo', r'멤버별 순간'), ('news', r'알려준 소식'),
        ('tmi', r'TMI'), ('fan', r'팬\s*\(?숲별'), ('kw', r'검색 키워드')]
TIME = r'(?<![\d:])(\d{1,2}):(\d{2})(?![\d:])'
SCORE = re.compile(r'\s*\d+(?:\.\d+)?\s*(?:초|dB|데시벨|점)(?:으로|로|의|를|을|에)?(?=[\s,.)]|$)')
SURE = re.compile(r'(배두훈|강형호|조민규|고우림|두훈|형호|민규|우림|포레스텔라|숲별)\(\?\)')

# 자막이 소리 나는 대로 받아 적은 곡 이름 → 정식 표기
FIX = {'빠르라 피아노': 'Parla più piano', '인 운알트라 비타': "In Un'altra Vita", '스카브로 페어': 'Scarborough Fair',
       '나우 위 아 프리': 'Now We Are Free', '아마게돈': 'Armageddon', '스노우 글로브': 'Snow Globe', '유토피아': 'UTOPIA',
       '이너 유니버스': 'Inner Universe', '샤갈 스트림': "Chagall's Dream", '불후의명곡': '불후의 명곡', '세아라': 'Save Our Lives',
       'MISTY': '미스티크', '베드로맨스': '배드 로맨스', '마마': '마마(MAMA)', '피타': '피타(PITTA)'}  # 11-13 수정 님 확인
# 확실한 이름은 (?) 빼기 (프로그램·곡·장소·사람)
CERTAIN = ['불후의 명곡', '열린음악회', '뮤직뱅크', '가요대축제', '유퀴즈', '유퀴즈 온 더 블럭', '전참시', '전지적 참견 시점', '나 혼자 산다',
           '구해줘! 홈즈', 'SNL', 'MAMA', 'Mnet MAMA', '엠카', '코첼라', '고척돔', '체조경기장', '올림픽홀', '서울 올림픽공원 올림픽홀',
           '비트인터렉티브', '숲별봉', '렌트', '뮤지컬 렌트', 'KOOL', 'Utopia', 'UTOPIA', 'Everything', 'Snow Globe', 'Armageddon',
           'Scarborough Fair', 'Now We Are Free', "In Un'altra Vita", 'Parla più piano', 'Parla Più Piano', 'Piano', 'Inner Universe',
           "Chagall's Dream", 'My Eden', '꽃병', '제비꽃', '달팽이', '내 마음에 주단을 깔고', '바람이 분다', '테스형', '라젠카', '아브라카다브라',
           '검은 고양이 네로', '어버이 은혜', '스승의 은혜', '생일 축하 노래', '레이디 가가', '칸노 요코', 'Kanno Yoko', '김세황', '황성제',
           '더 웨이브', 'THE LEGACY', '뉴노멀 라이브', '모노드라마', '스파이', '숲별 3기', '숲별 2.5기', '시즌 그리팅', '포레시피', '포레위키',
           '포레스텔라 나이트 라이브 쇼', '블랙 콘서트', '삼달리', '인사이드 아웃', '살리에르', '아마데우스', '모나리자',
           '나가거든', '뉴텔라', '포레 사이드 아웃', 'The Light', 'SNL 패러디', '지편한 세상', '마카 애니메이션 스튜디오', 'The Greatest Show',
           '김비트', '포레미파솔', '내 남편과 결혼해줘', '장충스텔라', '콘헤드', '거미다리', '원더케이', '라이브 와이어']  # 11-13 수정 님 확인
FIX_Q = {'MISTY', '마마', '피타'}   # (?) 붙은 것만 바꾸기
FIX_RX = re.compile('(' + '|'.join(re.escape(k) for k in sorted(FIX, key=len, reverse=True)) + r')(\(\?\))?')
CERT_RX = re.compile('(' + '|'.join(re.escape(k) for k in sorted(CERTAIN, key=len, reverse=True)) + r')\(\?\)')

# 아직 확인 안 된 것만 (?) 남기고 나머지는 다 빼기 (11-13 수정 님 '이미 정리된 것도 빼')
UNSURE = ['저녁 축하 노래', 'FNL 공연', '숲속의 방', '지옥의 환상곡', '우리우리 설날은', '별이 빛나는 밤', '별밤', '발렌시아', 'VALENCIA',
          '매일 매일', '다시는 너를', 'Days', '김몽초', '굿바이 유튜버', '오나 갑자기 내게 다가와', '고등학교 입시곡', '힐링 캠프',
          '크리스마스 다 함께', '바미로']
# 11-13 수정 님 답: 아래로 고치고 나머지 (?)는 다 빼기
SUB = [(r"(In Un'altra Vita'?)\s*\((?:숲속의 방|지옥의 환상곡)\(\?\)\)", r'\1'), (r'저녁 축하 노래', '전역 축하 노래'),
       (r'FNL 공연', '포레스텔라 나이트 라이브 쇼(FNL) 공연'), (r'까치까치 설날은\s*/\s*우리우리 설날은(\(\?\))?', '설날'),
       (r'우리우리 설날은(\(\?\))?', '설날'), (r'별이 빛나는 밤\(\?\)\(별밤\(\?\)\)', '별이 빛나는 밤에(별밤)'), (r'별이 빛나는 밤\(\?\)', '별이 빛나는 밤에')]
UNSURE = []
KEEP_RX = re.compile('(' + '|'.join(re.escape(k) for k in UNSURE) + r')\(\?\)' if UNSURE else r'(?!x)x')

def clean(s):
    s = SURE.sub(r'\1', SCORE.sub('', s.replace('`', ''))).strip(' *-·\t|')
    s = CERT_RX.sub(r'\1', FIX_RX.sub(lambda m: m.group(0) if m.group(1) in FIX_Q and not m.group(2) else FIX[m.group(1)], s))
    s = re.sub(r'(\(([A-Z]+)\))\(\2\)', r'\1', s)
    for rx, to in SUB: s = re.sub(rx, to, s)
    s = KEEP_RX.sub(lambda m: m.group(1) + '\0', s).replace('(?)', '').replace('\0', '(?)')   # 마마(MAMA)(MAMA) → 하나만
    s = re.sub(r"([A-Za-z][\w' ]+)\s*\(\s*\1\s*\)", r'\1', s, flags=re.I)   # Parla più piano(Parla Più Piano) → 하나만
    return re.sub(r'\s{2,}', ' ', s)

def entries(body, n):
    body = re.sub(r'시:분\s*\|[^\n]*?(?=\s\d{1,2}:\d{2}\s*\||\n|$)', ' ', body)   # 양식 머리줄
    body = body.replace('`', '')
    parts = re.split(r'(?:^|\s|\*)\s*(?=\d{1,2}:\d{2}\s*\|)', body)
    out = []
    for p in parts:
        m = re.match(r'\s*(\d{1,2}):(\d{2})\s*\|(.*)', p, re.S)
        if not m: continue
        cols = [clean(c) for c in re.sub(r'\s+', ' ', m[3]).split('|')]
        cols = [c for c in cols if c != '']
        if not cols: continue
        sec = int(m[1]) * 3600 + int(m[2]) * 60
        while len(cols) < n: cols.append('')
        out.append([sec] + cols[:n - 1] + [' · '.join(cols[n - 1:]) if len(cols) > n - 1 else ''] if n > 1 else [sec, ' '.join(cols)])
    return out

def parse(txt):
    j = txt.find('방송 제목 / 날짜', 20)
    if j > 0: txt = txt[:j]
    head = {}
    for k, rx in [('title', r'방송 제목\s*:\s*(.+)'), ('date', r'방송 날짜\s*:\s*(.+)'), ('mem', r'(?:나온|출연) 멤버\s*:\s*(.+)')]:
        m = re.search(rx, txt)
        head[k] = m[1].strip() if m else ''
    pos = []
    for k, rx in SECS:
        m = re.search(r'(?m)^[#\s*]*' + rx + r'[^\n:]*:?', txt)
        if m: pos.append((m.start(), m.end(), k))
    pos.sort()
    res = {'title': clean(head['title']), 'members': clean(head['mem'])}
    for n, (a, b, k) in enumerate(pos):
        body = txt[b: pos[n + 1][0] if n + 1 < len(pos) else len(txt)]
        if k == 'sum':
            lines = [l.strip() for l in body.split('\n')]
            joined = []
            for l in lines:
                if not l: continue
                if l in '.。' and joined: joined[-1] += '.'; continue
                joined.append(re.sub(r'^\d+\.\s*', '', l))
            res['sum'] = [clean(l) for l in joined if len(l) > 3]
        elif k == 'kw':
            res['kw'] = [clean(x) for x in re.split(r'[,，\n]', body) if clean(x) and not re.fullmatch(r'\d{8}', clean(x)) and len(clean(x)) < 30][:25]
        elif k == 'tl': res['tl'] = entries(body, 2)
        elif k == 'songs':
            res['songs'] = [x for x in entries(body, 3) if x[1] and '미상' not in x[1]]
        elif k == 'mo': res['mo'] = entries(body, 2)
        else: res[k] = entries(body, 1)
    return res

notes = {}
for f in sorted(os.listdir(SRC)):
    m = re.match(r'(\d{8})_정리(\d?)\.txt$', f)
    if not m: continue
    key = m[1] + ('_' + m[2] if m[2] else '')
    vid = VID.get(key)
    if not vid: print('영상 ID 모름:', f); continue
    r = parse(open(os.path.join(SRC, f), encoding='utf-8').read())
    r['date'] = f'{m[1][:4]}-{m[1][4:6]}-{m[1][6:]}'
    notes[vid] = r
    print(f, vid, {k: len(v) for k, v in r.items() if isinstance(v, list)})
json.dump(notes, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('저장', OUT, os.path.getsize(OUT))
