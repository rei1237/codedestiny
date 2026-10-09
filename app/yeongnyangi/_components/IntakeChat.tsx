'use client';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowUp,ChevronDown} from 'lucide-react';
import {questionCandidate,questionTopics,recommendQuestion,FOLLOWUP_LIMITS,type QuestionDecision} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {products,systemNames} from '@/worker/yeongnyangi/payments/catalog';
import {intakeSteps,intakeAnswer,intakeStepValid,intakePrompts,intakeCursor,type IntakeValue,type IntakeStep} from '../_lib/intake-chat';
import type {VoiceStyle} from '../_lib/voice-style-copy';
import styles from './intake-chat.module.css';
import ChatInputBar,{IntakeComposerContext} from './ChatInputBar';

export type PreparationStep={id:string;prompt:string;answer:string;content:ReactNode;valid:boolean;pending?:boolean};
type Props={value:IntakeValue;onChange:(next:IntakeValue)=>void;confirmed:boolean;onConfirm:()=>void;onEdit:()=>void;step:string;onStep:(step:string)=>void;voice:VoiceStyle;onVoice:(voice:VoiceStyle)=>void;onLegacy:()=>void;preparation:PreparationStep[];review:ReactNode;busy:boolean};
export default function IntakeChat({value,onChange,confirmed,onConfirm,onEdit,step,onStep,voice,onVoice,onLegacy,preparation,review,busy}:Props){
 const root=useRef<HTMLElement>(null),scroll=useRef<HTMLDivElement>(null),follow=useRef(true),composer=useRef<HTMLDivElement>(null),field=useRef<HTMLTextAreaElement>(null),focusNext=useRef(false);
 const [touch,setTouch]=useState(false),[atBottom,setAtBottom]=useState(true),[typing,setTyping]=useState(false);
 const [slot,setSlot]=useState<HTMLDivElement|null>(null),[claims,setClaims]=useState(0);
 // 대화 안의 단계(프로필 만들기)가 하단 슬롯을 차지하면 기본 전송 버튼을 숨겨 전송 버튼을 하나만 둔다.
 const toBottom=useCallback(()=>{follow.current=true;setAtBottom(true);requestAnimationFrame(()=>scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'instant'}));},[]);
 const claim=useCallback((on:boolean)=>setClaims(n=>n+(on?1:-1)),[]);
 const composerContext=useMemo(()=>({slot,follow:toBottom,claim}),[slot,toBottom,claim]);
 const scopeSteps=intakeSteps(value);
 const {steps,index}=intakeCursor(value,confirmed,step,preparation),active=steps[index];
 const shown=useRef(index);
 const scopeStep=scopeSteps.includes(active as IntakeStep)?active as IntakeStep:null;
 const preparationStep=preparation.find(p=>p.id===active);
 const prompt=(id:string)=>intakePrompts[id as IntakeStep]?.[voice==='honorific'?1:0]||preparation.find(p=>p.id===id)?.prompt||'입력 내용 확인';
 const activePrompt=active==='review'?(voice==='honorific'?'준비가 됐어요. 마지막으로 함께 확인해 주세요.':'준비가 됐어. 마지막으로 함께 확인하자.'):prompt(active);
 const plan=recommendQuestion(value.domain,value.decision,value.question);
 const product=products.find(p=>p.domain===value.domain&&p.fishId===plan.fish&&p.readingKind==='single')!;
 const textStep=scopeStep&&['question','situation','options','constraints','period'].includes(scopeStep)?scopeStep:null;
 const text=textStep?intakeAnswer(textStep,value):'';
 const update=(patch:Partial<QuestionDecision>)=>onChange({...value,decision:{...value.decision,...patch,confirmed:false}});
 const setText=(text:string)=>textStep==='question'?onChange({...value,question:text}):textStep&&update({[textStep]:text});
 const valid=scopeStep?intakeStepValid(scopeStep,value):preparationStep?.valid;
 const max=textStep==='question'?1000:600;
 function next(){follow.current=true;focusNext.current=true;if(active==='scope'){onConfirm();onStep(value.domain==='tarot'?'tarot':'profile');}else onStep(steps[index+1]||'review');}
 function edit(id:string){if(busy)return;follow.current=true;if(scopeSteps.includes(id as IntakeStep))onEdit();onStep(id);}
 useLayoutEffect(()=>{
  const advanced=index>shown.current;shown.current=index;
  if(!advanced||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setTyping(false);return;}
  setTyping(true);const timer=setTimeout(()=>setTyping(false),600);return()=>clearTimeout(timer);
 },[index]);
 useEffect(()=>{
  if(follow.current&&scroll.current)scroll.current.scrollTo({top:scroll.current.scrollHeight,behavior:'instant'});
  if(!typing&&focusNext.current){focusNext.current=false;if(!touch)field.current?.focus({preventScroll:true});}
 },[active,typing,touch]);
 useEffect(()=>{
  const query=window.matchMedia('(pointer: coarse)'),sync=()=>setTouch(query.matches);
  sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);
 },[]);
 useLayoutEffect(()=>{
  const el=field.current;if(!el)return;
  el.style.height='auto';el.style.height=Math.min(el.scrollHeight,144)+'px';
 },[text,textStep]);
 useEffect(()=>{if(active!==step)onStep(active);},[active,step,onStep]);
 useEffect(()=>{
  const viewport=window.visualViewport;
  const resize=()=>{
   if(!root.current)return;
   const top=root.current.getBoundingClientRect().top;
   root.current.style.setProperty('--intake-height',Math.max(240,(viewport?.height||window.innerHeight)-Math.max(0,top)-8)+'px');
  };
  resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
  return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);};
 },[]);
 const choices=(items:{value:string;label:string}[],selected:string,select:(value:string)=>void)=><div className={styles.choices}>{items.map(item=><button type="button" key={item.value} aria-pressed={selected===item.value} onClick={()=>select(item.value)}>{item.label}</button>)}</div>;
 return <IntakeComposerContext.Provider value={composerContext}><section ref={root} className={styles.chat} aria-label="영냥이와 상담 준비">
  <header className={styles.header}>
   {index>0?<button type="button" aria-label="이전 답변으로 돌아가기" disabled={busy} onClick={()=>edit(steps[index-1])}><ArrowLeft size={20}/></button>:<a href="/yeongnyangi/" aria-label="영냥이 홈으로"><ArrowLeft size={20}/></a>}
   <img src="/assets/yeongnyangi/profiles/welcome.webp" alt="" width={44} height={44}/>
   <div><h1>영냥이와 상담 준비</h1><p>{confirmed?'상담 정보 확인':'고민을 들려주세요'}</p></div>
   <label className={styles.voice}><span className={styles.srOnly}>영냥이 말투</span><select value={voice} disabled={busy} onChange={e=>onVoice(e.target.value as VoiceStyle)}><option value="banmal">편한 말투</option><option value="honorific">존댓말</option></select></label>
  </header>
  <div className={styles.stage}>
  <div className={styles.transcript} ref={scroll} onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<90;setAtBottom(follow.current);}}>
   <p className={styles.notice}>상담 준비 대화예요 · 추가 질문 횟수는 사용하지 않아요</p>
   {steps.slice(0,index).map(id=><div key={id} className={styles.turn}>
    <div className={styles.cat}><img src="/assets/yeongnyangi/profiles/welcome.webp" alt="" width={36} height={36}/><div className={styles.catBubble}>{prompt(id)}</div></div>
    <div className={styles.reply}><p>{scopeSteps.includes(id as IntakeStep)?intakeAnswer(id as IntakeStep,value)||'건너뛰었어요':preparation.find(p=>p.id===id)?.answer||'확인했어요'}</p><button type="button" disabled={busy} onClick={()=>edit(id)}>수정</button></div>
   </div>)}
   <div className={styles.current}><img src="/assets/yeongnyangi/profiles/welcome.webp" alt="" width={36} height={36}/><div><span className={styles.name}>영냥이</span>{typing?<p className={`${styles.catBubble} ${styles.typing}`} aria-hidden="true"><i/><i/><i/></p>:<p key={active} className={styles.catBubble}>{activePrompt}</p>}</div></div>
   <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{typing?'':activePrompt}</div>
   {!typing&&active==='scope'&&<div className={styles.summary}><h2>{plan.reason}</h2><p>{systemNames[value.domain]} · {product.fishName}</p><strong>{product.priceKRW.toLocaleString('ko-KR')}원</strong><p>기본 상담 + 추가 질문 {FOLLOWUP_LIMITS[plan.fish]}회</p><p>다음으로 {value.domain==='tarot'?'카드와 입력 정보':'프로필'}를 확인해요. 아직 결제되지 않아요.</p>{plan.unsupported&&<p role="alert">{plan.unsupported}</p>}{plan.missing.length>0&&<ul>{plan.missing.map(message=><li key={message}>{message}</li>)}</ul>}{!valid&&<button type="button" onClick={()=>edit('category')}>주제와 범위 수정하기</button>}<details><summary>추가 질문·결과 보관 안내</summary><p>확인 대화·서비스 오류 정정·지원 문의는 횟수를 쓰지 않아요. 상담을 마쳐도 저장된 결과는 다시 볼 수 있어요.</p><p>출생 차트만으로 사건의 날짜를 예측하지 않아요. 타로는 카드의 상징과 자리로 선택을 살펴봐요.</p></details></div>}
   {preparationStep&&<div className={styles.preparation} ref={composer} hidden={typing}>{preparationStep.content}</div>}
   {active==='review'&&<div className={styles.preparation} hidden={typing}>{review}</div>}
  </div>
  {!atBottom&&<button className={styles.latest} type="button" onClick={()=>{follow.current=true;setAtBottom(true);scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'instant'});}}><ChevronDown size={16}/>최근 대화</button>}
  </div>
  {active!=='review'&&<div className={styles.composer}>
   <div ref={setSlot}/>
   {scopeStep==='category'&&<>{questionCandidate(value.question)&&<p className={styles.help}>질문을 보면 ‘{questionTopics.find(t=>t.id===questionCandidate(value.question))?.label}’ 주제가 가까워 보여요. 직접 골라 주세요.</p>}{choices(questionTopics.map(t=>({value:t.id,label:t.label})),value.decision.category,category=>update({category:category as QuestionDecision['category'],...(category==='compatibility'?{target:'pair'}:{})}))}</>}
   {scopeStep==='target'&&choices([{value:'self',label:'내 생각·행동·선택'},{value:'pair',label:'두 사람의 궁합·관계 구조'}],value.decision.target,target=>update({target:target as QuestionDecision['target']}))}
   {scopeStep==='horizon'&&choices([{value:'current',label:'지금의 고민과 선택'},{value:'transition',label:'현재와 다음 장기 시기'}],value.decision.horizon,horizon=>update({horizon:horizon as QuestionDecision['horizon']}))}
   {scopeStep==='relationshipType'&&choices([{value:'romantic_adults',label:'성인 연인·배우자'},{value:'family',label:'가족'},{value:'other',label:'그 밖의 관계'}],value.decision.relationshipType||'',relationshipType=>update({relationshipType:relationshipType as QuestionDecision['relationshipType']}))}
   {scopeStep==='domain'&&choices(Object.entries(systemNames).map(([id,label])=>({value:id,label})),value.domain,domain=>onChange({...value,domain:domain as IntakeValue['domain']}))}
   {scopeStep==='question'&&!text.trim()&&<div className={styles.chips} role="group" aria-label="예시 질문"><span>예시로 시작</span>{questionTopics.filter(t=>t.example).map(t=><button type="button" key={t.id} onClick={()=>onChange({...value,question:t.example,decision:{...value.decision,category:t.id,...(t.id==='compatibility'?{target:'pair'}:{})}})}>{t.label}</button>)}</div>}
   {scopeStep==='situation'&&<div className={styles.chips}><button type="button" onClick={()=>update({situation:value.question.slice(0,600)})}>앞에서 말한 내용으로 충분해</button></div>}
   {scopeStep==='constraints'&&<div className={styles.chips}><button type="button" onClick={()=>update({constraints:'없음'})}>특별한 조건은 없어</button></div>}
   {scopeStep==='period'&&!['salmon','tuna'].includes(plan.fish)&&<div className={styles.chips}><button type="button" onClick={()=>{update({period:''});next();}}>기간은 정하지 않을게</button></div>}
   {textStep?<>
    {text.length>=max*.8&&<span className={styles.count} data-near={text.length>=max*.95||undefined}>{text.length.toLocaleString('ko-KR')}/{max.toLocaleString('ko-KR')}</span>}
    <ChatInputBar label={activePrompt} sendLabel="답장 보내기" disabled={!valid||busy} onSend={next}><textarea ref={field} rows={1} maxLength={max} value={text} onChange={e=>setText(e.target.value)} placeholder="영냥이에게 답장하기…" aria-describedby="intake-send-hint" onKeyDown={e=>{if(e.key!=='Enter'||e.nativeEvent.isComposing||e.keyCode===229)return;if(!(e.ctrlKey||e.metaKey)&&(e.shiftKey||touch))return;e.preventDefault();if(valid&&!busy)next();}}/></ChatInputBar>
    <span id="intake-send-hint" className={styles.srOnly}>{touch?'보내기 버튼으로 답장을 보내요.':'Enter로 보내고 Shift+Enter로 줄을 바꿔요.'}</span>
   </>:claims>0?null:<button className={styles.send} type="button" disabled={!valid||busy} onClick={next}>{active==='scope'?'범위·가격 확인하고 계속하기':'선택 확인하고 계속하기'}<ArrowUp size={18}/></button>}
   {index===0&&<button type="button" className={styles.legacy} onClick={onLegacy}>질문 없이 전체 성향 리포트 고르기</button>}
  </div>}
 </section></IntakeComposerContext.Provider>;
}
