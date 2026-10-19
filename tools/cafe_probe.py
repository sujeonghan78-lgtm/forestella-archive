# 임시: 팬카페 공지 게시판을 비회원이 볼 수 있는지, 어떤 글이 있는지 제목만 확인해요 (확인 후 지워요)
import re, urllib.request, html
UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except Exception as e:
        return getattr(e, 'code', 0), ''
for u in ['https://m.cafe.daum.net/official.forestella/XaNR', 'https://m.cafe.daum.net/official.forestella/XaNR?page=5', 'https://m.cafe.daum.net/official.forestella/_rec']:
    st, h = get(u)
    titles = [html.unescape(re.sub(r'<[^>]+>|\s+', ' ', t)).strip() for t in re.findall(r'class="txt_detail"[^>]*>(.*?)</span>', h, re.S)]
    dates = re.findall(r'class="created_at"[^>]*>([^<]+)<|class="num_info"[^>]*>\s*<span[^>]*>([\d.]+)', h)
    print(f'::notice::{u} {st} len={len(h)} titles={len(titles)} login={"로그인" in h}')
    for i in range(0, min(len(titles), 30), 10):
        print('::notice::' + ' | '.join(t[:40] for t in titles[i:i + 10]))
    if not titles: print('::notice::classes ' + ' '.join(sorted(set(re.findall(r'class="([a-z_]+)"', h)))[:60]))
