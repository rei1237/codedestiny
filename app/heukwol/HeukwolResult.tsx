'use client';
import {useState} from 'react';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import type {HeukwolReport} from './types';
import styles from './heukwol.module.css';
const labels:Record<string,string>={huaLu:'화록 · 활용할 자원',huaQuan:'화권 · 책임과 실행',huaKe:'화과 · 조력과 정리',huaJi:'화기 · 막힘을 점검'};
function ReadingPassage({text}:{text:string}) {
 return <>{text.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>
  {paragraph.split(/(\*\*[^*\n]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.replace(/^(\s*)\*\s+/gm,'$1• '))}
 </p>)}</>;
}
export default function HeukwolResult({report,isCurrent=()=>true}:{report:HeukwolReport;isCurrent?:()=>boolean}){
 const [month,setMonth]=useState(1),[pdfBusy,setPdfBusy]=useState(false),[message,setMessage]=useState('');
 const m=report.analysis.months.find(item=>item.month===month)!;
 const priority=(item:typeof m)=>Math.max(...item.domains.map(d=>d.sajuPriority));
 const firstMonths=[...report.analysis.months].sort((a,b)=>priority(b)-priority(a)||a.month-b.month).slice(0,3);
 async function pdf(){const account=readDestinyProfileAccountId();const current=()=>isCurrent()&&account===readDestinyProfileAccountId();setPdfBusy(true);setMessage('');try{const {exportHeukwolPdf}=await import('./pdf');await exportHeukwolPdf(report,current);}catch{if(current())setMessage('PDF를 준비하지 못했어요. 잠시 후 다시 저장해 주세요.');}finally{setPdfBusy(false);}}
 return <section className={styles.result} aria-label="저장된 흑월 리포트">
  <header className={styles.reportCover}><p>{report.year}년 · 나의 대응 상담서</p><h1>{report.title}</h1><p>흑월이 예견한 갈림길에서,<br/>연이와 네오가 다른 길을 찾습니다.</p></header>
  <p>본문 {report.totalChars.toLocaleString()}자 · {report.chapters.length}장 · <a href="/records/">내 보관함에서 다시 보기</a></p>
  <button type="button" className={styles.primary} disabled={pdfBusy} onClick={pdf}>{pdfBusy?'PDF 준비 중':'전체 리포트 PDF 저장하기'}</button><p role="status">{message}</p>
  <details className={styles.readerTools}><summary>월별 계산 근거와 대응 살펴보기</summary><p>월을 선택하면 실제 계산 구간과 점검할 행동이 펼쳐져요. 숫자는 사주 신호의 점검 우선순위이며 사건 발생 확률이 아니에요.</p>
  <aside className={styles.overview}><h3>올해 먼저 점검할 달</h3><p>{firstMonths.map(item=>`${item.month}월`).join(' · ')}</p><small>같은 해의 사주 신호를 비교한 순서예요. 같은 점수의 달은 달력 순으로 표시합니다. 자미두수의 근거는 아래에서 따로 확인해요.</small></aside>
  <div className={styles.months} role="group" aria-label="월 선택">{report.analysis.months.map(item=><button key={item.month} aria-pressed={month===item.month} onClick={()=>setMonth(item.month)}>{item.month}월<span>점검 {Math.max(...item.domains.map(d=>d.sajuPriority))}</span></button>)}</div>
  <section aria-label={`${month}월 분석`}><h2>{month}월의 점검과 대응</h2><p>{m.start} ~ {m.end} · 한국 표준시, 종료 시각 제외</p>
  <a className={styles.monthReading} href={`#chapter-month-${month}`}>{month}월 연이의 해석과 네오의 대응 읽기</a>
  {m.domains.map(d=><article className={styles.domain} key={d.id}><h3>{d.title}</h3><p>사주 점검 우선순위 <strong>{d.sajuPriority}</strong> · 자미두수 {d.ziweiCautions.length?'화기 대조 근거 있음':'이 구간의 해당 궁 화기 대조 없음'}</p><p>{d.sign}</p><p><b>먼저 할 일</b> {d.action}</p><p><b>판단을 바꿀 조건</b> {d.change}</p></article>)}
  <details className={styles.evidence}><summary>사주·자미두수 계산 근거 보기</summary><h3>사주 · 절입 구간</h3>{m.saju.map(s=><p key={s.id}>{s.start} ~ {s.end}<br/>{s.pillar} · {s.tenGod}<br/>{s.tensions.map(t=>t.label).join(' · ')||'뚜렷한 충형파해 신호 없음'}<br/>함께 볼 신호: {s.supports.map(t=>t.label).join(' · ')||'별도 합 신호 없음'}</p>)}<h3>자미두수 · 음력 유월 사화와 원국의 별 위치</h3>{m.ziwei.map(s=><div key={s.id}><p>{s.start} ~ {s.end} · 음력 {s.leap?'윤':''}{s.lunarMonth}월</p><ul>{s.marks.map(mark=><li key={mark.type}>{labels[mark.type]}: {mark.star} — {mark.palaces.join('·')}</li>)}</ul></div>)}<p>{report.analysis.method}</p></details>
  </section></details>
  <details id="report-contents" className={styles.readerTools}><summary>상담서 차례 · {report.chapters.length}장</summary><nav className={styles.contents} aria-label="리포트 차례">{report.chapters.map(c=><a key={c.key} href={`#chapter-${c.key}`}>{c.title}</a>)}</nav></details>
  {report.chapters.map((c,index)=><article key={c.key} id={`chapter-${c.key}`} className={styles.chapter}>
   <p className={styles.eyebrow}>{index+1} / {report.chapters.length}장</p><h2>{c.title}</h2>
   <div className={styles.forewarning}><h3>흑월의 예고</h3><ReadingPassage text={c.warning}/></div>
   <div className={styles.readingVoice}><h3>연이의 해석</h3><ReadingPassage text={c.interpretation}/></div>
   <div className={styles.readingVoice}><h3>네오의 해결책</h3><ReadingPassage text={c.strategy}/></div>
   {c.checkpoints?.length?<aside className={styles.actionList}><h3>실천 점검</h3><ul>{c.checkpoints.map((line,i)=><li key={i}>{line}</li>)}</ul></aside>:null}
   <nav className={styles.chapterLinks} aria-label={`${c.title} 읽기 이동`}><a href="#report-contents">차례로</a>{report.chapters[index+1]&&<a href={`#chapter-${report.chapters[index+1].key}`}>다음 장으로</a>}</nav>
  </article>)}
  <p>{report.analysis.limitation}</p>{report.analysis.uncertainty.map(line=><p key={line}>{line}</p>)}<a href="/records/">내 보관함</a>
 </section>;
}
