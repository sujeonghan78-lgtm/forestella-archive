# 임시: 팬카페에서 비회원이 볼 수 있는 게시판 이름만 확인해요 (확인 후 지워요)
import re, urllib.request, json
UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
def get(u, acc='text/html'):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': acc}), timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except Exception as e:
        return getattr(e, 'code', 0), ''
for u in ['https://m.cafe.daum.net/official.forestella', 'https://m.cafe.daum.net/official.forestella/_menu', 'https://m.cafe.daum.net/api/v1/common-cafe-menus/official.forestella']:
    st, h = get(u)
    boards = sorted(set(re.findall(r'official\.forestella/(\w{4})[^"\']*["\'][^>]*>\s*(?:<[^>]+>\s*)*([^<]{2,30})<', h)))
    print(f'::notice::{u} {st} len={len(h)} boards={len(boards)}')
    names = [f'{c}:{n.strip()}' for c, n in boards][:60]
    for i in range(0, len(names), 15):
        print('::notice::' + ' | '.join(names[i:i + 15]))
    m = re.findall(r'"(?:fldid|grpcode|name|title|boardName)"\s*:\s*"([^"]{1,30})"', h)
    if m: print('::notice::json ' + ' | '.join(m[:40]))
