import {ziweiChapterPreview,type ZiweiReportChapter} from "@/lib/pdf/ziwei-report-plan";
export function ZiweiDeepChapters({chapters,openLabel,className}:{chapters:ZiweiReportChapter[];openLabel:string;className?:string}){
  return chapters.map((chapter,index)=><article key={chapter.id} data-ziwei-pdf-section className={className}>
    <h4>{chapter.title}</h4><p>{ziweiChapterPreview(chapter)}</p>
    <details open={index===0}><summary>{openLabel}</summary><p>{chapter.body}</p></details>
  </article>);
}
