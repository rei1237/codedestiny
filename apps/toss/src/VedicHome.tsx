import {useState} from 'react';
import VedicReading from '../service/VedicReading';
import VedicCompatibility from '../service/VedicCompatibility';
import VedicPrashna from './VedicPrashna';
import {Button} from './Button';
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void};
export default function VedicHome(props:Props){
 const [view,update]=useState(()=>{try{return sessionStorage.getItem('toss:vedic-view')||'natal';}catch{return 'natal';}});
 const choose=(next:string)=>{update(next);try{sessionStorage.setItem('toss:vedic-view',next);}catch{/* Selection stays available in memory. */}};
 return <><nav aria-label="베다점 선택" style={{display:'flex',flexWrap:'wrap',gap:8,marginBlockEnd:20}}>{[['natal','나의 베다 명반'],['compatibility','아쉬타쿠타 궁합'],['prashna','프라슈나 질문 차트']].map(([key,title])=><Button key={key} variant={view===key?'fill':'weak'} aria-pressed={view===key} onClick={()=>choose(key)}>{title}</Button>)}</nav>{view==='compatibility'?<VedicCompatibility {...props}/>:view==='prashna'?<VedicPrashna {...props}/>:<VedicReading onError={props.onError}/>}</>;
}
