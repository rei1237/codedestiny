'use client';
// moonlitRitual 네임스페이스. useT 는 ko 사전을 비우므로 ko 는 정적 import 로 읽는다(useGuidedT 와 같은 방식).
import {useCallback} from 'react';
import koRitual from '@/public/i18n/ko/moonlitRitual.json';
import {interpolate} from '@/lib/i18n/dictionary';
import {useLocale,useT} from '@/lib/i18n/useT';
export type RitualT=(key:string,vars?:Record<string,unknown>)=>string;
function lookup(source:unknown,key:string):string{
 let node:unknown=source;
 for(const part of key.split('.')){
  if(!node||typeof node!=='object')return '';
  node=(node as Record<string,unknown>)[part];
 }
 return typeof node==='string'?node:'';
}
export function useRitualT():{t:RitualT;locale:string}{
 const locale=useLocale();
 const translate=useT('moonlitRitual');
 const t=useCallback<RitualT>(
  (key,vars)=>locale==='ko'?interpolate(lookup(koRitual.moonlitRitual,key),vars):translate('moonlitRitual.'+key,vars),
  [locale,translate],
 );
 return {t,locale};
}
