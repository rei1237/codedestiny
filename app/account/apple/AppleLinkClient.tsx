"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../../_lib/api-config";

// 기존 계정에 Apple 로그인을 잇는 화면(2026-11-19 iOS Phase 2 R3).
// 🔴 Apple 은 이메일이 같아도 자동으로 붙이지 않는다. 이미 로그인한 본인만 여기서 직접 잇는다 —
// 서버(start?mode=link)가 로그인 세션을 확인하고, 그 사용자 ID 를 서명된 state 에 실어 콜백까지 가져간다.
// 비공개 릴레이 이메일(@privaterelay.appleid.com)도 이 경로로만 이어진다.
type Copy = {
  title: string; description: string; connect: string; unavailable: string; back: string;
  results: Record<string, string>;
};

const EN: Copy = {
  title: "Connect Apple",
  description: "Connect Sign in with Apple to the account you are logged in to now. After that you can log in with Apple too.",
  connect: "Connect Apple",
  unavailable: "Sign in with Apple is not available yet.",
  back: "Home",
  results: {
    linked: "Apple is now connected to your account.",
    apple_already_linked: "This Apple ID is already connected to another account.",
    apple_link_conflict: "This account is already connected to a different Apple ID.",
    cancelled: "Connection was cancelled.",
    error: "We couldn't connect Apple. Please try again shortly.",
  },
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    title: "Apple 계정 연결",
    description: "지금 로그인한 계정에 Apple 로그인을 연결해요. 연결하면 다음부터 Apple로도 로그인할 수 있어요.",
    connect: "Apple 연결하기",
    unavailable: "Apple 로그인은 아직 준비 중이에요.",
    back: "홈으로",
    results: {
      linked: "Apple 계정을 연결했어요.",
      apple_already_linked: "이 Apple ID는 이미 다른 계정에 연결돼 있어요.",
      apple_link_conflict: "이 계정에는 이미 다른 Apple ID가 연결돼 있어요.",
      cancelled: "연결을 취소했어요.",
      error: "Apple을 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
    },
  },
  ja: {
    title: "Apple連携",
    description: "現在ログイン中のアカウントにAppleでサインインを連携します。連携後はAppleでもログインできます。",
    connect: "Appleを連携",
    unavailable: "Appleでサインインはまだご利用いただけません。",
    back: "ホームへ",
    results: {
      linked: "Appleを連携しました。",
      apple_already_linked: "このApple IDは既に別のアカウントに連携されています。",
      apple_link_conflict: "このアカウントには既に別のApple IDが連携されています。",
      cancelled: "連携をキャンセルしました。",
      error: "Appleを連携できませんでした。しばらくしてから再度お試しください。",
    },
  },
  "zh-CN": {
    title: "关联Apple",
    description: "将通过Apple登录关联到当前登录的账号。关联后也可以用Apple登录。",
    connect: "关联Apple",
    unavailable: "通过Apple登录暂未开放。",
    back: "返回首页",
    results: {
      linked: "已关联Apple。",
      apple_already_linked: "此Apple ID已关联到其他账号。",
      apple_link_conflict: "此账号已关联其他Apple ID。",
      cancelled: "已取消关联。",
      error: "无法关联Apple，请稍后再试。",
    },
  },
  "zh-TW": {
    title: "連結Apple",
    description: "將透過Apple登入連結到目前登入的帳號。連結後也可以用Apple登入。",
    connect: "連結Apple",
    unavailable: "透過Apple登入尚未開放。",
    back: "返回首頁",
    results: {
      linked: "已連結Apple。",
      apple_already_linked: "此Apple ID已連結到其他帳號。",
      apple_link_conflict: "此帳號已連結其他Apple ID。",
      cancelled: "已取消連結。",
      error: "無法連結Apple，請稍後再試。",
    },
  },
};

export default function AppleLinkClient() {
  const copy = COPY[getCurrentLoadingLocale()] || EN;
  const apiBase = getApiBaseUrl();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [result, setResult] = useState("");

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("appleLink") || "";
    if (raw) setResult(copy.results[raw] || copy.results.error);
    let alive = true;
    fetch(`${apiBase}/api/auth/oauth/providers`, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => { if (alive) setAvailable(payload?.providers?.apple === true); })
      .catch(() => { if (alive) setAvailable(false); });
    return () => { alive = false; };
  }, [apiBase, copy]);

  return (
    <main className="min-h-screen bg-[#090b1a] px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[440px] place-items-center">
        <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-6">
          <h1 className="text-center text-xl font-black">{copy.title}</h1>
          <p className="mt-2 text-center text-sm leading-6 text-[#cfc4e5]">{copy.description}</p>
          {result && <p role="status" className="mt-5 rounded-xl border border-[#c9b7f0]/20 bg-[#0d1022] p-3 text-center text-sm">{result}</p>}
          <div className="mt-6">
            {available === false ? (
              <p className="text-center text-sm text-[#aa9fbd]">{copy.unavailable}</p>
            ) : (
              <a
                href={`${apiBase}/api/auth/oauth/apple/start?mode=link`}
                aria-disabled={available !== true}
                className={`flex min-h-12 items-center justify-center rounded-xl border border-black bg-black px-4 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${available === true ? "" : "pointer-events-none opacity-55"}`}
              >
                {copy.connect}
              </a>
            )}
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/" className="font-bold text-[#d7c1ff] underline underline-offset-4">{copy.back}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
