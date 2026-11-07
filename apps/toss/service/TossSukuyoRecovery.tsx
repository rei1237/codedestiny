import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {api,onSessionInvalidated} from '../src/platform';
import './toss-sukuyo-recovery.css';

type Person={name:string;birthDate:string;birthTime:string;calendarType:string;gender:string;isLeapMonth:boolean;timezone:string;timezoneOffset:string|number|null;latitude:number|null;longitude:number|null};
type Draft={id:string;input:{consultationType:'personal'|'compatibility';personA:Person;personB:Person|null;question:string;topic:string;relationshipType:string};createdAt:string};
type RecoveryPage={state:'ASSIGNED'|'UNASSIGNED';intentId?:string;drafts?:Draft[];nextCursor?:string|null};
const idPattern=/^[a-f0-9]{64}$/;
const orderPattern=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
function validDraft(value:unknown):value is Draft{
 if(!value||typeof value!=='object')return false;
 const row=value as Partial<Draft>,input=row.input;
 const validPerson=(person:Person|null)=>person&&['name','birthDate','birthTime','calendarType','gender','timezone'].every(key=>typeof person[key as 'name']==='string')&&/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)&&['solar','lunar'].includes(person.calendarType)&&typeof person.isLeapMonth==='boolean'&&(person.latitude===null||typeof person.latitude==='number'&&Number.isFinite(person.latitude))&&(person.longitude===null||typeof person.longitude==='number'&&Number.isFinite(person.longitude))&&(person.timezoneOffset===null||typeof person.timezoneOffset==='string'||typeof person.timezoneOffset==='number'&&Number.isFinite(person.timezoneOffset));
 return typeof row.id==='string'&&idPattern.test(row.id)&&typeof row.createdAt==='string'&&Number.isFinite(Date.parse(row.createdAt))&&!!input&&['question','topic','relationshipType'].every(key=>typeof input[key as 'question'|'topic'|'relationshipType']==='string')&&Boolean(validPerson(input.personA))&&(input.consultationType==='personal'?input.personB===null:input.consultationType==='compatibility'&&Boolean(validPerson(input.personB)));
}
function personDetails(person:Person){const gender=person.gender==='female'?'여성':person.gender==='male'?'남성':person.gender==='unknown'?'비공개':person.gender;return [person.birthDate,person.birthTime||'시간 미상',person.calendarType==='lunar'?(person.isLeapMonth?'음력 윤달':'음력'):'양력',gender,person.timezone,person.timezoneOffset!==null?`시간대 차이 ${person.timezoneOffset}`:'',person.latitude!==null?`위도 ${person.latitude}`:'',person.longitude!==null?`경도 ${person.longitude}`:''].filter(Boolean).join(' · ');}
function message(error:unknown){
 const e=error&&typeof error==='object'?error as {status?:number;code?:string}:{};
 if(e.status===401||e.code==='LOGIN_REQUIRED'||e.code==='SESSION_EXPIRED')return '구매한 계정으로 다시 로그인해 주세요.';
 if(e.status===403||e.code==='ACCESS_DENIED'||e.code==='ORDER_OWNERSHIP_MISMATCH')return '구매 내역에 접근할 권한을 확인하지 못했어요. 구매한 계정을 확인해 주세요.';
 if(e.code==='ORDER_REFUNDED')return '환불된 주문은 다시 열 수 없어요.';
 return '주문을 확인하지 못했어요. 다시 결제하지 말고 구매 복구를 확인해 주세요.';
}
function openIntent(id:string){location.replace('/sukuyo-compatibility-ai/?cid='+encodeURIComponent('toss_'+id));}
export default function TossSukuyoRecovery({orderId,owner,renderInput}:{orderId:string;owner:string;renderInput?:(attach:(input:Record<string,unknown>,key:string)=>Promise<void>)=>ReactNode}){
 const [rows,setRows]=useState<Draft[]>([]),[rowsOwner,setRowsOwner]=useState(''),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [inputMode,setInputMode]=useState(false);
 const epoch=useRef(0),busyRef=useRef(false);
 const working=useCallback((value:boolean)=>{busyRef.current=value;setBusy(value);},[]);
 const reset=useCallback(()=>{setRows([]);setRowsOwner('');setCursor(null);},[]);
 const load=useCallback(async(next:string|null=null)=>{
  if(busyRef.current)return;
  if(!orderPattern.test(orderId)){setError('주문 주소를 확인하지 못했어요. 구매 복구에서 다시 열어 주세요.');return;}
  const current=++epoch.current;working(true);setError('');
  try{
   const page=await api<RecoveryPage>('/native/sukuyo/recovery/drafts',{orderId,...(next?{cursor:next}:{})});
   if(current!==epoch.current)return;
   if(page.state==='ASSIGNED'){if(!idPattern.test(page.intentId||''))throw new Error('RESULT_MISMATCH');openIntent(page.intentId!);return;}
   if(page.state!=='UNASSIGNED'||!Array.isArray(page.drafts)||page.drafts.some(draft=>!validDraft(draft))||(page.nextCursor!=null&&typeof page.nextCursor!=='string'))throw new Error('RESULT_MISMATCH');
   setRows(previous=>next?[...new Map([...previous,...page.drafts!].map(row=>[row.id,row])).values()]:page.drafts!);setRowsOwner(owner);setCursor(page.nextCursor||null);setLoaded(true);
  }catch(reason){if(current===epoch.current){reset();setLoaded(false);setError(message(reason));}}
  finally{if(current===epoch.current)working(false);}
 },[orderId,owner,reset,working]);
 const attach=async(id:string)=>{
  if(busyRef.current||rowsOwner!==owner||!rows.some(row=>row.id===id)||!idPattern.test(id))return;
  const current=++epoch.current;working(true);setError('');
  try{const page=await api<RecoveryPage>('/native/sukuyo/recovery/attach',{orderId,intentId:id});if(current!==epoch.current)return;if(page.state!=='ASSIGNED'||page.intentId!==id)throw new Error('RESULT_MISMATCH');openIntent(id);}
  catch(reason){if(current===epoch.current){reset();setLoaded(false);setError(message(reason));}}
  finally{if(current===epoch.current)working(false);}
 };
 const attachNew=async(input:Record<string,unknown>,key:string)=>{
  if(busyRef.current||!loaded||rowsOwner!==owner||!orderPattern.test(orderId)||typeof key!=='string'||key.length<12)throw new Error('RESULT_MISMATCH');
  const current=++epoch.current;working(true);setError('');
  try{
   const intent=await api<{id:string;paid:boolean;orderId:string|null}>('/native/sukuyo/prepare',{orderId,input:{...input,idempotencyKey:key}});
   if(current!==epoch.current)throw new Error('SESSION_CHANGED');
   if(!idPattern.test(intent.id||'')||intent.paid!==true||intent.orderId!==orderId)throw new Error('RESULT_MISMATCH');
   const verified=await api<RecoveryPage>('/native/sukuyo/recovery/drafts',{orderId});
   if(current!==epoch.current)throw new Error('SESSION_CHANGED');
   if(verified.state!=='ASSIGNED'||verified.intentId!==intent.id)throw new Error('RESULT_MISMATCH');
   openIntent(intent.id);
  }catch(reason){if(current===epoch.current){reset();setLoaded(false);setInputMode(false);setError(message(reason));}throw reason;}
  finally{if(current===epoch.current)working(false);}
 };
 useEffect(()=>{void load();return()=>{epoch.current++;busyRef.current=false;};},[load]);
 useEffect(()=>{const off=onSessionInvalidated(()=>{epoch.current++;busyRef.current=false;setBusy(false);reset();setLoaded(false);setInputMode(false);setError('구매한 계정으로 다시 로그인해 주세요.');});return()=>{off();};},[reset]);
 useEffect(()=>{const back=(event:Event)=>{if(event.defaultPrevented)return;if(busyRef.current){event.preventDefault();return;}if(inputMode){event.preventDefault();setInputMode(false);void load();}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[inputMode,load]);
 if(inputMode&&loaded&&rowsOwner===owner&&renderInput)return <>{renderInput(attachNew)}</>;
 return <section className="toss-sukuyo-recovery"><div className="toss-sukuyo-recovery__content"><h1>결제한 숙요 상담 확인</h1><p>다시 결제하지 말고, 이 주문에 연결할 이전 입력을 선택해 주세요.</p>
  {busy&&<p role="status">주문과 저장된 입력을 확인하고 있어요.</p>}
  {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>void load()}>다시 확인하기</button></div>}
  {!busy&&loaded&&rowsOwner===owner&&rows.length===0&&<p>{renderInput?'저장된 이전 입력이 없어요. 새 입력을 작성해 이 주문에 연결할 수 있어요.':'연결할 저장 입력을 찾지 못했어요. 기록 보관함이나 고객지원에서 주문을 확인해 주세요.'}</p>}
  {!busy&&rowsOwner===owner&&rows.length>0&&<ul>{rows.map(row=><li key={row.id}><p>{row.input.personA.name||'나'} · {personDetails(row.input.personA)}</p>{row.input.personB&&<p>{row.input.personB.name||'상대'} · {personDetails(row.input.personB)}</p>}<p>{row.input.relationshipType} · {row.input.topic}</p><p>{row.input.question}</p><p>{new Date(row.createdAt).toLocaleString('ko-KR')}</p><button type="button" disabled={busy} onClick={()=>void attach(row.id)}>이 입력으로 상담 이어가기</button></li>)}</ul>}
  {!busy&&rowsOwner===owner&&cursor&&<button type="button" disabled={busy} onClick={()=>void load(cursor)}>이전 입력 더 보기</button>}
  {!busy&&loaded&&rowsOwner===owner&&renderInput&&<button type="button" onClick={()=>setInputMode(true)}>새 입력으로 연결하기</button>}
  <a href="/records/">기록 보관함 열기</a>
 </div></section>;
}
