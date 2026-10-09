import { BUSINESS_IDENTITY } from '../../lib/site-policy-config.js';
import { emailCampaignUrl } from '../../lib/marketing/email-marketing.mjs';

export const AD_SUBJECT_PREFIX = '(광고) ';

export function siteBaseUrl(env) {
  return String(env?.SITE_BASE_URL || env?.AUTH_FRONTEND_BASE_URL || 'https://code-destiny.com').replace(/\/+$/, '');
}
export function unsubscribeUrlFor(env, token) {
  return `${siteBaseUrl(env)}/api/email-marketing/unsubscribe?t=${encodeURIComponent(token)}`;
}
export function settingsUrlFor(env) {
  return `${siteBaseUrl(env)}/account/notifications/`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ preheader = '', content, footer }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3fb;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1e1b4b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3fb;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
${content}
<tr><td style="padding:20px 28px 28px;border-top:1px solid #ece8f6;font-size:12px;line-height:1.7;color:#6b7280;">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function businessFooter() {
  const b = BUSINESS_IDENTITY;
  return `${escapeHtml(b.companyName)} · 대표 ${escapeHtml(b.representative)} · 사업자등록번호 ${escapeHtml(b.registrationNumber)}<br>
${escapeHtml(b.address)}<br>
문의 ${escapeHtml(b.phone)} · <a href="mailto:${escapeHtml(b.email)}" style="color:#6b7280;">${escapeHtml(b.email)}</a>`;
}

/** 주간 광고 메일. 제목 "(광고)" 접두어·발신자 정보·수신거부 링크는 §50 필수라 빠지면 만들지 않는다. */
export function buildMarketingEmail({ env, campaign, weekKey, unsubscribeUrl }) {
  if (!campaign || !unsubscribeUrl) throw new Error('EMAIL_MARKETING_TEMPLATE_INPUT');
  const subject = `${AD_SUBJECT_PREFIX}${campaign.subject}`;
  if (!subject.startsWith(AD_SUBJECT_PREFIX)) throw new Error('AD_PREFIX_MISSING');
  const cta = emailCampaignUrl(campaign.id, weekKey);
  const image = `https://code-destiny.com${campaign.image}`;
  const [lead, ...rest] = String(campaign.body).split('\n');
  const content = `<tr><td><a href="${escapeHtml(cta)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(campaign.subject)}" width="560" style="display:block;width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:28px 28px 8px;">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;">${escapeHtml(campaign.subject)}</h1>
<p style="margin:0 0 8px;font-size:16px;line-height:1.7;font-weight:600;">${escapeHtml(lead)}</p>
${rest.map(line => `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(line)}</p>`).join('')}
</td></tr>
<tr><td align="center" style="padding:16px 28px 28px;"><a href="${escapeHtml(cta)}" style="display:inline-block;background:#6d4fd8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;">${escapeHtml(campaign.button)}</a></td></tr>`;
  const footer = `이 메일은 광고성 정보 수신에 동의하신 꿀꿀 운세 회원님께 발송되었습니다.<br>
더 받지 않으시려면 <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6d4fd8;font-weight:700;">수신거부</a>를 눌러 주세요. 수신 설정은 <a href="${escapeHtml(settingsUrlFor(env))}" style="color:#6b7280;">알림 설정</a>에서 바꿀 수 있습니다.<br><br>
${businessFooter()}`;
  const text = [campaign.subject, '', campaign.body, '', `${campaign.button}: ${cta}`, '', '광고성 정보 수신에 동의하신 회원님께 발송되었습니다.', `수신거부: ${unsubscribeUrl}`, '', `${BUSINESS_IDENTITY.companyName} · ${BUSINESS_IDENTITY.address} · ${BUSINESS_IDENTITY.phone}`].join('\n');
  return { subject, html: layout({ preheader: lead, content, footer }), text };
}

function formatKstDate(value) {
  const d = new Date(new Date(value).getTime() + 9 * 3600000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

function noticeEmail({ env, title, lines, subject }) {
  const content = `<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-size:19px;line-height:1.4;">${escapeHtml(title)}</h1>
${lines.map(line => `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(line)}</p>`).join('')}
<p style="margin:20px 0 0;"><a href="${escapeHtml(settingsUrlFor(env))}" style="color:#6d4fd8;font-weight:700;">알림 설정 바로가기</a></p>
</td></tr>`;
  const footer = `이 메일은 정보통신망법에 따라 광고성 정보 수신 동의 상태를 안내하는 메일로, 수신 동의 여부와 관계없이 발송됩니다.<br><br>${businessFooter()}`;
  return { subject, html: layout({ preheader: lines[0], content, footer }), text: [title, '', ...lines, '', `알림 설정: ${settingsUrlFor(env)}`].join('\n') };
}

/** §50⑦ 동의·철회 처리 결과 고지. 광고가 아니므로 (광고) 접두어를 붙이지 않는다. */
export function buildConsentResultNotice({ env, granted, at }) {
  const date = formatKstDate(at);
  return granted
    ? noticeEmail({ env, subject: '[꿀꿀 운세] 광고성 정보 이메일 수신에 동의하셨습니다', title: '광고성 정보 수신 동의 처리 결과 안내', lines: [
      `${date}에 꿀꿀 운세의 광고성 정보 이메일 수신에 동의하신 내용이 처리되었습니다.`,
      '전송자: 꿀꿀 운세(코드 데스티니) · 수신 동의 일자: ' + date + ' · 처리 내용: 수신 동의',
      '운세 콘텐츠, 상담 추천, 이벤트·혜택 소식을 주 1회 이내로 보내드립니다. 원하지 않으시면 메일 하단 수신거부나 알림 설정에서 언제든 철회할 수 있습니다.',
    ] })
    : noticeEmail({ env, subject: '[꿀꿀 운세] 광고성 정보 이메일 수신을 거부하셨습니다', title: '광고성 정보 수신 거부 처리 결과 안내', lines: [
      `${date}에 꿀꿀 운세의 광고성 정보 이메일 수신 거부(동의 철회)가 처리되었습니다.`,
      '전송자: 꿀꿀 운세(코드 데스티니) · 처리 일자: ' + date + ' · 처리 내용: 수신 거부',
      '이제 광고 메일은 보내지 않습니다. 결제 영수증 등 서비스 이용에 필요한 안내 메일은 계속 발송될 수 있습니다.',
    ] });
}

/** §50⑧ 2년마다 수신동의 여부 확인 안내. */
export function buildReconfirmNotice({ env, consentAt }) {
  const date = formatKstDate(consentAt);
  return noticeEmail({ env, subject: '[꿀꿀 운세] 광고성 정보 수신 동의 여부를 확인해 주세요', title: '광고성 정보 수신 동의 여부 확인 안내', lines: [
    `회원님은 ${date}에 꿀꿀 운세의 광고성 정보 이메일 수신에 동의하셨습니다.`,
    '정보통신망법에 따라 2년마다 수신 동의 여부를 안내드립니다. 계속 받으시려면 별도 조치가 필요하지 않습니다.',
    '더 이상 받지 않으시려면 아래 알림 설정에서 수신을 해제해 주세요.',
  ] });
}
