import {useState} from 'react';
import {LoveSimulationEngine} from '../../../app/saju/love-simulation/_components/LoveSimulationEngine';
import {BirthFields,birthPayload,emptyBirth} from '../src/BirthFields';
import {Button} from '../src/Button';

function OwnBirth({apply}){
 const [input,setInput]=useState(emptyBirth),[saved,setSaved]=useState(false);
 return <details className="my-5 rounded-lg border border-white/20 bg-black/45 p-4 text-white">
  <summary className="cursor-pointer font-bold">내 출생정보로 궁합 보기</summary>
  <p className="my-3 text-sm">저장한 프로필이 없으면 내 출생정보를 입력해 주세요.</p>
  <form className="form rounded-lg bg-white p-3 text-zinc-950" onSubmit={e=>{
    e.preventDefault();const {date,location}=birthPayload(input);
    apply({name:'나',birthDate:input.date,gender:input.gender==='M'?'남':'여',hour:date.hour??12,minute:date.minute??0,
      hasTime:!input.unknown,calendarType:input.calendar,timezone:location.tz});setSaved(true);
  }}>
   <BirthFields title="나의 출생정보" value={input} onChange={value=>{setInput(value);setSaved(false);}}/>
   <Button type="submit" display="block">내 출생정보 적용</Button>{saved&&<p role="status">내 출생정보를 적용했어요.</p>}
  </form>
 </details>;
}
export default function LoveSimulation({onLogin}){
 return <div data-toss-love-code style={{minWidth:0,maxWidth:"100%",overflowX:"clip",overflowWrap:"anywhere"}}>
  <LoveSimulationEngine toss onLogin={onLogin} OwnBirth={OwnBirth}/>
 </div>;
}
