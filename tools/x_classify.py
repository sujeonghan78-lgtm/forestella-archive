"""공식 X 글(data/x_posts.csv)을 종류·멤버별로 나눠 x_feed.json 을 만든다.
사용: python3 tools/x_classify.py [분류.xlsx]
종류는 위에서부터 처음 맞는 것 하나. 멤버는 이름이 나온 사람(넷 다면 비움).
"""
import csv, json, re, sys

CATS = [
    ('생일', r'HBD|생일|가장빛나던날|Happy\s?\w*\s?Day'),
    ('일정 후기', r'완료|종료|마쳤|무사히|함께해\s?주신'),
    ('음반·컴백', r'COMEBACK|NEWSONG|앨범|정규\s?\d|미니\s?\d|선공개|발매|음원|티저|트랙\s?리스트|Lyric Video|M/?V'),
    ('영상', r'VIDEO|youtu|직캠|Fancam|포레미파솔|비하인드|LIVE CLIP|라이브 클립'),
    ('투표·이벤트', r'투표|후보|수상|시상|EVENT|이벤트|포요고사|퀴즈|응모|추첨'),
    ('공지·안내', r'NOTICE|안내|공지|명단|인원 체크|티켓|예매|팬클럽|응원봉|굿즈|MD|입금|환불|일정'),
    ('기사·방송', r'NEWS|naver\.me|기사|인터뷰|본방|방송|라디오'),
]
MEMBERS = {'배두훈': r'두훈|DOOHOON', '강형호': r'형호|HYUNGHO', '조민규': r'민규|MINGYU', '고우림': r'우림|WOORIM'}

def classify(text):
    cat = next((c for c, rx in CATS if re.search(rx, text, re.I)), '사진·일상')
    mem = [m for m, rx in MEMBERS.items() if re.search(rx, text, re.I)]
    return cat, (mem if len(mem) < 4 else [])

def clean(t):
    t = re.sub(r'^\[[^\]]*\]\s*', '', t)
    t = re.sub(r'#\S+', '', t).replace('더보기', '')
    return re.sub(r'\s+', ' ', t).strip()[:120]

def main(out_xlsx=None):
    posts = list(csv.DictReader(open('data/x_posts.csv', encoding='utf-8')))
    try: photos = json.load(open('data/x_photos.json', encoding='utf-8'))
    except FileNotFoundError: photos = {}
    feed = []
    for p in posts:
        cat, mem = classify(p['text'])
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
