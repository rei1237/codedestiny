"use client";
import { useState } from 'react';
import { authFetch } from '@/app/_lib/auth-client';
import { asRecord as object, asList as list, storedText as text } from '@/lib/records/reading-content';
import { SavedText } from './SavedReadingParts';
import styles from './SavedSibylReading.module.css';

export default function SavedSibylReading({value}:{value:unknown}) {
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const report=object(value); const analysis=object(report.analysis);
  async function resume() {
    if(busy) return;
    setBusy(true);setMessage('');
    try {
      const response=await authFetch('/api/sibyl/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:report.profileId,year:report.year})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.message || '생성을 이어 가지 못했어요. 잠시 후 다시 시도해 주세요.');
      if(response.status===202) setMessage('같은 리포트를 준비하고 있어요. 잠시 후 진행 상태를 확인해 주세요.');
      else window.location.reload();
    } catch(error) {setMessage(error instanceof Error?error.message:'연결을 확인하고 다시 시도해 주세요.');}
    finally {setBusy(false);}
  }
  if(!list(report.chapters).length) return <section className={styles.report}><h2>{text(report.title)}</h2><p>아직 저장이 완료되지 않았어요. 기존 구매 권한으로 같은 연도의 생성을 이어 갈 수 있습니다.</p>{text(report.profileId)&&<button type="button" disabled={busy} onClick={()=>void resume()}>{busy?'진행 상태 확인 중':'리포트 이어서 확인하기'}</button>}<p role="status">{message}</p></section>;
  const domains=list(analysis.domains).map(object);
  return <article className={styles.report}>
    <img src="/images/feature-details/saju-sibyl-observatory.webp" width={1200} height={675} alt="시빌라의 사주와 시간 관측실" />
    <header><p>{text(report.profileLabel)}</p><h2>{text(report.title)}</h2><p className={styles.summary}>{text(analysis.summary)}</p><p>{text(analysis.period)}</p></header>
    <p className={styles.note}>{text(analysis.limitation)} {list(analysis.uncertainty).map(text).join(' ')}</p>
    <nav aria-label="분야별 목차">{domains.map(d=><a key={text(d.id)} href={'#saved-sibyl-'+text(d.id)}>{text(d.title)}</a>)}</nav>
    <h3>타고난 장점과 그림자</h3>
    {list(object(analysis.natal).traits).map((raw,i)=>{const t=object(raw);return <section key={i}><h4>{text(t.strength)}</h4><p>{text(t.caution)}</p><p>{text(t.action)}</p></section>;})}
    <h3>주의 시기 타임라인</h3><ol className={styles.timeline}>{list(analysis.months).map((raw,i)=>{const m=object(raw);return <li key={i}><strong>{text(m.label)}</strong><span>{text(m.start)}부터</span><span>{list(m.tensions).map(t=>text(object(t).label)).join(' · ') || '뚜렷한 충형파해 신호 없음'}</span></li>;})}</ol>
    {domains.map(d=><section key={text(d.id)} id={'saved-sibyl-'+text(d.id)}><h3>{text(d.title)}</h3><p className={styles.summary}>{text(d.caution)}</p><p>{list(d.periods).length===12?'연중 비슷한 주의 수준':list(d.periods).map(p=>text(object(p).label)).join(' · ')}</p><h4>생활에서 확인할 징후</h4><p>{text(d.sign)}</p><h4>대비와 개운 행동</h4><p>{text(d.action)}</p><h4>판단을 바꿀 조건</h4><p>{text(d.change)}</p><details><summary>계산 근거 확인하기</summary>{list(d.reasons).map((raw,i)=>{const r=object(raw);return <p key={i}>{text(r.text)}{list(r.supports).length>0 && ' · 조율 신호 '+list(r.supports).map(text).join(' · ')}</p>;})}<p>{text(d.balancedNote)}</p></details></section>)}
    <h3>당신을 위한 심층 상담</h3>{list(report.chapters).map((raw,i)=>{const c=object(raw);return <section key={i}><h3>{text(c.title)}</h3><SavedText text={text(c.content)}/></section>;})}
    <footer>저장된 원본입니다. 다시 열 때 추가 결제나 생성이 필요하지 않아요.</footer>
  </article>;
}
