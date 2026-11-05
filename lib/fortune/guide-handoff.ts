import {saveQuestionEntry} from './question-entry';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';

export const LETTER_DRAFT_KEY = 'fortune-chat:consultation-draft';
const NEO_KEY = 'neo:home-question';
export function saveGuideQuestion(id:string,question:string) {
  if(id==='cat')return saveQuestionEntry(question);
  try {
    sessionStorage.setItem(id==='yeoni'?LETTER_DRAFT_KEY:NEO_KEY, JSON.stringify({question,at:Date.now(),owner:readDestinyProfileAccountId(),source:'guide'}));
    return true;
  } catch {return false;}
}
export function readGuideQuestion(key=NEO_KEY):string {
  try {
    const draft=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!draft||draft.source!=='guide'||draft.owner!==readDestinyProfileAccountId()||Date.now()-draft.at>300000)return '';
    if(key===NEO_KEY)sessionStorage.removeItem(key);
    return typeof draft.question==='string'?draft.question:'';
  } catch {return '';}
}
