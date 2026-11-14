import {handleAstrologyRoutes} from '../routes/astro.js';
import {flowerBirthInput} from './birth-input.js';
import {validateInput} from '../yeongnyangi/fortune/shared/input.ts';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {TossError} from './policy.js';

// This original basic chart endpoint is public independently of paid readings.
export async function readTossAstroChart(body,env,{handler=handleAstrologyRoutes}={}){
 let profile,clock;
 try{const raw=flowerBirthInput({...body?.birth,gender:'OTHER'});raw.personA.birthTime||='12:00';profile=validateInput(raw,'astrology').personA;clock=chartInput(profile);}catch{throw new TossError('BIRTH_INVALID');}
 const input={date:profile.birthDate,time:profile.birthTime,timezone:clock.timezone,latitude:clock.lat,longitude:clock.lon};
 const request=new Request('https://code-destiny.com/api/astrology/basic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 return handler(request,env);
}
