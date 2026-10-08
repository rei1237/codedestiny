/** @jest-environment node */
const connectDb = jest.fn(async()=>{});
const store = new Map();
const find = jest.fn(()=>({sort:()=>({limit:()=>({lean:async()=>[...store.values()]})})}));
const product = { find, findById:jest.fn(id=>({lean:async()=>store.get(id)||null})), countDocuments:jest.fn(async()=>store.size), updateOne:jest.fn(async(filter,update)=>{store.set(filter._id,{_id:filter._id,data:update.$set.data,updatedAt:new Date()});return {modifiedCount:1};}) };
let settingsData = null;
const setting = { findById:jest.fn(()=>({lean:async()=>settingsData && {data:settingsData}})), updateOne:jest.fn(async(_filter,update)=>{settingsData=update.$set.data;return {modifiedCount:1};}) };
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
beforeEach(()=>{store.clear();settingsData=null;jest.clearAllMocks();});
test('default settings suppress public products and metric writes',async()=>{
  const res=await handleRecommendationRoutes(request('/?service=legacy-saju'),{});
  expect(await res.json()).toEqual({enabled:false,products:[]});
  expect((await handleRecommendationRoutes(new Request('https://code-destiny.com/api/recommendations/events',{method:'POST',headers:{Origin:'https://code-destiny.com'},body:JSON.stringify({event:'click',service:'legacy-saju',placement:'result',productId:'book-id',consent:true})}),{})).status).toBe(204);
  expect(connectDb).toHaveBeenCalled();expect(metric.updateOne).not.toHaveBeenCalled();
});
test('manual draft saves unknown price and stock without manufacturing a link',async()=>{
  const res=await handleAdminRecommendationRoutes('/product',request('/',{id:'real-draft',category:'books',kind:'book',title:'검토 중인 도서'}),{});
  expect(res.status).toBe(200);
  const p=(await res.json()).product;
  expect(p.affiliateUrl).toBe('');expect(p.price).toBe(null);expect(p.stock).toBe('unknown');expect(p.status).toBe('draft');
});
test('global ON requires account and media verification',async()=>{
  const r=await handleAdminRecommendationRoutes('/settings',request('/',{enabled:true,approved:false,mediaRegistered:true}),{});
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
  expect(r.status).toBe(200);expect((await r.json()).report.commission).toBe(null);
});

test('admin save and review preserve provider metadata and public API varies by practice',async()=>{
  const provider={enabled:true,approved:true,mediaRegistered:true,evidence:'mock account and registered website'};
  await handleAdminRecommendationRoutes('/settings',request('/',{enabled:true,approved:true,mediaRegistered:true,providers:{coupang:{...provider,trackingId:'AF7837486'},aliexpress:{...provider,trackingId:'NEO2277',enabled:false}}}),{});
  const checks={account:true,facts:true,image:true,allowedCategory:true};
  for(const [id,providerId,tag,url] of [['habit-fixture','coupang','habit-building','https://link.coupang.com/a/FixtureOnly'],['budget-fixture','aliexpress','budgeting','https://s.click.aliexpress.com/e/_FixtureOnly']]) {
    const saved=await handleAdminRecommendationRoutes('/product',request('/',{id,providerId,category:'books',kind:'book',title:id,currency:providerId==='aliexpress'?'USD':'KRW',practiceTags:[tag],topicReasons:{[tag]:'조언과 실천을 연결하는 검수 이유'},reason:'검수 이유',interests:['reading'],affiliateUrl:url,evidence:'mock official source',book:{author:'fixture',publisher:'fixture',edition:'paper 1',language:'ko',format:'paper',editionEvidence:'mock ISBN evidence',contentsEvidence:'mock contents',audience:'adult',perspective:'practical'}}),{});
    expect(saved.status).toBe(200);
    expect((await handleAdminRecommendationRoutes('/review',request('/',{id,checks}),{})).status).toBe(200);
  }
  const query=async tag=>(await (await handleRecommendationRoutes(request('/?service=saju_mackerel&topic='+tag),{})).json()).products;
  expect((await query('habit-building')).map(p=>p.id)).toEqual(['habit-fixture']);
  expect(await query('budgeting')).toEqual([]);
  settingsData.providers.aliexpress.enabled=true;
  const ali=await query('budgeting');
  expect(ali[0]).toMatchObject({providerId:'aliexpress',currency:'USD',book:{author:'fixture'},reason:'조언과 실천을 연결하는 검수 이유'});
  expect(ali[0]).not.toHaveProperty('evidence');
  expect(await query('')).toEqual([]);
  await handleAdminRecommendationRoutes('/pause',request('/',{id:'budget-fixture'}),{});
  expect(await query('budgeting')).toEqual([]);
});
