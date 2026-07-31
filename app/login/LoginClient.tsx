"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../_lib/api-config";
import { clearAuthError, login as loginWithStore } from "../_lib/auth-store";
import StarlightLoginPortal, { type LoginStatus } from "../components/StarlightLoginPortal";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type LoginResult = {
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

type LoginPageCopy = {
  socialDefaultError: string;
  socialFailed: string;
  socialUnavailable: string;
  authResponseUnstable: string;
  missingOauthParams: string;
  tokenExchangeFailed: string;
  oauthNotConfigured: string;
  invalidCallback: string;
  expiredCallback: string;
  invalidCredentials: string;
  portalConnecting: string;
  portalLoadingProfile: string;
  portalSuccess: string;
  loginProcessingError: string;
  loginServerUnavailable: string;
  socialRedirecting: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  loginTab: string;
  signupTab: string;
  emailHelp: string;
  passwordPlaceholder: string;
  hidePasswordAria: string;
  showPasswordAria: string;
  hidePassword: string;
  showPassword: string;
  passwordResetPending: string;
  forgotPassword: string;
  submitting: string;
  submit: string;
  socialDivider: string;
  googleRedirecting: string;
  googleContinue: string;
  naverRedirecting: string;
  naverContinue: string;
  kakaoRedirecting: string;
  kakaoContinue: string;
  signupFooter: string;
  signupLink: string;
};

const LOGIN_PAGE_TEXT_TRANSLATIONS: Partial<Record<LoadingLocale, LoginPageCopy>> = {
  ko: {
    socialDefaultError: "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    socialFailed: "소셜 로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
    socialUnavailable: "소셜 로그인 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
    authResponseUnstable: "인증 서버 응답이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
    missingOauthParams: "소셜 인증 정보가 누락되었습니다. 다시 로그인해 주세요.",
    tokenExchangeFailed: "소셜 인증 토큰 교환에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    oauthNotConfigured: "소셜 로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
    invalidCallback: "소셜 인증 콜백이 유효하지 않습니다. 다시 시도해 주세요.",
    expiredCallback: "소셜 로그인 콜백이 만료되었거나 경로가 올바르지 않습니다. 소셜 로그인을 다시 시도해 주세요.",
    invalidCredentials: "아이디(이메일)와 비밀번호를 확인해 주세요.",
    portalConnecting: "별빛 포털에 연결하는 중...",
    portalLoadingProfile: "당신의 운명 데이터를 안전하게 불러오고 있습니다.",
    portalSuccess: "인증이 완료되었습니다. 프로필 카드를 불러오는 중...",
    loginProcessingError: "로그인 처리 중 오류가 발생했습니다.",
    loginServerUnavailable: "로그인 서버에 연결하지 못했습니다. 네트워크 상태 또는 API 배포 라우팅(/api) 설정을 확인해 주세요.",
    socialRedirecting: "우주의 좌표를 동기화하는 중... 잠시만 기다려 주세요.",
    eyebrow: "TWILIGHT LOGIN",
    title: "별빛 로그인 포털",
    subtitle: "아이디(이메일)/비밀번호 또는 소셜 계정으로 로그인할 수 있습니다.",
    loginTab: "로그인",
    signupTab: "회원가입",
    emailHelp: "가입할 때 사용한 이메일 아이디를 입력해 주세요.",
    passwordPlaceholder: "비밀번호 입력",
    hidePasswordAria: "비밀번호 숨기기",
    showPasswordAria: "비밀번호 표시",
    hidePassword: "숨김",
    showPassword: "보기",
    passwordResetPending: "비밀번호 재설정 기능은 준비 중입니다. 잠시만 기다려 주세요.",
    forgotPassword: "비밀번호를 잊으셨나요?",
    submitting: "로그인 중...",
    submit: "아이디/비밀번호로 로그인",
    socialDivider: "SOCIAL LOGIN",
    googleRedirecting: "Google 인증으로 이동 중...",
    googleContinue: "Google로 계속하기",
    naverRedirecting: "네이버 인증으로 이동 중...",
    naverContinue: "네이버로 계속하기",
    kakaoRedirecting: "카카오 인증으로 이동 중...",
    kakaoContinue: "카카오로 계속하기",
    signupFooter: "회원가입에서 아이디/비밀번호 또는 소셜 계정을 선택할 수 있습니다.",
    signupLink: "회원가입",
  },
  en: {
    socialDefaultError: "Social login failed. Please try again in a moment.",
    socialFailed: "An error occurred during social login. Please try again.",
    socialUnavailable: "The social login server is temporarily unstable. Please try again soon.",
    authResponseUnstable: "The authentication server response is temporarily unstable. Please try again soon.",
    missingOauthParams: "Social authentication information is missing. Please sign in again.",
    tokenExchangeFailed: "Could not exchange the social authentication token. Please try again soon.",
    oauthNotConfigured: "Social login is not fully configured yet. Please contact the administrator.",
    invalidCallback: "The social authentication callback is invalid. Please try again.",
    expiredCallback: "The social login callback expired or the path is invalid. Please try social login again.",
    invalidCredentials: "Please check your email ID and password.",
    portalConnecting: "Connecting to the starlight portal...",
    portalLoadingProfile: "Loading your destiny data safely.",
    portalSuccess: "Authentication complete. Loading your profile card...",
    loginProcessingError: "An error occurred while signing in.",
    loginServerUnavailable: "Could not connect to the login server. Please check your network or API routing.",
    socialRedirecting: "Synchronizing celestial coordinates... Please wait a moment.",
    eyebrow: "TWILIGHT LOGIN",
    title: "Starlight Login Portal",
    subtitle: "Sign in with an email/password or a social account.",
    loginTab: "Log in",
    signupTab: "Sign up",
    emailHelp: "Enter the email ID you used when signing up.",
    passwordPlaceholder: "Enter password",
    hidePasswordAria: "Hide password",
    showPasswordAria: "Show password",
    hidePassword: "Hide",
    showPassword: "Show",
    passwordResetPending: "Password reset is being prepared. Please wait a little longer.",
    forgotPassword: "Forgot your password?",
    submitting: "Signing in...",
    submit: "Sign in with email/password",
    socialDivider: "SOCIAL LOGIN",
    googleRedirecting: "Moving to Google authentication...",
    googleContinue: "Continue with Google",
    naverRedirecting: "Moving to Naver authentication...",
    naverContinue: "Continue with Naver",
    kakaoRedirecting: "Moving to Kakao authentication...",
    kakaoContinue: "Continue with Kakao",
    signupFooter: "You can choose email/password or a social account when signing up.",
    signupLink: "Sign up",
  },
  ja: {
    socialDefaultError: "ソーシャルログインに失敗しました。少ししてからもう一度お試しください。",
    socialFailed: "ソーシャルログイン処理中にエラーが発生しました。もう一度お試しください。",
    socialUnavailable: "ソーシャルログインサーバーが一時的に不安定です。少ししてからお試しください。",
    authResponseUnstable: "認証サーバーの応答が一時的に不安定です。少ししてからお試しください。",
    missingOauthParams: "ソーシャル認証情報が不足しています。もう一度ログインしてください。",
    tokenExchangeFailed: "ソーシャル認証トークンの交換に失敗しました。少ししてからお試しください。",
    oauthNotConfigured: "ソーシャルログイン設定がまだ完了していません。管理者にお問い合わせください。",
    invalidCallback: "ソーシャル認証コールバックが無効です。もう一度お試しください。",
    expiredCallback: "ソーシャルログインのコールバックが期限切れ、または経路が正しくありません。もう一度お試しください。",
    invalidCredentials: "メールIDとパスワードを確認してください。",
    portalConnecting: "星明かりのポータルへ接続しています...",
    portalLoadingProfile: "運命データを安全に読み込んでいます。",
    portalSuccess: "認証が完了しました。プロフィールカードを読み込んでいます...",
    loginProcessingError: "ログイン処理中にエラーが発生しました。",
    loginServerUnavailable: "ログインサーバーに接続できませんでした。ネットワークまたはAPIルーティングを確認してください。",
    socialRedirecting: "星の座標を同期しています... 少しお待ちください。",
    eyebrow: "TWILIGHT LOGIN",
    title: "星明かりログインポータル",
    subtitle: "メールID/パスワード、またはソーシャルアカウントでログインできます。",
    loginTab: "ログイン",
    signupTab: "会員登録",
    emailHelp: "登録時に使用したメールIDを入力してください。",
    passwordPlaceholder: "パスワードを入力",
    hidePasswordAria: "パスワードを隠す",
    showPasswordAria: "パスワードを表示",
    hidePassword: "隠す",
    showPassword: "表示",
    passwordResetPending: "パスワード再設定機能は準備中です。少しお待ちください。",
    forgotPassword: "パスワードをお忘れですか？",
    submitting: "ログイン中...",
    submit: "メールID/パスワードでログイン",
    socialDivider: "SOCIAL LOGIN",
    googleRedirecting: "Google認証へ移動中...",
    googleContinue: "Googleで続ける",
    naverRedirecting: "Naver認証へ移動中...",
    naverContinue: "Naverで続ける",
    kakaoRedirecting: "Kakao認証へ移動中...",
    kakaoContinue: "Kakaoで続ける",
    signupFooter: "会員登録ではメールID/パスワードまたはソーシャルアカウントを選択できます。",
    signupLink: "会員登録",
  },
  "zh-CN": {
    socialDefaultError: "社交登录失败。请稍后再试。",
    socialFailed: "社交登录处理时发生错误。请重试。",
    socialUnavailable: "社交登录服务器暂时不稳定。请稍后再试。",
    authResponseUnstable: "认证服务器响应暂时不稳定。请稍后再试。",
    missingOauthParams: "缺少社交认证信息。请重新登录。",
    tokenExchangeFailed: "社交认证令牌交换失败。请稍后再试。",
    oauthNotConfigured: "社交登录设置尚未完成。请联系管理员。",
    invalidCallback: "社交认证回调无效。请重试。",
    expiredCallback: "社交登录回调已过期或路径无效。请重新尝试社交登录。",
    invalidCredentials: "请确认邮箱 ID 和密码。",
    portalConnecting: "正在连接星光入口...",
    portalLoadingProfile: "正在安全加载你的命运数据。",
    portalSuccess: "认证已完成。正在加载个人资料卡...",
    loginProcessingError: "登录处理时发生错误。",
    loginServerUnavailable: "无法连接登录服务器。请检查网络或 API 路由设置。",
    socialRedirecting: "正在同步星辰坐标... 请稍候。",
    eyebrow: "TWILIGHT LOGIN",
    title: "星光登录入口",
    subtitle: "可以使用邮箱/密码或社交账号登录。",
    loginTab: "登录",
    signupTab: "注册",
    emailHelp: "请输入注册时使用的邮箱 ID。",
    passwordPlaceholder: "输入密码",
    hidePasswordAria: "隐藏密码",
    showPasswordAria: "显示密码",
    hidePassword: "隐藏",
    showPassword: "显示",
    passwordResetPending: "密码重置功能正在准备中。请稍候。",
    forgotPassword: "忘记密码？",
    submitting: "登录中...",
    submit: "使用邮箱/密码登录",
    socialDivider: "SOCIAL LOGIN",
    googleRedirecting: "正在前往 Google 认证...",
    googleContinue: "使用 Google 继续",
    naverRedirecting: "正在前往 Naver 认证...",
    naverContinue: "使用 Naver 继续",
    kakaoRedirecting: "正在前往 Kakao 认证...",
    kakaoContinue: "使用 Kakao 继续",
    signupFooter: "注册时可以选择邮箱/密码或社交账号。",
    signupLink: "注册",
  },
  "zh-TW": {
    socialDefaultError: "社群登入失敗。請稍後再試。",
    socialFailed: "社群登入處理時發生錯誤。請重試。",
    socialUnavailable: "社群登入伺服器暫時不穩定。請稍後再試。",
    authResponseUnstable: "認證伺服器回應暫時不穩定。請稍後再試。",
    missingOauthParams: "缺少社群認證資訊。請重新登入。",
    tokenExchangeFailed: "社群認證權杖交換失敗。請稍後再試。",
    oauthNotConfigured: "社群登入設定尚未完成。請聯絡管理員。",
    invalidCallback: "社群認證回呼無效。請重試。",
    expiredCallback: "社群登入回呼已過期或路徑無效。請重新嘗試社群登入。",
    invalidCredentials: "請確認信箱 ID 和密碼。",
    portalConnecting: "正在連接星光入口...",
    portalLoadingProfile: "正在安全載入你的命運資料。",
    portalSuccess: "認證已完成。正在載入個人資料卡...",
    loginProcessingError: "登入處理時發生錯誤。",
    loginServerUnavailable: "無法連接登入伺服器。請檢查網路或 API 路由設定。",
    socialRedirecting: "正在同步星辰座標... 請稍候。",
    eyebrow: "TWILIGHT LOGIN",
    title: "星光登入入口",
    subtitle: "可以使用信箱/密碼或社群帳號登入。",
    loginTab: "登入",
    signupTab: "註冊",
    emailHelp: "請輸入註冊時使用的信箱 ID。",
    passwordPlaceholder: "輸入密碼",
    hidePasswordAria: "隱藏密碼",
    showPasswordAria: "顯示密碼",
    hidePassword: "隱藏",
    showPassword: "顯示",
    passwordResetPending: "密碼重設功能正在準備中。請稍候。",
    forgotPassword: "忘記密碼？",
    submitting: "登入中...",
    submit: "使用信箱/密碼登入",
    socialDivider: "SOCIAL LOGIN",
    googleRedirecting: "正在前往 Google 認證...",
    googleContinue: "使用 Google 繼續",
    naverRedirecting: "正在前往 Naver 認證...",
    naverContinue: "使用 Naver 繼續",
    kakaoRedirecting: "正在前往 Kakao 認證...",
    kakaoContinue: "使用 Kakao 繼續",
    signupFooter: "註冊時可以選擇信箱/密碼或社群帳號。",
    signupLink: "註冊",
  },
};

function getLoginPageCopy(locale: LoadingLocale) {
  return LOGIN_PAGE_TEXT_TRANSLATIONS[locale]
    ?? LOGIN_PAGE_TEXT_TRANSLATIONS.en
    ?? LOGIN_PAGE_TEXT_TRANSLATIONS.ko!;
}

function authWarn(...args: unknown[]) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(...args);
}

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function resolveNextPathFromQuery(params: URLSearchParams): string {
  return sanitizeNextPath(params.get("returnTo")) || sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
}

function buildSocialStartPath(provider: SocialProvider, flow: "login" | "signup", nextPath: string) {
  const safeNext = sanitizeNextPath(nextPath) || "/";
  return `/api/auth/oauth/${provider}/start?flow=${flow}&next=${encodeURIComponent(safeNext)}`;
}

function buildSocialStartUrl(
  authApiBase: string,
  provider: SocialProvider,
  flow: "login" | "signup",
  nextPath: string,
) {
  return `${authApiBase}${buildSocialStartPath(provider, flow, nextPath)}`;
}

function normalizeSocialAuthError(rawReason: string | null, copy: LoginPageCopy): string {
  const reason = String(rawReason || "").trim().toLowerCase();
  if (!reason) return copy.socialDefaultError;
  if (reason === "oauth_failed") return copy.socialFailed;
  if (reason === "oauth_service_unavailable") return copy.socialUnavailable;
  if (reason === "response_is_html") return copy.authResponseUnstable;
  if (reason === "missing_oauth_params") return copy.missingOauthParams;
  if (reason.includes("token_exchange_failed")) return copy.tokenExchangeFailed;
  if (reason === "oauth_not_configured") return copy.oauthNotConfigured;
  if (reason === "invalid_callback" || reason === "provider_mismatch") return copy.invalidCallback;
  // 2026-07-29 하루 운영했던 보호자 동의 절차에서 남은 대기 계정은 잠긴 상태로 둔다.
  if (reason.startsWith("guardian_consent")) return "이 계정은 이용할 수 없습니다. admin@code-destiny.com 으로 문의해 주세요.";
  return copy.socialDefaultError;
}

export default function LoginPage() {
  const router = useRouter();

  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState<SocialProvider | null>(null);
  const [callbackProcessing] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [portalMessage, setPortalMessage] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const copy = getLoginPageCopy(locale);

  const authApiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("languagechange", syncLocale);
    window.addEventListener("storage", syncLocale);
    document.addEventListener("cd:language-change", syncLocale);
    return () => {
      window.removeEventListener("languagechange", syncLocale);
      window.removeEventListener("storage", syncLocale);
      document.removeEventListener("cd:language-change", syncLocale);
    };
  }, []);

  const redirectAfterAuth = useCallback((nextPath: string, user?: LoginResult["user"]) => {
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
    const oauthError = params.get("error") || params.get("social_error");
    if (oauthError) {
      setError(normalizeSocialAuthError(oauthError, copy));
      setLoginStatus("error");
      authWarn("[AUTH] oauth callback failed", oauthError);
    }

    if (params.get("social_grant")) {
      setError(copy.expiredCallback);
      setLoginStatus("error");
    }
  }, [copy]);

  useEffect(() => {
    if (loginStatus !== "error") return;
    const timer = window.setTimeout(() => setLoginStatus("idle"), 1400);
    return () => window.clearTimeout(timer);
  }, [loginStatus]);

  const handleLocalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginSubmitting || oauthRedirecting !== null || callbackProcessing) return;

    const normalizedId = loginId.trim();
    if (!normalizedId || password.length < 8) {
      setError(copy.invalidCredentials);
      return;
    }

    setError("");
    clearAuthError();
    setLoginSubmitting(true);
    setLoginStatus("loading");
    setPortalMessage(copy.portalConnecting);

    try {
      const params = new URLSearchParams(window.location.search);
      const nextPath = resolveNextPathFromQuery(params);

      setPortalMessage(copy.portalLoadingProfile);
      const loginResult = await loginWithStore({
        email: normalizedId,
        password,
        nextPath,
        apiBase: authApiBase,
      });

      // 성공 피드백은 한 단계만 보여주고 바로 넘어간다. 예전에는 서버 응답이 끝난 뒤에도
      // 700+600+500ms(=1.8초)를 순수 연출로 더 기다려, 체감 로그인 시간이 그만큼 길어졌다.
      setLoginStatus("success");
      setPortalMessage(copy.portalSuccess);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const resolvedNextPath = sanitizeNextPath(loginResult.nextPath || null) || nextPath;
      redirectAfterAuth(resolvedNextPath, loginResult.user as LoginResult["user"]);
    } catch (e) {
      const message = e instanceof Error ? e.message : copy.loginProcessingError;
      authWarn("[AUTH] email login failed", message);
      if (message === "Failed to fetch") {
        setError(copy.loginServerUnavailable);
        setLoginStatus("error");
        return;
      }
      setError(message);
      setLoginStatus("error");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const startSocialLogin = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;
    if (loginSubmitting || oauthRedirecting !== null || callbackProcessing) return;

    setError("");
  clearAuthError();
  setOauthRedirecting(provider);
  setLoginStatus("loading");
  setPortalMessage(copy.socialRedirecting);

    try {
      sessionStorage.setItem("cd_oauth_intent", JSON.stringify({ provider, flow: "login", at: Date.now() }));
    } catch {
      // ignore storage failures
    }

    const params = new URLSearchParams(window.location.search);
    const nextPath = resolveNextPathFromQuery(params);

    // 앱(Capacitor)에서는 절대 URL 로 이동하면 안 된다.
    //
    // authApiBase 는 네이티브에서 프로덕션 절대 출처(https://code-destiny.com)가 되는데,
    // Capacitor 는 앱 출처와 다른 호스트를 웹뷰에 로드하지 않고 외부 Chrome 으로 던진다
    // (Bridge.launchIntent). 그러면 사용자가 앱 밖 웹사이트에 갇혀 돌아오지 못하고,
    // 세션도 앱이 아닌 브라우저 쿠키로만 생긴다 — "로그인하면 웹으로 가버리는" 증상의 원인.
    //
    // 네이티브 브릿지는 커스텀탭으로 열고 com.codedestiny.app://auth 딥링크로 앱에 복귀시킨다.
    // (Google 은 임베디드 WebView 의 OAuth 를 disallowed_useragent 로 차단하므로 커스텀탭이 정답이다.)
    const native = (window as unknown as {
      CodeDestinyNative?: {
        openAuth?: (input: { provider: string; nextPath?: string; flow?: string }) =>
          Promise<{ ok?: boolean; message?: string }>;
      };
    }).CodeDestinyNative;
    if (typeof native?.openAuth === "function") {
      void native.openAuth({ provider, nextPath, flow: "login" }).then((result) => {
        if (result && result.ok === false) {
          setError(result.message || "로그인 창을 열지 못했습니다.");
          setLoginStatus("error");
          setOauthRedirecting(null);
          setPortalMessage("");
        }
      }).catch(() => {
        setError("로그인 창을 열지 못했습니다.");
        setLoginStatus("error");
        setOauthRedirecting(null);
        setPortalMessage("");
      });
      return;
    }

    const startUrl = buildSocialStartUrl(authApiBase, provider, "login", nextPath);
    window.location.href = startUrl;
  };

  const isBusy = loginSubmitting || oauthRedirecting !== null || callbackProcessing || loginStatus === "success";
  const submitDisabled = isBusy;
  const formDisabled = isBusy;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1225] via-[#1b1745] to-[#2f0a4f] px-4 py-10 text-slate-100">
      <StarlightLoginPortal status={loginStatus} message={portalMessage} error={error} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px] opacity-40 animate-twinkle" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(168,85,247,0.30),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(99,102,241,0.22),transparent_33%)]" />

      <div className="relative mx-auto w-full max-w-md opacity-0 animate-fade-in-up">
        <div className="rounded-3xl bg-gradient-to-br from-violet-300/35 via-fuchsia-300/10 to-slate-200/35 p-[1px] shadow-violet-neon">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl [color-scheme:dark] sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                {copy.eyebrow}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{copy.title}</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                {copy.subtitle}
              </p>
              <div className="mt-4 inline-flex rounded-full border border-violet-200/25 bg-slate-950/30 p-1">
                <span className="min-h-0 min-w-0 rounded-full bg-violet-400/20 px-3 py-1.5 text-xs font-semibold text-violet-100">
                  {copy.loginTab}
                </span>
                <Link
                  href="/signup"
                  className="min-h-0 min-w-0 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-200/85 transition hover:text-violet-100"
                >
                  {copy.signupTab}
                </Link>
              </div>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <form className="space-y-3" onSubmit={handleLocalLogin}>
              <div>
                <label htmlFor="login-id" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">ID / EMAIL</label>
                <input
                  id="login-id"
                  type="email"
                  autoComplete="email"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  disabled={formDisabled}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1.5 text-[11px] text-violet-100/65">{copy.emailHelp}</p>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PASSWORD</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={formDisabled}
                    placeholder={copy.passwordPlaceholder}
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 pr-14 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={formDisabled}
                    className="absolute right-2 top-1/2 h-8 min-h-0 min-w-0 -translate-y-1/2 rounded-md border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-100 hover:bg-violet-400/20 disabled:opacity-60"
                    aria-label={showPassword ? copy.hidePasswordAria : copy.showPasswordAria}
                  >
                    {showPassword ? copy.hidePassword : copy.showPassword}
                  </button>
                </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setError(copy.passwordResetPending)}
                  className="min-h-0 min-w-0 px-0 py-0 text-xs font-semibold text-violet-200/85 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-100"
                >
                  {copy.forgotPassword}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200/30 bg-gradient-to-r from-violet-500/80 via-fuchsia-500/70 to-indigo-500/75 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loginSubmitting ? copy.submitting : copy.submit}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100/20" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/60">{copy.socialDivider}</span>
              <div className="h-px flex-1 bg-violet-100/20" />
            </div>

            <div className="space-y-2.5">
              <a
                href={buildSocialStartPath("google", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("google");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {oauthRedirecting === "google" ? copy.googleRedirecting : copy.googleContinue}
              </a>

              <a
                href={buildSocialStartPath("naver", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("naver");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {oauthRedirecting === "naver" ? copy.naverRedirecting : copy.naverContinue}
              </a>

              <a
                href={buildSocialStartPath("kakao", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("kakao");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {oauthRedirecting === "kakao" ? copy.kakaoRedirecting : copy.kakaoContinue}
              </a>
            </div>

            <footer className="mt-5 text-center text-xs text-violet-100/75">
              {copy.signupFooter} {" "}
              <Link href="/signup" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                {copy.signupLink}
              </Link>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}

