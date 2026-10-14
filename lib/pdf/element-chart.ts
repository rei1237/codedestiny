import type {jsPDF as Pdf} from 'jspdf';
import {CONTENT_BOTTOM_MM,MARGIN_X_MM,CONTENT_WIDTH_MM} from './typeset-metrics';
import type {createTypesetWriter} from './typeset-writer';

/** Draw only saved numeric element weights, never infer counts from the prose. */
export function drawElementChart(pdf:Pdf,writer:ReturnType<typeof createTypesetWriter>,rows:{label:string;value:string}[]){
 const labels=['목','화','토','금','수'];
 if(rows.length!==5||!labels.every(label=>rows.some(row=>row.label===label))||rows.some(row=>!/^\d+(\.\d+)?$/.test(row.value)))return false;
 const ordered=labels.map(label=>rows.find(row=>row.label===label)!);
 const max=Math.max(...ordered.map(row=>Number(row.value)),1),height=68;
 if(writer.y+height>CONTENT_BOTTOM_MM)writer.newPage();
 const top=writer.y,colors=[[63,119,89],[185,88,70],[169,132,60],[118,128,143],[62,110,159]];
 pdf.setFontSize(10);
 for(const [i,row] of ordered.entries()){
  const y=top+i*12;pdf.setTextColor(54,48,59);pdf.text(row.label,MARGIN_X_MM,y+4);
  const [r,g,b]=colors[i];pdf.setFillColor(233,230,224);pdf.rect(MARGIN_X_MM+14,y,CONTENT_WIDTH_MM-39,6,'F');
  pdf.setFillColor(r,g,b);pdf.rect(MARGIN_X_MM+14,y,(CONTENT_WIDTH_MM-39)*Number(row.value)/max,6,'F');
  pdf.text(row.value,MARGIN_X_MM+CONTENT_WIDTH_MM,y+4,{align:'right'});
 }
 writer.space(height);return true;
}
