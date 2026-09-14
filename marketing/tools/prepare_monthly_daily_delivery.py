"""Copy rendered JPG daily-fortune carousels with captions into Desktop folders."""
from datetime import date
from pathlib import Path
import json, shutil

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'copy' / 'daily-month-20260909-20261015.json').read_text(encoding='utf-8'))
SOURCE = ROOT / 'card-news' / 'daily-20260909-20261015'
DESKTOP = Path.home() / 'Desktop'
weekdays = ['월', '화', '수', '목', '금', '토', '일']

for date_text, pillar in zip(DATA['dates'], DATA['pillars']):
    dt = date.fromisoformat(date_text)
    destination = DESKTOP / f'CODE DESTINY 일일운세 - {date_text}'
    destination.mkdir(parents=True, exist_ok=True)
    for old in destination.glob('*.webp'):
        old.unlink()
    for card in sorted((SOURCE / date_text).glob('*.jpg')):
        shutil.copy2(card, destination / card.name)
    caption = f'''🌸 10년 경력 명리학자의 띠별 오늘 운세
{dt.year}년 {dt.month}월 {dt.day}일 {weekdays[dt.weekday()]}요일 · {pillar}

오늘은 내 띠의 흐름을 읽고, 관계와 일정에서 한 가지를 가볍게 실천해보는 날이에요.

쥐띠부터 돼지띠까지, 꽃돼지 연이가 12지신의 오늘 이야기를 전해드려요. 옆으로 넘겨 내 띠를 찾고, 오늘 기억할 한 문장을 저장해두세요.

띠별 운세는 연지 기준의 일반 해석입니다. 내 사주 전체와 함께 참고해주세요.

CODE DESTINY · code-destiny.com
#오늘의운세 #띠별운세 #사주 #꽃돼지연이 #코드데스티니
'''
    (destination / '캡션.txt').write_text(caption, encoding='utf-8')
    (destination / '업로드 순서.txt').write_text(
        f'Instagram @codedestiny_official 업로드용\n\n1. 01.jpg부터 05.jpg까지 순서대로 5장을 선택합니다.\n2. 세로 4:5 비율(1080×1350)을 유지합니다.\n3. 캡션.txt를 복사해 붙여 넣습니다.\n4. 날짜가 {date_text}, 일진이 {pillar}인지 확인한 뒤 게시합니다.\n\n이 폴더는 {date_text} 하루 전용입니다. 다른 날짜에는 재사용하지 마세요.\n',
        encoding='utf-8')
    print(destination)
