import {useEffect,useState} from 'react';
import {JourneyHub} from '../../../app/destiny-compass/_components/JourneyHub';
import {DestinyMap} from '../../../app/destiny-compass/_components/DestinyMap';
import {ConcernInput} from '../../../app/destiny-compass/_components/ConcernInput';
import {ProcessingScene} from '../../../app/destiny-compass/_components/ProcessingScene';
import {CompassReport} from '../../../app/destiny-compass/_components/CompassReport';
import {Crossroads} from '../../../app/destiny-compass/_components/Crossroads';
import {FutureSim} from '../../../app/destiny-compass/_components/FutureSim';
import {LifeVoyage} from '../../../app/destiny-compass/_components/LifeVoyage';
import {TodayQuest} from '../../../app/destiny-compass/_components/TodayQuest';
import {Arrival} from '../../../app/destiny-compass/_components/Arrival';
import {useCompassSession,type CompassStep} from '../../../app/destiny-compass/_hooks/useCompassSession';
import {DIRECTION_TO_REGION} from '../../../app/destiny-compass/_components/mapRegions';
import {useDestinyCompassCopy} from '../../../app/destiny-compass/_lib/copy';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

const previous:Partial<Record<CompassStep,CompassStep>>={map:'hub',reveal:'map',result:'reveal',today:'result',arrival:'today',crossroad:'result',voyage:'result',futureSim:'result'};
const loginContinuation='toss.compass.continue-after-login';
const leaves=new Set<CompassStep>(['futureSim','crossroad','voyage']);
function Journey({owner,loggedIn,onLogin}:{owner:string;loggedIn:boolean;onLogin:()=>void}){
  const s=useCompassSession('hub'),copy=useDestinyCompassCopy();
  const key='toss.compass.last.'+owner;
  const [saved,setSaved]=useState(()=>{try{return Boolean(localStorage.getItem(key));}catch{return false;}});
  const [spot,setSpot]=useState<string|null>(null),[pig,setPig]=useState<'talk'|'happy'|'think'|'surprise'|'neutral'>('talk');
  const [tilt,setTilt]=useState(false);
  useEffect(()=>{
    if(!s.field||!s.input)return;
    try{localStorage.setItem(key,JSON.stringify({birth:s.birth,input:s.input,situation:s.situation,field:s.field}));setSaved(true);}catch{/* Optional on-device history. */}
  },[s.field,s.input,s.birth,s.situation,key]);
  useEffect(()=>{
    if(!loggedIn)return;
    try{
      const raw=sessionStorage.getItem(loginContinuation);
      sessionStorage.removeItem(loginContinuation);
      if(!raw)return;
      const pending=JSON.parse(raw);
      if(!leaves.has(pending.step)||Date.now()-pending.created>5*60_000)return;
      sessionStorage.setItem('cd-compass:session.v1',pending.snapshot);
      if(s.restoreSnapshot())s.setStep(pending.step);
    }catch{/* A fresh journey remains available if the session was interrupted. */}
  },[loggedIn,s.restoreSnapshot,s.setStep]);
  function continueWithLogin(){
    try{
      const snapshot=localStorage.getItem(key);
      if(snapshot)sessionStorage.setItem(loginContinuation,JSON.stringify({snapshot,step:s.step,created:Date.now()}));
    }catch{/* Login also works when device storage is unavailable. */}
    onLogin();
  }
  function resume(){
    try{const raw=localStorage.getItem(key);if(!raw)return;sessionStorage.setItem('cd-compass:session.v1',raw);
      if(s.restoreSnapshot()){s.setStep('result');return;}}
    catch{/* Invalid or expired snapshot. */}setSaved(false);
  }
  useEffect(()=>{
    const back=(e:Event)=>{const next=previous[s.step];if(!next)return;e.preventDefault();s.setStep(next);};
    window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);
  },[s.step,s.setStep]);
  if(s.step==='hub'||s.step==='birth')return <>{saved&&<Button onClick={resume}>지난 나침반 결과 다시 보기</Button>}<JourneyHub onStart={birth=>{s.setBirth(birth);s.setStep('map');}}/></>;
  if(s.step==='map')return <DestinyMap islandArt spotlightRegion={spot} guideTilt={tilt} pigExpr={pig}><ConcernInput onSubmit={s.submitConcern} onSpotlight={setSpot} onWaitingChange={setTilt} onPigExpr={setPig}/>{s.error&&<p role="alert">{s.error}</p>}</DestinyMap>;
  if(s.step==='processing')return <DestinyMap showFog hideHero hideHeader phase={s.stagePhase}><ProcessingScene/></DestinyMap>;
  if(!s.field||!s.input)return null;
  const field=s.field;
  const result=()=>s.setStep('result'),restart=()=>{s.reset();s.setStep('hub');};
  if(s.step==='reveal'){const region=DIRECTION_TO_REGION[field.primary.key];return <DestinyMap title={copy.revealTitle} pathTo={region} highlightRegion={region} phase="night"><Button onClick={result}>{copy.confirmResultButton}</Button></DestinyMap>;}
  if(leaves.has(s.step)&&!loggedIn)return <section><h1>{copy.previewCards[s.step as 'futureSim'|'crossroad'|'voyage'].name}</h1><p>토스 계정으로 로그인하면 계산 결과를 열 수 있어요.</p><Button onClick={continueWithLogin}>토스로 로그인하기</Button><Button onClick={result}>나침반 결과로 돌아가기</Button></section>;
  if(s.step==='crossroad')return <Crossroads field={field} onBack={result}/>;
  if(s.step==='futureSim')return <FutureSim field={field} onBack={result}/>;
  if(s.step==='voyage')return <LifeVoyage field={field} onBack={result}/>;
  if(s.step==='today')return <TodayQuest rewardsEnabled={false} field={field} onArrive={()=>s.setStep('arrival')} onReset={restart}/>;
  if(s.step==='arrival')return <Arrival field={field} onRestart={restart}/>;
  return <CompassReport input={s.input} field={field} situation={s.situation} onNext={()=>s.setStep('today')} onRestart={restart} onCrossroad={()=>s.setStep('crossroad')} onFutureSim={()=>s.setStep('futureSim')} onVoyage={()=>s.setStep('voyage')}/>;
}
function Account({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  const [owner,setOwner]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{if(!loggedIn)return;let live=true;api<{user:{id:string}}>('/canonical/auth/me').then(r=>{if(!r.user?.id)throw Error();if(live)setOwner(r.user.id);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[loggedIn,attempt]);
  if(loggedIn&&!owner)return error?<Button onClick={()=>{setError(false);setAttempt(n=>n+1);}}>계정 다시 확인하기</Button>:<p role="status">계정을 확인하고 있어요.</p>;
  return <Journey key={loggedIn?owner:'guest'} owner={loggedIn?owner:'guest'} loggedIn={loggedIn} onLogin={onLogin}/>;
}
export default function DestinyCompass(props:{loggedIn:boolean;onLogin:()=>void}){return <TossSessionScope><Account {...props}/></TossSessionScope>;}

