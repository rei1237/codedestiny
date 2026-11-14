import {File} from '@apps-in-toss/web-framework';
import {isToss,ApiError} from './platform';

// The native SDK offers file saving, not file attachment sharing. Match the web
// share fallback by saving the original image and reporting "saved" accurately.
export async function deliverHumanDesignImage(blob:Blob,_share:boolean,_title:string,format:string):Promise<'saved'>{
 if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
 if(!File.saveBase64.isSupported())throw new ApiError('FILE_SAVE_NOT_SUPPORTED');
 if(blob.type!=='image/png'||!['feed','story'].includes(format))throw new ApiError('CARD_IMAGE_INVALID');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 await File.saveBase64({data:btoa(binary),fileName:`human-design-manual-${format}.png`,mimeType:'image/png'});
 return 'saved';
}
