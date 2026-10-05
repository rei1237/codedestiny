"use client";
import {SKY_IMAGE,skyShare} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import {useState} from 'react';
import {SPIRIT_IMAGE,buildSpiritShare} from '@/worker/yeongnyangi/fortune/spirit-contract';
import {fortuneApi,FortuneApiError,type FortuneRecord} from '../_lib/api';
import {questionSkyCopyFor,questionSkyTopicFor,spiritExtraCopy} from '../_lib/question-sky-copy';
import {resultShareUrl} from '../_lib/result-share';
import styles from '../yeongnyangi.module.css';

import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {symbolicCityName} from '../_lib/symbolic-locales';
const moodAssets={mystic:'/assets/yeongnyangi/spirit/drum.webp',focus:'/assets/yeongnyangi/moods/ponder.webp',sure:'/assets/yeongnyangi/moods/beam.webp',warm:'/assets/yeongnyangi/moods/blanket.webp',wink:'/assets/yeongnyangi/moods/wink.webp'} as const;
type Mood=keyof typeof moodAssets;
function MoodImage({mood,locale}:{mood?:string;locale:ReadingLocale}){
  const copy=questionSkyCopyFor(locale).result;
  if(!mood||!(mood in moodAssets))return null;
  return <figure className={styles.spiritMood}><img src={moodAssets[mood as Mood]} width={360} height={300} loading="lazy" alt={copy.moodAlt}/></figure>;
}

export default function SpiritResult({row,onRow}:{row:FortuneRecord;onRow:(next:FortuneRecord)=>void}){
  const locale=row.locale||'ko';
  const [message,setMessage]=useState('');
  const [followup,setFollowup]=useState('');
  const [busy,setBusy]=useState(false);
  const sky=row.consultation?.questionSky;
  const spirit=sky||row.consultation?.spirit;
  const copy=questionSkyCopyFor(locale).result;
  const primary=row.chapters[0];
  const isTwoStage=Boolean(row.followup);
  async function share(){
    const spiritShare={...(locale==='ko'?(sky?skyShare(sky.mode,sky.shareKey):buildSpiritShare(spirit?.shareKey)):{title:copy.title,text:questionSkyCopyFor(locale).input.description}),url:resultShareUrl(row,typeof navigator.share==='function'?'native':'copy')};
    try{if(navigator.share){await navigator.share(spiritShare);setMessage(copy.shareDone);}else {await navigator.clipboard.writeText(`${spiritShare.title}\n${spiritShare.text}\n${spiritShare.url}`);setMessage(copy.shareCopied);}}catch(error){setMessage(error instanceof Error&&error.name==='AbortError'?copy.shareCancelled:copy.shareError);}
  }
  async function submitFollowup(event:React.FormEvent){
    event.preventDefault();if(busy)return;
    setBusy(true);setMessage('');
    try{const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}/follow-up`,{question:followup});onRow(fortune);}
    catch(error){setMessage(error instanceof FortuneApiError?copy.errors[error.code as keyof typeof copy.errors]||(locale==='ko'?error.message:copy.errors.FOLLOWUP_NOT_AVAILABLE):copy.errors.FOLLOWUP_NOT_AVAILABLE);}
    finally{setBusy(false);}
  }
  if(!spirit)return null;
  const stageStatus=row.state==='COMPLETED'?copy.complete:row.state==='AWAITING_FOLLOWUP'?copy.awaiting:row.chapters.length<1?copy.saving:copy.deepening;
  return <div lang={locale} className={styles.spirit}>
    <header className={styles.spiritIntro}><img src={sky?SKY_IMAGE:SPIRIT_IMAGE} width={303} height={320} alt={copy.moodAlt}/><div><h1>{sky&&isTwoStage?copy.title:sky?sky.mode==='prashna-v1'?copy.title:questionSkyCopyFor(locale).input.horaryTitle:copy.title}</h1><p>{primary?.summary||copy.saving}</p></div></header>
    {sky&&isTwoStage&&<section className={styles.questionContext}><h2>{copy.questionLabel}</h2><p>{row.consultation?.question}</p></section>}
    <p>{copy.consultedAt}: {new Date(spirit.askedAt).toLocaleString(locale,{timeZone:row.consultation?.timezone||'Asia/Seoul'})} · {row.consultation?.timezone}</p>
    {sky&&<p>{copy.region}: {symbolicCityName(sky.cityName,locale)||copy.regionSuffix} · {copy.regionSuffix}</p>}
    <p>{locale==='ko'?row.consultation?.topicLabel:questionSkyTopicFor(row.consultation?.topicId||'general',locale)} · {spirit.relationship}</p>
    {row.state!=='REFUNDED'&&<>
      <p role="status">{stageStatus} · {row.chapters.length}/{row.manifest.length} {spiritExtraCopy(locale).saved}</p>
      <progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label={copy.progress}/>
      {row.chapters.map((chapter,index)=><article className={styles.chapter} key={row.manifest[index].id}>
        {index===0&&<MoodImage locale={locale} mood={chapter.visualSlots?.opening}/>}<h2>{chapter.title||(locale==='ko'?row.manifest[index].title:copy.answerLabel)}</h2>
        {index===0&&<MoodImage locale={locale} mood={chapter.visualSlots?.verdict}/>} {index===1&&<MoodImage locale={locale} mood={chapter.visualSlots?.followup}/>}
        {chapter.questionAnswers?.map(answer=><section key={answer.questionId}><h3>{copy.answerLabel}</h3><p>{answer.answer}</p><p>{answer.reason}</p><p>{answer.timing}</p><p>{answer.action}</p></section>)}
        {chapter.blocks?.map((block,i)=><section key={i}><h3>{block.title}</h3>{block.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>)}
        <p>{chapter.example}</p><p>{chapter.advice}</p>{index===0&&<><p>{chapter.persona}</p><MoodImage locale={locale} mood={chapter.visualSlots?.closing}/></>}
      </article>)}
      {isTwoStage&&row.state==='AWAITING_FOLLOWUP'&&row.followup?.status==='available'&&<section className={styles.followupPanel}><h2>{copy.followupTitle}</h2><p>{copy.followupDescription}</p><div className={styles.followupChips}>{row.followup.suggestions.map(suggestion=><button type="button" key={suggestion} onClick={()=>setFollowup(suggestion)}>{suggestion}</button>)}</div><form onSubmit={submitFollowup}><label htmlFor="sky-followup">{copy.followupTitle}</label><textarea id="sky-followup" required minLength={5} maxLength={600} rows={3} value={followup} onChange={event=>setFollowup(event.target.value)} placeholder={copy.followupPlaceholder}/><button type="submit" disabled={busy}>{busy?copy.followupBusy:copy.followupSubmit}</button></form>{message&&<p role="alert">{message}</p>}</section>}
      {isTwoStage&&row.followup?.used&&row.state==='COMPLETED'&&<p role="status">{copy.followupUsed}</p>}
      {row.state==='COMPLETED'&&<section className={styles.chapter}><h2>{copy.finalTitle}</h2><p>{row.chapters.at(-1)?.persona}</p><button onClick={()=>void share()}>{copy.share}</button>{message&&<p role="status">{message}</p>}</section>}
    </>}
    <p>{questionSkyCopyFor(locale).input.notice}</p><nav className={styles.spiritLinks} aria-label={copy.noticeNavigation}><a href={`/yeongnyangi/library/?lang=${locale}`}>{copy.library}</a><a href={`/yeongnyangi/fortune/?mode=spirit&lang=${locale}`}>{copy.newReading}</a></nav>
  </div>;
}
