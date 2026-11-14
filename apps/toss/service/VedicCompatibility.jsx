import {useEffect,useRef,useState} from 'react';
import {createVedicReader} from 'virtual:toss-vedic-reading';
import 'virtual:toss-vedic-reading.css';
import {vedicSourceBridge} from './vedic-source-bridge.mjs';
import {safeVedicMarkup} from './VedicReading';
import {AstralBirthFields,astralBirthPayload,emptyBirth} from '../src/AstralBirthFields';
import {Button} from '../src/Button';
import {api} from '../src/platform';
import TossSessionScope from '../src/TossSessionScope';

export function buildVedicCompatibility(payload){
 const source=payload=>{const reader=createVedicReader(vedicSourceBridge(payload.samples));const chart=reader.buildChart(payload.input,undefined,payload.natal||null);if(reader.usedFallback())throw Error('VEDIC_SOURCE_FALLBACK_REJECTED');return {reader,chart};};
 const mine=source(payload.mine),partner=source(payload.partner),compat=mine.reader.calcCompatibility(mine.chart.nak.name,partner.chart.nak.name);
 const textName=chart=>({...chart,f:{...chart.f,name:String(chart.f.name||'').replace(/[&<>"']/g,value=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]))}});
 return {html:mine.reader.renderVedicCompatibility(textName(mine.chart),textName(partner.chart),compat),compat};
}
function Reading({loggedIn,onLogin,onError,request=api,exampleBirth}){
 const [birth,setBirth]=useState(emptyBirth),[partner,setPartner]=useState(emptyBirth),[name,setName]=useState(''),[partnerName,setPartnerName]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
 const pending=useRef(false),epoch=useRef(0);useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{const back=event=>{if(result){event.preventDefault();setResult(null);}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function submit(event){event.preventDefault();if(pending.current)return;if(birth.unknown||partner.unknown){setIssue('베다 명반을 계산하려면 두 사람의 태어난 시각이 필요해요.');return;}pending.current=true;setBusy(true);setIssue('');const revision=epoch.current;
  try{const payload=await request('/vedic/compatibility',{name,birth:astralBirthPayload(birth),partner:{name:partnerName,birth:astralBirthPayload(partner)}});if(payload.accessSource!=='public'||payload.featureKey!=='vedic-compatibility-per-use')throw Error('READING_UNAVAILABLE');const next=buildVedicCompatibility(payload);if(epoch.current===revision)setResult(next);}catch(error){if(epoch.current===revision){setIssue(error?.code==='VEDIC_COMPATIBILITY_EXAMPLE_REQUIRED'?'비공개 모의 상담에서는 모의 예시 입력하기로 확인해 주세요.':'궁합을 준비하지 못했어요. 두 사람의 출생정보와 연결을 확인해 주세요.');if(error?.status===401)onError(error);}}finally{if(epoch.current===revision){pending.current=false;setBusy(false);}}
 }
 if(!loggedIn)return <section><h1>베다 아쉬타쿠타 궁합</h1><p>로그인 후 두 사람의 나크샤트라에서 관계의 흐름을 살펴봐요.</p><Button display="block" onClick={onLogin}>토스 로그인하고 궁합 살펴보기</Button></section>;
 if(result)return <section className="toss-vedic-reading"><h1>베다 아쉬타쿠타 궁합</h1><div dangerouslySetInnerHTML={{__html:safeVedicMarkup(result.html)}}/><p>8항목의 상징적 궁합은 관계를 돌아보기 위한 참고 자료예요. 새 무료 계산은 구매 보관함에 저장되지 않아요.</p><Button display="block" variant="weak" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></section>;
 return <section><h1>베다 아쉬타쿠타 궁합</h1><p>두 사람의 달이 머문 나크샤트라를 바탕으로 8항목의 강점과 주의점을 살펴봐요.</p><form className="form" onSubmit={submit}>{exampleBirth&&<><p>비공개 모의 상담에서는 검증된 예시로 원본 궁합을 확인해요.</p><Button type="button" variant="weak" onClick={()=>{setBirth({...exampleBirth});setPartner({...exampleBirth,date:'1991-04-05',time:'12:30',gender:'M'});setName('나');setPartnerName('상대');}}>모의 예시 입력하기</Button></>}
 <label>나의 이름 · 선택<input maxLength={40} value={name} disabled={busy} onChange={event=>setName(event.target.value)}/></label><AstralBirthFields title="나의 출생정보" value={birth} onChange={setBirth} disabled={busy}/>
 <label>상대 이름<input required maxLength={40} value={partnerName} disabled={busy} onChange={event=>setPartnerName(event.target.value)}/></label><AstralBirthFields title="상대의 출생정보" value={partner} onChange={setPartner} disabled={busy}/>
 <Button display="block" type="submit" disabled={busy} loading={busy}>아쉬타쿠타 궁합 펼치기</Button></form>{issue&&<p role="alert">{issue}</p>}</section>;
}
export default function VedicCompatibility(props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
