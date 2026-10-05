"use client";
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import FreePromptContinuation from '@/app/components/FreePromptContinuation';
import type {FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
import {useEffect,useRef,useState} from 'react';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {questionCities,skyTopics,SKY_IMAGE,type SkyMode} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import {questionSkyCopyFor,questionSkyTopicFor,spiritExtraCopy} from '../_lib/question-sky-copy';
import styles from '../yeongnyangi.module.css';
import {useReadingLanguage,readingPrice} from '../_lib/use-reading-language';
import {readingLocale,readingLocales} from '@/worker/yeongnyangi/fortune/reading-locale';
import {symbolicCityName} from '../_lib/symbolic-locales';
import {readingLocationCopy} from '../_lib/current-location-copy';
import ReadingLanguageSelect from './ReadingLanguageSelect';
export default function QuestionSkyConsultation({mode}:{mode:SkyMode}){
  const {locale,setLocale,siteLocale,fallback}=useReadingLanguage();
  const copy=questionSkyCopyFor(siteLocale).input,extra=spiritExtraCopy(siteLocale);
  const locationCopy=readingLocationCopy(siteLocale);
  const free=mode==='horary-v1';
  const product=products.find(p=>p.id==='saju_flounder')!;
  const [location,setLocation]=useState<CurrentLocation|null>(null),[reading,setReading]=useState<FreeReading|null>(null);
  const [question,setQuestion]=useState(''),[relationship,setRelationship]=useState(''),[situation,setSituation]=useState('');
  const [topic,setTopic]=useState<keyof typeof skyTopics>('relationship'),[boundary,setBoundary]=useState(false);
  const [cityId,setCityId]=useState(''),[localTime,setLocalTime]=useState('');
  const [available,setAvailable]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),draftKey=`yeongnyangi:question-sky:${mode}`;
  const consultationAttemptId=useRef('');
  useEffect(()=>{
    let active=true;
    if(free){setAvailable(true);setReady(true);}else fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(r=>{if(active)setAvailable(r.products.some(p=>p.id===product.id&&p.available));}).catch(()=>{if(active)setError(copy.availabilityError);}).finally(()=>{if(active)setReady(true);});
    try{const d=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d&&Date.now()-d.at<3600000){setQuestion(String(d.question||'').slice(0,1000));setRelationship(String(d.relationship||''));setSituation(String(d.situation||'').slice(0,600));if(Object.hasOwn(skyTopics,d.topic))setTopic(d.topic);setBoundary(d.boundary===true);setCityId(String(d.cityId||''));setLocalTime(String(d.localTime||''));if(readingLocales.includes(d.locale))setLocale(readingLocale(d.locale));}}catch{/* Optional login draft. */}
    return()=>{active=false;};
  },[product.id,draftKey,free,copy.availabilityError]);
  async function prepare(event:React.FormEvent){
    event.preventDefault();if(lock.current)return;
    if(question.trim().length<5||question.split(/\n+|(?<=[?？])\s*/u).filter(value=>value.trim()).length!==1||(!cityId&&!location)||!localTime){setError(copy.validation);return;}
    lock.current=true;setBusy(true);setError('');
    const draft={locale,question,relationship,situation,topic,boundary,cityId,localTime,at:Date.now()};
    try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{/* Server owns submitted input. */}
    try{
      if(free){
        const {result}=await fortuneApi<{result:FreeReading}>('free/horary',{locale,question,questionSky:{relationship:relationship||copy.relationships[0],situation,topic,boundary,cityId,localTime,location:location||undefined}});
        setReading(result);try{sessionStorage.removeItem(draftKey);}catch{/* Optional draft only. */}return;
      }
      if(!consultationAttemptId.current)consultationAttemptId.current=crypto.randomUUID();
      const {fortune}=await fortuneApi<{fortune:FortuneRecord}>('requests',{locale,consultationAttemptId:consultationAttemptId.current,mode,productId:product.id,question,questionSky:{relationship:relationship||copy.relationships[0],situation,topic,boundary,cityId,localTime,location:location||undefined}});
      try{sessionStorage.removeItem(draftKey);}catch{/* Submitted input is durable. */}
      consultationAttemptId.current='';
      window.location.assign(fortune.paid?resultPath(fortune.id,siteLocale):checkoutPath(fortune,siteLocale));
    }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else setError(siteLocale==='ko'&&e instanceof Error?e.message:copy.initialError);}
    finally{lock.current=false;setBusy(false);}
  }
  return <section lang={siteLocale} className={`${styles.consultation} ${styles.spirit}`}>
    <header className={styles.spiritIntro}><img src={SKY_IMAGE} width={640} height={640} alt={copy.imageAlt}/><div><h1>{mode==='prashna-v1'?copy.title:copy.horaryTitle}</h1><p>{copy.intro}</p></div></header>
    <p>{copy.description}</p>
    <p>{copy.notice}</p>
    <form className={styles.form} onSubmit={prepare} onChange={()=>setReading(null)}>
      <label htmlFor="sky-question">{copy.questionLabel}</label><textarea id="sky-question" required minLength={5} rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={copy.questionPlaceholder}/>
      <label htmlFor="sky-topic">{copy.topicLabel}</label><select id="sky-topic" value={topic} onChange={e=>setTopic(e.target.value as keyof typeof skyTopics)}>{Object.keys(skyTopics).map(id=><option value={id} key={id}>{questionSkyTopicFor(id,siteLocale)}</option>)}</select>
      <p>{copy.topicHelp}</p>
      <label htmlFor="sky-relationship">{copy.relationshipLabel}</label><select id="sky-relationship" value={relationship||copy.relationships[0]} onChange={e=>setRelationship(e.target.value)}>{copy.relationships.map(v=><option key={v}>{v}</option>)}</select>
      <label htmlFor="sky-city">{copy.cityLabel}</label><select id="sky-city" required={!location} value={cityId} onChange={e=>{setCityId(e.target.value);setLocation(null);setReading(null);}}><option value="">{copy.cityPlaceholder}</option>{questionCities.map(c=><option value={c.id} key={c.id}>{symbolicCityName(c.name,siteLocale)}</option>)}</select>
      <CurrentLocationButton locale={siteLocale} translation={locationCopy?{...locationCopy,questionQuestion:copy.locationQuestion,questionApply:copy.locationApply}:undefined} purpose="question" disabled={busy} onLocation={value=>{setLocation(value);setCityId('');setReading(null);}}/>{location&&<p role="status">{copy.locationConfirmed} {location.timezone}</p>}<p>{copy.cityHelp}</p>
      <label htmlFor="sky-time">{copy.timeLabel}</label><input id="sky-time" type="datetime-local" required value={localTime} onChange={e=>setLocalTime(e.target.value)}/>
      <p>{copy.timeHelp}</p>
      <label htmlFor="sky-situation">{copy.situationLabel}</label><textarea id="sky-situation" rows={3} maxLength={600} value={situation} onChange={e=>setSituation(e.target.value)} placeholder={copy.situationPlaceholder}/>
      <label><input type="checkbox" checked={boundary} onChange={e=>setBoundary(e.target.checked)}/> {copy.boundaryLabel}</label>
      <ReadingLanguageSelect locale={locale} siteLocale={siteLocale} onChange={setLocale} fallback={fallback} disabled={busy}/><div className={styles.checkoutSection}><h2>{copy.checkoutTitle}</h2><p>{free?copy.freeSummary:copy.paidSummary}</p><strong>{free?copy.freePrice:`${readingPrice(product.priceKRW,siteLocale)} · ${copy.paidPrice}`}</strong><p>{copy.notice}</p>
        <button type="submit" disabled={busy||!ready||!available}>{busy?copy.busy:free?copy.freeSubmit:copy.submit}</button>
        {!ready&&<p role="status">{copy.preparing}</p>}{ready&&!available&&<p>{copy.unavailable}</p>}
        {error&&<p role="alert">{error}</p>}
      </div>
    </form>
    {reading&&<div><h2>{extra.freeDone}</h2>{reading.basis.map(item=><p key={item.label}>{item.label}: {item.value}</p>)}<FreePromptContinuation prompt={reading.prompt} locale={locale}/></div>}
    <nav className={styles.spiritLinks} aria-label={copy.navigation}><a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a><a href={`/yeongnyangi/fortune/?lang=${siteLocale}`}>{copy.other}</a></nav>
  </section>;
}
