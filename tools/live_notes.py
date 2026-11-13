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

def clean(s):
    s = SURE.sub(r'\1', SCORE.sub('', s.replace('`', ''))).strip(' *-·\t|')
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
    res = {'title': clean(head['title']), 'members': head['mem']}
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
