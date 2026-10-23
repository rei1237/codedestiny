/** @jest-environment node */
const connectDb = jest.fn(async()=>{});
const store = new Map();
const find = jest.fn(()=>({sort:()=>({limit:()=>({lean:async()=>[...store.values()]})})}));
const product = { find, findById:jest.fn(id=>({lean:async()=>store.get(id)||null})), countDocuments:jest.fn(async()=>store.size), updateOne:jest.fn(async(filter,update)=>{store.set(filter._id,{_id:filter._id,data:update.$set.data,updatedAt:new Date()});return {modifiedCount:1};}) };
let settingsData = null;
const setting = { findById:jest.fn(()=>({lean:async()=>settingsData && {data:settingsData}})), updateOne:jest.fn(async(_filter,update)=>{settingsData=update.$set.data;return {modifiedCount:1};}) };
const metric={aggregate:jest.fn(async()=>[]),updateOne:jest.fn()},report={find,updateOne:jest.fn()};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb,withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/recommendation-models.js',()=>({RecommendationProduct:product,RecommendationSetting:setting,RecommendationMetric:metric,RecommendationReport:report}));
jest.unstable_mockModule('../../worker/lib/rate-limit.js',()=>({incrementRateLimit:jest.fn(async()=>({count:1}))}));
let handleRecommendationRoutes, handleAdminRecommendationRoutes;
beforeAll(async()=>{
  ({handleRecommendationRoutes}=await import('../../worker/routes/recommendations.js'));
  ({handleAdminRecommendationRoutes}=await import('../../worker/routes/admin-recommendations.js'));
});
const request=(path,body)=>new Request('https://code-destiny.com/api/recommendations'+path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{store.clear();settingsData=null;jest.clearAllMocks();metric.aggregate.mockResolvedValue([]);});
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

const eventRequest = body => new Request('https://code-destiny.com/api/recommendations/events', {
  method: 'POST', headers: { Origin: 'https://code-destiny.com' }, body: JSON.stringify(body),
});
const impression = { event: 'impression', service: 'legacy-saju', placement: 'result', productId: 'book-id', consent: true };
function enableMetrics() {
  settingsData = { enabled: true, approved: true, mediaRegistered: true, providers: { coupang: { enabled: true, approved: true, mediaRegistered: true, trackingId: 'AF7837486', evidence: 'mock account and registered website' } } };
  store.set('book-id', { data: { id: 'book-id', status: 'active', providerId: 'coupang' } });
}
test('each visible product increments its existing daily aggregate key', async () => {
  enableMetrics();
  for (const placement of ['result', 'browse']) {
    expect((await handleRecommendationRoutes(eventRequest({ ...impression, placement }), {})).status).toBe(204);
    expect(metric.updateOne).toHaveBeenLastCalledWith(
      { _id: [new Date().toISOString().slice(0, 10), 'legacy-saju', placement, 'book-id', 'impression'].join('|') },
      { $setOnInsert: expect.objectContaining({ event: 'impression', productId: 'book-id', placement }), $inc: { count: 1 } },
      { upsert: true },
    );
  }
});
test.each([
  { productId: '' }, { productId: 'block' }, { productId: 'bad/id' }, { productId: ['book-id'] },
  { productIds: ['book-id'] }, { consent: false }, { reportId: 'private' }, { placement: 'unknown' },
])('product impressions reject invalid shape %j before writing', async patch => {
  enableMetrics();
  expect((await handleRecommendationRoutes(eventRequest({ ...impression, ...patch }), {})).status).toBe(400);
  expect(metric.updateOne).not.toHaveBeenCalled();
});
test.each(['draft', 'paused', 'missing', 'disabled-provider'])('unpublished product impression is rejected: %s', async status => {
  enableMetrics();
  if (status === 'missing') store.clear();
  else if (status === 'disabled-provider') settingsData.providers.coupang.enabled = false;
  else store.get('book-id').data.status = status;
  expect((await handleRecommendationRoutes(eventRequest(impression), {})).status).toBe(400);
  expect(metric.updateOne).not.toHaveBeenCalled();
});
test('event budget and byte limit stay enforced', async () => {
  enableMetrics();
  expect((await handleRecommendationRoutes(eventRequest({ ...impression, extra: '가'.repeat(400) }), {})).status).toBe(413);
  const { incrementRateLimit } = await import('../../worker/lib/rate-limit.js');
  incrementRateLimit.mockResolvedValueOnce({ count: 601 });
  expect((await handleRecommendationRoutes(eventRequest(impression), {})).status).toBe(429);
  expect(metric.updateOne).not.toHaveBeenCalled();
});
test('metrics group on server before transfer, exclude block impressions and retain all grouped rows', async () => {
  const counts = { impression: 20, click: 3, more: 0, filter: 0, dismiss: 0 };
  metric.aggregate.mockResolvedValue(Array.from({ length: 5001 }, (_, i) => ({ _id: { service: 'legacy-saju', placement: 'result', productId: 'book-' + i }, ...counts })));
  const response = await handleAdminRecommendationRoutes('/metrics', request('/metrics'), {});
  const data = await response.json();
  expect(data.metrics).toHaveLength(5001);
  expect(data.metrics[0]).toEqual({ service: 'legacy-saju', placement: 'result', productId: 'book-0', ...counts });
  expect(data).toMatchObject({ source: 'own_events', reportingWindowDays: 30, possiblyTruncated: false, reports: [] });
  const pipeline = metric.aggregate.mock.calls[0][0];
  expect(pipeline[0]).toEqual({ $match: { _id: { $gte: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) } } });
  expect(pipeline.some(stage => '$limit' in stage)).toBe(false);
  expect(pipeline[1].$group._id).toEqual({ service: '$service', placement: '$placement', productId: '$productId' });
  expect(pipeline[1].$group.impression).toEqual({ $sum: { $cond: [{ $and: [{ $eq: ['$event', 'impression'] }, { $ne: ['$productId', 'block'] }] }, '$count', 0] } });
  expect(pipeline[1].$group.click).toEqual({ $sum: { $cond: [{ $and: [{ $eq: ['$event', 'click'] }] }, '$count', 0] } });
  expect(metric.updateOne).not.toHaveBeenCalled();
});
