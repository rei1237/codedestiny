"use client";

import { useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
type AdminLoginCopy = {
  console: string;
  title: string;
  password: string;
  placeholder: string;
  submit: string;
  loading: string;
  required: string;
  invalid: string;
  tokenMissing: string;
  networkError: string;
  configPrefix: string;
  configFallback: string;
  missing: string;
  placeholderKeys: string;
  permission: string;
};

const ADMIN_LOGIN_COPY: Record<LoadingLocale, AdminLoginCopy> = {
  ko: {
    console: "관리자 콘솔",
    title: "관리자 로그인",
    password: "비밀번호",
    placeholder: "관리자 비밀번호 입력",
    submit: "입장",
    loading: "확인 중...",
    required: "비밀번호를 입력하세요.",
    invalid: "비밀번호가 올바르지 않습니다.",
    tokenMissing: "관리자 토큰을 받지 못했습니다. 다시 로그인해 주세요.",
    networkError: "네트워크 오류가 발생했습니다.",
    configPrefix: "관리자 키 설정이 올바르지 않습니다.",
    configFallback: "관리자 키 설정이 올바르지 않습니다. Worker 비밀키를 확인해주세요.",
    missing: "누락",
    placeholderKeys: "임시값",
    permission: "관리자 권한이 필요합니다",
  },
  en: {
    console: "Admin Console",
    title: "Admin Login",
    password: "Password",
    placeholder: "Enter admin password",
    submit: "Enter",
    loading: "Checking...",
    required: "Enter the password.",
    invalid: "The password is not correct.",
    tokenMissing: "Could not receive the admin token. Please sign in again.",
    networkError: "A network error occurred.",
    configPrefix: "The admin key settings are not valid.",
    configFallback: "The admin key settings are not valid. Check the Worker secret.",
    missing: "Missing",
    placeholderKeys: "Placeholder",
    permission: "Admin permission is required",
  },
  ja: {
    console: "管理者コンソール",
    title: "管理者ログイン",
    password: "パスワード",
    placeholder: "管理者パスワードを入力",
    submit: "入場",
    loading: "確認中...",
    required: "パスワードを入力してください。",
    invalid: "パスワードが正しくありません。",
    tokenMissing: "管理者トークンを受け取れませんでした。もう一度ログインしてください。",
    networkError: "ネットワークエラーが発生しました。",
    configPrefix: "管理者キー設定が正しくありません。",
    configFallback: "管理者キー設定が正しくありません。Worker の秘密キーを確認してください。",
    missing: "不足",
    placeholderKeys: "一時値",
    permission: "管理者権限が必要です",
  },
  "zh-CN": {
    console: "管理员控制台",
    title: "管理员登录",
    password: "密码",
    placeholder: "输入管理员密码",
    submit: "进入",
    loading: "确认中...",
    required: "请输入密码。",
    invalid: "密码不正确。",
    tokenMissing: "未能收到管理员令牌。请重新登录。",
    networkError: "发生网络错误。",
    configPrefix: "管理员密钥设置不正确。",
    configFallback: "管理员密钥设置不正确。请检查 Worker 密钥。",
    missing: "缺失",
    placeholderKeys: "临时值",
    permission: "需要管理员权限",
  },
  "zh-TW": {
    console: "管理員控制台",
    title: "管理員登入",
    password: "密碼",
    placeholder: "輸入管理員密碼",
    submit: "進入",
    loading: "確認中...",
    required: "請輸入密碼。",
    invalid: "密碼不正確。",
    tokenMissing: "未能收到管理員權杖。請重新登入。",
    networkError: "發生網路錯誤。",
    configPrefix: "管理員金鑰設定不正確。",
    configFallback: "管理員金鑰設定不正確。請檢查 Worker 密鑰。",
    missing: "缺少",
    placeholderKeys: "暫存值",
    permission: "需要管理員權限",
  },
  vi: {} as AdminLoginCopy,
  hi: {} as AdminLoginCopy,
  es: {} as AdminLoginCopy,
  fr: {} as AdminLoginCopy,
  de: {} as AdminLoginCopy,
  nl: {} as AdminLoginCopy,
  ms: {} as AdminLoginCopy,
};

for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]) {
  ADMIN_LOGIN_COPY[locale] = ADMIN_LOGIN_COPY.en;
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const copy = ADMIN_LOGIN_COPY[getCurrentLoadingLocale()] || ADMIN_LOGIN_COPY.ko;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) {
      setError(copy.required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/entry/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) {
        if (data?.error === "config_key_mismatch") {
          const missingKeys = Array.isArray(data?.missingKeys)
            ? data.missingKeys.map((item) => String(item)).filter(Boolean)
            : [];
          const placeholderKeys = Array.isArray(data?.placeholderKeys)
            ? data.placeholderKeys.map((item) => String(item)).filter(Boolean)
            : [];

          const parts: string[] = [];
          if (missingKeys.length) parts.push(`${copy.missing}: ${missingKeys.join(", ")}`);
          if (placeholderKeys.length) parts.push(`${copy.placeholderKeys}: ${placeholderKeys.join(", ")}`);

          setError(parts.length
            ? `${copy.configPrefix} ${parts.join(" / ")}`
            : copy.configFallback);
          return;
        }
        setError(copy.invalid);
        return;
      }
      const adminToken = String(data?.adminToken || "").trim();
      if (!FLOWER_ADMIN_TOKEN_RE.test(adminToken)) {
        setError(copy.tokenMissing);
        return;
      }

      try { sessionStorage.setItem("flower_admin_token", adminToken); } catch (e) {}
      try { sessionStorage.setItem("flower_admin_password_ok", "1"); } catch (e) {}
      try { localStorage.setItem("flower_admin_token", adminToken); } catch (e) {}
      try { localStorage.setItem("flower_admin_password_ok", "1"); } catch (e) {}

      const nextUrl = new URLSearchParams(window.location.search).get("next") || "/admin/content";
      window.location.assign(nextUrl.startsWith("/admin/") ? nextUrl : "/admin/content");
    } catch (e) {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌸</div>
          <h1 className="text-xl font-bold text-white">CODE DESTINY</h1>
          <p className="text-sm text-slate-500 mt-1">{copy.console}</p>
        </div>

        {/* Card */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-6">{copy.title}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{copy.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={copy.placeholder}
                autoFocus
                className="w-full bg-[#1e1e2e] border border-[#313145] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? copy.loading : copy.submit}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          {copy.permission}
        </p>
      </div>
    </div>
  );
}
