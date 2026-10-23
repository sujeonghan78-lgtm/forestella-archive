# 일정 장소(공연장 이름)를 OpenStreetMap 검색(Nominatim)으로 좌표로 바꿔 data/places.json에 저장해요.
# 찾은 것만 저장하고, 못 찾은 장소는 사이트가 시·도 중심으로 묶어 보여줘요. 이미 찾은 장소는 다시 안 찾아요.
# Nominatim 이용 규칙: 1초에 한 번, 이름 있는 User-Agent.
import csv, io, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'data', 'places.json')
UA = 'soopbyeol-archive/1.0 (fan archive; github.com/sujeonghan78-lgtm/forestella-archive)'
CITIES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '수원', '고양', '성남', '용인', '창원', '전주', '청주', '천안', '포항', '김해', '제주', '서귀포',
          '춘천', '원주', '강릉', '여수', '순천', '목포', '경주', '안동', '구미', '진주', '통영', '거제', '양산', '하남', '의정부', '부천', '안산', '안양', '화성', '평택', '파주', '김포', '남양주', '인제', '동해', '속초']


def sheet_url():
    t = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
    return re.search(r"events:\s*'([^']+)'", t).group(1)


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'ko'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8')


def places():
    rows = list(csv.DictReader(io.StringIO(get(sheet_url()))))
    extra = json.load(open(os.path.join(ROOT, 'data', 'extra_events.json'), encoding='utf-8'))
    rows += extra.get('rows', [])
    fix = extra.get('placeFix', {})
    out = {}
    for r in rows:
        if (r.get('공개여부') or '') == '숨김':
            continue
        p = (r.get('장소') or '').strip() or fix.get(r.get('ID', ''), '')
        if not p:
            m = re.search(r'장소\s*[:：]\s*(.+)', r.get('내용') or '')
            p = m.group(1).strip() if m else ''
        if p and len(p) >= 2:
            out[p] = out.get(p, 0) + 1
    try:
        for c in json.load(open(os.path.join(ROOT, 'cafe.json'), encoding='utf-8')).get('events', []):
            if c.get('place'):
                out[c['place']] = out.get(c['place'], 0) + 1
    except Exception:
        pass
    return out


def queries(p):
    q = [p]
    base = re.sub(r'\([^)]*\)|\[[^\]]*\]', ' ', p)
    base = re.sub(r'\s+', ' ', base).strip()
    if base and base not in q:
        q.append(base)
    # "OO아트홀 대공연장"처럼 끝의 홀 이름을 떼고 건물만
    short = re.sub(r'\s*(대|소|중)?(공연장|극장|홀|무대|스테이지|STAGE|광장)$', '', base, flags=re.I).strip()
    if short and short not in q and len(short) >= 3:
        q.append(short)
    words = base.split(' ')
    if len(words) > 2:
        q.append(' '.join(words[:2]))
    return q


def find(p):
    city = next((c for c in CITIES if c in p), '')
    for q in queries(p):
        url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'jsonv2', 'countrycodes': 'kr', 'limit': 3, 'accept-language': 'ko'})
        time.sleep(1.1)
        try:
            res = json.loads(get(url))
        except Exception as e:
            print('ERR', p, e, file=sys.stderr)
            continue
        for r in res:
            name = r.get('display_name', '')
            if city and city not in name:
                continue
            # 행정구역(시·군)만 나온 건 공연장 좌표가 아니라 빼요
            if r.get('category') == 'boundary' or r.get('type') in ('administrative', 'city', 'town', 'county', 'province'):
                continue
            exact = q == p or q == queries(p)[1]
            return {'lat': round(float(r['lat']), 6), 'lng': round(float(r['lon']), 6), 'name': name.split(',')[0].strip(), 'addr': ', '.join(x.strip() for x in name.split(',')[1:4]), 'c': 'ok' if exact else 'maybe'}
    return None


def main():
    try:
        known = json.load(open(OUT, encoding='utf-8'))
    except Exception:
        known = {}
    ps = places()
    todo = [p for p in sorted(ps, key=lambda x: -ps[x]) if p not in known.get('found', {}) and p not in known.get('miss', [])]
    print(f'장소 {len(ps)}개, 새로 찾을 것 {len(todo)}개')
    found, miss = known.get('found', {}), set(known.get('miss', []))
    for i, p in enumerate(todo):
        r = find(p)
        if r:
            found[p] = r
        else:
            miss.add(p)
        if i % 20 == 0:
            print(i, p, '→', r and r['name'])
    json.dump({'note': 'tools/geo_places.py가 만든 공연장 좌표 (OpenStreetMap). miss는 못 찾아서 시·도로 묶는 장소', 'found': dict(sorted(found.items())), 'miss': sorted(miss)},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'찾음 {len(found)} / 못 찾음 {len(miss)}')
    print(f'::notice::장소 {len(ps)}개 · 찾음 {len(found)} (확실 {sum(1 for v in found.values() if v["c"] == "ok")}) · 못 찾음 {len(miss)}')


if __name__ == '__main__':
    main()
