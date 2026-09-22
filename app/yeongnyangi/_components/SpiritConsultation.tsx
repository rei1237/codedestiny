"use client";
import {useEffect,useRef,useState} from 'react';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {SPIRIT_MODE,SPIRIT_TITLE,SPIRIT_NOTICE,SPIRIT_IMAGE,spiritTopics,type SpiritTopic} from '@/worker/yeongnyangi/fortune/spirit-contract';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import {useProfiles} from '../_lib/use-profiles';
import ProfilePicker from './ProfilePicker';
import styles from '../yeongnyangi.module.css';
const draftKey='yeongnyangi:spirit-draft';
export default function SpiritConsultation(){
  const state=useProfiles(),{profileId,guest}=state;
  const product=products.find(p=>p.id==='saju_mackerel')!;
  const [question,setQuestion]=useState(''),[relationship,setRelationship]=useState(''),[situation,setSituation]=useState('');
  const [topic,setTopic]=useState<SpiritTopic>('space'),[boundary,setBoundary]=useState(false),[timeUnknown,setTimeUnknown]=useState(false);
  const [available,setAvailable]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  useEffect(()=>{
    let active=true;
    fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(r=>{if(active)setAvailable(r.products.some(p=>p.id===product.id&&p.available));}).catch(()=>{if(active)setError('상담 준비 상태를 확인하지 못했어요. 잠시 후 다시 열어 주세요.');}).finally(()=>{if(active)setReady(true);});
    try{const d=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d&&Date.now()-d.at<3600000){setQuestion(String(d.question||'').slice(0,1000));setRelationship(String(d.relationship||'').slice(0,80));setSituation(String(d.situation||'').slice(0,600));if(Object.hasOwn(spiritTopics,d.topic))setTopic(d.topic);setBoundary(d.boundary===true);setTimeUnknown(d.timeUnknown===true);}}catch{/* Optional pre-login draft. */}
    return()=>{active=false;};
  },[product.id]);
  function login(){try{sessionStorage.setItem(draftKey,JSON.stringify({question,relationship,situation,topic,boundary,timeUnknown,at:Date.now()}));}catch{/* Server owns submitted input. */}loginForCurrentPage();}
  async function prepare(){
    if(lock.current)return;if(guest){login();return;}
    if(!profileId||!question.trim()||!relationship){setError('내 프로필과 관계를 고르고 질문을 남겨 주세요.');return;}
    lock.current=true;setBusy(true);setError('');
    try{
      const {fortune}=await fortuneApi<{fortune:FortuneRecord}>('requests',{mode:SPIRIT_MODE,productId:product.id,profileId,timeUnknown,question,topicId:'relationship',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul',spirit:{relationship,situation,topic,boundary}});
      try{sessionStorage.removeItem(draftKey);}catch{/* Submitted input is durable. */}
      window.location.assign(fortune.paid?resultPath(fortune.id):checkoutPath(fortune));
    }catch(e){if(e instanceof FortuneApiError&&e.status===401)login();else setError(e instanceof Error?e.message:'상담을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className={`${styles.consultation} ${styles.spirit}`}>
    <header className={styles.spiritIntro}><img src={SPIRIT_IMAGE} width={303} height={320} alt="작은 북을 든 영냥이"/><div><h1>{SPIRIT_TITLE}</h1><p>그 사람이 궁금한 마음부터, 조용히 펼쳐보자.<br/>알 수 있는 흐름과 알 수 없는 자리를 나누어 읽어줄게.</p></div></header>
    <p>{SPIRIT_NOTICE}</p>
    <p>현재 풀이는 네 출생 성향을 바탕으로 관계에서의 선택을 살펴봐. 상대방의 정보는 받지 않으며, 공간의 분위기와 연락·재회의 시기는 좁혀 해석할 근거가 없어.</p>
    <div className={styles.form}>
      <label htmlFor="spirit-question">영냥이에게 궁금한 이야기</label><textarea id="spirit-question" required rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="궁금한 점을 적어줘. 여러 질문은 줄을 나누면 좋아."/>
      <label htmlFor="spirit-relationship">그 사람과 나의 관계</label><select id="spirit-relationship" required value={relationship} onChange={e=>setRelationship(e.target.value)}><option value="">관계 선택</option>{['알아가는 사이','연인','헤어진 사이','친구','가족','동료','그 밖의 관계'].map(v=><option key={v}>{v}</option>)}</select>
      <label htmlFor="spirit-topic">궁금한 주제</label><select id="spirit-topic" value={topic} onChange={e=>setTopic(e.target.value as SpiritTopic)}>{Object.entries(spiritTopics).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select>
      <p>고른 주제보다 직접 적어준 질문을 먼저 살펴볼게.</p>
      <label htmlFor="spirit-situation">이미 알고 있는 상황 (선택)</label><textarea id="spirit-situation" rows={3} maxLength={600} value={situation} onChange={e=>setSituation(e.target.value)} placeholder="이름, 주소, 연락처 대신 네가 알고 있는 상황만 적어줘."/>
      <label><input type="checkbox" checked={boundary} onChange={e=>setBoundary(e.target.checked)}/> 상대가 연락을 거절하거나 차단한 상황이에요</label>
      <h2>내 출생정보</h2><p>현재 계산에는 네 생년월일이 필요해. 출생시간은 몰라도 돼. 모르는 정보는 채워 넣지 않고 해석 범위를 줄일게.</p>
      <ProfilePicker state={state}/>
      <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> 이번 상담에서는 내 출생시간을 미상으로 보기</label>
      <p>질문 시각과 시간대는 접수할 때 서버에서 확정해 저장해. 질문자 지역이나 상대방 위치는 수집하지 않아.</p>
      <div className={styles.checkoutSection}><h2>상담 내용 확인</h2><p>기존 사주 고등어 상담의 영감 모드 · {product.chapterCount}개 이야기와 영냥이의 마무리</p><strong>{product.priceKRW.toLocaleString('ko-KR')}원 · 단건 결제</strong><p>{SPIRIT_NOTICE}</p>
        <button type="button" onClick={()=>void prepare()} disabled={busy||(!guest&&(!ready||!available||!profileId))}>{busy?'질문의 결을 살피는 중':guest?'로그인하고 상담 시작하기':'결제 내용 확인하기'}</button>
        {!ready&&<p role="status">상담 준비 상태를 확인하고 있어요.</p>}{ready&&!available&&<p>지금은 상담 준비 중이에요. 결제는 진행되지 않아요.</p>}
        {error&&<p role="alert">{error}</p>}
      </div>
    </div>
    <nav className={styles.spiritLinks} aria-label="상담 이동"><a href="/yeongnyangi/library/">내 상담 기록</a><a href="/yeongnyangi/fortune/">다른 상담 고르기</a></nav>
  </section>;
}
