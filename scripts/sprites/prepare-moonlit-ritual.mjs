// 참배 흐름(ritual-v1) 그림 변환: 저장소 밖 생성 원본 → public/assets/moonlit-lotus/ritual-v1/ + manifest.json
// usage: node scripts/sprites/prepare-moonlit-ritual.mjs [sourceFolder]
// 원본 규칙: <source>/<name>-source.png 가 채택본, <source>/prompts/<name>.txt 가 프롬프트 전문.
import sharp from 'sharp';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const source=process.argv[2]||'D:/CodeDestiny-Build/moonlit-lotus/ritual-v1';
const output='public/assets/moonlit-lotus/ritual-v1';
const reference='../space-v1/courtyard-1536.webp (원본 D:/CodeDestiny-Build/moonlit-lotus/space-v1/courtyard-source.png)';
const sha=buf=>createHash('sha256').update(buf).digest('hex');
await mkdir(output,{recursive:true});
const manifest={version:1,created:'2026-11-22',generator:'OpenAI image_gen (gpt-image-2, codex exec -i reference)',reference,sourceFolder:source,
 converter:'scripts/sprites/prepare-moonlit-ritual.mjs (sharp)',assets:[]};
async function brief(name){return (await readFile(join(source,'prompts',name+'.txt'),'utf8')).trim();}
async function record(file,extra){
 const buf=await readFile(join(output,file)),meta=await sharp(buf).metadata();
 manifest.assets.push({file,width:meta.width,height:meta.height,bytes:buf.length,sha256:sha(buf),...extra});
}
// 장면: 세로 1024×1536 → 768×1152, 가로 1536×1024 그대로. WebP q80 effort6(views-v1 동일) + AVIF q50 effort6.
for(const scene of ['gate','bell'])for(const [width,height,portrait] of [[768,1152,true],[1536,1024,false]]){
 const name=scene+'-'+width,bytes=await readFile(join(source,name+'-source.png'));
 const base=sharp(bytes).resize({width,height,fit:'cover'});
 const common={scene,portrait,kind:'scene',source:name+'-source.png',sourceSha256:sha(bytes),brief:await brief(name)};
 await base.clone().webp({quality:80,effort:6}).toFile(join(output,name+'.webp'));
 await record(name+'.webp',{...common,format:'webp',quality:80});
 await base.clone().avif({quality:50,effort:6}).toFile(join(output,name+'.avif'));
 await record(name+'.avif',{...common,format:'avif',quality:50});
}
// 소품: #00FF00 크로마키 → 알파 + 녹색 번짐 제거 → 512 정사각, 가로 중앙·바닥 기준선 하단 2%.
async function chroma(bytes){
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],spill=g-Math.max(r,b);
  if(spill>0){
   const a=spill>=90?0:spill<=25?255:Math.round(255*(90-spill)/65);
   data[i+3]=Math.min(data[i+3],a);data[i+1]=Math.max(r,b); // 가장자리 녹색 번짐 제거(소품에 녹색 없음)
  }
 }
 // 1px 가장자리 정리: 거의 투명한 잔여 픽셀 제거
 for(let i=3;i<data.length;i+=4)if(data[i]<24)data[i]=0;
 return sharp(data,{raw:info});
}
async function placeOnCanvas(img){
 const trimmed=await img.png().toBuffer().then(b=>sharp(b).trim({threshold:1}).png().toBuffer({resolveWithObject:true}));
 const S=512,maxW=Math.round(S*.9),maxH=Math.round(S*.94);
 const scale=Math.min(maxW/trimmed.info.width,maxH/trimmed.info.height);
 const w=Math.round(trimmed.info.width*scale),h=Math.round(trimmed.info.height*scale);
 const tile=await sharp(trimmed.data).resize(w,h).png().toBuffer();
 return sharp({create:{width:S,height:S,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:tile,left:Math.round((S-w)/2),top:S-Math.round(S*.02)-h}]).png().toBuffer();
}
const propWebp={quality:90,alphaQuality:100,effort:6};
for(const name of ['prop-incense-burner','prop-lantern-lit']){
 const bytes=await readFile(join(source,name+'-source.png'));
 const png=await placeOnCanvas(await chroma(bytes));
 await sharp(png).webp(propWebp).toFile(join(output,name+'.webp'));
 await record(name+'.webp',{kind:'prop',format:'webp',quality:90,alphaQuality:100,background:'chroma-key #00FF00 → alpha',source:name+'-source.png',sourceSha256:sha(bytes),brief:await brief(name)});
 if(name==='prop-lantern-lit'){
  // 꺼진 연등은 켜진 연등에서 파생: 같은 실루엣·같은 캔버스 위치(크로스페이드용).
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // 밝기만 일괄로 내리면 노란 불빛이 올리브로 탁해진다 → 노랑 계열(hue 35–75°)을 같은 명도의 모브로 85% 이동, 전체 채도 .85·밝기 .65, 밤빛 #7c6fa8 multiply 30%.
  const tint=[0x7c,0x6f,0xa8];
  for(let p=0;p<data.length;p+=4){
   let [r,g,b]=[data[p],data[p+1],data[p+2]];const mx=Math.max(r,g,b),mn=Math.min(r,g,b),L=(r+g+b)/3;
   let hue=0;if(mx>mn){hue=mx===r?((g-b)/(mx-mn))*60:mx===g?(2+(b-r)/(mx-mn))*60:(4+(r-g)/(mx-mn))*60;if(hue<0)hue+=360;}
   const w=mx>mn?Math.max(0,1-Math.max(0,Math.abs(hue-55)-20)/10)*.85:0,mauve=[L*1.15,L*.85,L];
   // 꽃잎 등갓(y<290)만 모브 전환+밤빛, 금 받침·술(y≥290)은 금빛 유지(밝기 .65·채도 .75) — 280–300 사이는 섞는다.
   const y=Math.floor(p/4/info.width),k=Math.max(0,Math.min(1,(300-y)/20));
   const out=[r,g,b].map((c,i)=>{const top=c+(mauve[i]-c)*w,shade=(L+(top-L)*.85)*.65,base=(L+(c-L)*.75)*.65;
    return Math.max(0,Math.min(255,Math.round(k*(shade*.7+shade*tint[i]/255*.3)+(1-k)*base)));});
   data[p]=out[0];data[p+1]=out[1];data[p+2]=out[2];
  }
  await sharp(data,{raw:info}).webp(propWebp).toFile(join(output,'prop-lantern-dim.webp'));
  await record('prop-lantern-dim.webp',{kind:'prop',format:'webp',quality:90,alphaQuality:100,derivedFrom:'prop-lantern-lit.webp',derivation:'노랑(hue 35–75°)을 같은 명도의 모브로 85% 이동 → 전체 채도 ×0.85·밝기 ×0.65 → #7c6fa8 multiply 30% (등갓 y<290만; 금 받침·술은 밝기 ×0.65·채도 ×0.75), alpha 동일'});
 }
}
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await copyFile(join(output,'manifest.json'),join(source,'manifest.json'));
for(const a of manifest.assets)console.log(a.file,a.width+'x'+a.height,Math.round(a.bytes/1024)+'KB');
