"""다른 데이터 출처 시험: 결과는 ::notice:: 로만 남겨요."""
import json, re, urllib.request, urllib.parse
UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
def get(url, **h):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **h})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode('utf-8', 'replace')
def note(*a): print('::notice::' + ' '.join(str(x) for x in a))

out = []
try:
    st, rss = get('https://www.youtube.com/feeds/videos.xml?channel_id=UCTBf-j9GoCHfqjNHT42ta3Q')
    note('RSS', st, len(rss), rss.count('<entry>'), re.sub(r'\s+', ' ', rss[:300]))
except Exception as e: note('RSS 오류', e)
try:
    st, t = get('https://www.youtube.com/@forestella/videos')
    ids = list(dict.fromkeys(re.findall(r'"videoId":"([\w-]{11})"', t)))
    title = re.search(r'<title>(.*?)</title>', t)
    note('채널 영상 페이지', st, title.group(1) if title else '', '영상 ID', len(ids), re.findall(r'"subscriberCountText":\{[^}]*"simpleText":"([^"]+)"', t)[:1])
except Exception as e: note('채널 오류', e)
# 3) 웹 아카이브에 남은 다른 곳
for u in ['m.cafe.daum.net/official.forestella/*', 'cafe.daum.net/official.forestella/*', 'www.instagram.com/official_forestella/*',
          'www.instagram.com/forestella_official/*', 'twitter.com/forestella_info/*', 'www.youtube.com/@forestella*', 'www.vlive.tv/channel/*forestella*']:
    try:
        st, t = get('https://web.archive.org/cdx/search/cdx?' + urllib.parse.urlencode({'url': u, 'output': 'json', 'fl': 'original', 'collapse': 'urlkey', 'limit': 5000}))
        rows = json.loads(t or '[]')[1:]
        out.append(f"{u}={len(rows)}")
    except Exception as e: out.append(f"{u}=오류{e}")
note('아카이브', ' | '.join(out))
