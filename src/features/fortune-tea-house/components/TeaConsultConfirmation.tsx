"use client";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getAuthState } from "@/app/_lib/auth-store";
import { teaSpreads, recommendTeaSpread } from "@/lib/fortune-tea-house/tarot-contract.mjs";
import { teaSpreadCopy } from "../data/teaSpreadCopy";
import { getFortuneTeaHouseConsultPriceLabel } from "../data/consultPricing";
import type { FortuneTeaHouseQuestionInput } from "../data/consult";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import TeaHouseButton from "./TeaHouseButton";
import TeaCalculationPolicy from "./TeaCalculationPolicy";
import styles from "../styles/tea-confirm.module.css";
const KO = {
 information:"사용할 정보",unknown:"출생시간 미상",solar:"양력",lunar:"음력",leap:"윤달",
 titleKo:"상담 내용을 확인해 주세요", question:"내 질문", price:"단건 기준",
 scope:"핵심 답변 · 해석 근거 · 행동 조언 · 연이의 편지", policy:"이용권·월정석 적용 여부는 다음 단계에서 확인해요. 추가 질문은 현재 상품에 포함된 권한이 있을 때만 이용할 수 있어요.",
 edit:"질문 수정하기", continue:"권한 확인하고 상담 시작", prepare:"이 질문으로 카드 준비하기",
 spread:"질문에 맞는 카드 배열", draw:"카드 선택 확정", auto:"자동으로 선택하기",
 drawHelp:"서버에서 78장을 한 번 섞고 방향을 고정해요. 고른 순서대로 각 자리에 놓이며, 결제 복귀와 재시도에도 같은 카드를 읽어요.",
 login:"카드를 안전하게 보관하려면 로그인해 주세요.", retry:"카드를 준비하지 못했어요. 같은 질문으로 다시 시도해 주세요.",
 selected:"선택한 카드", ready:"카드 선택이 저장됐어요. 결제 복귀 후에도 그대로 이어져요.",
 selectCount:"선택", terms:"정·역방향을 같은 확률로 사용하며, 역방향은 무조건 나쁜 뜻이 아니에요.",
};
type Draft={attemptId:string;status:string;deckSize:number;cards?:unknown[];spread:{cardCount:number;title:string;positions:{id:string;label:string}[]}};
export default function TeaConsultConfirmation({input,cupId,onConfirm,onBack,busy=false}:{input:FortuneTeaHouseQuestionInput;cupId:string;onConfirm:(input:FortuneTeaHouseQuestionInput)=>void;onBack:()=>void;busy?:boolean}){
 const copy=useTeaHouseCopy("confirmation",KO);
 const spreadsCopy=useTeaHouseCopy("spreadV2",teaSpreadCopy);
 const isTarot=input.consultationMode==="tarot";
 const [spreadId,setSpreadId]=useState(()=>teaSpreads.find(s=>s.id===input.tarotSpreadId)?.id||recommendTeaSpread(input.question,input.tarotSpread)?.id||"yn_knot_three");
 const [draft,setDraft]=useState<Draft|null>(null),[picks,setPicks]=useState<number[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const chosen=teaSpreads.find(s=>s.id===spreadId)!;
 const spreadCopy=spreadsCopy[chosen.id as keyof typeof spreadsCopy];
 const people=input.consultationMode==="sukuyo" ? [input.sukuyo?.user,input.sukuyo?.partner] : input.consultationMode==="sajuCompatibility" ? [input.sajuCompatibility?.user,input.sajuCompatibility?.partner] : [input];
 const size=chosen.cardCount===5?"five":"three";
 async function prepare(){
  if(!getAuthState().user){setError(copy.login);return;}
  setLoading(true);setError("");
  try{
   const key="cd_tea_draw_attempt";
   const identity=JSON.stringify([getAuthState().user?.id,spreadId,input.question,cupId,input.concernTopic]);
   let attemptId=input.attemptId && input.tarotSpreadId===spreadId ? input.attemptId : crypto.randomUUID();
   try{const saved=JSON.parse(sessionStorage.getItem(key)||"null");if(!input.attemptId && saved?.identity===identity)attemptId=saved.attemptId;else sessionStorage.setItem(key,JSON.stringify({identity,attemptId}));}catch{/* Browser storage is optional; the server is authoritative. */}
   const response=await authFetch("/api/fortune-tea-house/tarot/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,selectedTeaCupId:cupId,tarotSpreadId:spreadId,attemptId})});
   const payload=await response.json();if(!response.ok||!payload.ok)throw new Error();
   setDraft(payload.draft);
  }catch{setError(copy.retry);}finally{setLoading(false);}
 }
 async function draw(auto=false){
  if(!draft||loading)return;setLoading(true);setError("");
  try{
   const response=await authFetch("/api/fortune-tea-house/tarot/draw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({attemptId:draft.attemptId,...(auto?{auto:true}:{picks})})});
   const payload=await response.json();if(!response.ok||!payload.ok)throw new Error();
   setDraft(payload.draft);
  }catch{setError(copy.retry);}finally{setLoading(false);}
 }
 return <section className={styles.confirm} aria-labelledby="tea-confirm-title">
  <h2 id="tea-confirm-title">{copy.titleKo}</h2><p>{copy.question}</p><blockquote>{input.question}</blockquote>
  <p>{copy.scope}</p><p>{copy.price}: <strong>{getFortuneTeaHouseConsultPriceLabel(input.consultationMode,isTarot?size:undefined)}</strong></p><p>{copy.policy}</p>
  {!isTarot&&<div><h3>{copy.information}</h3><ul>{people.map((person,index)=>person&&<li key={index}>{[
    "name" in person ? person.name : input.nickname,person.birthDate,
    person.calendarType==="lunar" ? copy.lunar : copy.solar,person.isLeapMonth ? copy.leap : "",
    input.consultationMode!=="sukuyo" ? ("birthTime" in person && person.birthTime ? person.birthTime : copy.unknown) : "",
    person.timezone,person.longitude == null ? "" : String(person.longitude)+"°",
  ].filter(Boolean).join(" · ")}</li>)}</ul></div>}
  <TeaCalculationPolicy mode={input.consultationMode}/>
  {isTarot&&<><label>{copy.spread}<select value={spreadId} disabled={!!draft||loading} onChange={e=>setSpreadId(e.target.value)}>{teaSpreads.map(s=><option key={s.id} value={s.id}>{spreadsCopy[s.id as keyof typeof spreadsCopy].title} · {s.cardCount}</option>)}</select></label>
   <p>{spreadCopy.reason}</p><ol>{chosen.positions.map(p=><li key={p.id}>{(spreadCopy.positions as Record<string,string>)[p.id]}</li>)}</ol><p>{copy.drawHelp}</p><p>{copy.terms}</p>
   {!draft?<TeaHouseButton onClick={()=>void prepare()} loading={loading}>{copy.prepare}</TeaHouseButton>:draft.status==="drawn"?<p role="status">{copy.ready}</p>:<>
    <p role="status">{copy.selectCount} {picks.length}/{chosen.cardCount}</p>
    <div className={styles.deck}>{Array.from({length:draft.deckSize},(_,i)=><button key={i} type="button" aria-label={`${copy.selected} ${i+1}`} aria-pressed={picks.includes(i)} disabled={loading||(!picks.includes(i)&&picks.length>=chosen.cardCount)} onClick={()=>setPicks(old=>old.includes(i)?old.filter(n=>n!==i):[...old,i])}>{picks.includes(i)?picks.indexOf(i)+1:i+1}</button>)}</div>
    <div className={styles.actions}><TeaHouseButton onClick={()=>void draw()} disabled={picks.length!==chosen.cardCount} loading={loading}>{copy.draw}</TeaHouseButton><TeaHouseButton variant="ghost" onClick={()=>void draw(true)} disabled={loading}>{copy.auto}</TeaHouseButton></div>
   </>}
  </>}
  {error&&<p role="alert">{error}{!getAuthState().user&&<a href="/login/?next=%2Ffortune-tea-house%2F">{copy.login}</a>}</p>}
  <div className={styles.actions}><TeaHouseButton variant="ghost" onClick={onBack} disabled={busy||loading}>{copy.edit}</TeaHouseButton><TeaHouseButton disabled={loading||(isTarot&&draft?.status!=="drawn")} loading={busy} onClick={()=>{trackEvent("tea_consult_confirmed",{method:input.consultationMode});onConfirm({...input,consultationVersion:"tea-v2",...(isTarot?{attemptId:draft!.attemptId,tarotSpreadId:spreadId,tarotSpread:size}:{})});}}>{copy.continue}</TeaHouseButton></div>
 </section>;
}
