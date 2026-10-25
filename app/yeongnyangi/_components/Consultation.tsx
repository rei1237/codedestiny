"use client";
import BirthTimeInput from "@/app/components/BirthTimeInput";

import CheckoutClient from '@/app/checkout/CheckoutClient';
import {fusionIntroductionArt} from '../_lib/introduction-art';
import QuestionCheckout from './QuestionCheckout';
import {getQuestionGuide,questionScopeEntry} from "@/lib/fortune/question-journey";
import {CONSULTATION_DRAFT_KEY as loginDraftKey} from '@/lib/fortune/question-entry';
import {type PreparationStep} from './QuestionCheckout';
import {emptyIntakeDecision,intakeFish,type IntakeValue} from '../_lib/intake-chat';
import {PREVENTION_TITLE} from '@/worker/lib/fortune-prevention.js';
import {consultationBudget,fusionPremiumManifest,a4Label,A4_PAGE_NOTE} from '@/worker/yeongnyangi/fortune/consultation-budget';
import {questionCandidate,recommendQuestion,QUESTION_POLICY_VERSION,questionTopics,questionDecision,questionManifest,questionScopes,FOLLOWUP_LIMITS,type QuestionDecision,type QuestionFish} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import RelationshipJourney from './RelationshipJourney';
import {additionalKindDescription} from '../_lib/consultation-kind-copy';
import {relationshipCopyFor} from '../_lib/relationship-locales';
import {relationshipMethodCopy} from '../_lib/relationship-method-copy';
import {isRelationshipReading,relationshipQuestions} from '@/worker/yeongnyangi/fortune/relationship-contract';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {consultationKinds,consultationDomain,supportsKind,consultationManifest} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import {consultationTitle,fusionDescription} from '../_lib/consultation-copy';
import {getFortuneCopy} from '../_lib/product-curiosity';
import {readingFeatures} from './ReadingIdentity';
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {readingLocationCopy} from '../_lib/current-location-copy';
import {useEffect,useRef,useState} from 'react';
import {useBackNavigation} from '@/app/hooks/useBackNavigation';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {authFetch} from '@/app/_lib/auth-client';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {products,systemNames,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions,policyForReading} from '@/worker/yeongnyangi/fortune/reading-policy';
import {conciseReadingManifest} from '@/worker/yeongnyangi/fortune/concise-reading';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import {friendlyErrorMessage} from '@/app/_lib/friendly-error';
import ProfilePicker from './ProfilePicker';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import styles from '../yeongnyangi.module.css';
import CustomerReviews from '@/app/components/CustomerReviews';
import {visibleReviews} from '@/lib/brand/customer-reviews.mjs';
import LaunchPlannedPrice from '@/app/components/LaunchPlannedPrice';
import {plannedPriceFor} from '@/lib/brand/launch-offer';
import {trackEvent} from '@/lib/analytics';
import {readingLocale,readingLocales,readingLanguageNames} from '@/worker/yeongnyangi/fortune/reading-locale';
import ReadingLanguageSelect from './ReadingLanguageSelect';
import type {VoiceStyle} from '../_lib/voice-style-copy';
import TarotConsultationGuide from './TarotConsultationGuide';
import AskPeriodPicker from './AskPeriodPicker';
import {useReadingLanguage,browserReadingContext,readingPrice} from '../_lib/use-reading-language';
import {consultationLocaleCopy,localizedSystem,localizedKind,localizedTier} from '../_lib/consultation-locale-copy';
import {questionSkyCopyFor} from '../_lib/question-sky-copy';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import {v7Label,v7PartHead} from '../_lib/reading-v7-copy';
import {readingDepthCopy,readingTierDepth} from '../_lib/reading-depth-copy';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
import {experienceCopy} from '../_lib/experience-copy';
import ExperienceSurvey,{experienceAnswers,promptedRows,type ExperienceCheck,type ExperienceRow} from './ExperienceSurvey';
import {experienceCheckApplies} from '@/worker/yeongnyangi/fortune/saju/experience-policy';
import {tarotConsultation} from '@/worker/yeongnyangi/fortune/tarot/consultation-contract';
import {tarotPeriods,tarotRelationStatuses,TAROT_SPREAD_KIND} from '@/worker/yeongnyangi/fortune/tarot/spread-v3';
import {tierAllowsSpread} from '@/lib/tarot/yeongnyangi-spread-catalog.mjs';
import TarotSpreadPlanner,{emptyTarotPlan,plannedSpread,plannedInputs,restoreTarotPlan,fishName,type TarotPlan} from './tarot/TarotSpreadPlanner';
import CraftedProductDisclosure from '@/app/components/CraftedProductDisclosure';
import {localizedTarotQuestionFeatures} from '../_lib/tarot-plan-locales';
import {tarotSpreadCopyFor} from '../_lib/tarot-spread-locales';
import {localizedTarotSpread} from '../_lib/tarot-spread-catalog-locales';
const hasReviews=visibleReviews().length>0;
// Every locale opens tarot on the question-first spread order.
const defaultKind=(domainId:string)=>domainId==='tarot'?consultationKinds.tarot.find(k=>k.id===TAROT_SPREAD_KIND)!:consultationKinds[domainId][0];
export default function Consultation(){
 const [relationshipStage,setRelationshipStage]=useState(''),[relationshipQuestionId,setRelationshipQuestionId]=useState('');
 const [participants,setParticipants]=useState({self:'',partner:''});
 const [touched,setTouched]=useState<Record<string,boolean>>({});
 const {locale,setLocale,siteLocale,fallback}=useReadingLanguage();
 const ui=consultationLocaleCopy(siteLocale),tarotSpreadCopy=tarotSpreadCopyFor(siteLocale);
 const relationshipCopy=relationshipCopyFor(siteLocale),relationshipAdvice=relationshipMethodCopy(siteLocale).advice;
 const kindLabel=(id:string)=>siteLocale==='ko'?consultationKinds[domain].find(k=>k.id===id)?.label||localizedKind(id,siteLocale):localizedKind(id,siteLocale);
 const tierLabel=(item:Product)=>siteLocale==='ko'?(item.readingKind==='single'?item.fishName:consultationTitle(item)):item.readingKind==='single'?localizedTier(item.fishId,siteLocale):item.systems.map(id=>localizedSystem(id,siteLocale)).join(' + ');
 const price=(amount:number)=>siteLocale==='ko'?amount.toLocaleString('ko-KR')+'원':readingPrice(amount,siteLocale);
 const [kindId,setKindId]=useState('personal');
 const [questionMode,setQuestionMode]=useState(true),[decision,setDecision]=useState<QuestionDecision|undefined>();
 const [scopeDraft,setScopeDraft]=useState<QuestionDecision|undefined>();
 const [questionFish,setQuestionFish]=useState<QuestionFish|undefined>();
 const [chatStep,setChatStep]=useState('question');
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[catalogError,setCatalogError]=useState('');
 const profileState=useProfiles(),{profiles,profileId,guest}=profileState;
 const [partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 // 2026-10-17 "직관성": 말투 선택을 없애고 존댓말로 고정한다.
 const [voiceStyle,setVoiceStyle]=useState<VoiceStyle>('honorific');
 const [domainFixed,setDomainFixed]=useState(false);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const [tarotPlan,setTarotPlan]=useState<TarotPlan>(emptyTarotPlan),[tierNotice,setTierNotice]=useState('');
 const [experience,setExperience]=useState<{key:string;loading:boolean;check:ExperienceCheck|null}>({key:'',loading:false,check:null});
 const [experienceRows,setExperienceRows]=useState<ExperienceRow[]>([]);
 const partnerProfile=profiles.find(p=>profileKey(p)===partnerId);
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const consultationAttemptId=useRef(''),preparationKey=useRef('');
 const viewedProduct=useRef('');
 const restoredDraft=useRef<{profileId?:string;partnerId?:string;extraTime?:string;extraPlace?:string;timeUnknown?:boolean}|null>(null);
 const product=products.find(p=>p.id===productId)!;
 const plannedTotal=siteLocale==='ko'?plannedPriceFor(product.fishId,product.priceKRW):null;
 const inputCopy=consultationInputCopy(siteLocale);
 useEffect(()=>{
  if(!ready||viewedProduct.current===product.id)return;
  viewedProduct.current=product.id;
  trackEvent('view_item',{currency:product.currency,value:product.priceKRW,items:[{item_id:product.cdFeatureKey,item_name:product.name,price:product.priceKRW}],service:'yeongnyangi'});
 },[ready,product]);
 const originalKind=consultationKinds[domain].find(k=>k.id===kindId)||consultationKinds[domain][0];
 const questionActive=questionMode&&siteLocale==='ko'&&domain!=='fusion'&&Boolean(decision);
 const kind=questionActive?{...originalKind,question:true}:originalKind;
 const tarotSpec=domain==='tarot'?tarotConsultation(kind.id):undefined;
 const tarotSpread=domain==='tarot'&&kind.id===TAROT_SPREAD_KIND?plannedSpread(tarotPlan,question,product.fishId,siteLocale):undefined;
 const tarotSpreadView=tarotSpread?localizedTarotSpread(tarotSpread,siteLocale):undefined;
 const relationship=isRelationshipReading(domain,kind.id);
 useEffect(()=>{
  if(siteLocale==='ko'||!kind.koOnly)return;
  const fallbackKind=consultationKinds[domain].find(item=>!item.koOnly)!;
  setKindId(fallbackKind.id);setLocale(siteLocale);setRelationshipStage('');setError('');
 },[siteLocale,domain,kind.id]);
 const systemCopy=domain==='fusion'?null:getFortuneCopy(domain as 'saju'|'ziwei'|'sukuyo'|'vedic'|'astrology'|'tarot',kind.id);
 const spiritEntryCopy=questionSkyCopyFor(siteLocale).entry;
 const askCopy=askPhase5Copy(siteLocale).input;
 const preview=questionActive?questionManifest(product.domain,product.fishId as QuestionFish,decision!,tarotSpread,question):siteLocale==='ko'&&product.readingKind!=='single'?fusionPremiumManifest(product,topicId):conciseReadingManifest(consultationManifest(product,kind,topicId,tarotSpread));
 const fusionPreview=siteLocale==='ko'&&product.readingKind!=='single';
 const previewCount=preview.length+(fusionPreview?1:0);
 // New purchase previews use the same concise manifest as preparation. Saved results keep their own manifest.
 const targetRange=(item:Product)=>{
  const rows=siteLocale==='ko'&&item.readingKind!=='single'?fusionPremiumManifest(item,topicId):conciseReadingManifest(consultationManifest(item,kind,topicId,tarotSpread));
  const target=rows.every(row=>row.targetChars?.every(n=>Number.isFinite(n)&&n>0))
   ?[0,1].map(i=>rows.reduce((sum,row)=>sum+(row.targetChars?.[i]||0),0))
   :policyForReading(item.fishId,item.manifestVersion).target;
  return siteLocale==='ko'?a4Label(target as [number,number]):target.map(n=>n.toLocaleString(siteLocale)).join('~');
 };
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain).filter(p=>supportsKind(p,kind));
 const tarotOnly=product.domain==='tarot'&&product.readingKind==='single';
 const premium=!questionActive&&['flounder','tuna'].includes(product.fishId);
 const needsTime=premium||Boolean(questionActive&&decision?.horizon==='transition')||product.systems.some(id=>!['saju','tarot'].includes(id));
 const needsPlace=premium||relationship&&domain==='ziwei'||product.systems.some(id=>['vedic','astrology','sukuyo'].includes(id));
 // Optional past-experience survey for tiers that keep 대운 evidence. It only tunes 대운·세운 emphasis on the server,
 // never the natal chart, and a failed or pending check never blocks payment: the survey simply does not appear.
 const experienceKey=!guest&&selectedProfile&&experienceCheckApplies(product)&&!timeUnknown&&!(selectedProfile.birth?.timeUnknown&&!extraTime)?JSON.stringify([productId,profileId,extraTime,currentLocation?.latitude,currentLocation?.longitude]):'';
 const experienceCheck=experienceKey&&experience.key===experienceKey&&!experience.loading?experience.check:null;
 const surveyAnswers=experienceCheck?experienceAnswers(experienceRows,experienceCheck.maxEntries):[];
 const missing=!tarotOnly&&!guest?[
  ...(kind.partner&&partnerProfile&&premium&&(partnerProfile.birth?.timeUnknown||!partnerProfile.location?.label||!partnerProfile.gender)?[inputCopy.partnerDetails]:[]),
  ...(kind.partner&&partnerProfile&&!premium&&(needsTime&&partnerProfile.birth?.timeUnknown||needsPlace&&!partnerProfile.location?.label)?[inputCopy.partnerDetails]:[]),
  ...(kind.partner&&!partnerId?[inputCopy.partnerRequired]:[]),
  ...(!selectedProfile?[inputCopy.profileRequired]:[]),
  ...(selectedProfile&&needsTime&&(timeUnknown||(selectedProfile.birth?.timeUnknown&&!extraTime))?[inputCopy.timeRequired]:[]),
  ...(selectedProfile&&needsPlace&&!selectedProfile.location?.label&&!extraPlace.trim()&&!currentLocation?[inputCopy.placeRequired]:[]),
 ]:[];
 if(kind.question&&!question.trim()&&!guest)missing.push(askCopy.required);
 if(relationship&&tarotOnly&&(!participants.self.trim()||!participants.partner.trim()))missing.push(relationshipCopy.namesRequired);
 // 비어 있는 필수 칸은 손댄 뒤에만 그 칸 바로 아래에 알린다(aria-invalid). 결제 버튼 위 요약 목록은 해당 칸으로 데려간다.
 const fieldMessages:Record<string,string>={time:inputCopy.timeRequired,place:inputCopy.placeRequired,partner:missing.includes(inputCopy.partnerDetails)?inputCopy.partnerDetails:inputCopy.partnerRequired,question:askCopy.required};
 const fieldError=(field:string)=>touched[field]&&missing.includes(fieldMessages[field])?fieldMessages[field]:'';
 const fieldProps=(field:string)=>({id:`consultation-${field}`,onBlur:()=>setTouched(prev=>prev[field]?prev:{...prev,[field]:true}),'aria-invalid':fieldError(field)?true as const:undefined,'aria-describedby':fieldError(field)?`consultation-${field}-error`:undefined});
 const fieldNote=(field:string)=>fieldError(field)&&<small id={`consultation-${field}-error`} className={styles.fieldError}>{fieldError(field)}</small>;
 const goToField=(field:string)=>{setTouched(prev=>({...prev,[field]:true}));const target=document.getElementById(`consultation-${field}`)||document.getElementById(`consultation-${field}-unknown`);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true});};
 useEffect(()=>{if(restoredDraft.current)return;setExtraTime('');setExtraPlace('');setCurrentLocation(null);setTimeUnknown(false);setError('');},[profileId]);
 useEffect(()=>{
  if(!experienceKey)return;
  const controller=new AbortController();
  setExperience({key:experienceKey,loading:true,check:null});setExperienceRows([]);
  fortuneApi<{check:ExperienceCheck|null}>('saju/experience-check',{productId,profileId,timeUnknown,birthDetails:{birthTime:extraTime,birthPlace:currentLocation?{name:currentLocation.name,latitude:currentLocation.latitude,longitude:currentLocation.longitude,timezone:currentLocation.timezone}:undefined},timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'},{signal:controller.signal,timeoutMs:8000})
   .then(data=>{setExperience({key:experienceKey,loading:false,check:data.check||null});if(data.check)setExperienceRows(promptedRows(data.check));})
   .catch(()=>{if(!controller.signal.aborted)setExperience({key:experienceKey,loading:false,check:null});});
  return ()=>controller.abort();
 },[experienceKey]);
 useEffect(()=>{if(!profileState.loading&&partnerId&&(partnerId===profileId||!profiles.some(p=>profileKey(p)===partnerId)))setPartnerId('');},[profileId,profiles,partnerId,profileState.loading]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  setDomainFixed(params.has('domain')||params.has('product'));
  const questionEntry=params.get('flow')==='question';
  const reportEntry=!questionEntry&&(params.get('flow')==='legacy'||params.get('flow')==='relationship'||params.has('consultationKind')||params.has('domain')||params.has('product')||params.has('fish'));
  if(reportEntry)setQuestionMode(false);
  if(params.get('flow')==='relationship')setRelationshipStage('question');
  const selected=products.find(p=>p.id===params.get('product'))||(requested==='fusion'?products.find(p=>p.readingKind==='pair'):undefined)||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  if(selected.readingKind==='single'&&(params.has('fish')||params.has('product')))setQuestionFish(selected.fishId as QuestionFish);
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const nextDomain=consultationDomain(selected);
  const requestedKind=consultationKinds[nextDomain].find(k=>k.id===params.get('consultationKind'))||(params.get('topic')?consultationKinds[nextDomain].find(k=>k.id==='ask'):undefined)||defaultKind(nextDomain);
  setKindId(requestedKind.id);
  if(requestedKind.koOnly)setLocale('ko');
  const entryQuestion=getQuestionGuide(params.get("questionId"));
  if(params.get('flow')==='question'&&entryQuestion){
   const entry=questionScopeEntry(entryQuestion);
   setQuestion(entryQuestion.question);setScopeDraft(entry.decision);
  }else if(!params.has('consultationKind')&&params.get('flow')!=='legacy'){
   const category=questionTopics.find(t=>t.id===params.get('category'))?.id;
   if(category)setScopeDraft({version:QUESTION_POLICY_VERSION,category,target:category==='compatibility'?'pair':'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false});
  }
  if(entryQuestion&&entryQuestion.productId===selected.id&&entryQuestion.kind===requestedKind.id&&requestedKind.question)setQuestion(entryQuestion.question);
  if(!supportsKind(selected,requestedKind))setProductId(products.find(p=>consultationDomain(p)===nextDomain&&supportsKind(p,requestedKind))!.id);
  const requestedTopic=params.get('topic');
  if(requestedTopic && Object.hasOwn(topicCatalog,requestedTopic))setTopicId(requestedTopic);
  try{
   const draft=JSON.parse(sessionStorage.getItem(loginDraftKey)||'null');
   if(draft&&draft.path===window.location.pathname+window.location.search&&(!draft.accountId||draft.accountId===readDestinyProfileAccountId())&&Date.now()-draft.savedAt<3600000){
    const savedProduct=products.find(p=>p.id===draft.productId);
    const savedDomain=savedProduct?consultationDomain(savedProduct):nextDomain;
    const savedKind=consultationKinds[savedDomain].find(k=>k.id===draft.consultationKind)||consultationKinds[savedDomain][0];
    if(savedProduct){setKindId(savedKind.id);setProductId(supportsKind(savedProduct,savedKind)?savedProduct.id:products.find(p=>consultationDomain(p)===savedDomain&&supportsKind(p,savedKind))!.id);setDomain(savedDomain);}
    restoredDraft.current=draft;
    if(savedKind.koOnly)setLocale('ko');
    else if(readingLocales.includes(draft.locale))setLocale(readingLocale(draft.locale));
    if(relationshipQuestions.some(q=>q.id===draft.relationshipQuestionId))setRelationshipQuestionId(draft.relationshipQuestionId);
    if(['question','people','engine','consultation'].includes(draft.relationshipStage))setRelationshipStage(draft.relationshipStage);
    if(typeof draft.participants?.self==='string'&&typeof draft.participants?.partner==='string')setParticipants({self:draft.participants.self.slice(0,40),partner:draft.participants.partner.slice(0,40)});
    if(typeof draft.consultationAttemptId==='string')consultationAttemptId.current=draft.consultationAttemptId;
    if(typeof draft.preparationKey==='string')preparationKey.current=draft.preparationKey;
    if(typeof draft.extraTime==='string')setExtraTime(draft.extraTime);
    if(typeof draft.extraPlace==='string')setExtraPlace(draft.extraPlace);
    if(draft.topicId==='general'||Object.hasOwn(topicCatalog,draft.topicId))setTopicId(draft.topicId);
    if(!reportEntry&&draft.questionDecision?.version===QUESTION_POLICY_VERSION){try{if(savedProduct?.readingKind==='single')setQuestionFish(savedProduct.fishId as QuestionFish);if(draft.editScope){setScopeDraft({...questionDecision(draft.questionDecision),confirmed:false});setDecision(undefined);}else setDecision(questionDecision(draft.questionDecision));setQuestionMode(true);}catch{/* Unknown draft contracts are ignored. */}}
    if(typeof draft.chatStep==='string')setChatStep(draft.chatStep);
    if(draft.editScope&&Object.hasOwn(systemNames,draft.intakeDomain))setDomain(draft.intakeDomain);
    if(typeof draft.question==='string')setQuestion(draft.question.slice(0,1000));
    if(draft.voiceStyle==='honorific')setVoiceStyle('honorific');
    if(draft.tarotPlan)setTarotPlan(restoreTarotPlan(draft.tarotPlan));
   }
  }catch{/* Login still works when browser storage is unavailable. */}
  let cancelled=false;
  fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(catalog=>{
   if(cancelled)return;
   setAvailable(catalog.products.filter(p=>p.available));
  }).catch(e=>{if(!cancelled)setCatalogError(friendlyErrorMessage(e,'상담 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));}).finally(()=>{if(!cancelled)setReady(true);});
  return ()=>{cancelled=true;};
 },[]);
 useEffect(()=>{
  const draft=restoredDraft.current;if(!draft||profileState.loading)return;
  if(draft.profileId&&profiles.some(p=>profileKey(p)===draft.profileId)&&profileId!==draft.profileId){profileState.select(draft.profileId);return;}
  if(draft.partnerId&&profiles.some(p=>profileKey(p)===draft.partnerId))setPartnerId(draft.partnerId);
  setExtraTime(draft.extraTime||'');setExtraPlace(draft.extraPlace||'');setTimeUnknown(draft.timeUnknown===true);restoredDraft.current=null;
 },[profileId,profiles,profileState.loading,profileState.select]);
 useEffect(()=>{
  if(!ready||(!relationshipStage&&!relationship))return;
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({accountId:readDestinyProfileAccountId(),path:window.location.pathname+window.location.search,locale,productId,consultationKind:kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,relationshipStage,relationshipQuestionId,participants,voiceStyle,consultationAttemptId:consultationAttemptId.current,preparationKey:preparationKey.current,savedAt:Date.now()}));}catch{/* Optional draft; paid snapshots remain on the server. */}
 },[ready,relationship,relationshipStage,relationshipQuestionId,participants,voiceStyle,locale,productId,kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown]);
 useEffect(()=>{
  if(!ready||!questionMode||siteLocale!=='ko'||domain==='fusion')return;
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({accountId:readDestinyProfileAccountId(),path:window.location.pathname+window.location.search,locale,productId,consultationKind:kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,voiceStyle,tarotPlan,participants,questionDecision:decision||scopeDraft,editScope:!decision,intakeDomain:domain,chatStep,consultationAttemptId:consultationAttemptId.current,preparationKey:preparationKey.current,savedAt:Date.now()}));}catch{/* Optional draft: unavailable storage does not prevent preparation. */}
 },[ready,questionMode,siteLocale,domain,locale,productId,kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,voiceStyle,tarotPlan,participants,decision,scopeDraft,chatStep]);
 function loginWithDraft(){
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({accountId:readDestinyProfileAccountId(),path:window.location.pathname+window.location.search,locale,productId,consultationKind:kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,relationshipStage,relationshipQuestionId,participants,voiceStyle,tarotPlan,...(questionMode?{questionDecision:decision||scopeDraft,editScope:!decision,intakeDomain:domain,chatStep}:{}),consultationAttemptId:consultationAttemptId.current,preparationKey:preparationKey.current,savedAt:Date.now()}));}catch{/* Optional pre-login draft only; paid input is stored on the server. */}
  loginForCurrentPage();
 }
 async function prepare(inline=false){
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
   const inputKey=JSON.stringify([productId,kind.id,profileId,partnerId,question,decision,topicId,locale,voiceStyle,birthPlace,extraTime,timeUnknown,surveyAnswers,participants,tarotPlan]);
   if(preparationKey.current&&preparationKey.current!==inputKey)consultationAttemptId.current='';
   preparationKey.current=inputKey;
   if(!consultationAttemptId.current)consultationAttemptId.current=crypto.randomUUID();
   try{const draft=JSON.parse(sessionStorage.getItem(loginDraftKey)||'null');if(draft)sessionStorage.setItem(loginDraftKey,JSON.stringify({...draft,consultationAttemptId:consultationAttemptId.current,preparationKey:preparationKey.current}));}catch{/* Optional intent restoration. */}
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{...(questionActive?{questionDecision:decision}:{}),...(relationshipQuestionId?{relationshipQuestionId}:{}),...(locale==='ko'&&voiceStyle==='honorific'?{voiceStyle}:{}),...((relationship||relationshipStage)&&tarotOnly?{participants}:{}),locale,...browserReadingContext(siteLocale),consultationAttemptId:consultationAttemptId.current,birthDetails:{birthTime:extraTime,birthPlace},productId,consultationKind:kind.id,profileId,topicId:kind.id==='ask'?topicId:kind.topic,question:kind.question||kind.partner&&relationshipQuestionId?question:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',timeUnknown,...(surveyAnswers.length?{experience:surveyAnswers}:{}),...(kind.partner&&partnerId?{partnerProfileId:partnerId}:{}),...(tarotSpread?{tarotSpreadId:tarotSpread.id,tarotInputs:plannedInputs(tarotPlan,tarotSpread)}:{})});
   if(!inline)try{sessionStorage.removeItem(loginDraftKey);}catch{/* The server snapshot now owns the consultation input. */}
   trackEvent('consultation_start',{item_id:product.cdFeatureKey,service:'yeongnyangi'});
   if(inline)return data.fortune;
   consultationAttemptId.current='';
   // A v3 tarot order is not payable until the buyer picks cards on the result page (AWAITING_DRAW).
   window.location.assign(data.fortune.paid||data.fortune.state==='AWAITING_DRAW'?resultPath(data.fortune.id,siteLocale):checkoutPath(data.fortune,siteLocale));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginWithDraft();else setError(siteLocale!=='ko'?inputCopy.consultationError:friendlyErrorMessage(e,inputCopy.consultationError));}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){const first=defaultKind(next);setKindId(first.id);setTopicId('general');setQuestion('');setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 function chooseKind(id:string){const next=consultationKinds[domain].find(k=>k.id===id)!;setKindId(id);if(next.koOnly)setLocale('ko');setPartnerId('');setError('');if(!supportsKind(product,next))setProductId(products.find(p=>consultationDomain(p)===domain&&supportsKind(p,next))!.id);}
 function chooseRelationshipEngine(next:DomainId){const tarotKind=relationshipQuestionId==='contact'?'contact':relationshipQuestionId==='reunion'?'reunion':['feelings','flirting'].includes(relationshipQuestionId)?'feelings':'compatibility';setDomain(next);setKindId(next==='tarot'?tarotKind:'compatibility');setProductId(next+'_mackerel');setTopicId('relationship');setRelationshipStage('consultation');setError('');}

 // 질문형 단계도 기본 폼과 같은 fieldProps(손댄 뒤 aria-invalid·aria-describedby)를 쓴다. 단계 안내 문단이 그 설명 대상이다.
 // 상담·결제 확인 단계에서 브라우저 뒤로가기는 질문 입력으로 돌아간다. 결제를 준비하는 동안에는 받아 두기만 한다.
 const questionCheckoutOpen=ready&&questionMode&&siteLocale==='ko'&&domain!=='fusion'&&chatStep==='checkout';
 useBackNavigation({scope:'wizard',enabled:questionCheckoutOpen,isLocked:busy,canGoBack:questionCheckoutOpen,onBack:()=>{setChatStep('question');return true;}});
 // Do not expose the legacy selector while the entry and catalog are still loading.
 if(!ready)return <p className={styles.loading} role="status">{inputCopy.catalogLoading}</p>;
 if(questionMode&&siteLocale==='ko'&&domain!=='fusion'){
  const intake:IntakeValue={domain:domain as DomainId,question,decision:decision||scopeDraft||emptyIntakeDecision(),fish:questionFish,domainFixed};
  const prep:PreparationStep[]=[];
  if(!tarotOnly){
   prep.push({id:'profile',pending:profileState.loading,prompt:voiceStyle==='honorific'?'누구의 흐름을 살펴볼까요? 저장된 프로필을 확인해 주세요.':'누구의 흐름을 살펴볼까? 저장된 프로필이 있으면 다시 적지 않아도 돼.',answer:selectedProfile?.name||'프로필 확인',valid:!guest&&!profileState.loading&&Boolean(selectedProfile),content:<ProfilePicker state={profileState} locale={siteLocale} voice={voiceStyle} onLogin={loginWithDraft}/>});
   if(selectedProfile?.birth?.timeUnknown)prep.push({id:'birth-time',prompt:voiceStyle==='honorific'?'태어난 시간을 보충해 주실 수 있나요?':'태어난 시간을 보충해 줄 수 있어?',answer:timeUnknown?'시간 미상':extraTime||'시간 미상',valid:!needsTime||Boolean(extraTime&&!timeUnknown),content:<div className={styles.form}><label>{inputCopy.timeSupplement}<BirthTimeInput  {...fieldProps('time')} value={extraTime} disabled={timeUnknown} onChange={e=>setExtraTime(e.target.value)}/></label><label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/>{inputCopy.timeUnknown}</label><p id="consultation-time-error">{needsTime?inputCopy.timeRequired:inputCopy.supplementSaved}</p></div>});
   if(selectedProfile&&!selectedProfile.location?.label)prep.push({id:'birth-place',prompt:voiceStyle==='honorific'?'지역을 확인해 주실래요?':'지역도 확인해 줄래?',answer:extraPlace||'지역 보충 없이 진행',valid:!needsPlace||Boolean(extraPlace.trim()||currentLocation),content:<div className={styles.form}><CurrentLocationButton key={profileId} locale={siteLocale} translation={readingLocationCopy(siteLocale)} disabled={busy} onLocation={value=>{setCurrentLocation(value);setExtraPlace(value.name);}}/><label>{inputCopy.placeSupplement}<input {...fieldProps('place')} maxLength={120} value={extraPlace} onChange={e=>{setExtraPlace(e.target.value);setCurrentLocation(null);}} placeholder={inputCopy.placePlaceholder}/></label><p id="consultation-place-error">{needsPlace?inputCopy.placeRequired:inputCopy.supplementSaved}</p></div>});
   if(kind.partner)prep.push({id:'partner',prompt:voiceStyle==='honorific'?'함께 비교할 상대의 프로필도 골라주세요.':'함께 비교할 상대의 프로필도 골라줘.',answer:partnerProfile?.name||'',valid:Boolean(partnerId)&&!missing.includes(inputCopy.partnerDetails),content:<div className={styles.form}><label>{inputCopy.partner}<select {...fieldProps('partner')} value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">{inputCopy.partnerSelect}</option>{profiles.filter(p=>profileKey(p)!==profileId).map(p=><option key={profileKey(p)} value={profileKey(p)}>{p.name}</option>)}</select></label>{missing.includes(inputCopy.partnerDetails)?<p role="alert" id="consultation-partner-error">{inputCopy.partnerDetails}</p>:fieldNote('partner')}</div>});
   if(experienceCheck)prep.push({id:'past-years',prompt:voiceStyle==='honorific'?'원하시면 지난 몇 해의 경험도 알려 주세요. 건너뛰어도 괜찮아요.':'원하면 지난 몇 해의 경험도 알려 줘. 건너뛰어도 괜찮아.',answer:surveyAnswers.length?experienceCopy(siteLocale).answered(surveyAnswers.length):experienceCopy(siteLocale).skipped,valid:true,content:<ExperienceSurvey check={experienceCheck} rows={experienceRows} onRows={setExperienceRows} locale={siteLocale} disabled={busy} open/>});
  }
  else {
   prep.push({id:'tarot',prompt:voiceStyle==='honorific'?'질문에 맞는 카드 배치를 확인해 볼까요?':'질문에 맞는 카드 배치를 함께 골라볼까?',answer:tarotSpreadView?.title||'타로 준비',valid:Boolean(tarotSpread&&tierAllowsSpread(product.fishId,tarotSpread)),content:<><TarotSpreadPlanner panel="spread" locale={siteLocale} question={question} onQuestion={value=>{setQuestion(value);setDecision(undefined);setChatStep('question');}} plan={tarotPlan} onPlan={plan=>{setTarotPlan(plan);setTierNotice('');}} tier={product.fishId} purposeMode={questionActive} disabled={busy} notice={tierNotice}
    onTier={(fishId,cards)=>{const next=choices.find(item=>item.fishId===fishId);if(next){setQuestionFish(next.fishId as QuestionFish);setProductId(next.id);setTierNotice(tarotSpreadCopy.tierRaised(fishName(fishId,siteLocale),cards));}}}/></>});
   for(const input of (tarotSpread?.requiredInputs||[])){
    if(!['options','period','relationStatus'].includes(input))continue;
    const panel=input as 'options'|'period'|'relationStatus';
    if(panel==='period'&&(intake.decision.period.trim()||localizedTarotQuestionFeatures(question,siteLocale).period))continue;
    const labels={options:'비교할 두 가지 선택지',period:'살펴볼 기간',relationStatus:'두 사람의 현재 관계'};
    prep.push({id:'tarot-'+panel,prompt:labels[panel]+'도 알려주세요. 아직 정하지 않았다면 그대로 넘어가도 괜찮아요.',answer:panel==='options'?[tarotPlan.options.a,tarotPlan.options.b].filter(Boolean).join(' / '):panel==='period'?(tarotPlan.period?tarotPeriods[tarotPlan.period]:''):(tarotPlan.relationStatus?tarotRelationStatuses[tarotPlan.relationStatus]:''),valid:true,content:<TarotSpreadPlanner panel={panel} locale={siteLocale} question={question} onQuestion={setQuestion} plan={tarotPlan} onPlan={setTarotPlan} tier={product.fishId} purposeMode disabled={busy} onTier={()=>{}}/>});
   }
   if(relationship)prep.push({id:'participants',prompt:voiceStyle==='honorific'?'두 사람을 어떻게 불러드릴까요?':'두 사람을 어떻게 부르면 될까?',answer:participants.self+' · '+participants.partner,valid:Boolean(participants.self.trim()&&participants.partner.trim()),content:<div className={styles.form}><label>{relationshipCopy.self}<input maxLength={40} value={participants.self} onChange={e=>setParticipants({...participants,self:e.target.value})}/></label><label>{relationshipCopy.partner}<input maxLength={40} value={participants.partner} onChange={e=>setParticipants({...participants,partner:e.target.value})}/></label><p>{relationshipCopy.symbolism}</p></div>});
  }
  prep.push({id:'language',prompt:voiceStyle==='honorific'?'결과를 어떤 언어로 읽으시겠어요?':'결과는 어떤 언어로 읽고 싶어?',answer:readingLanguageNames[locale],valid:true,content:<ReadingLanguageSelect locale={locale} siteLocale={siteLocale} fallback={fallback} disabled={busy||kind.koOnly} onChange={value=>{setLocale(value);setError('');}}/>});
  const plan=recommendQuestion(intake.domain,intake.decision,question);
  const confirmIntake=(next:IntakeValue)=>{const d={...next.decision,confirmed:true};setDecision(d);setScopeDraft(d);const fish=intakeFish(next);setQuestionFish(fish);setProductId(next.domain+'_'+fish);setDomain(next.domain);setKindId(next.domain==='tarot'?TAROT_SPREAD_KIND:d.target==='pair'?'compatibility':'ask');setTopicId(d.category);setRelationshipStage('');consultationAttemptId.current='';setError('');};
  return <QuestionCheckout value={intake} open={chatStep==='checkout'} busy={busy}
   guidanceReady={!guest&&!catalogError&&!missing.length&&!plan.missing.length&&!plan.unsupported&&available.some(p=>p.id===productId)}
   onChange={next=>{setQuestion(next.question);setQuestionFish(next.fish);setScopeDraft(next.decision);if(chatStep==='checkout')confirmIntake(next);else setDecision(undefined);}}
   onOpen={()=>{const category=questionCandidate(question)||intake.decision.category;confirmIntake({...intake,decision:{...intake.decision,category,situation:intake.decision.situation||question.slice(0,600)}});setChatStep('checkout');}}
   preparation={prep.map(item=>({...item,pending:item.pending||Boolean(restoredDraft.current)}))}
   checkout={children=><CheckoutClient draft={{product,question,chapters:previewCount,hint:[...missing,...plan.missing][0],ready:ready&&!guest&&!missing.length&&!plan.missing.length&&!plan.unsupported&&available.some(p=>p.id===productId)&&!prep.some(item=>!item.valid||item.pending),onLogin:loginWithDraft,onPrepare:()=>prepare(true),children:<>{children}
    {(missing.length>0||plan.missing.length>0)&&<ul className={styles.inputHints}>{[...missing,...plan.missing].map(message=><li key={message}>{message}</li>)}</ul>}
    {plan.unsupported&&<p role="alert">{plan.unsupported}</p>}{catalogError&&<p role="alert">{catalogError}</p>}{error&&<p role="alert">{error}</p>}
   </>}}/>}/>;
 }

 if(relationshipStage&&relationshipStage!=='consultation')return <RelationshipJourney locale={siteLocale} stage={relationshipStage} setStage={setRelationshipStage} questionId={relationshipQuestionId} onQuestion={(id,text)=>{setRelationshipQuestionId(id);setQuestion(text);}} participants={participants} onParticipants={setParticipants} profileState={profileState} partnerId={partnerId} onPartner={setPartnerId} onEngine={chooseRelationshipEngine}/>;
 return <section className={`${styles.consultation} ${styles.consultationRoom}`}>
  {relationshipStage&&<button onClick={()=>setRelationshipStage('question')}>{relationshipCopy.change}</button>}
  <header className={styles.consultationHeader}><div><h1>{ui.title}</h1><p>{ui.intro}</p></div><Moon size={36} strokeWidth={1} aria-hidden="true"/></header>
  {questionActive&&<div className={styles.systemDescription}><h2>{questionScopes[product.fishId as QuestionFish]}</h2><p>{question}</p><p>기본 상담 + 추가 질문 {FOLLOWUP_LIMITS[product.fishId as QuestionFish]}회 · {price(product.priceKRW)}</p><button onClick={()=>{setScopeDraft(decision);setDecision(undefined);}}>질문 범위 다시 선택하기</button></div>}
  {(()=>{const settings=<><ReadingLanguageSelect locale={locale} siteLocale={siteLocale} fallback={fallback} disabled={busy||kind.koOnly} onChange={value=>{setLocale(value);setError('');}}/></>;
  // 한국어 화면은 결과 언어를 기본값으로 접어 두고, 상담 종류와 생선 선택을 먼저 보인다.
  return siteLocale==='ko'?<details className={styles.readingSettings}><summary>세부 설정 · {readingLanguageNames[locale]}</summary>{settings}</details>:settings;})()}
  {!questionActive&&<a className={styles.spiritEntry} href={`/yeongnyangi/fortune/?mode=spirit&lang=${siteLocale}`}><img src="/assets/yeongnyangi/spirit/eastern-oracle.webp" width={64} height={68} alt=""/><span><strong>{spiritEntryCopy.title}</strong><br/>{spiritEntryCopy.description}</span></a>}
  {!questionActive&&<><div className={styles.tabs} role="group" aria-label={siteLocale==='ko'?'운세 종류':ui.methodTitle}>{[...Object.entries(systemNames),['fusion','복합 운세']].map(([id,label])=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{siteLocale==='ko'?label:localizedSystem(id,siteLocale)}</button>)}<a href={`/yeongnyangi/fortune/?mode=spirit&lang=${siteLocale}`}>{spiritEntryCopy.title}</a></div>
  <div className={styles.kindChoices} role="group" aria-label={siteLocale==='ko'?'상담 종류':ui.summary}>{consultationKinds[domain].filter(item=>!item.koOnly||siteLocale==='ko').sort((a,b)=>Number(b.id===TAROT_SPREAD_KIND)-Number(a.id===TAROT_SPREAD_KIND)).map(item=><button key={item.id} aria-pressed={kind.id===item.id} onClick={()=>chooseKind(item.id)}><strong>{kindLabel(item.id)}</strong>{(siteLocale==='ko'||additionalKindDescription(item.id,siteLocale))&&<span>{siteLocale==='ko'?item.description:additionalKindDescription(item.id,siteLocale)}</span>}</button>)}</div>

  </>}
  {relationship&&<div className={styles.systemDescription}><h2>{kindLabel(kind.id)}</h2><p>{relationshipAdvice[domain as DomainId]}</p>{domain==='ziwei'&&<><p>{relationshipCopy.timeHint} <a href="/yeongnyangi/fortune/?domain=tarot&consultationKind=compatibility">{localizedSystem('tarot',siteLocale)} · {relationshipCopy.entry}</a></p><p>{relationshipCopy.overseas}</p></>}</div>}
  {siteLocale!=='ko'?<div className={styles.systemDescription}><strong>{localizedSystem(domain,siteLocale)}</strong><p>{ui.method}</p></div>:domain==='fusion'?<p className={styles.systemDescription}>{fusionDescription(product)||'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'}</p>:<div className={styles.systemDescription}><strong>{systemCopy?.cardTitle}</strong><p>{systemCopy?.description}</p><p>{systemCopy?.detail}</p></div>}
  {domain==='fusion'&&<p className={styles.systemDescription}>{ui.afterPayment}</p>}
  {tarotOnly&&!tarotSpread&&<TarotConsultationGuide locale={siteLocale} kindId={kind.id} tier={product.fishId} chapterCount={previewCount}/>}
  <div className={styles.consultationDesk}>
   <aside className={styles.consultationGuide} aria-label={ui.summary}>
    <img className={styles.guideCat} src="/assets/yeongnyangi/profiles/welcome.webp" width={168} height={171} alt="Yeongnyangi"/>
    <h2>{ui.guideTitle}</h2><p>{ui.guideIntro}</p>
    <dl className={styles.consultationSummary}><div><dt>{ui.summary}</dt><dd>{tarotSpreadView?.title||kindLabel(kind.id)} · {tierLabel(product)}</dd></div><div><dt>{ui.profile}</dt><dd>{tarotOnly?localizedSystem('tarot',siteLocale):selectedProfile?.name||inputCopy.pickerPrompt}</dd></div><div><dt>{ui.structure}</dt><dd>{previewCount} {ui.chapters}</dd></div><div><dt>{ui.methodTitle}</dt><dd>{siteLocale==='ko'?readingFeatures[domain]:localizedSystem(domain,siteLocale)}</dd></div><div><dt>{ui.paymentTitle}</dt><dd>{ui.payment} · {price(product.priceKRW)}</dd></div></dl>
    <p className={styles.guideNote}><Sparkles size={16} aria-hidden="true"/>{ui.about}</p>
    {siteLocale==='ko'&&hasReviews&&<details className={styles.consultationReviews}><summary>네오 1:1 상담 실제 후기 보기</summary><p>네오가 사람 1:1 상담에서 받은 후기예요. 여기서 고르는 상담은 AI가 작성해요.</p><CustomerReviews limit={2} variant="inline"/></details>}
   </aside>
   <div className={`${styles.form} ${styles.consultationForm}`}>
   {relationship&&tarotOnly&&<><label>{relationshipCopy.self}<input maxLength={40} value={participants.self} onChange={e=>setParticipants({...participants,self:e.target.value})}/></label><label>{relationshipCopy.partner}<input maxLength={40} value={participants.partner} onChange={e=>setParticipants({...participants,partner:e.target.value})}/></label><p>{relationshipCopy.symbolism}</p></>}
   {tarotSpread?<>{guest&&<p>{inputCopy.loginHint}</p>}<TarotSpreadPlanner locale={siteLocale} question={question} onQuestion={setQuestion} plan={tarotPlan} onPlan={plan=>{setTarotPlan(plan);setTierNotice('');}} tier={product.fishId} purposeMode={questionActive} disabled={busy} notice={tierNotice}
    onTier={(fishId,cards)=>{const next=choices.find(item=>item.fishId===fishId);if(next){setProductId(next.id);setTierNotice(tarotSpreadCopy.tierRaised(fishName(fishId,siteLocale),cards));}}}/></>:tarotOnly?<section className={styles.questionIntro} lang={siteLocale}><h2>{inputCopy.tarotHeading}</h2><p>{inputCopy.tarotIntro}</p>{guest&&<p>{inputCopy.loginHint}</p>}</section>:<>
    <ProfilePicker state={profileState} locale={siteLocale}/>
    {!guest&&selectedProfile&&<div className={styles.birthDetails}>
    <label><input id="consultation-time-unknown" type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> {inputCopy.timeUnknown}</label>
    {selectedProfile?.birth?.timeUnknown&&<label>{inputCopy.timeSupplement}<BirthTimeInput  {...fieldProps('time')} value={extraTime} onChange={e=>setExtraTime(e.target.value)}/>{fieldNote('time')}</label>}
    {selectedProfile&&!selectedProfile.location?.label&&<><CurrentLocationButton key={profileId} locale={siteLocale} translation={readingLocationCopy(siteLocale)} disabled={busy} onLocation={value=>{setCurrentLocation(value);setExtraPlace(value.name);}}/>{currentLocation&&<p role="status">{inputCopy.currentLocation} {currentLocation.timezone}</p>}<label>{inputCopy.placeSupplement}<input {...fieldProps('place')} value={extraPlace} onChange={e=>{setExtraPlace(e.target.value);setCurrentLocation(null);}} placeholder={inputCopy.placePlaceholder} maxLength={120}/>{fieldNote('place')}</label></>}
    {(selectedProfile?.birth?.timeUnknown||!selectedProfile.location?.label)&&<p>{inputCopy.supplementSaved}</p>}
    {kind.partner&&<label>{inputCopy.partner}<select {...fieldProps('partner')} value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">{inputCopy.partnerSelect}</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select>{fieldNote('partner')}</label>}
    </div>}
    {experienceCheck&&<ExperienceSurvey check={experienceCheck} rows={experienceRows} onRows={setExperienceRows} locale={siteLocale} disabled={busy}/>}
   </>}
   {!questionActive&&!tarotSpread&&(kind.question||kind.partner&&relationshipQuestionId)&&<section className={styles.questionSection} aria-label={askCopy.heading} lang={siteLocale}><figure className={styles.questionPose} aria-hidden="true"><img src={`/assets/yeongnyangi/moods/${tarotOnly?'sparkle':'ponder'}.webp`} alt="" width={360} height={300} decoding="async"/></figure><h2>{tarotOnly?inputCopy.tarotHeading:askCopy.heading}</h2><p>{askCopy.intro}</p>
   {kind.id==='ask'&&<><label htmlFor="consultation-topic">{askCopy.topic}</label><select id="consultation-topic" value={topicId} onChange={e=>{setTopicId(e.target.value);trackEvent('concern_selected',{service:'yeongnyangi',domain,topic_id:e.target.value});}}><option value="general">{askCopy.general}</option>{Object.keys(topicCatalog).map(id=><option value={id} key={id}>{askCopy.topics[id as keyof typeof topicCatalog]}</option>)}</select></>}
   <label htmlFor="consultation-question">{askCopy.question}</label><textarea {...fieldProps('question')} rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={siteLocale==='ko'?tarotSpec?.prompt||askCopy.placeholder:askCopy.placeholder}/>{fieldNote('question')}
   {kind.id==='ask'&&siteLocale==='ko'&&<AskPeriodPicker question={question} onQuestion={setQuestion} disabled={busy}/>}
   </section>}
  {!questionActive&&<><h2 className={styles.selectionHeading} lang={siteLocale}>{ui.depth}</h2>
  <p lang={siteLocale}>{ui.depthHint} {kind.question&&ui.questionHint}{siteLocale==='ko'&&domain!=='fusion'&&<small> {A4_PAGE_NOTE}</small>}</p>
  {domain!=='fusion'&&<p lang={siteLocale} data-reading-depth-note>{readingDepthCopy(siteLocale).sharedTopics}</p>}
  <div className={`${styles.fishes} ${domain==='fusion'?styles.fusionChoices:''}`} role="group" aria-label={siteLocale==='ko'?'생선 상품':ui.depth}>{choices.map(item=><button key={item.id} onClick={()=>{setProductId(item.id);setTierNotice('');}} aria-pressed={productId===item.id} disabled={!!tarotSpread&&!tierAllowsSpread(item.fishId,tarotSpread)}>
   <img src={item.readingKind!=='single'?fusionIntroductionArt(item):siteLocale==='ko'?item.image:item.reactionAsset} alt="" width={240} height={108}/><strong>{tierLabel(item)}</strong><span className={styles.fishPrice}>{siteLocale==='ko'&&<LaunchPlannedPrice amount={plannedPriceFor(item.fishId,item.priceKRW)}/>}{siteLocale==='ko'&&plannedPriceFor(item.fishId,item.priceKRW)!==null&&<span className={styles.srOnly}>, 체험가 </span>}{price(item.priceKRW)}</span><span className={styles.fishScope}>{siteLocale==='ko'&&item.readingKind!=='single'?fusionPremiumManifest(item,topicId).length+1:consultationManifest(item,kind,topicId).length} {ui.chapters}{productId===item.id&&<b>{ui.selected}</b>}</span>{domain!=='fusion'&&<small>{targetRange(item)} {ui.target}</small>}{siteLocale==='ko'&&item.readingKind==='single'&&<small data-question-scope={item.fishId}>{questionScopes[item.fishId as QuestionFish]}</small>}{tarotSpread&&!tierAllowsSpread(item.fishId,tarotSpread)&&tarotSpread.minTier&&<small>{tarotSpreadCopy.tierLocked(tarotSpread.cardCount,fishName(tarotSpread.minTier,siteLocale))}</small>}{readingTierDepth(item.fishId,siteLocale)?<small data-reading-tier-depth={item.fishId}>{readingTierDepth(item.fishId,siteLocale)}</small>:siteLocale==='ko'&&<small>{fusionDescription(item)||depthDescriptions[item.fishId]}</small>}
  </button>)}</div>
  </>}
   {siteLocale==='ko'&&product.readingKind!=='single'&&<p>운세별 심화 해석과 생활 분야 상담, 실행 노트를 한 권에 담아요. 추가 질문은 {consultationBudget(product.fishId).followups}회 이용할 수 있어요. PDF의 실제 페이지 수는 상담 내용과 조판에 따라 달라져요.</p>}
   {siteLocale==='ko'&&questionActive&&product.readingKind==='single'&&<p>기본 상담과 추가 질문 {consultationBudget(product.fishId).followups}회를 합쳐 {a4Label(consultationBudget(product.fishId).total)} 분량으로 구성해요. 실제 분량은 질문과 근거에 따라 달라질 수 있어요. <small>{A4_PAGE_NOTE}</small></p>}
   <details className={styles.manifestPreview}><summary>{questionActive?question.trim()||preview[0]?.part:tarotSpreadView?.title||kindLabel(kind.id)} · {previewCount} {ui.chapters} · {ui.contents}</summary><ol>{preview.map((chapter,i)=>{
    const head=v7PartHead(preview,i,siteLocale);
    return <li key={chapter.id}>{head&&<b className={styles.partHeading}>{head}</b>}{v7Label(chapter.titleKey,siteLocale)||(siteLocale==='ko'?chapter.title:`${localizedKind(kind.id,siteLocale)} · ${i+1}`)}{questionActive&&chapter.sections&&<ul>{chapter.sections.map(section=><li key={section.id}>{section.title}</li>)}</ul>}</li>;
   })}{fusionPreview&&<li>{PREVENTION_TITLE}</li>}</ol></details>
   {siteLocale==='ko'&&product.readingKind!=='single'&&<CraftedProductDisclosure featureKey={product.cdFeatureKey}/>}
   <div className={styles.checkoutSection}><div className={styles.checkoutTotal}><span>{tierLabel(product)} · {ui.payment}</span><strong><LaunchPlannedPrice className={styles.totalPlanned} amount={plannedTotal}/>{plannedTotal!==null&&<span className={styles.srOnly}>, 체험가 </span>}{price(product.priceKRW)}</strong></div>
   <p>{ui.afterPayment}</p><p>{askCopy.language}: <b lang={locale}>{readingLanguageNames[locale]}</b> · {ui.languageHint}</p><p>{ui.priceHint}</p>
   <p>{ui.about} {ui.limits}</p>
   {missing.length>0&&<ul className={styles.inputHints}>{missing.map(message=>{const field=Object.keys(fieldMessages).find(key=>fieldMessages[key]===message);return <li key={message}>{field?<button type="button" onClick={()=>goToField(field)}>{message}</button>:message}</li>;})}</ul>}
   <button className={styles.checkoutButton} disabled={busy||(!guest&&(!ready||missing.length>0||!available.some(p=>p.id===productId)))} onClick={()=>void prepare()}>{busy?inputCopy.busy:guest?inputCopy.loginContinue:inputCopy.checkout}<ArrowRight size={18} aria-hidden="true"/></button>
   {!ready&&<p role="status">{inputCopy.catalogLoading}</p>}
   {catalogError&&<p role="alert">{siteLocale==='ko'?catalogError:inputCopy.unavailable}</p>}
   {ready&&!catalogError&&!available.some(p=>p.id===productId)&&<p>{inputCopy.unavailable}</p>}
   {error&&<p role="alert">{error}</p>}
   <a className={styles.libraryLink} href={`/yeongnyangi/library/?lang=${siteLocale}`}>{ui.library}</a>
   </div>
   </div>
  </div>
 </section>;
}
