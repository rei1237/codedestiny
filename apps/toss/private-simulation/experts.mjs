import {expertProducts,mockExpertRequest,expertLibrary} from '../test/offline/experts.mjs';
export {expertProducts};

// Only the private simulation imports this adapter. Production generation,
// prices and owner checks remain in the existing Toss service adapters.
export async function expertRequest(request,url,path,state,save,now){
  return mockExpertRequest(request,url,path==='/orders/restore'?'/orders/grant':path,state,save,now,1100);
}
export function expertRecords(url,state){
  const group=url.searchParams.get('group'),source=url.searchParams.get('source'),q=url.searchParams.get('q')?.trim();
  return expertLibrary(state).map(row=>{
    const intent=state.intents.get(row.requestId),product=expertProducts.find(p=>p.service===row.nativeService);
    const question=intent.input.userQuestion||intent.input.question||intent.input.concern||product.label;
    return {id:row.resultId,key:row.nativeService+':'+row.resultId,group:'report',source:row.nativeService,serviceId:row.nativeService,
      serviceName:product.label,title:question,question,createdAt:row.createdAt,status:row.state==='COMPLETED'?'completed':'generating',href:row.href,nativeHref:row.href};
  }).filter(row=>(!group||group==='all'||group===row.group)&&(!source||source==='all'||source===row.source)&&(!q||row.question.includes(q)));
}
