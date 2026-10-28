import type {jsPDF as Pdf} from 'jspdf';
import {createTypesetWriter,type PdfFonts} from './typeset-writer';
import {CONTENT_BOTTOM_MM,CONTENT_WIDTH_MM,MARGIN_X_MM,lineHeightMm} from './typeset-metrics';
import {bookParagraphs} from './book-paragraphs';

/** Book-specific editorial rhythm, on the existing page and font engine. */
export function createBookWriter(pdf:Pdf,fonts:PdfFonts){
 const base=createTypesetWriter(pdf,fonts);
 const ensure=(height:number)=>{if(base.y+height>CONTENT_BOTTOM_MM)base.newPage();};
 function prose(value:string,lead=false){
  const size=lead?12:11.3,line=lineHeightMm(size,1.85),inset=lead?8:3;
  for(const paragraph of bookParagraphs(value)){
   pdf.setFont(fonts.body,'normal');pdf.setFontSize(size);
   const lines=pdf.splitTextToSize(paragraph,CONTENT_WIDTH_MM-inset*2) as string[];
   ensure(Math.min(lines.length,4)*line+5);
   pdf.setTextColor(42,43,51);
   for(const text of lines){
    ensure(line);
    if(lead){pdf.setDrawColor(165,132,68);pdf.setLineWidth(.8);pdf.line(MARGIN_X_MM,base.y-4,MARGIN_X_MM,base.y+line-4);}
    pdf.text(text,MARGIN_X_MM+inset,base.y);base.space(line);
   }
   base.space(5);
  }
 }
 function table(rows:{label?:string;value?:string}[],title=''){
  if(title)base.heading(title,20);
  const line=lineHeightMm(10.5,1.8),labelWidth=39,valueWidth=CONTENT_WIDTH_MM-labelWidth-12;
  for(const row of rows){
   pdf.setFont(fonts.body,'normal');pdf.setFontSize(10.5);
   const labels=pdf.splitTextToSize(row.label||'',labelWidth-8) as string[],values=pdf.splitTextToSize(row.value||'',valueWidth) as string[];
   let offset=0;const count=Math.max(labels.length,values.length);
   while(offset<count){
    ensure(line*2+8);const capacity=Math.max(1,Math.floor((CONTENT_BOTTOM_MM-base.y-8)/line));
    const take=Math.min(count-offset,capacity),top=base.y,height=take*line+6;
    pdf.setFillColor(244,239,228);pdf.rect(MARGIN_X_MM,top-4,labelWidth,height,'F');
    pdf.setDrawColor(218,210,194);pdf.setLineWidth(.2);pdf.line(MARGIN_X_MM,top+height-4,MARGIN_X_MM+CONTENT_WIDTH_MM,top+height-4);
    for(let i=0;i<take;i++){
     pdf.setTextColor(111,88,45);if(labels[offset+i])pdf.text(labels[offset+i],MARGIN_X_MM+4,top+i*line);
     pdf.setTextColor(42,43,51);if(values[offset+i])pdf.text(values[offset+i],MARGIN_X_MM+labelWidth+6,top+i*line);
    }
    base.space(height+2);offset+=take;
   }
  }
  base.space(5);
 }
 return {...base,get page(){return base.page;},get y(){return base.y;},
  body:(text:string)=>prose(text),lead:(text:string)=>prose(text,true),
  heading:(text:string)=>base.heading(text,25),keyValueTable:table,
  bullets:(items:string[])=>table(items.map((value,i)=>({label:`핵심 ${i+1}`,value}))),
 };
}
