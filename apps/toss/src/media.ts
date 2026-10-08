import {File,Share} from '@apps-in-toss/web-framework';
import {isToss,APP_NAME,ApiError} from './platform';
import {SERVICE_AVAILABLE} from './release';

export async function saveCardPng(dataUrl:string){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!File.saveBase64.isSupported())throw new ApiError('FILE_SAVE_NOT_SUPPORTED');
  if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl))throw new ApiError('CARD_IMAGE_INVALID');
  await File.saveBase64({data:dataUrl.slice('data:image/png;base64,'.length),fileName:'code-destiny-bias-card.png',mimeType:'image/png'});
}

export async function saveTarotResultCardPng(dataUrl:string){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!File.saveBase64.isSupported())throw new ApiError('FILE_SAVE_NOT_SUPPORTED');
  if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl))throw new ApiError('CARD_IMAGE_INVALID');
  await File.saveBase64({data:dataUrl.slice('data:image/png;base64,'.length),fileName:'code-destiny-tarot-card.png',mimeType:'image/png'});
}

export async function shareBiasSummary(summary:string){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  // A public entry link only. Birth dates, report IDs and tokens never enter it.
  const link=await Share.createLink({path:`intoss://${APP_NAME}/bias?source=share`});
  await Share.sendMessage({message:`${summary.slice(0,500)}\n\n최애운명에서 나의 케미를 살펴보세요. ${link}`});
  // The resolved promise does not prove sending or receiving a message.
}

export async function shareTarotResultSummary(title:string,summary:string){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  // This always opens the public library entry. Questions, order IDs, and result IDs stay private.
  const link=await Share.createLink({path:`intoss://${APP_NAME}/tarot-library?source=share`});
  await Share.sendMessage({message:`${title}\n${summary.slice(0,500)}\n\nCode Destiny 타로 리딩에서 나의 흐름을 살펴보세요. ${link}`});
  // A resolved SDK call only means the share sheet returned, never that a recipient received it.
}
