export function createMusicSimulation(tracks){
const musicProducts=tracks.map(track=>({id:'native:music:'+track.featureKey,name:'모의 MP3 · '+track.title,sku:'mock-'+track.featureKey,featureKey:track.featureKey,approvedPriceKRW:1,available:true}));
const musicPurchases=state=>[...state.intents.values()].filter(row=>row.service==='music'&&row.paid&&!row.refunded&&state.orders.get(row.orderId)===row.id).map(row=>({serviceId:'yeoni',nativeService:'music',featureKey:row.track.featureKey,requestId:row.id,orderId:row.orderId,productId:'native:music:'+row.track.featureKey,status:'PURCHASED',state:'COMPLETED',href:'/music?intentId='+row.id,createdAt:row.createdAt}));
function musicRecords(url,state){return musicPurchases(state).map(item=>{const row=state.intents.get(item.requestId);return {id:row.id,key:'music:'+row.id,group:'report',source:'music',serviceId:'music',serviceName:'음악 MP3 다운로드',title:row.track.title,question:row.track.title,createdAt:row.createdAt,status:'completed',href:item.href,nativeHref:item.href};}).filter(row=>(!url.searchParams.get('group')||['all','report'].includes(url.searchParams.get('group')))&&(!url.searchParams.get('source')||['all','music'].includes(url.searchParams.get('source')))&&(!url.searchParams.get('q')||row.title.includes(url.searchParams.get('q').trim())));}
async function musicRequest(request,url,path,state,save,now){
 const reply=(value,status=200)=>Response.json(value,{status});
 if(path==='/native/music/prepare'&&request.method==='POST'){
  const {input,orderId}=await request.json(),track=tracks.find(row=>row.audioSourceKey===input?.audioSourceKey);
  if(!track)return reply({error:'MUSIC_TRACK_NOT_FOUND'},404);
  const existing=[...state.intents.values()].find(row=>row.service==='music'&&row.track.featureKey===track.featureKey);
  if(orderId&&(!existing||existing.orderId!==orderId))return reply({error:'RESULT_NOT_FOUND'},404);
  if(existing)return reply(existing);
  const id=(++state.sequence).toString(16).padStart(64,'0'),row={id,service:'music',track,input:{audioSourceKey:track.audioSourceKey},sku:'mock-'+track.featureKey,amountKRW:1,paid:false,orderId:null,createdAt:now().toISOString()};
  state.intents.set(id,row);if(!save()){state.intents.delete(id);return reply({error:'MOCK_STORAGE_UNAVAILABLE'},503);}return reply(row);
 }
 const match=/^\/native\/music\/(intents|results)\/([a-f0-9]{64})(\/file)?$/.exec(path);
 if(match){
  const row=state.intents.get(match[2]);if(!row||row.service!=='music')return reply({error:'RESULT_NOT_FOUND'},404);
  if(row.refunded)return reply({error:'ORDER_REFUNDED'},409);
  if(match[1]==='intents'&&!match[3])return reply(row);
  if(!row.paid||state.orders.get(row.orderId)!==row.id)return match[3]?reply({error:'PAYMENT_REQUIRED'},402):reply({id:row.id,state:'PENDING',track:row.track});
  if(match[3])return reply({data:'SUQzBAAAAAAAAA==',fileName:'모의-음악-저장-검증.mp3',mimeType:'audio/mpeg'});
  return reply({id:row.id,resultId:row.id,state:'COMPLETED',track:row.track});
 }
 if(!['/orders/grant','/orders/restore'].includes(path)||request.method!=='POST')return null;
 const {orderId,sku,requestId}=await request.json();if(!musicProducts.some(row=>row.sku===sku))return null;
 const row=state.intents.get(requestId||state.orders.get(orderId));
 if(!row||row.service!=='music'||row.sku!==sku||!orderId||row.refunded||(row.orderId&&row.orderId!==orderId)||(state.orders.has(orderId)&&state.orders.get(orderId)!==row.id))return reply({error:'ORDER_MISMATCH'},403);
 const old={paid:row.paid,orderId:row.orderId},assignment=state.orders.get(orderId);row.paid=true;row.orderId=orderId;state.orders.set(orderId,row.id);
 if(!save()){Object.assign(row,old);if(assignment===undefined)state.orders.delete(orderId);else state.orders.set(orderId,assignment);return reply({error:'MOCK_STORAGE_UNAVAILABLE'},503);}
 return reply({orderId,requestId:row.id,entitlement:'granted',durable:true});
}

return {musicProducts,musicPurchases,musicRecords,musicRequest};
}
