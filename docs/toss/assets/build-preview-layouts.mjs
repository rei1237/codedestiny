// Editable vector layouts around unchanged, actual app captures. No invented UI.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const base=path.dirname(fileURLToPath(import.meta.url));
const source=path.join(base,'20261008-1');
const out=path.join(base,'20261008-3');
await fs.mkdir(out,{recursive:true});
const uri=async name=>'data:image/png;base64,'+(await fs.readFile(path.join(source,name))).toString('base64');
const [home,product,example,cat]=await Promise.all(['01-home-636x1048.png','02-product-636x1048.png','03-example-636x1048.png','ai-saju-studio-icon-600.png'].map(uri));
const palette={ink:'#171C36',gold:'#DEC391',paper:'#FAF7F1',muted:'#C9CADD'};
const text=(x,y,size,value,color=palette.paper,family='Malgun Gothic',weight=400)=>`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${value}</text>`;
const shell=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${palette.ink}"/><path d="M32 32H${w-32}V${h-32}H32Z" fill="none" stroke="${palette.gold}" stroke-opacity=".45"/>${body}</svg>`;
const screen=(image,x,y,w,h=1048*w/636)=>`<rect x="${x-3}" y="${y-3}" width="${w+6}" height="${h+6}" rx="15" fill="${palette.gold}"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 636 ${h*636/w}" overflow="hidden"><image width="636" height="1048" xlink:href="${image}"/></svg>`;
const footer=()=>text(48,1002,17,'현재 화면 예시 · 로그인·구매·생성은 출시 준비 중',palette.muted);
const layouts=[
 ['01-question-636x1048',shell(636,1048,text(48,95,39,'마음에 남은 질문,',palette.paper,'Batang')+text(48,151,39,'영냥이와 살펴봐요',palette.paper,'Batang')+text(48,196,20,'일과 돈, 관계와 마음. 내 고민부터 골라요.',palette.muted)+screen(home,95,235,446)+footer())],
 ['02-scope-636x1048',shell(636,1048,text(48,95,39,'내 고민에 맞는',palette.paper,'Batang')+text(48,151,39,'상담의 깊이를 찾아요',palette.paper,'Batang')+text(48,196,20,'상담 범위와 답변의 구성을 먼저 살펴봐요.',palette.muted)+screen(product,58,239,520,590)+text(58,900,25,'무엇을 다루는지, 어떻게 답하는지',palette.gold)+text(58,940,20,'상담을 선택하기 전에 차분히 확인해요.',palette.muted)+footer())],
 ['03-example-636x1048',shell(636,1048,text(48,95,39,'답만이 아니라,',palette.paper,'Batang')+text(48,151,39,'이유와 작은 행동까지',palette.paper,'Batang')+text(48,196,20,'핵심 답변 · 해석의 근거 · 현실적인 참고 행동',palette.muted)+screen(example,95,235,446)+footer())],
 ['04-introduction-1504x741',shell(1504,741,text(76,155,53,'마음에 남은 질문을',palette.paper,'Batang')+text(76,232,53,'새로운 시선으로 읽는 시간',palette.paper,'Batang')+text(76,293,25,'사주보는 고양이 영냥이와 함께하는 코드데스티니',palette.muted)+`<image x="76" y="343" width="245" height="245" xlink:href="${cat}"/>`+text(351,407,26,'내 고민에서 시작해요',palette.gold)+text(351,456,22,'질문 선택부터 상담 범위,')+text(351,491,22,'개인정보 없는 결과 예시까지.')+text(76,670,20,'현재 화면 예시 · 로그인·구매·생성은 출시 준비 중',palette.muted)+screen(home,1019,72,360))],
];
const files=[];
for(const [name,svg] of layouts){
 await fs.writeFile(path.join(out,name+'.svg'),svg);
 const data=await sharp(Buffer.from(svg)).png().toBuffer();
 await fs.writeFile(path.join(out,name+'.png'),data);
 const {width,height}=await sharp(data).metadata();
 files.push({file:name+'.png',width,height,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
await fs.copyFile(path.join(source,'ai-saju-studio-icon-600.png'),path.join(out,'ai-saju-studio-icon-600.png'));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({purpose:'콘솔 등록용 편집 가능한 조판; 실제 캡처 원본 포함',serviceAvailable:false,sourceCaptures:'../20261008-1',productCapture:'하단 미완성 구매 영역은 프레임 밖. 실제 화면 내용을 수정하지 않음.',files},null,2)+'\n');
console.log(JSON.stringify(files,null,2));
