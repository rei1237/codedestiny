import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Clipboard,SetClipboardTextPermissionError,Share} from '@apps-in-toss/web-framework';
import {APP_NAME} from '../src/platform';
import {usePaidDeliveryScope} from '@/app/hooks/usePaidDeliveryScope';
import {useAuthStore} from '@/app/_lib/auth-store';
import type {AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import TossFptiDictionary from './TossFptiDictionary';
import {readFptiResult,saveFptiResult} from './fpti-session.mjs';
import type {FptiAnalysisResult,FptiFormInput} from '@/lib/fpti/fpti-types';
import {analyzeFptiFromSajuSource,calculateSajuSourceFromBirth} from '@/lib/fpti/fpti-adapter';
import './toss-fpti.css';

const axisLabels:Record<string,string>={energy:'에너지',judgment:'판단',execution:'실행',vision:'시야'};
const elementLabels:Record<string,string>={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
const tenGodLabels:Record<string,string>={expression:'표현과 창조 (식상)',officer:'규범과 책임 (관성)',wealth:'성과와 실리 (재성)',resource:'학습과 통찰 (인성)',peer:'독립과 자율 (비겁)'};
const pillarLabels:Record<string,string>={year:'연주',month:'월주',day:'일주',hour:'시주'};
function bridgeIssue(error:unknown){const issue=error&&typeof error==='object'?error as {code?:string;status?:number}:{};return {denied:error instanceof SetClipboardTextPermissionError||issue.status===403||issue.code==='ACCESS_DENIED',login:issue.status===401||issue.code==='LOGIN_REQUIRED'||issue.code==='SESSION_EXPIRED',unsupported:issue.code==='UNSUPPORTED_APP_VERSION'};}
const getSession=()=>{try{return window.sessionStorage;}catch{return null;}};
const resultAddress=()=>/^\/(?:saju-fpti|fpti)\/result\/?$/.test(window.location.pathname);
const initial=():FptiFormInput=>({name:'',gender:'OTHER',birthDate:'',calendarType:'solar',birthTime:'',timeUnknown:false,birthRegion:''});
export default function TossFpti(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const [form,setForm]=useState<FptiFormInput>(initial),[result,setResult]=useState<FptiAnalysisResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const currentOwner=auth.isAuthenticated&&owner?owner:'';
 const [saved,setSaved]=useState<{owner:string;result:FptiAnalysisResult}|null>(null),[direct,setDirect]=useState(resultAddress),[storageNotice,setStorageNotice]=useState('');
 const directRef=useRef(direct),resultOwner=useRef('');directRef.current=direct;
 const [notice,setNotice]=useState(''),[permissionDenied,setPermissionDenied]=useState(false),[bridgeBusy,setBridgeBusy]=useState(false);
 const epoch=useRef(0),locked=useRef(false),phase=useRef(false),mounted=useRef(false),bridgeLock=useRef(false),bridgeEpoch=useRef(0);
 usePaidDeliveryScope(()=>{epoch.current++;bridgeEpoch.current++;phase.current=false;resultOwner.current='';setSaved(null);setStorageNotice('');setResult(null);setForm(initial());setError('');setNotice('');setPermissionDenied(false);});
 useEffect(()=>{mounted.current=true;const back=(event:Event)=>{if(event.defaultPrevented)return;if(locked.current){event.preventDefault();return;}if(phase.current){event.preventDefault();epoch.current++;phase.current=false;resultOwner.current='';bridgeEpoch.current++;setNotice('');setPermissionDenied(false);setResult(null);setError('');if(directRef.current){history.replaceState({},'','/saju-fpti/');directRef.current=false;setDirect(false);}}};window.addEventListener('code-destiny:toss-back',back);return()=>{mounted.current=false;epoch.current++;bridgeEpoch.current++;window.removeEventListener('code-destiny:toss-back',back);};},[]);
 useEffect(()=>{const restored=currentOwner?readFptiResult(getSession(),currentOwner) as FptiAnalysisResult|null:null;setSaved(restored?{owner:currentOwner,result:restored}:null);if(directRef.current){resultOwner.current=restored?currentOwner:'';phase.current=Boolean(restored);setResult(restored);}},[currentOwner]);
 const available=currentOwner&&saved?.owner===currentOwner?saved.result:null;
 const shown=result&&resultOwner.current===(currentOwner||'guest')?result:null;
 const change=<K extends keyof FptiFormInput>(key:K,value:FptiFormInput[K])=>{epoch.current++;setForm(previous=>({...previous,[key]:value}));setError('');};
 const selectProfile=(seed:AiPrefillSeed)=>{if(seed.timezone!=='Asia/Seoul'){setError('대한민국 시간대로 설정된 출생 프로필을 선택해 주세요.');return;}if(!seed.birthDate){setError('프로필의 생년월일을 확인해 주세요.');return;}epoch.current++;setForm({name:seed.name||'',gender:seed.gender==='male'?'M':seed.gender==='female'?'F':'OTHER',birthDate:seed.birthDate,calendarType:seed.calendarType==='lunar'?(seed.isLeapMonth?'lunar_leap':'lunar'):'solar',birthTime:seed.birthTime||'',timeUnknown:seed.birthTimeUnknown===true||!seed.birthTime,birthRegion:seed.city||seed.region||''});setError('');};
 const submit=async(event:FormEvent)=>{event.preventDefault();if(locked.current)return;const current=++epoch.current;locked.current=true;setBusy(true);setError('');
  try{await new Promise<void>(resolve=>window.setTimeout(resolve,0));const source=calculateSajuSourceFromBirth(form),analysis=analyzeFptiFromSajuSource(source);if(mounted.current&&epoch.current===current){phase.current=true;resultOwner.current=currentOwner||'guest';setResult(analysis);const stored=currentOwner?saveFptiResult(getSession(),currentOwner,analysis):false;setSaved(stored?{owner:currentOwner,result:analysis}:null);setStorageNotice(currentOwner?(stored?'이 탭에서 같은 계정으로 결과를 다시 볼 수 있어요.':'새 결과를 이 탭에 저장하지 못했어요. 이전 저장 결과가 남아 있을 수 있어요.'):'로그인하지 않은 상태에서는 화면을 나가면 결과가 사라져요.');window.scrollTo(0,0);}}
  catch{if(mounted.current&&epoch.current===current)setError('출생정보를 확인하지 못했어요. 날짜와 시간, 달력을 확인한 뒤 다시 시도해 주세요.');}
  finally{locked.current=false;if(mounted.current)setBusy(false);}
 };
 const exclusive=async(task:(current:number)=>Promise<void>)=>{if(bridgeLock.current)return;bridgeLock.current=true;setBridgeBusy(true);const current=bridgeEpoch.current;try{await task(current);}finally{bridgeLock.current=false;if(mounted.current)setBridgeBusy(false);}};
 const active=(current:number)=>mounted.current&&phase.current&&bridgeEpoch.current===current;
 const failure=(error:unknown,subject:string)=>{const issue=bridgeIssue(error);setPermissionDenied(subject==='클립보드'&&issue.denied);setNotice(issue.denied?subject+' 권한을 확인해 주세요.':issue.login?'로그인 상태를 확인한 뒤 다시 시도해 주세요.':issue.unsupported?'토스 앱을 업데이트한 뒤 다시 시도해 주세요.':subject+'를 완료하지 못했어요. 다시 시도해 주세요.');};
 const copy=()=>{if(!result||resultOwner.current!==(currentOwner||'guest'))return;void exclusive(async current=>{try{await Clipboard.setText(`${result.code} · ${result.typeName}\n${result.oneLiner}`);if(active(current)){setPermissionDenied(false);setNotice('결과 문구를 복사했어요.');}}catch(error){if(active(current))failure(error,'클립보드');}});};
 const share=()=>{if(!result||resultOwner.current!==(currentOwner||'guest'))return;void exclusive(async current=>{try{const link=await Share.createLink({path:`intoss://${APP_NAME}/saju-fpti/`});if(!active(current))return;if(typeof link!=='string'||!link.trim())throw new Error('INVALID_SHARE_LINK');await Share.sendMessage({message:`사주 FPTI\n${result.code} · ${result.typeName}\n${result.oneLiner}\n${link}`});if(active(current)){setPermissionDenied(false);setNotice('공유 화면을 열었어요.');}}catch(error){if(active(current))failure(error,'공유');}});};
 const requestPermission=()=>void exclusive(async current=>{try{const permission=await Clipboard.setText.openPermissionDialog();if(active(current)){setPermissionDenied(permission!=='allowed');setNotice(permission==='allowed'?'권한을 확인했어요. 복사를 다시 눌러 주세요.':'클립보드 쓰기 권한이 없어 복사할 수 없어요.');}}catch(error){if(active(current))failure(error,'클립보드');}});
 const rows=(title:string,items:string[])=>items.length?<section><h3>{title}</h3><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>:null;
 return <main className="toss-fpti"><header><p>사주 FPTI</p><h1>나의 운명 성향</h1><p>사주의 오행과 십성을 바탕으로 관계와 선택의 흐름을 살펴봐요.</p><p className="fpti-note">국내 출생을 기준으로 계산해요. 이름과 생년월일, 시간 원문은 저장하지 않아요. 로그인하면 계산 결과만 이 탭에 임시 저장해요. 다른 기기에서는 볼 수 없어요.</p></header>
 {direct&&!shown?<section role="status"><h2>저장된 결과가 없어요</h2><p>이 탭에서 같은 계정으로 저장한 결과를 찾지 못했어요.</p>{!currentOwner&&<a href="/login/?next=%2Fsaju-fpti%2Fresult%2F">토스로 로그인하기</a>}<a href="/saju-fpti/">입력 화면으로 가기</a></section>:!shown?<form onSubmit={submit}>{available&&<button type="button" onClick={()=>{history.replaceState({},'','/saju-fpti/result/');directRef.current=true;setDirect(true);resultOwner.current=currentOwner;phase.current=true;setResult(available);}}>이 탭의 결과 다시 보기</button>}{auth.isAuthenticated&&owner?<fieldset disabled={busy}><legend>저장한 프로필</legend><TossAstrologyProfilePicker onSelect={selectProfile} calendarMode="native-lunar" inputId="fpti-profile"/></fieldset>:<p className="fpti-note">토스 로그인 후 저장한 프로필을 선택할 수 있어요.</p>}<fieldset disabled={busy}><legend>출생 정보</legend>
 <label>이름 또는 닉네임 (선택)<input value={form.name} maxLength={40} onChange={e=>change('name',e.target.value)}/></label>
 <label>생년월일<input type="date" required value={form.birthDate} onChange={e=>change('birthDate',e.target.value)}/></label>
 <label>달력<select value={form.calendarType} onChange={e=>change('calendarType',e.target.value as FptiFormInput['calendarType'])}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar_leap">음력 윤달</option></select></label>
 <label className="fpti-check"><input type="checkbox" checked={form.timeUnknown} onChange={e=>change('timeUnknown',e.target.checked)}/>태어난 시간을 몰라요</label>
 {!form.timeUnknown&&<label>태어난 시각<input type="time" required value={form.birthTime} onChange={e=>change('birthTime',e.target.value)}/></label>}
 <label>성별 (선택)<select value={form.gender} onChange={e=>change('gender',e.target.value as FptiFormInput['gender'])}><option value="OTHER">선택 안함</option><option value="M">남성</option><option value="F">여성</option></select></label>
 <label>태어난 지역 (선택)<input maxLength={60} value={form.birthRegion||''} onChange={e=>change('birthRegion',e.target.value)}/></label></fieldset>
 <button type="submit" disabled={busy}>{busy?'성향을 살펴보는 중':'성향 분석 시작하기'}</button>{busy&&<p role="status">출생정보를 바탕으로 성향을 살펴보고 있어요.</p>}{error&&<p role="alert">{error}</p>}</form>:<article aria-live="polite">{storageNotice&&<p role="status">{storageNotice}</p>}<h2>{shown.code} · {shown.typeName}</h2><p>{shown.oneLiner}</p><p>{shown.reliabilityMessage}</p>{shown.fallbackNotice&&<p>{shown.fallbackNotice}</p>}
 <section><h3>성향의 흐름</h3><p>{shown.summary}</p><dl>{Object.entries(shown.axisMeanings).map(([key,value])=><div key={key}><dt>{axisLabels[key]||key}</dt><dd>{value}</dd></div>)}</dl></section>
 <section><h3>명식과 오행</h3><dl>{(['year','month','day','hour'] as const).map(key=><div key={key}><dt>{pillarLabels[key]}</dt><dd>{shown.source.pillars[key]||'미상'}</dd></div>)}</dl><p>{shown.elementSummary}</p><dl>{Object.entries(shown.percentageElements).map(([key,value])=><div key={key}><dt>{elementLabels[key]||key}</dt><dd>{value}%</dd></div>)}</dl></section>
 <section><h3>나의 행동 패턴</h3><p>{shown.behaviorSummary}</p><dl>{Object.entries(shown.tenGodGroupScores).map(([key,value])=><div key={key}><dt>{tenGodLabels[key]||key}</dt><dd>{value}</dd></div>)}</dl></section>
 <section><h3>관계의 흐름</h3><p>{shown.relationshipSummary}</p><p>{shown.relationStyle.description}</p>{rows('잘 맞는 관계',shown.goodMatch)}{rows('서로 살펴볼 관계',shown.cautionMatch)}</section>
 {rows('강점',shown.strengths)}{rows('살펴볼 점',shown.weaknesses)}<section><h3>일과 재물</h3><p>{shown.careerMoneySummary}</p>{rows('일을 위한 제안',shown.careerTips)}</section><section><h3>연애의 흐름</h3><p>{shown.loveSummary}</p>{rows('관계를 위한 제안',shown.loveTips)}</section><section><h3>선택을 위한 조언</h3><p>{shown.strategySummary}</p></section>{rows('성장을 위한 제안',shown.growthTips)}
 <details><summary>계산 기준과 참고 사항</summary>{rows('계산 참고',shown.evidence.calculationNotes)}</details>
 <div className="fpti-actions"><button type="button" disabled={bridgeBusy} onClick={copy}>결과 문구 복사하기</button><button type="button" disabled={bridgeBusy} onClick={share}>결과 공유하기</button></div>{notice&&<p role="status">{notice}</p>}{permissionDenied&&<button type="button" disabled={bridgeBusy} onClick={requestPermission}>클립보드 권한 확인하기</button>}
 <button type="button" onClick={()=>{phase.current=false;resultOwner.current='';bridgeEpoch.current++;setNotice('');setPermissionDenied(false);setResult(null);if(directRef.current){history.replaceState({},'','/saju-fpti/');directRef.current=false;setDirect(false);}window.scrollTo(0,0);}}>입력 수정하기</button></article>}
 <TossFptiDictionary currentCode={shown?.code}/></main>;
}
