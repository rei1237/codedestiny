import {createBookWriter} from './book-writer';
import {bookParagraphs} from './book-paragraphs';
import {drawElementChart} from './element-chart';
import {loadYeongnyangiArt,type ReportArt} from './report-art';
import {planLinkedContents,drawLinkedContents} from './linked-contents';
import type {jsPDF as Pdf} from 'jspdf';
import {registerPdfFontsSafely} from './export-result-pdf';
import {drawFooters,paintPaper,PdfFontError,type PdfFonts} from './typeset-writer';
import {CONTENT_WIDTH_MM,MARGIN_X_MM,PAGE_WIDTH_MM,PAGE_HEIGHT_MM} from './typeset-metrics';
import {buildYeongnyangiReportPlan,type ReadingReportInput} from './yeongnyangi-report-plan';
export type ReadingPdfPhase='preparing'|'typesetting'|'saving';
type Options={row:ReadingReportInput;fileName:string;includeQuestion?:boolean;includeFollowups?:boolean;onProgress?:(phase:ReadingPdfPhase)=>void};

/** Reserve a measured, multi-page TOC before writing the body so destinations remain stable. */
export function typesetYeongnyangiReport(pdf:Pdf,fonts:PdfFonts,options:Options,art:ReportArt[]=[]){
 fonts={title:fonts.body,body:fonts.body};
 const chapters=buildYeongnyangiReportPlan(options.row,{includeQuestion:options.includeQuestion,includeFollowups:options.includeFollowups});
 if(!chapters.length)throw new Error('저장할 상담 내용이 없어요.');
 const toc=planLinkedContents(pdf,fonts,chapters.map((chapter,i)=>`${chapter.part!==chapters[i-1]?.part?chapter.part+'\n':''}${chapter.title}`));
 const contentsPages=toc.pages;
 pdf.setFillColor(16,27,44);pdf.rect(0,0,PAGE_WIDTH_MM,PAGE_HEIGHT_MM,'F');
 pdf.setFontSize(26);pdf.setTextColor(249,241,218);
 pdf.text('영냥이의\n개인 상담서',MARGIN_X_MM,45,{lineHeightFactor:1.5});
 if(art[0])pdf.addImage(art[0].dataUrl,'JPEG',MARGIN_X_MM,83,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*art[0].ratio);
 pdf.setFontSize(12);pdf.setTextColor(225,203,157);
 pdf.text(pdf.splitTextToSize(options.row.product.name,CONTENT_WIDTH_MM),MARGIN_X_MM,165);
 pdf.setFontSize(10);pdf.text(`${options.row.chapters.length}개의 상담 챕터와 나만의 실천 노트`,MARGIN_X_MM,185);
 pdf.text(`상담 기준일 ${(options.row.consultation?.asOf||options.row.createdAt).slice(0,10)}`,MARGIN_X_MM,197);
 pdf.text('질문의 답부터, 삶의 선택까지 천천히 펼쳐 보세요.',MARGIN_X_MM,240);
 for(let i=0;i<contentsPages;i++){pdf.addPage();paintPaper(pdf);}
 const writer=createBookWriter(pdf,fonts);
 for(const [i,chapter] of chapters.entries()){
  writer.chapter(chapter.part,chapter.title);toc.entries[i].destination=writer.page;
  let bodyChars=0,illustrated=false;
  for(const block of chapter.blocks){
   if(block.kind==='table'){if(!block.text.includes('오행')||!drawElementChart(pdf,writer,block.rows||[]))writer.keyValueTable(block.rows||[]);}else if(block.kind==='body'){
    for(const paragraph of bookParagraphs(block.text)){writer.body(paragraph);bodyChars+=paragraph.length;
     if(!illustrated&&art.length>1&&bodyChars>=350){const illustration=art[1+i%(art.length-1)];writer.image(illustration.dataUrl,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*illustration.ratio);illustrated=true;}
    }
   }else writer[block.kind](block.text);
   if(block.kind==='lead')bodyChars+=block.text.length;
   if(!illustrated&&art.length>1&&bodyChars>=500&&block.kind==='body'){
    const illustration=art[1+i%(art.length-1)];writer.image(illustration.dataUrl,CONTENT_WIDTH_MM,CONTENT_WIDTH_MM*illustration.ratio);illustrated=true;
   }
  }
 }
 drawLinkedContents(pdf,fonts,toc);
 drawFooters(pdf,fonts,'꿀꿀운세 · 영냥이 개인 상담서',contentsPages+2);
 pdf.setProperties({title:'영냥이 개인 상담서',author:'꿀꿀운세',subject:options.row.product.name});
 return pdf;
}
export async function exportYeongnyangiReportPdf(options:Options){
 options.onProgress?.('preparing');
 const {jsPDF}=await import('jspdf');const pdf=new jsPDF('p','mm','a4');
 const fonts=await registerPdfFontsSafely(pdf);if(!fonts)throw new PdfFontError();
 options.onProgress?.('typesetting');await new Promise<void>(resolve=>setTimeout(resolve,0));
 const art=await loadYeongnyangiArt();
 typesetYeongnyangiReport(pdf,fonts,options,art);
 options.onProgress?.('saving');await new Promise<void>(resolve=>setTimeout(resolve,0));pdf.save(options.fileName);
}
