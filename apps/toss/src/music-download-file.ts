import {File} from '@apps-in-toss/web-framework';
import {api,getTossSessionRevision,isToss} from './platform';
export async function saveMusicDownload(id:string){
 if(!isToss()||!File.saveBase64.isSupported())throw new Error('FILE_SAVE_NOT_SUPPORTED');
 const revision=getTossSessionRevision();
 const file=await api<{data:string;fileName:string;mimeType:string}>('/native/music/results/'+id+'/file');
 if(revision!==getTossSessionRevision())throw new Error('SESSION_CHANGED');
 if(file.mimeType!=='audio/mpeg'||typeof file.data!=='string'||!file.data.length||file.data.length>44739244||!file.fileName?.endsWith('.mp3')||/[\/\\\r\n]/.test(file.fileName))throw new Error('MUSIC_FILE_INVALID');
 await File.saveBase64(file);
}
