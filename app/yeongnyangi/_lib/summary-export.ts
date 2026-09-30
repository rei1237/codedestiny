import type {RenderableReport} from './summary-report';
import {reportName,visibleChartGroups} from './summary-report';

type Format='feed'|'story'|'report';
const ink='#292336',gold='#9b7748',paper='#faf5ec';
function lines(ctx:CanvasRenderingContext2D,value:string,maxWidth:number){
 const out:string[]=[];
 for(const paragraph of value.split('\n')){
  let line='';
  for(const token of paragraph.match(/\S+\s*/gu)||[]){
   if(line&&ctx.measureText(line+token).width>maxWidth){out.push(line.trimEnd());line='';}
   if(ctx.measureText(token).width<=maxWidth){line+=token;continue;}
   for(const char of Array.from(token)){
    if(line&&ctx.measureText(line+char).width>maxWidth){out.push(line.trimEnd());line='';}
    if(line||char!==' ')line+=char;
   }
  }
  out.push(line.trimEnd());
 }
 return out;
}
function write(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,size:number,spacing:number,maxLines=5){
 ctx.font=`${size}px "Yeongnyangi Noto", "CodeDestinyHan", sans-serif`;
 const chunks=lines(ctx,value,width).slice(0,maxLines);chunks.forEach((line,i)=>ctx.fillText(line,x,y+i*spacing));return y+chunks.length*spacing;
}
async function decode(path:string){const image=new Image();image.src=path;await image.decode();return image;}
function canvas(width:number,height:number){const element=document.createElement('canvas');element.width=width;element.height=height;const ctx=element.getContext('2d');if(!ctx)throw new Error('IMAGE_UNAVAILABLE');ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);return {element,ctx};}
function blob(element:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>element.toBlob(value=>value?resolve(value):reject(new Error('IMAGE_UNAVAILABLE')),'image/png'));}
async function base(report:RenderableReport,width:number,height:number){
 await document.fonts.ready;
 await document.fonts.load('42px "Yeongnyangi Noto"',report.headline);
 const art=await decode(report.mascot);
 const {element,ctx}=canvas(width,height);ctx.fillStyle=ink;
 ctx.font='700 30px "Yeongnyangi Noto", sans-serif';ctx.fillText('CODE DESTINY  ·  영냥이',72,88);
 ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(72,112);ctx.lineTo(width-72,112);ctx.stroke();
 const ratio=Math.min(240/art.width,240/art.height);ctx.drawImage(art,width-72-art.width*ratio,138,art.width*ratio,art.height*ratio);
 return {element,ctx};
}
function chart(ctx:CanvasRenderingContext2D,report:RenderableReport,y:number,width:number){
 if(!report.chart)return write(ctx,report.coverage.missing.join(' '),80,y,width-160,29,44,3);
 ctx.fillStyle=gold;ctx.font='700 30px "Yeongnyangi Noto", sans-serif';ctx.fillText(report.chart.title,80,y);y+=46;ctx.fillStyle=ink;
 const groups=visibleChartGroups(report).slice(0,report.serviceType==='saju'?4:3);
 if(report.serviceType==='saju'){
  const cellWidth=(width-152)/4;
  for(const [index,group] of groups.entries()){
   const x=76+index*cellWidth;
   ctx.fillStyle=group.label==='일주'?'#fff0d5':'#fffdf8';ctx.fillRect(x,y,cellWidth,166);
   ctx.strokeStyle=group.label==='일주'?'#a8793e':'#d7cab9';ctx.strokeRect(x,y,cellWidth,166);
   ctx.fillStyle=ink;ctx.font='700 30px "Yeongnyangi Noto", sans-serif';ctx.fillText(group.label,x+18,y+38);
   const value=group.items.find(item=>item.label==='천간·지지')?.value||'자료 없음';
   write(ctx,value,x+18,y+78,cellWidth-36,30,40,2);
   const tenGod=group.items.find(item=>item.label==='천간 십성')?.value;
   if(tenGod&&tenGod!=='자료 없음'){ctx.fillStyle=gold;write(ctx,tenGod,x+18,y+137,cellWidth-36,22,28,1);ctx.fillStyle=ink;}
  }
  return y+176;
 }
 for(const group of groups){ctx.strokeStyle='#d7cab9';ctx.strokeRect(76,y,report.serviceType==='tarot'?620:Math.min(width-152,920),86);ctx.font='700 31px "Yeongnyangi Noto", sans-serif';ctx.fillText(group.label,96,y+35);ctx.font='25px "Yeongnyangi Noto", sans-serif';const value=group.items.map(i=>i.value).filter(x=>x&&x!=='자료 없음').join(' · ');ctx.fillText(Array.from(value).slice(0,report.serviceType==='tarot'?25:42).join(''),96,y+70);y+=98;}
 return y;
}
export async function renderSummaryPng(report:RenderableReport,format:Format,page=0):Promise<Blob>{
 const width=1080,height=format==='story'?1920:1350;
 const {element,ctx}=await base(report,width,height);ctx.fillStyle=ink;
 let y=write(ctx,reportName(report.serviceType),78,205,690,50,64,2)+24;
 y=write(ctx,report.headline,78,y,680,42,56,3)+18;
 if(format==='report'){
  if(page===0){const top=y;y=chart(ctx,report,y,1080)+30;await tarotArt(ctx,report,top);if(report.serviceType==='tarot')y=Math.max(y,top+485);y=write(ctx,report.oneLineSummary,80,y,920,33,48,5);}
  else{for(const section of report.sections.slice((page-1)*3,(page-1)*3+3)){ctx.fillStyle=gold;y+=18;y=write(ctx,section.title,80,y,910,32,44,2);ctx.fillStyle=ink;y=write(ctx,section.body,80,y+7,920,28,43,5)+26;}}
 }else{
  y=Math.max(y,470);const top=y;y=chart(ctx,report,y,1080)+40;await tarotArt(ctx,report,top);if(report.serviceType==='tarot')y=Math.max(y,top+485);if(format==='story')y=Math.max(y,height-850);
  y=write(ctx,report.oneLineSummary,80,y,920,37,52,5)+30;
  ctx.fillStyle=gold;y=write(ctx,report.keywords.join('   ·   '),80,y,920,30,44,2)+24;
  ctx.fillStyle=ink;if(y<height-130)write(ctx,report.mascotMessage,80,y,920,27,42,format==='feed'?2:4);
 }
 ctx.fillStyle=gold;ctx.font='24px "Yeongnyangi Noto", sans-serif';ctx.fillText('code-destiny.com  ·  운세는 선택을 돕는 참고 이야기입니다.',78,height-68);
 return blob(element);
}
export function reportPageCount(report:RenderableReport){return Math.max(1,1+Math.ceil(report.sections.length/3));}
async function tarotArt(ctx:CanvasRenderingContext2D,report:RenderableReport,top:number){
 if(report.serviceType!=='tarot')return;
 const path=report.chart?.groups.find(g=>g.cardCode&&g.image)?.image;
 if(!path)return;
 const image=await decode(path);
 const scale=Math.min(250/image.width,400/image.height);
 ctx.drawImage(image,755,top+44,image.width*scale,image.height*scale);
}
