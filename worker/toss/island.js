import {handleZiweiIslandRoutes} from '../routes/ziwei-island.js';

// The free exploration endpoint accepts only birth data. Keep the caller's IP for
// the original rate limiter, without forwarding a Toss identity or web cookie.
export function readTossIsland(input,env,clientIp){
 const original=new Request('https://code-destiny.com/api/ziwei-island/blueprint',{
   method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':clientIp||'local'},
   body:JSON.stringify(input),
 });
 return handleZiweiIslandRoutes(original,env);
}
