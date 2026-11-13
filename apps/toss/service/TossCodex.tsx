import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {type AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import CodexBirthGate,{EMPTY_CODEX_BIRTH,EMPTY_CODEX_PARTNER,type CodexBirthInput} from '@/src/features/master-love-codex/components/CodexBirthGate';
import CodexReader from '@/src/features/master-love-codex/components/CodexReader';
import {masterLoveCodexBilling} from '@/src/features/master-love-codex/constants';
import styles from '@/src/features/master-love-codex/styles/codex.module.css';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import {api,paymentRequiresReview} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import {checkoutReport} from './native-report-checkout';

const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
function ProfilePicker({onSelect,disabled,label}:{onSelect:(s:AiPrefillSeed)=>void;disabled?:boolean;label?:string}){
  return <fieldset disabled={disabled}><TossAstrologyProfilePicker inputId={label?'codex-partner-profile':'codex-birth-profile'} calendarMode="native-lunar" onSelect={onSelect}/></fieldset>;
}
type Book=ComponentProps<typeof CodexReader>&{done:boolean;retryable?:boolean;retryAfterMs?:number;birthInfo?:{name:string;birthDate:string};generationProgress?:{completed:number;total:number}};
export default function TossCodex(){
  const auth=useAuthStore(),owner=ownerId(),params=new URLSearchParams(location.search);
  if(!owner||!auth.isAuthenticated)return <main className={styles.root}><h1>마스터 인연의 서</h1><p>개인판은 나의 사주와 자미두수를, 궁합판은 두 사람의 명식과 명반을 함께 읽어요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></main>;
  return <main key={owner} className={styles.root}><h1>마스터 인연의 서</h1>{params.has('intentId')?<Reader id={params.get('intentId')||''} owner={owner}/>:<Form owner={owner} orderId={params.get('orderId')} purchasedMode={params.get('mode')}/>}<a href="/records/">꿀꿀운세 구매 기록</a></main>;
}
function Form({owner,orderId,purchasedMode}:{owner:string;orderId:string|null;purchasedMode:string|null}){
  const key='toss:codex-form:'+owner;
  const [birth,setBirth]=useState<CodexBirthInput>(()=>{
    try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw&&typeof raw.birthDate==='string'&&(!orderId||Boolean(raw.partner)===(purchasedMode==='compat')))return raw;}catch{/* Optional draft. */}
    return {...EMPTY_CODEX_BIRTH,partner:purchasedMode==='compat'?{...EMPTY_CODEX_PARTNER}:null};
  });
  const mode=birth.partner?'compat':'solo',billing=masterLoveCodexBilling(mode,'ko');
  const [price,setPrice]=useState<TossTeaPriceSelection|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),lock=useRef(false),cancel=useRef<()=>void>();
  const current=()=>alive.current&&ownerId()===owner;
  useEffect(()=>{alive.current=true;const leave=()=>{alive.current=false;cancel.current?.();};const resume=()=>{alive.current=true;lock.current=false;setBusy(false);};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);return()=>{leave();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);};},[]);
  const ready=orderId?mode===purchasedMode:Boolean(price?.featureKey===billing.featureKey&&price.owner===owner&&!paymentRequiresReview());
  function change(next:CodexBirthInput){setBirth(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Optional draft. */}}
  async function submit(){
    if(!ready||lock.current||!current())return;
    if(!birth.birthDate||!birth.gender||!birth.birthTime&&!birth.birthTimeUnknown||birth.partner&&!birth.partner.birthDate){setError('생년월일과 성별, 출생 시각을 확인해 주세요. 궁합판은 상대 생년월일도 필요해요.');return;}
    setBusy(true);lock.current=true;setError('');
    try{
      const {consultation,partner,...birthInfo}=birth;
      const reading={birthInfo,partnerInfo:partner,consultation};
      const id=await checkoutReport({service:'codex',feature:billing.featureKey,owner,input:{mode,reading},orderId,price,current,onPurchase:cleanup=>{cancel.current=cleanup;}});
      if(!id||!current())return;
      localStorage.removeItem(key);location.replace('/master-love-codex/result/?intentId='+id);
    }catch{if(current())setError('상담을 시작하지 못했어요. 입력 정보와 구매 기록을 확인한 뒤 다시 열어 주세요.');}
    finally{if(current()){setBusy(false);lock.current=false;}}
  }
  return <CodexBirthGate value={birth} onChange={change} onSubmit={submit} busy={busy} busyLabel="상담 준비 중" error={error}
    native={{ready,ProfilePicker}} headerSlot={<><h2>{billing.title}</h2>{orderId?'구매한 인연의 서':<TossTeaPrice key={billing.featureKey} featureKey={billing.featureKey} onPrice={setPrice}/>}</>}
    priceSlot={orderId?'구매한 회차':price?.featureKey===billing.featureKey?price.displayAmount:'상품 준비 중'}/>;
}
function Reader({id,owner}:{id:string;owner:string}){
  const [book,setBook]=useState<Book|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;const active=()=>live&&ownerId()===owner;
    const resume=()=>{if(active()&&!document.hidden)setRetry(n=>n+1);};
    window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
    async function run(){
      try{
        let advance=false;setError('');
        while(active()&&!document.hidden&&navigator.onLine){
          const next=await api<Book>('/native/codex/results/'+encodeURIComponent(id),advance?{}:undefined);
          if(!active())return;
          setBook(next);
          if(next.done||next.retryable===false)return;
          await new Promise(resolve=>setTimeout(resolve,Math.max(1200,Math.min(next.retryAfterMs||0,30000))));
          advance=true;
        }
      }catch{if(active())setError('저장된 인연의 서를 불러오지 못했어요. 같은 계정과 연결 상태를 확인해 주세요.');}
    }
    void run();return()=>{live=false;window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
  },[id,owner,retry]);
  return <>{error&&<p role="alert">{error}</p>}{(!book?.done||error)&&<><p role="status">{book?.generationProgress?book.generationProgress.completed+' / '+book.generationProgress.total+'장 저장':'저장된 장을 확인하고 있어요.'}</p><button onClick={()=>setRetry(n=>n+1)}>저장한 인연의 서 이어서 열기</button></>}
    {book&&book.chapters?.length>0&&<CodexReader chapters={book.chapters} consultation={book.consultation} outline={book.outline} totalChapters={book.generationProgress?.total}
      mode={book.mode} completed={book.done} loveDna={book.loveDna} name={book.birthInfo?.name||''} birthLine={book.birthInfo?.birthDate||''}
      sessionId={book.sessionId} totalCharCount={book.totalCharCount}/>}</>;
}
