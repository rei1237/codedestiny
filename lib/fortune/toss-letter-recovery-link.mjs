const ORDER_ID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const PRODUCT=/^chat_(saju|ziwei|sukuyo|vedic|astrology|tarot)$/;
export function letterRecoveryPath(purchase){
 if(!purchase||!['yeoni','neo'].includes(purchase.serviceId)||purchase.nativeService||purchase.state!=='UNASSIGNED'||purchase.status==='REFUNDED'||purchase.requestId||!PRODUCT.test(purchase.productId||'')||!ORDER_ID.test(purchase.orderId||''))return '';
 return '/fortune-tea-house/?counsel=letter'+(purchase.serviceId==='neo'?'&persona=neo':'')+'&orderId='+encodeURIComponent(purchase.orderId);
}
