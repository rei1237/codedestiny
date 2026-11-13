import {useState,type FormEvent} from 'react';
import {rememberTossTeaPrice,type TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';

export function useTossExpertPrice(featureKey:string,enabled:boolean){
  const [selection,onPrice]=useState<TossTeaPriceSelection|null>(null);
  const restoring=enabled&&typeof window!=='undefined'&&Boolean(new URLSearchParams(window.location.search).get('orderId'));
  const matched=selection?.featureKey===featureKey?selection:null;
  const canStart=!enabled||restoring||Boolean(matched);
  function confirm(event:FormEvent,paid=false){
    if(!enabled||restoring||paid)return true;
    if(!matched){event.preventDefault();return false;}
    rememberTossTeaPrice(matched);
    return true;
  }
  return {onPrice,canStart,confirm};
}
