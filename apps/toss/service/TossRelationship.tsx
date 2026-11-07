import {useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {RelationshipReportHero,RelationshipReportChapters} from '@/app/relationship-boundary-test/RelationshipReportParts';
import type {Grade} from '@/app/relationship-boundary-test/scenes';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import TossSessionScope from '../src/TossSessionScope';
import {api,canonicalResponse,nativeSaleProducts,paymentRequiresReview,purchase} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import '@/app/relationship-boundary-test/relationship-boundary.css';
import './toss-relationship.css';

type Person={gender:''|'female'|'male';birthDate:string;birthTime:string;birthTimeUnknown:boolean;calendarType:'solar'|'lunar';isLeapMonth:boolean};
type Report={sessionId:string;status:string;mode?:string;sceneIds?:string[];score:number;grade:Grade;character:{title:string;caption:string};scoreFactors:string[];summary:string;sections:{title:string;body:string}[];finalMessage:string;completedParts?:string[];totalParts?:number};
type Payload={ok?:boolean;reason?:string;message?:string;retryable?:boolean;sessionId?:string;resumeBody?:{resumeSessionId?:string};completedParts?:string[];totalParts?:number}&Partial<Report>;
type Intent={id:string;sku:string;paid:boolean;amountKRW:number;orderId?:string|null};
const blank=():Person=>({gender:'',birthDate:'',birthTime:'',birthTimeUnknown:false,calendarType:'solar',isLeapMonth:false});
const validId=(value:unknown):value is string=>typeof value==='string'&&/^(?:rbt_[a-zA-Z0-9_:-]{8,120}|toss_[a-f0-9]{64})$/.test(value);
const validOrder=(value:string)=>/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value);
function reportOf(value:Payload):Report|null{
 if(!validId(value.sessionId)||!['low','medium','high'].includes(String(value.grade))||typeof value.score!=='number'||!Number.isFinite(value.score)||value.score<0||value.score>100||!value.character||typeof value.character.title!=='string'||typeof value.character.caption!=='string'||!Array.isArray(value.scoreFactors)||!value.scoreFactors.every(item=>typeof item==='string')||!Array.isArray(value.sections)||!value.sections.every(item=>item&&typeof item.title==='string'&&typeof item.body==='string')||typeof value.summary!=='string'||typeof value.finalMessage!=='string')return null;
 return value as Report;
}
function message(error:unknown){
 const issue=error&&typeof error==='object'?error as {status?:number;code?:string;message?:string}:{};
 if(issue.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(issue.code||''))return '기록과 구매를 확인하려면 토스 로그인이 필요해요.';
 if(issue.code==='ORDER_REFUNDED'||issue.code==='PAYMENT_REVOKED')return '취소·환불된 상담은 다시 열 수 없어요. 구매 내역을 확인해 주세요.';
 if(issue.status===403||issue.code==='ACCESS_DENIED')return '구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정을 확인해 주세요.';
 if(issue.code==='GENERATION_FAILED')return '상담 생성이 완료되지 않았어요. 추가 결제하지 말고 구매 내역을 확인하거나 고객지원에 문의해 주세요.';
 if(issue.code==='UNSUPPORTED_APP_VERSION'&&issue.message&&issue.message!==issue.code)return issue.message;
 if(['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(issue.code||''))return '현재 토스 앱에서는 이 기능을 지원하지 않아요. 앱을 업데이트한 뒤 다시 확인해 주세요.';
 if(issue.code==='SESSION_CHANGED')return '로그인 상태가 바뀌었어요. 다시 확인해 주세요.';
 if(issue.code==='PRODUCT_PRICE_CHANGED')return '상품 정보가 바뀌었어요. 표시된 금액을 다시 확인해 주세요.';
 return '상담을 확인하지 못했어요. 결제가 완료되었다면 다시 결제하지 말고 구매 내역을 확인해 주세요.';
}
function PersonFields({title,value,onChange}:{title:string;value:Person;onChange:(value:Person)=>void}){
 const id=title==='대상자'?'target':'self';
 return <fieldset className="tr-person"><legend>{title} 정보</legend>
  <label htmlFor={id+'-gender'}>성별</label><select id={id+'-gender'} value={value.gender} onChange={event=>onChange({...value,gender:event.target.value as Person['gender']})}><option value="">선택해 주세요</option><option value="female">여성</option><option value="male">남성</option></select>
  <label htmlFor={id+'-date'}>생년월일</label><input id={id+'-date'} type="date" value={value.birthDate} onChange={event=>onChange({...value,birthDate:event.target.value})}/>
  <label htmlFor={id+'-calendar'}>달력 기준</label><select id={id+'-calendar'} value={value.calendarType} onChange={event=>onChange({...value,calendarType:event.target.value as Person['calendarType'],isLeapMonth:false})}><option value="solar">양력</option><option value="lunar">음력</option></select>
  {value.calendarType==='lunar'&&<label className="tr-check"><input type="checkbox" checked={value.isLeapMonth} onChange={event=>onChange({...value,isLeapMonth:event.target.checked})}/>윤달입니다</label>}
  <label htmlFor={id+'-time'}>출생 시각</label><input id={id+'-time'} type="time" disabled={value.birthTimeUnknown} value={value.birthTime} onChange={event=>onChange({...value,birthTime:event.target.value})}/>
  <label className="tr-check"><input type="checkbox" checked={value.birthTimeUnknown} onChange={event=>onChange({...value,birthTimeUnknown:event.target.checked,birthTime:event.target.checked?'':value.birthTime})}/>출생 시각을 모릅니다</label>
 </fieldset>;
}
export default function TossRelationship(){return <TossSessionScope><RelationshipScreen/></TossSessionScope>;}
function RelationshipScreen(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const initial=useRef(typeof window==='undefined'?new URLSearchParams():new URLSearchParams(location.search));
 const directId=initial.current.get('sessionId')||'',orderId=initial.current.get('orderId')||'';
 const [target,setTarget]=useState(blank),[self,setSelf]=useState(blank),[includeSelf,setIncludeSelf]=useState(false),[price,setPrice]=useState<TossTeaPriceSelection|null>(null);
 const [result,setResult]=useState<Report|null>(null),[pendingId,setPendingId]=useState(()=>validId(directId)?directId:''),[authorized,setAuthorized]=useState(false),[retryable,setRetryable]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[completed,setCompleted]=useState(false);
 const alive=useRef(false),epoch=useRef(0),lock=useRef(false),checkout=useRef<null|(()=>void)>(null),requestController=useRef<AbortController|null>(null),requestId=useRef('');
 const current=(value:number)=>alive.current&&epoch.current===value;
 const begin=()=>{if(lock.current)return 0;lock.current=true;setBusy(true);setError('');return ++epoch.current;};
 const finish=(value:number)=>{if(current(value)){lock.current=false;setBusy(false);}};
 const onPrice=useCallback((value:TossTeaPriceSelection|null)=>setPrice(value),[]);
 const remember=(id:string)=>{const url=new URL(location.href);url.searchParams.delete('orderId');url.searchParams.set('sessionId',id);history.replaceState(history.state,'',url);};
 async function call(path:string,body:unknown,run:number){
  const controller=new AbortController();requestController.current=controller;const timer=setTimeout(()=>controller.abort(),70000);
  try{
   const request=new Request(location.origin,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
   const response=await canonicalResponse('/canonical/relationship-boundary-test/'+path,request);let data:Payload;
   try{data=await response.json() as Payload;}catch(reason){if((reason as {code?:string})?.code==='SESSION_CHANGED')throw reason;if(!response.ok)throw Object.assign(new Error('REQUEST_FAILED'),{status:response.status,code:'REQUEST_FAILED'});throw new Error('INVALID_RESPONSE');}
   if(!current(run))throw Object.assign(new Error('SESSION_CHANGED'),{code:'SESSION_CHANGED'});
   if(!response.ok)throw Object.assign(new Error(data.reason||'REQUEST_FAILED'),{status:response.status,code:data.reason||'REQUEST_FAILED'});
   return {status:response.status,data};
  }finally{clearTimeout(timer);if(requestController.current===controller)requestController.current=null;}
 }
 function accept(status:number,data:Payload){
  if(data.ok!==true||!validId(data.sessionId)||![200,202].includes(status))throw new Error('INVALID_RESPONSE');
  if(status===202&&(!validId(data.resumeBody?.resumeSessionId)||data.resumeBody?.resumeSessionId!==data.sessionId))throw new Error('INVALID_RESPONSE');
  const report=reportOf(data);if(status===200&&(!report||data.status!=='completed'||report.sections.length!==5||report.sections.some(section=>!section.title.trim()||!section.body.trim())||!report.character.title.trim()||!report.character.caption.trim()||!report.summary.trim()||!report.finalMessage.trim()||!report.scoreFactors.length||report.scoreFactors.some(factor=>!factor.trim())))throw new Error('INVALID_RESPONSE');
  if(status===202&&(!['generating','partial','delivery_pending'].includes(data.status||'')||(!report&&!data.sessionId.startsWith('toss_'))))throw new Error('INVALID_RESPONSE');
  setPendingId(data.sessionId);setAuthorized(true);setRetryable(status===202&&data.retryable!==false);setCompleted(status===200);if(report)setResult(report);remember(data.sessionId);
  return {id:data.sessionId,retryable:data.retryable!==false};
 }
 async function waves(id:string,run:number){
  let next=id;
  for(let count=0;count<14&&current(run)&&document.visibilityState!=='hidden';count++){
   const {status,data}=await call('generate',{resumeSessionId:next},run);const state=accept(status,data);next=state.id;
   if(status===200){setNotice('상담 결과를 준비했어요.');return;}
   if(!state.retryable){setNotice('저장된 상담을 확인해 주세요. 추가 확인이 필요하면 고객지원에 문의해 주세요.');return;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(current(run))setNotice('저장된 상담을 같은 주문으로 다시 확인할 수 있어요.');
 }
 async function read(id:string,continueAfter=false){
  if(!validId(id))return;const run=begin();if(!run)return;setResult(null);setAuthorized(false);setNotice('');
  try{const {status,data}=await call('result?sessionId='+encodeURIComponent(id),undefined,run);const state=accept(status,data);if(status===202&&continueAfter&&state.retryable)await waves(state.id,run);}
  catch(reason){if(current(run)){setResult(null);setAuthorized(false);setError(message(reason));}}finally{finish(run);}
 }
 useLayoutEffect(()=>{epoch.current++;requestController.current?.abort();try{checkout.current?.();}catch{/* Recovery is rechecked on the next session. */}checkout.current=null;lock.current=false;setBusy(false);setTarget(blank());setSelf(blank());setIncludeSelf(false);setResult(null);setPendingId(validId(directId)?directId:'');setAuthorized(false);setRetryable(false);setCompleted(false);setPrice(null);setNotice('');setError('');requestId.current='';},[owner,directId]);
 useEffect(()=>{alive.current=true;if(auth.isAuthenticated&&owner){if(directId)void read(directId);else if(!orderId){const run=begin();if(run)void (async()=>{try{const {status,data}=await call('result?pending=1',undefined,run);accept(status,data);}catch(reason){if(current(run)&&(reason as {status?:number})?.status!==404)setError(message(reason));}finally{finish(run);}})();}}
  return()=>{alive.current=false;epoch.current++;requestController.current?.abort();try{checkout.current?.();}catch{/* A failed cleanup remains subject to purchase review. */}checkout.current=null;};
 // A new Toss credential remounts this subtree via TossSessionScope.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[owner,auth.isAuthenticated]);
 useEffect(()=>{const back=(event:Event)=>{if(busy){event.preventDefault();setNotice('상담을 확인하고 있어요. 잠시 후 다시 시도해 주세요.');return;}if(result||pendingId){event.preventDefault();setResult(null);if(completed){setPendingId('');setAuthorized(false);setCompleted(false);const url=new URL(location.href);url.searchParams.delete('sessionId');history.replaceState(history.state,'',url);}return;}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[busy,result,pendingId,completed]);
 useEffect(()=>{const leave=()=>{epoch.current++;requestController.current?.abort();let cleanupError:unknown;try{checkout.current?.();}catch(reason){cleanupError=reason;}checkout.current=null;lock.current=false;setBusy(false);setResult(null);setAuthorized(false);if(cleanupError)setError(message(cleanupError));else if(paymentRequiresReview())setError('결제 상태를 확인하고 있어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.');};const returnToPage=()=>{if(!document.hidden&&pendingId&&!lock.current)void read(pendingId);};const visibility=()=>{if(document.hidden){if(!checkout.current){epoch.current++;requestController.current?.abort();lock.current=false;setBusy(false);setResult(null);setAuthorized(false);}}else returnToPage();};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',returnToPage);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',returnToPage);document.removeEventListener('visibilitychange',visibility);};},[pendingId]);
 async function submit(event:FormEvent){
  event.preventDefault();if(pendingId){if(authorized)void read(pendingId,true);else void read(pendingId);return;}
  if(orderId&&!validOrder(orderId)){setError('선택한 주문을 확인하지 못했어요. 구매 내역에서 다시 열어 주세요.');return;}
  const valid=(value:Person)=>Boolean(value.gender&&value.birthDate&&(value.birthTimeUnknown||value.birthTime));
  if(!valid(target)||(includeSelf&&!valid(self))){setError('성별과 생년월일, 출생 시각 또는 시각 미상을 확인해 주세요.');return;}
  if(!orderId&&(!price||price.owner!==owner||price.featureKey!=='relationship-boundary-test')){setError('토스 상품을 확인한 뒤 다시 시도해 주세요.');return;}
  if(paymentRequiresReview()){setError('결제 상태를 확인하고 있어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.');return;}
  const run=begin();if(!run)return;
  try{
   if(!requestId.current){if(!crypto.randomUUID)throw new Error('REQUEST_FAILED');requestId.current='rbt-'+crypto.randomUUID();}
   const clean=(value:Person)=>({...value,birthTime:value.birthTimeUnknown?'':value.birthTime,isLeapMonth:value.calendarType==='lunar'&&value.isLeapMonth});
   const input={idempotencyKey:requestId.current,targetInfo:clean(target),...(includeSelf?{selfInfo:clean(self)}:{})};
   const intent=await api<Intent>('/native/relationship/prepare',{input,...(orderId?{orderId}:{})});
   if(!current(run))return;
   if(!/^[a-f0-9]{64}$/.test(intent?.id||'')||typeof intent.paid!=='boolean'||typeof intent.sku!=='string'||!intent.sku||!Number.isSafeInteger(intent.amountKRW)||intent.amountKRW<=0||(!orderId&&intent.sku!==price?.sku))throw new Error('INVALID_RESPONSE');
   if(orderId&&(!intent.paid||intent.orderId!==orderId))throw new Error('INVALID_RESPONSE');
   if(!intent.paid){
    const fresh=await nativeSaleProducts();if(!current(run))return;
    if(!fresh.some(item=>item.featureKey==='relationship-boundary-test'&&item.sku===intent.sku&&item.approvedPriceKRW===intent.amountKRW&&item.displayAmount===price?.displayAmount))throw Object.assign(new Error('PRODUCT_PRICE_CHANGED'),{code:'PRODUCT_PRICE_CHANGED'});
    await new Promise<void>((resolve,reject)=>{let settled=false;const stop=purchase({sku:intent.sku},intent.id,()=>{settled=true;checkout.current=null;resolve();},reason=>{settled=true;checkout.current=null;reject(reason);});if(!settled)checkout.current=stop;else stop();});
    if(!current(run))return;
   }
   const id='toss_'+intent.id;setPendingId(id);setAuthorized(true);setRetryable(true);remember(id);await waves(id,run);
  }catch(reason){if(current(run)){setResult(null);setAuthorized(false);setError(message(reason));}}finally{finish(run);}
 }
 const edit=(setter:(value:Person)=>void,value:Person)=>{requestId.current='';setter(value);setError('');};
 if(!auth.isAuthenticated||!owner)return <main className="rt-page toss-relationship"><section className="rt-shell rt-body"><h1 className="rt-title">관계 경계 리포트</h1><p className="rt-subtitle">토스로 로그인한 뒤 상담을 확인할 수 있어요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></section></main>;
 return <main className="rt-page toss-relationship"><div className="rt-shell">
  {result?<><RelationshipReportHero grade={result.grade} score={result.score}/><article className="rt-body"><h1 className="rt-title">관계 경계 리포트</h1><p className="rt-subtitle">{result.mode==='couple'?'두 사람의 소통과 관계 흐름을 함께 읽어요. 경계 지수는 궁합 점수나 외도 확률이 아니에요.':'사주를 바탕으로 관계의 경향을 살펴봐요. 실제 외도 여부나 상대의 속마음을 판정하지 않아요.'}</p><p className="tr-note">AI가 작성한 참고 해석이에요.</p><div className="rt-summary"><h2>{result.character.title}</h2><p>{result.character.caption}</p><p>{result.summary}</p></div><h2 className="rt-why-title">이런 흐름이 나온 이유</h2><ul className="rt-factor-list">{result.scoreFactors.map((factor,index)=><li className="rt-factor-item" key={index}>{factor}</li>)}</ul><RelationshipReportChapters sections={result.sections} mode={result.mode} sceneIds={result.sceneIds}/>{result.finalMessage&&<div className="rt-one-line"><strong>마지막 메시지</strong><p>{result.finalMessage}</p></div>}{!completed&&<div className="tr-status"><p role="status">{Array.isArray(result.completedParts)&&typeof result.totalParts==='number'?`${result.completedParts.length} / ${result.totalParts}개 부분 저장`:'저장된 상담을 확인하고 있어요.'}</p>{authorized&&retryable&&<button type="button" disabled={busy} onClick={()=>void read(pendingId,true)}>같은 상담 이어서 확인하기</button>}</div>}</article></>:<><figure className="rt-visual"><img src="/fuctionassets/saju-relationship-temptation-768.webp" width="768" height="576" alt="식당에서 대화하는 두 사람과 이를 바라보는 연인을 그린 장면"/><figcaption>한 장면으로 단정하지 않고, 관계를 지키는 선택을 함께 읽습니다.</figcaption></figure><section className="rt-body"><h1 className="rt-title">관계 경계 리포트</h1><p className="rt-subtitle">사주를 바탕으로 관계의 경향과 대화의 선택을 살펴봐요. 실제 외도 여부나 상대의 속마음을 판정하지 않아요.</p>
   {pendingId?<div className="rt-summary"><p>{authorized?'저장된 상담을 같은 주문으로 확인할 수 있어요.':'구매 내역을 확인한 뒤 상담을 이어갈 수 있어요.'}</p>{(!authorized||retryable)&&<button type="button" disabled={busy} onClick={()=>void read(pendingId,authorized)}>{authorized?'같은 상담 이어서 확인하기':'구매 내역 다시 확인하기'}</button>}{authorized&&!retryable&&<p>추가 확인이 필요하면 고객지원에 문의해 주세요.</p>}</div>:<form onSubmit={event=>void submit(event)}><PersonFields title="대상자" value={target} onChange={value=>edit(setTarget,value)}/><label className="tr-check"><input type="checkbox" checked={includeSelf} onChange={event=>{setIncludeSelf(event.target.checked);requestId.current='';}}/>본인 정보로 두 사람의 관계도 함께 보기</label>{includeSelf&&<PersonFields title="본인" value={self} onChange={value=>edit(setSelf,value)}/>}<p className="tr-note">입력한 정보는 상담 생성과 구매 복구에 사용돼요.</p>{orderId?<p>입력을 확인한 뒤 선택한 주문을 조회해요.</p>:<p>상품 금액: <TossTeaPrice featureKey="relationship-boundary-test" onPrice={onPrice}/></p>}<button className="tr-primary" type="submit" disabled={busy||(!orderId&&!price)}>{busy?'상담을 확인하고 있어요':orderId?'입력 확인하고 주문 연결하기':'단건 결제로 상담 시작하기'}</button></form>}
  </section></>}
  {busy&&<p className="tr-status" role="status">상담을 확인하고 있어요.</p>}{notice&&<p className="tr-status" role="status">{notice}</p>}{error&&<div className="tr-status" role="alert"><p>{error}</p>{pendingId&&<button type="button" disabled={busy} onClick={()=>void read(pendingId)}>구매 내역 다시 확인하기</button>}<a href="/recovery">구매 내역 복구하기</a></div>}
 </div></main>;
}
