import {insightArtwork} from './insight-art.mjs';
// Compose editable text locally over owned art. No draft is uploaded.
export async function renderInsightImage(text:string,brand:string,day:string,story:boolean,character='daily'):Promise<Blob> {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=story?1920:1080;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('IMAGE_UNAVAILABLE');
  const font='"Noto Sans KR", "Malgun Gothic", sans-serif';
  const art=new Image();art.src=insightArtwork(character);
  await Promise.all([art.decode(),document.fonts.load(`52px ${font}`,text)]);
  ctx.fillStyle='#fff8f0';ctx.fillRect(0,0,canvas.width,canvas.height);
  const size=story?1080:730;ctx.drawImage(art,1080-size,canvas.height-size,size,size);
  ctx.strokeStyle='#d6b5a2';ctx.lineWidth=2;ctx.strokeRect(42,42,996,canvas.height-84);
  ctx.fillStyle='#795563';ctx.font=`400 24px ${font}`;ctx.fillText('CODE DESTINY',80,story?170:100);
  ctx.fillStyle='#44273b';ctx.font=`700 32px ${font}`;ctx.fillText(brand,80,story?242:160);
  ctx.fillStyle='#795563';ctx.font=`24px ${font}`;ctx.fillText(day,80,story?294:207);
  const fontSize=story?56:text.length>80?42:52;
  ctx.fillStyle='#44273b';ctx.font=`400 ${fontSize}px ${font}`;
  const lines:string[]=[];let line='';
  for(const word of text.split(/\s+/)){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width<=900){line=candidate;continue;}
    if(line){lines.push(line);line='';}
    for(const letter of Array.from(word)){if(line&&ctx.measureText(line+letter).width>900){lines.push(line);line='';}line+=letter;}
  }
  if(line)lines.push(line);
  const first=story?450:300,leading=fontSize*1.5;
  lines.forEach((value,i)=>ctx.fillText(value,80,first+i*leading));
  ctx.fillStyle='#795563';ctx.font=`22px ${font}`;ctx.fillText('code-destiny.com',80,canvas.height-82);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('IMAGE_UNAVAILABLE')),'image/png'));
}
