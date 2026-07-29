"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PrivacyPolicyContent from "../privacy-policy/PrivacyPolicyContent";
import TermsContent from "../terms-of-service/TermsContent";
import { getApiBaseUrl } from "../_lib/api-config";
import {
  authFetch,
  isMobileAppRuntime,
  mobileAppAuthHeaders,
  persistMobileAppAccessToken,
  persistMobileAppRefreshToken,
  waitForAuthLogoutToSettle,
} from "../_lib/auth-client";
import { markAuthUserCacheVerified, persistSanitizedAuthUser } from "../_lib/auth-storage";
import { calculateKoreanAge, formatBirthDateDigits, MIN_SELF_CONSENT_AGE, normalizeBirthDateFromDigits, validateBirthDateWithAge } from "@/lib/birthDateInput";

const SIGNUP_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "signupPage.001": "필수 약관(개인정보처리방침, 이용약관, 만 14세 이상)에 모두 동의해야 회원가입을 진행할 수 있습니다.",
    "signupPage.002": "이름, 아이디(이메일), 비밀번호를 확인해 주세요.",
    "signupPage.003": "휴대폰 번호를 정확히 입력해 주세요. 예: 01012345678",
    "signupPage.004": "회원가입 처리 중 오류가 발생했습니다.",
    "signupPage.005": "회원가입 서버에 연결하지 못했습니다. 네트워크 상태 또는 API 배포 라우팅(/api) 설정을 확인해 주세요.",
    "signupPage.006": "이름",
    "signupPage.007": "8자 이상",
    "signupPage.008": "선택 안 함",
    "signupPage.009": "남성",
    "signupPage.010": "여성",
    "signupPage.011": "추천인 코드",
    "signupPage.012": "[필수] 개인정보처리방침 전문을 읽고 동의합니다.",
    "signupPage.013": "[필수] 이용약관 전문을 읽고 동의합니다.",
    "signupPage.014": "대한민국 법령에 따라 만 14세 미만은 가입할 수 없습니다.",
    "signupPage.015": "만 {age}세",
    "signupPage.016": "올바른 생년월일을 입력해주세요.",
    "signupPage.017": "미래 날짜는 입력할 수 없습니다.",
    "signupPage.018": "만 14세 미만은 대한민국 관련 법령에 따라 가입할 수 없습니다.",
    "signupPage.019": "[필수] 만 14세 이상이며 대한민국 관련 법령을 확인하였습니다.",
  },
} as const;

function signupPageText(key: keyof typeof SIGNUP_PAGE_TEXT_TRANSLATIONS.ko): string {
  return SIGNUP_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type SignupResult = {
  message?: string;
  code?: string;
  error?: string;
  nextPath?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  accessTokenExpiresInSec?: number;
  provider?: "google" | "naver" | "kakao";
  user?: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    birthDate: string;
    birthTime: string;
    gender: string;
    role: "user" | "admin";
    points?: number;
    joinedAt: string;
  };
};

type SocialProvider = "google" | "naver" | "kakao";
type ReferralCapture = {
  referralCode: string;
  referralShareToken: string;
  referralSource: string;
};

const REFERRAL_STORAGE_KEY = "cd_pending_referral_v1";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const LOCAL_AUTH_TIMEOUT_MS = 30000;

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function resolveNextPathFromQuery(params: URLSearchParams): string {
  return sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeKoreanPhoneNumber(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(digits)) return "";
  return digits;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = LOCAL_AUTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = {
    source: "signup",
    event,
    at: Date.now(),
  };
  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch {
    // ignore
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // ignore
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(rawText);

    if (looksLikeHtml) {
      throw new Error("서버가 JSON 대신 HTML을 반환했습니다. 배포/캐시 상태를 확인해 주세요.");
    }

    throw new Error("서버 응답 파싱 중 오류가 발생했습니다.");
  }
}

function normalizeSocialAuthError(rawReason: string | null): string {
  const reason = String(rawReason || "").trim().toLowerCase();
  if (!reason) return "소셜 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "oauth_service_unavailable") return "소셜 회원가입 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "response_is_html") return "인증 서버 응답이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  if (reason.includes("token_exchange_failed")) return "소셜 인증 토큰 교환에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "oauth_not_configured") return "소셜 로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.";
  if (reason === "invalid_callback" || reason === "provider_mismatch") return "소셜 인증 콜백이 유효하지 않습니다. 다시 시도해 주세요.";
  if (reason.startsWith("guardian_consent")) return "이 계정은 이용할 수 없습니다. admin@code-destiny.com 으로 문의해 주세요.";
  return "소셜 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function normalizeAuthApiError(payload: SignupResult & { errors?: string[] }, fallbackMessage: string): string {
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(" ");
  }

  const code = String(payload.code || payload.error || "").trim().toUpperCase();
  if (code === "EMAIL_ALREADY_REGISTERED" || code === "DUPLICATE_EMAIL") {
    return "이미 사용 중인 이메일이에요.";
  }
  if (code === "SOCIAL_ACCOUNT") {
    return "소셜 로그인으로 가입된 계정이에요. 구글/카카오/네이버로 로그인해 주세요.";
  }

  return payload.message || fallbackMessage;
}

function normalizeReferralCode(rawCode: string | null | undefined): string {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code || code.length < 6 || code.length > 24) return "";
  if (!/^[A-Z0-9_-]+$/.test(code)) return "";
  return code;
}

function normalizeReferralToken(rawToken: string | null | undefined): string {
  const token = String(rawToken || "").trim();
  if (!token || token.length < 24 || token.length > 1800) return "";
  return token;
}

function readStoredReferralCapture(): ReferralCapture {
  if (typeof window === "undefined") return { referralCode: "", referralShareToken: "", referralSource: "" };
  try {
    const parsed = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || "null") as Partial<ReferralCapture> | null;
    if (!parsed) return { referralCode: "", referralShareToken: "", referralSource: "" };
    return {
      referralCode: normalizeReferralCode(parsed.referralCode),
      referralShareToken: normalizeReferralToken(parsed.referralShareToken),
      referralSource: String(parsed.referralSource || "").trim().toLowerCase(),
    };
  } catch {
    return { referralCode: "", referralShareToken: "", referralSource: "" };
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function persistReferralCapture(capture: ReferralCapture) {
  if (typeof window === "undefined" || !capture.referralCode) return;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
      ...capture,
      capturedAt: new Date().toISOString(),
    }));
  } catch {}
  try {
    document.cookie = `cd_ref=${encodeURIComponent(capture.referralCode)}; path=/; max-age=2592000; samesite=lax`;
  } catch {}
}

function resolveReferralCapture(params: URLSearchParams): ReferralCapture {
  const fromUrl = {
    referralCode: normalizeReferralCode(params.get("ref") || params.get("referralCode")),
    referralShareToken: normalizeReferralToken(params.get("rs") || params.get("referralShareToken")),
    referralSource: String(params.get("via") || params.get("referralSource") || "").trim().toLowerCase(),
  };
  const stored = readStoredReferralCapture();
  return {
    referralCode: fromUrl.referralCode || stored.referralCode,
    referralShareToken: fromUrl.referralShareToken || stored.referralShareToken,
    referralSource: fromUrl.referralSource || stored.referralSource,
  };
}

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("1990-01-01");
  const [birthTime, setBirthTime] = useState("09:00");
  const [gender, setGender] = useState<"M" | "F" | "OTHER">("OTHER");
  const [referralCode, setReferralCode] = useState("");
  const [referralShareToken, setReferralShareToken] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [error, setError] = useState<string>("");
  const [birthDateError, setBirthDateError] = useState<string>("");
  const [birthDateAge, setBirthDateAge] = useState<number>(-1);
  // 소셜 인증은 끝났지만 아직 계정이 없는 상태. 생년월일을 받아야 계정을 만들 수 있다.
  const [socialSignupTicket, setSocialSignupTicket] = useState("");
  const socialCompleteOnceRef = useRef(false);
  const authCommittedRef = useRef(false);
  const bootstrapAuthCheckControllerRef = useRef<AbortController | null>(null);

  const authApiBase = useMemo(() => getApiBaseUrl(), []);

  const socialCompleteEndpoint = `${authApiBase}/api/auth/oauth/complete`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const capture = resolveReferralCapture(params);
    if (!capture.referralCode) return;
    setReferralCode(capture.referralCode);
    setReferralShareToken(capture.referralShareToken);
    setReferralSource(capture.referralSource || "kakao_reward");
    persistReferralCapture({
      referralCode: capture.referralCode,
      referralShareToken: capture.referralShareToken,
      referralSource: capture.referralSource || "kakao_reward",
    });
  }, []);

  const abortBootstrapAuthCheck = useCallback(() => {
    const activeController = bootstrapAuthCheckControllerRef.current;
    if (activeController) {
      activeController.abort();
      bootstrapAuthCheckControllerRef.current = null;
    }
  }, []);

  const persistAuth = (user?: SignupResult["user"], accessToken?: string, refreshToken?: string) => {
    if (user || accessToken) {
      authCommittedRef.current = true;
    }
    // 웹은 쿠키가 정본이라 레거시 토큰을 지운다. 앱은 SameSite=Lax 쿠키가 https://localhost
    // 출처로 오지 않아 이 토큰이 유일한 자격증명이므로, 지우는 대신 저장한다(로그인 경로와 동일).
    if (isMobileAppRuntime() && accessToken) {
      persistMobileAppAccessToken(accessToken);
      persistMobileAppRefreshToken(refreshToken || "");
    } else {
      try {
        localStorage.removeItem("fortune_auth_token");
      } catch {
        // ignore storage failures
      }
    }
    if (user) {
      const safeUser = persistSanitizedAuthUser(user);
      const role = String((safeUser && safeUser.role) || user.role || "user");
      document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
      markAuthUserCacheVerified(safeUser || user);
      publishAuthSync("login");
    }
  };

  const redirectAfterAuth = useCallback((nextPath: string, user?: SignupResult["user"]) => {
    if (user?.role === "admin" && nextPath === "/") {
      router.replace("/admin");
      return;
    }

    if (nextPath === "/" || nextPath === "/index.html") {
      window.location.replace("/");
      return;
    }

    router.replace(nextPath);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // 소셜 가입 마무리(social_signup)는 아직 계정이 없는 상태라 /me 부트스트랩이 필요 없다.
    if (params.get("social_grant") || params.get("social_error") || params.get("social_signup")) return;

    const controller = new AbortController();
    bootstrapAuthCheckControllerRef.current = controller;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    (async () => {
      await waitForAuthLogoutToSettle();
      if (cancelled) return null;
      // authFetch 경유로 in-flight /api/auth/me 중복 제거(AuthWidget 호출과 공유).
      const response = await authFetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      }, { apiBase: authApiBase });
        if (!response.ok) return null;
        return parseJsonResponse<SignupResult>(response);
    })()
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.user) return;
        persistAuth(payload.user, payload.accessToken);
        const nextPath = resolveNextPathFromQuery(params);
        setIsRedirecting(true);
        timer = setTimeout(() => redirectAfterAuth(nextPath, payload.user), 400);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Ignore bootstrap auth-check failures to avoid signup-page redirect loops.
      });

    return () => {
      cancelled = true;
      if (bootstrapAuthCheckControllerRef.current === controller) {
        bootstrapAuthCheckControllerRef.current = null;
      }
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [authApiBase, redirectAfterAuth]);

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("social_signup");
    if (ticket) setSocialSignupTicket(ticket);
  }, []);

  useEffect(() => {
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) return;

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError(normalizeSocialAuthError(socialError));
      return;
    }

    if (!socialGrant) return;

    abortBootstrapAuthCheck();
    socialCompleteOnceRef.current = true;
    setLoading(true);

    (async () => {
      await waitForAuthLogoutToSettle();

      let response: Response | null = null;
      let lastFetchError: Error | null = null;

      // socialGrant는 1회용이라 재시도하면 서버에서 중복 refresh 세션이 생성될 수 있다.
      // 이 경로는 보조 경로이며(주 경로는 /auth/{provider}/callback), 1회만 교환한다.
      try {
        response = await fetchWithTimeout(socialCompleteEndpoint, {
          method: "POST",
          // 앱은 이 헤더가 있어야 서버가 리프레시 토큰을 본문으로 내려준다(로그인·등록과 동일).
          headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({ socialGrant }),
        });
      } catch (err) {
        lastFetchError = isAbortError(err)
          ? new Error("소셜 회원가입 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.")
          : err instanceof Error ? err : new Error("네트워크 오류가 발생했습니다.");
      }

      if (!response) {
        throw (lastFetchError || new Error("소셜 회원가입 처리 중 오류가 발생했습니다."));
      }

      return response;
    })()
      .then(async (response) => {
        const payload = await parseJsonResponse<SignupResult & { errors?: string[] }>(response);

        if (!response.ok) {
          throw new Error(normalizeAuthApiError(payload, "소셜 회원가입 처리에 실패했습니다."));
        }

        persistAuth(payload.user, payload.accessToken, payload.refreshToken);

        const nextFromQuery = resolveNextPathFromQuery(params);
        const nextPath = sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/";

        redirectAfterAuth(nextPath, payload.user);
      })
      .catch((e: Error) => {
        setError(e.message || "소셜 회원가입 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [abortBootstrapAuthCheck, redirectAfterAuth, socialCompleteEndpoint]);

  const hasRequiredConsents = agreePrivacy && agreeTerms && agreeAge;

  const handleBirthDateChange = useCallback((value: string) => {
    const normalized = normalizeBirthDateFromDigits(value);
    setBirthDate(normalized);

    if (!normalized) {
      setBirthDateError("");
      setBirthDateAge(-1);
      return;
    }

    const validation = validateBirthDateWithAge(normalized);
    if (!validation.isValid) {
      setBirthDateError(validation.error || "");
      setBirthDateAge(validation.age);
    } else {
      setBirthDateError("");
      setBirthDateAge(validation.age);
    }
  }, []);

  // 만 14세 미만은 가입 불가. 생년월일을 넣는 순간 검증이 실패하므로 birthDateError 가 채워진다.
  const isUnder14 = birthDateAge >= 0 && birthDateAge < MIN_SELF_CONSENT_AGE;
  const canSubmit = hasRequiredConsents && !isUnder14 && !birthDateError && birthDateAge >= MIN_SELF_CONSENT_AGE;

  // 소셜 인증을 마친 뒤 생년월일만 받아 계정을 만드는 경로.
  // 나이를 알기 전에는 서버가 계정을 만들지 않기 때문에 이 단계가 필요하다.
  const handleSocialSignupCompletion = async () => {
    if (!hasRequiredConsents) {
      setError(signupPageText("signupPage.001"));
      return;
    }
    if (isUnder14) {
      setError(signupPageText("signupPage.018"));
      return;
    }
    if (birthDateError || birthDateAge < 0) {
      setError(signupPageText("signupPage.016"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${authApiBase}/api/auth/oauth/complete-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({
          socialSignupTicket,
          birthDate,
          birthTime,
          gender,
        }),
      });

      const payload = await parseJsonResponse<SignupResult & {
        errors?: string[];
        appRedirectUrl?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(normalizeAuthApiError(payload, "소셜 회원가입 처리에 실패했습니다."));
      }

      persistAuth(payload.user, payload.accessToken, payload.refreshToken);

      // 앱(Capacitor)에서 시작한 가입은 커스텀탭에서 끝나므로 딥링크로 앱에 돌려준다.
      if (payload.appRedirectUrl) {
        window.location.href = payload.appRedirectUrl;
        return;
      }

      const nextFromQuery = resolveNextPathFromQuery(new URLSearchParams(window.location.search));
      redirectAfterAuth(sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/", payload.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : signupPageText("signupPage.004");
      setError(message === "Failed to fetch" ? signupPageText("signupPage.005") : message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || socialLoading !== null) return;

    abortBootstrapAuthCheck();

    if (socialSignupTicket) {
      await handleSocialSignupCompletion();
      return;
    }

    if (!hasRequiredConsents) {
      setError(signupPageText("signupPage.001"));
      return;
    }

    if (!name.trim() || !loginId.trim() || password.length < 8) {
      setError(signupPageText("signupPage.002"));
      return;
    }

    const normalizedPhoneNumber = normalizeKoreanPhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      setError(signupPageText("signupPage.003"));
      return;
    }

    if (isUnder14) {
      setError(signupPageText("signupPage.018"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const nextPath = resolveNextPathFromQuery(params);
      const referralCapture = {
        referralCode: normalizeReferralCode(referralCode),
        referralShareToken: normalizeReferralToken(referralShareToken),
        referralSource: referralSource || "kakao_reward",
      };
      if (referralCapture.referralCode) persistReferralCapture(referralCapture);

      let response: Response | null = null;
      let lastFetchError: Error | null = null;

      await waitForAuthLogoutToSettle();

      // "성공 후 응답 유실 → 재시도"는 EMAIL_ALREADY_REGISTERED 유령 오류를 만들 수 있어
      // 자동 재시도 없이 1회만 요청한다.
      try {
        response = await fetchWithTimeout(`${authApiBase}/api/auth/register`, {
          method: "POST",
          // 앱은 이 헤더가 있어야 서버가 리프레시 토큰을 JSON 본문으로 함께 내려준다
          // (쿠키는 SameSite=Lax 라 앱 출처로 오지 않는다). 웹에서는 빈 객체다.
          headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            email: loginId.trim(),
            phoneNumber: normalizedPhoneNumber,
            password,
            birthDate,
            birthTime,
            gender,
            nextPath,
            referralCode: referralCapture.referralCode,
            referralShareToken: referralCapture.referralShareToken,
            referralSource: referralCapture.referralSource,
          }),
        });
      } catch (error) {
        lastFetchError = isAbortError(error)
          ? new Error("회원가입 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.")
          : error instanceof Error ? error : new Error("네트워크 오류가 발생했습니다.");
      }

      if (!response) {
        throw (lastFetchError || new Error("회원가입 처리 중 오류가 발생했습니다."));
      }

      const payload = await parseJsonResponse<SignupResult & { errors?: string[] }>(response);
      if (!response.ok) {
        throw new Error(normalizeAuthApiError(payload, "회원가입에 실패했습니다."));
      }

      persistAuth(payload.user, payload.accessToken, payload.refreshToken);
      const resolvedNextPath = sanitizeNextPath(payload.nextPath || null) || nextPath;

      redirectAfterAuth(resolvedNextPath, payload.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : signupPageText("signupPage.004");
      if (message === "Failed to fetch") {
        setError(signupPageText("signupPage.005"));
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startSocialSignup = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;

    abortBootstrapAuthCheck();

    // 소셜 인증 후 가입 마무리 단계에서 생년월일을 받으므로, 여기서 나이로 막지 않는다.
    if (!hasRequiredConsents) {
      setError(signupPageText("signupPage.001"));
      return;
    }

    setError("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = resolveNextPathFromQuery(params);
    const referralCapture = {
      referralCode: normalizeReferralCode(referralCode),
      referralShareToken: normalizeReferralToken(referralShareToken),
      referralSource: referralSource || "kakao_reward",
    };
    if (referralCapture.referralCode) persistReferralCapture(referralCapture);
    const startParams = new URLSearchParams({
      flow: "signup",
      next: nextPath,
    });
    if (referralCapture.referralCode) startParams.set("referralCode", referralCapture.referralCode);
    if (referralCapture.referralShareToken) startParams.set("referralShareToken", referralCapture.referralShareToken);
    if (referralCapture.referralSource) startParams.set("referralSource", referralCapture.referralSource);

    // 앱(Capacitor)에서는 절대 URL 로 이동하면 외부 Chrome 으로 튕겨 나가 앱에 돌아오지 못한다
    // (LoginClient 의 같은 분기 주석 참고). 네이티브 브릿지의 커스텀탭 + 딥링크 복귀를 쓴다.
    // 리퍼럴 파라미터를 그대로 넘겨야 카카오 추천 가입 보상이 지급된다.
    const native = (window as unknown as {
      CodeDestinyNative?: {
        openAuth?: (input: {
          provider: string;
          nextPath?: string;
          flow?: string;
          extraParams?: Record<string, string>;
        }) => Promise<{ ok?: boolean; message?: string }>;
      };
    }).CodeDestinyNative;
    if (typeof native?.openAuth === "function") {
      const extraParams: Record<string, string> = {};
      if (referralCapture.referralCode) extraParams.referralCode = referralCapture.referralCode;
      if (referralCapture.referralShareToken) extraParams.referralShareToken = referralCapture.referralShareToken;
      if (referralCapture.referralSource) extraParams.referralSource = referralCapture.referralSource;
      void native.openAuth({ provider, nextPath, flow: "signup", extraParams }).then((result) => {
        if (result && result.ok === false) {
          setError(result.message || "회원가입 창을 열지 못했습니다.");
          setSocialLoading(null);
        }
      }).catch(() => {
        setError("회원가입 창을 열지 못했습니다.");
        setSocialLoading(null);
      });
      return;
    }

    const startUrl = `${authApiBase}/api/auth/oauth/${provider}/start?${startParams.toString()}`;
    window.location.href = startUrl;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#3b0764] px-4 py-10 text-slate-100">
      {(loading || isRedirecting) && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%)" }}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:60px_60px] opacity-35" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
              <div className="absolute inset-[5px] rounded-full border-t-2 border-fuchsia-400/70 animate-spin" style={{ animationDuration: "1.4s", animationDirection: "reverse" }} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl text-violet-300 animate-pulse">✦</div>
            </div>
            <div className="text-center">
              <p className="text-base font-bold tracking-wide text-white">{isRedirecting ? "별빛 여정으로 이동 중..." : "별빛 회원가입 포털을 열고 있습니다"}</p>
              <p className="mt-1 text-sm text-violet-200/60">잠시만 기다려 주세요...</p>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.20)_1px,transparent_1px)] [background-size:64px_64px] opacity-40 animate-twinkle" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(168,85,247,0.32),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(147,51,234,0.22),transparent_33%)]" />

      <div className="relative mx-auto w-full max-w-xl opacity-0 animate-fade-in-up">
        <div className="rounded-3xl bg-gradient-to-br from-violet-300/35 via-fuchsia-300/10 to-slate-200/35 p-[1px] shadow-violet-neon">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl [color-scheme:dark] sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                TWILIGHT SIGN UP
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">신비로운 별빛 회원가입</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                아이디(이메일)/비밀번호 회원가입 또는 소셜 회원가입을 선택할 수 있습니다.
              </p>
              <p className="mt-3 text-sm text-violet-100/75">
                이미 계정이 있다면{" "}
                <Link href="/login" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                  로그인
                </Link>
                으로 이동하세요.
              </p>

              <div className="mt-4 inline-flex rounded-full border border-violet-200/25 bg-slate-950/30 p-1">
                <Link
                  href="/login"
                  className="min-h-0 min-w-0 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-200/85 transition hover:text-violet-100"
                >
                  로그인
                </Link>
                <span className="min-h-0 min-w-0 rounded-full bg-violet-400/20 px-3 py-1.5 text-xs font-semibold text-violet-100">
                  회원가입
                </span>
              </div>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <form className="mb-6 space-y-4" onSubmit={handleLocalSignup}>
              {socialSignupTicket && (
                <div className="rounded-xl border border-violet-200/25 bg-violet-400/10 px-4 py-3 text-sm leading-6 text-violet-50/90">
                  소셜 인증이 확인되었습니다. 마지막으로 <strong>생년월일</strong>을 입력하면 가입이 완료됩니다. 만 {MIN_SELF_CONSENT_AGE}세 미만은 가입할 수 없습니다.
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!socialSignupTicket && (
                <>
                <div className="sm:col-span-2">
                  <label htmlFor="signup-name" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">NAME</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    placeholder={signupPageText("signupPage.006")}
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="signup-id" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">ID / EMAIL</label>
                  <input
                    id="signup-id"
                    type="email"
                    autoComplete="email"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    placeholder="name@example.com"
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="signup-phone-number" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PHONE</label>
                  <input
                    id="signup-phone-number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    placeholder="01012345678"
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="mt-1.5 text-[11px] text-violet-100/65">단건 결제창 호출에 필요한 구매자 휴대폰 번호입니다.</p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="signup-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PASSWORD</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading || socialLoading !== null}
                      placeholder={signupPageText("signupPage.007")}
                      className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 pr-14 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={loading || socialLoading !== null}
                      className="absolute right-2 top-1/2 h-8 min-h-0 min-w-0 -translate-y-1/2 rounded-md border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-100 hover:bg-violet-400/20 disabled:opacity-60"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      {showPassword ? "숨김" : "보기"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-violet-100/65">비밀번호는 8자 이상으로 설정해 주세요.</p>
                </div>
                </>
                )}

                <div>
                  <label htmlFor="signup-birth-date" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">BIRTH DATE</label>
                  <input
                    id="signup-birth-date"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="YYYYMMDD"
                    value={formatBirthDateDigits(birthDate)}
                    onChange={(event) => handleBirthDateChange(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    className={`h-12 w-full rounded-xl border bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      birthDateError
                        ? "border-rose-400/50 focus:border-rose-400/60 focus:ring-rose-400/30"
                        : birthDateAge >= 14
                          ? "border-emerald-400/40 focus:border-emerald-400/60 focus:ring-emerald-400/30"
                          : "border-violet-200/25 focus:border-violet-300/60 focus:ring-violet-300/30"
                    }`}
                  />
                  {birthDateAge >= 0 && !birthDateError && (
                    <p className="mt-1 text-[11px] text-emerald-200/80">
                      {signupPageText("signupPage.015").replace("{age}", String(birthDateAge))}
                    </p>
                  )}
                  {birthDateError && (
                    <p className="mt-1 text-[11px] text-rose-200/85">{birthDateError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-violet-100/65">
                    {signupPageText("signupPage.014")}
                  </p>
                </div>

                <div>
                  <label htmlFor="signup-birth-time" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">BIRTH TIME</label>
                  <input
                    id="signup-birth-time"
                    type="time"
                    value={birthTime}
                    onChange={(event) => setBirthTime(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 [color-scheme:dark] outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="signup-gender" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">GENDER</label>
                  <select
                    id="signup-gender"
                    value={gender}
                    onChange={(event) => setGender(event.target.value as "M" | "F" | "OTHER")}
                    disabled={loading || socialLoading !== null}
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 [color-scheme:dark] outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="OTHER">{signupPageText("signupPage.008")}</option>
                    <option value="M">{signupPageText("signupPage.009")}</option>
                    <option value="F">{signupPageText("signupPage.010")}</option>
                  </select>
                </div>

                {/* 소셜 가입 마무리 단계에서는 추천인 코드가 이미 티켓에 담겨 넘어온다. */}
                {!socialSignupTicket && (
                <div className="sm:col-span-2 rounded-xl border border-amber-200/25 bg-amber-100/10 p-3">
                  <label htmlFor="signup-referral-code" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-amber-100/85">REFERRAL CODE</label>
                  <input
                    id="signup-referral-code"
                    type="text"
                    autoComplete="off"
                    value={referralCode}
                    onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24))}
                    disabled={loading || socialLoading !== null}
                    placeholder={signupPageText("signupPage.011")}
                    className="h-12 w-full rounded-xl border border-amber-100/30 bg-slate-950/55 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-amber-50 outline-none transition placeholder:tracking-normal placeholder:text-amber-100/38 focus:border-amber-200/70 focus:ring-2 focus:ring-amber-200/25 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="mt-2 text-[11px] leading-5 text-amber-50/78">
                    보상은 프로필 저장 하단의 카카오 공유하기 이벤트 버튼으로 만든 링크를 통해 가입이 완료될 때만 지급됩니다. 친구 1명당 추천인에게 1,000원 상당 보너스, 하루 최대 5,000원 상당 보너스까지 적용됩니다.
                  </p>
                </div>
                )}
              </div>

              {isUnder14 ? (
                <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
                  {signupPageText("signupPage.018")}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || socialLoading !== null || !canSubmit}
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200/30 bg-gradient-to-r from-violet-500/80 via-fuchsia-500/70 to-indigo-500/75 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "회원가입 중..."
                    : socialSignupTicket
                      ? "회원가입 완료하기"
                      : "아이디/비밀번호로 회원가입"}
                </button>
              )}
            </form>

            <div className={`my-5 flex items-center gap-3${socialSignupTicket ? " hidden" : ""}`}>
              <div className="h-px flex-1 bg-violet-100/20" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/60">SOCIAL SIGN UP</span>
              <div className="h-px flex-1 bg-violet-100/20" />
            </div>

            <section className="lc-space mb-5" aria-label="회원가입 필수 동의">
              <div className="lc-head">
                <p className="lc-kicker">MANDATORY LEGAL CONSENT</p>
                <h2 className="lc-title">회원가입 전 정책 전문 확인</h2>
                <p className="lc-desc">아래 본문을 확인한 뒤 필수 동의 항목을 체크해야 소셜 회원가입이 활성화됩니다.</p>
              </div>

              {/* 개인정보처리방침 */}
              <article className="lc-card" aria-label="개인정보처리방침 전문">
                <div className="lc-card-head">
                  <span className="lc-card-badge">01</span>
                  <strong className="lc-card-label">개인정보처리방침 <em>Privacy Policy</em></strong>
                  <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="lc-card-ext" aria-label="새 탭에서 개인정보처리방침 열기">
                    ↗
                  </Link>
                </div>
                <div className="lc-scroll-area" role="region" aria-label="개인정보처리방침 본문" tabIndex={0}>
                  <PrivacyPolicyContent />
                </div>
                <label className={`lc-check-row${agreePrivacy ? " lc-check-row--on" : ""}`} htmlFor="agree-privacy-policy">
                  <span className="lc-checkbox" aria-hidden="true">
                    {agreePrivacy && (
                      <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="lc-checkmark">
                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    id="agree-privacy-policy"
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="sr-only"
                  />
                  <span>{signupPageText("signupPage.012")}</span>
                </label>
              </article>

              {/* 이용약관 */}
              <article className="lc-card" aria-label="이용약관 전문">
                <div className="lc-card-head">
                  <span className="lc-card-badge">02</span>
                  <strong className="lc-card-label">이용약관 <em>Terms of Service</em></strong>
                  <Link href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="lc-card-ext" aria-label="새 탭에서 이용약관 열기">
                    ↗
                  </Link>
                </div>
                <div className="lc-scroll-area" role="region" aria-label="이용약관 본문" tabIndex={0}>
                  <TermsContent />
                </div>
                <label className={`lc-check-row${agreeTerms ? " lc-check-row--on" : ""}`} htmlFor="agree-terms-of-service">
                  <span className="lc-checkbox" aria-hidden="true">
                    {agreeTerms && (
                      <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="lc-checkmark">
                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    id="agree-terms-of-service"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <span>{signupPageText("signupPage.013")}</span>
                </label>
              </article>

              {/* 만 14세 이상 확인 */}
              <article className="lc-card" aria-label="만 14세 이상 확인 동의">
                <div className="lc-card-head">
                  <span className="lc-card-badge">03</span>
                  <strong className="lc-card-label">만 14세 이상 확인 <em>Age Requirement (14+)</em></strong>
                </div>
                <div className="px-4 py-3 text-xs leading-relaxed text-violet-100/80">
                  대한민국 개인정보 보호법 제22조의2에 따라 만 14세 미만 아동의 개인정보를 처리하려면 법정대리인(보호자)의 동의가 필요합니다. 생년월일이 만 14세 미만이면 보호자 이메일로 동의 링크가 발송되고, 보호자가 동의를 완료해야 계정을 이용할 수 있습니다. 만 14세 미만 계정은 유료 결제를 이용할 수 없습니다.
                </div>
                <label className={`lc-check-row${agreeAge ? " lc-check-row--on" : ""}`} htmlFor="agree-age-requirement">
                  <span className="lc-checkbox" aria-hidden="true">
                    {agreeAge && (
                      <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="lc-checkmark">
                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    id="agree-age-requirement"
                    type="checkbox"
                    checked={agreeAge}
                    onChange={(e) => setAgreeAge(e.target.checked)}
                    className="sr-only"
                  />
                  <span>{signupPageText("signupPage.019")}</span>
                </label>
              </article>

              <p className="lc-state" role="status" aria-live="polite">
                {isUnder14 ? (
                  <><span className="lc-state-dot" style={{ backgroundColor: "#f43f5e" }} />생년월일 입력 결과 만 14세 미만으로 가입이 불가합니다.</>
                ) : hasRequiredConsents ? (
                  <><span className="lc-state-dot lc-state-dot--ok" />필수 동의가 완료되었습니다. 이제 회원가입을 진행할 수 있습니다.</>
                ) : (
                  <><span className="lc-state-dot" />필수 동의 3건을 모두 체크하면 소셜 회원가입 버튼이 활성화됩니다.</>
                )}
              </p>
            </section>

            {socialSignupTicket || isUnder14 ? (
              isUnder14 ? (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
                  {signupPageText("signupPage.018")}
                </div>
              ) : null
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => startSocialSignup("google")}
                  disabled={loading || socialLoading !== null || !hasRequiredConsents}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                  {socialLoading === "google" ? "Google 인증으로 이동 중..." : "Google로 회원가입"}
                </button>

                <button
                  type="button"
                  onClick={() => startSocialSignup("naver")}
                  disabled={loading || socialLoading !== null || !hasRequiredConsents}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                  {socialLoading === "naver" ? "네이버 인증으로 이동 중..." : "네이버로 회원가입"}
                </button>

                <button
                  type="button"
                  onClick={() => startSocialSignup("kakao")}
                  disabled={loading || socialLoading !== null || !hasRequiredConsents}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                  {socialLoading === "kakao" ? "카카오 인증으로 이동 중..." : "카카오로 회원가입"}
                </button>
              </div>
            )}

            <footer className="mt-5 text-center text-xs text-violet-100/75">
              로그인에서도 아이디/비밀번호 또는 소셜 계정을 사용할 수 있습니다. {" "}
              <Link href="/login" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                로그인
              </Link>
            </footer>
          </section>
        </div>
      </div>

      <style jsx>{`
        /* ── Legal Consent Shell ── */
        .lc-space {
          border: 1px solid rgba(167, 139, 250, 0.35);
          border-radius: 1.1rem;
          padding: 1rem;
          background:
            radial-gradient(circle at 10% 15%, rgba(167, 139, 250, 0.18), transparent 42%),
            radial-gradient(circle at 88% 12%, rgba(56, 189, 248, 0.12), transparent 40%),
            linear-gradient(150deg, rgba(15, 23, 42, 0.65), rgba(49, 46, 129, 0.42));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 14px 40px rgba(15, 23, 42, 0.38);
          backdrop-filter: blur(10px);
        }

        /* ── Header ── */
        .lc-head { margin-bottom: 0.85rem; }
        .lc-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(196, 181, 253, 0.85);
          margin-bottom: 0.3rem;
        }
        .lc-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.96);
          line-height: 1.35;
        }
        .lc-desc {
          margin-top: 0.25rem;
          font-size: 11.5px;
          line-height: 1.55;
          color: rgba(224, 231, 255, 0.78);
        }

        /* ── Card ── */
        .lc-card {
          margin-bottom: 0.65rem;
          border-radius: 0.85rem;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.72), rgba(15, 23, 42, 0.58));
          overflow: hidden;
        }

        .lc-card-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.7rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          background: linear-gradient(90deg, rgba(91, 33, 182, 0.32), rgba(30, 64, 175, 0.28));
        }
        .lc-card-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(167, 139, 250, 0.5);
          font-size: 9px;
          font-weight: 800;
          color: rgba(196, 181, 253, 0.9);
          flex-shrink: 0;
        }
        .lc-card-label {
          flex: 1;
          font-size: 11.5px;
          font-weight: 700;
          color: rgba(233, 213, 255, 0.95);
        }
        .lc-card-label em {
          font-style: normal;
          font-weight: 400;
          color: rgba(196, 181, 253, 0.7);
          margin-left: 4px;
        }
        .lc-card-ext {
          font-size: 12px;
          color: rgba(167, 139, 250, 0.7);
          text-decoration: none;
          transition: color 0.2s;
          padding: 2px 4px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .lc-card-ext:hover {
          color: rgba(196, 181, 253, 1);
          background: rgba(167, 139, 250, 0.12);
        }

        /* ── Scrollable Content ── */
        .lc-scroll-area {
          height: 200px;
          overflow-y: auto;
          padding: 12px 14px;
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.4) transparent;
        }
        .lc-scroll-area::-webkit-scrollbar { width: 4px; }
        .lc-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .lc-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.35);
          border-radius: 4px;
        }
        .lc-scroll-area:focus-visible {
          outline: 2px solid rgba(167, 139, 250, 0.5);
          outline-offset: -2px;
        }

        /* ── Policy Embed Styles ──
           문서 스케일 기본값은 styles/globals.css의 .policy-embed-* 가 정본이다.
           여기서는 좁은 동의 스크롤 영역(200px)에 맞춘 축소값만 .lc-scroll-area로 스코프해
           덮어쓴다 — 전역으로 새어나가면 /privacy·/terms 본문까지 11.5px로 줄어든다. */
        :global(.lc-scroll-area .policy-embed-body) {
          max-width: none;
          font-size: 11.5px;
          line-height: 1.72;
          color: rgba(226, 232, 240, 0.9);
        }
        :global(.lc-scroll-area .policy-embed-date) {
          font-size: 10.5px;
          color: rgba(148, 163, 184, 0.8);
          margin-bottom: 10px;
        }
        :global(.lc-scroll-area .policy-embed-section) {
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }
        :global(.lc-scroll-area .policy-embed-section:last-child) {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        :global(.lc-scroll-area .policy-embed-heading) {
          font-size: 11px;
          font-weight: 700;
          color: rgba(196, 181, 253, 0.9);
          margin-bottom: 5px;
          letter-spacing: 0.01em;
        }
        :global(.lc-scroll-area .policy-embed-body p) {
          margin-bottom: 5px;
        }
        :global(.lc-scroll-area .policy-embed-body p:last-child) {
          margin-bottom: 0;
        }

        /* ── Custom Checkbox Row ── */
        .lc-check-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.6rem 0.7rem 0.65rem;
          font-size: 11.5px;
          color: rgba(203, 213, 225, 0.88);
          line-height: 1.45;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
          border-top: 1px solid rgba(148, 163, 184, 0.15);
        }
        .lc-check-row:hover {
          background: rgba(139, 92, 246, 0.07);
        }
        .lc-check-row--on {
          color: rgba(233, 213, 255, 0.98);
        }
        .lc-checkbox {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid rgba(139, 92, 246, 0.55);
          background: rgba(2, 6, 23, 0.5);
          flex-shrink: 0;
          transition: border-color 0.2s, background 0.2s;
        }
        .lc-check-row--on .lc-checkbox {
          border-color: rgba(167, 139, 250, 0.9);
          background: rgba(109, 40, 217, 0.55);
        }
        .lc-checkmark {
          width: 11px;
          height: 9px;
          color: #e9d5ff;
        }

        /* ── State Bar ── */
        .lc-state {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-top: 0.6rem;
          border-radius: 0.65rem;
          border: 1px solid rgba(165, 180, 252, 0.28);
          background: rgba(67, 56, 202, 0.18);
          padding: 0.5rem 0.65rem;
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(238, 242, 255, 0.92);
        }
        .lc-state-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(148, 163, 184, 0.45);
          flex-shrink: 0;
        }
        .lc-state-dot--ok {
          background: rgba(74, 222, 128, 0.85);
          box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
        }
      `}</style>
    </main>
  );
}
