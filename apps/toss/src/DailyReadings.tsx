import {FloralInputWelcome} from './Brand';
import {useEffect,useRef,useState,type ComponentProps,type FormEvent} from 'react';
import {TextArea,TextField} from '@toss/tds-mobile';
import {Button} from './Button';
import {BirthFields,birthPayload,emptyBirth} from './BirthFields';
import {api} from './platform';
import {freeCategories,birthCategories,type FreeCategoryId,type FreeReading,type AttendanceState} from '../../../worker/yeongnyangi/fortune/free/categories';

const categories=freeCategories.filter(item=>item.id!=='horary');
const birthKeys=new Set(['birthDate','birthTime','birthPlace','birthTimezone','birthTimeUnknown','calendarType','leapMonth','gender']);
type Request=<T>(path:string,body?:unknown)=>Promise<T>;
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:Request};

export function DailyResult({result}:{result:FreeReading}){
  return <article className="daily-result" aria-label={result.title+' 결과'}>
    <header className="paper"><h2>{result.title}</h2><p className="muted">{result.day} · {result.kind==='calculated'?'계산한 근거를 담은 이야기':result.kind==='symbolic'?'상징을 따라 읽는 이야기':'질문을 돌아보는 이야기'}</p><p>{result.summary}</p></header>
    <section className="chapter"><h2>오늘 살펴볼 흐름</h2>{result.paragraphs.map((text,index)=><p key={index}>{text}</p>)}</section>
    <section className="paper"><h2>이야기의 근거</h2><dl className="daily-basis">{result.basis.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>
    {!!result.charts?.length&&<details className="result-evidence"><summary>명식과 차트 자세히 보기</summary>{result.charts.map((chart,index)=><section className="result-chart" key={index}><h3>{chart.title}</h3><p className="muted">{chart.source}</p>{chart.groups.map((group,position)=><div className="result-chart-detail" key={position}><h4>{group.label}</h4><dl>{group.items.map((item,i)=><div key={i}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></div>)}</section>)}</details>}
    {result.prompt&&<details className="result-evidence"><summary>계산 근거 프롬프트 보기</summary><textarea className="daily-prompt" aria-label="계산 근거 프롬프트" readOnly value={result.prompt}/></details>}
    <details className="result-evidence"><summary>이 해석의 범위</summary>{result.limitations.map((text,index)=><p key={index}>{text}</p>)}</details>
  </article>;
}

export default function DailyReadings({loggedIn,onLogin,onError,request=api}:Props){
  const [state,setState]=useState<AttendanceState|null>(null),[category,setCategory]=useState<FreeCategoryId>('basic');
  const [birth,setBirth]=useState(emptyBirth),[draft,setDraft]=useState<Record<string,string>>({});
  const [result,setResult]=useState<FreeReading|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false);
  const epoch=useRef(0),operation=useRef(false);
  const config=categories.find(item=>item.id===category)!;
  useEffect(()=>{let live=true;epoch.current++;setState(null);setResult(null);setFailed(false);
    if(loggedIn){setLoading(true);request<AttendanceState>('/daily/status').then(data=>{if(live)setState(data);}).catch(error=>{if(live){setFailed(true);onError(error);}}).finally(()=>{if(live)setLoading(false);});}
    return()=>{live=false;epoch.current++;};
  },[loggedIn,request]);
  useEffect(()=>{const ticket=++epoch.current;setResult(null);setFailed(false);
    if(!loggedIn||!state?.unlocked)return;
    setLoading(true);request<{result:FreeReading|null}>('/daily/reading?category='+category).then(data=>{if(epoch.current===ticket)setResult(data.result);}).catch(error=>{if(epoch.current===ticket){setFailed(true);onError(error);}}).finally(()=>{if(epoch.current===ticket)setLoading(false);});
    return()=>{epoch.current++;};
  },[category,state?.unlocked,state?.day,loggedIn,request]);
  async function run(task:()=>Promise<void>){if(operation.current)return;operation.current=true;setBusy(true);try{await task();}catch(error){onError(error);}finally{operation.current=false;setBusy(false);}}
  async function attendance(path:string){const ticket=epoch.current;await run(async()=>{const next=await request<AttendanceState>(path,{});if(ticket===epoch.current)setState(next);});}
  async function submit(event:FormEvent){event.preventDefault();const ticket=epoch.current;await run(async()=>{const next=await request<FreeReading>('/daily/reading',{category,draft,...(birthCategories.has(category)?{birth:birthPayload(birth)}:{})});if(ticket===epoch.current)setResult(next);});}
  function value(key:string,next:string){setDraft(current=>({...current,[key]:next}));}
  return <section className="daily-reading">
    <h1>오늘을 읽는<br/>작은 이야기</h1><p className="intro">출석으로 모은 멸치로 오늘의 운세를 열고, 마음에 남은 이야기를 다시 읽어보세요.</p>
    {!loggedIn?<section className="paper"><h2>나의 출석부터 확인해요</h2><p>출석과 오늘 열어 둔 운세는 로그인한 토스 계정으로 확인해요.</p><Button display="block" onClick={onLogin}>토스 로그인하고 출석하기</Button></section>:<>
      {state&&<section className="paper daily-attendance"><h2>{state.unlocked?'오늘의 이야기가 열렸어요':'오늘의 출석'}</h2><p>{state.day} · 보유 멸치 <strong>{state.balance}마리</strong></p><p className="muted">한국 날짜 기준으로 확인해요. 열어 둔 오늘의 결과는 다시 열 때 새로 계산하지 않아요.</p>
        {!state.attended&&<Button display="block" loading={busy} onClick={()=>void attendance('/daily/attendance')}>오늘 출석하기</Button>}
        {state.attended&&<p className="daily-attended">오늘 출석을 마쳤어요</p>}
        {!state.unlocked&&state.unlockCost!==undefined&&<><p>오늘의 운세 열기 · 멸치 {state.unlockCost}마리</p><Button display="block" variant="weak" loading={busy} disabled={busy||state.balance<state.unlockCost} onClick={()=>void attendance('/daily/unlock')}>멸치 {state.unlockCost}마리로 오늘의 운세 열기</Button>{state.balance<state.unlockCost&&<p className="muted">출석으로 멸치를 모은 뒤 열 수 있어요.</p>}</>}
      </section>}
      {loading&&<p role="status" className="status">오늘의 기록을 확인하고 있어요.</p>}
      {failed&&<section className="notice"><p>기록을 확인하지 못했어요. 확인 후 다시 이어갈 수 있어요.</p><Button variant="weak" onClick={()=>void run(async()=>{const ticket=epoch.current;const next=await request<AttendanceState>('/daily/status');if(ticket!==epoch.current)return;setState(next);if(next.unlocked){const saved=await request<{result:FreeReading|null}>('/daily/reading?category='+category);if(ticket!==epoch.current)return;setResult(saved.result);}setFailed(false);})}>기록 다시 확인하기</Button></section>}
    </>}
    <section className="daily-categories"><h2>오늘 만나볼 이야기</h2><p className="muted">계산 체계마다 바라보는 관점이 달라요. 각 결과에서 계산 근거와 해석의 한계를 함께 확인하세요.</p><div className="daily-options" role="group" aria-label="오늘의 운세 종류">{categories.map(item=><button key={item.id} aria-pressed={category===item.id} disabled={busy} onClick={()=>{setCategory(item.id);setDraft({});}}>{item.label}</button>)}</div></section>
    {state?.unlocked&&!loading&&!failed&&(result?<><DailyResult result={result}/><p className="muted">오늘 저장된 원문이에요. 다른 종류를 선택하면 그 이야기로 이동해요.</p></>:<form className="form daily-form floral-form" onSubmit={event=>void submit(event)}><FloralInputWelcome/><h2>{config.label} 준비하기</h2><p>{config.description}</p>
      <p className="muted">입력한 기간과 요청은 질문을 정리하는 데 사용해요. 실제 계산 기준과 제공 범위는 결과의 근거에서 확인할 수 있어요.</p>
      {birthCategories.has(category)&&<BirthFields value={birth} onChange={setBirth} title="풀이 대상의 출생정보"/>}
      {config.fields.filter(field=>!birthKeys.has(field.id)).map(field=><div key={category+field.id}>
        {field.type==='select'?<label className="daily-field">{field.label}<select value={draft[field.id]||''} onChange={event=>value(field.id,event.target.value)}><option value="">선택해 주세요</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select></label>
        :field.type==='multiselect'?<fieldset className="daily-choices"><legend>{field.label}</legend>{field.options?.map(option=><label className="check" key={option}><input type="checkbox" checked={(draft[field.id]||'').split(', ').includes(option)} onChange={event=>{const previous=(draft[field.id]||'').split(', ').filter(Boolean);value(field.id,(event.target.checked?[...previous,option]:previous.filter(item=>item!==option)).join(', '));}}/>{option}</label>)}</fieldset>
        :field.type==='textarea'?<TextArea variant="box" label={field.label} aria-label={field.label} labelOption="sustain" placeholder={field.placeholder} maxLength={1000} value={draft[field.id]||''} onChange={event=>value(field.id,event.target.value)}/>
        :<TextField variant="box" label={field.label} aria-label={field.label} labelOption="sustain" type={['date','time','datetime-local','number'].includes(field.type)?field.type as ComponentProps<typeof TextField>['type']:'text'} maxLength={1000} placeholder={field.placeholder} value={draft[field.id]||''} onChange={event=>value(field.id,event.target.value)}/>}
      </div>)}
      <Button display="block" type="submit" loading={busy}>이 정보로 오늘의 이야기 보기</Button><p className="muted">오늘 처음 저장한 결과를 다시 읽는 방식이에요. 별도의 AI 상담 생성이나 결제를 요청하지 않아요.</p>
    </form>)}
  </section>;
}
