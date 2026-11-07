import {useCallback,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import TossSessionScope from '../src/TossSessionScope';
import {api,nativeSaleProducts,paymentRequiresReview,purchase} from '../src/platform';
import {SERVICE_AVAILABLE} from '../src/release';
import TossTeaPrice from './TossTeaPrice';
import {buildTreeSvg} from './pet-tree.mjs';
import './toss-pet-saju.css';

type Item={key:string;labelKo:string;emoji?:string;keywords?:string[];note?:string};
type Catalog={species:Item[];breeds:Record<string,Item[]>;traits:Item[];activityLevels:Item[];environments:Item[];companions:Item[]};
type Pet={name:string;species:string;breed:string;birthDate:string;birthTime:string;birthTimeUnknown:boolean;gender:string;activityLevel:string;environment:string;companion:string;traits:string[]};
type Chart={name:string;species:Item;breed:Item|null;stage:{labelKo:string;ageYears:number};environment:{labelKo:string;companionLabelKo:string};natal:{pillars:Record<string,string>;timeUnknown:boolean};elements:{key:string;percent:number}[];balance:{usefulElement:string;excessElement:string};today:{date:string;ganji:string;element:string};metrics:{key:string;labelKo:string;emoji:string;value:number;inverted:boolean}[];tree:{leaves:number;blossoms:number;trunk:number;fruits:number;pond:number};daily:{key:string;labelKo:string;emoji:string;stars:number;text:string}[];summary:{headline:string;paragraphs:string[]}};
type Frame={sheet:'animals'|'companions';x:number;y:number;w:number};
const frames:Record<string,Frame>={bichon:{sheet:'animals',x:0,y:32,w:227},chihuahua:{sheet:'animals',x:233,y:38,w:216},dachshund:{sheet:'animals',x:450,y:30,w:237},puppyTan:{sheet:'animals',x:687,y:39,w:219},borderCollie:{sheet:'animals',x:912,y:33,w:223},poodle:{sheet:'animals',x:1135,y:38,w:214},spitzWhite:{sheet:'animals',x:1353,y:53,w:183},catSilverTabby:{sheet:'animals',x:7,y:307,w:232},russianBlue:{sheet:'animals',x:239,y:320,w:207},bengal:{sheet:'animals',x:464,y:316,w:208},ragdoll:{sheet:'animals',x:672,y:305,w:237},scottishFold:{sheet:'animals',x:921,y:333,w:196},persian:{sheet:'animals',x:1122,y:322,w:223},siamese:{sheet:'animals',x:1347,y:333,w:189},catBrownTabby:{sheet:'animals',x:15,y:584,w:212},norwegianForest:{sheet:'animals',x:227,y:560,w:249},calico:{sheet:'animals',x:485,y:580,w:226},lizard:{sheet:'animals',x:1,y:836,w:178},turtle:{sheet:'animals',x:222,y:802,w:222},mouse:{sheet:'animals',x:477,y:826,w:180},fish:{sheet:'animals',x:670,y:813,w:207},bichonSoft:{sheet:'companions',x:38,y:26,w:340},creamFluffy:{sheet:'companions',x:405,y:19,w:346},catOrangeTabby:{sheet:'companions',x:1135,y:13,w:353},corgi:{sheet:'companions',x:40,y:360,w:341},shiba:{sheet:'companions',x:416,y:358,w:341},pomeranian:{sheet:'companions',x:773,y:368,w:333},rabbit:{sheet:'companions',x:1144,y:387,w:320},hamster:{sheet:'companions',x:65,y:713,w:295},hedgehog:{sheet:'companions',x:422,y:703,w:302},budgie:{sheet:'companions',x:813,y:714,w:286}};
const breeds:Record<string,Record<string,string>>={dog:{generic:'puppyTan',mixed:'puppyTan',golden_retriever:'creamFluffy',jindo:'spitzWhite',bichon:'bichon',maltese:'bichonSoft',poodle:'poodle',chihuahua:'chihuahua',dachshund:'dachshund',border_collie:'borderCollie',welsh_corgi:'corgi',shiba:'shiba',pomeranian:'pomeranian'},cat:{generic:'catSilverTabby',korean_shorthair:'catBrownTabby',russian_blue:'russianBlue',bengal:'bengal',ragdoll:'ragdoll',scottish_fold:'scottishFold',persian:'persian',siamese:'siamese',norwegian_forest:'norwegianForest',munchkin:'calico',mixed:'catOrangeTabby'}};
const speciesFrames:Record<string,string>={dog:'puppyTan',cat:'catSilverTabby',turtle:'turtle',fish:'fish',bird:'budgie',rabbit:'rabbit',hamster:'hamster',mouse:'mouse',hedgehog:'hedgehog',lizard:'lizard'};
const empty=():Pet=>({name:'',species:'',breed:'generic',birthDate:'',birthTime:'',birthTimeUnknown:true,gender:'unknown',activityLevel:'medium',environment:'balanced',companion:'alone',traits:[]});
const validList=(v:unknown):v is Item[]=>Array.isArray(v)&&v.every(item=>item&&typeof item.key==='string'&&typeof item.labelKo==='string');
function validCatalog(value:Catalog){return value&&validList(value.species)&&value.species.length>0&&value.breeds&&typeof value.breeds==='object'&&Object.values(value.breeds).every(validList)&&validList(value.traits)&&validList(value.activityLevels)&&validList(value.environments)&&validList(value.companions);}
function validChart(value:Chart){return value&&typeof value.name==='string'&&value.species&&typeof value.species.labelKo==='string'&&(value.breed===null||Boolean(value.breed&&typeof value.breed.labelKo==='string'))&&value.stage&&typeof value.stage.labelKo==='string'&&Number.isFinite(value.stage.ageYears)&&value.environment&&typeof value.environment.labelKo==='string'&&typeof value.environment.companionLabelKo==='string'&&value.natal?.pillars&&['year','month','day','hour'].every(key=>typeof value.natal.pillars[key]==='string')&&typeof value.natal.timeUnknown==='boolean'&&Array.isArray(value.elements)&&value.elements.length===5&&value.elements.every(x=>typeof x.key==='string'&&Number.isFinite(x.percent)&&x.percent>=0&&x.percent<=100)&&value.balance&&typeof value.balance.usefulElement==='string'&&typeof value.balance.excessElement==='string'&&value.today&&['date','ganji','element'].every(key=>typeof value.today[key as keyof Chart['today']]==='string')&&Array.isArray(value.metrics)&&value.metrics.every(x=>typeof x.key==='string'&&typeof x.labelKo==='string'&&typeof x.emoji==='string'&&typeof x.inverted==='boolean'&&Number.isFinite(x.value)&&x.value>=0&&x.value<=100)&&value.tree&&['leaves','blossoms','trunk','fruits','pond'].every(key=>Number.isInteger(value.tree[key as keyof Chart['tree']])&&value.tree[key as keyof Chart['tree']]>=0&&value.tree[key as keyof Chart['tree']]<=5)&&Array.isArray(value.daily)&&value.daily.every(x=>typeof x.key==='string'&&typeof x.emoji==='string'&&typeof x.labelKo==='string'&&typeof x.text==='string'&&Number.isInteger(x.stars)&&x.stars>=0&&x.stars<=5)&&value.summary&&typeof value.summary.headline==='string'&&Array.isArray(value.summary.paragraphs)&&value.summary.paragraphs.every(x=>typeof x==='string')&&!('deep' in value);}
const signature=(pet:Pet)=>JSON.stringify([pet.species,pet.breed,pet.birthDate,pet.birthTime||'',pet.environment,pet.companion,pet.activityLevel,[...pet.traits].sort().join(',')]);
function issue(error:unknown){const e=error&&typeof error==='object'?error as {status?:number;code?:string}:{};if(e.status===403)return '이용 권한을 확인할 수 없어요. 토스 계정을 확인해 주세요.';if(e.status===401)return '토스 로그인 상태를 다시 확인해 주세요.';if(e.code==='ACCESS_DENIED')return '이용 권한을 확인할 수 없어요. 토스 계정을 확인해 주세요.';if(['LOGIN_REQUIRED','SESSION_EXPIRED','SESSION_CHANGED'].includes(e.code||''))return '토스 로그인 상태를 다시 확인해 주세요.';if(e.code==='PET_INPUT_INVALID')return '생년월일과 입력한 정보를 확인해 주세요.';if(e.code==='TOSS_RELEASE_PENDING')return '서비스를 준비하고 있어요. 잠시 후 다시 확인해 주세요.';return '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';}
function accessDenied(error:unknown){const e=error&&typeof error==='object'?error as {status?:number;code?:string}:{};return e.status===401||e.status===403||['LOGIN_REQUIRED','SESSION_EXPIRED','SESSION_CHANGED','ACCESS_DENIED'].includes(e.code||'');}
function Portrait({species,breed,emoji,label}:{species:string;breed:string;emoji?:string;label:string}){const [broken,setBroken]=useState(false),frame=frames[breeds[species]?.[breed]||speciesFrames[species]];if(!frame||broken)return <span className="pet-portrait pet-portrait-symbol" role="img" aria-label={label}>{emoji||'🐾'}</span>;const style={'--fx':frame.x,'--fy':frame.y,'--fw':frame.w} as CSSProperties;return <span className="pet-portrait" style={style}><img src={'/images/pet-saju/'+frame.sheet+'.webp'} alt={label} onError={()=>setBroken(true)}/></span>;}
function Tree({tree,element}:{tree:Chart['tree'];element:string}){const host=useRef<HTMLDivElement>(null),accent:Record<string,string>={'목':'#5fd198','화':'#f08a8a','토':'#caa45a','금':'#d9d3c1','수':'#69a7f7'};const color=accent[element]||'#f4bed1';useLayoutEffect(()=>{const target=host.current;if(!target)return;target.replaceChildren(buildTreeSvg(tree,color));return()=>target.replaceChildren();},[tree,color]);return <div className="pet-tree" ref={host}/>;}
function Select({label,value,items,onChange}:{label:string;value:string;items:Item[];onChange:(v:string)=>void}){return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{items.map(item=><option key={item.key} value={item.key}>{item.labelKo}</option>)}</select></label>;}
type Kind='report'|'compat';
type Habitat={id:string;labelKo:string;category:string;stars:number};
type ReportResult={kind:'report';title:string;blueprint:Chart&{deep:{habitats:Habitat[]}};report:{personality:string[];habitats:{id:string;reading:string}[];plays:string[];coach:string;care:string;closing:string}};
type CompatPet={name:string;species:Item;excessElement:string;usefulElement:string};
type CompatResult={kind:'compat';title:string;pets:{breed:Item|null}[];compat:{score:number;grade:string;dimensions:{key:string;labelKo:string;value:number;inverted:boolean}[];sharedPlaces:{id:string;labelKo:string;category:string}[];pets:CompatPet[]};reading:{verdict:string;overview:string[];dimensions:{key:string;reading:string}[];places:{id:string;reading:string}[];cautions:string[];routine:string}};
type PaidResult=ReportResult|CompatResult;
type PaidPayload={ok?:boolean;status?:string;retryable?:boolean;reviewRequired?:boolean;busy?:boolean;retryAfterMs?:number;completedParts?:unknown;totalParts?:unknown;report?:ReportResult['report'];blueprint?:ReportResult['blueprint'];compat?:CompatResult['compat'];reading?:CompatResult['reading'];pets?:CompatResult['pets'];title?:string};
type Intent={id:string;sku:string;paid:boolean;amountKRW:number;orderId?:string|null};
type PaidRequest={kind:Kind;pets:Pet[];orderId?:string}|{intentId:string};
const PRODUCTS:Record<Kind,{featureKey:string;title:string}>={report:{featureKey:'pet-saju-ai-consultation',title:'반려동물 사주 심층 리포트'},compat:{featureKey:'pet-compatibility-ai',title:'반려동물 궁합'}};
const intentPattern=/^[a-f0-9]{64}$/,orderPattern=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const text=(value:unknown):value is string=>typeof value==='string';
const texts=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(text);
const filled=(value:unknown)=>text(value)&&value.trim().length>0;
const readings=(value:unknown,key:'id'|'key')=>Array.isArray(value)&&value.every(item=>item&&text(item[key])&&text(item.reading));
const josa=(name:string)=>{const code=name.charCodeAt(name.length-1);return code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28?'과':'와';};
function paidResult(value:PaidPayload):PaidResult|null{
 const {blueprint,report,compat,reading}=value;
 if(blueprint&&report){
  const habitats=blueprint.deep?.habitats;
  if(!text(value.title)||!text(blueprint.name)||!blueprint.species||!text(blueprint.species.key)||!filled(blueprint.summary?.headline)||!Array.isArray(habitats)||!habitats.every(item=>item&&text(item.id)&&text(item.labelKo)&&text(item.category)&&Number.isInteger(item.stars)&&item.stars>=0&&item.stars<=5))return null;
  if(!texts(report.personality)||!report.personality.length||!readings(report.habitats,'id')||!texts(report.plays)||!filled(report.coach)||!filled(report.care)||!text(report.closing))return null;
  return {kind:'report',title:value.title,blueprint,report};
 }
 if(compat&&reading){
  if(!text(value.title)||!Array.isArray(value.pets)||!Number.isFinite(compat.score)||!text(compat.grade)||!Array.isArray(compat.pets)||compat.pets.length!==2||!compat.pets.every(item=>item&&text(item.name)&&item.species&&text(item.species.key)&&text(item.excessElement)&&text(item.usefulElement)))return null;
  if(!Array.isArray(compat.dimensions)||!compat.dimensions.every(item=>item&&text(item.key)&&text(item.labelKo)&&Number.isFinite(item.value)&&typeof item.inverted==='boolean')||!Array.isArray(compat.sharedPlaces)||!compat.sharedPlaces.every(item=>item&&text(item.id)&&text(item.labelKo)&&text(item.category)))return null;
  if(!filled(reading.verdict)||!texts(reading.overview)||!readings(reading.dimensions,'key')||!readings(reading.places,'id')||!texts(reading.cautions)||!filled(reading.routine))return null;
  return {kind:'compat',title:value.title,pets:value.pets,compat,reading};
 }
 return null;
}
function paidIssue(error:unknown){
 const e=error&&typeof error==='object'?error as {status?:number;code?:string;message?:string}:{};
 if(e.code==='ORDER_REFUNDED'||e.code==='PAYMENT_REVOKED')return '취소·환불된 결과는 다시 열 수 없어요. 구매 내역을 확인해 주세요.';
 if(e.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(e.code||''))return '결과와 구매를 확인하려면 토스 로그인이 필요해요.';
 if(e.status===403||e.code==='ACCESS_DENIED'||e.code==='ORDER_OWNERSHIP_MISMATCH')return '구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정을 확인해 주세요.';
 if(e.code==='SESSION_CHANGED')return '로그인 상태가 바뀌었어요. 다시 확인해 주세요.';
 if(e.code==='PRODUCT_PRICE_CHANGED')return '상품 정보가 바뀌었어요. 표시된 금액을 다시 확인해 주세요.';
 if(e.code==='ORDER_ALREADY_ASSIGNED')return '이미 다른 결과에 연결된 주문이에요. 구매 내역에서 해당 결과를 열어 주세요.';
 if(['INPUT_MISMATCH','REQUEST_INPUT_MISMATCH','ORDER_PRODUCT_MISMATCH','ORDER_MISMATCH'].includes(e.code||''))return '주문과 입력한 정보가 맞지 않아요. 구매 내역에서 다시 열어 주세요.';
 if(e.code==='DELIVERY_REVIEW_REQUIRED'||e.code==='GENERATION_FAILED')return '결과 생성이 완료되지 않았어요. 추가 결제하지 말고 구매 내역을 확인하거나 고객지원에 문의해 주세요.';
 if(e.code==='PET_INPUT_INVALID')return '생년월일과 입력한 정보를 확인해 주세요.';
 if(e.code==='TOSS_RELEASE_PENDING')return '서비스를 준비하고 있어요. 잠시 후 다시 확인해 주세요.';
 if(e.code==='UNSUPPORTED_APP_VERSION'&&e.message&&e.message!==e.code)return e.message;
 if(['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(e.code||''))return '현재 토스 앱에서는 이 기능을 지원하지 않아요. 앱을 업데이트한 뒤 다시 확인해 주세요.';
 if(['PAYMENT_STATUS_UNCERTAIN','PAYMENT_IN_PROGRESS','RECOVERY_REQUIRED','RECOVERY_IN_PROGRESS'].includes(e.code||''))return '결제 상태를 확인하고 있어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.';
 return '결과를 확인하지 못했어요. 결제가 완료되었다면 다시 결제하지 말고 구매 내역을 확인해 주세요.';
}
function PaidView({result}:{result:PaidResult}){
 if(result.kind==='report'){const {blueprint,report}=result;return <article className="pet-result pet-paid-result"><div className="pet-result-hero"><Portrait species={blueprint.species.key} breed={blueprint.breed?.key||'generic'} label={(blueprint.name||'반려동물')+' 대표 이미지'}/><div><h2>{(blueprint.name||'우리 아이')+' 심층 리포트'}</h2><strong>{blueprint.summary.headline}</strong></div></div>
  <section><h3>성격</h3>{report.personality.map((item,index)=><p key={index}>{item}</p>)}</section>
  <section><h3>가장 편안함을 느끼는 자리</h3><ol className="pet-rank">{blueprint.deep.habitats.map(item=><li key={item.id}><p><strong>{item.labelKo}</strong> <small>{item.category}</small> <span aria-label={`5점 만점에 ${item.stars}점`}>{'★'.repeat(item.stars)}</span></p><p>{report.habitats.find(entry=>entry.id===item.id)?.reading||''}</p></li>)}</ol></section>
  {report.plays.length>0&&<section><h3>추천 놀이</h3>{report.plays.map((item,index)=><p key={index}>{item}</p>)}</section>}
  <section><h3>오늘의 행복 코치</h3><p>{report.coach}</p></section>
  <section><h3>생활 관리</h3><p>{report.care}</p>{report.closing&&<p>{report.closing}</p>}</section>
  <p className="pet-paid-note">AI가 작성한 참고 해석이며 의학적 진단을 대신하지 않아요.</p></article>;}
 const {compat,reading,pets}=result;
 return <article className="pet-result pet-paid-result"><div className="pet-paid-pair">{compat.pets.map((pet,index)=><div key={index}><Portrait species={pet.species.key} breed={pets[index]?.breed?.key||'generic'} label={(pet.name||'반려동물')+' 대표 이미지'}/><strong>{pet.name||'이름 없음'}</strong><small>강한 기운 {pet.excessElement} · 부족 {pet.usefulElement}</small></div>)}</div>
  <section><h2>{result.title}</h2><p className="pet-paid-score">궁합 점수 <strong>{compat.score}</strong> · {compat.grade}</p><p>{reading.verdict}</p>{reading.overview.map((item,index)=><p key={index}>{item}</p>)}</section>
  <section><h3>다섯 축</h3>{compat.dimensions.map(item=><div key={item.key}><div className="pet-meter"><span>{item.labelKo}{item.inverted&&<small> · 낮을수록 좋아요</small>}</span><span className="pet-track"><i style={{width:Math.max(2,Math.min(100,item.value))+'%'}}/></span><span>{item.value}</span></div><p>{reading.dimensions.find(entry=>entry.key===item.key)?.reading||''}</p></div>)}</section>
  <section><h3>함께 가면 좋은 자리</h3><ol className="pet-rank">{compat.sharedPlaces.map(item=><li key={item.id}><p><strong>{item.labelKo}</strong> <small>{item.category}</small></p><p>{reading.places.find(entry=>entry.id===item.id)?.reading||''}</p></li>)}</ol></section>
  {reading.cautions.length>0&&<section><h3>주의할 상황</h3>{reading.cautions.map((item,index)=><p key={index}>{item}</p>)}</section>}
  <section><h3>함께 지내는 하루</h3><p>{reading.routine}</p></section>
  <p className="pet-paid-note">AI가 작성한 참고 해석이며 의학적 진단을 대신하지 않아요.</p></article>;
}
const clearPaidUrl=()=>{const url=new URL(location.href);['intentId','orderId','kind'].forEach(key=>url.searchParams.delete(key));history.replaceState(history.state,'',url);};
function PetPaid({request,owner,onClose}:{request:PaidRequest;owner:string;onClose:()=>void}){
 const direct='intentId' in request?request.intentId:'',offer='kind' in request?request:null;
 const [price,setPrice]=useState<TossTeaPriceSelection|null>(null),[pendingId,setPendingId]=useState(direct),[result,setResult]=useState<PaidResult|null>(null),[progress,setProgress]=useState(''),[authorized,setAuthorized]=useState(false),[retryable,setRetryable]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const alive=useRef(false),epoch=useRef(0),lock=useRef(false),checkout=useRef<null|(()=>void)>(null),requestId=useRef('');
 const current=(run:number)=>alive.current&&epoch.current===run;
 const begin=()=>{if(lock.current)return 0;lock.current=true;setBusy(true);setError('');return ++epoch.current;};
 const finish=(run:number)=>{if(current(run)){lock.current=false;setBusy(false);}};
 const onPrice=useCallback((value:TossTeaPriceSelection|null)=>setPrice(value),[]);
 const remember=(id:string)=>{const url=new URL(location.href);url.searchParams.delete('orderId');url.searchParams.delete('kind');url.searchParams.set('intentId',id);history.replaceState(history.state,'',url);};
 function accept(data:PaidPayload){
  if(data?.ok!==true)throw new Error('INVALID_RESPONSE');
  if(data.status==='completed'){const value=paidResult(data);if(!value)throw new Error('INVALID_RESPONSE');setResult(value);setAuthorized(true);setRetryable(false);setProgress('');return 'completed';}
  if(!['generating','partial','delivery_pending'].includes(data.status||''))throw new Error('INVALID_RESPONSE');
  const open=data.retryable!==false&&data.reviewRequired!==true;
  setResult(null);setAuthorized(true);setRetryable(open);setProgress(Array.isArray(data.completedParts)&&Number.isInteger(data.totalParts)?`${data.completedParts.length} / ${data.totalParts}개 부분 저장`:'');
  return open?'pending':'review';
 }
 async function waves(id:string,run:number){
  for(let count=0;count<14&&current(run)&&document.visibilityState!=='hidden';count++){
   const data=await api<PaidPayload>('/native/pet/intents/'+id+'/generate',{});if(!current(run))return;
   const state=accept(data);
   if(state==='completed'){setNotice('');return;}
   if(state==='review'){setNotice('저장된 결과를 확인하고 있어요. 추가 결제하지 말고 고객지원에 문의해 주세요.');return;}
   const wait=Number.isInteger(data.retryAfterMs)&&Number(data.retryAfterMs)>=500&&Number(data.retryAfterMs)<=10000?Number(data.retryAfterMs):1000;
   await new Promise(resolve=>setTimeout(resolve,wait));
  }
  if(current(run))setNotice('저장된 결과를 같은 주문으로 다시 이어 받을 수 있어요.');
 }
 async function read(id:string,continueAfter=false){
  if(!intentPattern.test(id))return;const run=begin();if(!run)return;setNotice('');
  try{const data=await api<PaidPayload>('/native/pet/intents/'+id+'/result');if(!current(run))return;if(accept(data)==='pending'&&continueAfter)await waves(id,run);}
  catch(reason){if(current(run)){setResult(null);setAuthorized(false);setError(paidIssue(reason));}}finally{finish(run);}
 }
 async function start(){
  if(!offer)return;if(pendingId){void read(pendingId,authorized);return;}
  const {kind,pets,orderId}=offer,product=PRODUCTS[kind];
  if(orderId&&!orderPattern.test(orderId)){setError('선택한 주문을 확인하지 못했어요. 구매 내역에서 다시 열어 주세요.');return;}
  if(!orderId&&(!price||price.owner!==owner||price.featureKey!==product.featureKey)){setError('토스 상품을 확인한 뒤 다시 시도해 주세요.');return;}
  if(paymentRequiresReview()){setError('결제 상태를 확인하고 있어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.');return;}
  const run=begin();if(!run)return;
  try{
   if(!requestId.current){if(!crypto.randomUUID)throw new Error('REQUEST_FAILED');requestId.current=crypto.randomUUID();}
   const input=kind==='report'?{requestId:requestId.current,kind,pet:pets[0]}:{requestId:requestId.current,kind,petA:pets[0],petB:pets[1]};
   const intent=await api<Intent>('/native/pet/prepare',{input,...(orderId?{orderId}:{})});if(!current(run))return;
   if(!intentPattern.test(intent?.id||'')||typeof intent.paid!=='boolean'||!text(intent.sku)||!intent.sku||!Number.isSafeInteger(intent.amountKRW)||intent.amountKRW<=0||(!orderId&&intent.sku!==price?.sku))throw new Error('INVALID_RESPONSE');
   if(orderId&&(!intent.paid||intent.orderId!==orderId))throw new Error('INVALID_RESPONSE');
   if(!intent.paid){
    const fresh=await nativeSaleProducts();if(!current(run))return;
    if(!fresh.some(item=>item.featureKey===product.featureKey&&item.sku===intent.sku&&item.approvedPriceKRW===intent.amountKRW&&item.displayAmount===price?.displayAmount))throw Object.assign(new Error('PRODUCT_PRICE_CHANGED'),{code:'PRODUCT_PRICE_CHANGED'});
    await new Promise<void>((resolve,reject)=>{let settled=false;const stop=purchase({sku:intent.sku},intent.id,()=>{settled=true;checkout.current=null;resolve();},reason=>{settled=true;checkout.current=null;reject(reason);});if(!settled)checkout.current=stop;else stop();});
    if(!current(run))return;
   }
   setPendingId(intent.id);setAuthorized(true);setRetryable(true);remember(intent.id);await waves(intent.id,run);
  }catch(reason){if(current(run)){setAuthorized(false);setError(paidIssue(reason));}}finally{finish(run);}
 }
 const close=()=>{clearPaidUrl();onClose();};
 useEffect(()=>{alive.current=true;if(direct)void read(direct);return()=>{alive.current=false;epoch.current++;try{checkout.current?.();}catch{/* Purchase review remains on the next session. */}checkout.current=null;};
 // A new Toss credential remounts this subtree via TossSessionScope.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const back=(event:Event)=>{event.preventDefault();if(busy){setNotice('결과를 확인하고 있어요. 잠시 후 다시 시도해 주세요.');return;}close();};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);});
 useEffect(()=>{const leave=()=>{epoch.current++;let failure:unknown;try{checkout.current?.();}catch(reason){failure=reason;}checkout.current=null;lock.current=false;setBusy(false);if(failure)setError(paidIssue(failure));else if(paymentRequiresReview())setError('결제 상태를 확인하고 있어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.');};const returnToPage=()=>{if(!document.hidden&&pendingId&&!lock.current)void read(pendingId);};const visibility=()=>{if(document.hidden){if(!checkout.current){epoch.current++;lock.current=false;setBusy(false);}}else returnToPage();};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',returnToPage);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',returnToPage);document.removeEventListener('visibilitychange',visibility);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[pendingId]);
 const kind=result?.kind||offer?.kind,title=kind?PRODUCTS[kind].title:'구매한 결과';
 return <section className="pet-paid">
  {result?<PaidView result={result}/>:<div className="pet-paid-offer"><h2>{title}</h2>{offer&&<p>{offer.pets.map(pet=>pet.name).join(' · ')}</p>}
   {pendingId?<><p>{authorized?'구매가 확인된 결과를 같은 주문으로 이어 받을 수 있어요.':'구매 내역을 확인한 뒤 결과를 이어 받을 수 있어요.'}</p>{progress&&<p role="status">{progress}</p>}{(!authorized||retryable)&&<button className="pet-primary" type="button" disabled={busy} onClick={()=>void read(pendingId,authorized)}>{authorized?'같은 결과 이어서 받기':'구매 내역 다시 확인하기'}</button>}{authorized&&!retryable&&<p>추가 확인이 필요하면 고객지원에 문의해 주세요.</p>}</>
   :offer&&<><p>{offer.kind==='report'?'성격과 편안한 자리, 놀이와 생활 관리를 우리 아이의 명식에 맞춰 자세히 풀어 드려요.':'두 아이의 다섯 축과 함께 가면 좋은 자리, 주의할 상황을 자세히 풀어 드려요.'}</p><p className="pet-paid-note">AI가 작성한 참고 해석이며 의학적 진단을 대신하지 않아요. 입력한 정보는 결과 생성과 구매 복구에 사용돼요.</p>
    {offer.orderId?<p>입력한 정보로 선택한 주문을 연결해요.</p>:<p>상품 금액: <TossTeaPrice featureKey={PRODUCTS[offer.kind].featureKey} onPrice={onPrice} loginNext="/pet-saju/"/></p>}
    <button className="pet-primary" type="button" disabled={busy||(!offer.orderId&&!price)} onClick={()=>void start()}>{busy?'결과를 확인하고 있어요':offer.orderId?'선택한 주문으로 받기':offer.kind==='report'?'단건 결제로 리포트 보기':'단건 결제로 궁합 보기'}</button></>}
  </div>}
  {busy&&<p role="status" className="pet-status">결과를 확인하고 있어요.</p>}{notice&&<p role="status" className="pet-status">{notice}</p>}{error&&<div role="alert" className="pet-error"><p>{error}</p>{pendingId&&<button type="button" disabled={busy} onClick={()=>void read(pendingId)}>구매 내역 다시 확인하기</button>}<a href="/recovery">구매 내역 복구하기</a></div>}
  <button className="pet-secondary" type="button" disabled={busy} onClick={close}>돌아가기</button>
 </section>;
}
const initialParams=()=>typeof window==='undefined'?new URLSearchParams():new URLSearchParams(location.search);
function initialPaid():PaidRequest|null{const id=initialParams().get('intentId')||'';return intentPattern.test(id)?{intentId:id}:null;}
function initialOrder():{orderId:string;kind:Kind}|null{const params=initialParams(),orderId=params.get('orderId')||'',kind=params.get('kind');return !params.get('intentId')&&orderPattern.test(orderId)&&(kind==='report'||kind==='compat')?{orderId,kind}:null;}
export default function TossPetSaju(){return <TossSessionScope><PetScreen/></TossSessionScope>;}
function PetScreen(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||''),[catalog,setCatalog]=useState<Catalog|null>(null),[draft,setDraft]=useState(empty),[chart,setChart]=useState<Chart|null>(null),[saved,setSaved]=useState<Pet[]>([]),[view,setView]=useState<'species'|'breed'|'profile'|'result'|'saved'>('species'),[busy,setBusy]=useState(false),[rechecking,setRechecking]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[paid,setPaid]=useState<PaidRequest|null>(initialPaid),[order,setOrder]=useState(initialOrder),[paidKey,setPaidKey]=useState(0);
 const epoch=useRef(0),locked=useRef(false),live=useRef(false),wasHidden=useRef(false),paidRef=useRef<PaidRequest|null>(paid);
 // The paid subtree owns back, leave and resume while it is open, so a parent
 // session recheck cannot unmount an SDK checkout in progress.
 useLayoutEffect(()=>{paidRef.current=paid;},[paid]);
 useLayoutEffect(()=>{setPaid(initialPaid());setOrder(initialOrder());live.current=true;epoch.current++;locked.current=false;wasHidden.current=false;setCatalog(null);setDraft(empty());setChart(null);setSaved([]);setView('species');setBusy(false);setRechecking(false);setError('');return()=>{live.current=false;epoch.current++;};},[owner,auth.isAuthenticated]);
 useEffect(()=>{if(!auth.isAuthenticated||!owner)return;const current=++epoch.current;setBusy(true);setError('');void api<{catalog:Catalog}>('/pet-saju/catalog').then(data=>{if(!live.current||current!==epoch.current)return;if(!validCatalog(data.catalog))throw new Error('INVALID_CATALOG');setCatalog(data.catalog);}).catch(reason=>{if(live.current&&current===epoch.current)setError(issue(reason));}).finally(()=>{if(live.current&&current===epoch.current)setBusy(false);});},[owner,auth.isAuthenticated,reload]);
 useEffect(()=>{const back=(event:Event)=>{if(paidRef.current)return;if(busy||rechecking){event.preventDefault();return;}if(view!=='species'){event.preventDefault();setError('');setView(view==='result'?'profile':view==='profile'?'breed':'species');}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[view,busy,rechecking]);
 useEffect(()=>{const leave=()=>{if(paidRef.current||wasHidden.current)return;wasHidden.current=true;epoch.current++;locked.current=false;setBusy(false);setRechecking(true);setChart(null);setView(value=>value==='result'?'profile':value);};const resume=()=>{if(paidRef.current||!wasHidden.current||document.hidden||!auth.isAuthenticated||!owner)return;wasHidden.current=false;const current=++epoch.current;setBusy(true);setError('');void api<{authenticated:boolean}>('/session').then(value=>{if(!live.current||current!==epoch.current)return;if(value?.authenticated!==true)throw Object.assign(new Error('LOGIN_REQUIRED'),{status:401,code:'LOGIN_REQUIRED'});setRechecking(false);if(!catalog)setReload(x=>x+1);}).catch(reason=>{if(!live.current||current!==epoch.current)return;if(accessDenied(reason)){setCatalog(null);setDraft(empty());setSaved([]);setView('species');setRechecking(false);}else{wasHidden.current=true;setRechecking(true);}setError(issue(reason));}).finally(()=>{if(live.current&&current===epoch.current)setBusy(false);});};const visibility=()=>document.hidden?leave():resume();window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',visibility);};},[owner,auth.isAuthenticated,catalog]);
 async function calculate(pet:Pet){if(locked.current)return;locked.current=true;const current=++epoch.current;setBusy(true);setError('');setChart(null);try{const result=await api<{stored:boolean;blueprint:Chart}>('/pet-saju/blueprint',{pet});if(!live.current||current!==epoch.current)return;if(result?.stored!==false||!validChart(result.blueprint))throw new Error('INVALID_RESULT');setDraft(pet);setChart(result.blueprint);setSaved(previous=>[pet,...previous.filter(item=>signature(item)!==signature(pet))].slice(0,5));setView('result');}catch(reason){if(live.current&&current===epoch.current){if(accessDenied(reason)){setCatalog(null);setDraft(empty());setSaved([]);setView('species');}setError(issue(reason));}}finally{if(live.current&&current===epoch.current){locked.current=false;setBusy(false);}}}
 function submit(event:FormEvent){event.preventDefault();if(!draft.name.trim()||!draft.birthDate){setError('이름과 생년월일을 확인해 주세요.');return;}void calculate({...draft,name:draft.name.trim(),birthTimeUnknown:!draft.birthTime});}
 if(!auth.isAuthenticated||!owner)return <main className="pet-page"><h1>반려동물 사주</h1><p>토스로 로그인한 뒤 우리 아이의 흐름을 살펴볼 수 있어요.</p><a href={'/login/?next='+encodeURIComponent('/pet-saju/')}>토스로 로그인하기</a></main>;
 const openPaid=(request:PaidRequest)=>{setError('');setPaid(request);setPaidKey(x=>x+1);};
 const closePaid=()=>{setPaid(null);setOrder(null);};
 if(paid)return <main className="pet-page"><header className="pet-heading"><h1>반려동물 사주</h1></header><PetPaid key={paidKey} request={paid} owner={owner} onClose={closePaid}/></main>;
 const partners=saved.filter(pet=>signature(pet)!==signature(draft)),orderFor=(kind:Kind)=>order?.kind===kind?{orderId:order.orderId}:{};
 const active=catalog?.species.find(item=>item.key===draft.species),availableBreeds=catalog?.breeds[draft.species]||[{key:'generic',labelKo:'일반 / 모름'}];
 return <main className="pet-page"><header className="pet-heading"><p>우리 아이의 작은 우주</p><h1>반려동물 사주</h1><p>종과 품종, 태어난 날과 생활 환경을 바탕으로 함께하는 일상을 살펴봐요.</p></header>
 {SERVICE_AVAILABLE&&order&&<p role="status" className="pet-status">{'구매한 '+PRODUCTS[order.kind].title+'를 받으려면 '+(order.kind==='compat'?'두 아이를 차례로 살펴본 뒤 결과 화면에서 이어 받아 주세요.':'아이 정보를 입력한 뒤 결과 화면에서 이어 받아 주세요.')}</p>}{rechecking&&!busy&&<p role="status" className="pet-status">로그인 상태를 확인하고 있어요.</p>}{busy&&<p role="status" className="pet-status">{rechecking?'로그인 상태를 확인하고 있어요.':catalog?'우리 아이의 흐름을 읽고 있어요.':'선택할 정보를 불러오고 있어요.'}</p>}{error&&<div role="alert" className="pet-error"><p>{error}</p>{!catalog&&!rechecking&&<button type="button" disabled={busy} onClick={()=>setReload(x=>x+1)}>다시 불러오기</button>}{rechecking&&<button type="button" disabled={busy} onClick={()=>window.dispatchEvent(new window.Event('pageshow'))}>다시 확인하기</button>}</div>}
 {catalog&&!rechecking&&view==='species'&&<section><h2>우리 가족은 누구인가요?</h2><p>함께 지내는 동물의 종류를 선택해 주세요.</p><div className="pet-grid">{catalog.species.map(item=><button type="button" key={item.key} disabled={busy} onClick={()=>{setDraft({...empty(),species:item.key});setError('');setView('breed');}}><Portrait species={item.key} breed="generic" emoji={item.emoji} label={item.labelKo+' 대표 이미지'}/><strong>{item.labelKo}</strong><small>{item.keywords?.slice(0,3).join(' · ')}</small></button>)}</div>{saved.length>0&&<button className="pet-secondary" type="button" onClick={()=>setView('saved')}>이 화면에서 저장한 아이 보기 ({saved.length})</button>}</section>}
 {catalog&&!rechecking&&view==='breed'&&<section><h2>품종을 알려주세요</h2><p>잘 모르면 일반을 선택해 주세요.</p><div className="pet-grid">{availableBreeds.map(item=><button type="button" key={item.key} onClick={()=>{setDraft({...draft,breed:item.key});setView('profile');}}><Portrait key={draft.species+item.key} species={draft.species} breed={item.key} emoji={active?.emoji} label={item.labelKo+' 대표 이미지'}/><strong>{item.labelKo}</strong>{item.note&&<small>{item.note}</small>}</button>)}</div></section>}
 {catalog&&!rechecking&&view==='profile'&&<section><h2>우리 아이 소개</h2><p>생일은 오행 계산에, 성격과 생활 환경은 결과를 살펴보는 데 쓰여요.</p><form className="pet-form" onSubmit={submit}><fieldset disabled={busy}><label>이름<input required maxLength={20} autoComplete="off" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>생년월일<input type="date" required value={draft.birthDate} onChange={e=>setDraft({...draft,birthDate:e.target.value})}/></label><label>태어난 시각 <small>모르면 비워 두세요.</small><input type="time" value={draft.birthTime} onChange={e=>setDraft({...draft,birthTime:e.target.value})}/></label><Select label="성별" value={draft.gender} items={[{key:'unknown',labelKo:'모름 / 밝히지 않음'},{key:'male',labelKo:'수컷'},{key:'female',labelKo:'암컷'}]} onChange={gender=>setDraft({...draft,gender})}/><Select label="활동량" value={draft.activityLevel} items={catalog.activityLevels} onChange={activityLevel=>setDraft({...draft,activityLevel})}/><Select label="생활 환경" value={draft.environment} items={catalog.environments} onChange={environment=>setDraft({...draft,environment})}/><Select label="같이 사는 동물" value={draft.companion} items={catalog.companions} onChange={companion=>setDraft({...draft,companion})}/><fieldset className="pet-traits"><legend>성격 · 해당하는 것 모두</legend>{catalog.traits.map(item=><label key={item.key}><input type="checkbox" checked={draft.traits.includes(item.key)} onChange={e=>setDraft({...draft,traits:e.target.checked?[...draft.traits,item.key]:draft.traits.filter(x=>x!==item.key)})}/>{item.labelKo}</label>)}</fieldset><button className="pet-primary" type="submit">운명 읽기</button></fieldset></form></section>}
 {catalog&&!rechecking&&view==='saved'&&<section><h2>이 화면에서 저장한 아이</h2><p>이 목록은 현재 화면에서만 유지되며, 앱을 닫거나 계정이 바뀌면 사라져요.</p>{saved.length===0?<p>아직 저장한 아이가 없어요.</p>:<div className="pet-saved">{saved.map((pet,index)=><div key={index}><button type="button" disabled={busy} onClick={()=>void calculate(pet)}><strong>{pet.name}</strong><span>오늘의 흐름 다시 보기</span></button><button type="button" disabled={busy} onClick={()=>setSaved(list=>list.filter((_,i)=>i!==index))} aria-label={pet.name+' 삭제'}>삭제</button></div>)}</div>}</section>}
 {chart&&!rechecking&&view==='result'&&<section className="pet-result"><div className="pet-result-hero"><Portrait species={draft.species} breed={draft.breed} emoji={active?.emoji} label={(chart.name||'반려동물')+' 대표 이미지'}/><div><h2>{chart.name||'우리 아이'}</h2><p>{chart.species.labelKo}{chart.breed?' · '+chart.breed.labelKo:''} · {chart.stage.labelKo}</p><strong>{chart.summary.headline}</strong></div></div><section><h3>타고난 오행</h3>{chart.elements.map(item=><div className="pet-meter" key={item.key}><span>{item.key}</span><span className="pet-track"><i style={{width:item.percent+'%'}}/></span><span>{item.percent}%</span></div>)}</section><section><h3>운명의 나무</h3><Tree tree={chart.tree} element={chart.balance.usefulElement}/><p>잎은 목, 꽃은 화, 줄기는 토, 열매는 금, 연못은 수의 흐름을 보여줘요.</p></section><section><h3>행복 에너지</h3><p>명리 계산을 바탕으로 한 참고 지표이며 실제 건강이나 행동을 측정한 값은 아니에요.</p>{chart.metrics.map(item=><div className="pet-meter" key={item.key}><span>{item.emoji} {item.labelKo}{item.inverted&&<small> · 낮을수록 좋아요</small>}</span><span className="pet-track"><i style={{width:item.value+'%'}}/></span><span>{item.value}</span></div>)}</section><section><h3>명식</h3><dl className="pet-pillars">{[['year','연주'],['month','월주'],['day','일주'],['hour','시주']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{chart.natal.pillars[key]||'—'}</dd></div>)}</dl>{chart.natal.timeUnknown&&<p>태어난 시각을 몰라 시주는 계산에서 빠졌어요.</p>}</section><section><h3>오늘의 운세</h3><p>{chart.today.date} · 일진 {chart.today.ganji} ({chart.today.element})</p>{chart.daily.map(item=><article key={item.key}><h4>{item.emoji} {item.labelKo} <span aria-label={`5점 만점에 ${item.stars}점`}>{'★'.repeat(item.stars)}</span></h4><p>{item.text}</p></article>)}</section><section><h3>성격 읽기</h3>{chart.summary.paragraphs.map((text,index)=><p key={index}>{index===2?`계산상 ${chart.balance.excessElement} 기운의 비중이 상대적으로 높고 ${chart.balance.usefulElement} 기운의 비중이 낮게 나타나요. 생활 환경과 놀이를 살펴볼 때 참고해 주세요.`:text}</p>)}</section><p>사주 해석은 일상을 돌아보는 참고 자료이며 의학적 진단을 대신하지 않아요.</p>{SERVICE_AVAILABLE&&<section className="pet-paid-offers"><h3>더 자세히 알아보기</h3><button className="pet-primary" type="button" onClick={()=>openPaid({kind:'report',pets:[draft],...orderFor('report')})}>{order?.kind==='report'?'선택한 주문으로 심층 리포트 받기':chart.name+' 심층 리포트 보기'}</button>{partners.length?partners.map((pet,index)=><button className="pet-secondary" type="button" key={index} onClick={()=>openPaid({kind:'compat',pets:[draft,pet],...orderFor('compat')})}>{chart.name+josa(chart.name)+' '+pet.name+(order?.kind==='compat'?' 궁합을 선택한 주문으로 받기':' 궁합 보기')}</button>):<p>궁합을 보려면 다른 아이도 살펴봐 주세요. 이 화면에서 살펴본 아이와 함께 볼 수 있어요.</p>}</section>}<button className="pet-secondary" type="button" onClick={()=>setView('saved')}>이 화면에서 저장한 아이 보기</button><button className="pet-secondary" type="button" onClick={()=>{setDraft(empty());setChart(null);setView('species');}}>다른 아이 살펴보기</button></section>}
 </main>;
}
