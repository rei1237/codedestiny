import {File,Share} from '@apps-in-toss/web-framework';
import {toPng} from 'html-to-image';
import {ApiError,isToss,APP_NAME} from './platform';
import {SERVICE_AVAILABLE} from './release';

export async function saveAnimalCard(element:HTMLElement){
 if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
 if(!File.saveBase64.isSupported())throw new ApiError('FILE_SAVE_NOT_SUPPORTED');
 const image=await toPng(element,{pixelRatio:2,cacheBust:true,width:1080,height:1920,style:{transform:'scale(1)',transformOrigin:'top left'}});
 if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image))throw new ApiError('CARD_IMAGE_INVALID');
 await File.saveBase64({data:image.slice('data:image/png;base64,'.length),fileName:'code-destiny-animal-card.png',mimeType:'image/png'});
}
export async function shareAnimalCard(animalName:string,summary:string){
 if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
 if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
 const link=await Share.createLink({path:`intoss://${APP_NAME}/saju/animal-destiny?source=share`});
 // Only the public animal story and entry travel; birth, partner, owner and order never do.
 await Share.sendMessage({message:`${animalName}\n${summary.slice(0,500)}\n\n십이운성 동물점에서 나의 동물을 만나보세요. ${link}`});
}
