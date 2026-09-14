"""Render seven detailed Instagram daily-fortune carousels using existing 12-zodiac assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[0]
parser = argparse.ArgumentParser()
parser.add_argument('--data', type=Path, default=ROOT / 'copy' / 'daily-week01.json')
parser.add_argument('--output-root', type=Path)
args = parser.parse_args()
DATA = json.loads(args.data.read_text(encoding='utf-8'))
FONT = Path('C:/Windows/Fonts/malgun.ttf')
BOLD = Path('C:/Windows/Fonts/malgunbd.ttf')
ASSET_DIR = REPO / 'public' / 'fuctionassets' / 'tadagochi' / '딸기 컨셉'
ANIMALS = {
    '쥐': '딸기테마쥐.webp', '소': '딸기테마소.webp', '호랑이': '딸기테마 호랑이.webp',
    '토끼': '딸기테마토끼.webp', '용': '딸기테마용.webp', '뱀': '딸기테마뱀.webp',
    '말': '딸기테마말.webp', '양': '딸기테마양.webp', '원숭이': '딸기테마원숭이.webp',
    '닭': '딸기테마닭.webp', '개': '딸기테마개.webp', '돼지': '딸기테마돼지.webp',
}
ZODIACS = DATA['zodiacs']
for path in (ASSET_DIR / v for v in ANIMALS.values()):
    assert path.exists(), path

def f(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)

def text(draw, value, x, y, size, *, bold=False, fill='#412b42', width=790, spacing=12):
    lines, current = [], ''
    for word in value.split(' '):
        candidate = f'{current} {word}'.strip()
        if current and draw.textlength(candidate, font=f(size, bold)) > width:
            lines.append(current); current = word
        else:
            current = candidate
    if current: lines.append(current)
    for line in lines:
        draw.text((x, y), line, font=f(size, bold), fill=fill)
        y += size + spacing
    return y

def base():
    im = Image.new('RGB', (1080, 1350), '#fff8f5')
    d = ImageDraw.Draw(im)
    d.ellipse((620, 760, 1260, 1400), fill='#f9dfeb')
    d.arc((810, 85, 965, 240), 20, 290, fill='#b52b69', width=2)
    for x, y in [(963, 330), (92, 1070), (925, 290)]:
        d.line((x - 6, y, x + 6, y), fill='#b52b69', width=2)
        d.line((x, y - 6, x, y + 6), fill='#b52b69', width=2)
    return im

def animal(im, zodiac, box):
    source = Image.open(ASSET_DIR / ANIMALS[zodiac]).convert('RGBA')
    # Existing official assets are 7x3 pose sheets. Select one representative
    # pose per zodiac rather than shrinking the entire sheet into a card.
    # The first frame is the clearest full-body pose in every official sheet.
    col = 0
    row = 0
    cell_w, cell_h = source.width // 7, source.height // 3
    source = source.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
    alpha = source.getchannel('A')
    pixels = source.convert('RGB')
    transparent = Image.new('L', source.size, 0)
    for y in range(source.height):
        for x in range(source.width):
            r, g, b = pixels.getpixel((x, y))
            transparent.putpixel((x, y), 0 if r > 246 and g > 246 and b > 246 else alpha.getpixel((x, y)))
    source.putalpha(transparent)
    source.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - source.width) // 2
    y = box[1] + (box[3] - source.height) // 2
    im.paste(source, (x, y), source)

def footer(im, number):
    d = ImageDraw.Draw(im)
    d.line((76, 1230, 1004, 1230), fill='#b52b69', width=1)
    d.text((76, 1253), 'CODE DESTINY  ·  꽃돼지 연이', font=f(26, True), fill='#412b42')
    d.text((892, 1253), f'{number:02} / 05', font=f(26), fill='#412b42')

def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Instagram delivery is JPEG: WebP remains only an older local source format.
    im.save(path, 'JPEG', quality=95, optimize=True, progressive=True)

detail_actions = [
    '오늘의 실천: 한 가지를 정해, 끝낼 시간까지 달력에 적어보세요.',
    '오늘의 실천: 바로 답하지 말고, 가능한 범위를 한 문장으로 정리해보세요.',
    '오늘의 실천: 마음속 추측 대신 확인할 질문 하나를 골라보세요.',
    '오늘의 실천: 바꿀 것과 지킬 것을 각각 하나씩 적어보세요.',
    '오늘의 실천: 내일의 부담을 덜 작은 준비 하나를 먼저 해보세요.',
    '오늘의 실천: 관계에서도 내 속도와 쉬는 시간을 남겨두세요.',
    '오늘의 실천: 함께할 일은 역할과 마감 기준부터 나눠보세요.',
    '오늘의 실천: 바라는 것을 상대가 알아주길 기다리지 말고 짧게 말해보세요.',
    '오늘의 실천: 선택지를 줄이고, 오늘 실행할 한 가지를 고르세요.',
    '오늘의 실천: 잘한 점 하나를 먼저 인정한 뒤 다음 수정을 정하세요.',
    '오늘의 실천: 필요한 도움을 구체적으로 요청해보세요.',
    '오늘의 실천: 하루 끝에는 확인된 사실과 내일 할 일을 분리해 적어보세요.',
]

for day_index, (day, pillar, readings) in enumerate(zip(DATA['dates'], DATA['pillars'], DATA['days']), 1):
    folder = args.output_root / day if args.output_root else ROOT / 'card-news' / f'D{day_index:02}'
    # Cover: all twelve animal characters become a zodiac halo around Yeoni.
    cover = base(); d = ImageDraw.Draw(cover)
    d.text((76, 72), '10년 경력 명리학자의', font=f(31, True), fill='#b52b69')
    d.text((76, 133), '띠별 오늘 운세', font=f(63, True), fill='#412b42')
    d.text((80, 238), f'{day.replace("-", ".")}  ·  {pillar}', font=f(33), fill='#412b42')
    d.text((80, 338), '오늘의 흐름, 연이와\n내 띠부터 찾아봐요.', font=f(54, True), fill='#412b42', spacing=12)
    centers = [(95, 590), (280, 550), (475, 550), (675, 550), (855, 590), (110, 820), (915, 820), (145, 1015), (330, 1070), (530, 1070), (730, 1070), (900, 1015)]
    for zodiac, (x, y) in zip(ZODIACS, centers):
        animal(cover, zodiac, (x, y, 118, 118))
    yeoni = Image.open(ROOT / 'assets' / 'yeoni-original.webp').convert('RGBA')
    yeoni.thumbnail((310, 390), Image.Resampling.LANCZOS)
    cover.paste(yeoni, (385, 670), yeoni)
    footer(cover, 1); save(cover, folder / '01.jpg')
    # Four detail slides, three zodiac cards per slide.
    for page in range(4):
        im = base(); d = ImageDraw.Draw(im)
        d.text((76, 72), '10년 경력 명리학자의', font=f(30, True), fill='#b52b69')
        d.text((76, 128), '띠별 오늘 운세', font=f(54, True), fill='#412b42')
        d.text((80, 213), f'{day.replace("-", ".")}  ·  {pillar}', font=f(30), fill='#412b42')
        for row in range(3):
            index = page * 3 + row
            zodiac = ZODIACS[index]
            y = 320 + row * 285
            d.rounded_rectangle((65, y - 12, 1015, y + 248), radius=30, fill='#ffffff', outline='#f0d4e2', width=2)
            animal(im, zodiac, (92, y + 16, 170, 170))
            d.text((280, y + 20), f'{zodiac}띠', font=f(40, True), fill='#b52b69')
            body_y = text(d, readings[index], 280, y + 82, 21, width=690, spacing=5)
            text(d, detail_actions[(index + day_index - 1) % len(detail_actions)], 280, max(body_y + 5, y + 178), 18, fill='#715060', width=690, spacing=4)
        d.text((80, 1155), '띠별 해석은 참고로 읽고, 내 사주 전체와 함께 살펴보세요.', font=f(24), fill='#715060')
        footer(im, page + 2); save(im, folder / f'{page + 2:02}.jpg')

print(f'Rendered {len(DATA["dates"])} daily carousels x 5 Instagram JPEG cards with all 12 zodiac assets.')
