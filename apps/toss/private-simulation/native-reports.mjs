// Only imported by the private simulation build. The existing offline contracts
// exercise the real input/rendering adapters without contacting a paid provider.
import {roomProducts,roomRequest} from '../test/offline/room-fixture.mjs';

export const nativeReportProducts=roomProducts.filter(product=>!/^native:(tea|neo):/.test(product.id));
const services=new Set(nativeReportProducts.map(product=>product.id.split(':')[1]));

export async function nativeReportPublicRequest(request,path){
  if(path!=='/canonical/naming-prompt/basis'||request.method!=='POST')return null;
  try{
    const {input}=await request.json();
    const {namingBasisV2}=await import('../../../worker/naming-engine/service.ts');
    const [year,month,day]=String(input.birthDate||'').split('-').map(Number);
    const {view}=namingBasisV2({...input,year,month,day});
    return Response.json({ok:true,...view});
  }catch{return Response.json({error:'INVALID_NAMING_INPUT'},{status:422});}
}

// Authentication and private-order owner prefix checks remain with the caller.
// Restrict this adapter to its own product families; it must not absorb another
// service's order, result, library, or an unsupported route.
export async function nativeReportRequest(request,url,path,state,save,now){
  const service=/^\/native\/([^/]+)\/(?:prepare|intents\/[a-f0-9]{64}|results\/[a-f0-9]{64})$/.exec(path)?.[1];
  if(service&&services.has(service)||/^\/canonical\/life-book-ai\/(?:prepare|generate|result)$/.test(path)){
    if(path.startsWith('/canonical/life-book-ai/')&&request.method==='POST'){
      const body=await request.clone().json(),key=body.idempotencyKey||body.requestId;
      const row=[...state.intents.values()].find(item=>item.service==='life-book'&&(item.input.idempotencyKey||item.input.requestId)===key);
      if(row&&['birthInfo','topic','consultationType','serviceType'].some(field=>field in body&&JSON.stringify(body[field])!==JSON.stringify(row.input[field]))){
        return Response.json({error:'REQUEST_INPUT_MISMATCH'},{status:409});
      }
    }
    return roomRequest(request,url,path,state,save,now);
  }
  if(['/orders/grant','/orders/restore'].includes(path)&&request.method==='POST'){
    const {sku}=await request.clone().json();
    if(nativeReportProducts.some(product=>product.sku===sku))return roomRequest(request,url,path,state,save,now);
  }
  return null;
}
