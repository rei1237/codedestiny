"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PrivacyPolicyContent from "../privacy-policy/PrivacyPolicyContent";
import TermsContent from "../terms-of-service/TermsContent";
import { getApiBaseUrl } from "../_lib/api-config";
import { persistSanitizedAuthUser } from "../_lib/auth-storage";

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
  tokenType?: string;
  accessTokenExpiresInSec?: number;
  provider?: "google" | "naver" | "kakao";
  user?: {
    id: string;
    name: string;
    email: string;
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
const LOCAL_AUTH_TIMEOUT_MS = 20000;

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
  } catch (e) {
    // ignore
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {
    // ignore
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch (e) {
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
  return "소셜 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function normalizeAuthApiError(payload: SignupResult & { errors?: string[] }, fallbackMessage: string): string {
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(" ");
  }

  const code = String(payload.code || payload.error || "").trim().toUpperCase();
  if (code === "EMAIL_ALREADY_REGISTERED" || code === "DUPLICATE_EMAIL") {
    return "이미 가입된 이메일입니다. 로그인 페이지에서 로그인해 주세요.";
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
  } catch (e) {
    return { referralCode: "", referralShareToken: "", referralSource: "" };
  }
}

function persistReferralCapture(capture: ReferralCapture) {
  if (typeof window === "undefined" || !capture.referralCode) return;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
      ...capture,
      capturedAt: new Date().toISOString(),
    }));
  } catch (e) {}
  try {
    document.cookie = `cd_ref=${encodeURIComponent(capture.referralCode)}; path=/; max-age=2592000; samesite=lax`;
  } catch (e) {}
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
  const [error, setError] = useState<string>("");
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

  const persistAuth = (user?: SignupResult["user"], accessToken?: string) => {
    if (user || accessToken) {
      authCommittedRef.current = true;
    }
    if (accessToken) {
      try {
        localStorage.setItem("fortune_auth_token", String(accessToken));
      } catch (e) {
        // ignore storage failures
      }
    }
    if (user) {
      const safeUser = persistSanitizedAuthUser(user);
      const role = String((safeUser && safeUser.role) || user.role || "user");
      document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
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
    if (params.get("social_grant") || params.get("social_error")) return;

    const controller = new AbortController();
    bootstrapAuthCheckControllerRef.current = controller;
    let timer: ReturnType<typeof setTimeout> | null = null;

    fetch(`${authApiBase}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return parseJsonResponse<SignupResult>(response);
      })
      .then((payload) => {
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
      if (bootstrapAuthCheckControllerRef.current === controller) {
        bootstrapAuthCheckControllerRef.current = null;
      }
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [authApiBase, redirectAfterAuth]);

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
      let response: Response | null = null;
      let lastFetchError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const nextResponse = await fetch(socialCompleteEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ socialGrant }),
          });

          if (nextResponse.status >= 500 && attempt === 0) {
            await sleep(250);
            continue;
          }

          response = nextResponse;
          break;
        } catch (err) {
          lastFetchError = err instanceof Error ? err : new Error("네트워크 오류가 발생했습니다.");
          if (attempt === 0) {
            await sleep(250);
            continue;
          }
        }
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

        persistAuth(payload.user, payload.accessToken);

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

  const hasRequiredConsents = agreePrivacy && agreeTerms;

  const handleLocalSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || socialLoading !== null) return;

    abortBootstrapAuthCheck();

    if (!hasRequiredConsents) {
      setError("개인정보처리방침과 이용약관 전문을 확인하고 필수 동의해야 회원가입을 진행할 수 있습니다.");
      return;
    }

    if (!name.trim() || !loginId.trim() || password.length < 8) {
      setError("이름, 아이디(이메일), 비밀번호를 확인해 주세요.");
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

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const nextResponse = await fetchWithTimeout(`${authApiBase}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: name.trim(),
              email: loginId.trim(),
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

          if (nextResponse.status >= 500 && attempt === 0) {
            await sleep(250);
            continue;
          }

          response = nextResponse;
          break;
        } catch (error) {
          lastFetchError = error instanceof Error ? error : new Error("네트워크 오류가 발생했습니다.");
          if (attempt === 0) {
            await sleep(250);
            continue;
          }
        }
      }

      if (!response) {
        throw (lastFetchError || new Error("회원가입 처리 중 오류가 발생했습니다."));
      }

      const payload = await parseJsonResponse<SignupResult & { errors?: string[] }>(response);
      if (!response.ok) {
        throw new Error(normalizeAuthApiError(payload, "회원가입에 실패했습니다."));
      }

      persistAuth(payload.user, payload.accessToken);
      const resolvedNextPath = sanitizeNextPath(payload.nextPath || null) || nextPath;

      redirectAfterAuth(resolvedNextPath, payload.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "회원가입 처리 중 오류가 발생했습니다.";
      if (message === "Failed to fetch") {
        setError("회원가입 서버에 연결하지 못했습니다. 네트워크 상태 또는 API 배포 라우팅(/api) 설정을 확인해 주세요.");
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

    if (!hasRequiredConsents) {
      setError("개인정보처리방침과 이용약관 전문을 확인하고 필수 동의해야 회원가입을 진행할 수 있습니다.");
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="signup-name" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">NAME</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    placeholder="이름"
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
                  <label htmlFor="signup-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PASSWORD</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading || socialLoading !== null}
                      placeholder="8자 이상"
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

                <div>
                  <label htmlFor="signup-birth-date" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">BIRTH DATE</label>
                  <input
                    id="signup-birth-date"
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 [color-scheme:dark] outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
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
                    <option value="OTHER">선택 안 함</option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>
                  </select>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-amber-200/25 bg-amber-100/10 p-3">
                  <label htmlFor="signup-referral-code" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-amber-100/85">REFERRAL CODE</label>
                  <input
                    id="signup-referral-code"
                    type="text"
                    autoComplete="off"
                    value={referralCode}
                    onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24))}
                    disabled={loading || socialLoading !== null}
                    placeholder="추천인 코드"
                    className="h-12 w-full rounded-xl border border-amber-100/30 bg-slate-950/55 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-amber-50 outline-none transition placeholder:tracking-normal placeholder:text-amber-100/38 focus:border-amber-200/70 focus:ring-2 focus:ring-amber-200/25 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="mt-2 text-[11px] leading-5 text-amber-50/78">
                    보상은 프로필 저장 하단의 카카오 공유하기 이벤트 버튼으로 만든 링크를 통해 가입이 완료될 때만 지급됩니다. 친구 1명당 추천인에게 100 월정석, 하루 최대 500 월정석까지 적용됩니다.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || socialLoading !== null || !hasRequiredConsents}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200/30 bg-gradient-to-r from-violet-500/80 via-fuchsia-500/70 to-indigo-500/75 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "회원가입 중..." : "아이디/비밀번호로 회원가입"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
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
                  <span>[필수] 개인정보처리방침 전문을 읽고 동의합니다.</span>
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
                  <span>[필수] 이용약관 전문을 읽고 동의합니다.</span>
                </label>
              </article>

              <p className="lc-state" role="status" aria-live="polite">
                {hasRequiredConsents ? (
                  <><span className="lc-state-dot lc-state-dot--ok" />필수 동의가 완료되었습니다. 이제 소셜 회원가입을 진행할 수 있습니다.</>
                ) : (
                  <><span className="lc-state-dot" />필수 동의 2건을 모두 체크하면 소셜 회원가입 버튼이 활성화됩니다.</>
                )}
              </p>
            </section>

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

        /* ── Policy Embed Styles ── */
        :global(.policy-embed-body) {
          font-size: 11.5px;
          line-height: 1.72;
          color: rgba(226, 232, 240, 0.9);
        }
        :global(.policy-embed-date) {
          font-size: 10.5px;
          color: rgba(148, 163, 184, 0.8);
          margin-bottom: 10px;
        }
        :global(.policy-embed-section) {
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }
        :global(.policy-embed-section:last-child) {
          border-bottom: none;
          margin-bottom: 0;
        }
        :global(.policy-embed-h3) {
          font-size: 11px;
          font-weight: 700;
          color: rgba(196, 181, 253, 0.9);
          margin-bottom: 5px;
          letter-spacing: 0.01em;
        }
        :global(.policy-embed-body p) {
          margin-bottom: 5px;
        }
        :global(.policy-embed-body p:last-child) {
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
