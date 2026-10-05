"use client";
import {useEffect,useRef,useState} from 'react';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {SPIRIT_MODE,SPIRIT_IMAGE,spiritTopics,type SpiritTopic} from '@/worker/yeongnyangi/fortune/spirit-contract';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import {useProfiles} from '../_lib/use-profiles';
import ProfilePicker from './ProfilePicker';
import styles from '../yeongnyangi.module.css';
import {useReadingLanguage,readingPrice} from '../_lib/use-reading-language';
import {readingLocale,readingLocales} from '@/worker/yeongnyangi/fortune/reading-locale';
import {questionSkyCopyFor,questionSkyTopicFor,spiritExtraCopy} from '../_lib/question-sky-copy';
import {consultationLocaleCopy} from '../_lib/consultation-locale-copy';
import ReadingLanguageSelect from './ReadingLanguageSelect';
const draftKey='yeongnyangi:spirit-draft';
export default function SpiritConsultation(){
  const {locale,setLocale,siteLocale,fallback}=useReadingLanguage();
  const copy=questionSkyCopyFor(siteLocale).input,extra=spiritExtraCopy(siteLocale),common=consultationLocaleCopy(siteLocale);
  const state=useProfiles(),{profileId,guest}=state;
  const product=products.find(p=>p.id==='saju_mackerel')!;
  const [question,setQuestion]=useState(''),[relationship,setRelationship]=useState(''),[situation,setSituation]=useState('');
  const [topic,setTopic]=useState<SpiritTopic>('space'),[boundary,setBoundary]=useState(false),[timeUnknown,setTimeUnknown]=useState(false);
  const [available,setAvailable]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  const consultationAttemptId=useRef('');
  useEffect(()=>{
    let active=true;
    fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(r=>{if(active)setAvailable(r.products.some(p=>p.id===product.id&&p.available));}).catch(()=>{if(active)setError(copy.availabilityError);}).finally(()=>{if(active)setReady(true);});
    try{const d=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d&&Date.now()-d.at<3600000){setQuestion(String(d.question||'').slice(0,1000));setRelationship(String(d.relationship||'').slice(0,80));setSituation(String(d.situation||'').slice(0,600));if(Object.hasOwn(spiritTopics,d.topic))setTopic(d.topic);setBoundary(d.boundary===true);setTimeUnknown(d.timeUnknown===true);if(readingLocales.includes(d.locale))setLocale(readingLocale(d.locale));}}catch{/* Optional pre-login draft. */}
    return()=>{active=false;};
  },[product.id,copy.availabilityError]);
  function login(){try{sessionStorage.setItem(draftKey,JSON.stringify({locale,question,relationship,situation,topic,boundary,timeUnknown,at:Date.now()}));}catch{/* Server owns submitted input. */}loginForCurrentPage();}
  async function prepare(){
    if(lock.current)return;if(guest){login();return;}
    if(!profileId||!question.trim()||!relationship){setError(copy.validation);return;}
    lock.current=true;setBusy(true);setError('');
    try{
      if(!consultationAttemptId.current)consultationAttemptId.current=crypto.randomUUID();
      const {fortune}=await fortuneApi<{fortune:FortuneRecord}>('requests',{locale,consultationAttemptId:consultationAttemptId.current,mode:SPIRIT_MODE,productId:product.id,profileId,timeUnknown,question,topicId:'relationship',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul',spirit:{relationship,situation,topic,boundary}});
      try{sessionStorage.removeItem(draftKey);}catch{/* Submitted input is durable. */}
      consultationAttemptId.current='';
      window.location.assign(fortune.paid?resultPath(fortune.id,siteLocale):checkoutPath(fortune,siteLocale));
    }catch(e){if(e instanceof FortuneApiError&&e.status===401)login();else setError(siteLocale==='ko'&&e instanceof Error?e.message:copy.initialError);}
    finally{lock.current=false;setBusy(false);}
  }
  return <section lang={siteLocale} className={`${styles.consultation} ${styles.spirit}`}>
    <header className={styles.spiritIntro}><img src={SPIRIT_IMAGE} width={303} height={320} alt={copy.imageAlt}/><div><h1>{copy.title}</h1><p>{extra.spiritIntro}</p></div></header>
    <p>{copy.notice}</p>
    <p>{extra.spiritScope}</p>
    <div className={styles.form}>
      <label htmlFor="spirit-question">{copy.questionLabel}</label><textarea id="spirit-question" required rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={copy.questionPlaceholder}/>
      <label htmlFor="spirit-relationship">{copy.relationshipLabel}</label><select id="spirit-relationship" required value={relationship} onChange={e=>setRelationship(e.target.value)}><option value="">{extra.relationshipPick}</option>{copy.relationships.map(v=><option key={v}>{v}</option>)}</select>
      <label htmlFor="spirit-topic">{copy.topicLabel}</label><select id="spirit-topic" value={topic} onChange={e=>setTopic(e.target.value as SpiritTopic)}>{Object.keys(spiritTopics).map(id=><option value={id} key={id}>{questionSkyTopicFor(id,siteLocale)}</option>)}</select>
      <p>{copy.topicHelp}</p>
      <label htmlFor="spirit-situation">{copy.situationLabel}</label><textarea id="spirit-situation" rows={3} maxLength={600} value={situation} onChange={e=>setSituation(e.target.value)} placeholder={copy.situationPlaceholder}/>
      <label><input type="checkbox" checked={boundary} onChange={e=>setBoundary(e.target.checked)}/> {copy.boundaryLabel}</label>
      <h2>{common.profile}</h2><p>{extra.birthIntro}</p>
      <ProfilePicker state={state} locale={siteLocale}/>
      <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> {extra.birthUnknown}</label>
      <p>{extra.birthTiming}</p><ReadingLanguageSelect locale={locale} siteLocale={siteLocale} onChange={setLocale} fallback={fallback} disabled={busy}/>
      <div className={styles.checkoutSection}><h2>{copy.checkoutTitle}</h2><p>{copy.title} · {product.chapterCount} {common.chapters}</p><strong>{readingPrice(product.priceKRW,siteLocale)} · {copy.paidPrice}</strong><p>{copy.notice}</p>
        <button type="button" onClick={()=>void prepare()} disabled={busy||(!guest&&(!ready||!available||!profileId))}>{busy?copy.busy:guest?extra.login:copy.submit}</button>
        {!ready&&<p role="status">{copy.preparing}</p>}{ready&&!available&&<p>{copy.unavailable}</p>}
        {error&&<p role="alert">{error}</p>}
      </div>
    </div>
    <nav className={styles.spiritLinks} aria-label={copy.navigation}><a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a><a href={`/yeongnyangi/fortune/?lang=${siteLocale}`}>{copy.other}</a></nav>
  </section>;
}
