"""Render the non-daily Instagram fortune-card series as upload-ready JPEGs."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, shutil

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'copy' / 'instagram-fortune-content-month01.json').read_text(encoding='utf-8'))
FONT = Path('C:/Windows/Fonts/malgun.ttf')
BOLD = Path('C:/Windows/Fonts/malgunbd.ttf')
YEONI = Image.open(ROOT / 'assets' / 'yeoni-original.webp').convert('RGBA')
DESKTOP = Path.home() / 'Desktop'

def font(size, bold=False): return ImageFont.truetype(str(BOLD if bold else FONT), size)
def canvas():
    im = Image.new('RGB', (1080, 1350), '#fff8f5'); d = ImageDraw.Draw(im)
    d.ellipse((620, 760, 1260, 1400), fill='#f9dfeb')
    d.arc((810, 85, 965, 240), 20, 290, fill='#b52b69', width=2)
    return im, d
def wrapped(d, value, x, y, size, width=800, bold=False, fill='#412b42', leading=14):
    for paragraph in value.splitlines():
        line = ''
        for word in paragraph.split(' '):
            next_line = f'{line} {word}'.strip()
            if line and d.textlength(next_line, font=font(size, bold)) > width:
                d.text((x,y), line, font=font(size,bold), fill=fill); y += size + leading; line = word
            else: line = next_line
        if line: d.text((x,y), line, font=font(size,bold), fill=fill); y += size + leading
    return y
def footer(d, page):
    d.line((76,1230,1004,1230), fill='#b52b69')
    d.text((76,1253),'CODE DESTINY  ·  꽃돼지 연이',font=font(26,True),fill='#412b42')
    d.text((892,1253),f'{page:02} / 05',font=font(26),fill='#412b42')
def save(im,path): im.save(path,'JPEG',quality=95,optimize=True,progressive=True)

for item in DATA:
    out = ROOT / 'card-news' / 'fortune-month01' / item['id']
    out.mkdir(parents=True,exist_ok=True)
    for page, slide in enumerate(item['slides'],1):
        im,d = canvas()
        d.text((76,72),item['topic'],font=font(31,True),fill='#b52b69')
        if page == 1:
            d.multiline_text((76,150),item['title'],font=font(61,True),fill='#412b42',spacing=14)
            mascot=YEONI.copy(); mascot.thumbnail((370,470),Image.Resampling.LANCZOS); im.paste(mascot,(390,650),mascot)
        else:
            d.text((76,132),item['title'].replace('\n',' '),font=font(39,True),fill='#412b42')
            d.rounded_rectangle((70,330,1010,1070),radius=38,fill='#ffffff',outline='#f0d4e2',width=2)
            y=wrapped(d,slide,126,440,43,width=820,bold=True,leading=20)
            d.text((126,max(y+40,835)),'사주·자미두수·숙요는 서로 다른 체계입니다.',font=font(23),fill='#715060')
        footer(d,page); save(im,out/f'{page:02}.jpg')
    destination = DESKTOP / f"CODE DESTINY 인스타 콘텐츠 - {item['date']} - {item['id']}"
    destination.mkdir(parents=True,exist_ok=True)
    for old in destination.glob('*.webp'): old.unlink()
    for card in out.glob('*.jpg'): shutil.copy2(card,destination/card.name)
    (destination/'캡션.txt').write_text(item['caption']+'\n\nCODE DESTINY · code-destiny.com\n',encoding='utf-8')
    (destination/'업로드 순서.txt').write_text('01.jpg부터 05.jpg까지 순서대로 선택해 업로드합니다. 세로 4:5 비율을 유지하세요.\n',encoding='utf-8')
    print(destination)
