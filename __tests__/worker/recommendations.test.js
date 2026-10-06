/** @jest-environment node */
const connectDb = jest.fn(async()=>{});
const store = new Map();
const find = jest.fn(()=>({sort:()=>({limit:()=>({lean:async()=>[...store.values()]})})}));
const product = { find, findById:jest.fn(id=>({lean:async()=>store.get(id)||null})), countDocuments:jest.fn(async()=>store.size), updateOne:jest.fn(async(filter,update)=>{store.set(filter._id,{_id:filter._id,data:update.$set.data,updatedAt:new Date()});return {modifiedCount:1};}) };
const setting = { findById:jest.fn(()=>({lean:async()=>null})), updateOne:jest.fn(async()=>({modifiedCount:1})) };
const metric={find,updateOne:jest.fn()},report={find,updateOne:jest.fn()};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb,withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/recommendation-models.js',()=>({RecommendationProduct:product,RecommendationSetting:setting,RecommendationMetric:metric,RecommendationReport:report}));
jest.unstable_mockModule('../../worker/lib/rate-limit.js',()=>({incrementRateLimit:jest.fn(async()=>({count:1}))}));
let handleRecommendationRoutes, handleAdminRecommendationRoutes;
beforeAll(async()=>{
  ({handleRecommendationRoutes}=await import('../../worker/routes/recommendations.js'));
  ({handleAdminRecommendationRoutes}=await import('../../worker/routes/admin-recommendations.js'));
});
const request=(path,body)=>new Request('https://code-destiny.com/api/recommendations'+path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{store.clear();jest.clearAllMocks();});
test('public OFF means zero DB reads/writes and no operational products',async()=>{
  const res=await handleRecommendationRoutes(request('/?service=legacy-saju'),{});
  expect(await res.json()).toEqual({enabled:false,products:[]});
  expect((await handleRecommendationRoutes(request('/events',{event:'click'}),{})).status).toBe(204);
  expect(connectDb).not.toHaveBeenCalled();expect(metric.updateOne).not.toHaveBeenCalled();
});
test('manual draft saves unknown price and stock without manufacturing a link',async()=>{
  const res=await handleAdminRecommendationRoutes('/product',request('/',{id:'real-draft',category:'books',kind:'book',title:'검토 중인 도서'}),{});
  expect(res.status).toBe(200);
  const p=(await res.json()).product;
  expect(p.affiliateUrl).toBe('');expect(p.price).toBe(null);expect(p.stock).toBe('unknown');expect(p.status).toBe('draft');
});
test('global ON is rejected during approval-pending release',async()=>{
  const r=await handleAdminRecommendationRoutes('/settings',request('/',{enabled:true,approved:true,mediaRegistered:true}),{});
  expect(r.status).toBe(409);expect(setting.updateOne).not.toHaveBeenCalled();
});
test('preview never returns a usable purchase URL or writes',async()=>{
  const r=await handleAdminRecommendationRoutes('/preview',request('/',{product:{id:'preview-id',category:'books',title:'미리보기',affiliateUrl:'https://link.coupang.com/a/FixtureOnly'}}),{});
  expect((await r.json()).product.affiliateUrl).toBe('');expect(product.updateOne).not.toHaveBeenCalled();
});
test('draft without official evidence cannot be reviewed',async()=>{
  store.set('draft-id',{_id:'draft-id',data:{id:'draft-id',category:'books',kind:'book'},updatedAt:new Date()});
  const r=await handleAdminRecommendationRoutes('/review',request('/',{id:'draft-id',checks:{account:true,facts:true,image:true,allowedCategory:true}}),{});
  expect(r.status).toBe(400);expect(product.updateOne).not.toHaveBeenCalled();
});
test('official reports preserve unknown values, reject fabricated numeric defaults',async()=>{
  const r=await handleAdminRecommendationRoutes('/report',request('/',{from:'2026-10-01',to:'2026-10-07',clicks:null,orders:null,cancellations:null,commissionKRW:null,evidence:'공식 보고서 미확인 값은 빈칸으로 유지'}),{});
  expect(r.status).toBe(200);expect((await r.json()).report.commissionKRW).toBe(null);
});
