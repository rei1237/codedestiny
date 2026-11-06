import {useState,useEffect,useRef} from 'react';
import {Clipboard,SetClipboardTextPermissionError} from '@apps-in-toss/web-framework';
import {useAuthStore} from '@/app/_lib/auth-store';
import {ALL_TESTS,CATEGORIES} from '../../../src/features/psychotest/data/testData';
import TestArtwork from '../../../src/features/psychotest/TestArtwork';
import {tossPsychotestMeta} from '../../../src/features/psychotest/toss-psychotest-copy.mjs';
import TestPlayer from '../../../src/features/psychotest/TestPlayer';
import '../../../src/features/psychotest/psychotest.css';
import './toss-psychotest.css';

function route(){const found=location.pathname.match(/^\/psychotest(?:\/([^/]+))?\/?$/);return found?(found[1]||''):null;}
let psychotestCopyPending=false;
function Psychotest(){
 const [id,setId]=useState(route),[category,setCategory]=useState('전체'),[saved,setSaved]=useState<Record<string,React.ReactNode>>({});
 const phase=useRef('intro'),within=useRef(0),session=useRef('psy:'+Math.random().toString(36).slice(2)),stablePhase=useRef((value:string)=>{phase.current=value;}).current;
 const tests=ALL_TESTS.map(tossPsychotestMeta).filter(item=>category==='전체'||item.categories.includes(category));
 useEffect(()=>{history.replaceState({...history.state,psySession:session.current,psyDepth:0},'',location.href);const pop=(event:PopStateEvent)=>{within.current=event.state?.psySession===session.current?Math.max(0,Number(event.state.psyDepth)||0):0;phase.current='intro';setId(route());};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 useEffect(()=>{const back=(event:Event)=>{if(event.defaultPrevented||!within.current||(id&&phase.current!=='intro'))return;event.preventDefault();history.back();};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[id]);
 const move=(next:string)=>{history.pushState({...history.state,psySession:session.current,psyDepth:within.current+1},'',next?'/psychotest/'+encodeURIComponent(next)+'/':'/psychotest/');within.current++;phase.current='intro';setId(next);window.scrollTo(0,0);};
 const toCatalog=()=>{if(within.current)history.back();else move('');};
 const bridge=async<T,>(operation:()=>Promise<T>):Promise<T>=>{if(psychotestCopyPending)throw Object.assign(new Error('BRIDGE_BUSY'),{code:'BRIDGE_BUSY'});psychotestCopyPending=true;try{return await operation();}catch(error){if(error instanceof SetClipboardTextPermissionError)throw Object.assign(new Error('ACCESS_DENIED'),{code:'ACCESS_DENIED',cause:error});throw error;}finally{psychotestCopyPending=false;}};
 const copy=(text:string)=>bridge(()=>Clipboard.setText(text));
 const requestCopyPermission=()=>bridge(async()=>await Clipboard.setText.openPermissionDialog()==='allowed');
 if(id===null||id&&!ALL_TESTS.some(item=>item.id===id))return <main className="psy-experience toss-psychotest"><p role="alert">테스트를 찾을 수 없어요.</p><button onClick={()=>move('')}>테스트 목록 보기</button></main>;
 return <main className="psy-experience toss-psychotest">
 {id?<TestPlayer key={id} testId={id} onBack={toCatalog} toss={{savedResult:saved[id],onComplete:result=>setSaved(previous=>({...previous,[id]:result})),onPhase:stablePhase,onCopy:copy,requestCopyPermission}}/>:<div className="psy-gallery"><section className="psy-hero"><div><h1>나는 어떤<br/><em>장면</em>을 닮았을까.</h1><p>마음이 가는 테스트를 골라, 가볍게 시작해 보세요.</p><span className="psy-free">{ALL_TESTS.length}가지 심리테스트 · 모두 무료</span></div></section><p>결과는 이 화면을 닫으면 저장되지 않아요.</p><div className="psy-filter" role="group" aria-label="테스트 주제">{CATEGORIES.map(item=><button key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div><p role="status">{tests.length}개</p><div className="psy-grid">{tests.map(item=><a key={item.id} className="psy-test" href={'/psychotest/'+encodeURIComponent(item.id)+'/'} onClick={event=>{event.preventDefault();move(item.id);}}><TestArtwork id={item.id}/><div className="psy-test-copy"><p>{item.categories.join(' · ')}<span>{item.time}</span></p><h2>{item.name}</h2><p className="psy-description">{item.desc}</p><span className="psy-card-action">테스트 만나보기</span>{saved[item.id]&&<span>이전 결과 있음</span>}</div></a>)}</div><p>이 테스트는 자기이해를 위한 콘텐츠이며 전문 심리검사나 진단을 대신하지 않아요.</p></div>}
 </main>;
}
export default function TossPsychotestGate(){const auth=useAuthStore();const account=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');if(auth.isAuthenticated&&!account)return <p role="status">계정을 확인하고 있어요.</p>;return <Psychotest key={auth.isAuthenticated?'user:'+account:'guest'}/>;}
