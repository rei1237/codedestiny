import {sdkProducts} from './api.mjs';
import {createMusicSimulation} from './music-download.mjs';
import musicTracks from 'virtual:toss-music-shelf';
const products=[...sdkProducts,...createMusicSimulation(musicTracks).musicProducts];
import {person} from './storage.mjs';
const supported=fn=>Object.assign(fn,{isSupported:()=>true});
const blocked=()=>{throw Error('PRIVATE_SIMULATION_UNAVAILABLE');};
const disabled=new Proxy({},{get:()=>blocked});
export const Accuracy={Balanced:'balanced'};
export const Clipboard=disabled,Device=disabled;
export const Share={createLink:blocked,sendMessage:supported(async({message})=>{
 const {hatHouses}=await import('../../../lib/yeongnyangi/hat-houses.ts');
 if(typeof message==='string'&&message.startsWith('연이의 마음 별자리 · ')&&message.length<=160&&!/[\r\n]/.test(message)){
  localStorage.setItem('private-star-hug-share','opened');return;
 }
 if(!hatHouses.some(house=>message===`영냥이의 모자 · ${house.name}\n${house.motto}`))return blocked();
 localStorage.setItem('private-hat-share',message);
})};
export const File={saveBase64:supported(async value=>{
 if(value?.mimeType==='image/svg+xml'&&/^yeon-heart-card-[가-힣]+자리-[a-z]+\.svg$/.test(value.fileName)&&typeof value.data==='string'&&value.data.length<700000){
  const svg=atob(value.data);
  if(!svg.includes('<svg')||!svg.includes('width="1080"')||!svg.includes('height="1350"')||!svg.includes('href="data:image/webp;base64,')||svg.includes('<script'))return blocked();
  localStorage.setItem('private-star-hug-save',value.fileName);return;
 }
 if(value?.mimeType==='image/png'&&value.fileName?.startsWith('영냥이의-모자-')){
   const {hatHouses}=await import('../../../lib/yeongnyangi/hat-houses.ts');
   if(!hatHouses.some(house=>value.fileName===`영냥이의-모자-${house.name}.png`)||typeof value.data!=='string'||!value.data.startsWith('iVBORw0KGgo')||value.data.length<32||value.data.length>10_000_000)return blocked();
   const bytes=Uint8Array.from(atob(value.data.slice(0,32)),c=>c.charCodeAt(0)),header=new DataView(bytes.buffer);
   if(header.getUint32(16)!==1080||header.getUint32(20)!==1400)return blocked();
   localStorage.setItem('private-hat-save',JSON.stringify({fileName:value.fileName,width:1080,height:1400}));
   return;
 }
 if(value?.mimeType==='image/png'&&/^destiny-anatomy-(feed|story)\.png$/.test(value.fileName)&&typeof value.data==='string'&&value.data.startsWith('iVBORw0KGgo')&&value.data.length>=32){
   const head=atob(value.data.slice(0,32)),bytes=Uint8Array.from(head,c=>c.charCodeAt(0)),header=new DataView(bytes.buffer);
   const width=header.getUint32(16),height=header.getUint32(20);
   if(width!==1080||height!==(value.fileName.includes('-feed')?1350:1920))return blocked();
   const saves=JSON.parse(localStorage.getItem('private-file-saves')||'[]');
   saves.push({fileName:value.fileName,mimeType:value.mimeType,width,height,simulated:true});localStorage.setItem('private-file-saves',JSON.stringify(saves));return;
 }
 if(value?.data!=='SUQzBAAAAAAAAA=='||value?.mimeType!=='audio/mpeg'||value?.fileName!=='모의-음악-저장-검증.mp3')return blocked();
 const saves=JSON.parse(localStorage.getItem('private-file-saves')||'[]');saves.push({...value,simulated:true});localStorage.setItem('private-file-saves',JSON.stringify(saves));
})};
export class SetClipboardTextPermissionError extends Error {}
export const Environment={environment:'sandbox'};
export const isMinVersionSupported=()=>true;
export const TossAuth={login:async()=>({authorizationCode:'private-simulation-person-'+person,referrer:'SANDBOX'})};
export const Storage={getItem:async key=>localStorage.getItem('sdk:'+key),setItem:async(key,value)=>localStorage.setItem('sdk:'+key,value),removeItem:async key=>localStorage.removeItem('sdk:'+key)};
const pendingKey='sdk:pending-orders';
const pending=()=>JSON.parse(localStorage.getItem(pendingKey)||'[]');
const finish=orderId=>localStorage.setItem(pendingKey,JSON.stringify(pending().filter(order=>order.orderId!==orderId)));
export const IAP={
  getProductItemList:supported(async()=>({products:products.map(p=>({sku:p.sku,type:'CONSUMABLE',displayName:p.name,displayAmount:p.approvedPriceKRW.toLocaleString('ko-KR')+'원'}))})),
  getPendingOrders:supported(async()=>({orders:pending()})),
  completeProductGrant:supported(async({params})=>{finish(params.orderId);return true;}),
  createOneTimePurchaseOrder:supported(({options,onEvent,onError})=>{
    if(!products.some(product=>product.sku===options.sku))throw Error('UNKNOWN_SIMULATION_SKU');
    const orderId='private-order-'+person+'-'+crypto.randomUUID();
    let subscribed=true;
    queueMicrotask(async()=>{try{
      if(!subscribed)return;
      // The fixture's durable grant is local; a reopened app can acknowledge a granted pending order.
      const granted=await options.processProductGrant({orderId});
      if(!granted)throw Error('MOCK_GRANT_FAILED');
      localStorage.setItem(pendingKey,JSON.stringify([...pending(),{orderId,sku:options.sku}]));
      if(subscribed){finish(orderId);onEvent({type:'success',data:{orderId}});}
    }catch(error){if(subscribed)onError(error);}});
    return ()=>{subscribed=false;};
  }),
};
