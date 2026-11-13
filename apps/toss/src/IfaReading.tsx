import {useEffect,useRef,useState} from 'react';
import {File,Share} from '@apps-in-toss/web-framework';
import {CATEGORY_META,readIfaPattern,type IfaReadingResult} from 'virtual:ifa-engine';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
import {Button} from './Button';
import {isToss} from './platform';
import './ifa-reading.css';

function Opon({bits}:{bits?:number[]}){
  return <div className="ifa-opon" role="img" aria-label={bits?'두 기둥의 여덟 표식 '+bits.join(' '):'이파의 원형 점판'}>
    {[0,4].map(start=><div className="ifa-column" key={start}>{[0,1,2,3].map(offset=><span key={offset}>{bits?(bits[start+offset]?'Ⅱ':'Ⅰ'):'·'}</span>)}</div>)}
  </div>;
}

export default function IfaReading(){
  const [category,setCategory]=useState('total'),[result,setResult]=useState<IfaReadingResult|null>(null);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    if(!result)return;
    heading.current?.focus();
    const back=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();setResult(null);setNotice('');}};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result]);

  function cast(){
    if(!isFreeFortuneFeatureKey('ifa-oracle')){setNotice('이파 리딩의 이용 조건을 확인하고 있어요.');return;}
    const bits=Array.from(crypto.getRandomValues(new Uint8Array(8)),value=>value&1);
    setResult(readIfaPattern(bits,category));setNotice('');
  }
  async function exportReading(save:boolean){
    if(!result||busy)return;
    if(!isToss()){setNotice('결과 저장과 공유는 토스 앱에서 사용할 수 있어요.');return;}
    const text=['IFA Oracle Reading','Category: '+CATEGORY_META[result.category].label,'Odu: '+result.name,'ODU '+result.num+' / 256','Bits: '+result.bits.join(' '),result.text].join('\n\n');
    setBusy(true);setNotice('');
    try{
      if(save){
        if(!File.saveBase64.isSupported()){setNotice('토스 앱을 업데이트한 뒤 다시 저장해 주세요.');return;}
        const data=btoa(String.fromCharCode(...new TextEncoder().encode(text)));
        await File.saveBase64({data,fileName:'ifa-'+result.num+'.txt',mimeType:'text/plain'});setNotice('저장 요청을 보냈어요.');
      }else{await Share.sendMessage({message:text});}
    }catch{setNotice('요청이 완료되지 않았어요. 잠시 후 다시 시도해 주세요.');}
    finally{setBusy(false);}
  }
  return <section className="ifa-reading">
    <div className="ifa-header"><div><h1 ref={heading} tabIndex={-1}>{result?result.name:'이파 오라클'}</h1>
    <p>{result?'ODU '+result.num+' / 256 · '+CATEGORY_META[result.category].label:'마음에 질문 하나를 품고 해석할 주제를 골라 주세요.'}</p></div><Opon bits={result?.bits}/></div>
    {result?<><div className="ifa-text">{result.text.split('\n\n').map((block,i)=>{
      const match=block.match(/^\[([^\]]+)\]\n([\s\S]*)$/);
      return <section key={i}>{match&&<h2>{match[1]}</h2>}<p>{match?match[2]:block}</p></section>;
    })}</div><div className="ifa-actions"><Button display="block" onClick={()=>{setResult(null);setNotice('');}}>다시 점치기</Button>
    <Button display="block" variant="weak" disabled={busy} onClick={()=>void exportReading(true)}>결과 원문 저장하기</Button>
    <Button display="block" variant="weak" disabled={busy} onClick={()=>void exportReading(false)}>결과 원문 공유하기</Button></div></>:<>
    <fieldset><legend>살펴볼 주제</legend><div>{Object.entries(CATEGORY_META).map(([id,meta])=><button type="button" key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}>{meta.label}</button>)}</div></fieldset>
    <Button display="block" onClick={cast}>여덟 표식 펼치기</Button></>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
