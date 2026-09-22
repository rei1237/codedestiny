import type {FortuneRecord} from './api';
import type {FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';

export const consultationShareImage='https://code-destiny.com/assets/yeongnyangi/hero.webp';
export const shareLimit=600;
export type ShareChoice={id:string;label:string;question:string;text:string};
export function resultShareUrl(row?:FortuneRecord,channel='copy'){
 const url=new URL('https://code-destiny.com/yeongnyangi/fortune/');
 const mode=row?.consultation?.questionSky?.mode;
 if(mode==='horary-v1')url.searchParams.set('mode','horary');
 else if(mode==='prashna-v1'||row?.consultation?.spirit)url.searchParams.set('mode','spirit');
 else if(row){
  const id=row.product?.id||'';
  if(/^(saju|ziwei|sukuyo|vedic|astrology|tarot)_(mackerel|salmon|flounder|tuna)$/.test(id)||['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all'].includes(id))url.searchParams.set('product',id);
 }else{url.pathname='/yeongnyangi/room/';url.hash='daily';}
 url.searchParams.set('utm_source',['kakao','native','image','copy'].includes(channel)?channel:'share');
 url.searchParams.set('utm_medium','share');
 url.searchParams.set('utm_campaign',row?'yeongnyangi_result':'yeongnyangi_daily');
 return url.toString();
}
export function freeShareChoices(reading:FreeReading):ShareChoice[]{
 return [{id:'daily-summary',label:'오늘의 한마디',question:'',text:reading.summary}];
}
export function shorten(text:string,limit:number){const chars=Array.from(text.trim());return chars.length>limit?chars.slice(0,limit-1).join('')+'…':chars.join('');}
export function shareChoices(row:FortuneRecord){
 if(!row.paid||row.state!=='COMPLETED')return [];
 const answers=row.chapters.flatMap(c=>(c.questionAnswers||[]).map((a,i)=>({id:`question-${a.questionId}`,label:`질문 ${i+1}의 답변`,question:row.consultation?.questions?.find(q=>q.id===a.questionId)?.text||'',text:[a.answer,`관련 시기\n${a.timing}`,`지금 해볼 일\n${a.action}`].join('\n\n')})));
 const chapters=row.chapters.map((c,i)=>({id:`chapter-${i}`,label:row.manifest[i]?.title||`${i+1}번째 이야기`,question:'',text:[c.summary,`지금 해볼 일\n${c.advice}`].join('\n\n')}));
 return [...answers,...chapters];
}
export function shareMessage(text:string,asOf?:string){return ['사주보는 고양이 영냥이가 읽어준 이야기',text.trim(),'나는 이런 흐름이래. 너는 어떤 이야기가 나올까?',asOf?`상담 기준: ${asOf}`:'','운세는 선택을 돕는 참고 이야기예요.'].filter(Boolean).join('\n\n');}

// This PNG is created only in the owner's browser; no private result or image is uploaded.
export async function renderShareCard(text:string,asOf?:string):Promise<Blob>{
 const font='"Yeongnyangi Noto", sans-serif';
 const length=Array.from(text).length;
 const fontSize=length<=80?64:length<=180?50:36;
 const lineHeight=fontSize+22;
 await document.fonts.load(`${fontSize}px ${font}`,text);
 const cat=new Image();cat.src='/assets/yeongnyangi/hero.webp';await cat.decode();
 const canvas=document.createElement('canvas');canvas.width=1080;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('IMAGE_UNAVAILABLE');
 ctx.font=`${fontSize}px ${font}`;
 const lines:string[]=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const char of Array.from(paragraph)){if(line&&ctx.measureText(line+char).width>900){lines.push(line);line='';}line+=char;}
  lines.push(line);
 }
 canvas.height=Math.max(length<=180?1080:1350,510+lines.length*lineHeight);
 ctx.fillStyle='#fff3e2';ctx.fillRect(0,0,1080,canvas.height);
 ctx.fillStyle='#211432';ctx.font=`700 42px ${font}`;ctx.fillText('사주보는 고양이 영냥이',80,112);
 ctx.font=`28px ${font}`;ctx.fillText('친구에게 건네는 상담 한 장',80,164);
 ctx.drawImage(cat,808,32,192,192);
 ctx.strokeStyle='#d3b785';ctx.beginPath();ctx.moveTo(80,246);ctx.lineTo(1000,246);ctx.stroke();
 const textY=length<=180?Math.max(340,(canvas.height-240-lines.length*lineHeight)/2):322;
 ctx.font=`${fontSize}px ${font}`;lines.forEach((line,i)=>ctx.fillText(line,90,textY+i*lineHeight));
 ctx.fillStyle='#63436e';
 ctx.font=`700 30px ${font}`;ctx.fillText('나는 이런 흐름이래. 너는 어때?',90,canvas.height-178);
 ctx.font=`25px ${font}`;
 if(asOf)ctx.fillText(`상담 기준: ${asOf}`,90,canvas.height-126);
 ctx.fillText('운세는 선택을 돕는 참고 이야기예요.',90,canvas.height-82);
 ctx.fillText('CODE DESTINY · code-destiny.com',90,canvas.height-40);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('IMAGE_UNAVAILABLE')),'image/png'));
}
