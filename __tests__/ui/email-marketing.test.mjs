import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  EMAIL_CAMPAIGNS, EMAIL_MARKETING_CONSENT_TEXT, FREQUENCY_CAP_MS, emailCampaignUrl, emailMarketingExclusion,
  isEmailMarketingNoticeWindow, isEmailMarketingSendWindow, isUsableMarketingEmail, kstWeekKey, maskMarketingEmail, pickWeeklyCampaign,
} from '../../lib/marketing/email-marketing.mjs';

test('send window is Tuesday 10:00-12:00 KST across the UTC date boundary', () => {
  assert.equal(isEmailMarketingSendWindow('2026-10-13T01:00:00Z'), true);
  assert.equal(isEmailMarketingSendWindow('2026-10-13T02:59:59Z'), true);
  assert.equal(isEmailMarketingSendWindow('2026-10-13T00:59:59Z'), false);
  assert.equal(isEmailMarketingSendWindow('2026-10-13T03:00:00Z'), false);
  assert.equal(isEmailMarketingSendWindow('2026-10-14T01:00:00Z'), false);
  assert.equal(isEmailMarketingSendWindow('broken'), false);
  assert.equal(isEmailMarketingNoticeWindow('2026-10-13T00:00:00Z'), true);
  assert.equal(isEmailMarketingNoticeWindow('2026-10-13T11:00:00Z'), false);
  assert.equal(isEmailMarketingNoticeWindow('2026-10-12T23:59:59Z'), false);
});

test('week key is the KST Tuesday of the Monday-start week', () => {
  assert.equal(kstWeekKey('2026-10-13T01:00:00Z'), '2026-10-13');
  assert.equal(kstWeekKey('2026-10-11T15:00:00Z'), '2026-10-13'); // Monday 00:00 KST
  assert.equal(kstWeekKey('2026-10-11T14:59:59Z'), '2026-10-06'); // Sunday 23:59 KST
});

test('campaigns rotate weekly, skip the last one sent and exclude the holiday creative', () => {
  assert.ok(!EMAIL_CAMPAIGNS.some(c => c.id === 'autumn-pause'));
  const ids = ['2026-10-13', '2026-10-20', '2026-10-27'].map(w => pickWeeklyCampaign(w).id);
  assert.equal(new Set(ids).size, EMAIL_CAMPAIGNS.length);
  assert.equal(pickWeeklyCampaign('2026-11-03').id, ids[0]);
  assert.notEqual(pickWeeklyCampaign('2026-10-13', ids[0]).id, ids[0]);
  assert.throws(() => pickWeeklyCampaign('nope'));
  for (const c of EMAIL_CAMPAIGNS) assert.ok(existsSync(new URL(`../../public${c.image}`, import.meta.url)), c.image);
});

test('campaign URLs stay on the site and carry email attribution', () => {
  for (const c of EMAIL_CAMPAIGNS) {
    const url = new URL(emailCampaignUrl(c.id, '2026-10-13'));
    assert.equal(url.origin, 'https://code-destiny.com');
    assert.equal(url.searchParams.get('utm_source'), 'email');
    assert.equal(url.searchParams.get('utm_medium'), 'newsletter');
    assert.equal(url.searchParams.get('utm_campaign'), 'email-weekly-2026-10-13');
    assert.equal(url.searchParams.get('utm_content'), c.id);
  }
  assert.throws(() => emailCampaignUrl('https://evil.test', '2026-10-13'));
  assert.throws(() => emailCampaignUrl(EMAIL_CAMPAIGNS[0].id, '../x'));
});

test('placeholder and withdrawn addresses are never mailable', () => {
  assert.equal(isUsableMarketingEmail('user@gmail.com'), true);
  for (const email of ['kakao_1@social.code-destiny.local', 'withdrawn_1_2@withdrawn.local', 'a@b.invalid', 'nope', '', null]) assert.equal(isUsableMarketingEmail(email), false, String(email));
  assert.equal(maskMarketingEmail('abcdef@gmail.com'), 'ab****@gmail.com');
});

test('exclusion reasons cover consent, version, account state, minors and frequency', () => {
  const now = Date.parse('2026-10-13T01:00:00Z');
  const preference = { consent: { granted: true, version: 'email-marketing-2026-10-v1' }, lastSentAt: new Date(0) };
  const user = { email: 'user@gmail.com', status: 'active' };
  assert.equal(emailMarketingExclusion({ preference, user, now }), null);
  assert.equal(emailMarketingExclusion({ preference: { ...preference, consent: { granted: false } }, user, now }), 'consent_missing');
  assert.equal(emailMarketingExclusion({ preference: { ...preference, consent: { granted: true, version: 'old' } }, user, now }), 'consent_version_unknown');
  assert.equal(emailMarketingExclusion({ preference, user: null, now }), 'user_missing');
  assert.equal(emailMarketingExclusion({ preference, user: { ...user, status: 'withdrawn' }, now }), 'withdrawn');
  assert.equal(emailMarketingExclusion({ preference, user: { ...user, guardianConsent: { required: true } }, now }), 'minor');
  assert.equal(emailMarketingExclusion({ preference, user: { ...user, email: 'kakao_1@social.code-destiny.local' }, now }), 'email_unusable');
  assert.equal(emailMarketingExclusion({ preference: { ...preference, lastSentAt: new Date(now - FREQUENCY_CAP_MS + 1) }, user, now }), 'frequency_cap');
  assert.equal(emailMarketingExclusion({ preference: { ...preference, lastSentAt: new Date(now - FREQUENCY_CAP_MS) }, user, now }), null);
});

test('consent text states it is optional, weekly at most and revocable', () => {
  assert.match(EMAIL_MARKETING_CONSENT_TEXT, /^선택:/);
  assert.match(EMAIL_MARKETING_CONSENT_TEXT, /주 1회/);
  assert.match(EMAIL_MARKETING_CONSENT_TEXT, /철회/);
});
