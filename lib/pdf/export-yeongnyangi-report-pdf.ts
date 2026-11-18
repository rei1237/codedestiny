import {createBookWriter} from './book-writer';
import {bookParagraphs} from './book-paragraphs';
import {drawElementChart} from './element-chart';
import {loadYeongnyangiArt,type ReportArt} from './report-art';
import {planLinkedContents,drawLinkedContents} from './linked-contents';
import type {jsPDF as Pdf} from 'jspdf';
import {prefetchPdfFonts,registerPdfFontsSafely} from './export-result-pdf';
import {drawFooters,paintPaper,PdfFontError,type PdfFonts} from './typeset-writer';
import {CONTENT_WIDTH_MM,MARGIN_X_MM,PAGE_WIDTH_MM,PAGE_HEIGHT_MM} from './typeset-metrics';
import {buildYeongnyangiReportPlan,type ReadingReportInput} from './yeongnyangi-report-plan';
export type ReadingPdfPhase='preparing'|'typesetting'|'saving';
/** done/total counts typeset chapters, so the reader sees a real bar on a 43-chapter omakase book. */
export type ReadingPdfProgress={done:number;total:number};
export type ReadingPdfResult={blob:Blob;pages:number;bytes:number};
type Options={row:ReadingReportInput;fileName:string;includeQuestion?:boolean;includeFollowups?:boolean;onProgress?:(phase:ReadingPdfPhase,progress?:ReadingPdfProgress)=>void;save?:boolean};

/** Hands the main thread back between chapters so a phone keeps scrolling and painting the progress bar. */
const yieldToBrowser=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

/** Reserve a measured, multi-page TOC before writing the body so destinations remain stable. */
export async function typesetYeongnyangiReport(pdf:Pdf,fonts:PdfFonts,options:Options,art:ReportArt[]=[]){
 fonts={title:fonts.body,body:fonts.body};
 const chapters=buildYeongnyangiReportPlan(options.row,{includeQuestion:options.includeQuestion,includeFollowups:options.includeFollowups});
 if(!chapters.length)throw new Error('저장할 상담 내용이 없어요.');
 const toc=planLinkedContents(pdf,fonts,chapters.map((chapter,i)=>`${chapter.part!==chapters[i-1]?.part?chapter.part+'\n':''}${chapter.title}`));
 const contentsPages=toc.pages;
 pdf.setFillColor(16,27,44);pdf.rect(0,0,PAGE_WIDTH_MM,PAGE_HEIGHT_MM,'F');
 pdf.setFontSize(26);pdf.setTextColor(249,241,218);
 pdf.text('영냥이의\n개인 상담서',MARGIN_X_MM,45,{lineHeightFactor:1.5});
 if(art[0])pdf.addImage(art[0].dataUrl,'JPEG',MARGIN_X_MM,72,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*art[0].ratio);
 pdf.setFontSize(12);pdf.setTextColor(225,203,157);
 pdf.text(pdf.splitTextToSize(options.row.product.name,CONTENT_WIDTH_MM),MARGIN_X_MM,202);
 pdf.setFontSize(10);pdf.text(`${options.row.chapters.length}개의 상담 챕터와 나만의 실천 노트`,MARGIN_X_MM,225);
 pdf.text(`상담 기준일 ${(options.row.consultation?.asOf||options.row.createdAt).slice(0,10)}`,MARGIN_X_MM,237);
 pdf.text('질문의 답부터, 삶의 선택까지 천천히 펼쳐 보세요.',MARGIN_X_MM,260);
 for(let i=0;i<contentsPages;i++){pdf.addPage();paintPaper(pdf);}
 const writer=createBookWriter(pdf,fonts);
 for(const [i,chapter] of chapters.entries()){
  writer.chapter(chapter.part,chapter.title);toc.entries[i].destination=writer.page;
  let bodyChars=0,illustrated=false;
  const bodyIndex=options.row.manifest.findIndex(spec=>spec.id===chapter.id);
  const illustration=bodyIndex<0?undefined:bodyIndex===0?art[1]:bodyIndex===options.row.chapters.length-1?art[3]:bodyIndex===Math.floor(options.row.chapters.length/2)&&options.row.chapters.length>3?art[2]:undefined;
  for(const block of chapter.blocks){
   if(block.kind==='table'){if(!block.text.includes('오행')||!drawElementChart(pdf,writer,block.rows||[]))writer.keyValueTable(block.rows||[]);}else if(block.kind==='body'){
    for(const paragraph of bookParagraphs(block.text)){writer.body(paragraph);bodyChars+=paragraph.length;
     if(!illustrated&&illustration&&bodyChars>=350){writer.image(illustration.dataUrl,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*illustration.ratio);illustrated=true;}
    }
   }else writer[block.kind](block.text);
   if(block.kind==='lead')bodyChars+=block.text.length;
   if(!illustrated&&illustration&&bodyChars>=500&&block.kind==='body'){
    writer.image(illustration.dataUrl,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*illustration.ratio);illustrated=true;
   }
  }
  if(illustration&&!illustrated)writer.image(illustration.dataUrl,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*illustration.ratio);
  options.onProgress?.('typesetting',{done:i+1,total:chapters.length});
  await yieldToBrowser();
 }
 drawLinkedContents(pdf,fonts,toc);
 drawFooters(pdf,fonts,'꿀꿀운세 · 영냥이 개인 상담서',contentsPages+2);
 pdf.setProperties({title:'영냥이 개인 상담서',author:'꿀꿀운세',subject:options.row.product.name});
 return pdf;
}

/** The same anchor download jsPDF's save() performs, kept separate so a finished book can be saved again without re-typesetting. */
export function saveReportBlob(blob:Blob,fileName:string){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=fileName;a.rel='noopener';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),40000);
}

const BODY_ONLY=['body'] as const;
/** Warms the PDF engine and the body font when the export panel opens, so the save tap only typesets. */
export function prefetchYeongnyangiReportPdf(){
 void import('jspdf').catch(()=>undefined);
 prefetchPdfFonts(BODY_ONLY);
}

export async function exportYeongnyangiReportPdf(options:Options):Promise<ReadingPdfResult>{
 options.onProgress?.('preparing');
 // Font, artwork and the PDF engine are independent downloads; start them together instead of one after another.
 prefetchYeongnyangiReportPdf();
 const [{jsPDF},art]=await Promise.all([import('jspdf'),loadYeongnyangiArt()]);
 // compress: Flate for page content and the embedded font subset (~2/3 of the bytes uncompressed, 2026-11-18 실측).
 const pdf=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
 // The book is set in the body face only; never download or embed the unused title font.
 const fonts=await registerPdfFontsSafely(pdf,{only:BODY_ONLY});if(!fonts)throw new PdfFontError();
 options.onProgress?.('typesetting',{done:0,total:0});await yieldToBrowser();
 await typesetYeongnyangiReport(pdf,fonts,options,art);
 options.onProgress?.('saving');await yieldToBrowser();
 const blob=pdf.output('blob');
 if(options.save!==false)saveReportBlob(blob,options.fileName);
 return {blob,pages:pdf.getNumberOfPages(),bytes:blob.size};
}
