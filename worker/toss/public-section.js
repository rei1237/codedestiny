import {handleSajuSection} from '../routes/saju-section.js';
import {isTossPublicSection} from '../../lib/fortune/toss-public-sections.mjs';
import {TossError} from './policy.js';

export function readTossPublicSection(input,env){
  if(!isTossPublicSection(input?.featureKey))throw new TossError('SECTION_NOT_PUBLIC',404);
  const {featureKey,birth,gender,place,mode,energy}=input;
  const request=new Request('https://code-destiny.com/api/saju/section',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({featureKey,birth,gender,place,mode,lang:'ko',energy}),
  });
  return handleSajuSection(request,env);
}
