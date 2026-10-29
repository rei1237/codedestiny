import {useState} from 'react';
import {Button} from '@toss/tds-mobile';
export type TarotSpreadView={id:string;title:string;summary:string;cardCount:number;deckSize:number;drawn:boolean;positions:{id:string;label:string;drawOrder:number}[]};
export default function TarotDraw({spread,busy,onConfirm}:{spread:TarotSpreadView;busy:boolean;onConfirm:(picks:number[])=>void}){
  const [picks,setPicks]=useState<number[]>([]);
  const positions=[...spread.positions].sort((a,b)=>a.drawOrder-b.drawOrder);
  return <section><p className="eyebrow">결제 전 카드 선택</p><h1>{spread.title}</h1><p>{spread.summary}</p>
    <p role="status">{picks.length} / {spread.cardCount}장 선택{positions[picks.length]?` · 다음 자리: ${positions[picks.length].label}`:''}</p>
    <p className="muted">카드는 서버에서 미리 섞여 있어요. 선택 순서대로 각 자리에 놓이며, 확정 후에는 같은 상담의 카드를 바꾸지 않아요.</p>
    <div className="tarot-deck" aria-label="뒤집힌 타로 카드">{Array.from({length:spread.deckSize},(_,slot)=>{
      const index=picks.indexOf(slot);return <button type="button" key={slot} aria-label={`${slot+1}번 카드${index>=0?`, ${index+1}번째 선택`:''}`} aria-pressed={index>=0} disabled={busy||index<0&&picks.length>=spread.cardCount} onClick={()=>setPicks(index>=0?picks.filter(v=>v!==slot):[...picks,slot])}><span aria-hidden>{index>=0?index+1:'✦'}</span></button>;
    })}</div><Button display="block" loading={busy} disabled={picks.length!==spread.cardCount} onClick={()=>onConfirm(picks)}>선택한 카드 확정하기</Button>
  </section>;
}
