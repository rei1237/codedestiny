import {isTossAstroSection} from '../../lib/fortune/toss-astro-sections.mjs';
import {handleAstroSection} from '../routes/astro-section.js';
import {handleAstroBasicDeep} from '../routes/astro-basic-deep.js';
import {flowerBirthInput} from './birth-input.js';
import {validateInput} from '../yeongnyangi/fortune/shared/input.ts';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {TossError} from './policy.js';

export async function readTossAstroSection(body,env,{section=handleAstroSection,basic=handleAstroBasicDeep,publicSection=isTossAstroSection}={}){
 const key=body?.featureKey;if(!publicSection(key))throw new TossError('SECTION_NOT_PUBLIC',404);
 let profile,clock;
 try{const raw=flowerBirthInput({...body.birth,gender:'OTHER'});raw.personA.birthTime||='12:00';profile=validateInput(raw,'astrology').personA;clock=chartInput({...profile,birthTime:profile.birthTime||'12:00'});}catch{throw new TossError('BIRTH_INVALID');}
 const input={featureKey:key,date:profile.birthDate,time:profile.birthTime||'12:00',timeKnown:body.birth.date.timeUnknown!==true,timezone:clock.timezone,latitude:clock.lat,longitude:clock.lon,lang:'ko',transitTz:9};
 const isBasic=key==='astro_basic_deep_pack';
 // Strip all web/Toss account and purchase fields. The existing web handler's
 // explicitly public branch calculates from birth input and never reads rights.
 const request=new Request('https://code-destiny.com/api/astro/'+(isBasic?'basic-deep':'section'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 return (isBasic?basic:section)(request,env);
}
