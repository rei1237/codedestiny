"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type SignupResult = {
  message?: string;
  token?: string;
  nextPath?: string;
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

function normalizeApiBase(rawBase: string | undefined | null) {
  const value = String(rawBase || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string>("");
  const socialCompleteOnceRef = useRef(false);

  const authApiBase = useMemo(() => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return normalizeApiBase(window.CODE_DESTINY_API_BASE_URL)
          || normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL)
          || window.location.origin;
      }
      return window.location.origin;
    }
    return normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:4000";
  }, []);

  const socialCompleteEndpoint = `${authApiBase}/api/auth/oauth/complete`;

  const persistAuth = (token?: string, user?: SignupResult["user"]) => {
    if (token) {
      localStorage.setItem("fortune_auth_token", token);
      document.cookie = `fortune_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
    }

    if (user) {
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
      document.cookie = `fortune_auth_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("social_grant") || params.get("social_error")) return;

    let token = "";
    try {
      token = localStorage.getItem("fortune_auth_token") || "";
    } catch {
      // no-op
    }

    if (!token) return;

    setIsRedirecting(true);
    const timer = setTimeout(() => router.replace("/"), 400);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) return;

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError("소셜 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!socialGrant) return;

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
          if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            throw new Error(payload.errors.join(" "));
          }
          throw new Error(payload.message || "소셜 회원가입 처리에 실패했습니다.");
        }

        persistAuth(payload.token, payload.user);

        const nextFromQuery = sanitizeNextPath(params.get("next"));
        const nextPath = sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/";

        if (payload.user?.role === "admin" && nextPath === "/") {
          router.replace("/admin");
          return;
        }

        router.replace(nextPath);
      })
      .catch((e: Error) => {
        setError(e.message || "소셜 회원가입 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, socialCompleteEndpoint]);

  const hasRequiredConsents = agreePrivacy && agreeTerms;

  const startSocialSignup = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;

    if (!hasRequiredConsents) {
      setError("개인정보처리방침과 이용약관 전문을 확인하고 필수 동의해야 회원가입을 진행할 수 있습니다.");
      return;
    }

    setError("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = sanitizeNextPath(params.get("next")) || "/";
    const startUrl = `${authApiBase}/api/auth/oauth/${provider}/start?flow=signup&next=${encodeURIComponent(nextPath)}`;
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
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                TWILIGHT SIGN UP
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">신비로운 별빛 회원가입</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                아이디/비밀번호 회원가입은 종료되었으며, 아래 소셜 계정으로만 회원가입할 수 있습니다.
              </p>
              <p className="mt-3 text-sm text-violet-100/75">
                이미 계정이 있다면{" "}
                <Link href="/login" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                  로그인
                </Link>
                으로 이동하세요.
              </p>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100/20" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/60">SOCIAL SIGN UP</span>
              <div className="h-px flex-1 bg-violet-100/20" />
            </div>

            <section className="legal-consent-space mb-5" aria-label="회원가입 필수 동의">
              <div className="legal-consent-head">
                <p className="legal-consent-kicker">MANDATORY LEGAL CONSENT</p>
                <h2 className="legal-consent-title">회원가입 전 정책 전문 확인</h2>
                <p className="legal-consent-desc">아래 본문을 확인한 뒤 필수 동의 항목을 체크해야 소셜 회원가입이 활성화됩니다.</p>
              </div>

              <div className="legal-docs-grid">
                <article className="legal-doc-card" aria-label="개인정보처리방침 전문">
                  <div className="legal-doc-head">
                    <strong>개인정보처리방침 Privacy Policy</strong>
                  </div>
                  <div className="legal-frame-wrap">
                    <iframe
                      title="개인정보처리방침 전문"
                      src="/privacy-policy"
                      className="legal-iframe"
                      loading="lazy"
                    />
                  </div>
                  <label className="legal-check-row" htmlFor="agree-privacy-policy">
                    <input
                      id="agree-privacy-policy"
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                    />
                    <span>[필수] 개인정보처리방침 전문을 읽고 동의합니다.</span>
                  </label>
                </article>

                <article className="legal-doc-card" aria-label="이용약관 전문">
                  <div className="legal-doc-head">
                    <strong>이용약관 Terms of Service</strong>
                  </div>
                  <div className="legal-frame-wrap">
                    <iframe
                      title="이용약관 전문"
                      src="/terms-of-service"
                      className="legal-iframe"
                      loading="lazy"
                    />
                  </div>
                  <label className="legal-check-row" htmlFor="agree-terms-of-service">
                    <input
                      id="agree-terms-of-service"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>[필수] 이용약관 전문을 읽고 동의합니다.</span>
                  </label>
                </article>
              </div>

              <p className="legal-consent-state" role="status" aria-live="polite">
                {hasRequiredConsents
                  ? "필수 동의가 완료되었습니다. 이제 소셜 회원가입을 진행할 수 있습니다."
                  : "필수 동의 2건을 모두 체크하면 소셜 회원가입 버튼이 활성화됩니다."}
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
              로그인도 소셜 계정으로만 지원됩니다. {" "}
              <Link href="/login" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                로그인
              </Link>
            </footer>
          </section>
        </div>
      </div>

      <style jsx>{`
        .legal-consent-space {
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 1rem;
          padding: 0.9rem;
          background:
            radial-gradient(circle at 12% 18%, rgba(167, 139, 250, 0.22), transparent 40%),
            radial-gradient(circle at 82% 20%, rgba(56, 189, 248, 0.18), transparent 42%),
            linear-gradient(140deg, rgba(15, 23, 42, 0.62), rgba(49, 46, 129, 0.45));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 12px 36px rgba(15, 23, 42, 0.35);
        }

        .legal-consent-head {
          margin-bottom: 0.75rem;
        }

        .legal-consent-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(196, 181, 253, 0.9);
          margin-bottom: 0.35rem;
        }

        .legal-consent-title {
          font-size: 1rem;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 700;
        }

        .legal-consent-desc {
          margin-top: 0.25rem;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(224, 231, 255, 0.82);
        }

        .legal-docs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .legal-doc-card {
          border-radius: 0.8rem;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.68), rgba(15, 23, 42, 0.55));
        }

        .legal-doc-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.55rem 0.7rem;
          font-size: 12px;
          color: rgba(233, 213, 255, 0.96);
          border-bottom: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(90deg, rgba(91, 33, 182, 0.35), rgba(30, 64, 175, 0.35));
        }

        .legal-frame-wrap {
          position: relative;
          height: 210px;
          background: rgba(248, 250, 252, 0.98);
        }

        .legal-iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #fff;
        }

        .legal-check-row {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.92);
          padding: 0.65rem 0.7rem 0.75rem;
          line-height: 1.45;
        }

        .legal-check-row input {
          margin-top: 2px;
          inline-size: 16px;
          block-size: 16px;
          accent-color: #a78bfa;
          flex-shrink: 0;
        }

        .legal-consent-state {
          margin-top: 0.7rem;
          border-radius: 0.7rem;
          border: 1px solid rgba(165, 180, 252, 0.35);
          background: rgba(67, 56, 202, 0.2);
          padding: 0.55rem 0.65rem;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(238, 242, 255, 0.95);
        }

        @media (min-width: 768px) {
          .legal-docs-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
