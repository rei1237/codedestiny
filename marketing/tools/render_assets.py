"""Render user-authorized typography/compositing to WebP and local MP4."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, subprocess, sys
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'copy/week01.json').read_text(encoding='utf8'))
DAILY=json.loads((ROOT/'copy/daily-week01.json').read_text(encoding='utf8'))
FONT=Path('C:/Windows/Fonts/malgun.ttf')
BOLD=Path('C:/Windows/Fonts/malgunbd.ttf')
PALETTES={'pink':('#fff8f5','#412b42','#b52b69','#f9dfeb'), 'lavender':('#f7f2ff','#342348','#7150a4','#e7dbf4'), 'night':('#151527','#fff5fb','#f0b9d4','#2c2944')}
QA=[]

def font(size,bold=False): return ImageFont.truetype(str(BOLD if bold else FONT),size)
def draw_text(im,txt,xy,size=46,bold=False,fill='#412b42',width=900,spacing=16):
    d=ImageDraw.Draw(im); y=xy[1]
    for line in txt.split('\n'):
        assert d.textlength(line,font=font(size,bold))<=width, (txt,size,width)
        d.text((xy[0],y),line,font=font(size,bold),fill=fill,stroke_width=0)
        y+=size+spacing
    return y
def wrap(txt,size,width,bold=False):
    d=ImageDraw.Draw(Image.new('RGB',(1,1))); lines=[]; cur=''
    for word in txt.split(' '):
        new=cur+' '+word if cur else word
        if d.textlength(new,font=font(size,bold))>width and cur: lines.append(cur);cur=word
        else: cur=new
    if cur:lines.append(cur)
    return '\n'.join(lines)
def base(theme='pink',height=1350):
    bg,fg,accent,tint=PALETTES[theme];im=Image.new('RGB',(1080,height),bg);d=ImageDraw.Draw(im)
    d.ellipse((640,height-640,1320,height+40),fill=tint)
    d.arc((770,80,940,250),20,290,fill=accent,width=2)
    for x,y in [(960,335),(94,height-270),(920,300)]:
        d.line((x-7,y,x+7,y),fill=accent,width=2); d.line((x,y-7,x,y+7),fill=accent,width=2)
    return im
def mascot(im,box,asset='yeoni-original.webp'):
    m=Image.open(ROOT/'assets'/asset).convert('RGBA');bbox=m.getbbox();m=m.crop(bbox)
    m.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS)
    im.paste(m,(box[0]+(box[2]-m.width)//2,box[1]+(box[3]-m.height)//2),m)
def footer(im,series,i,total,theme):
    bg,fg,accent,tint=PALETTES[theme];d=ImageDraw.Draw(im);h=im.height
    d.line((76,h-117,1004,h-117),fill=accent,width=1)
    draw_text(im,'CODE DESTINY  ·  꽃돼지 연이',(76,h-90),27,True,fg)
    draw_text(im,f'{i:02} / {total:02}',(883,h-90),26,False,fg,width=150)
def save(im,path):
    path.parent.mkdir(parents=True,exist_ok=True);im.save(path,'WEBP',quality=93,method=6)
    QA.append({'file':str(path.relative_to(ROOT)),'size':list(im.size),'bytes':path.stat().st_size})

cards=DATA['carousels']+[
 {'id':'MC01','series':'10년 명리학자의 9월 월간운세','theme':'pink','slides':[
 {'title':'사주에 이 글자,\n9월엔 어떻게 읽을까?','body':'','kind':'hero'},
 {'title':'묘(卯)가 있다면\n약속을 다시 살펴요.','body':'유(酉)와 만나는 묘유충.\n익숙한 일정이 답답하게 느껴질 때,\n바꾸고 싶은 부분부터 말해봐요.','kind':'teacher'},
 {'title':'진(辰)이 있다면\n함께 정리해봐요.','body':'진유합은 협력의 질문으로.\n마음이 맞아도 역할은 분명하게.\n혼자 떠안던 일을 나눠보세요.','kind':'teacher'},
 {'title':'사(巳)·축(丑)이 있다면\n완성 기준을 정해요.','body':'사·유·축은 금의 삼합 글자예요.\n한 글자만으로 완성을 단정하지 않고,\n원국에 무엇이 함께 있는지 봐요.','kind':'question'},
 {'title':'좋은 흐름에도\n조건이 있어요.','body':'금이 필요한 구조라면 정돈의 힘으로.\n이미 기준이 과하면 부담이 될 수도.\n내 사주 전체와 함께 읽어요.','kind':'teacher'},
 {'title':'이번 달, 무엇을\n고치고 인정할까요?','body':'고칠 것 하나 · 인정할 것 하나\n연이와 내 사주를 다시 펼쳐봐요.\n백로 이후 정유월 기준','kind':'cta'}]}
]

for c in cards:
    theme=c['theme'];bg,fg,accent,tint=PALETTES[theme]
    for i,s in enumerate(c['slides'],1):
        im=base(theme);d=ImageDraw.Draw(im)
        if s['kind']=='hero':
            art=Image.open(ROOT/'assets/yeoni-saju-generated.webp').convert('RGB').resize((1080,1350),Image.Resampling.LANCZOS)
            im=art;d=ImageDraw.Draw(im)
        elif s['kind']=='moon':
            art=Image.open(ROOT/'assets/moon-distance-generated.webp').convert('RGBA').resize((1080,1350),Image.Resampling.LANCZOS)
            im.paste(art,(0,0),art);mascot(im,(680,885,300,340))
        draw_text(im,c['series'],(76,76),29,True,accent)
        title_size=72 if max(len(x) for x in s['title'].split('\n'))<17 else 60
        draw_text(im,s['title'],(76,175),title_size,True,fg,928,20)
        if s['body']:
            draw_text(im,s['body'],(80,405),40,False,fg,920,25)
        if s['kind']=='elements':
            for n,(name,col) in enumerate(zip('목화토금수',['#cfe8d4','#f7ccd0','#e8d4ae','#dbd9e8','#c5e4ef'])):
                x=83+n*187;d.ellipse((x,735,x+150,885),fill=col)
                draw_text(im,name,(x+48,775),49,True,'#412b42')
            mascot(im,(700,910,220,275))
        elif s['kind']=='palaces':
            for n in range(12):
                col=n%4;row=n//4;x=85+col*225;y=705+row*120
                d.rounded_rectangle((x,y,x+205,y+96),radius=18,fill=tint)
            for n,label in enumerate(['명궁','관록궁','부부궁']):draw_text(im,label,(108+n*225,730),32,True,accent,200)
            draw_text(im,'개념 안내 그림 · 개인 명반이 아니에요',(86,1090),25,False,fg)
        elif s['kind']=='distance':
            for n,label in enumerate(['근거리','중거리','원거리']):
                y=700+n*128;d.line((100,y+35,550,y+35),fill=accent,width=2)
                d.ellipse((90,y+25,110,y+45),fill=accent);x=210+n*140
                d.ellipse((x,y+22,x+26,y+48),fill=fg);draw_text(im,label,(610,y),35,True,fg)
            draw_text(im,'거리 개념을 설명하는 그림입니다',(90,1110),25,False,fg)
        elif s['kind'] in ['teacher','question']:
            mascot(im,(535,740,420,455))
            d.rounded_rectangle((82,766,510,940),radius=26,fill=tint)
            draw_text(im,'연이의 한 줄\n한 글자로 끝내지 않아요.' if s['kind']=='teacher' else '연이의 질문\n오늘은 어떻게 해볼까요?',(108,798),28,True,fg,395,16)
        elif s['kind'] in ['cta','mascot']:
            mascot(im,(250,670,575,520))
        footer(im,c['series'],i,len(c['slides']),theme)
        save(im,ROOT/'card-news'/c['id']/f'{i:02}.webp')

# One finished 12-zodiac daily carousel, with all seven days available as copy.
for i in range(5):
    im=base('pink');draw_text(im,'10년 경력 명리학자의',(76,76),33,True)
    draw_text(im,'띠별 오늘 운세',(76,143),64,True)
    draw_text(im,'2026.09.09  ·  병술일',(80,247),35,False)
    if i==0:
        draw_text(im,'오늘의 흐름,\n연이가 전해드려요.',(80,365),57,True)
        mascot(im,(245,640,590,570))
    else:
        for j in range(3):
            k=(i-1)*3+j;y=370+j*267
            draw_text(im,DAILY['zodiacs'][k]+'띠',(80,y),41,True,'#b52b69')
            draw_text(im,wrap(DAILY['days'][0][k],34,895),(80,y+66),34,False,width=900,spacing=17)
        draw_text(im,'띠 기준의 일반 해석 · 개인 사주 전체와 함께 읽어요',(80,1190),25,False)
    footer(im,'daily',i+1,5,'pink');save(im,ROOT/'card-news/D01'/f'{i+1:02}.webp')

# Stories are background cards; actual interactive stickers are added by the platform.
for s in DATA['stories']:
    im=base('pink',1920);draw_text(im,'꽃돼지 연이의 오늘 질문',(100,215),39,True)
    draw_text(im,wrap(s['title'],66,840,True),(100,360),66,True,width=850,spacing=25)
    mascot(im,(245,780,590,650))
    draw_text(im,'연이와 하나씩 알아가요',(140,1510),42,True)
    draw_text(im,'CODE DESTINY',(140,1590),32,True,'#b52b69')
    save(im,ROOT/'assets/stories'/f"{s['id']}.webp")

ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for r in DATA['reels']:
    theme=r['theme'];bg,fg,accent,tint=PALETTES[theme];folder=ROOT/'reels'/r['id'];folder.mkdir(parents=True,exist_ok=True)
    filters=[];cmd=[ffmpeg,'-y','-hide_banner','-loglevel','error'];total=0;srt=[]
    for n,(secs,txt) in enumerate(r['scenes']):
        im=base(theme,1920);draw_text(im,'CODE DESTINY  /  꽃돼지 연이',(90,230),33,True,accent)
        draw_text(im,txt,(90,370),66,True,fg,880,27)
        mascot(im,(190,760,680,700))
        draw_text(im,'사주 · 자미두수 · 숙요점',(130,1530),39,True,fg)
        p=folder/f'scene-{n+1:02}.webp';save(im,p)
        cmd+=['-loop','1','-t',str(secs),'-i',str(p)]
        filters.append(f'[{n}:v]scale=1080:1920,zoompan=z=min(zoom+0.00012\\,1.02):x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):d=1:s=1080x1920:fps=30,trim=duration={secs},setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v{n}]')
        srt.append(f'{n+1}\n00:00:{total:02},000 --> 00:00:{total+secs:02},000\n{txt}\n');total+=secs
    filters.append(''.join(f'[v{n}]' for n in range(len(r['scenes'])))+f'concat=n={len(r["scenes"])}:v=1:a=0[out]')
    cmd+=['-filter_complex',';'.join(filters),'-map','[out]','-c:v','libx264','-preset','veryfast','-crf','23','-r','30','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(folder/f'{r["id"]}.mp4')]
    subprocess.run(cmd,check=True)
    (folder/f'{r["id"]}.srt').write_text('\n'.join(srt),encoding='utf8')
    QA.append({'file':f'reels/{r["id"]}/{r["id"]}.mp4','seconds':total,'width':1080,'height':1920,'fps':30,'audio':'none'})
    print('rendered',r['id'],flush=True)

# Review contact sheet at actual phone-like width, all slides represented.
paths=sorted((ROOT/'card-news').glob('*/*.webp'));thumbs=[]
for p in paths:
    im=Image.open(p).convert('RGB');im.thumbnail((324,405));tile=Image.new('RGB',(348,455),'#eee9ed');tile.paste(im,(12,12));ImageDraw.Draw(tile).text((12,421),str(p.relative_to(ROOT/'card-news')),font=font(19),fill='#342348');thumbs.append(tile)
sheet=Image.new('RGB',(348*6,455*math.ceil(len(thumbs)/6)),'#eee9ed')
for n,t in enumerate(thumbs):sheet.paste(t,(n%6*348,n//6*455))
save(sheet,ROOT/'assets/review-contact-sheet.webp')
(ROOT/'assets/manifest.json').write_text(json.dumps(QA,ensure_ascii=False,indent=2),encoding='utf8')
print('complete',len(QA),'artifacts; text width checked; all delivery images WebP',flush=True)
