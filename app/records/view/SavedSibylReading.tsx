"use client";
import { recordReaderCopy } from '@/lib/records/reader-copy';
import { useLocale } from '@/lib/i18n/useT';
import { useState } from 'react';
import { authFetch } from '@/app/_lib/auth-client';
import { asRecord as object, asList as list, storedText as text } from '@/lib/records/reading-content';
import { SavedText } from './SavedReadingParts';
import styles from './SavedSibylReading.module.css';

export default function SavedSibylReading({value}:{value:unknown}) {
  const copy=recordReaderCopy(useLocale());
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const report=object(value); const analysis=object(report.analysis);
  async function resume() {
    if(busy) return;
    setBusy(true);setMessage('');
    try {
      const response=await authFetch('/api/sibyl/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:report.profileId,year:report.year})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.message || copy.resumeError);
      if(response.status===202) setMessage(copy.resumePending);
      else window.location.reload();
    } catch(error) {setMessage(error instanceof Error?error.message:copy.connectionError);}
    finally {setBusy(false);}
  }
  if(!list(report.chapters).length) return <section className={styles.report}><h2>{text(report.title)}</h2><p>{copy.incomplete}</p>{text(report.profileId)&&<button type="button" disabled={busy} onClick={()=>void resume()}>{busy?copy.checking:copy.resume}</button>}<p role="status">{message}</p></section>;
  const domains=list(analysis.domains).map(object);
  return <article className={styles.report}>
    <img src="/images/feature-details/saju-sibyl-observatory.webp" width={1200} height={675} alt={copy.observatory} />
    <header><p>{text(report.profileLabel)}</p><h2>{text(report.title)}</h2><p className={styles.summary}>{text(analysis.summary)}</p><p>{text(analysis.period)}</p></header>
    <p className={styles.note}>{text(analysis.limitation)} {list(analysis.uncertainty).map(text).join(' ')}</p>
    <nav aria-label={copy.domains}>{domains.map(d=><a key={text(d.id)} href={'#saved-sibyl-'+text(d.id)}>{text(d.title)}</a>)}</nav>
    <h3>{copy.traits}</h3>
    {list(object(analysis.natal).traits).map((raw,i)=>{const t=object(raw);return <section key={i}><h4>{text(t.strength)}</h4><p>{text(t.caution)}</p><p>{text(t.action)}</p></section>;})}
    <h3>{copy.timeline}</h3><ol className={styles.timeline}>{list(analysis.months).map((raw,i)=>{const m=object(raw);return <li key={i}><strong>{text(m.label)}</strong><span>{copy.from.replace('{date}',text(m.start))}</span><span>{list(m.tensions).map(t=>text(object(t).label)).join(' · ') || copy.noTensions}</span></li>;})}</ol>
    {domains.map(d=><section key={text(d.id)} id={'saved-sibyl-'+text(d.id)}><h3>{text(d.title)}</h3><p className={styles.summary}>{text(d.caution)}</p><p>{list(d.periods).length===12?copy.steadyCaution:list(d.periods).map(p=>text(object(p).label)).join(' · ')}</p><h4>{copy.signs}</h4><p>{text(d.sign)}</p><h4>{copy.actions}</h4><p>{text(d.action)}</p><h4>{copy.change}</h4><p>{text(d.change)}</p><details><summary>{copy.evidence}</summary>{list(d.reasons).map((raw,i)=>{const r=object(raw);return <p key={i}>{text(r.text)}{list(r.supports).length>0 && ' · '+copy.support+' '+list(r.supports).map(text).join(' · ')}</p>;})}<p>{text(d.balancedNote)}</p></details></section>)}
    <h3>{copy.consultation}</h3>{list(report.chapters).map((raw,i)=>{const c=object(raw);return <section key={i}><h3>{text(c.title)}</h3><SavedText text={text(c.content)}/></section>;})}
    <footer>{copy.original}</footer>
  </article>;
}
