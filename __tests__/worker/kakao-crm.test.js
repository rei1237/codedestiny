/** @jest-environment node */
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:jest.fn(),withMongoRetry:jest.fn((_env,fn)=>fn())}));
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:jest.fn(async()=>({userId:'user-1'}))}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({User:{findById:jest.fn(()=>({select:()=>({lean:async()=>({socialAccounts:{kakao:{id:'123'}}})})}))}}));
jest.unstable_mockModule('../../worker/lib/kakao-crm-models.js',()=>({
  CrmPreference:{updateOne:jest.fn(async()=>({matchedCount:1})),findById:jest.fn(()=>({select:()=>({lean:async()=>null})}))},
  CrmRelationship:{updateOne:jest.fn(async()=>({matchedCount:1})),findById:jest.fn(()=>({lean:async()=>null}))},
  CrmCampaign:{findById:jest.fn(),updateOne:jest.fn(async()=>({modifiedCount:1,matchedCount:1})),create:jest.fn()},
}));
let handleKakaoCrmRoutes, handleAdminKakaoCrmRoutes, CrmPreference, CrmRelationship, CrmCampaign, CRM_CONSENT_VERSION, CRM_CONSENT_TEXT;
beforeAll(async()=>{
  ({handleKakaoCrmRoutes}=await import('../../worker/routes/kakao-crm.js'));
  ({handleAdminKakaoCrmRoutes}=await import('../../worker/routes/admin-kakao-crm.js'));
  ({CrmPreference,CrmRelationship,CrmCampaign}=await import('../../worker/lib/kakao-crm-models.js'));
  ({CRM_CONSENT_VERSION,CRM_CONSENT_TEXT}=await import('../../lib/marketing/kakao-crm.mjs'));
});
const request=(path,body,headers={})=>new Request(`https://code-destiny.com/api/kakao-crm/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://code-destiny.com',...headers},body:JSON.stringify(body)});
beforeEach(()=>jest.clearAllMocks());
test('explicit opt-out saves server time, exact version/text and separate audit entry',async()=>{
  const r=await handleKakaoCrmRoutes(request('preferences',{granted:false,version:CRM_CONSENT_VERSION,source:'preferences'}),{});
  expect(r.status).toBe(200);
  const update=CrmPreference.updateOne.mock.calls[0][1];
  expect(update.$set.consent).toEqual(expect.objectContaining({granted:false,text:CRM_CONSENT_TEXT,version:CRM_CONSENT_VERSION,at:expect.any(Date)}));
  expect(update.$push.history).toEqual(update.$set.consent);
  expect(CrmRelationship.updateOne).not.toHaveBeenCalled();
});
test('a channel click/dismiss does not grant consent or friend state',async()=>{
  await handleKakaoCrmRoutes(request('preferences',{action:'dismiss'}),{});
  expect(CrmPreference.updateOne.mock.calls[0][1]).toEqual({$set:{dismissed:true}});
  expect(CrmRelationship.updateOne).not.toHaveBeenCalled();
});
test('foreign origin and stale consent wording are rejected',async()=>{
  expect((await handleKakaoCrmRoutes(request('preferences',{granted:true,version:CRM_CONSENT_VERSION,source:'preferences'},{Origin:'https://evil.test'}),{})).status).toBe(403);
  expect((await handleKakaoCrmRoutes(request('preferences',{granted:true,version:'old',source:'preferences'}),{})).status).toBe(400);
  expect(CrmPreference.updateOne).not.toHaveBeenCalled();
});
test('webhook requires configured key and matching channel, does not guess open_id identity',async()=>{
  const body={event:'blocked',id:'123',id_type:'app_user_id',channel_public_id:'_GgxaGX',updated_at:new Date().toISOString()};
  expect((await handleKakaoCrmRoutes(request('webhook',body),{})).status).toBe(401);
  const headers={Authorization:'KakaoAK mock-key','X-Kakao-Resource-ID':'event-1'};
  const env={KAKAO_CHANNEL_ADMIN_KEY:'mock-key'};
  expect((await handleKakaoCrmRoutes(request('webhook',{...body,channel_public_id:'other'},headers),env)).status).toBe(400);
  await handleKakaoCrmRoutes(request('webhook',{...body,id_type:'open_id'},headers),env);
  expect(CrmRelationship.updateOne).not.toHaveBeenCalled();
  await handleKakaoCrmRoutes(request('webhook',body,headers),env);
  const [filter,update]=CrmRelationship.updateOne.mock.calls[1];
  expect(filter.$or[0].relationshipAt.$lte).toEqual(new Date(body.updated_at));
  expect(update.$set.relationship).toBe('blocked');
  expect(CrmPreference.updateOne).not.toHaveBeenCalled();
});
test('unapproved relation API stays closed and makes no external request',async()=>{
  const fetchSpy=jest.spyOn(global,'fetch');
  const r=await handleKakaoCrmRoutes(request('refresh',{}),{});
  expect(r.status).toBe(503);expect(fetchSpy).not.toHaveBeenCalled();fetchSpy.mockRestore();
});
test('approved relation lookup follows the official admin-key request contract',async()=>{
  const fetchSpy=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({channels:[]})));
  try {
    const r=await handleKakaoCrmRoutes(request('refresh',{}),{KAKAO_CHANNEL_RELATION_ENABLED:'true',KAKAO_CHANNEL_ADMIN_KEY:'mock-key'});
    expect(r.status).toBe(200);
    const [url,options]=fetchSpy.mock.calls[0];
    expect(url.origin+url.pathname).toBe('https://kapi.kakao.com/v2/api/talk/channels');
    expect(url.searchParams.get('target_id')).toBe('123');
    expect(url.searchParams.get('channel_ids')).toBe('_GgxaGX');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded;charset=utf-8');
    expect((await r.json()).relationship).toBe('unknown');
  } finally { fetchSpy.mockRestore(); }
});
test('campaign review rejects paid campaigns without delivery proof',async()=>{
  CrmCampaign.findById.mockReturnValue({lean:async()=>({_id:'test-1',status:'draft',creativeId:'yeongnyangi-ask'})});
  const r=await handleAdminKakaoCrmRoutes('/review',request('unused',{id:'test-1',audienceChecked:true,previewChecked:true,walletChecked:true}),{},{});
  expect(r.status).toBe(409);expect(CrmCampaign.updateOne).not.toHaveBeenCalled();
});
test('duplicate campaign IDs fail safely rather than creating a second job',async()=>{
  CrmCampaign.create.mockRejectedValueOnce(Object.assign(new Error('duplicate'),{code:11000}));
  const future=new Date(Date.now()+86400000);future.setUTCHours(3,0,0,0);
  const r=await handleAdminKakaoCrmRoutes('/draft',request('unused',{id:'test-1',creativeId:'yeoni-weekly',recipients:10,unitCostKRW:20,vatRate:.1,budgetKRW:220,scheduledAt:future.toISOString(),audienceEvidence:'mock group reviewed no personal data'}),{},{});
  expect(r.status).toBe(409);
});

