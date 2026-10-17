"""포레미파솔·비하인드 글을 앞선 일정에 맞춘다 (날짜가 몇 달 뒤일 수 있음).
사용: python3 tools/x_behind.py events.csv [결과.xlsx]  → x.json 에 behind 추가
- 글 속 날짜(240709)가 있으면 그 날 일정 중에서, 없으면 글 이전 1년 안 일정 중에서 고른다.
- 일정명 낱말 점수 2 이상이어야 붙이고, 글에 연도가 있으면 그 해 일정만 본다.
"""
import csv, json, re, sys, datetime as dt
sys.path.insert(0, 'tools')
from x_match import load_events

BEHIND = re.compile(r'포레미파솔|비하인드|BEHIND|직캠|Fancam', re.I)
STOP = {'포레스텔라', 'forestella', '비하인드', '포레미파솔', 'behind', '콘서트', 'concert', '2021', '2022', '2023', '2024', '2025', '2026', 'kbs2', 'mbc', 'sbs', 'kbs'}

def words(title):
    t = re.sub(r'\[[^\]]*\]|\([^)]*\)', ' ', title)
    return {w for w in re.split(r'[\s/·,:!?\'"<>《》「」\-–]+', t.lower()) if len(w) >= 2 and w not in STOP}

def main(events_csv, out_xlsx=None):
    evs = load_events(events_csv)
    posts = [p for p in csv.DictReader(open('data/x_posts.csv', encoding='utf-8')) if BEHIND.search(p['text']) and not re.search(r'COMEBACK|NEWSONG', p['text'])]
    res = {}; rows = []
    for p in posts:
        flat = re.sub(r'\s', '', p['text'].lower())
        pd = dt.date.fromisoformat(p['date'])
        years = set(re.findall(r'(?<!\d)(20[12]\d)(?!\d)', p['text']))
        codes = set(re.findall(r'(?<!\d)(\d{6})(?!\d)', p['text']))
        best = (0, '', '')
        for i, (a, b, title) in evs.items():
            ed = dt.date.fromisoformat(a)
            if not (pd - dt.timedelta(days=400) <= ed <= pd + dt.timedelta(days=1)):
                continue
            if years and a[:4] not in years and not (ed.strftime('%y%m%d') in codes):
                continue  # 글에 연도가 있으면 그 해 일정만
            ws = [w for w in words(title) if w in flat]
            s = len(ws) + (sum(1 for w in ws if len(w) >= 4) * 0.5)
            if ed.strftime('%y%m%d') in codes: s += 2
            if s < 2: continue
            key = (s, a)  # 점수 같으면 더 최근 일정
            if key > best[:2]: best = (s, a, i)
        if best[2]:
            res.setdefault(best[2], []).append(p['id'])
        rows.append([p['date'], p['text'][:120], evs[best[2]][0] if best[2] else '', evs[best[2]][2] if best[2] else '(못 찾음)', best[0]])
    d = json.load(open('x.json', encoding='utf-8'))
    try: photos = json.load(open('data/x_photos.json', encoding='utf-8'))
    except FileNotFoundError: photos = {}
    d['behind'] = res
    for ids in res.values():
        for pid in ids:
            q = next(x for x in posts if x['id'] == pid)
            t = re.sub(r'^\[[^\]]*\]\s*', '', q['text']); t = re.sub(r'#\S+|https?://\s?\S+', '', t)
            d['posts'][pid] = [q['date'], re.sub(r'\s+', ' ', t).strip()[:90], (photos.get(pid) or [''])[0]]
    json.dump(d, open('x.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'비하인드 글 {len(posts)}개 중 {sum(len(v) for v in res.values())}개를 일정 {len(res)}개에 붙임')
    if out_xlsx:
        import openpyxl
        wb = openpyxl.Workbook(); w = wb.active; w.title = '비하인드'
        w.append(['글 날짜', '글', '일정 날짜', '붙은 일정', '점수'])
        for r in rows: w.append(r)
        wb.save(out_xlsx)

if __name__ == '__main__':
    main(*sys.argv[1:])
