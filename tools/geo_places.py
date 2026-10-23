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
    # 뒤에서부터 낱말을 하나씩 떼 보기 ('올림픽공원 SK핸드볼경기장' → '올림픽공원'), 앞의 도시 이름 떼 보기
    for n in range(len(words) - 1, 0, -1):
        w = ' '.join(words[:n])
        if len(w) >= 3 and w not in q:
            q.append(w)
    if len(words) > 1 and words[0] in CITIES:
        w = ' '.join(words[1:])
        if w not in q:
            q.append(w)
    # 붙여 쓴 이름 띄우기 ('잠실실내체육관' → '잠실 실내체육관')
    sp = re.sub(r'(실내체육관|체육관|종합운동장|운동장|예술회관|문화회관|아트센터|아트홀|콘서트홀|극장)$', r' \1', base)
    if sp != base and sp not in q:
        q.append(sp)
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
            # 낱말이 하나도 안 겹치면(가게 이름이 같을 뿐인 경우) 빼요
            core = re.sub(r'\s+', '', q)
            if not any(w and w in name.replace(' ', '') for w in [core[:3], core[-3:]]):
                continue
            # 행정구역(시·군)만 나온 건 공연장 좌표가 아니라 빼요
            if r.get('category') == 'boundary' or r.get('type') in ('administrative', 'city', 'town', 'county', 'province'):
                continue
            exact = q == p or q == queries(p)[1] or (len(q) >= 4 and q in p)
            return {'lat': round(float(r['lat']), 6), 'lng': round(float(r['lon']), 6), 'name': name.split(',')[0].strip(), 'addr': ', '.join(x.strip() for x in name.split(',')[1:4]), 'c': 'ok' if exact else 'maybe'}
    return None


def main():
    try:
        known = json.load(open(OUT, encoding='utf-8'))
    except Exception:
        known = {}
    ps = places()
    # 해외 공연은 지도에 안 찍어요(한국 안에서 같은 이름 가게가 나와요)
    ABROAD = re.compile(r'뉴욕|두바이|시애틀|댈러스|로스앤젤레스|도쿄|오사카|애틀랜타|LA\b|Dallas|Atlanta|New York|Seattle|Dubai', re.I)
    for k in [k for k in known.get('found', {}) if ABROAD.search(k)]:
        del known['found'][k]
    for k in ['대구 호텔 수성 컨벤션홀', '인천 송도 컨벤시아 4홀']:
        known.get('found', {}).pop(k, None)
    todo = [p for p in sorted(ps, key=lambda x: -ps[x]) if p not in known.get('found', {}) and not ABROAD.search(p)]
    print(f'장소 {len(ps)}개, 새로 찾을 것 {len(todo)}개')
    found, miss = known.get('found', {}), set()
    # 이미 찾은 이름이 들어 있으면 그 좌표를 같이 써요 ('올림픽공원 올림픽홀' ← '올림픽홀')
    def alias(p):
        hits = [k for k in found if len(k) >= 4 and k in p and found[k]['c'] == 'ok']
        return dict(found[max(hits, key=len)], c='ok', via=max(hits, key=len)) if hits else None
    for i, p in enumerate(todo):
        r = alias(p) or find(p)
        if r:
            found[p] = r
        else:
            miss.add(p)
        if i % 20 == 0:
            print(i, p, '→', r and r['name'])
    json.dump({'note': 'tools/geo_places.py가 만든 공연장 좌표 (OpenStreetMap). miss는 못 찾아서 시·도로 묶는 장소', 'found': dict(sorted(found.items())), 'miss': sorted(miss), 'hint': known.get('hint', {})},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'찾음 {len(found)} / 못 찾음 {len(miss)}')
    print(f'::notice::장소 {len(ps)}개 · 찾음 {len(found)} (확실 {sum(1 for v in found.values() if v["c"] == "ok")}) · 못 찾음 {len(miss)}')


if __name__ == '__main__':
    main()
