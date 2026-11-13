import {useEffect,useState} from 'react';
import {Share} from '@apps-in-toss/web-framework';
import {drawTinShape,type Shape} from '../../../app/oracle/sikojen-povailu/data/shapes';
import {Button} from './Button';
import './tin-oracle.css';

const categories=['금전운','연애운','행운'] as const;
type Category=typeof categories[number];
type Phase='welcome'|'pouch'|'cast'|'reveal'|'shadow'|'share';

export default function TinOracle(){
  const [phase,setPhase]=useState<Phase>('welcome'),[category,setCategory]=useState<Category|null>(null);
  const [shape,setShape]=useState<Shape|null>(null),[status,setStatus]=useState('');
  useEffect(()=>{
    const back=(event:Event)=>{
      if(phase==='welcome'||event.defaultPrevented)return;
      event.preventDefault();setStatus('');setPhase(phase==='shadow'||phase==='share'?'reveal':phase==='reveal'?'pouch':phase==='cast'?'pouch':'welcome');
    };
    window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);
  },[phase]);
  function restart(){setShape(null);setCategory(null);setStatus('');setPhase('pouch');}
  async function share(){
    if(!shape)return;
    const message=['✨ 나의 핀란드 주석점 결과: "'+shape.name_ko+'" ('+shape.name_fi+')','💭 "'+shape.meaning_ko+'"','🌸 연이의 조언: '+shape.advice_ko,'#SikojenpovailuFortune #FinnishTinFortune #Yeoni'].join('\n\n');
    try{await Share.sendMessage({message});setStatus('공유 화면을 닫았어요.');}catch{setStatus('공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.');}
  }
  return <section className="tin-oracle">
    {phase==='welcome'?<><img className="tin-cover" src="/assets/tin-oracle.webp" alt="핀란드 주석점을 안내하는 연이"/><h1>연이의 핀란드 주석점</h1><p>녹인 주석을 찬물에 부으면 작은 형상이 남아요. 형상에 비친 빛과 그림자를 연이와 함께 읽어 보세요.</p><Button display="block" onClick={restart}>주석점 시작하기</Button></>
    :phase==='pouch'?<><h1>오늘의 주머니 고르기</h1><p>지금 마음이 머무는 주제를 골라 주세요.</p>{categories.map(item=><Button key={item} display="block" variant="weak" onClick={()=>{setCategory(item);setPhase('cast');}}>{item} 주머니</Button>)}</>
    :phase==='cast'?<><h1>{category} 주석 붓기</h1><p>마음속에 궁금한 일을 떠올리고 물에 주석을 부어 보세요.</p><div className="tin-dish" aria-hidden>◌</div><Button display="block" onClick={()=>{setShape(drawTinShape(category));setPhase('reveal');}}>주석을 물에 붓기</Button></>
    :shape&&<><div className="tin-dish" aria-hidden>{shape.icon}</div><small>{shape.name_fi} · {category}</small><h1>{phase==='shadow'?shape.name_ko+'의 그림자':shape.name_ko}</h1>
      {phase==='reveal'?<><p>{shape.meaning_ko}</p><article className="paper"><h2>연이의 한마디</h2><p>{shape.yeon_message}</p><h2>오늘의 조언</h2><p>{shape.advice_ko}</p><p>행운의 숫자 {shape.lucky_number} · {shape.lucky_color}</p></article><Button display="block" variant="weak" onClick={()=>setPhase('shadow')}>그림자 의미 보기</Button><Button display="block" onClick={()=>setPhase('share')}>결과 나누기</Button></>
      :phase==='shadow'?<><p>{shape.shadow_meaning_ko}</p><p lang="fi">{shape.shadow_meaning_fi}</p><Button display="block" onClick={()=>setPhase('reveal')}>형상으로 돌아가기</Button></>
      :<><p>{shape.meaning_ko}</p><Button display="block" onClick={()=>void share()}>형상과 조언 공유하기</Button></>}
      <Button display="block" variant="weak" onClick={restart}>다른 주머니 고르기</Button>{status&&<p role="status">{status}</p>}</>}
  </section>;
}
