"use client";
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import FreePromptContinuation from '@/app/components/FreePromptContinuation';
import type {FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
import {useEffect,useRef,useState} from 'react';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {questionCities,skyModes,skyTopics,SKY_IMAGE,type SkyMode} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import {SPIRIT_NOTICE} from '@/worker/yeongnyangi/fortune/spirit-contract';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import styles from '../yeongnyangi.module.css';
export default function QuestionSkyConsultation({mode}:{mode:SkyMode}){
  const free=mode==='horary-v1';
  const product=products.find(p=>p.id==='saju_flounder')!;
  const [location,setLocation]=useState<CurrentLocation|null>(null),[reading,setReading]=useState<FreeReading|null>(null);
  const [question,setQuestion]=useState(''),[relationship,setRelationship]=useState('그 밖의 관계'),[situation,setSituation]=useState('');
  const [topic,setTopic]=useState<keyof typeof skyTopics>('relationship'),[boundary,setBoundary]=useState(false);
  const [cityId,setCityId]=useState(''),[localTime,setLocalTime]=useState('');
  const [available,setAvailable]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),draftKey=`yeongnyangi:question-sky:${mode}`;
  useEffect(()=>{
    let active=true;
    if(free){setAvailable(true);setReady(true);}else fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(r=>{if(active)setAvailable(r.products.some(p=>p.id===product.id&&p.available));}).catch(()=>{if(active)setError('상담 준비 상태를 확인하지 못했어요. 잠시 후 다시 열어 주세요.');}).finally(()=>{if(active)setReady(true);});
    try{const d=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d&&Date.now()-d.at<3600000){setQuestion(String(d.question||'').slice(0,1000));setRelationship(String(d.relationship||''));setSituation(String(d.situation||'').slice(0,600));if(Object.hasOwn(skyTopics,d.topic))setTopic(d.topic);setBoundary(d.boundary===true);setCityId(String(d.cityId||''));setLocalTime(String(d.localTime||''));}}catch{/* Optional login draft. */}
    return()=>{active=false;};
  },[product.id,draftKey,free]);
  async function prepare(event:React.FormEvent){
    event.preventDefault();if(lock.current)return;
    if(question.trim().length<5||(!cityId&&!location)||!localTime){setError('질문과 질문이 떠오른 도시·시각을 확인해 주세요.');return;}
    lock.current=true;setBusy(true);setError('');
    const draft={question,relationship,situation,topic,boundary,cityId,localTime,at:Date.now()};
    try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{/* Server owns submitted input. */}
    try{
      if(free){
        const {result}=await fortuneApi<{result:FreeReading}>('free/horary',{question,questionSky:{relationship,situation,topic,boundary,cityId,localTime,location:location||undefined}});
        setReading(result);try{sessionStorage.removeItem(draftKey);}catch{/* Optional draft only. */}return;
      }
      const {fortune}=await fortuneApi<{fortune:FortuneRecord}>('requests',{mode,productId:product.id,question,questionSky:{relationship,situation,topic,boundary,cityId,localTime,location:location||undefined}});
      try{sessionStorage.removeItem(draftKey);}catch{/* Submitted input is durable. */}
      window.location.assign(fortune.paid?resultPath(fortune.id):checkoutPath(fortune));
    }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else setError(e instanceof Error?e.message:'상담을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className={`${styles.consultation} ${styles.spirit}`}>
    <header className={styles.spiritIntro}><img src={SKY_IMAGE} width={640} height={640} alt="부채와 방울을 든 한복 차림의 영냥이"/><div><h1>{skyModes[mode]}</h1><p>질문이 마음에 떠오른 순간,<br/>그때의 하늘과 자리에서 이야기의 결을 읽어줄게.</p></div></header>
    <p>{mode==='prashna-v1'?'질문 순간을 읽는 전통 방식으로, 우주의 기운을 너의 선택에 비추어 상징적으로 풀어볼게.':'질문 순간을 읽는 서양 전통 방식으로, 이어지는 흐름과 조심할 조건을 함께 살펴볼게.'}</p>
    <p>{SPIRIT_NOTICE}</p>
    <form className={styles.form} onSubmit={prepare} onChange={()=>setReading(null)}>
      <label htmlFor="sky-question">영냥이에게 궁금한 이야기</label><textarea id="sky-question" required minLength={5} rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="질문은 최대 8개까지, 줄을 나누어 적어줘."/>
      <label htmlFor="sky-topic">궁금한 주제</label><select id="sky-topic" value={topic} onChange={e=>setTopic(e.target.value as keyof typeof skyTopics)}>{Object.entries(skyTopics).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select>
      <p>고른 주제보다 직접 적어준 질문을 먼저 살펴볼게.</p>
      <label htmlFor="sky-relationship">그 사람과 나의 관계</label><select id="sky-relationship" value={relationship} onChange={e=>setRelationship(e.target.value)}>{['그 밖의 관계','나 자신의 선택','알아가는 사이','연인','헤어진 사이','친구','가족','동료'].map(v=><option key={v}>{v}</option>)}</select>
      <label htmlFor="sky-city">질문이 떠올랐을 때 내가 있던 도시</label><select id="sky-city" required={!location} value={cityId} onChange={e=>{setCityId(e.target.value);setLocation(null);setReading(null);}}><option value="">질문자 도시 선택</option>{questionCities.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
      <CurrentLocationButton purpose="question" disabled={busy} onLocation={value=>{setLocation(value);setCityId('');setReading(null);}}/>{location&&<p role="status">확인한 현재 위치를 사용할게. 시간대: {location.timezone}</p>}<p>도시를 선택하면 도시 중심, 현재 위치에 동의하면 확인한 위치를 사용해. 상대방의 위치가 아니라 질문 당시 네가 있던 장소야.</p>
      <label htmlFor="sky-time">질문이 떠오른 날짜와 시각 (선택한 도시의 현지 시간)</label><input id="sky-time" type="datetime-local" required value={localTime} onChange={e=>setLocalTime(e.target.value)}/>
      <p>기억하는 시각을 그대로 적어줘. 시간대는 도시를 기준으로 서버에서 확인하고 저장해. 정확히 기억나지 않으면 임의로 채우지 말고 질문을 새로 정리한 순간을 기준으로 해줘. 출생정보는 필요하지 않아.</p>
      <label htmlFor="sky-situation">이미 알고 있는 상황 (선택)</label><textarea id="sky-situation" rows={3} maxLength={600} value={situation} onChange={e=>setSituation(e.target.value)} placeholder="이름과 주소 대신 네가 알고 있는 상황만 적어줘."/>
      <label><input type="checkbox" checked={boundary} onChange={e=>setBoundary(e.target.checked)}/> 상대가 연락을 거절하거나 차단한 상황이에요</label>
      <div className={styles.checkoutSection}><h2>상담 내용 확인</h2><p>{free?'전통 서양 호라리 계산과 외부 AI 상담 프롬프트':`${product.fishName} 상담 · ${product.chapterCount}개 이야기와 영냥이의 마무리`}</p><strong>{free?'무료 · 프롬프트 제공':`${product.priceKRW.toLocaleString('ko-KR')}원 · Family 또는 단건 결제`}</strong><p>{SPIRIT_NOTICE}</p>
        <button type="submit" disabled={busy||!ready||!available}>{busy?'질문 순간의 결을 살피는 중':free?'무료 호라리 프롬프트 만들기':'결제 내용 확인하기'}</button>
        {!ready&&<p role="status">상담 준비 상태를 확인하고 있어요.</p>}{ready&&!available&&<p>지금은 상담 준비 중이에요. 결제는 진행되지 않아요.</p>}
        {error&&<p role="alert">{error}</p>}
      </div>
    </form>
    {reading&&<div><h2>호라리 계산을 마쳤어</h2>{reading.basis.map(item=><p key={item.label}>{item.label}: {item.value}</p>)}<FreePromptContinuation prompt={reading.prompt}/></div>}
    <nav className={styles.spiritLinks} aria-label="상담 이동"><a href="/yeongnyangi/library/">내 상담 기록</a><a href={`/yeongnyangi/fortune/?mode=${mode==='prashna-v1'?'horary':'spirit'}`}>{mode==='prashna-v1'?'서양 방식으로 질문하기':'영냥 신점으로 질문하기'}</a><a href="/yeongnyangi/fortune/">다른 상담 고르기</a></nav>
  </section>;
}
