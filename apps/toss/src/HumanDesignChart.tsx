import {useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import BodyGraph from '../../../app/human-design/_components/BodyGraph';
import DetailSheet from '../../../app/human-design/_components/DetailSheet';
import {AUTHORITY_COPY,DEFINITION_COPY,STRATEGY_COPY,TYPE_COPY,pick} from '../../../app/human-design/_copy';
import type {HdChart,HdSelection} from '../../../app/human-design/_lib/types';
import {api} from './platform';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

type Birth={birthDate:string;birthTime:string;timezone:string;calendar:'solar'|'lunar'|'lunar-leap'};
const empty=():Birth=>({birthDate:'',birthTime:'',timezone:'',calendar:'solar'});
function validChart(chart:HdChart){
 return chart&&chart.birthInput===null&&chart.moments===null&&Array.isArray(chart.activations)&&chart.activations.length===26
  &&chart.activations.every(a=>a&&Number.isInteger(a.gate)&&a.gate>=1&&a.gate<=64&&Number.isInteger(a.line)&&a.line>=1&&a.line<=6&&['personality','design'].includes(a.layer)&&typeof a.planet==='string')
  &&Array.isArray(chart.layers?.personality)&&chart.layers.personality.length===13&&Array.isArray(chart.layers?.design)&&chart.layers.design.length===13
  &&Array.isArray(chart.channels)&&chart.channels.every(c=>c&&typeof c.channelId==='string'&&typeof c.centerA==='string'&&typeof c.centerB==='string')
  &&Array.isArray(chart.definedCenters)&&Array.isArray(chart.undefinedCenters)&&Array.isArray(chart.activeGates)
  &&Object.hasOwn(TYPE_COPY,chart.type)&&Object.hasOwn(AUTHORITY_COPY,chart.authority)&&Object.hasOwn(STRATEGY_COPY,chart.strategy)&&Object.hasOwn(DEFINITION_COPY,chart.definition)&&typeof chart.profile==='string';
}
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:typeof api};
export default function HumanDesignChart(props:Props){return <TossSessionScope><HumanDesignChartContent {...props}/></TossSessionScope>;}
function HumanDesignChartContent({loggedIn,onLogin,onError,request=api}:Props){
 const [birth,setBirth]=useState(empty),[chart,setChart]=useState<HdChart|null>(null),[selection,setSelection]=useState<HdSelection>(null),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
 const epoch=useRef(0),pending=useRef(false);
 useLayoutEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{epoch.current++;pending.current=false;setBirth(empty());setChart(null);setSelection(null);setBusy(false);setIssue('');},[loggedIn]);
 useEffect(()=>{const back=(event:Event)=>{if(selection){event.preventDefault();setSelection(null);}else if(chart){event.preventDefault();setChart(null);setIssue('');}else if(busy){event.preventDefault();}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[selection,chart,busy]);
 const change=(value:Birth)=>{epoch.current++;setBirth(value);setChart(null);setSelection(null);setIssue('');};
 async function submit(event:FormEvent){event.preventDefault();if(!loggedIn){onLogin();return;}if(pending.current)return;const current=++epoch.current;pending.current=true;setBusy(true);setChart(null);setSelection(null);setIssue('');
  try{const result=await request<{stored:boolean;chart:HdChart}>('/human-design/chart',{birth});if(current===epoch.current){if(result?.stored!==false||!validChart(result.chart))throw new Error('INVALID_RESULT');setChart(result.chart);}}
  catch(error){if(current===epoch.current){const detail=error&&typeof error==='object'?error as {status?:number;code?:string}:{};if(detail.status===401||['SESSION_CHANGED','LOGIN_REQUIRED','SESSION_EXPIRED'].includes(detail.code||''))onError(error);else if(detail.status===403||detail.code==='ACCESS_DENIED')setIssue('토스 이용 권한을 확인할 수 없어요. 계정을 확인한 뒤 다시 시도해 주세요.');else if(detail.code==='BIRTH_INVALID')setIssue('출생 날짜, 시각과 타임존을 확인해 주세요.');else if(detail.code==='TOSS_RELEASE_PENDING')setIssue('서비스를 준비하고 있어요. 잠시 후 다시 시도해 주세요.');else setIssue('차트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');}}
  finally{if(current===epoch.current){pending.current=false;setBusy(false);}}
 }
 const type=chart&&TYPE_COPY[chart.type as keyof typeof TYPE_COPY],authority=chart&&AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY];
 return <section className="human-design-chart"><h1>휴먼 디자인</h1><p>태어난 순간을 바탕으로 나의 바디그래프를 살펴봐요.</p><p className="muted">로그인 후 이용할 수 있어요. 이 차트는 현재 화면에서만 볼 수 있고 보관함에 저장되지 않아요.</p>
  {loggedIn?<form className="form" onSubmit={submit}><fieldset className="birth-fields" disabled={busy}><legend>차트를 살펴볼 출생정보</legend>
   <label>태어난 날짜<input type="date" required value={birth.birthDate} onChange={e=>change({...birth,birthDate:e.target.value})}/></label>
   <label>태어난 시각<input type="time" required value={birth.birthTime} onChange={e=>change({...birth,birthTime:e.target.value})}/></label>
   <label>달력<select value={birth.calendar} onChange={e=>change({...birth,calendar:e.target.value as Birth['calendar']})}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar-leap">음력 윤달</option></select></label>
   <label>출생지 타임존<input required maxLength={80} autoComplete="off" placeholder="예: Asia/Seoul" value={birth.timezone} onChange={e=>change({...birth,timezone:e.target.value})}/></label>
  </fieldset><Button type="submit" display="block" loading={busy}>{issue?'다시 계산하기':'차트 살펴보기'}</Button></form>:<Button display="block" onClick={onLogin}>토스 로그인하고 살펴보기</Button>}
  {busy&&<p role="status">태어난 순간의 차트를 계산하고 있어요.</p>}{issue&&<p role="alert">{issue}</p>}
  {loggedIn&&chart&&type&&authority&&<section aria-label="휴먼 디자인 차트"><h2>나의 바디그래프</h2><p>센터와 게이트를 눌러 계산된 정보를 살펴볼 수 있어요.</p><BodyGraph chart={chart} locale="ko" selection={selection} onSelect={setSelection}/>
   <dl className="daily-basis"><div><dt>타입</dt><dd>{pick(type.name,'ko')}</dd></div><div><dt>권위</dt><dd>{pick(authority.name,'ko')}</dd></div><div><dt>전략</dt><dd>{pick(STRATEGY_COPY[chart.strategy as keyof typeof STRATEGY_COPY],'ko')}</dd></div><div><dt>프로파일</dt><dd>{chart.profile}</dd></div><div><dt>정의</dt><dd>{pick(DEFINITION_COPY[chart.definition as keyof typeof DEFINITION_COPY],'ko')}</dd></div></dl>
   <p className="muted">차트는 자기 이해를 위한 참고 자료예요. 중요한 결정에는 실제 상황을 함께 살펴보세요.</p><DetailSheet chart={chart} locale="ko" selection={selection} onClose={()=>setSelection(null)}/>
  </section>}
 </section>;
}
