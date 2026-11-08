import type {FortuneRecord} from './api';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {localizedSystem,localizedTier} from './consultation-locale-copy';
import {shareCopy} from './share-copy';

// Multi-page image report of a saved paid reading. It is drawn only in the owner's browser from the
// stored result: no LLM call, no image generation, no upload. Art is the existing Yeongnyangi stills
// (report-art prints, fish tier icons, expression badges), each checked for two ears (handoff 6d).

export type ReportTier='mackerel'|'salmon'|'flounder'|'tuna'|'assorted'|'omakase';
export type ReportChapter={no:number;part:string;title:string;highlight:string;summary:string;advice:string};
export type ReportAnswer={question:string;answer:string;timing:string};
export type ReportModel={
 locale:ReadingLocale;tier:ReportTier;tierName:string;title:string;systems:string[];asOf:string;
 keywords:string[];lead:string;chapters:ReportChapter[];answers:ReportAnswer[];advice:string[];closing:string;
 density:'full'|'compact';sample?:boolean;
};

/** What each tier's report holds. The chapter list is always the whole reading. */
export const REPORT_TIERS:Record<ReportTier,{accent:string;keywords:number;advice:number;answers:number}>={
 mackerel:{accent:'#4f7fa8',keywords:3,advice:3,answers:1},
 salmon:{accent:'#c8604a',keywords:4,advice:4,answers:2},
 flounder:{accent:'#a9822e',keywords:5,advice:5,answers:3},
 tuna:{accent:'#6f55b8',keywords:6,advice:6,answers:3},
 assorted:{accent:'#b4842c',keywords:6,advice:6,answers:3},
 omakase:{accent:'#9b6a1c',keywords:8,advice:8,answers:3},
};
const TIERS=Object.keys(REPORT_TIERS) as ReportTier[];
/** Chapter cards beyond this many switch to the compact card so long readings stay a few pages. */
export const COMPACT_AFTER=8;

const REPORT_COPY={
 ko:{badge:'영냥이 이미지 리포트',sample:'예시',chapters:(n:number)=>`${n}장`,keywords:'핵심 키워드',lead:'한 줄 요약',highlights:'장별 하이라이트',
  answers:'질문에 대한 답',advice:'영냥이의 처방',action:'해볼 행동',timing:'시기',chapter:(n:number)=>`제${n}장`,closing:'마지막 한마디',
  fallbackClosing:'읽은 내용 가운데 하나만 골라 오늘 해 보라냥.',all:'여섯 체계 종합 리포트',title:(name:string)=>`${name} 리포트`,
  footer:'영냥이 · CODE DESTINY',site:'code-destiny.com/yeongnyangi'},
 en:{badge:'Yeongnyangi image report',sample:'Sample',chapters:(n:number)=>`${n} chapters`,keywords:'Key words',lead:'In one line',highlights:'Chapter highlights',
  answers:'Answers to your questions',advice:"Yeongnyangi's prescriptions",action:'Try this',timing:'Timing',chapter:(n:number)=>`Chapter ${n}`,closing:'A last word',
  fallbackClosing:'Pick one thing you read and try it today, meow.',all:'Six-system report',title:(name:string)=>`${name} report`,
  footer:'Yeongnyangi · CODE DESTINY',site:'code-destiny.com/yeongnyangi'},
};
export const reportCopy=(locale:ReadingLocale='ko')=>locale==='ko'?REPORT_COPY.ko:REPORT_COPY.en;

export function cleanText(value:unknown):string{
 return typeof value==='string'?value.replace(/\*\*|__|`|^#+\s*/gm,'').replace(/\s+/g,' ').trim():'';
}
function spread<T>(items:T[],count:number):T[]{
 if(items.length<=count)return items;
 if(count<=1)return items.slice(0,count);
 return Array.from({length:count},(_,i)=>items[Math.round(i*(items.length-1)/(count-1))]);
}
function unique(values:string[]){const seen=new Set<string>();return values.filter(v=>v&&!seen.has(v)&&seen.add(v));}

/** Report content from a saved result. Returns null when the reading cannot be reported yet. */
export function buildReportModel(row:FortuneRecord,options:{sample?:boolean}={}):ReportModel|null{
 if(!row?.paid||row.state!=='COMPLETED')return null;
 const tier=(TIERS.includes(row.product?.fishId as ReportTier)?row.product.fishId:'mackerel') as ReportTier;
 const locale=(row.locale||'ko') as ReadingLocale,ko=locale==='ko',copy=reportCopy(locale),plan=REPORT_TIERS[tier];
 const chapters:ReportChapter[]=(row.chapters||[]).map((c,i)=>{
  const spec=row.manifest?.[i];
  const title=cleanText(ko?spec?.title||c.title:c.title||spec?.title)||reportCopy(locale).chapter(i+1);
  return {no:i+1,part:cleanText(ko?spec?.part:''),title,highlight:cleanText(c.highlights?.[0]),summary:cleanText(c.summary),advice:cleanText(c.advice)};
 }).filter(c=>c.summary||c.highlight);
 if(!chapters.length)return null;
 const systems=(row.product?.systems||[]).map(id=>ko?({saju:'사주',ziwei:'자미두수',sukuyo:'숙요',vedic:'베다점',astrology:'서양 점성술',tarot:'타로'} as Record<string,string>)[id]||id:localizedSystem(id,locale));
 const tierName=ko?row.product?.fishName||localizedTier(tier,locale):localizedTier(tier,locale);
 const title=systems.length>=6?copy.all:copy.title(systems.length?systems.join(' · '):tierName);
 const topics=unique((row.chapters||[]).flatMap(c=>(c.topics||[]).map(cleanText)).filter(t=>Array.from(t).length>=2&&Array.from(t).length<=16));
 const shortHighlights=unique(chapters.map(c=>c.highlight).filter(h=>Array.from(h).length<=16));
 const keywords=unique([...topics,...shortHighlights]).slice(0,plan.keywords);
 const questions=row.consultation?.questions||[];
 const answers=(row.chapters||[]).flatMap(c=>c.questionAnswers||[]).map(a=>({question:cleanText(questions.find(q=>q.id===a.questionId)?.text),answer:cleanText(a.answer),timing:cleanText(a.timing)})).filter(a=>a.answer).slice(0,plan.answers);
 const advice=spread(unique(chapters.map(c=>c.advice)),plan.advice);
 const persona=cleanText([...(row.chapters||[])].reverse().find(c=>cleanText(c.persona))?.persona);
 return {locale,tier,tierName,title,systems:systems.length>1?systems:[],asOf:cleanText(row.consultation?.asOf||row.completedAt?.slice(0,10)||row.createdAt?.slice(0,10)),
  keywords,lead:answers[0]?.answer||chapters[0].summary,chapters,answers,advice,closing:persona||copy.fallbackClosing,
  density:chapters.length>COMPACT_AFTER?'compact':'full',sample:options.sample};
}

export type Measure=(text:string)=>number;
/** Wraps at spaces (Korean eojeol boundaries) and splits a word by character only when it alone overflows. */
export function wrapText(text:string,maxWidth:number,measure:Measure):string[]{
 const lines:string[]=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   const candidate=line?`${line} ${word}`:word;
   if(measure(candidate)<=maxWidth){line=candidate;continue;}
   if(line)lines.push(line);
   line='';
   if(measure(word)<=maxWidth){line=word;continue;}
   for(const char of Array.from(word)){if(line&&measure(line+char)>maxWidth){lines.push(line);line='';}line+=char;}
  }
  if(line)lines.push(line);
 }
 return lines;
}
/** Keeps at most `max` lines; the last kept line ends with an ellipsis that still fits. */
export function clampLines(lines:string[],max:number,maxWidth:number,measure:Measure):string[]{
 if(lines.length<=max)return lines;
 const kept=lines.slice(0,max);
 let last=kept[max-1];
 while(last&&measure(last+'…')>maxWidth)last=Array.from(last).slice(0,-1).join('');
 kept[max-1]=last.replace(/[\s,.·]+$/,'')+'…';
 return kept;
}
/** Greedy page breaks. A block marked keepWithNext moves to the next page together with its follower. */
export function paginate(blocks:{height:number;keepWithNext?:boolean}[],available:number,firstAvailable=available):number[][]{
 const pages:number[][]=[[]];let used=0,budget=firstAvailable;
 blocks.forEach((block,i)=>{
  const need=block.keepWithNext&&blocks[i+1]?block.height+blocks[i+1].height:block.height;
  if(pages[pages.length-1].length&&used+need>budget){pages.push([]);used=0;budget=available;}
  pages[pages.length-1].push(i);used+=block.height;
 });
 return pages;
}

// ---- Canvas rendering (browser only) ----
export const REPORT_WIDTH=720,REPORT_SCALE=2,REPORT_MAX_HEIGHT=1280;
const PAD=48,INNER=REPORT_WIDTH-PAD*2,FOOTER=64,HEADER=56;
const SANS='"Yeongnyangi Noto","Noto Sans KR","Malgun Gothic",sans-serif';
const SERIF='"Yeongnyangi Myeongjo","Nanum Myeongjo",serif';
const FONT={
 title:`700 36px ${SERIF}`,h2:`700 27px ${SERIF}`,card:`700 21px ${SERIF}`,quote:`700 21px ${SERIF}`,number:`700 26px ${SERIF}`,
 label:`700 13px ${SANS}`,meta:`500 15px ${SANS}`,chip:`500 15px ${SANS}`,strong:`600 16px ${SANS}`,body:`400 16px ${SANS}`,
 small:`400 14px ${SANS}`,footer:`500 12px ${SANS}`,
};
const INK='#2b2238',MUTED='#6d6176',PAPER='#fbf6ee',CARD='#ffffff',LINE='#e8dccb',NIGHT='#161a33',IVORY='#f6efe2',GOLD='#e3c48a';
const ART={
 cover:'/assets/yeongnyangi/report-art/cover-print.webp',insight:'/assets/yeongnyangi/report-art/insight-print.webp',
 choices:'/assets/yeongnyangi/report-art/choices-print.webp',closing:'/assets/yeongnyangi/report-art/closing-print.webp',
};
// Two-ear checked badges (calm, curious, welcome, chic) at full size, 2026-11-08.
const BADGES=['curious','calm','chic','welcome'].map(id=>`/assets/yeongnyangi/expressions/${id}.webp`);
const fishIcon=(tier:ReportTier)=>`/assets/yeongnyangi/fish/${tier}.webp`;

type Ctx=CanvasRenderingContext2D;
type Block={height:number;keepWithNext?:boolean;draw:(ctx:Ctx,y:number)=>void};
type Images=Record<string,HTMLImageElement>;

function allReportText(model:ReportModel){
 const copy=reportCopy(model.locale),share=shareCopy(model.locale);
 return [model.title,model.tierName,model.asOf,model.lead,model.closing,...model.keywords,...model.systems,...model.advice,
  ...model.chapters.flatMap(c=>[c.title,c.part,c.highlight,c.summary,c.advice,copy.chapter(c.no)]),
  ...model.answers.flatMap(a=>[a.question,a.answer,a.timing]),
  ...Object.values(copy).filter(v=>typeof v==='string'),copy.chapters(model.chapters.length),share.disclaimer,share.asOf,
  '0123456789/ ·…:.-Q'].join(' ');
}
/** Loads every subset of both families for every character the report draws (the fonts are unicode-range split). */
export async function loadReportFonts(model:ReportModel){
 const text=allReportText(model);
 await Promise.all(Object.values(FONT).map(spec=>document.fonts.load(spec,text).catch(()=>[])));
}
function loadImage(src:string){const image=new Image();image.decoding='async';image.src=src;return image.decode().then(()=>image);}
function roundRect(ctx:Ctx,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

function blocksFor(model:ReportModel,images:Images,ctx:Ctx):Block[]{
 const copy=reportCopy(model.locale),share=shareCopy(model.locale),accent=REPORT_TIERS[model.tier].accent;
 const measureWith=(font:string):Measure=>text=>{ctx.font=font;return ctx.measureText(text).width;};
 const lines=(text:string,font:string,width:number,max=99)=>clampLines(wrapText(text,width,measureWith(font)),max,width,measureWith(font));
 // Blocks are measured on the probe context and drawn on each page's context.
 const page={ctx};
 const write=(rows:string[],font:string,color:string,x:number,y:number,leading:number)=>{const c=page.ctx;c.font=font;c.fillStyle=color;c.textBaseline='alphabetic';rows.forEach((row,i)=>c.fillText(row,x,y+i*leading));};
 const blocks:Block[]=[];
 const heading=(label:string,title:string):Block=>({height:96,keepWithNext:true,draw:(c,y)=>{write([label],FONT.label,accent,PAD,y+44,0);write([title],FONT.h2,INK,PAD,y+78,0);}});
 const artBand=(image:HTMLImageElement,sourceY:number):Block=>({height:292,draw:(c,y)=>{
  c.save();roundRect(c,PAD,y+8,INNER,260,20);c.clip();
  const sw=image.naturalWidth,sh=sw*260/INNER;c.drawImage(image,0,sourceY,sw,sh,PAD,y+8,INNER,260);c.restore();
 }});

 // Cover: full-bleed art, then the tier, title and reading facts on night blue.
 const titleRows=lines(model.title,FONT.title,INNER,2);
 const chipRows=model.systems.length?chipLayout(model.systems,FONT.label,ctx,INNER,10,30):{rows:[],height:0};
 const coverHeight=480+132+titleRows.length*46+(chipRows.height?chipRows.height+14:0)+56;
 blocks.push({height:coverHeight,draw:(c,y)=>{
  c.fillStyle=NIGHT;c.fillRect(0,y,REPORT_WIDTH,coverHeight);
  c.drawImage(images.cover,0,y,REPORT_WIDTH,480);
  const fade=c.createLinearGradient(0,y+330,0,y+480);fade.addColorStop(0,'rgba(22,26,51,0)');fade.addColorStop(1,NIGHT);c.fillStyle=fade;c.fillRect(0,y+330,REPORT_WIDTH,150);
  const icon=images.fish,platter=model.tier==='assorted'||model.tier==='omakase';
  let top=y+500;
  if(platter){c.fillStyle='#fefaf2';roundRect(c,PAD,top,112,104,18);c.fill();c.drawImage(icon,PAD+6,top+4,100,96);}
  else{c.fillStyle='rgba(254,250,242,.96)';roundRect(c,PAD,top,112,104,18);c.fill();c.drawImage(icon,PAD+4,top+16,104,104*icon.naturalHeight/icon.naturalWidth);}
  const textX=PAD+132;
  write([model.sample?`${copy.badge} · ${copy.sample}`:copy.badge],FONT.label,GOLD,textX,top+30,0);
  write([`${model.tierName} · ${copy.chapters(model.chapters.length)}`],FONT.meta,IVORY,textX,top+60,0);
  if(model.asOf)write([`${share.asOf} ${model.asOf}`],FONT.small,'#b9b2cc',textX,top+88,0);
  top+=132;
  write(titleRows,FONT.title,IVORY,PAD,top+34,46);top+=titleRows.length*46;
  if(chipRows.height){drawChips(c,chipRows.rows,FONT.label,PAD,top+14,30,'rgba(227,196,138,.16)',GOLD,10);}
 }});

 if(model.keywords.length){
  const chips=chipLayout(model.keywords,FONT.chip,ctx,INNER,12,40);
  blocks.push(heading(model.tierName,copy.keywords));
  blocks.push({height:chips.height+24,draw:(c,y)=>drawChips(c,chips.rows,FONT.chip,PAD,y+4,40,`${accent}1f`,INK,12,accent)});
 }
 const leadRows=lines(model.lead,FONT.quote,INNER-56,6);
 blocks.push(heading(model.tierName,copy.lead));
 blocks.push({height:leadRows.length*34+64,draw:(c,y)=>{
  c.fillStyle=CARD;roundRect(c,PAD,y+4,INNER,leadRows.length*34+44,18);c.fill();
  c.fillStyle=accent;c.fillRect(PAD+22,y+26,4,leadRows.length*34);
  write(leadRows,FONT.quote,INK,PAD+44,y+50,34);
 }});

 if(model.answers.length){
  blocks.push(heading(model.tierName,copy.answers));
  for(const answer of model.answers){
   const q=answer.question?lines(`Q. ${answer.question}`,FONT.strong,INNER-48,2):[];
   const a=lines(answer.answer,FONT.body,INNER-48,5);
   const t=answer.timing?lines(`${copy.timing} · ${answer.timing}`,FONT.small,INNER-48,2):[];
   const h=40+q.length*26+(q.length?8:0)+a.length*27+(t.length?t.length*22+10:0);
   blocks.push({height:h+16,draw:(c,y)=>{
    c.fillStyle=CARD;roundRect(c,PAD,y,INNER,h,18);c.fill();c.strokeStyle=LINE;c.lineWidth=1;c.stroke();
    let top=y+40;write(q,FONT.strong,accent,PAD+24,top,26);top+=q.length*26+(q.length?8:0);
    write(a,FONT.body,INK,PAD+24,top,27);top+=a.length*27;
    if(t.length)write(t,FONT.small,MUTED,PAD+24,top+10,22);
   }});
  }
 }

 // Chapters: every chapter of the reading, as full cards for short readings and compact cards for long ones.
 blocks.push(artBand(images.insight,100));
 blocks.push(heading(copy.chapters(model.chapters.length),copy.highlights));
 let lastPart='';
 model.chapters.forEach((chapter,i)=>{
  const full=model.density==='full',badge=full?60:44,textX=PAD+24+badge+16,width=INNER-48-badge-16;
  const label=[copy.chapter(chapter.no),chapter.part&&chapter.part!==lastPart?chapter.part:''].filter(Boolean).join(' · ');
  lastPart=chapter.part||lastPart;
  const titleRows=lines(chapter.title,FONT.card,width,2);
  const highlight=chapter.highlight?lines(chapter.highlight,FONT.strong,width,full?2:1):[];
  const summary=lines(chapter.summary,FONT.body,width,full?3:2);
  const action=full&&chapter.advice?lines(`${copy.action} · ${chapter.advice}`,FONT.small,width,2):[];
  const h=Math.max(badge+40,36+20+titleRows.length*30+highlight.length*25+(highlight.length?6:0)+summary.length*26+(action.length?action.length*22+12:0)+8);
  blocks.push({height:h+14,draw:(c,y)=>{
   c.fillStyle=CARD;roundRect(c,PAD,y,INNER,h,18);c.fill();c.strokeStyle=LINE;c.lineWidth=1;c.stroke();
   c.drawImage(images[`badge${i%BADGES.length}`],PAD+20,y+20,badge,badge);
   let top=y+36;write([label],FONT.label,accent,textX,top,0);top+=28;
   write(titleRows,FONT.card,INK,textX,top,30);top+=titleRows.length*30;
   if(highlight.length){write(highlight,FONT.strong,'#4a3a57',textX,top,25);top+=highlight.length*25+6;}
   write(summary,FONT.body,MUTED,textX,top,26);top+=summary.length*26;
   if(action.length)write(action,FONT.small,accent,textX,top+12,22);
  }});
 });

 if(model.advice.length){
  blocks.push(artBand(images.choices,150));
  blocks.push(heading(model.tierName,copy.advice));
  model.advice.forEach((text,i)=>{
   const rows=lines(text,FONT.body,INNER-72,3),h=Math.max(52,rows.length*27+30);
   blocks.push({height:h,draw:(c,y)=>{
    write([String(i+1).padStart(2,'0')],FONT.number,accent,PAD,y+34,0);
    write(rows,FONT.body,INK,PAD+64,y+30,27);
    c.fillStyle=LINE;c.fillRect(PAD+64,y+h-8,INNER-64,1);
   }});
  });
 }

 // Closing: art, the cat's last line, brand and the reading's limits.
 const closingRows=lines(model.closing,FONT.quote,INNER,4);
 const disclaimer=lines(share.disclaimer,FONT.small,INNER,3);
 const closingHeight=24+416+40+closingRows.length*34+30+30+disclaimer.length*22+28;
 blocks.push({height:closingHeight,draw:(c,y)=>{
  c.fillStyle=NIGHT;roundRect(c,PAD-24,y+8,INNER+48,closingHeight-8,24);c.fill();
  c.save();roundRect(c,PAD,y+32,INNER,416,18);c.clip();c.drawImage(images.closing,PAD,y+32,INNER,416);c.restore();
  let top=y+32+416+44;
  write([copy.closing],FONT.label,GOLD,PAD,top-6,0);top+=26;
  write(closingRows,FONT.quote,IVORY,PAD,top,34);top+=closingRows.length*34+6;
  write([copy.site],FONT.meta,GOLD,PAD,top+18,0);top+=40;
  write(disclaimer,FONT.small,'#b9b2cc',PAD,top+8,22);
 }});
 return blocks.map(block=>({...block,draw:(c:Ctx,y:number)=>{page.ctx=c;block.draw(c,y);}}));
}

function chipLayout(items:string[],font:string,ctx:Ctx,width:number,gap:number,height:number){
 ctx.font=font;const rows:{text:string;x:number;w:number;row:number}[]=[];let x=0,row=0;
 for(const item of items){
  const text=clampLines([item],1,width-40,t=>ctx.measureText(t).width)[0];
  const w=Math.min(width,ctx.measureText(text).width+36);
  if(x&&x+w>width){row++;x=0;}
  rows.push({text,x,w,row});x+=w+gap;
 }
 return {rows,height:items.length?(row+1)*height+row*gap:0};
}
function drawChips(ctx:Ctx,chips:ReturnType<typeof chipLayout>['rows'],font:string,x:number,y:number,height:number,fill:string,color:string,gap:number,border?:string){
 ctx.font=font;ctx.textBaseline='middle';
 for(const chip of chips){
  const top=y+chip.row*(height+gap);
  ctx.fillStyle=fill;roundRect(ctx,x+chip.x,top,chip.w,height,height/2);ctx.fill();
  if(border){ctx.strokeStyle=border;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;}
  ctx.fillStyle=color;ctx.fillText(chip.text,x+chip.x+18,top+height/2+1);
 }
 ctx.textBaseline='alphabetic';
}

async function encode(canvas:HTMLCanvasElement):Promise<Blob>{
 const as=(type:string,quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,quality));
 const webp=await as('image/webp',0.9);
 if(webp?.type==='image/webp')return webp;
 const jpeg=await as('image/jpeg',0.92);
 if(jpeg)return jpeg;
 throw new Error('IMAGE_UNAVAILABLE');
}

/** Draws the report pages at 2x and returns them as compressed images (WebP, or JPEG where WebP encoding is missing). */
export async function renderImageReport(model:ReportModel):Promise<Blob[]>{
 const sources:Record<string,string>={...ART,fish:fishIcon(model.tier)};
 BADGES.forEach((src,i)=>{sources[`badge${i}`]=src;});
 const [loaded]=await Promise.all([
  Promise.all(Object.entries(sources).map(async([key,src])=>[key,await loadImage(src)] as const)),
  loadReportFonts(model),
 ]);
 const images=Object.fromEntries(loaded) as Images;
 const probe=document.createElement('canvas').getContext('2d');if(!probe)throw new Error('IMAGE_UNAVAILABLE');
 const blocks=blocksFor(model,images,probe);
 const pages=paginate(blocks,REPORT_MAX_HEIGHT-HEADER-8-FOOTER,REPORT_MAX_HEIGHT-FOOTER-24);
 const copy=reportCopy(model.locale),out:Blob[]=[];
 for(const [index,page] of pages.entries()){
  const top=index?HEADER:0;
  const content=page.reduce((sum,i)=>sum+blocks[i].height,0);
  const height=Math.min(REPORT_MAX_HEIGHT,top+content+FOOTER+(index?8:24));
  const canvas=document.createElement('canvas');canvas.width=REPORT_WIDTH*REPORT_SCALE;canvas.height=Math.round(height*REPORT_SCALE);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('IMAGE_UNAVAILABLE');
  ctx.scale(REPORT_SCALE,REPORT_SCALE);ctx.imageSmoothingQuality='high';
  ctx.fillStyle=PAPER;ctx.fillRect(0,0,REPORT_WIDTH,height);
  if(index){
   ctx.font=FONT.label;ctx.fillStyle=REPORT_TIERS[model.tier].accent;ctx.fillText(`${copy.badge} · ${model.tierName}`,PAD,36);
   ctx.fillStyle=LINE;ctx.fillRect(PAD,46,INNER,1);
  }
  let y=top+(index?8:0);
  for(const i of page){blocks[i].draw(ctx,y);y+=blocks[i].height;}
  drawFooter(ctx,height,`${index+1} / ${pages.length}`,copy.footer);
  out.push(await encode(canvas));
 }
 return out;
}
function drawFooter(ctx:Ctx,height:number,pageLabel:string,brand:string){
 const y=height-FOOTER+22;
 ctx.fillStyle=LINE;ctx.fillRect(PAD,y,INNER,1);
 ctx.font=FONT.footer;ctx.fillStyle=MUTED;ctx.textBaseline='alphabetic';
 const pageWidth=ctx.measureText(pageLabel).width;
 let label=brand;while(label&&ctx.measureText(label).width>INNER-pageWidth-24)label=Array.from(label).slice(0,-1).join('');
 ctx.fillText(label,PAD,y+28);
 ctx.fillText(pageLabel,PAD+INNER-pageWidth,y+28);
}
