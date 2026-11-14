import {calculateSukuyoForMoment} from '../lib/sukuyo-astronomy.js';
import {sukuyoNatureMoment} from '../lib/saju-section/report.js';
import {handleSajuSection} from '../routes/saju-section.js';
import {isTossSukuyoTool} from '../../lib/fortune/toss-sukuyo-tools.mjs';
import {TossError} from './policy.js';

// Five reviewed deterministic readings only. Past-life LLM reading has a
// separate authenticated archive contract and must never enter this adapter.
export async function readTossSukuyoTool(input,env,{handler=handleSajuSection,publicTool=isTossSukuyoTool}={}){
 if(!publicTool(input?.featureKey))throw new TossError('SECTION_NOT_PUBLIC',404);
 const {featureKey,birth,gender,place,partner}=input;
 let encyclopedia=input.encyclopedia;
 if(featureKey==='sukuyo-relationship-encyclopedia'&&!encyclopedia){
  const result=await calculateSukuyoForMoment(env,sukuyoNatureMoment({calendarDate:birth?.date,calType:birth?.calType,timeKnown:birth?.timeKnown,hour:birth?.hour,minute:birth?.minute},place),{useVerifiedNatal:true});
  encyclopedia={userMansionIdx:result.mansionIdx,userMansion:result.mansion,userName:typeof input.name==='string'?input.name.slice(0,40):''};
 }
 const request=new Request('https://code-destiny.com/api/saju/section',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({featureKey,birth,gender,place,partner,encyclopedia,lang:'ko',mode:'pig'})});
 return handler(request,env);
}
