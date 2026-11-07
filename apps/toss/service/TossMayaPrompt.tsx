import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {MAYA_PROMPT_TOPICS} from '@/src/lib/maya-prompt-generator';
import type {MayaCalendarResult} from '@/src/lib/maya-calendar';
import {useMayaCopy} from '@/src/components/maya/_lib/copy';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {api,nativeSaleProducts,onSessionInvalidated,purchase,type NativeSaleProduct} from '../src/platform';
import './toss-maya.css';

type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId:string|null};
type Result={id:string;state:'PENDING'|'COMPLETED';prompt?:string};
type RecoveryDraft={id:string;input:{year:number;month:number;day:number;name:string;birthDate:string;topic:string;question:string};createdAt:string};
type RecoveryPage={state:'UNASSIGNED'|'ASSIGNED';intentId?:string;drafts?:RecoveryDraft[];nextCursor?:string|null};
const idPattern=/^[a-f0-9]{64}$/;
const orderPattern=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const feature='maya-prompt-generator';
function validRecoveryDraft(value:unknown):value is RecoveryDraft{
 if(!value||typeof value!=='object')return false;
 const draft=value as Partial<RecoveryDraft>,input=draft.input;
 return typeof draft.id==='string'&&idPattern.test(draft.id)&&!!input&&Number.isInteger(input.year)&&Number.isInteger(input.month)&&Number.isInteger(input.day)
  &&input.month>=1&&input.month<=12&&input.day>=1&&input.day<=31&&['name','birthDate','topic','question'].every(key=>typeof input[key as keyof typeof input]==='string');
}
const primaryButton='toss-maya-action toss-maya-action--primary';
const secondaryButton='toss-maya-action toss-maya-action--secondary';
const inputStyle='toss-maya-input';
const text={
 ko:{loginError:'구매와 기록을 확인하려면 다시 로그인해 주세요.',denied:'구매 내역에 접근할 권한을 확인하지 못했어요. 구매한 계정을 확인해 주세요.',refunded:'환불된 주문은 다시 열 수 없어요.',unsupported:'현재 토스 앱에서는 구매를 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.',unavailable:'상품 등록을 확인하고 있어요.',priceChanged:'상품 정보가 바뀌었어요. 금액을 다시 확인해 주세요.',failure:'상태를 확인하지 못했어요. 결제를 시도했다면 다시 결제하지 말고 구매 내역 복구를 확인해 주세요.',pending:'결제 상태를 확인하고 있어요. 다시 결제하지 말고 구매 내역을 확인해 주세요.',badOrder:'구매한 주문을 확인하지 못했어요. 구매 내역 복구에서 다시 열어 주세요.',privacy:'결제 전 준비할 때 선택한 날짜와 상담 입력(이름·생년월일 포함)을 계정에 저장해요. 결제한 프롬프트 결과도 저장되어 다시 열 수 있어요. 결과는 한국어로 제공돼요.',login:'토스로 로그인하기',badLink:'상담 주소를 확인하지 못했어요. 구매 내역에서 다시 열어 주세요.',checking:'구매와 결과를 확인하고 있어요.',select:'내용을 선택해 복사할 수 있어요.',newPrompt:'새 프롬프트 준비하기',resume:'결제한 프롬프트 이어서 만들기',recheck:'구매 상태 다시 확인하기',date:'선택한 날짜',attach:'결제한 주문을 이 입력에 연결해요.',catalog:'상품 확인 중',catalogUnavailable:'상품 등록 확인 중',single:'단건 결제',attachButton:'결제한 프롬프트 이어가기',buy:'단건 결제로 프롬프트 만들기',retry:'상품 다시 확인하기',recovery:'구매 내역 복구하기'},
 en:{loginError:'Please sign in again to check purchases and records.',denied:'We could not confirm access to this purchase. Check the account used to buy it.',refunded:'A refunded order cannot be reopened.',unsupported:'This Toss app version does not support purchases. Update the app and try again.',unavailable:'The product is being checked.',priceChanged:'The product details changed. Please check the price again.',failure:'We could not check the status. If you tried to pay, do not pay again; check purchase recovery.',pending:'The payment status is being checked. Do not pay again; check your purchases.',badOrder:'We could not verify this order. Open it again from purchase recovery.',privacy:'The selected date and consultation input (including name and date of birth) are saved to your account when you prepare, before payment. The purchased result is also saved so you can reopen it. The prompt is provided in Korean.',login:'Sign in with Toss',badLink:'We could not verify this address. Open it again from your purchases.',checking:'Checking purchase and result.',select:'Select the text to copy it.',newPrompt:'Prepare a new prompt',resume:'Continue creating the purchased prompt',recheck:'Check purchase status again',date:'Selected date',attach:'The purchased order will be attached to this input.',catalog:'Checking product',catalogUnavailable:'Product registration is being checked',single:'one-time purchase',attachButton:'Continue with purchased prompt',buy:'Buy and create prompt',retry:'Check product again',recovery:'Recover purchases'},
};
const recoveryText={
 ko:{checking:'결제한 주문과 이전 입력을 확인하고 있어요.',choose:'이 주문에 연결할 이전 입력을 선택해 주세요.',attach:'이 입력으로 연결하기',more:'이전 입력 더 보기',newInput:'새 입력으로 연결하기',retry:'주문 다시 확인하기',none:'저장된 이전 입력을 찾지 못했어요. 새 입력을 작성해 연결할 수 있어요.',birth:'생년월일',name:'이름'},
 en:{checking:'Checking your order and saved inputs.',choose:'Choose the saved input to attach to this order.',attach:'Attach this input',more:'Show more saved inputs',newInput:'Attach a new input',retry:'Check order again',none:'No saved input was found. You can enter a new one for this order.',birth:'Date of birth',name:'Name'},
};

function errorMessage(error:unknown,t:typeof text.ko){
 const issue=error&&typeof error==='object'?error as {status?:number;code?:string;message?:string}:{};
 if(issue.status===401)return t.loginError;
 if(issue.status===403)return t.denied;
 if(['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(issue.code||''))return t.loginError;
 if(issue.code==='ACCESS_DENIED')return t.denied;
 if(issue.code==='ORDER_REFUNDED')return t.refunded;
 if(issue.code==='UNSUPPORTED_APP_VERSION'&&typeof issue.message==='string'&&issue.message.trim()&&issue.message!==issue.code)return issue.message;
 if(['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(issue.code||''))return t.unsupported;
 if(issue.code==='TOSS_PRODUCT_NOT_APPROVED'||issue.code==='TOSS_RELEASE_PENDING')return t.unavailable;
 return t.failure;
}
function remember(id:string,orderId=''){
 const url=new URL(location.href);if(id)url.searchParams.set('intentId',id);else url.searchParams.delete('intentId');
 if(orderId)url.searchParams.set('orderId',orderId);else url.searchParams.delete('orderId');history.replaceState(history.state,'',url.toString());
}

export default function TossMayaPrompt({result}:{result:MayaCalendarResult}){
 const copy=useMayaCopy(),korean=getCurrentLoadingLocale()==='ko',t=korean?text.ko:text.en,rt=korean?recoveryText.ko:recoveryText.en,auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const [name,setName]=useState(''),[birthDate,setBirthDate]=useState(''),[topic,setTopic]=useState<string>(MAYA_PROMPT_TOPICS[0]),[question,setQuestion]=useState('');
 const [sale,setSale]=useState<NativeSaleProduct|null>(null),[saleOwner,setSaleOwner]=useState(''),[catalogState,setCatalogState]=useState<'loading'|'ready'|'error'>('loading'),[catalogAttempt,setCatalogAttempt]=useState(0);
 const [intentId,setIntentId]=useState(()=>new URLSearchParams(location.search).get('intentId')||''),[orderId,setOrderId]=useState(()=>new URLSearchParams(location.search).get('orderId')||'');
 const [paid,setPaid]=useState(false),[prompt,setPrompt]=useState(''),[promptOwner,setPromptOwner]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [drafts,setDrafts]=useState<RecoveryDraft[]>([]),[draftOwner,setDraftOwner]=useState(''),[draftCursor,setDraftCursor]=useState<string|null>(null),[recoveryMode,setRecoveryMode]=useState<'idle'|'loading'|'select'|'input'|'error'>('idle');
 const epoch=useRef(0),catalogEpoch=useRef(0),busyRef=useRef(false),cleanup=useRef<null|(()=>void)>(null),previousOwner=useRef(owner);
 const textRef=useRef(t);textRef.current=t;
 const setWorking=useCallback((value:boolean)=>{busyRef.current=value;setBusy(value);},[]);
 const hide=useCallback(()=>{setPrompt('');setPromptOwner('');},[]);
 const cancelPurchase=useCallback(()=>{const cancel=cleanup.current;cleanup.current=null;try{cancel?.();}catch{/* A failed SDK cleanup must not preserve account data. */}},[]);
 const open=useCallback(async(id:string,generate=false)=>{
  if(!idPattern.test(id)||busyRef.current)return;const current=++epoch.current;setWorking(true);hide();setError('');
  try{const intent=await api<Intent>('/native/maya/intents/'+id);if(current!==epoch.current)return;if(intent.id!==id)throw new Error('RESULT_MISMATCH');
   setPaid(intent.paid);if(!intent.paid){setError(textRef.current.pending);return;}
   const row=await api<Result>('/native/maya/results/'+id,generate?{}:undefined);if(current!==epoch.current)return;
   if(row.id!==id||!['PENDING','COMPLETED'].includes(row.state)||row.state==='COMPLETED'&&(!row.prompt||!row.prompt.trim()))throw new Error('RESULT_MISMATCH');
   if(row.state==='COMPLETED'){setPrompt(row.prompt||'');setPromptOwner(owner);}
  }catch(reason){if(current===epoch.current){hide();setPaid(false);setError(errorMessage(reason,textRef.current));}}finally{if(current===epoch.current)setWorking(false);}
 },[hide,owner,setWorking]);
 const loadRecovery=useCallback(async(order:string,cursor:string|null=null)=>{
  if(busyRef.current)return;if(!orderPattern.test(order)){setRecoveryMode('error');setError(textRef.current.badOrder);return;}
  const current=++epoch.current;setWorking(true);setRecoveryMode('loading');setError('');
  try{const page=await api<RecoveryPage>('/native/maya/recovery/drafts',{orderId:order,...(cursor?{cursor}:{})});if(current!==epoch.current)return;
   if(page.state==='ASSIGNED'){
    if(!idPattern.test(page.intentId||''))throw new Error('RESULT_MISMATCH');
    const id=page.intentId!;remember(id);setOrderId('');setIntentId(id);setDrafts([]);setDraftOwner('');setWorking(false);void open(id);return;
   }
   if(page.state!=='UNASSIGNED'||!Array.isArray(page.drafts)||page.drafts.some(row=>!validRecoveryDraft(row))||(page.nextCursor!=null&&typeof page.nextCursor!=='string'))throw new Error('RESULT_MISMATCH');
   setDrafts(previous=>cursor?[...new Map([...previous,...page.drafts!].map(row=>[row.id,row])).values()]:page.drafts!);setDraftOwner(owner);setDraftCursor(page.nextCursor||null);setRecoveryMode(cursor||page.drafts.length?'select':'input');
  }catch(reason){if(current===epoch.current){setDrafts([]);setDraftOwner('');setDraftCursor(null);setRecoveryMode('error');setError(errorMessage(reason,textRef.current));}}
  finally{if(current===epoch.current)setWorking(false);}
 },[open,owner,setWorking]);
 const attachDraft=async(id:string)=>{
  if(busyRef.current||!orderPattern.test(orderId)||!idPattern.test(id)||draftOwner!==owner)return;const current=++epoch.current;setWorking(true);setError('');
  try{const data=await api<RecoveryPage>('/native/maya/recovery/attach',{orderId,intentId:id});if(current!==epoch.current)return;if(data.state!=='ASSIGNED'||data.intentId!==id)throw new Error('RESULT_MISMATCH');
   remember(id);setOrderId('');setIntentId(id);setDrafts([]);setDraftOwner('');setWorking(false);void open(id,true);
  }catch(reason){if(current===epoch.current){setDrafts([]);setDraftOwner('');setDraftCursor(null);setRecoveryMode('error');setError(errorMessage(reason,textRef.current));}}finally{if(current===epoch.current)setWorking(false);}
 };
 useEffect(()=>{let active=true;const current=++catalogEpoch.current;setSale(null);setSaleOwner('');if(!auth.isAuthenticated||!owner){setCatalogState('ready');return;}setCatalogState('loading');void nativeSaleProducts().then(items=>{if(active&&current===catalogEpoch.current){setSale(items.find(item=>item.featureKey===feature)||null);setSaleOwner(owner);setCatalogState('ready');}}).catch(reason=>{if(active&&current===catalogEpoch.current){setSale(null);setSaleOwner(owner);setCatalogState('error');setError(errorMessage(reason,textRef.current));}});return()=>{active=false;};},[owner,auth.isAuthenticated,catalogAttempt]);
 useEffect(()=>{epoch.current++;cancelPurchase();setWorking(false);hide();setPaid(false);setError('');
  if(previousOwner.current&&previousOwner.current!==owner){setName('');setBirthDate('');setQuestion('');setTopic(MAYA_PROMPT_TOPICS[0]);}
  previousOwner.current=owner;setDrafts([]);setDraftOwner('');setDraftCursor(null);setRecoveryMode('idle');const params=new URLSearchParams(location.search),currentId=params.get('intentId')||'';setIntentId(currentId);setOrderId(params.get('orderId')||'');if(auth.isAuthenticated&&owner&&idPattern.test(currentId))void open(currentId);
  return()=>{epoch.current++;};
 },[owner,auth.isAuthenticated,hide,open,setWorking,cancelPurchase]);
 useEffect(()=>{const off=onSessionInvalidated(()=>{epoch.current++;catalogEpoch.current++;cancelPurchase();hide();setSale(null);setSaleOwner('');setPaid(false);setWorking(false);setName('');setBirthDate('');setQuestion('');setTopic(MAYA_PROMPT_TOPICS[0]);setDrafts([]);setDraftOwner('');setDraftCursor(null);setRecoveryMode('error');setError(textRef.current.loginError);});return()=>{off();};},[hide,setWorking,cancelPurchase]);
 useEffect(()=>{if(auth.isAuthenticated&&owner&&orderId&&!intentId)void loadRecovery(orderId);},[auth.isAuthenticated,owner,orderId,intentId,loadRecovery]);
 useEffect(()=>{if(!auth.isAuthenticated||!owner||!idPattern.test(intentId))return;const recheck=()=>{if(!document.hidden&&!busyRef.current)void open(intentId);};document.addEventListener('visibilitychange',recheck);return()=>document.removeEventListener('visibilitychange',recheck);},[auth.isAuthenticated,owner,intentId,open]);
 useEffect(()=>{const back=(event:Event)=>{if(!event.defaultPrevented&&busyRef.current)event.preventDefault();};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[]);
 useEffect(()=>()=>{epoch.current++;cancelPurchase();},[cancelPurchase]);
 const activeSale=saleOwner===owner?sale:null;
 const toLogin=()=>{const next='/maya/'+location.search;location.assign('/login/?next='+encodeURIComponent(next));};
 const start=async()=>{
  if(busyRef.current||intentId)return;if(!auth.isAuthenticated||!owner){toLogin();return;}
  if(orderId&&!orderPattern.test(orderId)){setError(t.badOrder);return;}
  if(orderId&&recoveryMode!=='input')return;
  if(!orderId&&!activeSale){setError(t.unavailable);return;}
  const current=++epoch.current;setWorking(true);hide();setError('');
  try{
   const input={requestId:crypto.randomUUID(),year:result.gregorian.year,month:result.gregorian.month,day:result.gregorian.day,name,birthDate,topic,question};
   const intent=await api<Intent>('/native/maya/prepare',{input,...(orderId?{orderId}:{})});if(current!==epoch.current)return;
   if(!idPattern.test(intent.id)||typeof intent.paid!=='boolean')throw new Error('RESULT_MISMATCH');
   if(orderId&&(!intent.paid||intent.orderId!==orderId))throw new Error('RESULT_MISMATCH');
   if(!intent.paid){
    const latest=(await nativeSaleProducts()).find(item=>item.featureKey===feature)??null;
    if(current!==epoch.current)return;
    if(!latest||!activeSale||latest.sku!==intent.sku||latest.sku!==activeSale.sku||
       latest.approvedPriceKRW!==intent.amountKRW||latest.approvedPriceKRW!==activeSale.approvedPriceKRW||
       !latest.displayAmount||latest.displayAmount!==activeSale.displayAmount){
      setSale(latest);setSaleOwner(owner);setCatalogState(latest?'ready':'error');
      setError(t.priceChanged);
      return;
    }
    // Record the prepared intent before invoking the SDK, so an interrupted payment cannot be silently retried.
    remember(intent.id);setIntentId(intent.id);
    await new Promise<void>((resolve,reject)=>{try{cleanup.current=purchase(latest,intent.id,()=>{cleanup.current=null;resolve();},reason=>{cleanup.current=null;reject(reason);});}catch(reason){remember('');setIntentId('');reject(reason);}});
    if(current!==epoch.current)return;
   }
   remember(intent.id);setIntentId(intent.id);setPaid(true);setWorking(false);void open(intent.id,true);
  }catch(reason){if(current===epoch.current){hide();setError(errorMessage(reason,t));}}finally{if(current===epoch.current)setWorking(false);}
 };
 const newPrompt=()=>{if(busyRef.current)return;epoch.current++;hide();setPaid(false);setError('');setIntentId('');setOrderId('');setDrafts([]);setDraftOwner('');setDraftCursor(null);setRecoveryMode('idle');setName('');setBirthDate('');setQuestion('');setTopic(MAYA_PROMPT_TOPICS[0]);remember('');};
 const valid=auth.isAuthenticated&&Boolean(owner),showPrompt=valid&&promptOwner===owner&&Boolean(prompt),badId=Boolean(intentId&&!idPattern.test(intentId));
 return <section className="toss-maya rounded-lg border border-[#d8b56d]/18 bg-[#04100d]/90 p-5 text-sm leading-7 text-[#e6dcc1]">
  <h2 className="text-lg font-black text-[#f8efd2]">{copy.promptHeading}</h2><p>{copy.promptDesc}</p>
  <p>{t.privacy}</p>
  {!valid?<button className={primaryButton} type="button" onClick={toLogin}>{t.login}</button>:badId?<p role="alert">{t.badLink}</p>:intentId?<>
   {busy&&<p role="status">{t.checking}</p>}
   {showPrompt&&<><h3>{copy.resultHeading}</h3><textarea aria-label={copy.resultHeading} value={prompt} readOnly rows={12} className={inputStyle}/><p>{t.select}</p><button className={secondaryButton} type="button" disabled={busy} onClick={newPrompt}>{t.newPrompt}</button></>}
   {!showPrompt&&paid&&!busy&&<button className={primaryButton} type="button" onClick={()=>void open(intentId,true)}>{t.resume}</button>}
   {!showPrompt&&!busy&&<button className={secondaryButton} type="button" onClick={()=>void open(intentId)}>{t.recheck}</button>}
  </>:orderId&&recoveryMode!=='input'?<>
   {(recoveryMode==='loading'||recoveryMode==='idle')&&<p role="status">{rt.checking}</p>}
   {recoveryMode==='error'&&!busy&&<button className={secondaryButton} type="button" onClick={()=>void loadRecovery(orderId)}>{rt.retry}</button>}
   {recoveryMode==='select'&&draftOwner===owner&&<><p>{rt.choose}</p><ul className="toss-maya-drafts">{drafts.map(draft=><li key={draft.id}>
    <p>{draft.input.year}-{String(draft.input.month).padStart(2,'0')}-{String(draft.input.day).padStart(2,'0')} · {draft.input.topic}</p>
    {draft.input.name&&<p>{rt.name}: {draft.input.name}</p>}{draft.input.birthDate&&<p>{rt.birth}: {draft.input.birthDate}</p>}<p>{draft.input.question}</p>
    <button className={secondaryButton} type="button" disabled={busy} onClick={()=>void attachDraft(draft.id)}>{rt.attach}</button>
   </li>)}</ul>{draftCursor&&<button className={secondaryButton} type="button" disabled={busy} onClick={()=>void loadRecovery(orderId,draftCursor)}>{rt.more}</button>}
   <button className={secondaryButton} type="button" disabled={busy} onClick={()=>setRecoveryMode('input')}>{rt.newInput}</button></>}
  </>:<>
   <p>{t.date}: {result.gregorian.labelKo}</p>
   <label className="mt-3 block">{copy.nameLabel}<input className={inputStyle} value={name} maxLength={120} onChange={event=>setName(event.target.value)}/></label>
   <label className="mt-3 block">{copy.birthDateLabel}<input className={inputStyle} type="date" value={birthDate} onChange={event=>setBirthDate(event.target.value)}/></label>
   <label className="mt-3 block">{copy.topicLabel}<select className={inputStyle} value={topic} onChange={event=>setTopic(event.target.value)}>{MAYA_PROMPT_TOPICS.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
   <label className="mt-3 block">{copy.questionLabel}<textarea className={inputStyle} value={question} maxLength={3000} onChange={event=>setQuestion(event.target.value)}/></label>
   {orderId?<p>{drafts.length?t.attach:rt.none}</p>:<p>{catalogState==='loading'||saleOwner!==owner?t.catalog:activeSale?`${activeSale.displayAmount} · ${t.single}`:t.catalogUnavailable}</p>}
   <button className={primaryButton} type="button" disabled={busy||(!orderId&&!activeSale)} onClick={()=>void start()}>{busy?t.checking:orderId?t.attachButton:t.buy}</button>
   {catalogState==='error'&&!orderId&&<button className={secondaryButton} type="button" onClick={()=>setCatalogAttempt(value=>value+1)}>{t.retry}</button>}
  </>}
  {error&&<div role="alert"><p>{error}</p><a className="mt-2 inline-block underline underline-offset-4" href="/recovery">{t.recovery}</a></div>}
 </section>;
}
