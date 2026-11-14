import {sdkProducts} from './api.mjs';
import {createMusicSimulation} from './music-download.mjs';
import musicTracks from 'virtual:toss-music-shelf';
const products=[...sdkProducts,...createMusicSimulation(musicTracks).musicProducts];
import {person} from './storage.mjs';
const supported=fn=>Object.assign(fn,{isSupported:()=>true});
const blocked=()=>{throw Error('PRIVATE_SIMULATION_UNAVAILABLE');};
const disabled=new Proxy({},{get:()=>blocked});
export const Accuracy={Balanced:'balanced'};
export const Clipboard=disabled,Device=disabled,Share=disabled;
export const File={saveBase64:supported(async value=>{
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
