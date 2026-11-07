import {savedAnalyticsConsent} from '@/app/_lib/analytics-consent';
import {readCurrentDestinyProfile,readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {CONSULTATION_DRAFT_KEY} from '@/lib/fortune/question-entry';
import {readFirstVisit,readYeongnyangiGuideHidden} from '@/js/first-visit-state.mjs';

const readKey='cd:yeongnyangi:neo-prologue:v1';

export function offerPrologue(){
  if(window.location.hash || window.location.search) return false;
  try{
    // A modal dialog makes the consent banner inert. Keep the question form usable on this visit.
    const nativeApp = (window as Window & {__cdAppContext?: {isApp?: () => boolean}}).__cdAppContext?.isApp?.();
    if (!nativeApp && !savedAnalyticsConsent()) return false;
    if(localStorage.getItem(readKey) || sessionStorage.getItem(CONSULTATION_DRAFT_KEY)) return false;
    if(readDestinyProfileAccountId() || readCurrentDestinyProfile() || readYeongnyangiGuideHidden() || readFirstVisit('yeongnyangi').status!=='new') return false;
    // If storage is read-only, keep the consultation immediately usable.
    localStorage.setItem(readKey,'offered');
    return true;
  }catch{return false;}
}

export function rememberPrologue(){
  try{localStorage.setItem(readKey,'read');}catch{/* The room can still replay the story. */}
}
