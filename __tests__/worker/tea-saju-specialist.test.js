/** @jest-environment node */
let u, specialist;
beforeAll(async()=>{
 ({__fortuneTeaHouseTestUtils:u}=await import('../../worker/routes/fortune-tea-house.js'));
 specialist=await import('../../worker/lib/tea-saju-specialist.js');
});
const base={consultationMode:'saju',question:'올해 일의 방향을 알고 싶어요',birthTimeUnknown:true};
test.each(['plain-cup','star-black-tea','gold-cinnamon','white-lotus-healing'])('%s keeps every chapter in six groups',cup=>{
 const request={...base,selectedTeaCupId:cup,sajuReportVersion:'saju-specialist-v1'};
 const legacy=u.getSajuRequiredSectionTitles({...request,sajuReportVersion:undefined});
 const titles=u.getSajuRequiredSectionTitles(request);
 expect(titles).toEqual([...legacy,...specialist.TEA_SAJU_SPECIALIST_SECTIONS]);
 const fallback=u.normalizeDraftResult({},request);
 expect(fallback.saju.deepSections.map(section=>section.title)).toEqual(titles);
 expect(u.getSajuRequiredSectionTitles(fallback)).toEqual(titles);
 const groups=u.buildTeaCheckpointGroups(request,fallback);
 expect(groups).toHaveLength(6);
 expect(groups.flatMap(g=>g.sectionTitles||[])).toEqual(titles);
 expect(groups.reduce((n,g)=>n+g.targetChars,0)).toBe(30000);
 expect(groups.reduce((n,g)=>n+g.minChars,0)).toBe(18000);
 const group=groups[3], sections=group.sectionTitles.map(title=>({title,body:'명식의 근거에서 생활 속 선택으로 연결합니다.'}));
 expect(u.pickTeaCheckpointFields({saju:{deepSections:sections}},group)).not.toBeNull();
 expect(u.pickTeaCheckpointFields({saju:{deepSections:sections.slice(1)}},group)).toBeNull();
 expect(u.pickTeaCheckpointFields({saju:{deepSections:sections.map(s=>({...s,body:''}))}},group)).toBeNull();
});
test('stored legacy and compatibility requests retain their original contracts',()=>{
 expect(u.normalizeDraftResult({sajuReportVersion:'saju-specialist-v1'},base).sajuReportVersion).toBeUndefined();
 for(const request of [base,{...base,consultationMode:'sajuCompatibility',sajuReportVersion:'saju-specialist-v1'}]){
  expect(specialist.isTeaSajuSpecialist(request)).toBe(false);
  expect(u.getSajuRequiredSectionTitles(request).some(t=>t.includes('건강과 생활 리듬'))).toBe(false);
  expect(u.buildTeaCheckpointGroups(request,u.normalizeDraftResult({},request)).some(g=>g.key.startsWith('specialist-'))).toBe(false);
 }
});
test('health prediction guard distinguishes reflection from specific medical predictions',()=>{
 for(const text of ['내년에 심장병에 걸릴 가능성이 높습니다.','수기가 부족하여 신장 기능이 약해집니다.','발병 시기는 확실합니다.'])
  expect(specialist.hasSajuHealthPrediction(text)).toBe(true);
 for(const text of ['수면과 휴식의 리듬을 기록해 보세요.','사주로 질병이나 발병 시기를 판단할 수 없습니다.'])
  expect(specialist.hasSajuHealthPrediction(text)).toBe(false);
 expect(specialist.TEA_SAJU_SPECIALIST_RULES.join(' ')).toMatch(/출생시간 미상/);
 expect(specialist.TEA_SAJU_SPECIALIST_RULES.join(' ')).toMatch(/가정하지 않는다/);
});
test('new price resolves through app, monthly stones and existing pass ceilings',async()=>{
 const {FEATURE_KEY_PRICE_TABLE,calculatePaidFeatureMembershipCreditCost}=await import('../../worker/lib/paid-feature-registry.js');
 const {resolveAppContentTier}=await import('../../worker/lib/app-store-pricing.js');
 const {canUseByPass}=await import('../../worker/lib/profile-limits.js');
 const {currentPassPlan}=await import('../../lib/payment/pass-policy.js');
 const key='fortune-tea-house-saju-joint-consultation', price=FEATURE_KEY_PRICE_TABLE[key];
 expect(price).toMatchObject({cost:150,amountKRW:15000});
 expect(resolveAppContentTier(price.cost)).toMatchObject({productId:'cd_content_tier_16',amountKRW:15000});
 expect(calculatePaidFeatureMembershipCreditCost(key)).toBe(calculatePaidFeatureMembershipCreditCost(key,150));
 expect(canUseByPass({...currentPassPlan('premium'),isActive:true},price.cost)).toBe(false);
 expect(canUseByPass({...currentPassPlan('vvip'),isActive:true},price.cost)).toBe(true);
});

test('joint v2 adds three distinct chapters without changing stored v1 checkpoints',()=>{
 const request={...base,sajuReportVersion:'saju-specialist-v2'};
 const oldTitles=u.getSajuRequiredSectionTitles({...base,sajuReportVersion:'saju-specialist-v1'});
 const titles=u.getSajuRequiredSectionTitles(request);
 expect(titles).toEqual([...oldTitles,...specialist.TEA_SAJU_JOINT_SECTIONS]);
 const result=u.normalizeDraftResult({},request);
 expect(result.sajuReportVersion).toBe('saju-specialist-v2');
 expect(result.saju.deepSections.map(s=>s.title)).toEqual(titles);
 const groups=u.buildTeaCheckpointGroups(request,result);
 expect(groups).toHaveLength(7);
 expect(groups.flatMap(g=>g.sectionTitles||[])).toEqual(titles);
 expect(groups.reduce((n,g)=>n+g.targetChars,0)).toBe(35000);
 expect(groups.find(g=>g.key==='specialist-joint').sectionTitles).toEqual(specialist.TEA_SAJU_JOINT_SECTIONS);
});

 test('tea prices and joint feature selection stay distinct', async()=>{
 const {FEATURE_KEY_PRICE_TABLE:p}=await import('../../worker/lib/paid-feature-registry.js');
 expect(p['fortune-tea-house-saju-consultation']).toMatchObject({cost:100,amountKRW:10000});
 expect(p['fortune-tea-house-tarot-consultation']).toMatchObject({cost:50,amountKRW:5000});
 expect(p['fortune-tea-house-tarot-five-consultation']).toMatchObject({cost:70,amountKRW:7000});
 const joint={...base,sajuReportVersion:'saju-specialist-v2'};
 expect(u.resolveFortuneTeaHouseFeatureKey({},base)).toBe('fortune-tea-house-saju-consultation');
 expect(u.resolveFortuneTeaHouseFeatureKey({},joint)).toBe('fortune-tea-house-saju-joint-consultation');
 expect(u.resolveFortuneTeaHouseFeatureKey({featureKey:'fortune-tea-house-saju-consultation'},joint)).toBe('');
 expect(u.resolveFortuneTeaHouseFeatureKey({featureKey:'fortune-tea-house-tarot-consultation'},{consultationMode:'tarot',tarotSpread:'five'})).toBe('');
 });
