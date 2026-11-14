import {useEffect,useRef,useState} from 'react';
import {createVedicReader} from 'virtual:toss-vedic-reading';
import 'virtual:toss-vedic-reading.css';
import {buildOriginalVedicReading} from './vedic-source-bridge.mjs';
import {AstralBirthFields as BirthFields,astralBirthPayload as birthPayload,emptyBirth} from '../src/AstralBirthFields';
import {Button} from '../src/Button';
import {api} from '../src/platform';
import TossSessionScope from '../src/TossSessionScope';

const detailNames={personality:'성향 심층',wealth:'재물 상세',career:'직업 상세',romance:'연애 상세',chakra:'차크라 상세',yoga:'요가 상세',remedies:'처방 상세',vimshottari:'빔쇼타리 다샤'};
// Keep authored markup and styles, but route its two local actions through React.
// Generated text is still untrusted at the HTML boundary (e.g. a profile name).
export function safeVedicMarkup(html){
 const template=document.createElement('template');template.innerHTML=html;
 template.content.querySelectorAll('script,iframe,object,embed,link,meta,base,form').forEach(node=>node.remove());
 template.content.querySelectorAll('*').forEach(node=>{for(const attribute of [...node.attributes]){
  if(/^on/i.test(attribute.name)){if(attribute.name==='onclick'&&/^(?:goBack\(\)|toggleAcc\('[a-z0-9-]+'\)|openBhavaMeaning\((?:[1-9]|1[0-2])\)|closeBhavaMeaning\(\))$/.test(attribute.value))node.setAttribute('data-vedic-action',attribute.value);node.removeAttribute(attribute.name);}
  else if(['href','src','xlink:href'].includes(attribute.name)&&/^\s*(?:javascript|data):/i.test(attribute.value))node.removeAttribute(attribute.name);
 }if(node.classList.contains('reveal'))node.classList.add('visible');});
 return template.innerHTML;
}
function ReadingMarkup({html,onBack,onBhava=()=>{}}){const host=useRef(null);useEffect(()=>{host.current?.querySelectorAll('.acc-body.open').forEach(node=>{node.style.maxHeight=node.scrollHeight+24+'px';});},[html]);return <div ref={host} onClick={event=>{const target=event.target.closest('[data-vedic-action]');if(!target)return;const action=target.dataset.vedicAction;if(action==='goBack()'){onBack();return;}if(action==='closeBhavaMeaning()'){onBhava(0);return;}const term=/^openBhavaMeaning\((\d+)\)$/.exec(action);if(term){onBhava(Number(term[1]));return;}const id=/^toggleAcc\('([a-z0-9-]+)'\)$/.exec(action)?.[1],body=id&&host.current.querySelector('[id="acc-'+id+'"]'),arrow=id&&host.current.querySelector('[id="arr-'+id+'"]');if(body){const open=!body.classList.contains('open');body.classList.toggle('open',open);body.style.maxHeight=open?body.scrollHeight+24+'px':'0px';target.setAttribute('aria-expanded',String(open));if(arrow)arrow.textContent=open?'▴':'▾';}}} dangerouslySetInnerHTML={{__html:safeVedicMarkup(html)}}/>;}
export default function VedicReading(props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
function Reading({request=api,onError=()=>{},exampleBirth}){
 const [birth,setBirth]=useState(emptyBirth),[name,setName]=useState(''),[result,setResult]=useState(null),[tab,setTab]=useState('overview'),[detail,setDetail]=useState(''),[term,setTerm]=useState(0),[style,setStyle]=useState('south'),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
 const pending=useRef(false),epoch=useRef(0);useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{const back=event=>{if(!result)return;event.preventDefault();if(term)setTerm(0);else if(detail)setDetail('');else setResult(null);};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result,detail,term]);
 async function submit(event){event.preventDefault();if(pending.current)return;if(birth.unknown){setIssue('라그나와 다샤를 살펴보려면 태어난 시각이 필요해요.');return;}pending.current=true;setBusy(true);setIssue('');const current=++epoch.current;try{const payload=await request('/vedic/reading',{birth:birthPayload(birth),name});const next=buildOriginalVedicReading(createVedicReader,payload);if(current===epoch.current){setResult(next);setTab('overview');setDetail('');setTerm(0);}}catch(error){if(current===epoch.current){if(error?.status===401||error?.code==='SESSION_CHANGED')onError(error);else if(error?.code==='VEDIC_EXAMPLE_REQUIRED')setIssue('이 출생정보는 비공개 모의 상담에서 지원하지 않아요. 모의 예시 입력하기를 눌러 검증된 예시로 확인해 주세요.');else setIssue('베다 해석을 준비하지 못했어요. 출생정보와 연결 상태를 확인한 뒤 다시 시도해 주세요.');}}finally{if(current===epoch.current){pending.current=false;setBusy(false);}}}
 if(!result)return <section><h1>베다점 출생차트</h1><p>원본 명반과 다샤, 성향·관계·재물의 해석을 함께 살펴봐요.</p><form className="form" onSubmit={submit}>{exampleBirth&&<aside><p>비공개 모의 상담에서는 검증된 예시 출생정보로 원본 풀이를 확인할 수 있어요.</p><Button type="button" variant="weak" disabled={busy} onClick={()=>setBirth(exampleBirth)}>모의 예시 입력하기</Button></aside>}<label className="field">이름 · 선택<input value={name} maxLength={40} disabled={busy} onChange={event=>setName(event.target.value)}/></label><BirthFields title="베다 해석에 사용할 출생정보" value={birth} onChange={setBirth} disabled={busy}/>{issue&&<p role="alert">{issue}</p>}<Button display="block" type="submit" loading={busy} disabled={busy}>출생차트와 해석 펼치기</Button></form></section>;
 return <section className="toss-vedic-reading"><Button variant="weak" onClick={()=>detail?setDetail(''):setResult(null)}>{detail?'차트로 돌아가기':'출생정보 다시 보기'}</Button><h1>{detail?detailNames[detail]:'나의 베다 명반'}</h1>
  {term>0&&<ReadingMarkup html={result.glossary[term]} onBack={()=>setTerm(0)} onBhava={setTerm}/>}
  {detail?<ReadingMarkup html={result.details[detail]} onBack={()=>{setDetail('');setTerm(0);}} onBhava={value=>{setTerm(value);window.scrollTo(0,0);}}/>:<><nav aria-label="명반 형태"><Button variant="weak" aria-pressed={style==='south'} onClick={()=>setStyle('south')}>남인도 명반</Button><Button variant="weak" aria-pressed={style==='north'} onClick={()=>setStyle('north')}>북인도 명반</Button></nav><ReadingMarkup html={result[style]} onBack={()=>setResult(null)}/>
   <h2>라그나 · {result.chart.rasi.ascSignKr}</h2><p>달의 나크샤트라 · {result.chart.nak.name} · {result.chart.nak.pada}파다</p><h2>현재 다샤</h2><p>{result.dasha.maha} → {result.dasha.anta}</p>
   <nav aria-label="베다 해석 주제">{Object.entries(result.sections).map(([key,value])=><Button key={key} variant="weak" aria-pressed={tab===key} onClick={()=>setTab(key)}>{value.title}</Button>)}</nav><ReadingMarkup html={result.sectionCards[tab]} onBack={()=>setResult(null)}/>
   <h2>분야별 상세 해석</h2>{Object.entries(detailNames).map(([key,title])=><Button key={key} variant="weak" onClick={()=>{setDetail(key);setTerm(0);window.scrollTo(0,0);}}>{title}</Button>)}
  </>}
  <p>이 해석은 전통 상징을 읽는 참고 자료이며, 결과는 현재 화면에서 확인할 수 있어요.</p>
 </section>;
}
