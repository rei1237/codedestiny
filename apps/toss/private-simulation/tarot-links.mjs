import {tarotOrderFromQuery as canonicalOrder,tarotResultPath as canonicalPath} from '../../../lib/tarot/toss-library-links.mjs';
export const privateTarotUuid=id=>String(id||'').replace(/^private-order-[AB]-(?=[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$)/i,'');
export function tarotResultPath(id){return canonicalPath(privateTarotUuid(id));}
export function tarotOrderFromQuery(search){const query=new URLSearchParams(search);query.set('orderId',privateTarotUuid(query.get('orderId')));return canonicalOrder(query.toString());}
