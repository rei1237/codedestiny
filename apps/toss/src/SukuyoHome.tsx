import {useState,type ComponentProps} from 'react';
import SukuyoBasic from './SukuyoBasic';
import SukuyoTools from './SukuyoTools';
import {Button} from './Button';
export default function SukuyoHome(props:ComponentProps<typeof SukuyoBasic>){
 const [view,setView]=useState<'basic'|'tools'>('basic');
 return <><nav aria-label="숙요점 풀이 선택" style={{display:'flex',flexWrap:'wrap',gap:8,marginBlockEnd:20}}><Button variant={view==='basic'?'fill':'weak'} aria-pressed={view==='basic'} onClick={()=>setView('basic')}>나의 본명숙</Button><Button variant={view==='tools'?'fill':'weak'} aria-pressed={view==='tools'} onClick={()=>setView('tools')}>관계·본성 풀이</Button></nav>{view==='basic'?<SukuyoBasic {...props}/>:<SukuyoTools request={props.request}/>}</>;
}
