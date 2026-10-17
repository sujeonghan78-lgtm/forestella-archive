"""공식 X 글(data/x_posts.csv)에서 일정마다 대표 글 1개를 골라 x.json 을 만든다.
사용: python3 tools/x_match.py events.csv [분류결과.xlsx]
- 일정 날짜(기간 포함)와 다음날 올라온 글 중에서 고른다.
- "완료·종료" 같은 말, 글 속 날짜(221014), 일정명 낱말이 많이 맞을수록 점수가 높다.
- 영상·공지·생일 글은 빼고, 점수가 모자라면 붙이지 않는다.
"""
import csv, json, re, sys, datetime as dt

DONE = re.compile(r'완료|종료|마쳤|마무리|함께해\s?주신|함께\s?해주신|감사합니다|무사히')
SKIP = re.compile(r'FORESTELLA_(VIDEO|NOTICE|NEWSONG|DATA|EVENT)|HBD|생일')

def days(a, b):
    a = dt.date.fromisoformat(a); b = dt.date.fromisoformat(b or a.isoformat())
    while a <= b:
        yield a; a += dt.timedelta(days=1)

def words(title):
    t = re.sub(r'\[[^\]]*\]|\([^)]*\)|<[^>]*>', ' ', title)
    return {w for w in re.split(r'[\s/·,:!?\'"《》「」\-]+', t.lower()) if len(w) >= 2}

def score(ev_dates, title, p):
    text = p['text']
    if SKIP.search(text):
        return -1
    s = 3 if DONE.search(text) else 0
    if any(d.strftime('%y%m%d') in text for d in ev_dates):
        s += 3
    flat = re.sub(r'\s', '', text.lower())
    s += sum(1 for w in words(title) if w in flat)
    return s

def load_events(events_csv):
    evs = {}
    for e in csv.DictReader(open(events_csv, encoding='utf-8')):
        if e.get('ID') and e.get('날짜') and e.get('공개여부', '공개') != '비공개':
            evs[e['ID']] = (e['날짜'][:10], (e.get('종료일') or '')[:10], e['일정명'])
    try:
        for e in json.load(open('cafe.json', encoding='utf-8'))['events']:
            evs.setdefault(e['id'], (e['date'], e.get('endDate') or '', e['title']))
    except FileNotFoundError:
        pass
    return evs

def main(events_csv, out_xlsx=None):
    evs = load_events(events_csv)
    posts = list(csv.DictReader(open('data/x_posts.csv', encoding='utf-8')))
    byday = {}
    for p in posts:
        byday.setdefault(p['date'], []).append(p)
    best = {}   # 글 id -> (점수, 일정 id): 한 글은 점수가 가장 높은 일정 하나에만
    for i, (a, b, title) in evs.items():
        ds = list(days(a, b))
        look = ds + [ds[-1] + dt.timedelta(days=1)]
        cands = [p for d in look for p in byday.get(d.isoformat(), [])]
        sc = sorted(((score(ds, title, p), p['id']) for p in cands), reverse=True)
        if sc and sc[0][0] >= 4:
            s, pid = sc[0]
            if pid not in best or best[pid][0] < s:
                best[pid] = (s, i)
    out = {i: pid for pid, (s, i) in best.items()}
    try: photos = json.load(open('data/x_photos.json', encoding='utf-8'))
    except FileNotFoundError: photos = {}
    byid = {p['id']: p for p in posts}
    def clean(t):  # 앞의 [태그]·해시태그·"더보기" 빼고 짧게
        t = re.sub(r'^\[[^\]]*\]\s*', '', t)
        t = re.sub(r'#\S+', '', t).replace('더보기', '')
        return re.sub(r'\s+', ' ', t).strip()[:90]
    info = {pid: [byid[pid]['date'], clean(byid[pid]['text']), (photos.get(pid) or [''])[0]] for pid in out.values()}
    json.dump({'source': '포레스텔라 공식 X @official_fore', 'events': out, 'posts': info},
              open('x.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'일정 {len(evs)}개 중 {len(out)}개에 대표 글을 붙임')
    if out_xlsx:
        import openpyxl
        text = {p['id']: p for p in posts}
        wb = openpyxl.Workbook(); w = wb.active; w.title = '붙은 글'
        w.append(['일정 날짜', '일정명', '글 날짜', '글', '링크'])
        for i, pid in sorted(out.items(), key=lambda x: evs[x[0]][0]):
            p = text[pid]
            w.append([evs[i][0], evs[i][2], p['date'], p['text'], f'https://x.com/official_fore/status/{pid}'])
        wb.save(out_xlsx)

if __name__ == '__main__':
    main(*sys.argv[1:])
