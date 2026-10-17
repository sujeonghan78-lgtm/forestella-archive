"""공식 X 글(data/x_posts.csv)을 종류·멤버별로 나눠 x_feed.json 을 만든다.
사용: python3 tools/x_classify.py 분류.xlsx events.csv
종류는 위에서부터 처음 맞는 것 하나. 멤버는 이름이 나온 사람(넷 다면 비움).
"""
import csv, json, re, sys, datetime as dt
sys.path.insert(0, 'tools')

CATS = [
    ('생일', r'HBD|생일|가장빛나던날|Happy\s?\w*\s?Day'),
    ('일정 후기', r'완료|종료|마쳤|무사히|함께해\s?주신'),
    ('투표·이벤트', r'투표|후보|EVENT|이벤트|포요고사|퀴즈|응모|추첨'),
    ('음반·컴백', r'COMEBACK|NEWSONG|앨범|정규\s?\d|미니\s?\d|선공개곡|PocaAlbum|포카앨범|발매|음원|티저|트랙\s?리스트|Lyric Video|\bM/?V\b'),
    ('영상', r'VIDEO|youtu|직캠|Fancam|포레미파솔|비하인드|LIVE CLIP|라이브 클립'),
    ('공지·안내', r'NOTICE|안내|공지|명단|인원 체크|티켓|예매|팬클럽|응원봉|굿즈|MD|입금|환불|일정|멤버십|멤버쉽|fromm|판매'),
    ('기사', r'NEWS|naver\.me|기사|인터뷰|화보|매거진|Magazine'),
]
MEMBERS = {'배두훈': r'두훈|DOOHOON', '강형호': r'형호|HYUNGHO', '조민규': r'민규|MINGYU', '고우림': r'우림|WOORIM'}

# 방송·공연 현장 글: 근처(전날~사흘 뒤) 일정과 이름이 겹치거나 이런 낱말이 있으면
STAGE = r'음중|LEGACY|ROYAL|ILLUSIONIST|THE WAVE|SYMPHONY|D-\d|불후|명곡|열린음악회|음악중심|뮤직뱅크|인기가요|가요|콘서트|공연|축제|페스티벌|무대|녹화|출근길|퇴근길|대기실|백스테이지|리허설|방송|라디오|팬사인|시구|시상식|대상|투어|TOUR|LIVE'

def near_event(date, text, byday, evs):
    from x_behind import words
    flat = re.sub(r'\s', '', text.lower())
    d0 = dt.date.fromisoformat(date)
    for k in range(-3, 2):
        for i in byday.get((d0 + dt.timedelta(days=k)).isoformat(), []):
            ws = [w for w in words(evs[i][2]) if w in flat]
            if len(ws) >= 2 or any(len(w) >= 4 for w in ws):
                return i
    return ''

def classify(text, ev=''):
    text = re.sub(r'(https?://\s?[\w.]+)\S*', r'\1', text)  # 링크 뒤 영상 ID(…MvB…)가 낱말로 잡히지 않게
    cat = next((c for c, rx in CATS[:7] if re.search(rx, text, re.I)), '')
    if not cat and (ev or re.search(STAGE, text, re.I)):
        cat = '일정 현장'
    cat = cat or next((c for c, rx in CATS[7:] if re.search(rx, text, re.I)), '사진·일상')
    mem = [m for m, rx in MEMBERS.items() if re.search(rx, text, re.I)]
    return cat, (mem if len(mem) < 4 else [])

def clean(t):
    t = re.sub(r'^\[[^\]]*\]\s*', '', t)
    body = re.sub(r'#\S+', '', t).replace('더보기', '')
    body = re.sub(r'\s+', ' ', body).strip()
    if not body:  # 해시태그뿐인 글은 해시태그를 보여줘요
        body = ' '.join(h for h in re.findall(r'#(\S+)', t) if h.lower() not in ('포레스텔라', 'forestella'))
    return body[:120]

def main(out_xlsx=None, events_csv="events.csv"):
    posts = list(csv.DictReader(open('data/x_posts.csv', encoding='utf-8')))
    try: photos = json.load(open('data/x_photos.json', encoding='utf-8'))
    except FileNotFoundError: photos = {}
    from x_match import load_events, days
    evs = load_events(events_csv)
    byday = {}
    for i, (a, b, t) in evs.items():
        for d in days(a, b):
            byday.setdefault(d.isoformat(), []).append(i)
    feed = []
    for p in posts:
        ev = near_event(p['date'], p['text'], byday, evs)
        cat, mem = classify(p['text'], ev)
        feed.append({'id': p['id'], 'date': p['date'], 'cat': cat, 'm': mem,
                     'text': clean(p['text']), 'img': (photos.get(p['id']) or [''])[0]})
    feed.sort(key=lambda x: x['id'], reverse=True)
    json.dump({'source': '포레스텔라 공식 X @official_fore', 'posts': feed},
              open('x_feed.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(Counter(f['cat'] for f in feed).most_common())
    print(Counter(m for f in feed for m in f['m']).most_common())
    if out_xlsx:
        import openpyxl
        wb = openpyxl.Workbook(); w = wb.active; w.title = '분류'
        w.append(['날짜', '종류', '멤버', '글', '링크'])
        for f, p in zip(feed, sorted(posts, key=lambda x: x['id'], reverse=True)):
            w.append([f['date'], f['cat'], ', '.join(f['m']), p['text'], 'https://x.com/official_fore/status/' + f['id']])
        wb.save(out_xlsx)

if __name__ == '__main__':
    main(*sys.argv[1:])
