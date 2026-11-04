import type {HeukwolReport} from './types';
import {registerPdfFontsSafely} from '@/lib/pdf/export-result-pdf';
import {createTypesetWriter,paintPaper,drawFooters,PdfFontError} from '@/lib/pdf/typeset-writer';
/** Saved text, not a newly generated reading or a huge DOM screenshot. */
export async function exportHeukwolPdf(report:HeukwolReport,isCurrent:()=>boolean){
 const {jsPDF}=await import('jspdf');const pdf=new jsPDF('p','mm','a4');
 const fonts=await registerPdfFontsSafely(pdf);if(!fonts)throw new PdfFontError();if(!isCurrent())return;
 paintPaper(pdf);const writer=createTypesetWriter(pdf,fonts);
 writer.heading(report.title,20);writer.body('연이의 해석 · 네오의 대응');writer.body(report.analysis.limitation);writer.body(`상담 질문: ${report.question}`);
 for(const c of report.chapters){if(!isCurrent())return;writer.chapter('',c.title);writer.heading('흑월의 예고',12);writer.body(c.warning);writer.heading('연이의 해석',12);writer.body(c.interpretation);writer.heading('네오의 대응',12);writer.body(c.strategy);if(c.checkpoints?.length){writer.heading('다시 확인할 기준');c.checkpoints.forEach((line,i)=>writer.body(`${i+1}. ${line}`));}}
 for(const m of report.analysis.months){writer.chapter(`부록 · ${m.month}월`,'월별 근거와 점검');
  for(const d of m.domains){writer.heading(d.title);writer.body(`사주 점검 우선순위 ${d.sajuPriority}\n${d.sign}\n${d.action}\n판단 전환: ${d.change}`);}
  for(const s of m.saju)writer.body(`${s.start} ~ ${s.end} KST · ${s.pillar} · ${s.tenGod}\n${s.tensions.map(t=>t.label).join(' · ')||'뚜렷한 충형파해 신호 없음'}`);
  for(const z of m.ziwei)writer.body(`${z.start} ~ ${z.end} KST · 음력 ${z.leap?'윤':''}${z.lunarMonth}월\n${z.marks.map(mark=>`${({huaLu:'화록',huaQuan:'화권',huaKe:'화과',huaJi:'화기'} as Record<string,string>)[mark.type]}: ${mark.star} (${mark.palaces.join('·')})`).join('\n')}`);
 }

 writer.body(report.analysis.method);drawFooters(pdf,fonts,'꿀꿀 운세 · 흑월의 경고',1);
 if(isCurrent())pdf.save(`흑월의-경고-${report.year}.pdf`);
}
