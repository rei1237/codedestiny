import {allTracks} from '../../app/music/_data/musicManifest.ts';
import {getMusicTrackAccessPolicy,normalizeMusicAudioSourceKey} from '../../lib/music-access-policy.js';
import {TossNativeConsultation} from './models.js';
import {APPROVED_TOSS_NATIVE_PRODUCTS} from './catalog.js';
import {TossError} from './policy.js';
import {hash} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {bindNativeTossRequest} from './native-context.js';
import {handleMusicRoutes} from '../routes/music.js';

const SERVICE='music',ID=/^[a-f0-9]{64}$/;
// Bound memory for the native base64 bridge. Larger originals fail without partial saves.
export const MAX_NATIVE_MUSIC_BYTES=32*1024*1024;
export function musicTrack(input){
  const key=normalizeMusicAudioSourceKey(input?.audioSourceKey);
  const track=allTracks.find(item=>item.audioSourceKey===key);
  const policy=getMusicTrackAccessPolicy(key);
  if(!track||!policy.purchaseFeatureKey)throw new TossError('MUSIC_TRACK_NOT_FOUND',404);
  return {audioSourceKey:key,featureKey:policy.purchaseFeatureKey,title:track.title,artist:track.artistName};
}
export async function musicContract(input){
  const track=musicTrack(input),normalized={audioSourceKey:track.audioSourceKey};
  const approved=APPROVED_TOSS_NATIVE_PRODUCTS.find(item=>item.nativeService===SERVICE&&item.featureKey===track.featureKey);
  return {input:normalized,contract:{requestId:track.featureKey,resultId:'music_'+track.featureKey,
    featureKey:track.featureKey,inputHash:await hash(JSON.stringify(normalized)),pricing:{amountKRW:approved?.approvedPriceKRW??0,billingType:'per_use'}}};
}
export async function prepareNativeMusic(env,auth,input,orderId){
  const prepared=await musicContract(input);
  return prepareNativeConsultation(env,auth,prepared.input,orderId,prepared.contract,SERVICE);
}
async function checked(env,auth,id,allowPrepared=false){
  if(!ID.test(id))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await TossNativeConsultation.findOne({_id:id,...nativeOwnerFilter(auth,SERVICE)}).lean();
  assertNativeIntent(row,auth);
  const prepared=await musicContract(row.input);
  assertNativeIntent(row,auth,prepared.contract);
  if(row.nativeService!==SERVICE)throw new TossError('RESULT_NOT_FOUND',404);
  if(!allowPrepared||row.status!=='prepared')await verifiedIntent(env,auth,row);
  return {row,track:musicTrack(row.input)};
}
export async function readNativeMusic(env,auth,id){
  const {row,track}=await checked(env,auth,id,true);
  return {id:row._id,resultId:row.resultId,state:row.status==='paid'?'COMPLETED':'PENDING',track};
}
export async function nativeMusicLibraryItem(env,auth,purchase){
  if(!purchase||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.nativeService!==SERVICE)throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/music?orderId='+encodeURIComponent(purchase._id)};
  const {row,track}=await checked(env,auth,purchase.requestId);
  if(row.orderId!==purchase._id)throw new TossError('RESULT_NOT_FOUND',404);
  return {state:'COMPLETED',resultId:row.resultId,href:'/music?intentId='+encodeURIComponent(row._id),question:track.title};
}
export async function downloadNativeMusic(env,auth,id){
  const {row,track}=await checked(env,auth,id);
  const url=new URL('https://native.invalid/api/music/download');
  url.searchParams.set('key',track.audioSourceKey);url.searchParams.set('featureKey',track.featureKey);
  const request=bindNativeTossRequest(new Request(url),{async musicDownload(input){
    if(input.key!==track.audioSourceKey||input.featureKey!==track.featureKey)throw new TossError('REQUEST_INPUT_MISMATCH',409);
    await verifiedIntent(env,auth,row);
    return {audioSourceKey:track.audioSourceKey,hasFullAccess:true,canDownload:true};
  }});
  const response=await handleMusicRoutes(request,env);
  if(!response.ok||!response.body)throw new TossError('MUSIC_DOWNLOAD_UNAVAILABLE',502);
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;
      if(length>MAX_NATIVE_MUSIC_BYTES)throw new TossError('MUSIC_FILE_TOO_LARGE',413);chunks.push(value);}
  }finally{await reader.cancel();}
  if(!length)throw new TossError('MUSIC_DOWNLOAD_UNAVAILABLE',502);
  await verifiedIntent(env,auth,row);
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {data:btoa(binary),fileName:track.audioSourceKey.split('/').pop().replace(/[\r\n"\\]/g,''),mimeType:'audio/mpeg'};
}
