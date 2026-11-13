import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {profileKey,useProfiles} from '@/app/yeongnyangi/_lib/use-profiles';
import ProfileForm from '@/app/yeongnyangi/_components/ProfileForm';
import {api,nativeSaleProducts,purchase,paymentRequiresReview} from '../src/platform';
import {Button} from '../src/Button';
import TossTeaPrice from './TossTeaPrice';
import './saju-compat.css';

const Guardian=lazy(()=>import('@/app/saju-guardian/SajuGuardianClient').then(m=>({default:m.ResultCard})));
const Sibyl=lazy(()=>import('@/app/records/view/SavedSibylReading'));
const products={
 guardian:{title:'사주 가디언',feature:'saju-guardian-unlock',page:'/saju-guardian/',art:'/images/feature-details/saju-guardian-hero-v2.webp',description:'일주의 수호 인장과 기질, 십성 풀이를 읽고 나만의 가디언 이미지 프롬프트를 열어보세요.'},
 sibyl:{title:'시빌라 심층 리포트',feature:'premium-sibyl-dominator',page:'/saju/sibyl/',art:'/images/feature-details/saju-sibyl-observatory.webp',description:'한 해의 월별 흐름과 네 분야의 대비책을 열 장의 상담으로 읽어요.'},
};
const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
const firstYear=()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
const years=()=>Array.from({length:10},(_,n)=>firstYear()+n);
export default function TossBirthReading({service}){
 useAuthStore();
 const owner=ownerId(),product=products[service],query=new URLSearchParams(location.search),id=query.get('intentId');
 if(id&&owner)return <Result key={service+owner+id} {...{product,service,id,owner}}/>;
 return <section className="toss-compat"><img src={product.art} alt="" width="640" height="360"/><h1>{product.title}</h1><p>{product.description}</p>
 {owner?<Form key={service+owner} {...{product,service,owner}} orderId={query.get('orderId')}/>:<a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a>}</section>;
}
function Form({product,service,owner,orderId}){
 const profiles=useProfiles({requireVerified:true}),[adding,setAdding]=useState(false),[price,setPrice]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const initial=Number(new URLSearchParams(location.search).get('year'));
 const [year,setYear]=useState(years().includes(initial)?initial:firstYear());
 const alive=useRef(true),locked=useRef(false),cancel=useRef(),current=()=>alive.current&&ownerId()===owner;
 useEffect(()=>{alive.current=true;const stop=()=>{alive.current=false;cancel.current?.();};window.addEventListener('pagehide',stop);return()=>{stop();window.removeEventListener('pagehide',stop);};},[]);
 async function submit(){
  if(locked.current||!profiles.profileId)return;
  setError('');locked.current=true;setBusy(true);
  try{
   const input={profileId:profiles.profileId,...(service==='sibyl'?{year}:{})};
   const intent=await api('/native/'+service+'/prepare',{input,...(orderId?{orderId}:{})});
   if(!current())return;
   if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
   if(!intent.paid){
    const sale=(await nativeSaleProducts()).find(p=>p.featureKey===product.feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
    if(!current())return;
    if(!sale||!price||price.owner!==owner||price.sku!==sale.sku||price.displayAmount!==sale.displayAmount||paymentRequiresReview())throw Error('PRICE_CHANGED');
    await new Promise((done,fail)=>{cancel.current=purchase(sale,intent.id,done,fail);});
   }
   if(!current())return;
   const checked=await api('/native/'+service+'/intents/'+intent.id);
   if(!current())return;
   if(!checked.paid||checked.id!==intent.id)throw Error('ORDER_MISMATCH');
   if(service==='sibyl')sessionStorage.setItem('toss:sibyl:year:'+owner+':'+intent.id,String(year));
   location.replace(product.page+'?intentId='+intent.id);
  }catch{if(current())setError('구매 기록과 연결 상태를 확인한 뒤 다시 열어 주세요.');}
  finally{if(current()){locked.current=false;setBusy(false);}}
 }
 return <div className="form"><label>상담할 프로필<select value={profiles.profileId} disabled={busy||profiles.loading} onChange={e=>profiles.select(e.target.value)}>
 <option value="">프로필 선택</option>{profiles.profiles.map(p=><option key={profileKey(p)} value={profileKey(p)}>{p.name}</option>)}</select></label>
 {profiles.error&&<button onClick={()=>profiles.refresh(true)}>프로필 다시 확인하기</button>}
 <button onClick={()=>setAdding(!adding)}>{adding?'입력 닫기':'새 프로필 만들기'}</button>{adding&&<ProfileForm locale="ko" surface="paper" onSaved={p=>{profiles.saved(p);setAdding(false);}}/>}
 {service==='sibyl'&&<label>심층 분석 연도<select value={year} onChange={e=>setYear(Number(e.target.value))}>{years().map(n=><option key={n}>{n}</option>)}</select></label>}
 {!orderId&&<TossTeaPrice featureKey={product.feature} onPrice={setPrice}/>}
 {(orderId||price?.owner===owner&&!paymentRequiresReview())&&<Button onClick={submit} disabled={busy||!profiles.profileId}>{orderId?'구매한 결과 이어서 열기':'토스로 '+product.title+' 열기'}</Button>}
 {error&&<p role="alert">{error}</p>}<a href="/records/">꿀꿀운세 구매 기록</a></div>;
}
function Result({product,service,id,owner}){
 const key='toss:sibyl:year:'+owner+':'+id;
 const [year,setYear]=useState(()=>service==='sibyl'&&sessionStorage.getItem(key)||''),[state,setState]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true,timer;
  const current=()=>active&&ownerId()===owner;
  const path='/native/'+service+'/results/'+id+(year?'?year='+encodeURIComponent(year):'');
  async function read(advance){
   try{const data=await api(path,advance?{}:undefined);
    if(!current())return;
    setState(data);
    if(!data.archive)timer=setTimeout(()=>{if(!document.hidden&&navigator.onLine)void read(true);},1500);
   }catch{if(current())setError(true);}
  }
  const restart=()=>{if(!document.hidden&&navigator.onLine&&current())setRetry(r=>r+1);};
  setError(false);setState(null);void read(false);
  window.addEventListener('online',restart);document.addEventListener('visibilitychange',restart);
  return()=>{active=false;clearTimeout(timer);window.removeEventListener('online',restart);document.removeEventListener('visibilitychange',restart);};
 },[product,service,id,owner,year,retry]);
 return <section className="toss-compat"><h1>{product.title}</h1>
 {service==='sibyl'&&state&&<label>리포트 연도<select value={state.year} onChange={e=>{const value=e.target.value;sessionStorage.setItem(key,value);setState(null);setYear(value);}}>
 {[...new Set([...years(),...(state.years||[])])].sort().map(n=><option key={n}>{n}</option>)}</select></label>}
 {error?<><p role="alert">구매한 계정과 연결을 확인한 뒤 같은 결과를 다시 열어 주세요.</p><Button onClick={()=>setRetry(n=>n+1)}>저장한 결과 다시 확인</Button></>:state?.archive?
 <Suspense fallback={<p>원문을 열고 있어요.</p>}>{service==='guardian'?<Guardian data={state.archive.reading} storedPrompt={state.archive.prompt} birthYear="" birthMonth="" birthDay="" birthHour="" onReset={()=>location.assign(product.page)} tx={value=>value}/>:<Sibyl value={state.archive}/>}</Suspense>:<p role="status">구매한 프로필의 결과를 준비하고 있어요.</p>}
 <a href="/records/">꿀꿀운세 구매 기록</a></section>;
}
