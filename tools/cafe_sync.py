# 공식 팬카페 스케줄(비회원 공개)에서 일정의 날짜·일정명·장소·분류만 가져와 cafe.json에 저장해요.
# 깃허브 액션이 1시간마다 실행해요. 시트에 이미 있는 일정(ID가 같은 것)은 사이트에서 시트 쪽을 보여줘요.
import json, os, sys, time, urllib.parse, urllib.request
from datetime import date, datetime, timedelta

BASE = 'https://m.cafe.daum.net/official.forestella/XkhA/schedule'
UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
OUT = os.path.join(os.path.dirname(__file__), '..', 'cafe.json')
FIRST = date(2017, 11, 1)


def month_start(d):
    return d.replace(day=1)


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def fetch(month):
    end = add_months(month, 1) - timedelta(days=1)
    q = urllib.parse.urlencode({'startTime': f'{month}T00:00:00+09:00', 'endTime': f'{end}T23:59:59+09:00'})
    req = urllib.request.Request(f'{BASE}?{q}', headers={
        'User-Agent': UA, 'Accept': 'application/json',
        'Referer': 'https://m.cafe.daum.net/official.forestella/XkhA?boardType=Q'})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if d.get('result') != 'ok':
        raise RuntimeError(f'{month}: {d.get("result")}')
    return d['data']['scheduleList']


def clean(s):
    st, en = s['startLocalTime'], s['endLocalTime']
    day = st[:10]
    if s.get('allDay'):
        last = (date.fromisoformat(en[:10]) - timedelta(days=1)).isoformat()
        start = end = '종일'
    else:
        last = en[:10]
        start, end = st[11:16], en[11:16]
    return {
        'id': str(s['scheduleId']),
        'date': day,
        'endDate': last if last > day else '',
        'start': start,
        'end': end,
        'category': (s.get('category') or {}).get('name', ''),
        'title': s.get('title', '').strip(),
        'place': (s.get('location') or '').strip(),
    }


def main():
    full = '--full' in sys.argv
    old = {}
    if os.path.exists(OUT):
        old = {e['id']: e for e in json.load(open(OUT, encoding='utf-8'))['events']}
    today = date.today()
    first = FIRST if full or not old else add_months(month_start(today), -2)
    last = add_months(month_start(today), 12)
    seen, got = set(), {}
    m = first
    while m <= last:
        for s in fetch(m):
            e = clean(s)
            got[e['id']] = e
        seen.add(m.isoformat()[:7])
        m = add_months(m, 1)
        time.sleep(0.5)
    # 확인한 달에 더 이상 없는 일정은 지워진 것으로 봐요
    keep = {k: v for k, v in old.items() if v['date'][:7] not in seen}
    keep.update(got)
    events = sorted(keep.values(), key=lambda e: (e['date'], e['id']))
    if events == sorted(old.values(), key=lambda e: (e['date'], e['id'])):
        print('변경 없음'); return
    json.dump({'source': '포레스텔라 공식 팬카페 스케줄', 'events': events},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'저장: {len(events)}건 (이전 {len(old)}건)')


if __name__ == '__main__':
    main()
