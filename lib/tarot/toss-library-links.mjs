const ORDER_ID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function tarotOrderFromQuery(search){const id=new URLSearchParams(search).get('orderId')||'';return ORDER_ID.test(id)?id:'';}
export function tarotResultPath(orderId){if(!ORDER_ID.test(orderId||''))return '';return '/tarot-library?orderId='+encodeURIComponent(orderId);}
