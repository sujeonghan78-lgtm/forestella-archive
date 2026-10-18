"""다른 데이터 출처 시험: 결과는 ::notice:: 로만 남겨요."""
import json, re, urllib.request, urllib.parse
UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
def get(url, **h):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **h})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode('utf-8', 'replace')
def note(*a): print('::notice::' + ' '.join(str(x) for x in a))

# 1) 팬카페 캘린더 옛날 달
for ym in ['2018-03', '2018-12', '2019-06', '2020-08', '2021-03', '2021-07']:
    try:
        q = urllib.parse.urlencode({'startTime': f'{ym}-01T00:00:00+09:00', 'endTime': f'{ym}-28T23:59:59+09:00'})
        st, t = get('https://m.cafe.daum.net/official.forestella/XkhA/schedule?' + q, Accept='application/json', Referer='https://m.cafe.daum.net/official.forestella/XkhA?boardType=Q')
        d = json.loads(t); note('카페', ym, d.get('result'), len((d.get('data') or {}).get('scheduleList') or []))
    except Exception as e: note('카페', ym, '오류', e)

# 2) 유튜브 공식 채널
for h in ['@forestella', '@FORESTELLA_official', '@forestellaofficial', '@포레스텔라']:
    try:
        st, t = get('https://www.youtube.com/' + urllib.parse.quote(h))
        m = re.search(r'"channelId":"(UC[\w-]{22})"', t) or re.search(r'channel/(UC[\w-]{22})', t)
        title = re.search(r'<title>(.*?)</title>', t)
        if m:
            st2, rss = get('https://www.youtube.com/feeds/videos.xml?channel_id=' + m.group(1))
            note('유튜브', h, m.group(1), title.group(1) if title else '', 'RSS 영상', rss.count('<entry>'))
        else: note('유튜브', h, st, '채널 못 찾음')
    except Exception as e: note('유튜브', h, '오류', e)

# 3) 웹 아카이브에 남은 다른 곳
for u in ['m.cafe.daum.net/official.forestella/*', 'cafe.daum.net/official.forestella/*', 'www.instagram.com/official_forestella/*',
          'www.instagram.com/forestella_official/*', 'twitter.com/forestella_info/*', 'www.youtube.com/@forestella*', 'www.vlive.tv/channel/*forestella*']:
    try:
        st, t = get('https://web.archive.org/cdx/search/cdx?' + urllib.parse.urlencode({'url': u, 'output': 'json', 'fl': 'original', 'collapse': 'urlkey', 'limit': 5000}))
        rows = json.loads(t or '[]')[1:]
        note('아카이브', u, len(rows), (rows[1][0] if len(rows) > 1 else ''))
    except Exception as e: note('아카이브', u, '오류', e)
