import {useEffect,useMemo,useRef,useState} from 'react';
import {FPTI_AXIS_GUIDE,FPTI_DICTIONARY,FPTI_FILTERS,FPTI_UNKNOWN_CODE_MESSAGE,findFptiDictionaryItem,type FptiDictionaryItem} from '@/lib/fpti/fpti-dictionary';
import {getFptiSharedCopy} from '@/components/fpti/_lib/copy';

const copy=getFptiSharedCopy('ko');

function matches(item:FptiDictionaryItem,query:string,filters:string[]){
 const text=[item.code,item.legacyCode,item.name,item.subtitle,item.summary,item.easyDescription,...item.keywords,...item.tags,...item.elementTone].filter(Boolean).join(' ').toLowerCase();
 return (!query||text.includes(query))&&filters.every(filter=>filter.length===1?item.code.includes(filter)||Boolean(item.legacyCode?.includes(filter)):item.tags.includes(filter)||item.keywords.includes(filter));
}

export default function TossFptiDictionary({currentCode}:{currentCode?:string}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[filters,setFilters]=useState<string[]>([]),[selected,setSelected]=useState<FptiDictionaryItem|null>(null);
 const trigger=useRef<HTMLButtonElement|null>(null),close=useRef<HTMLButtonElement|null>(null),dialog=useRef<HTMLElement|null>(null),current=findFptiDictionaryItem(currentCode);
 const items=useMemo(()=>FPTI_DICTIONARY.filter(item=>matches(item,query.trim().toLowerCase(),filters)),[query,filters]);
 useEffect(()=>{
  if(!selected)return;
  close.current?.focus();
  const dismiss=()=>{setSelected(null);window.setTimeout(()=>trigger.current?.focus(),0);};
  const onBack=(event:Event)=>{if(event.defaultPrevented)return;event.preventDefault();dismiss();};
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();dismiss();return;}if(event.key==='Tab'&&dialog.current){const focusable=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.current.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.current.contains(document.activeElement))){event.preventDefault();first.focus();}}};
  window.addEventListener('code-destiny:toss-back',onBack,true);document.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('code-destiny:toss-back',onBack,true);document.removeEventListener('keydown',onKey);};
 },[selected]);
 return <details className="fpti-dictionary" onToggle={event=>{const next=event.currentTarget.open;setOpen(next);if(!next)setSelected(null);}}><summary>FPTI 유형 사전</summary>{open&&<div>
  <p>{copy.dictionaryIntro1}</p><p>{copy.dictionaryIntro2}</p><p>{copy.dictionaryIntro3}</p>
  {current&&<p>나의 유형: {currentCode} · {current.name}{current.code!==currentCode&&` (사전 코드 ${current.code})`}</p>}
  {currentCode&&!current&&<p>{FPTI_UNKNOWN_CODE_MESSAGE}</p>}
  <details><summary>성향 축 살펴보기</summary>{FPTI_AXIS_GUIDE.map(axis=><section key={axis.code}><h3>{axis.label}</h3><p>{axis.description}</p><p>{axis.example}</p><p>{axis.sajuSense}</p>{axis.options.map(option=><p key={option.code}><strong>{option.code} · {option.label}</strong> {option.description}</p>)}</section>)}</details>
  <label>유형 검색<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="코드, 유형, 키워드 검색"/></label>
  <div className="fpti-filter-list" aria-label="유형 필터">{FPTI_FILTERS.map(filter=><button type="button" key={filter} aria-pressed={filters.includes(filter)} onClick={()=>setFilters(previous=>previous.includes(filter)?previous.filter(value=>value!==filter):[...previous,filter])}>{filter}</button>)}</div>
  <p role="status">{items.length}개 유형</p>{items.length===0?<p>검색 결과가 없어요. 검색어나 필터를 바꿔 주세요.</p>:<div className="fpti-dictionary-grid">{items.map(item=><section key={item.code}><h3>{item.code} · {item.name}</h3>{item.legacyCode&&<p>{copy.resultCodeLabel} {item.legacyCode}</p>}{current?.code===item.code&&<p>{copy.currentTypeBadge}</p>}<p>{item.subtitle}</p><p>{item.summary}</p><p>{item.keywords.join(' · ')}</p><p>{item.elementTone.join(' · ')}</p><p>{copy.growthDirectionLabel} {item.growthAdvice}</p><button type="button" aria-label={`${item.code} ${item.name} 자세히 보기`} onClick={event=>{trigger.current=event.currentTarget;setSelected(item);}}>자세히 보기</button></section>)}</div>}
  <section><h3>{copy.faqHeading}</h3>{copy.faqItems.map(([question,answer])=><div key={question}><h4>{question}</h4><p>{answer}</p></div>)}</section>
  {selected&&<section ref={dialog} className="fpti-dictionary-detail" role="dialog" aria-modal="true" aria-labelledby="fpti-detail-title"><div><h2 id="fpti-detail-title">{selected.code} · {selected.name}</h2><button ref={close} type="button" onClick={()=>{setSelected(null);window.setTimeout(()=>trigger.current?.focus(),0);}}>닫기</button><p>{selected.subtitle}</p>{selected.legacyCode&&<p>{copy.modalLegacyNote(selected.legacyCode,selected.code)}</p>}<p>{selected.summary}</p><p>{selected.easyDescription}</p>{[['강점',selected.strengths],['살펴볼 점',selected.cautions]].map(([title,values])=><section key={title as string}><h3>{title}</h3><ul>{(values as string[]).map(value=><li key={value}>{value}</li>)}</ul></section>)}{[['관계',selected.relationshipStyle],['일',selected.workStyle],['재물',selected.moneyStyle],['성장',selected.growthAdvice],['추천 루틴',selected.recommendedRoutine],['어울리는 유형',selected.compatibleCodes.join(' · ')],['오행',selected.elementTone.join(' · ')]].map(([title,value])=><section key={title}><h3>{title}</h3><p>{value}</p></section>)}</div></section>}
 </div>}</details>;
}
