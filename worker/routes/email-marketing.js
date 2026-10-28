import { requireAuth } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { User } from '../lib/models.js';
import { EmailMarketingPreference } from '../lib/email-marketing-models.js';
import { recordEmailMarketingConsent } from '../lib/email-marketing-consent.js';
import { verifyUnsubscribeToken } from '../lib/email-marketing-token.js';
import { escapeHtml, settingsUrlFor } from '../lib/email-marketing-template.js';
import { json, readJson, getRoutePath, handleRouteError, notFound, methodNotAllowed } from '../lib/http.js';
import { checkOrigin } from './kakao-crm.js';
import {
  EMAIL_MARKETING_CLIENT_SOURCES, EMAIL_MARKETING_CONSENT_TEXT, EMAIL_MARKETING_CONSENT_VERSION, isUsableMarketingEmail, maskMarketingEmail,
} from '../../lib/marketing/email-marketing.mjs';

function page(env, { title, message, form = '' }) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} - 꿀꿀 운세</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box;background:#f5f3fb;color:#1e1b4b}.card{background:#fff;padding:36px 28px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,.05);text-align:center;max-width:420px;width:100%}h1{font-size:22px;margin:0 0 12px}p{color:#4b5563;line-height:1.6;margin:0 0 24px}button{background:#6d4fd8;color:#fff;border:0;padding:13px 26px;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer}a{color:#6d4fd8}</style></head>
<body><main class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${form}<p style="margin:20px 0 0;font-size:14px"><a href="${escapeHtml(settingsUrlFor(env))}">알림 설정에서 확인하기</a></p></main></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' },
  });
}

const INVALID_LINK = { title: '링크를 확인할 수 없어요', message: '수신거부 링크가 올바르지 않거나 더 이상 사용할 수 없습니다. 로그인 후 알림 설정에서 광고 메일 수신을 해제할 수 있어요.' };

// GET 은 확인 화면만 보여 주고 아무것도 쓰지 않는다. 메일 보안 스캐너가 링크를 미리 열어도 수신이 꺼지지 않게 한다.
// POST 는 RFC 8058 one-click(메일 앱의 "구독 취소")과 확인 화면의 버튼 제출을 함께 받는다.
async function unsubscribe(request, env) {
  const token = new URL(request.url).searchParams.get('t') || '';
  const userId = await verifyUnsubscribeToken(env, token);
  if (request.method === 'GET') {
    if (!userId) return page(env, INVALID_LINK);
    const action = `/api/email-marketing/unsubscribe?t=${encodeURIComponent(token)}`;
    return page(env, { title: '광고 메일 수신거부', message: '꿀꿀 운세의 광고성 정보 이메일을 더 이상 받지 않으시겠어요? 결제 영수증 등 서비스 안내 메일은 계속 발송됩니다.', form: `<form method="post" action="${escapeHtml(action)}"><button type="submit">수신거부</button></form>` });
  }
  const body = (await request.text().catch(() => '')).slice(0, 2000);
  const oneClick = new URLSearchParams(body).get('List-Unsubscribe') === 'One-Click';
  if (!userId) return oneClick ? json({ error: 'invalid_token' }, { status: 400 }) : page(env, INVALID_LINK);
  await connectDb(env);
  await recordEmailMarketingConsent(env, userId, { granted: false, source: oneClick ? 'email_one_click' : 'email_unsubscribe' });
  if (oneClick) return new Response('', { status: 200 });
  return page(env, { title: '수신거부가 완료되었어요', message: '이제 꿀꿀 운세의 광고 메일을 보내지 않습니다. 처리 결과는 안내 메일로도 알려 드려요.' });
}

async function preferences(request, env) {
  if (request.method === 'POST') checkOrigin(request);
  const auth = await requireAuth(request, env);
  await connectDb(env);
  if (request.method === 'POST') {
    const body = await readJson(request);
    if (body.action === 'dismiss') {
      await withMongoRetry(env, () => EmailMarketingPreference.updateOne({ _id: auth.userId }, { $set: { dismissed: true }, $setOnInsert: { lastSentAt: new Date(0) } }, { upsert: true }));
    } else {
      if (typeof body.granted !== 'boolean' || body.version !== EMAIL_MARKETING_CONSENT_VERSION || !EMAIL_MARKETING_CLIENT_SOURCES.includes(body.source)) return json({ error: 'invalid_consent' }, { status: 400 });
      await recordEmailMarketingConsent(env, auth.userId, { granted: body.granted, source: body.source });
    }
  }
  const [preference, user] = await Promise.all([
    withMongoRetry(env, () => EmailMarketingPreference.findById(auth.userId).select('consent dismissed').lean()),
    withMongoRetry(env, () => User.findById(auth.userId).select('email').lean()),
  ]);
  const emailUsable = isUsableMarketingEmail(user?.email);
  return json({ preference, emailUsable, maskedEmail: emailUsable ? maskMarketingEmail(user.email) : '', consentVersion: EMAIL_MARKETING_CONSENT_VERSION, consentText: EMAIL_MARKETING_CONSENT_TEXT });
}

export async function handleEmailMarketingRoutes(request, env) {
  try {
    const path = getRoutePath(request, '/api/email-marketing');
    if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed();
    if (path === '/unsubscribe') return await unsubscribe(request, env);
    if (path === '/preferences') return await preferences(request, env);
    return notFound();
  } catch (error) { return handleRouteError(error); }
}
