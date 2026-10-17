"""공식 X 글을 구글 시트 "공식X" 탭에 붙여넣을 한 표로 만든다.
사용: python3 tools/x_table.py events.csv 공식X.xlsx
(x_match.py, x_behind.py, x_classify.py 를 먼저 돌려 x.json·x_feed.json 이 있어야 해요)
"""
import csv, json, sys
import openpyxl
sys.path.insert(0, 'tools')
from x_match import load_events

def main(events_csv, out):
    evs = load_events(events_csv)
    x = json.load(open('x.json', encoding='utf-8'))
    feed = json.load(open('x_feed.json', encoding='utf-8'))['posts']
    raw = {p['id']: p['text'] for p in csv.DictReader(open('data/x_posts.csv', encoding='utf-8'))}
    after = {pid: i for i, pid in x['events'].items()}
    behind = {pid: i for i, ids in x.get('behind', {}).items() for pid in ids}
    wb = openpyxl.Workbook(); w = wb.active; w.title = '공식X'
    w.append(['날짜', '링크', '글', '종류', '멤버', '후기 일정ID', '비하인드 일정ID', '붙은 일정(참고)', '사진'])
    for f in sorted(feed, key=lambda f: f['id']):
        ev = after.get(f['id']) or behind.get(f['id']) or ''
        w.append([f['date'], 'https://x.com/official_fore/status/' + f['id'], raw.get(f['id'], ''), f['cat'], ', '.join(f['m']),
                  after.get(f['id'], ''), behind.get(f['id'], ''), evs[ev][2] if ev in evs else '', f['img']])
    for col, wd in zip('ABCDEFGHI', (11, 22, 60, 12, 14, 12, 14, 30, 30)):
        w.column_dimensions[col].width = wd
    w.freeze_panes = 'A2'
    wb.save(out)
    print('행', w.max_row - 1)

if __name__ == '__main__':
    main(*sys.argv[1:])
