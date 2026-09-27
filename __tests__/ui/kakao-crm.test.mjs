import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { CRM_CAMPAIGNS, campaignUrl, estimateCampaign, isCrmSendTime, recipientExclusion, contribution } from '../../lib/marketing/kakao-crm.mjs';

test('all creatives fit verified Kakao wide-image text and single button limits, link only to public pages',()=>{
  for(const c of CRM_CAMPAIGNS){assert.ok(c.body.length<=76);assert.ok(c.button.length<=8);const url=new URL(campaignUrl(c.id));assert.equal(url.origin,'https://code-destiny.com');assert.equal(url.searchParams.get('utm_campaign'),c.id);assert.ok(!url.pathname.includes('result'));}
  assert.throws(()=>campaignUrl('https://evil.test'));
});
test('budget counts VAT and rejects missing, negative, fractional recipient and overflow inputs',()=>{
  assert.deepEqual(estimateCampaign({recipients:1000,unitCostKRW:20,vatRate:.1,budgetKRW:22000}),{expectedKRW:22000,withinBudget:true});
  assert.equal(estimateCampaign({recipients:1000,unitCostKRW:20,vatRate:.1,budgetKRW:21999}).withinBudget,false);
  for(const recipients of [0,-1,1.5,Infinity])assert.throws(()=>estimateCampaign({recipients,unitCostKRW:20,vatRate:.1,budgetKRW:22000}));
});
test('time window uses KST across UTC date boundaries',()=>{
  assert.equal(isCrmSendTime('2026-10-01T00:00:00Z'),true);
  assert.equal(isCrmSendTime('2026-09-30T23:59:59Z'),false);
  assert.equal(isCrmSendTime('2026-10-01T10:59:59Z'),true);
  assert.equal(isCrmSendTime('2026-10-01T11:00:00Z'),false);
  assert.equal(isCrmSendTime('broken'),false);
});
test('friend status never substitutes for advertising consent, and blocks/cooldowns exclude recipients',()=>{
  const now=Date.parse('2026-10-01T02:00:00Z');
  const eligible={consent:{granted:true},relationship:'friend',verifiedAt:new Date(now),addedAt:new Date(now-2*86400000)};
  assert.equal(recipientExclusion(eligible,now),null);
  for(const granted of [false,undefined])assert.equal(recipientExclusion({...eligible,consent:{granted}},now),'consent_missing');
  for(const relationship of ['blocked','unknown'])assert.equal(recipientExclusion({...eligible,relationship},now),'friend_unverified_or_blocked');
  assert.equal(recipientExclusion({...eligible,verifiedAt:new Date(now-2*86400000)},now),'relationship_stale');
  assert.equal(recipientExclusion({...eligible,addedAt:new Date(now)},now),'welcome_cooldown');
  assert.equal(recipientExclusion({...eligible,lastCampaignAt:new Date(now-86400000)},now),'frequency_cap');
});
test('unverified costs never become zero-cost profit',()=>{
  const costs={netRevenueKRW:10000,messageCostKRW:2200,couponCostKRW:0,pgCostKRW:300,llmCostKRW:500};
  assert.equal(contribution(costs),7000);
  for(const value of [null,undefined,NaN,-1])assert.equal(contribution({...costs,llmCostKRW:value}),null);
});
test('CRM attribution survives a same-tab login return only with analytics consent and never creates a send receipt',()=>{
  const source=readFileSync(new URL('../../js/core/analytics.js',import.meta.url),'utf8');
  const dom=new JSDOM('<!doctype html><head></head><body></body>',{url:'https://code-destiny.com/channel/?utm_source=kakao&utm_medium=channel&utm_campaign=yeoni-weekly&question=private',runScripts:'outside-only'});
  const w=dom.window;
  w.document.cookie='cd_cookie_consent=accepted; path=/';
  w.eval(source);w.cdTrack('channel_invite_view',{});
  assert.equal(w.dataLayer.at(-1)[2].crm_campaign,'yeoni-weekly');
  w.history.replaceState({},'', '/login/');w.cdTrack('begin_checkout',{});
  assert.equal(w.dataLayer.at(-1)[2].crm_campaign,'yeoni-weekly');
  w.document.cookie='cd_cookie_consent=rejected; path=/';w.cdTrack('begin_checkout',{});
  assert.equal(w.dataLayer.at(-1)[2].crm_campaign,undefined);
  assert.equal(w.dataLayer.some(row=>row[1]==='message_sent'),false);
  assert.equal(JSON.stringify(w.dataLayer).includes('private'),false);
  dom.window.close();
});
