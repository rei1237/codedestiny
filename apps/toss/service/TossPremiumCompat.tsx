import {useEffect,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import PersonFields from '@/app/saju/compatibility/premium/PremiumPersonFields';
import {SajuCompatPremiumReading} from '@/app/saju/compatibility/premium/result/SajuCompatPremiumResultClient';
import {buildInputPayload,emptyPerson,RELATION_OPTIONS,type PremiumInput,type PremiumPerson,type PremiumResult} from '@/app/saju/compatibility/premium/_lib/premium-delivery';
import styles from '@/app/saju/compatibility/premium/premium.module.css';
import {api} from '../src/platform';
import NativeChapterPurchase from '../src/NativeChapterPurchase';

const page='/saju/compatibility/premium/';
const service='saju-compat-premium';
const ownerId=()=>String(getAuthState().user?.id||'');
const draftKey=(scope:string)=>'toss:premium-compat:draft:'+scope;
type Draft={input:PremiumInput;step:number};

function restore(owner:string):Draft {
  const empty={input:{self:emptyPerson(),partner:emptyPerson(),relationType:'dating' as const},step:0};
  try{
    const handoff=new URLSearchParams(location.search).get('draft');
    const scope=owner&&handoff&&localStorage.getItem(draftKey('handoff'))===handoff?'guest':owner||'guest';
    const saved=JSON.parse(localStorage.getItem(draftKey(scope))||'null');
    if(!saved?.input?.self||!saved.input.partner||!RELATION_OPTIONS.some(r=>r.value===saved.input.relationType))return empty;
    return {input:saved.input,step:[0,1,2].includes(saved.step)?saved.step:0};
  }catch{return empty;}
}

function Intake({owner}:{owner:string}){
  const [{input,step},setDraft]=useState(()=>restore(owner));
  const [error,setError]=useState('');
  useEffect(()=>{
    try{
      localStorage.setItem(draftKey(owner||'guest'),JSON.stringify({input,step}));
      const url=new URL(location.href),token=url.searchParams.get('draft');
      if(owner&&token&&localStorage.getItem(draftKey('handoff'))===token){
        localStorage.removeItem(draftKey('guest'));localStorage.removeItem(draftKey('handoff'));
        url.searchParams.delete('draft');history.replaceState(history.state,'',url);
      }
    }catch{/* The current form remains usable without a saved draft. */}
  },[owner,input,step]);
  function login(){
    const token=crypto.randomUUID(),next=new URL(page,location.origin);
    try{localStorage.setItem(draftKey('handoff'),token);next.searchParams.set('draft',token);}catch{}
    location.assign('/login/?next='+encodeURIComponent(next.pathname+next.search));
  }
  function change(side:'self'|'partner',person:PremiumPerson){
    setError('');setDraft({step,input:{...input,[side]:person}});
  }
  function next(){
    const person=step===0?input.self:input.partner;
    if(!person.gender||!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)){setError('생년월일과 성별을 확인해 주세요.');return;}
    const instant=new Date(person.birthDate+'T00:00:00Z');
    if(!Number.isFinite(+instant)||instant.toISOString().slice(0,10)!==person.birthDate||instant.getUTCFullYear()<1900||instant.getUTCFullYear()>2100){setError('1900년부터 2100년 사이의 생년월일을 확인해 주세요.');return;}
    setError('');setDraft({input,step:step+1});
  }
  const payload=buildInputPayload(input);
  return <section className={styles.form}><h1>사주 고급 궁합</h1>
    <p>두 사람의 명식에서 끌림과 소통, 서로 편안하게 지낼 방법을 읽어요.</p>
    {step<2?<><PersonFields key={step} legend={step===0?'나':'상대'} person={step===0?input.self:input.partner} onChange={value=>change(step===0?'self':'partner',value)}/>
      <button className={styles.primary} type="button" onClick={next}>{step===0?'상대 정보 입력하기':'관계 유형 고르기'}</button></>:<>
      <label className={styles.field}>지금 두 사람의 관계<select value={input.relationType} onChange={e=>setDraft({step,input:{...input,relationType:e.target.value as PremiumInput['relationType']}})}>
        {RELATION_OPTIONS.map(row=><option key={row.value} value={row.value}>{row.label}</option>)}</select></label>
      <NativeChapterPurchase service={service} feature={service} prefix="scp" route={page+'result/'} owner={owner||'guest'} onLogin={login}
        keyInput={[payload]} makePayload={requestId=>({...payload,requestId})}/></>}
    {step>0&&<button type="button" className={styles.secondary} onClick={()=>{setError('');setDraft({input,step:step-1});}}>이전 단계</button>}
    {error&&<p role="alert">{error}</p>}</section>;
}

type View={completed:number;result?:PremiumResult;retry?:boolean};
function Reading({owner,id}:{owner:string;id:string}){
  const [data,setData]=useState<View>({completed:0}),[error,setError]=useState(''),[attempt,retry]=useState(0);
  useEffect(()=>{
    let live=true,timer:ReturnType<typeof setTimeout>;
    const current=()=>live&&ownerId()===owner;
    async function read(advance=false){
      try{
        const value=await api<View>('/native/'+service+'/results/'+encodeURIComponent(id),advance?{}:undefined);
        if(!current())return;
        setData(value);
        if(!value.result&&(!value.retry||attempt>0&&!advance))timer=setTimeout(()=>void read(true),1300);
      }catch{if(current())setError('궁합을 불러오지 못했어요. 같은 주문으로 다시 확인해 주세요.');}
    }
    if(owner&&/^[a-f0-9]{64}$/.test(id))void read();else setError('이 결과에 접근할 수 없어요.');
    return ()=>{live=false;clearTimeout(timer);};
  },[id,owner,attempt]);
  return <section>{data.result?<SajuCompatPremiumReading saved result={data.result}/>:<>
    <h1>사주 고급 궁합</h1><p role="status">네 장 중 {data.completed}장을 저장했어요.</p>
    {(error||data.retry)&&<><p role="alert">{error||'풀이가 잠시 멈췄어요. 저장한 장에서 이어갈 수 있어요.'}</p>
      <button type="button" onClick={()=>{setError('');retry(n=>n+1);}}>같은 주문으로 이어서 보기</button></>}</>}
    <a href="/records/">꿀꿀운세 구매 기록</a></section>;
}
export default function TossPremiumCompat(){
  useAuthStore();
  const owner=ownerId(),id=new URLSearchParams(location.search).get('resultId')||'';
  return <main className={styles.page}>{location.pathname.includes('/result')?<Reading key={owner+id} owner={owner} id={id}/>:<Intake key={owner} owner={owner}/>}</main>;
}
