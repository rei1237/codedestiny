import {useState} from 'react';
import AstroReading from './AstroReading';
import AstroSynastry from './AstroSynastry';
import {Button} from './Button';
export default function AstroHome(){
 const [view,setView]=useState('natal');
 return <><nav aria-label="서양 점성술 선택" style={{display:'flex',flexWrap:'wrap',gap:8,marginBlockEnd:20}}>{[['natal','나의 출생차트'],['direct','두 사람의 궁합'],['famous','유명인과 궁합']].map(([key,title])=><Button key={key} variant={view===key?'fill':'weak'} aria-pressed={view===key} onClick={()=>setView(key)}>{title}</Button>)}</nav>{view==='natal'?<AstroReading/>:<AstroSynastry key={view} famous={view==='famous'}/>}</>;
}
