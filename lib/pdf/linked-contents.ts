import type {jsPDF as Pdf} from 'jspdf';
import type {PdfFonts} from './typeset-writer';
import {CONTENT_WIDTH_MM,CONTENT_BOTTOM_MM,MARGIN_TOP_MM,MARGIN_X_MM,lineHeightMm} from './typeset-metrics';
export function planLinkedContents(pdf:Pdf,fonts:PdfFonts,titles:string[]){
 pdf.setFont(fonts.body,'normal');pdf.setFontSize(10.5);
 const line=lineHeightMm(10.5,1.7),top=MARGIN_TOP_MM+22;
 let y=top,page=2;
 const entries=titles.map(title=>{
  const lines=pdf.splitTextToSize(title,CONTENT_WIDTH_MM-18) as string[];
  const height=lines.length*line+4;
  if(y+height>CONTENT_BOTTOM_MM){page++;y=top;}
  const entry={lines,y,tocPage:page,destination:0};y+=height;return entry;
 });
 return {entries,pages:page-1,line};
}
export function drawLinkedContents(pdf:Pdf,fonts:PdfFonts,plan:ReturnType<typeof planLinkedContents>){
 for(let page=2;page<=plan.pages+1;page++){
  pdf.setPage(page);pdf.setFont(fonts.body,'normal');pdf.setFontSize(17);pdf.setTextColor(55,37,55);
  pdf.text(page===2?'차례':'차례 · 계속',MARGIN_X_MM,MARGIN_TOP_MM+6);pdf.setFontSize(10.5);
  for(const entry of plan.entries.filter(entry=>entry.tocPage===page)){
   pdf.text(entry.lines,MARGIN_X_MM,entry.y,{lineHeightFactor:1.7});
   pdf.text(String(entry.destination),MARGIN_X_MM+CONTENT_WIDTH_MM,entry.y,{align:'right'});
   pdf.link(MARGIN_X_MM,entry.y-plan.line,CONTENT_WIDTH_MM,entry.lines.length*plan.line+4,{pageNumber:entry.destination});
  }
 }
}
