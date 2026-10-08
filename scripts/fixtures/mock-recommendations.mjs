import { cleanProduct, cleanSettings, isEnabled, providerEnabled, normalizeContext, RECOMMENDATIONS_RELEASED, reviewProduct, reviewErrors, validateAffiliateUrl, selectProducts, DEFAULT_SETTINGS, PARTNER_ACCOUNT } from '../../js/recommendations-core.mjs';
// Isolated process memory, reachable only through the existing mock dev server.
export const MOCK_RECOMMENDATION_TOKEN = 'mock-recommendation-admin.' + '0'.repeat(64);
export function createRecommendationMock() {
  const products = new Map(), reports = new Map();
  let settings = { ...DEFAULT_SETTINGS };
  return (route, body, token, send, query = new URLSearchParams()) => {
    if (route === 'POST /api/admin/entry/password') { send(body.password === 'mock-recommendations-only' ? 200 : 401, body.password === 'mock-recommendations-only' ? {ok:true,adminToken:MOCK_RECOMMENDATION_TOKEN} : {error:'MOCK_ADMIN_REQUIRED'}); return true; }
    if (route === 'GET /api/recommendations') {
      const context = normalizeContext({service:query.get('service'),category:query.get('category'),source:query.get('source'),practiceTags:query.getAll('topic'),interests:query.getAll('interest'),currency:query.get('currency'),maxPrice:query.get('maxPrice'),color:query.get('color'),motif:query.get('motif'),species:query.get('species'),groupId:query.get('group'),exclude:query.getAll('exclude')});
      const enabled = isEnabled(settings,context.service);
      send(200, {enabled,products:enabled ? selectProducts([...products.values()].filter(p=>providerEnabled(settings,p.providerId)),context).map(p=>({...p,affiliateUrl:''})) : []}); return true;
    }
    if (route === 'POST /api/recommendations/events') { send(200,{ok:true});return true; }
    if (!route.includes('/api/admin/recommendations')) return false;
    if (token !== MOCK_RECOMMENDATION_TOKEN) { send(401, { error: 'MOCK_ADMIN_REQUIRED' }); return true; }
    try {
      if (route === 'GET /api/admin/recommendations') send(200, { products: [...products.values()].map(p=>({...p,urlFormatValid:validateAffiliateUrl(p.affiliateUrl,p.providerId)})), settings, released: RECOMMENDATIONS_RELEASED, account: PARTNER_ACCOUNT });
      else if (route === 'GET /api/admin/recommendations/metrics') send(200, { metrics: [], reports: [...reports.values()], reportingWindowDays: 30 });
      else if (route === 'POST /api/admin/recommendations/product') { const p=cleanProduct(body);products.set(p.id,p);send(200,{ok:true,product:p}); }
      else if (route === 'POST /api/admin/recommendations/preview') { const p=cleanProduct(body.product);send(200,{product:{...p,affiliateUrl:'',preview:true},reviewErrors:reviewErrors(p)}); }
      else if (route === 'POST /api/admin/recommendations/review') { const p=reviewProduct(products.get(body.id),body.checks);products.set(p.id,p);send(200,{ok:true,product:p}); }
      else if (route === 'POST /api/admin/recommendations/pause') { const p=products.get(body.id);if(!p)throw new Error('상품이 없습니다.');products.set(p.id,{...p,status:'paused'});send(200,{ok:true}); }
      else if (route === 'POST /api/admin/recommendations/settings') { const next=cleanSettings(body);if(next.enabled && (!next.approved || !next.mediaRegistered))throw new Error('계정과 매체 확인 필요');settings=next;send(200,{ok:true,settings}); }
      else if (route === 'POST /api/admin/recommendations/report') { reports.set(body.from+'_'+body.to,{...body,source:'mock_only',verifiedAt:new Date().toISOString()});send(200,{ok:true}); }
      else if (route === 'POST /api/admin/recommendations/selection-preview') send(200,{products:selectProducts([...products.values()],body).map(p=>({...p,affiliateUrl:'',preview:true}))});
      else send(404,{error:'MOCK_ROUTE_NOT_IMPLEMENTED'});
    } catch(error) {send(400,{error:'MOCK_INVALID_INPUT',message:error.message});}
    return true;
  };
}
