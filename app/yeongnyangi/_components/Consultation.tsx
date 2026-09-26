"use client";
import {consultationKinds,consultationDomain,supportsKind,consultationManifest} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import {consultationTitle,fusionDescription} from '../_lib/consultation-copy';
import ReadingIdentity,{readingFeatures} from './ReadingIdentity';
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
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
import {readingLocale,readingLocales,readingLanguageNames,type ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
const explanation:Record<string,string>={saju:'사주팔자와 오행, 십성으로 기질과 삶의 흐름을 읽어요.',ziwei:'자미두수 명반의 궁과 별, 운의 흐름을 함께 살펴봐요.',sukuyo:'본명숙과 관계의 거리를 숙요점의 관점에서 살펴봐요.',vedic:'라그나와 달, 나크샤트라와 다샤를 인도 점성술로 읽어요.',astrology:'태양·달·상승점과 행성 관계를 출생 차트로 살펴봐요. 실시간 트랜짓은 포함하지 않아요.',tarot:'출생정보 없이 질문과 카드의 상징으로 상황과 선택을 읽어요.',fusion:'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'};
const loginDraftKey='yeongnyangi:consultation-login-draft';
const predictionProofRecords=predictionRecords.map(record=>{
 const entry=predictionTimeline[record.url];
 if(!entry) throw new Error(`prediction-timeline missing ${record.url}`);
 return {...record,...entry};
});
export default function Consultation(){
 const [locale,setLocale]=useState<ReadingLocale>('ko');
 const [kindId,setKindId]=useState('personal');
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[catalogError,setCatalogError]=useState('');
 const profileState=useProfiles(),{profiles,profileId,guest}=profileState;
 const [partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const partnerProfile=profiles.find(p=>profileKey(p)===partnerId);
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const consultationAttemptId=useRef('');
 const viewedProduct=useRef('');
 const restoredDraft=useRef<{profileId?:string;partnerId?:string;extraTime?:string;extraPlace?:string;timeUnknown?:boolean}|null>(null);
 const product=products.find(p=>p.id===productId)!;
 const inputCopy=consultationInputCopy(locale);
 useEffect(()=>{
  if(!ready||viewedProduct.current===product.id)return;
  viewedProduct.current=product.id;
  trackEvent('view_item',{currency:product.currency,value:product.priceKRW,items:[{item_id:product.cdFeatureKey,item_name:product.name,price:product.priceKRW}],service:'yeongnyangi'});
 },[ready,product]);
 const kind=consultationKinds[domain].find(k=>k.id===kindId)||consultationKinds[domain][0];
 const askCopy=askPhase5Copy(locale).input;
 const selectableLocales=kind.question?readingLocales:readingLocales.slice(0,3);
 const preview=consultationManifest(product,kind,topicId);
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain).filter(p=>supportsKind(p,kind));
 const tarotOnly=product.domain==='tarot'&&product.readingKind==='single';
 const premium=['flounder','tuna'].includes(product.fishId);
 const needsTime=premium||product.systems.some(id=>!['saju','tarot'].includes(id));
 const needsPlace=premium||product.systems.some(id=>['vedic','astrology','sukuyo'].includes(id));
 const missing=!tarotOnly&&!guest?[
  ...(kind.partner&&partnerProfile&&premium&&(partnerProfile.birth?.timeUnknown||!partnerProfile.location?.label||!partnerProfile.gender)?[inputCopy.partnerDetails]:[]),
  ...(kind.partner&&!partnerId?[inputCopy.partnerRequired]:[]),
  ...(!selectedProfile?[inputCopy.profileRequired]:[]),
  ...(selectedProfile&&needsTime&&(timeUnknown||(selectedProfile.birth?.timeUnknown&&!extraTime))?[inputCopy.timeRequired]:[]),
  ...(selectedProfile&&needsPlace&&!selectedProfile.location?.label&&!extraPlace.trim()&&!currentLocation?[inputCopy.placeRequired]:[]),
 ]:[];
 if(kind.question&&!question.trim()&&!guest)missing.push(askCopy.required);
 useEffect(()=>{if(restoredDraft.current)return;setExtraTime('');setExtraPlace('');setCurrentLocation(null);setTimeUnknown(false);setError('');},[profileId]);
 useEffect(()=>{if(!profileState.loading&&partnerId&&(partnerId===profileId||!profiles.some(p=>profileKey(p)===partnerId)))setPartnerId('');},[profileId,profiles,partnerId,profileState.loading]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  const preferred=getCurrentLoadingLocale();
  const selected=products.find(p=>p.id===params.get('product'))||(requested==='fusion'?products.find(p=>p.readingKind==='pair'):undefined)||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const nextDomain=consultationDomain(selected);
  const requestedKind=consultationKinds[nextDomain].find(k=>k.id===params.get('consultationKind'))||(params.get('topic')?consultationKinds[nextDomain].find(k=>k.id==='ask'):undefined)||consultationKinds[nextDomain][0];
  setKindId(requestedKind.id);
  if(readingLocales.includes(preferred as ReadingLocale)&& (requestedKind.question||readingLocales.slice(0,3).includes(preferred as 'ko'|'en'|'ja')))setLocale(preferred as ReadingLocale);
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
    if(readingLocales.includes(draft.locale)&&(savedKind.question||readingLocales.slice(0,3).includes(draft.locale)))setLocale(readingLocale(draft.locale));
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
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{locale,consultationAttemptId:consultationAttemptId.current,birthDetails:{birthTime:extraTime,birthPlace},productId,consultationKind:kind.id,profileId,topicId:kind.id==='ask'?topicId:kind.topic,question:kind.question?question:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',timeUnknown,...(kind.partner&&partnerId?{partnerProfileId:partnerId}:{})});
   try{sessionStorage.removeItem(loginDraftKey);}catch{/* The server snapshot now owns the consultation input. */}
   trackEvent('consultation_start',{item_id:product.cdFeatureKey,service:'yeongnyangi'});
   consultationAttemptId.current='';
   window.location.assign(data.fortune.paid?resultPath(data.fortune.id,data.fortune.locale):checkoutPath(data.fortune));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginWithDraft();else setError(e instanceof FortuneApiError&&locale!=='ko'?inputCopy.consultationError:e instanceof Error?e.message:inputCopy.consultationError);}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){const first=consultationKinds[next][0];setKindId(first.id);if(!first.question&&!readingLocales.slice(0,3).includes(locale as 'ko'|'en'|'ja'))setLocale('en');setTopicId('general');setQuestion('');setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 function chooseKind(id:string){const next=consultationKinds[domain].find(k=>k.id===id)!;setKindId(id);if(!next.question&&!readingLocales.slice(0,3).includes(locale as 'ko'|'en'|'ja'))setLocale('en');setPartnerId('');setError('');if(!supportsKind(product,next))setProductId(products.find(p=>consultationDomain(p)===domain&&supportsKind(p,next))!.id);}
 return <section className={`${styles.consultation} ${styles.consultationRoom}`}>
  <picture className={styles.consultationScenery}><source media="(max-width: 767px)" srcSet="/assets/yeongnyangi/original/room-780.webp"/><img src="/assets/yeongnyangi/original/room-1440.webp" width={1440} height={810} alt=""/></picture>
  <header className={styles.consultationHeader}><div><h1>무엇부터 읽어볼까?</h1><p>말이 조금 엉켜도 괜찮아.<br/>궁금한 운세를 고르고, 네 이야기를 들려줘.</p></div><Moon size={36} strokeWidth={1} aria-hidden="true"/></header>
  <label className={styles.field} lang={locale}>{kind.question?askCopy.language:'상담 결과 언어 / Reading language / 結果の言語'}
   <select value={locale} disabled={busy} onChange={e=>{setLocale(readingLocale(e.target.value));setError('');}}>{selectableLocales.map(value=><option key={value} value={value}>{readingLanguageNames[value]}</option>)}</select>
  </label>
  <p lang={locale}>{kind.question?askCopy.languageHint:locale==='en'?'Your new reading will be written in English. The purchase language stays fixed for recovery and rereading. Some menus and calculated chart labels remain in Korean.':locale==='ja'?'新しい鑑定結果は日本語で作成します。再開・再閲覧でも購入時の言語を維持します。一部のメニューと計算図の表示は韓国語です。':'새 상담은 선택한 언어로 작성돼요. 복구하거나 다시 읽어도 구매 시 선택한 언어를 유지해요.'}</p>
  <a className={styles.spiritEntry} href="/yeongnyangi/fortune/?mode=spirit"><img src="/assets/yeongnyangi/spirit/eastern-oracle.webp" width={64} height={68} alt=""/><span><strong>영냥 신점</strong><br/>질문이 떠오른 순간의 기운과 선택 살펴보기</span></a>
  <div className={styles.tabs} role="group" aria-label="운세 종류">{[...Object.entries(systemNames),['fusion','복합 운세']].map(([id,label])=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{label}</button>)}</div>
  <div className={styles.kindChoices} role="group" aria-label="상담 종류">{consultationKinds[domain].map(item=><button key={item.id} aria-pressed={kind.id===item.id} onClick={()=>chooseKind(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
  <ReadingIdentity product={product} compact/>
  <p className={styles.systemDescription}>{fusionDescription(product)||explanation[domain]}</p>
  {domain==='fusion'&&<p className={styles.systemDescription}>각 체계는 고유한 기준으로 계산해. 같은 흐름과 다른 해석을 나란히 읽고, 네가 선택할 수 있는 행동으로 정리해줄게. 결제 후 창을 닫아도 내 상담 기록에서 이어 읽을 수 있어.</p>}
  <div className={styles.consultationDesk}>
   <aside className={styles.consultationGuide} aria-label="선택한 상담 요약">
    <img className={styles.guideCat} src="/assets/yeongnyangi/profiles/welcome.webp" width={168} height={171} alt="반갑게 맞이하는 영냥이"/>
    <h2>네 이야기에,<br/>작은 달빛 하나.</h2><p>한 번에 답을 찾으려 하지 않아도 돼.<br/>함께 살펴볼 흐름부터 골라보자.</p>
    <dl className={styles.consultationSummary}><div><dt>오늘의 상담</dt><dd>{kind.label} · {product.fishName}</dd></div><div><dt>함께 읽을 이야기</dt><dd>{tarotOnly?'질문과 카드의 상징':selectedProfile?.name||'프로필을 골라줘'}</dd></div><div><dt>상담 구성</dt><dd>{product.chapterCount}개 챕터</dd></div><div><dt>전용 구성</dt><dd>{readingFeatures[domain]}</dd></div><div><dt>이용 방식</dt><dd>Family 이용권 또는 단건 결제 · {product.priceKRW.toLocaleString('ko-KR')}원</dd></div></dl>
    <p className={styles.guideNote}><Sparkles size={16} aria-hidden="true"/>계산은 운세 체계가,<br/>해설은 영냥이가 함께해.</p>
    <details className={styles.predictionRecords}><summary><span className={styles.predictionRecordsSeal} aria-hidden="true">原</span><span><strong>두 대통령 적중 기록</strong><small>게시일과 원문으로 직접 확인하기</small></span></summary><div className={styles.predictionRecordsBody}><figure className={styles.predictionRecordsArt}><img src="/assets/yeongnyangi/original/records-scroll-2d-480.webp" width={480} height={320} alt="" loading="lazy" decoding="async"/></figure><p>2022년과 2024년에 공개된 블로그 원문을 기준으로, 당시 문장과 이후 확인된 사건을 분리해 보여드려요. 개인 상담 결과를 보장하는 문구는 아니며, 원문 링크에서 직접 확인할 수 있어요.</p><ol>{predictionProofRecords.map(record=><li key={record.url}><a href={record.url} target="_blank" rel="noopener noreferrer" aria-label={`원문 보기: ${record.title} (새 창)`}><time dateTime={record.date}>{record.date.replaceAll('-','.')}</time><strong>{record.title}</strong><span>{record.after}</span><em>원문 보기</em></a></li>)}</ol></div></details>
   </aside>
   <div className={`${styles.form} ${styles.consultationForm}`}>
   {tarotOnly?<section className={styles.questionIntro} lang={locale}><h2>{inputCopy.tarotHeading}</h2><p>{inputCopy.tarotIntro}</p>{guest&&<p>{inputCopy.loginHint}</p>}</section>:<>
    <ProfilePicker state={profileState} locale={locale}/>
    {!guest&&selectedProfile&&<div className={styles.birthDetails}>
    <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> {inputCopy.timeUnknown}</label>
    {selectedProfile?.birth?.timeUnknown&&<label>{inputCopy.timeSupplement}<input type="time" value={extraTime} onChange={e=>setExtraTime(e.target.value)}/></label>}
    {selectedProfile&&!selectedProfile.location?.label&&<><CurrentLocationButton key={profileId} locale={locale==='ja'?'ja':locale==='ko'?'ko':'en'} disabled={busy} onLocation={value=>{setCurrentLocation(value);setExtraPlace(value.name);}}/>{currentLocation&&<p role="status">{inputCopy.currentLocation} {currentLocation.timezone}</p>}<label>{inputCopy.placeSupplement}<input value={extraPlace} onChange={e=>{setExtraPlace(e.target.value);setCurrentLocation(null);}} placeholder={inputCopy.placePlaceholder} maxLength={120}/></label></>}
    {(selectedProfile?.birth?.timeUnknown||!selectedProfile.location?.label)&&<p>{inputCopy.supplementSaved}</p>}
    {kind.partner&&<label>{inputCopy.partner}<select value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">{inputCopy.partnerSelect}</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
    </div>}
   </>}
   {kind.question&&<section className={styles.questionSection} aria-label={askCopy.heading} lang={locale}><h2>{tarotOnly?inputCopy.tarotHeading:askCopy.heading}</h2><p>{askCopy.intro}</p>
   {kind.id==='ask'&&<><label htmlFor="consultation-topic">{askCopy.topic}</label><select id="consultation-topic" value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="general">{askCopy.general}</option>{Object.keys(topicCatalog).map(id=><option value={id} key={id}>{askCopy.topics[id as keyof typeof topicCatalog]}</option>)}</select></>}
   <label htmlFor="consultation-question">{askCopy.question}</label><textarea id="consultation-question" rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={askCopy.placeholder}/>
   </section>}
  <div className={`${styles.fishes} ${domain==='fusion'?styles.fusionChoices:''}`} role="group" aria-label="생선 상품">{choices.map(item=><button key={item.id} onClick={()=>setProductId(item.id)} aria-pressed={productId===item.id}>
   <img src={item.image} alt="" width={240} height={108}/><strong>{domain==='fusion'?consultationTitle(item):item.fishName}</strong><span>{item.priceKRW.toLocaleString('ko-KR')}원 · {item.chapterCount}개 챕터</span>{domain!=='fusion'&&<small>{policyForReading(item.fishId,item.manifestVersion).target.map(n=>n.toLocaleString('ko-KR')).join('~')}자 목표 · 본문 기준</small>}<small>{fusionDescription(item)||depthDescriptions[item.fishId]}</small>
  </button>)}</div>
   <details className={styles.manifestPreview}><summary>{kind.label} · {preview.length}개 챕터 목차</summary><ol>{preview.map(chapter=><li key={chapter.id}>{chapter.title}</li>)}</ol></details>
   <div className={styles.checkoutSection}><div className={styles.checkoutTotal}><span>{product.fishName} · Family 이용권 또는 단건 결제</span><strong>{product.priceKRW.toLocaleString('ko-KR')}<small>원</small></strong></div>
   <p>선택한 운세의 계산 결과를 바탕으로 AI가 해설해요. 선택을 돕는 참고 자료이며 미래를 확정하지 않아요.</p>
   {missing.length>0&&<ul className={styles.inputHints}>{missing.map(message=><li key={message}>{message}</li>)}</ul>}
   <button className={styles.checkoutButton} disabled={busy||(!guest&&(!ready||missing.length>0||!available.some(p=>p.id===productId)))} onClick={()=>void prepare()}>{busy?inputCopy.busy:guest?inputCopy.loginContinue:inputCopy.checkout}<ArrowRight size={18} aria-hidden="true"/></button>
   {!ready&&<p role="status">{inputCopy.catalogLoading}</p>}
   {catalogError&&<p role="alert">{locale==='ko'?catalogError:inputCopy.unavailable}</p>}
   {ready&&!catalogError&&!available.some(p=>p.id===productId)&&<p>{inputCopy.unavailable}</p>}
   {error&&<p role="alert">{error}</p>}
   </div>
   </div>
  </div>
 </section>;
}
