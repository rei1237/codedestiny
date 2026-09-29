"use client";
import {getQuestionGuide} from "@/lib/fortune/question-journey";
import {consultationKinds,consultationDomain,supportsKind,consultationManifest} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import {consultationTitle,fusionDescription} from '../_lib/consultation-copy';
import {getFortuneCopy} from '../_lib/product-curiosity';
import {readingFeatures} from './ReadingIdentity';
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {readingLocationCopy} from '../_lib/current-location-copy';
import {useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {products,systemNames,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions,policyForReading} from '@/worker/yeongnyangi/fortune/reading-policy';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import ProfilePicker from './ProfilePicker';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import styles from '../yeongnyangi.module.css';
import predictionRecords from '@/lib/brand/prediction-records.json';
import {predictionTimeline} from '@/lib/brand/prediction-timeline';
import {trackEvent} from '@/lib/analytics';
import {readingLocale,readingLocales,readingLanguageNames} from '@/worker/yeongnyangi/fortune/reading-locale';
import ReadingLanguageSelect from './ReadingLanguageSelect';
import {useReadingLanguage,browserReadingContext,readingPrice} from '../_lib/use-reading-language';
import {consultationLocaleCopy,localizedSystem,localizedKind,localizedTier} from '../_lib/consultation-locale-copy';
import {questionSkyCopyFor} from '../_lib/question-sky-copy';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import {v7Label,v7PartHead} from '../_lib/reading-v7-copy';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
import {jongCheckCopy} from '../_lib/jong-check-copy';
import {jongCheckApplies} from '@/worker/yeongnyangi/fortune/saju/jong-check-policy';
import type {JongCheck,JongReply} from '@/worker/yeongnyangi/fortune/saju/jong-check';
const loginDraftKey='yeongnyangi:consultation-login-draft';
const predictionProofRecords=predictionRecords.map(record=>{
 const entry=predictionTimeline[record.url];
 if(!entry) throw new Error(`prediction-timeline missing ${record.url}`);
 return {...record,...entry};
});
export default function Consultation(){
 const {locale,setLocale,siteLocale,fallback}=useReadingLanguage();
 const ui=consultationLocaleCopy(siteLocale);
 const kindLabel=(id:string)=>siteLocale==='ko'?consultationKinds[domain].find(k=>k.id===id)?.label||localizedKind(id,siteLocale):localizedKind(id,siteLocale);
 const tierLabel=(item:Product)=>siteLocale==='ko'?(item.readingKind==='single'?item.fishName:consultationTitle(item)):item.readingKind==='single'?localizedTier(item.fishId,siteLocale):item.systems.map(id=>localizedSystem(id,siteLocale)).join(' + ');
 const price=(amount:number)=>readingPrice(amount,siteLocale);
 const [kindId,setKindId]=useState('personal');
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[catalogError,setCatalogError]=useState('');
 const profileState=useProfiles(),{profiles,profileId,guest}=profileState;
 const [partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const [jong,setJong]=useState<{key:string;loading:boolean;check:JongCheck|null}>({key:'',loading:false,check:null});
 const [jongReply,setJongReply]=useState<{best?:JongReply;worst?:JongReply}>({});
 const partnerProfile=profiles.find(p=>profileKey(p)===partnerId);
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const consultationAttemptId=useRef('');
 const viewedProduct=useRef('');
 const restoredDraft=useRef<{profileId?:string;partnerId?:string;extraTime?:string;extraPlace?:string;timeUnknown?:boolean}|null>(null);
 const product=products.find(p=>p.id===productId)!;
 const inputCopy=consultationInputCopy(siteLocale),jongCopy=jongCheckCopy(siteLocale);
 useEffect(()=>{
  if(!ready||viewedProduct.current===product.id)return;
  viewedProduct.current=product.id;
  trackEvent('view_item',{currency:product.currency,value:product.priceKRW,items:[{item_id:product.cdFeatureKey,item_name:product.name,price:product.priceKRW}],service:'yeongnyangi'});
 },[ready,product]);
 const kind=consultationKinds[domain].find(k=>k.id===kindId)||consultationKinds[domain][0];
 const systemCopy=domain==='fusion'?null:getFortuneCopy(domain as 'saju'|'ziwei'|'sukuyo'|'vedic'|'astrology'|'tarot',kind.id);
 const spiritEntryCopy=questionSkyCopyFor().entry;
 const askCopy=askPhase5Copy(siteLocale).input;
 const preview=consultationManifest(product,kind,topicId);
 // v7 sets the length per chapter, so the book target is the manifest sum. v6 has no per-chapter target in the
 // selector, so it keeps the tier policy range. partKey marks a v7 manifest (book-contracts.ts).
 const targetRange=(item:Product)=>{
  const rows=consultationManifest(item,kind,topicId);
  const target=rows.some(row=>row.partKey)
   ?[0,1].map(i=>rows.reduce((sum,row)=>sum+(row.targetChars?.[i]||0),0))
   :policyForReading(item.fishId,item.manifestVersion).target;
  return target.map(n=>n.toLocaleString(siteLocale)).join('~');
 };
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain).filter(p=>supportsKind(p,kind));
 const tarotOnly=product.domain==='tarot'&&product.readingKind==='single';
 const premium=['flounder','tuna'].includes(product.fishId);
 const needsTime=premium||product.systems.some(id=>!['saju','tarot'].includes(id));
 const needsPlace=premium||product.systems.some(id=>['vedic','astrology','sukuyo'].includes(id));
 // Premium saju tiers test a possible 종격 against past years before payment. The key is the birth input the
 // server reads; the server drops the answer if its years differ at prepare, so a stale check cannot misread.
 const jongKey=!guest&&selectedProfile&&jongCheckApplies(product)&&!timeUnknown&&!(selectedProfile.birth?.timeUnknown&&!extraTime)?JSON.stringify([profileId,extraTime,currentLocation?.latitude,currentLocation?.longitude]):'';
 const jongPending=Boolean(jongKey)&&(jong.key!==jongKey||jong.loading);
 const jongCheck=!jongPending&&jongKey?jong.check:null;
 const missing=!tarotOnly&&!guest?[
  ...(kind.partner&&partnerProfile&&premium&&(partnerProfile.birth?.timeUnknown||!partnerProfile.location?.label||!partnerProfile.gender)?[inputCopy.partnerDetails]:[]),
  ...(kind.partner&&!partnerId?[inputCopy.partnerRequired]:[]),
  ...(!selectedProfile?[inputCopy.profileRequired]:[]),
  ...(selectedProfile&&needsTime&&(timeUnknown||(selectedProfile.birth?.timeUnknown&&!extraTime))?[inputCopy.timeRequired]:[]),
  ...(selectedProfile&&needsPlace&&!selectedProfile.location?.label&&!extraPlace.trim()&&!currentLocation?[inputCopy.placeRequired]:[]),
  ...(jongPending?[jongCopy.checking]:[]),
  ...(jongCheck&&(!jongReply.best||!jongReply.worst)?[jongCopy.required]:[]),
 ]:[];
 if(kind.question&&!question.trim()&&!guest)missing.push(askCopy.required);
 useEffect(()=>{if(restoredDraft.current)return;setExtraTime('');setExtraPlace('');setCurrentLocation(null);setTimeUnknown(false);setError('');},[profileId]);
 useEffect(()=>{
  if(!jongKey)return;
  const controller=new AbortController();
  setJong({key:jongKey,loading:true,check:null});setJongReply({});
  fortuneApi<{check:JongCheck|null}>('saju/jong-check',{productId,profileId,timeUnknown,birthDetails:{birthTime:extraTime,birthPlace:currentLocation?{name:currentLocation.name,latitude:currentLocation.latitude,longitude:currentLocation.longitude,timezone:currentLocation.timezone}:undefined},timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'},{signal:controller.signal,timeoutMs:8000})
   .then(data=>setJong({key:jongKey,loading:false,check:data.check||null}))
   // A failed check never blocks payment: no question, and the reading keeps its conditional 종격 note.
   .catch(()=>{if(!controller.signal.aborted)setJong({key:jongKey,loading:false,check:null});});
  return ()=>controller.abort();
 },[jongKey]);
 useEffect(()=>{if(!profileState.loading&&partnerId&&(partnerId===profileId||!profiles.some(p=>profileKey(p)===partnerId)))setPartnerId('');},[profileId,profiles,partnerId,profileState.loading]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  const selected=products.find(p=>p.id===params.get('product'))||(requested==='fusion'?products.find(p=>p.readingKind==='pair'):undefined)||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const nextDomain=consultationDomain(selected);
  const requestedKind=consultationKinds[nextDomain].find(k=>k.id===params.get('consultationKind'))||(params.get('topic')?consultationKinds[nextDomain].find(k=>k.id==='ask'):undefined)||consultationKinds[nextDomain][0];
  setKindId(requestedKind.id);
  const entryQuestion=getQuestionGuide(params.get("questionId"));
  if(entryQuestion&&entryQuestion.productId===selected.id&&entryQuestion.kind===requestedKind.id&&requestedKind.question)setQuestion(entryQuestion.question);
  if(!supportsKind(selected,requestedKind))setProductId(products.find(p=>consultationDomain(p)===nextDomain&&supportsKind(p,requestedKind))!.id);
  const requestedTopic=params.get('topic');
  if(requestedTopic && Object.hasOwn(topicCatalog,requestedTopic))setTopicId(requestedTopic);
  try{
   const draft=JSON.parse(sessionStorage.getItem(loginDraftKey)||'null');
   if(draft&&draft.path===window.location.pathname+window.location.search&&Date.now()-draft.savedAt<3600000){
    const savedProduct=products.find(p=>p.id===draft.productId);
    const savedDomain=savedProduct?consultationDomain(savedProduct):nextDomain;
    const savedKind=consultationKinds[savedDomain].find(k=>k.id===draft.consultationKind)||consultationKinds[savedDomain][0];
    if(savedProduct){setKindId(savedKind.id);setProductId(supportsKind(savedProduct,savedKind)?savedProduct.id:products.find(p=>consultationDomain(p)===savedDomain&&supportsKind(p,savedKind))!.id);setDomain(savedDomain);}
    restoredDraft.current=draft;
    if(readingLocales.includes(draft.locale))setLocale(readingLocale(draft.locale));
    if(typeof draft.extraTime==='string')setExtraTime(draft.extraTime);
    if(typeof draft.extraPlace==='string')setExtraPlace(draft.extraPlace);
    if(draft.topicId==='general'||Object.hasOwn(topicCatalog,draft.topicId))setTopicId(draft.topicId);
    if(typeof draft.question==='string')setQuestion(draft.question.slice(0,1000));
   }
  }catch{/* Login still works when browser storage is unavailable. */}
  let cancelled=false;
  fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(catalog=>{
   if(cancelled)return;
   setAvailable(catalog.products.filter(p=>p.available));
  }).catch(e=>{if(!cancelled)setCatalogError(e.message);}).finally(()=>{if(!cancelled)setReady(true);});
  return ()=>{cancelled=true;};
 },[]);
 useEffect(()=>{
  const draft=restoredDraft.current;if(!draft||profileState.loading)return;
  if(draft.profileId&&profiles.some(p=>profileKey(p)===draft.profileId)&&profileId!==draft.profileId){profileState.select(draft.profileId);return;}
  if(draft.partnerId&&profiles.some(p=>profileKey(p)===draft.partnerId))setPartnerId(draft.partnerId);
  setExtraTime(draft.extraTime||'');setExtraPlace(draft.extraPlace||'');setTimeUnknown(draft.timeUnknown===true);restoredDraft.current=null;
 },[profileId,profiles,profileState.loading,profileState.select]);
 function loginWithDraft(){
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({path:window.location.pathname+window.location.search,locale,productId,consultationKind:kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,savedAt:Date.now()}));}catch{/* Optional pre-login draft only; paid input is stored on the server. */}
  loginForCurrentPage();
 }
 async function prepare(){
  if(lock.current)return;
  trackEvent('purchase_attempt',{item_id:product.cdFeatureKey,value:product.priceKRW,currency:product.currency,login_required:guest,service:'yeongnyangi'});
  if(guest){loginWithDraft();return;}
  if(missing.length){setError(missing.join(' '));return;}
  lock.current=true;setBusy(true);setError('');
  try{
   let birthPlace=currentLocation?{name:currentLocation.name,latitude:currentLocation.latitude,longitude:currentLocation.longitude,timezone:currentLocation.timezone}:undefined;
   if(!currentLocation&&extraPlace.trim()&&!selectedProfile?.location?.label){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(extraPlace)}`);
    const found=await response.json();
    if(!response.ok||found.fallback)throw new Error(inputCopy.geocodeError);
    birthPlace={name:found.name,latitude:found.lat,longitude:found.lng,timezone:found.timezone};
   }
   if(!consultationAttemptId.current)consultationAttemptId.current=crypto.randomUUID();
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{locale,...browserReadingContext(siteLocale),consultationAttemptId:consultationAttemptId.current,birthDetails:{birthTime:extraTime,birthPlace},productId,consultationKind:kind.id,profileId,topicId:kind.id==='ask'?topicId:kind.topic,question:kind.question?question:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',timeUnknown,...(jongCheck&&jongReply.best&&jongReply.worst?{jongCheck:{best:jongReply.best,worst:jongReply.worst,bestYears:jongCheck.best.map(y=>y.year),worstYears:jongCheck.worst.map(y=>y.year)}}:{}),...(kind.partner&&partnerId?{partnerProfileId:partnerId}:{})});
   try{sessionStorage.removeItem(loginDraftKey);}catch{/* The server snapshot now owns the consultation input. */}
   trackEvent('consultation_start',{item_id:product.cdFeatureKey,service:'yeongnyangi'});
   consultationAttemptId.current='';
   window.location.assign(data.fortune.paid?resultPath(data.fortune.id,data.fortune.locale):checkoutPath(data.fortune));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginWithDraft();else setError(siteLocale!=='ko'?inputCopy.consultationError:e instanceof Error?e.message:inputCopy.consultationError);}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){const first=consultationKinds[next][0];setKindId(first.id);setTopicId('general');setQuestion('');setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 function chooseKind(id:string){const next=consultationKinds[domain].find(k=>k.id===id)!;setKindId(id);setPartnerId('');setError('');if(!supportsKind(product,next))setProductId(products.find(p=>consultationDomain(p)===domain&&supportsKind(p,next))!.id);}
 return <section className={`${styles.consultation} ${styles.consultationRoom}`}>
  <header className={styles.consultationHeader}><div><h1>{ui.title}</h1><p>{ui.intro}</p></div><Moon size={36} strokeWidth={1} aria-hidden="true"/></header>
  <ReadingLanguageSelect locale={locale} siteLocale={siteLocale} fallback={fallback} disabled={busy} onChange={value=>{setLocale(value);setError('');}}/>
  {siteLocale==='ko'&&<a className={styles.spiritEntry} href="/yeongnyangi/fortune/?mode=spirit"><img src="/assets/yeongnyangi/spirit/eastern-oracle.webp" width={64} height={68} alt=""/><span><strong>{spiritEntryCopy.title}</strong><br/>{spiritEntryCopy.description}</span></a>}
  <div className={styles.tabs} role="group" aria-label={ui.methodTitle}>{[...Object.keys(systemNames),'fusion'].map(id=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{localizedSystem(id,siteLocale)}</button>)}</div>
  <div className={styles.kindChoices} role="group" aria-label={ui.summary}>{consultationKinds[domain].map(item=><button key={item.id} aria-pressed={kind.id===item.id} onClick={()=>chooseKind(item.id)}><strong>{kindLabel(item.id)}</strong>{siteLocale==='ko'&&<span>{item.description}</span>}</button>)}</div>

  {siteLocale!=='ko'?<div className={styles.systemDescription}><strong>{localizedSystem(domain,siteLocale)}</strong><p>{ui.method}</p></div>:domain==='fusion'?<p className={styles.systemDescription}>{fusionDescription(product)||'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'}</p>:<div className={styles.systemDescription}><strong>{systemCopy?.cardTitle}</strong><p>{systemCopy?.description}</p><p>{systemCopy?.detail}</p></div>}
  {domain==='fusion'&&<p className={styles.systemDescription}>{ui.afterPayment}</p>}
  <div className={styles.consultationDesk}>
   <aside className={styles.consultationGuide} aria-label={ui.summary}>
    <img className={styles.guideCat} src="/assets/yeongnyangi/profiles/welcome.webp" width={168} height={171} alt="Yeongnyangi"/>
    <h2>{ui.guideTitle}</h2><p>{ui.guideIntro}</p>
    <dl className={styles.consultationSummary}><div><dt>{ui.summary}</dt><dd>{kindLabel(kind.id)} · {tierLabel(product)}</dd></div><div><dt>{ui.profile}</dt><dd>{tarotOnly?localizedSystem('tarot',siteLocale):selectedProfile?.name||inputCopy.pickerPrompt}</dd></div><div><dt>{ui.structure}</dt><dd>{preview.length} {ui.chapters}</dd></div><div><dt>{ui.methodTitle}</dt><dd>{siteLocale==='ko'?readingFeatures[domain]:localizedSystem(domain,siteLocale)}</dd></div><div><dt>{ui.paymentTitle}</dt><dd>{ui.payment} · {price(product.priceKRW)}</dd></div></dl>
    <p className={styles.guideNote}><Sparkles size={16} aria-hidden="true"/>{ui.about}</p>
    <details className={styles.predictionRecords}><summary><span className={styles.predictionRecordsSeal} aria-hidden="true">原</span><span><strong>{ui.trust}</strong><small>{ui.source}</small></span></summary><div className={styles.predictionRecordsBody}><figure className={styles.predictionRecordsArt}><img src="/assets/yeongnyangi/original/records-scroll-2d-480.webp" width={480} height={320} alt="" loading="lazy" decoding="async"/></figure><p>{ui.trustHint}</p><ol>{predictionProofRecords.map(record=><li key={record.url}><a href={record.url} target="_blank" rel="noopener noreferrer"><time dateTime={record.date}>{record.date}</time>{siteLocale==='ko'&&<><strong>{record.title}</strong><span>{record.after}</span></>}<em>{ui.source}</em></a></li>)}</ol></div></details>
   </aside>
   <div className={`${styles.form} ${styles.consultationForm}`}>
   {tarotOnly?<section className={styles.questionIntro} lang={siteLocale}><h2>{inputCopy.tarotHeading}</h2><p>{inputCopy.tarotIntro}</p>{guest&&<p>{inputCopy.loginHint}</p>}</section>:<>
    <ProfilePicker state={profileState} locale={siteLocale}/>
    {!guest&&selectedProfile&&<div className={styles.birthDetails}>
    <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> {inputCopy.timeUnknown}</label>
    {selectedProfile?.birth?.timeUnknown&&<label>{inputCopy.timeSupplement}<input type="time" value={extraTime} onChange={e=>setExtraTime(e.target.value)}/></label>}
    {selectedProfile&&!selectedProfile.location?.label&&<><CurrentLocationButton key={profileId} locale={siteLocale} translation={readingLocationCopy(siteLocale)} disabled={busy} onLocation={value=>{setCurrentLocation(value);setExtraPlace(value.name);}}/>{currentLocation&&<p role="status">{inputCopy.currentLocation} {currentLocation.timezone}</p>}<label>{inputCopy.placeSupplement}<input value={extraPlace} onChange={e=>{setExtraPlace(e.target.value);setCurrentLocation(null);}} placeholder={inputCopy.placePlaceholder} maxLength={120}/></label></>}
    {(selectedProfile?.birth?.timeUnknown||!selectedProfile.location?.label)&&<p>{inputCopy.supplementSaved}</p>}
    {kind.partner&&<label>{inputCopy.partner}<select value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">{inputCopy.partnerSelect}</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
    </div>}
    {jongCheck&&<section className={styles.jongCheck} aria-label={jongCopy.heading} lang={siteLocale}><h2>{jongCopy.heading}</h2><p>{jongCheck.kind==='strength'?jongCopy.strengthIntro:jongCopy.intro}</p>
    {(['best','worst'] as const).map(side=><fieldset key={side} disabled={busy}><legend>{jongCopy[side]}</legend><p className={styles.jongYears}>{jongCheck[side].map((y,i)=><span key={y.year}>{i>0&&' · '}<span className={styles.jongYear}>{jongCopy.year(y.year,y.ganji)}</span></span>)}</p>
     <div className={styles.jongReplies}>{(['yes','no','unsure'] as const).map(reply=><label key={reply}><input type="radio" name={`jong-${side}`} value={reply} checked={jongReply[side]===reply} onChange={()=>setJongReply(prev=>({...prev,[side]:reply}))}/>{jongCopy[reply]}</label>)}</div>
    </fieldset>)}
    </section>}
   </>}
   {kind.question&&<section className={styles.questionSection} aria-label={askCopy.heading} lang={siteLocale}><h2>{tarotOnly?inputCopy.tarotHeading:askCopy.heading}</h2><p>{askCopy.intro}</p>
   {kind.id==='ask'&&<><label htmlFor="consultation-topic">{askCopy.topic}</label><select id="consultation-topic" value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="general">{askCopy.general}</option>{Object.keys(topicCatalog).map(id=><option value={id} key={id}>{askCopy.topics[id as keyof typeof topicCatalog]}</option>)}</select></>}
   <label htmlFor="consultation-question">{askCopy.question}</label><textarea id="consultation-question" rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={askCopy.placeholder}/>
   </section>}
  <h2 className={styles.selectionHeading} lang={siteLocale}>{ui.depth}</h2>
  <p lang={siteLocale}>{ui.depthHint} {kind.question&&ui.questionHint}</p>
  <div className={`${styles.fishes} ${domain==='fusion'?styles.fusionChoices:''}`} role="group" aria-label={ui.depth}>{choices.map(item=><button key={item.id} onClick={()=>setProductId(item.id)} aria-pressed={productId===item.id}>
   <img src={siteLocale==='ko'?item.image:item.reactionAsset} alt="" width={240} height={108}/><strong>{tierLabel(item)}</strong><span className={styles.fishPrice}>{price(item.priceKRW)}</span><span className={styles.fishScope}>{consultationManifest(item,kind,topicId).length} {ui.chapters}{productId===item.id&&<b>{ui.selected}</b>}</span>{domain!=='fusion'&&<small>{targetRange(item)} {ui.target}</small>}{siteLocale==='ko'&&<small>{fusionDescription(item)||depthDescriptions[item.fishId]}</small>}
  </button>)}</div>
   <details className={styles.manifestPreview}><summary>{kindLabel(kind.id)} · {preview.length} {ui.chapters} · {ui.contents}</summary><ol>{preview.map((chapter,i)=>{
    const head=v7PartHead(preview,i,siteLocale);
    return <li key={chapter.id}>{head&&<b className={styles.partHeading}>{head}</b>}{v7Label(chapter.titleKey,siteLocale)||(siteLocale==='ko'?chapter.title:`${localizedKind(kind.id,siteLocale)} · ${i+1}`)}</li>;
   })}</ol></details>
   <div className={styles.checkoutSection}><div className={styles.checkoutTotal}><span>{tierLabel(product)} · {ui.payment}</span><strong>{price(product.priceKRW)}</strong></div>
   <p>{ui.afterPayment}</p><p>{askCopy.language}: <b lang={locale}>{readingLanguageNames[locale]}</b> · {ui.languageHint}</p><p>{ui.priceHint}</p>
   <a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{ui.library}</a>
   <p>{ui.about} {ui.limits}</p>
   {missing.length>0&&<ul className={styles.inputHints}>{missing.map(message=><li key={message}>{message}</li>)}</ul>}
   <button className={styles.checkoutButton} disabled={busy||(!guest&&(!ready||missing.length>0||!available.some(p=>p.id===productId)))} onClick={()=>void prepare()}>{busy?inputCopy.busy:guest?inputCopy.loginContinue:inputCopy.checkout}<ArrowRight size={18} aria-hidden="true"/></button>
   {!ready&&<p role="status">{inputCopy.catalogLoading}</p>}
   {catalogError&&<p role="alert">{siteLocale==='ko'?catalogError:inputCopy.unavailable}</p>}
   {ready&&!catalogError&&!available.some(p=>p.id===productId)&&<p>{inputCopy.unavailable}</p>}
   {error&&<p role="alert">{error}</p>}
   </div>
   </div>
  </div>
 </section>;
}
