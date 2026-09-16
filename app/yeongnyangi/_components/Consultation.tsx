"use client";
import {useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import type {DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {products,systemNames,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import ProfileForm from './ProfileForm';
import styles from '../yeongnyangi.module.css';
const explanation:Record<string,string>={saju:'사주팔자와 오행, 십성으로 기질과 삶의 흐름을 읽어요.',ziwei:'자미두수 명반의 궁과 별, 운의 흐름을 함께 살펴봐요.',sukuyo:'본명숙과 관계의 거리를 숙요점의 관점에서 살펴봐요.',vedic:'라그나와 달, 나크샤트라와 다샤를 인도 점성술로 읽어요.',astrology:'태양·달·상승점과 행성 관계를 출생 차트로 살펴봐요. 실시간 트랜짓은 포함하지 않아요.',tarot:'출생정보 없이 질문과 카드의 상징으로 상황과 선택을 읽어요.',fusion:'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'};
export default function Consultation(){
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[profiles,setProfiles]=useState<DestinyProfileCard[]>([]);
 const [profileId,setProfileId]=useState(''),[partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[guest,setGuest]=useState(false),[showProfile,setShowProfile]=useState(false);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const product=products.find(p=>p.id===productId)!;
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  const selected=products.find(p=>p.id===params.get('product'))||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const requestedTopic=params.get('topic');
  if(requestedTopic && Object.hasOwn(topicCatalog,requestedTopic))setTopicId(requestedTopic);
  let cancelled=false;
  Promise.all([fortuneApi<{products:(Product&{available:boolean})[]}>('products'),authFetch('/api/profile',{}, {forceFresh:true})]).then(async([catalog,response])=>{
   if(cancelled)return;
   setAvailable(catalog.products.filter(p=>p.available));
   if(response.status===401){setGuest(true);return;}
   const data=await response.json();if(!response.ok)throw new Error(data.message||'프로필을 불러오지 못했어요.');
   const list=data.profiles||[];setProfiles(list);setProfileId(data.currentId||list[0]?.profileId||list[0]?.id||'');
  }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setReady(true);});
  return ()=>{cancelled=true;};
 },[]);
 async function prepare(){
  if(lock.current)return;if(guest){loginForCurrentPage();return;}
  lock.current=true;setBusy(true);setError('');
  try{
   let birthPlace;
   if(extraPlace.trim()&&!selectedProfile?.location?.label){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(extraPlace)}`);
    const found=await response.json();
    if(!response.ok||found.fallback)throw new Error('출생지역을 찾지 못했어요. 도시와 국가를 함께 입력해 주세요.');
    birthPlace={name:found.name,latitude:found.lat,longitude:found.lng,timezone:found.timezone};
   }
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{birthDetails:{birthTime:extraTime,birthPlace},productId,profileId,topicId,question,timeUnknown,...(partnerId?{partnerProfileId:partnerId}:{})});
   window.location.assign(data.fortune.paid?resultPath(data.fortune.id):checkoutPath(data.fortune));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else setError(e instanceof Error?e.message:'상담을 준비하지 못했어요.');}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 return <section className={styles.consultation}>
  <header><h1>무엇부터 읽어볼까?</h1><p>운세를 고르고, 궁금한 이야기를 들려줘. 영냥이 개인 상담은 선택한 상품을 단건 결제로 확인해.</p></header>
  <div className={styles.tabs} role="group" aria-label="운세 종류">{[...Object.entries(systemNames),['fusion','복합 운세']].map(([id,label])=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{label}</button>)}</div>
  <p>{explanation[domain]}</p>
  <div className={styles.fishes} role="group" aria-label="생선 상품">{choices.map(item=><button key={item.id} onClick={()=>setProductId(item.id)} aria-pressed={productId===item.id}>
   <img src={item.image} alt="" width={240} height={108}/><strong>{domain==='fusion'?item.name:item.fishName}</strong><span>{item.priceKRW.toLocaleString('ko-KR')}원 · {item.chapterCount}개 챕터</span><small>{depthDescriptions[item.fishId]}</small>
  </button>)}</div>
  <div className={styles.form}>
   {guest?<p>기존 CODE DESTINY 계정으로 로그인하면 프로필을 바로 불러올 수 있어요.</p>:product.domain==='tarot'&&product.readingKind==='single'?<p>타로 상담에는 출생정보가 필요하지 않아요.</p>:<>
    <label>함께 읽을 프로필<select value={profileId} onChange={e=>setProfileId(e.target.value)}><option value="">프로필 선택</option>{profiles.map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name} · {p.birthDate}</option>)}</select></label>
    <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> 이번 상담에서 출생시간을 미상으로 보기</label>
    {selectedProfile?.birth?.timeUnknown&&<label>출생시간 보완 (선택)<input type="time" value={extraTime} onChange={e=>setExtraTime(e.target.value)}/></label>}
    {selectedProfile&&!selectedProfile.location?.label&&<label>이 상담에 필요한 출생지역<input value={extraPlace} onChange={e=>setExtraPlace(e.target.value)} placeholder="도시와 국가" maxLength={120}/></label>}
    {(selectedProfile?.birth?.timeUnknown||selectedProfile&&!selectedProfile.location?.label)&&<p>보완한 정보는 이번 상담 기록에 함께 저장해요.</p>}
    {domain==='sukuyo'&&<label>궁합 상대 (선택)<select value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">내 본명숙만 보기</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
    <button type="button" className={styles.secondary} onClick={()=>setShowProfile(!showProfile)}>{showProfile?'입력 닫기':'새 프로필 만들기'}</button>
    {showProfile&&<ProfileForm onSaved={p=>{setProfiles(list=>[...list,p]);setProfileId(p.profileId||p.id||'');setShowProfile(false);}}/>}
   </>}
   <label>상담 주제<select value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="general">전체 흐름</option>{Object.entries(topicCatalog).map(([id,topic])=><option value={id} key={id}>{topic.label}</option>)}</select></label>
   <label>영냥이에게 궁금한 이야기<textarea rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="지금 가장 궁금한 고민을 들려줘. 떠오르는 질문이 없으면 전체 흐름부터 볼게."/></label>
   <p>선택한 운세의 계산 결과를 바탕으로 AI가 해설해요. 선택을 돕는 참고 자료이며 미래를 확정하지 않아요.</p>
   <button disabled={!ready||busy||!available.some(p=>p.id===productId)} onClick={()=>void prepare()}>{busy?'상담 준비 중':guest?'CODE DESTINY 로그인하고 이어가기':`${product.priceKRW.toLocaleString('ko-KR')}원 · 결제 내용 확인하기`}</button>
   {ready&&!available.some(p=>p.id===productId)&&<p>지금은 상담을 준비하고 있어요. 결제는 진행되지 않아요.</p>}
   {error&&<p role="alert">{error}</p>}
  </div>
 </section>;
}
