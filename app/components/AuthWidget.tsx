"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout, refreshAuth, useAuthStore } from "../_lib/auth-store";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  image?: string;
  role: "user" | "admin";
  monthlyStoneBalance?: number;
  monthlyCredits?: number;
  profileSubscription?: {
    tier?: string;
    isActive?: boolean;
    monthlyStoneBalance?: number;
    membershipCreditBalance?: number;
  };
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

const AUTH_WIDGET_COPY: Record<LoadingLocale, {
  userFallback: string;
  initialFallback: string;
  profileAlt: (name: string) => string;
  nameLabel: (name: string) => string;
  admin: string;
  subscriptionTitle: string;
  accountTitle: string;
  account: string;
  logout: string;
  login: string;
  signup: string;
}> = {
  ko: { userFallback: "사용자", initialFallback: "사", profileAlt: (name) => `${name} 프로필`, nameLabel: (name) => `${name}님`, admin: "관리자", subscriptionTitle: "현재 구독 티어", accountTitle: "마이페이지", account: "계정", logout: "로그아웃", login: "로그인", signup: "회원가입" },
  en: { userFallback: "User", initialFallback: "U", profileAlt: (name) => `${name}'s profile`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Current subscription tier", accountTitle: "My page", account: "Account", logout: "Log out", login: "Log in", signup: "Sign up" },
  ja: { userFallback: "ユーザー", initialFallback: "ユ", profileAlt: (name) => `${name}のプロフィール`, nameLabel: (name) => `${name}様`, admin: "管理者", subscriptionTitle: "現在のサブスクリプション", accountTitle: "マイページ", account: "アカウント", logout: "ログアウト", login: "ログイン", signup: "新規登録" },
  "zh-CN": { userFallback: "用户", initialFallback: "用", profileAlt: (name) => `${name}的个人资料`, nameLabel: (name) => name, admin: "管理员", subscriptionTitle: "当前订阅等级", accountTitle: "我的页面", account: "账户", logout: "退出登录", login: "登录", signup: "注册" },
  "zh-TW": { userFallback: "使用者", initialFallback: "使", profileAlt: (name) => `${name}的個人資料`, nameLabel: (name) => name, admin: "管理員", subscriptionTitle: "目前訂閱等級", accountTitle: "我的頁面", account: "帳戶", logout: "登出", login: "登入", signup: "註冊" },
  vi: { userFallback: "Người dùng", initialFallback: "N", profileAlt: (name) => `Hồ sơ của ${name}`, nameLabel: (name) => name, admin: "Quản trị", subscriptionTitle: "Gói đăng ký hiện tại", accountTitle: "Trang của tôi", account: "Tài khoản", logout: "Đăng xuất", login: "Đăng nhập", signup: "Đăng ký" },
  hi: { userFallback: "उपयोगकर्ता", initialFallback: "उ", profileAlt: (name) => `${name} की प्रोफ़ाइल`, nameLabel: (name) => name, admin: "एडमिन", subscriptionTitle: "वर्तमान सदस्यता स्तर", accountTitle: "मेरा पेज", account: "खाता", logout: "लॉग आउट", login: "लॉग इन", signup: "साइन अप" },
  es: { userFallback: "Usuario", initialFallback: "U", profileAlt: (name) => `Perfil de ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Nivel de suscripción actual", accountTitle: "Mi página", account: "Cuenta", logout: "Cerrar sesión", login: "Iniciar sesión", signup: "Registrarse" },
  fr: { userFallback: "Utilisateur", initialFallback: "U", profileAlt: (name) => `Profil de ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Niveau d'abonnement actuel", accountTitle: "Ma page", account: "Compte", logout: "Déconnexion", login: "Connexion", signup: "Inscription" },
  de: { userFallback: "Nutzer", initialFallback: "N", profileAlt: (name) => `Profil von ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Aktuelle Abo-Stufe", accountTitle: "Meine Seite", account: "Konto", logout: "Abmelden", login: "Anmelden", signup: "Registrieren" },
  nl: { userFallback: "Gebruiker", initialFallback: "G", profileAlt: (name) => `Profiel van ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Huidig abonnementsniveau", accountTitle: "Mijn pagina", account: "Account", logout: "Uitloggen", login: "Inloggen", signup: "Registreren" },
  ms: { userFallback: "Pengguna", initialFallback: "P", profileAlt: (name) => `Profil ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Tahap langganan semasa", accountTitle: "Halaman saya", account: "Akaun", logout: "Log keluar", login: "Log masuk", signup: "Daftar" },
};

export default function AuthWidget() {
  const auth = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const user = (auth.user as AuthUser | null) || null;
  const copy = AUTH_WIDGET_COPY[locale] || AUTH_WIDGET_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
    setMounted(true);
    refreshAuth({ force: true, silent: false }).catch(() => {
      // best-effort bootstrap sync
    });

    const syncUser = () => {
      refreshAuth({ force: true, silent: true }).catch(() => {
        // transient failures should not break header rendering
      });
    };

    const onStorage = () => {
      syncUser();
    };
    const onAuthChanged = () => {
      syncUser();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cd:auth-changed", onAuthChanged as EventListener);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.onmessage = () => syncUser();
      }
    } catch (e) {
      channel = null;
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cd:auth-changed", onAuthChanged as EventListener);
      channel?.close();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  if (!mounted) return null;
  const isVerifiedUser = auth.isAuthenticated && !!user;
  const isCheckingAuth = !auth.authReady || (auth.isLoading && !isVerifiedUser);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[34px] items-center gap-2" aria-live="polite" aria-busy="true">
        <span className="h-7 w-7 animate-pulse rounded-full border border-violet-300/30 bg-violet-500/15" />
        <span className="h-7 w-20 animate-pulse rounded-lg border border-violet-300/20 bg-violet-500/10" />
        <span className="h-7 w-16 animate-pulse rounded-lg border border-fuchsia-300/20 bg-fuchsia-500/10" />
      </div>
    );
  }

  if (isVerifiedUser) {
    const displayName = String(user.name || copy.userFallback);
    const displayEmail = String(user.email || "");
    const displayImage = String(user.image || "");
    const initial = displayName.trim().charAt(0) || copy.initialFallback;
    const subscriptionTier = user.profileSubscription?.isActive
      ? String(user.profileSubscription?.tier || "free").toLowerCase()
      : "free";
    const subscriptionLabel = subscriptionTier === "family"
      ? "FAMILY"
      : subscriptionTier === "vvip"
      ? "VVIP"
      : subscriptionTier === "premium"
        ? "PREMIUM"
        : subscriptionTier === "standard"
          ? "STANDARD"
          : "FREE";
    const subscriptionCls = subscriptionTier === "family"
      ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
      : subscriptionTier === "vvip"
      ? "border-purple-300/50 bg-purple-500/15 text-purple-100"
      : subscriptionTier === "premium"
        ? "border-rose-300/50 bg-rose-500/15 text-rose-100"
        : subscriptionTier === "standard"
          ? "border-amber-300/50 bg-amber-500/15 text-amber-100"
          : "border-slate-400/30 bg-slate-700/40 text-slate-300";
    return (
      <div className="flex items-center gap-2">
        {displayImage ? (
          <img
            src={displayImage}
            alt={copy.profileAlt(displayName)}
            className="h-7 w-7 rounded-full border border-violet-300/40 object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/40 bg-violet-500/20 text-xs font-semibold text-violet-100">
            {initial}
          </span>
        )}
        <span className="flex max-w-[180px] flex-col leading-tight">
          <span className="truncate text-sm text-violet-200/90">{copy.nameLabel(displayName)}</span>
          {displayEmail ? (
            <span className="truncate text-[11px] text-violet-200/60">{displayEmail}</span>
          ) : null}
        </span>
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/35"
          >
            {copy.admin}
          </Link>
        )}
        <Link
          href="/points"
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${subscriptionCls}`}
          title={copy.subscriptionTitle}
        >
          {subscriptionLabel}
        </Link>
        <Link
          href="/me"
          className="rounded-lg border border-slate-400/30 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600/50"
          title={copy.accountTitle}
        >
          {copy.account}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-400/30 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600/50"
        >
          {copy.logout}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-lg border border-violet-300/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25"
      >
        {copy.login}
      </Link>
      <Link
        href="/signup"
        className="rounded-lg border border-fuchsia-300/50 bg-gradient-to-r from-violet-600/60 to-fuchsia-600/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
      >
        {copy.signup}
      </Link>
    </div>
  );
}
