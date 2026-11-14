import {useState,type ComponentProps} from 'react';
import SukuyoBasic from './SukuyoBasic';
import SukuyoTools from './SukuyoTools';
import SukuyoPastLife from './SukuyoPastLife';
import {Button} from './Button';
export default function SukuyoHome(props:ComponentProps<typeof SukuyoBasic>){
 type View='basic'|'tools'|'past-life';
 const [view,updateView]=useState<View>(()=>{try{return sessionStorage.getItem('toss:sukuyo-view')==='past-life'?'past-life':'basic';}catch{return 'basic';}});
 const setView=(next:View)=>{updateView(next);try{sessionStorage.setItem('toss:sukuyo-view',next);}catch{/* The selection still works in memory. */}};
 return <><nav aria-label="숙요점 풀이 선택" style={{display:'flex',flexWrap:'wrap',gap:8,marginBlockEnd:20}}><Button variant={view==='basic'?'fill':'weak'} aria-pressed={view==='basic'} onClick={()=>setView('basic')}>나의 본명숙</Button><Button variant={view==='tools'?'fill':'weak'} aria-pressed={view==='tools'} onClick={()=>setView('tools')}>관계·본성 풀이</Button><Button variant={view==='past-life'?'fill':'weak'} aria-pressed={view==='past-life'} onClick={()=>setView('past-life')}>전생 인연 리딩</Button></nav>{view==='basic'?<SukuyoBasic {...props}/>:view==='tools'?<SukuyoTools request={props.request}/>:<SukuyoPastLife loggedIn={props.loggedIn} onLogin={props.onLogin} onError={props.onError} request={props.request}/>}</>;
}
