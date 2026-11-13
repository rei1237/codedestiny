import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {LazyMotion,domAnimation} from 'framer-motion';
import {Button} from './Button';
import {TarotCover} from './Brand';
import TarotResultActions from './TarotResultActions';
import {shareTarotResultSummary} from './media';
import '../service/core-tarot.css';
import 'virtual:sun-tarot.css';

function listenBack(callback:()=>void) {
  const handle=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();callback();}};
  window.addEventListener('code-destiny:toss-overlay-back',handle,true);
  return ()=>window.removeEventListener('code-destiny:toss-overlay-back',handle,true);
}
const Healing=lazy(()=>import('../../../app/components/SunHealingTarot'));
const SelfEsteem=lazy(async()=>{const {default:page}=await import('virtual:self-esteem-tarot');return {default:function SelfEsteemReading({onBack,onShare}:Props){
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    const handle=(event:MessageEvent)=>{
      const data=event.data;
      if(event.source!==frame.current?.contentWindow||event.origin!=='null'||data?.channel!=='cd-self-esteem')return;
      if(data.action==='exit')onBack();
      if(data.action==='share'&&typeof data.text==='string')void onShare('다시 내 편에 서는 타로',data.text);
    };
    window.addEventListener('message',handle);
    const release=listenBack(()=>frame.current?.contentWindow?.postMessage('self-esteem-back','*'));
    return ()=>{release();window.removeEventListener('message',handle);};
  },[onBack,onShare]);
  return <iframe title="다시 내 편에 서는 타로" ref={frame} sandbox="allow-scripts" srcDoc={page.replaceAll('__ORIGIN__',location.origin)} className="self-esteem-reading"/>;
}};});
type Props={onBack:()=>void;onShare:(title:string,text:string)=>Promise<void>};
const OneCard=lazy(async()=>{
  const {categories,readOne}=await import('virtual:myeongri-one-card');
  return {default:function OneCardReading({onBack}:Pick<Props,'onBack'>){
    const [result,setResult]=useState<ReturnType<typeof readOne>|null>(null);
    useEffect(()=>{
      if(!result)return;
      return listenBack(()=>setResult(null));
    },[result]);
    const r=result?.reading;
    return <section className="tarot-library floral-form"><TarotCover/><h1>오늘의 타로</h1>
      {result&&r?<><div className="paper"><img src={result.image} onError={e=>{if(!e.currentTarget.src.endsWith(result.fallback))e.currentTarget.src=result.fallback;}} width={100} alt={r.card.nameKo}/><h2>{r.title}</h2><p>{r.card.orientation==='reversed'?'역행(逆行)':'순행(順行)'}</p></div>
        {[['핵심 판정',r.oneLineConclusion||r.opening],['카드별 명리 해석',r.currentSituation],['십성 작동 방식',r.tenGodInterpretation],['질문별 현실 조언 · '+r.categoryLens.theme,r.practicalAdvice],['오늘의 한 문장',r.sealSentence||r.oneLineConclusion],['봉인 오라클',result.oracle]].map(([title,body])=><article className="paper" key={title}><h2>{title}</h2><p>{body}</p></article>)}
        <TarotResultActions title={r.title} summary={r.oneLineConclusion}/><Button onClick={()=>setResult(null)}>다른 분야 보기</Button></>:<>
        <p>궁금한 분야를 고르면 연이가 카드 한 장과 십성의 흐름을 함께 읽어드려요.</p><div className="one-card-categories">{categories.map(([key,name])=><Button variant="weak" key={key} onClick={()=>setResult(readOne(key))}>{name}</Button>)}</div></>}
      <Button variant="weak" display="block" onClick={onBack}>리딩 목록</Button></section>;
  }};
});
export default function CoreTarot({id,onBack}:{id:string;onBack:()=>void}){
  const [notice,setNotice]=useState('');
  const share=async(title:string,text:string)=>{try{await shareTarotResultSummary(title,text);setNotice('공유 화면을 닫았어요.');}catch{setNotice('이 리딩의 공유는 토스 공개 출시 후 이용할 수 있어요.');}};
  return <Suspense fallback={<p role="status">카드를 준비하고 있어요.</p>}>{id==='tarot-healing'?<div className="sun-toss-reading"><LazyMotion features={domAnimation}><Healing onExit={onBack} onShare={share} listenBack={listenBack}/></LazyMotion></div>:id==='tarot-self-esteem'?<SelfEsteem onBack={onBack} onShare={share}/>:<OneCard onBack={onBack}/>}
    {notice&&<p role="status">{notice}</p>}</Suspense>;
}
