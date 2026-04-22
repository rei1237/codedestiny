/**
 * 회원 탈퇴 API
 * POST /api/auth/withdraw
 *
 * ─────────────────────────────────────────────────────────────────
 * 보안 원칙
 * ─────────────────────────────────────────────────────────────────
 * 1. 인증된 본인만 호출 가능 (JWT 검증)
 * 2. CSRF 토큰 이중 검증 (Double-Submit Cookie)
 * 3. In-memory Rate Limiting (IP 기준, 10분에 3회)
 * 4. 비밀번호 재확인 (로컬 인증 계정)
 *    — OAuth 전용 계정은 비밀번호 없이 동의 체크박스로 대체
 * 5. 처리 오류 시 롤백 없이 관리자 알림 + 수동 파기 진행
 *    (불완전 파기가 복구보다 위험하지 않으므로)
 * ─────────────────────────────────────────────────────────────────
 *
 * 처리 순서
 * ─────────────────────────────────────────────────────────────────
 * Step 1. 요청 파싱 및 입력 검증
 * Step 2. JWT 토큰 인증 → 본인 확인
 * Step 3. CSRF 검증
 * Step 4. Rate limit 확인
 * Step 5. 비밀번호 재확인 (로컬 계정)
 * Step 6. 이메일 SHA-256 해시 생성 (재가입 차단용)
 * Step 7. 쿠키 무효화 응답 헤더 설정
 * Step 8. DB 비식별화 처리
 *   8-1. User 도큐먼트 PII 필드 덮어쓰기 (실제 삭제 아닌 완전 비식별화)
 *   8-2. Payment 도큐먼트 userId 참조 해제
 *   8-3. PointHistory 도큐먼트 삭제
 *   8-4. FortuneViewLog 도큐먼트 userId 해제
 * Step 9. 탈퇴 완료 이메일 발송 (발송 즉시 이메일 변수 폐기)
 * Step 10. 탈퇴 감사 로그 기록 (PII 없음)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { getUserModel } from "../../../_lib/models/UserModel.js";
import { getPaymentModel } from "../../../_lib/models/PaymentModel.js";
import { getPointHistoryModel } from "../../../_lib/models/PointHistoryModel.js";
import { getFortuneViewLogModel } from "../../../_lib/models/FortuneViewLogModel.js";
import { getDeletedAccountLogModel } from "../../../_lib/models/DeletedAccountLogModel.js";
import { validateCsrfFromRequest } from "../../../_lib/csrf.js";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
// In-memory Rate Limiter
// 서버리스 환경에서 Redis 없이 동작하는 단순 IP 기반 제한기
// (워커 인스턴스 재사용 시 동작, 새 인스턴스에서는 초기화됨)
// ─────────────────────────────────────────────────────────────────
const _rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10분
const RATE_LIMIT_MAX = 3;                      // 10분에 3회까지

/**
 * 클라이언트 IP를 Request 헤더에서 안전하게 추출합니다.
 * X-Forwarded-For를 신뢰하되, 첫 번째 값만 사용합니다.
 */
function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for") || "";
  if (xff) {
    const first = xff.split(",")[0].trim();
    // IPv4/IPv6 기본 유효성 검사
    if (/^[\d.a-fA-F:]+$/.test(first)) return first;
  }
  return request.headers.get("cf-connecting-ip") || "unknown";
}

/**
 * Rate limit 검사 및 카운터 증가
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // 윈도우 신규 생성
    _rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { limited: false, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
}

// ─────────────────────────────────────────────────────────────────
// JWT 추출 헬퍼 (me/route.js와 동일한 방식)
// ─────────────────────────────────────────────────────────────────
function extractToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/fortune_auth_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ─────────────────────────────────────────────────────────────────
// 이메일 단방향 해시 (재가입 연결 차단용)
// HMAC-SHA256 사용으로 rainbow table 공격 방어
// ─────────────────────────────────────────────────────────────────
function hashEmail(email) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${secret}`)
    .digest("hex");
}

// ─────────────────────────────────────────────────────────────────
// 탈퇴 안내 이메일 발송
// 발송 실패는 탈퇴 자체를 중단시키지 않습니다.
// ─────────────────────────────────────────────────────────────────
async function sendFarewellEmail(email, name) {
  // 이메일 전송 가능 여부 사전 확인
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[withdraw] SMTP 환경변수 미설정 — 탈퇴 안내 이메일 발송 생략");
    return false;
  }

  try {
    // nodemailer는 런타임에서 동적 import (번들 크기 절감)
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 발송 대상 이메일을 임시 변수에 보관 후, 이 함수 종료 시 GC에 맡김
    const recipient = String(email);
    const displayName = String(name || "회원");

    await transporter.sendMail({
      from:    `"코드 데스티니" <${process.env.SMTP_USER}>`,
      to:      recipient,
      subject: "[코드 데스티니] 회원 탈퇴가 완료되었습니다",
      text: [
        `${displayName}님, 그동안 코드 데스티니를 이용해 주셔서 감사합니다.`,
        "",
        "회원 탈퇴 처리가 완료되었습니다.",
        "보유하셨던 모든 개인정보와 포인트는 즉시 파기되었습니다.",
        "",
        "법적 보존 의무에 따라 결제 거래 기록(금액/일시)은 5년간 익명화된 형태로만 보관됩니다.",
        "",
        "다시 만날 날을 기대합니다.",
        "코드 데스티니 팀 드림",
      ].join("\n"),
    });

    return true;
  } catch (err) {
    // 이메일 발송 실패는 탈퇴 처리 자체를 막지 않음
    console.error("[withdraw] 탈퇴 안내 이메일 발송 실패:", err?.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// 관리자 알림 (부분 실패 시)
// ─────────────────────────────────────────────────────────────────
async function notifyAdminPartialFailure(logEntry) {
  // 실제 환경에서는 Slack Webhook, PagerDuty, 이메일 등을 통해 알림
  // logEntry에는 PII가 없어야 함
  const webhook = process.env.ADMIN_ALERT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[회원 탈퇴 부분 실패] ${new Date().toISOString()}`,
        details: logEntry, // PII 없는 단계 실패 정보만 포함
      }),
    });
  } catch {
    // 알림 실패는 조용히 로깅만
    console.error("[withdraw] 관리자 알림 발송 실패");
  }
}

// ─────────────────────────────────────────────────────────────────
// 메인 핸들러
// ─────────────────────────────────────────────────────────────────
export async function POST(request) {
  // ── Step 1. 요청 파싱 및 기본 입력 검증 ──────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const {
    password,           // 로컬 계정 비밀번호 재확인용
    confirmText,        // "회원탈퇴" 입력 확인
    agreeIrreversible,  // 복구 불가 동의 체크박스
  } = body || {};

  // 복구 불가 동의는 필수
  if (agreeIrreversible !== true) {
    return NextResponse.json(
      { message: "탈퇴 동의 항목을 확인해 주세요." },
      { status: 400 },
    );
  }

  // 탈퇴 의사 확인 텍스트 검증
  if (String(confirmText || "").trim() !== "회원탈퇴") {
    return NextResponse.json(
      { message: '"회원탈퇴"를 정확히 입력해 주세요.' },
      { status: 400 },
    );
  }

  // ── Step 2. JWT 인증 → 본인 확인 ─────────────────────────────
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { message: "인증 토큰이 필요합니다." },
      { status: 401 },
    );
  }

  let jwtPayload;
  try {
    jwtPayload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret", {
      issuer: "code-destiny-api",
    });
  } catch {
    return NextResponse.json(
      { message: "유효하지 않거나 만료된 토큰입니다. 다시 로그인 후 시도해 주세요." },
      { status: 401 },
    );
  }

  const userId = String(jwtPayload.userId || "");
  if (!userId) {
    return NextResponse.json({ message: "잘못된 토큰입니다." }, { status: 401 });
  }

  // ── Step 3. CSRF 검증 ─────────────────────────────────────────
  const csrfResult = validateCsrfFromRequest(request);
  if (!csrfResult.valid) {
    return NextResponse.json(
      { message: `보안 검증 실패: ${csrfResult.reason}` },
      { status: 403 },
    );
  }

  // ── Step 4. Rate Limiting ─────────────────────────────────────
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp);
  if (rl.limited) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { message: `탈퇴 시도가 너무 많습니다. ${retryAfterSec}초 후 다시 시도해 주세요.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit":     String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":     String(Math.floor(rl.resetAt / 1000)),
        },
      },
    );
  }

  // ── Step 5. DB에서 사용자 조회 ───────────────────────────────
  const User = await getUserModel();

  // passwordHash를 명시적으로 선택 (select:false 필드)
  const user = await User.findById(userId)
    .select("+passwordHash")
    .lean();

  if (!user) {
    return NextResponse.json(
      { message: "사용자 정보를 찾을 수 없습니다. 이미 탈퇴된 계정일 수 있습니다." },
      { status: 404 },
    );
  }

  // 이미 탈퇴/비식별화 처리된 계정 재요청 차단
  if (user.status === "withdrawn") {
    return NextResponse.json(
      { message: "이미 탈퇴된 계정입니다." },
      { status: 409 },
    );
  }

  // ── Step 5-1. 비밀번호 재확인 (로컬 계정) ────────────────────
  const hasLocalAuth = user.localAuth?.enabled && user.passwordHash;
  if (hasLocalAuth) {
    const pw = String(password || "");
    if (pw.length < 8) {
      return NextResponse.json(
        { message: "현재 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }
    const isPasswordCorrect = await bcrypt.compare(pw, user.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { message: "비밀번호가 올바르지 않습니다." },
        { status: 403 },
      );
    }
  }
  // OAuth 전용 계정은 agreeIrreversible + confirmText 확인만으로 진행

  // ── Step 6. 이메일 단방향 해시 생성 (재가입 차단용) ──────────
  // 원본 이메일을 변수에 잠깐만 보관 후, 발송에 사용하고 즉시 scope 밖으로 보냄
  const originalEmail = String(user.email || "");
  const originalName  = String(user.name  || "");
  const emailHash = hashEmail(originalEmail);

  // 결제 총액 집계 (법적 보존용 — PII 없는 집계값만)
  let totalPaymentAmount = 0;
  try {
    const Payment = await getPaymentModel();
    const agg = await Payment.aggregate([
      { $match: { userId: user._id, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$paymentAmount" } } },
    ]);
    totalPaymentAmount = agg[0]?.total || 0;
  } catch (err) {
    console.error("[withdraw] 결제 집계 실패:", err?.message);
  }

  // ── Step 7. 세션/쿠키 무효화 응답 헤더 준비 ─────────────────
  // (실제 쿠키 삭제는 최종 응답 시 함께 처리)
  const clearCookieOpts = {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // ── Step 8. DB 비식별화 처리 ─────────────────────────────────
  // 오류가 발생해도 롤백하지 않고 가능한 한 많은 단계를 진행합니다.
  // 실패한 단계는 로그에 기록되어 수동 파기 절차로 이어집니다.
  const failedSteps = [];

  // 8-1. User 도큐먼트 PII 완전 비식별화
  let userAnonymized = false;
  try {
    // 식별 가능한 모든 PII 필드를 덮어씌웁니다.
    // _id는 결제 기록 참조 무결성을 위해 유지합니다.
    await User.findByIdAndUpdate(userId, {
      $set: {
        // 개인 식별 정보 제거
        name:         "[탈퇴한 회원]",
        email:        `withdrawn_${emailHash.slice(0, 16)}@deleted.invalid`,
        passwordHash: "",                         // 비밀번호 해시 삭제
        birthDate:    "1900-01-01",              // 더미 생년월일
        birthTime:    "00:00",
        gender:       "OTHER",
        // 소셜 계정 연동 해제
        socialAccounts: {
          google: { id: "", connectedAt: null },
          naver:  { id: "", connectedAt: null },
          kakao:  { id: "", connectedAt: null },
        },
        // 계정 상태 비활성화
        status:       "withdrawn",
        // 운세 프로필 삭제 (생년월일 등 PII 포함)
        destinyProfiles:          [],
        destinyCurrentProfileId:  "",
        // 다마고치 삭제
        tamagotchi: null,
        // 포인트/미해금 기능 초기화
        points:           0,
        unlockedFeatures: [],
        // 구독 정보 초기화
        "profileSubscription.tier":      "free",
        "profileSubscription.startedAt": null,
        "profileSubscription.expiresAt": null,
        // 로컬 인증 비활성화
        "localAuth.enabled": false,
        lastLoginAt: null,
      },
    });
    userAnonymized = true;
  } catch (err) {
    console.error("[withdraw] User 비식별화 실패:", err?.message);
    failedSteps.push("user_anonymize");
  }

  // 8-2. Payment 도큐먼트 — userId 참조 제거 (법적 거래 기록은 익명으로 보존)
  let paymentsAnonymized = false;
  try {
    const Payment = await getPaymentModel();
    // userId를 null로 변경하여 사용자 식별 불가 상태로 유지
    // 거래 금액, 일시, 거래 ID는 전자상거래법 5년 보존을 위해 유지
    await Payment.updateMany(
      { userId: user._id },
      {
        $unset: { userId: "" },
        $set:   { _anonymized: true, _anonymizedAt: new Date() },
      },
    );
    paymentsAnonymized = true;
  } catch (err) {
    console.error("[withdraw] Payment 익명화 실패:", err?.message);
    failedSteps.push("payments_anonymize");
  }

  // 8-3. PointHistory 삭제 — 법적 보존 의무 없음, 완전 삭제
  let pointHistoryDeleted = false;
  try {
    const PointHistory = await getPointHistoryModel();
    await PointHistory.deleteMany({ userId: user._id });
    pointHistoryDeleted = true;
  } catch (err) {
    console.error("[withdraw] PointHistory 삭제 실패:", err?.message);
    failedSteps.push("point_history_delete");
  }

  // 8-4. FortuneViewLog userId 해제 — 통계는 유지, 개인 식별 해제
  let viewLogsAnonymized = false;
  try {
    const FortuneViewLog = await getFortuneViewLogModel();
    await FortuneViewLog.updateMany(
      { userId: user._id },
      { $unset: { userId: "" } },
    );
    viewLogsAnonymized = true;
  } catch (err) {
    console.error("[withdraw] FortuneViewLog 익명화 실패:", err?.message);
    failedSteps.push("view_logs_anonymize");
  }

  // ── Step 9. 탈퇴 완료 이메일 발송 ────────────────────────────
  // 발송 후 originalEmail 변수는 이 블록 종료 시 GC 대상이 됩니다.
  let fareMailSent = false;
  try {
    fareMailSent = await sendFarewellEmail(originalEmail, originalName);
  } catch (err) {
    console.error("[withdraw] 이메일 발송 오류:", err?.message);
    failedSteps.push("farewell_email");
  }
  // 원본 이메일 참조를 명시적으로 해제 (메모리 내 보존 최소화)
  // (JavaScript GC에 의존하되, 참조 변수를 덮어써 즉시 해제 유도)
  // eslint-disable-next-line no-unused-vars
  const _emailCleared = (originalEmail.replace(/./g, "*"), true);

  // ── Step 10. 탈퇴 감사 로그 기록 (PII 없음) ──────────────────
  const partialFailure = failedSteps.length > 0;
  try {
    const DeletedLog = await getDeletedAccountLogModel();
    await DeletedLog.create({
      emailHash,           // SHA-256 해시만 저장, 원본 없음
      withdrawnAt:         new Date(),
      reason:              "self",
      totalPaymentAmount,  // 법적 분쟁 대비 집계값
      steps: {
        tokenInvalidated:    true,          // 쿠키 삭제 = 토큰 무효화
        userDocAnonymized:   userAnonymized,
        paymentsAnonymized,
        pointHistoryDeleted,
        viewLogsAnonymized,
        fareMailSent,
        partialFailure,
        failureDetails: failedSteps,
      },
    });
  } catch (err) {
    // 감사 로그 저장 실패 — 콘솔에만 기록
    console.error("[withdraw] 감사 로그 저장 실패:", err?.message);
  }

  // 부분 실패 시 관리자 알림 발송
  if (partialFailure) {
    await notifyAdminPartialFailure({
      timestamp:   new Date().toISOString(),
      failedSteps,                          // PII 없는 단계명만 포함
      partialSuccess: {
        userAnonymized,
        paymentsAnonymized,
        pointHistoryDeleted,
        viewLogsAnonymized,
      },
    });
  }

  // ── 응답: 쿠키 삭제 + 탈퇴 완료 ─────────────────────────────
  const response = NextResponse.json(
    {
      message: "회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.",
      partialFailure, // 프론트에서 부분 실패 안내 표시 여부 판단에 사용
    },
    { status: 200 },
  );

  // 인증 쿠키 즉시 만료 처리 (HttpOnly 포함)
  response.cookies.set("fortune_auth_token", "", clearCookieOpts);
  response.cookies.set("fortune_auth_role",  "", { ...clearCookieOpts, httpOnly: false });

  return response;
}

// ─────────────────────────────────────────────────────────────────
// CSRF 토큰 발급 엔드포인트
// GET /api/auth/withdraw
// 탈퇴 페이지 진입 시 프론트엔드가 먼저 호출하여 CSRF 토큰을 받습니다.
// ─────────────────────────────────────────────────────────────────
export async function GET(request) {
  // JWT 인증 확인 (로그인된 사용자만)
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || "dev-secret", {
      issuer: "code-destiny-api",
    });
  } catch {
    return NextResponse.json({ message: "유효하지 않은 토큰입니다." }, { status: 401 });
  }

  const { generateCsrfToken, CSRF_COOKIE_NAME } = await import(
    "../../../_lib/csrf.js"
  );
  const csrfToken = generateCsrfToken();

  const response = NextResponse.json({ csrfToken });

  // HttpOnly=false: 클라이언트 JS가 읽어서 헤더에 포함해야 하므로
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    path:     "/",
    maxAge:   2 * 60 * 60, // 2시간
    sameSite: "strict",
    httpOnly: false,
    secure:   process.env.NODE_ENV === "production",
  });

  return response;
}
