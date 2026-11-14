import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AstralBirthFields as BirthFields,astralBirthPayload as birthPayload,emptyBirth,type AstralBirthInput as BirthInput} from './AstralBirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import OriginalBody from './AstroReadingBody';
import {copyReadingText} from './question-location';
type Person={name:string;birth:string;cat:string;nationality:string};
type Catalog={people:Person[];categories:string[];countries:Record<string,{label:string;flag:string;order:number}>;css:string};
type Result={ok:boolean;accessSource:string;featureKey:string;html:string};
type Props={famous?:boolean;request?:typeof api;exampleBirth?:BirthInput};
function bindPrompt(host:HTMLElement){
 const status=host.querySelector<HTMLElement>('[data-astro-synastry-prompt-status]'),output=host.querySelector<HTMLTextAreaElement>('[data-astro-synastry-prompt-output]');
 if(status)status.textContent='계산한 차트에 기반한 분석 프롬프트예요.';
 host.querySelector('[data-astro-copy-synastry-prompt]')?.addEventListener('click',()=>void copyReadingText(output?.value||'').then(()=>{if(status)status.textContent='프롬프트를 복사했어요.';}).catch(()=>{if(status)status.textContent='위 프롬프트를 길게 눌러 직접 복사해 주세요.';}));
}
function Reading({famous=false,request=api,exampleBirth}:Props){
 const [birth,setBirth]=useState(emptyBirth),[partner,setPartner]=useState(emptyBirth),[name,setName]=useState(''),[catalog,setCatalog]=useState<Catalog|null>(null),[chosen,setChosen]=useState<Person|null>(null),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[country,setCountry]=useState(''),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
 const epoch=useRef(0),pending=useRef(false);
 useEffect(()=>{let active=true;request<Catalog>('/astro/synastry/people').then(value=>{if(active)setCatalog(value);}).catch(()=>{if(active)setIssue('궁합 자료를 불러오지 못했어요. 화면을 다시 열어 주세요.');});return()=>{active=false;epoch.current++;};},[request]);
 useEffect(()=>{const back=(event:Event)=>{if(result){event.preventDefault();setResult(null);}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function submit(event:FormEvent){event.preventDefault();if(pending.current||!catalog)return;if(famous&&!chosen){setIssue('함께 살펴볼 인물을 선택해 주세요.');return;}pending.current=true;setBusy(true);setIssue('');const revision=epoch.current,featureKey=famous?'compat-astro-synastry':'compat-astro-direct-synastry';
  try{const next=await request<Result>('/astro/synastry',{featureKey,birth:birthPayload(birth),...(famous?{celeb:chosen}:{partner:{name,birth:birthPayload(partner)}})});if(!next.ok||next.accessSource!=='public'||next.featureKey!==featureKey||!next.html?.trim())throw Error('REPORT_UNAVAILABLE');if(revision===epoch.current)setResult(next);}catch(error){if(revision===epoch.current)setIssue((error as {code?:string})?.code==='ASTRO_SYNASTRY_EXAMPLE_REQUIRED'?'비공개 모의 상담에서는 모의 예시와 안내된 인물로 확인해 주세요.':'궁합을 준비하지 못했어요. 두 사람의 출생정보를 확인하고 다시 시도해 주세요.');}finally{if(revision===epoch.current){pending.current=false;setBusy(false);}}
 }
 const people=catalog?.people.filter(person=>(!country||person.nationality===country)&&(!category||person.cat===category)&&person.name.toLowerCase().includes(query.trim().toLowerCase()))||[];
 return <section><h1>{famous?'유명인과 별자리 궁합':'두 사람의 별자리 궁합'}</h1><p>두 출생차트가 만나는 각도와 하우스에서 관계의 강점과 차이를 읽어요.</p>{result&&catalog?<><OriginalBody title="서양 점성술 시너스트리" html={result.html} css={catalog.css} bind={bindPrompt}/><p>새 무료 계산은 구매 보관함에 저장되지 않아요. 같은 출생정보로 다시 살펴볼 수 있어요.</p><Button display="block" variant="weak" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></>:<form className="form" onSubmit={submit}>
 {exampleBirth&&<><p>비공개 모의 상담에서는 검증된 예시로 원본 궁합을 확인해요.</p><Button type="button" variant="weak" onClick={()=>{setBirth({...exampleBirth});setPartner({...exampleBirth,date:'1991-04-05',time:'12:30',gender:'M'});setName('상대');}}>모의 예시 입력하기</Button></>}
 <BirthFields title="나의 출생정보" showGender={false} value={birth} onChange={setBirth} disabled={busy}/>
 {famous?<fieldset disabled={busy}><legend>함께 살펴볼 인물</legend><label>이름 검색<input value={query} onChange={event=>setQuery(event.target.value)}/></label><label>국가<select value={country} onChange={event=>setCountry(event.target.value)}><option value="">전체</option>{Object.entries(catalog?.countries||{}).sort((a,b)=>a[1].order-b[1].order).map(([key,value])=><option value={key} key={key}>{value.flag} {value.label}</option>)}</select></label><label>분류<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">전체</option>{catalog?.categories.map(value=><option key={value}>{value}</option>)}</select></label><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{people.slice(0,80).map(person=><Button type="button" key={person.name+person.birth} variant={chosen?.name===person.name&&chosen?.birth===person.birth?'fill':'weak'} aria-pressed={chosen?.name===person.name&&chosen?.birth===person.birth} onClick={()=>setChosen(person)}>{person.name}</Button>)}</div>{people.length===0&&<p>검색 결과가 없어요.</p>}{people.length>80&&<p>외 {people.length-80}명 · 이름이나 분류로 좁혀 주세요.</p>}{chosen&&<p>선택한 인물 · {chosen.name}</p>}<p>등록된 출생자료를 사용해요. 시각이 불확실하면 정오, 좌표가 없으면 국적의 대표도시를 사용해요.</p></fieldset>:<><label>상대 이름 · 선택<input value={name} maxLength={60} disabled={busy} onChange={event=>setName(event.target.value)}/></label><BirthFields title="상대의 출생정보" requireGender={false} value={partner} onChange={setPartner} disabled={busy}/></>}
 <p>태어난 시각을 모르면 정오를 기준으로 계산하므로 상승점과 하우스 해석에 한계가 있어요.</p><Button type="submit" display="block" disabled={busy||!catalog} loading={busy}>별자리 궁합 펼치기</Button></form>}{issue&&<p role="alert">{issue}</p>}</section>;
}
export default function AstroSynastry(props:Props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
