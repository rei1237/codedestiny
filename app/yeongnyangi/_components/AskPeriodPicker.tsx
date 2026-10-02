'use client';
import {ASK_PERIOD_CHIPS,applyAskPeriodChip,formatAskRange,resolveAskPeriods} from '@/worker/yeongnyangi/fortune/ask/period';
import {consultationClock,resolveQuestionYears} from '@/worker/yeongnyangi/fortune/consultation';
import {askPeriodInputCopy as copy} from '../_lib/ask-phase5-copy';
import styles from '../yeongnyangi.module.css';

/**
 * Korean ask input: period chips write their phrase into the question, and the preview shows the absolute
 * dates the server will resolve from the same text, in the same browser timezone the request sends.
 * Nothing here is sent on its own; the question text stays the only input.
 */
export default function AskPeriodPicker({question,onQuestion,disabled}:{question:string;onQuestion:(next:string)=>void;disabled?:boolean}){
 const lead=question.replace(/\s/g,'');
 const ranges=question.trim()?resolveAskPeriods(question,consultationClock(Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul').asOf,resolveQuestionYears):[];
 return <div className={styles.askPeriod}>
  <div className={styles.periodChips} role="group" aria-label={copy.chips}>{ASK_PERIOD_CHIPS.map(chip=><button type="button" key={chip} aria-pressed={lead.startsWith(chip.replace(' ',''))} disabled={disabled} onClick={()=>onQuestion(applyAskPeriodChip(question,chip).slice(0,1000))}>{chip}</button>)}</div>
  <p className={styles.periodHint}>{copy.hint}</p>
  {ranges.length>0&&<p className={styles.periodPreview} role="status"><strong>{copy.preview}</strong> {ranges.map((r,i)=><span key={r.start+r.scale}>{i>0&&' · '}<span className={styles.periodLabel}>{r.label}</span> {formatAskRange(r)}</span>)}</p>}
  {ranges.length>1&&<p className={styles.periodConflict} role="note">{copy.conflict(ranges.map(r=>r.label).join('·'))}</p>}
 </div>;
}
