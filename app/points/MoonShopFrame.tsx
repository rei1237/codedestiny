"use client";

// /points 의 "껍데기" 정본. 세 화면(next/dynamic 로딩 폴백 · PointsClient 부팅 중 · 본 렌더)이
// **같은 마크업**을 써야 CLS 가 생기지 않으므로 여기 한 곳에서만 정의한다.
// 🔴 셸을 여기서 분리한 이유(2026-09-07): PointsClient 는 ssr:false 라 서버 HTML 에 아무 이미지도
//    담기지 않았고(LCP 5,364ms), 로딩 폴백이 main.moon-shop 이 아니어서
//    styles/globals.css 의 `body:has(main.moon-shop)` 가 클라이언트 렌더 순간에야 header/footer 를
//    지웠다(CLS 0.524). 폴백부터 main.moon-shop 을 쓰면 두 원인이 함께 사라진다.

import { useState } from "react";
import Link from "next/link";
import MoonIcon from "@/components/ui/MoonIcon";
import { PAYMENT_PIG_LOGO_URL } from "../components/common/PaymentPigVisual";

const MOON_SHOP_MAIN_CLASS =
  "moon-shop relative min-h-[100dvh] overflow-hidden px-4 py-8 text-slate-100";
const MOON_SHOP_MAIN_BACKGROUND =
  "var(--cd-page-bg-gradient, radial-gradient(circle at 50% -10%, rgba(30,27,96,0.54), transparent 38%), #08091A)";

// 히어로 메달리온·지갑 카드·빈 주문 내역 세 곳이 같은 연이를 쓰므로 로딩 실패 폴백까지 여기서만 관리한다.
// (URL 정본은 결제 대기 화면과 공유하는 PAYMENT_PIG_LOGO_URL — 상점용 상수를 따로 만들지 않는다.)
// 상점에서는 최대 90px로만 쓰므로 Cloudflare Image Resizing 축소본을 먼저 받는다.
// 정본이 동일 오리진 상대경로가 된 뒤에도 축소본을 계속 쓰도록 상대경로를 그대로 이어 붙인다
// (예전에는 new URL(상대경로)가 throw 해서 catch 로 떨어지며 축소를 조용히 포기했다).
const SHOP_PIG_RESIZED_URL = (() => {
  const resizePrefix = "/cdn-cgi/image/width=220,quality=82,format=auto";
  if (PAYMENT_PIG_LOGO_URL.startsWith("/")) return `${resizePrefix}${PAYMENT_PIG_LOGO_URL}`;
  try {
    const parsed = new URL(PAYMENT_PIG_LOGO_URL);
    return `${parsed.origin}${resizePrefix}${parsed.pathname}`;
  } catch {
    return PAYMENT_PIG_LOGO_URL;
  }
})();

export function ShopPigImage({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState(SHOP_PIG_RESIZED_URL);
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={src}
      alt=""
      loading="eager"
      decoding="async"
      className={className}
      onError={() => {
        // 축소본 실패 시 원본으로, 원본까지 실패하면 숨긴다(달·문구는 그대로 남는다).
        if (src !== PAYMENT_PIG_LOGO_URL) setSrc(PAYMENT_PIG_LOGO_URL);
        else setFailed(true);
      }}
    />
  );
}

export function MoonlightShopHero() {
  return (
    <header className="moon-shop-hero -mx-4 px-4 py-7 sm:mx-0 sm:rounded-[28px] sm:px-8 sm:py-8">
      <div className="moon-shop-stars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="moon-shop-visual" aria-hidden="true">
            <span className="moon-shop-visual-ring moon-shop-visual-ring--one" />
            <span className="moon-shop-visual-ring moon-shop-visual-ring--two" />
            <MoonIcon phase="full" className="moon-shop-visual-moon" />
            <ShopPigImage className="moon-shop-visual-pig" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--one" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--two" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--three" />
          </div>
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[color:var(--moon-silver)]">연이의 달빛 이용권 상점</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">연이의 달빛 이용권 상점</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--moon-silver)] sm:text-base">
              달빛 이용권 상품과 원화 결제 조건을 한 화면에서 확인하세요.
            </p>
            <p className="mt-2 text-sm font-black leading-6 text-[color:var(--moon-gold)]">
              이용권은 원화 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link href="/" prefetch={false} className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            홈 화면 바로가기
          </Link>
          <Link href="/points/history" className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            이용권 주문 내역
          </Link>
          <Link href="/" prefetch={false} className="btn-moonlight-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            ← 서비스 화면으로
          </Link>
        </div>
      </div>
    </header>
  );
}

/** main.moon-shop + 배경 글로우 오브. 🔴 셋 중 어느 화면도 이 래퍼를 우회하지 않는다. */
export function MoonShopMain({ children }: { children: React.ReactNode }) {
  return (
    <main className={MOON_SHOP_MAIN_CLASS} style={{ background: MOON_SHOP_MAIN_BACKGROUND }}>
      {/* ── 배경 글로우 오브 ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(202,184,255,0.46) 0%, rgba(140,184,255,0.18) 52%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-48 w-[450px] h-[450px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(243,221,154,0.58) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.38) 0%, transparent 70%)" }}
        />
      </div>
      {children}
    </main>
  );
}

/**
 * 로딩 폴백과 부팅 중 화면이 **함께** 쓰는 스켈레톤.
 * 🔴 두 화면이 같은 컴포넌트를 쓰므로 폴백→부팅 전환에서 시프트가 0 이고,
 *    히어로가 본 렌더와 동일한 위치·높이라 부팅→본 렌더에서도 히어로는 움직이지 않는다.
 */
export function MoonShopSkeleton() {
  return (
    <MoonShopMain>
      <div className="relative mx-auto w-full max-w-6xl space-y-5">
        <MoonlightShopHero />
        <p role="status" className="sr-only">이용권 상점을 불러오는 중...</p>
        <div className="moon-card rounded-[24px] p-5 sm:p-6" aria-hidden="true">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 flex-shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-28 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="mt-5 h-3 w-full rounded-full bg-white/10" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="h-10 rounded-2xl bg-white/10" />
            <div className="h-10 rounded-2xl bg-white/10" />
          </div>
        </div>
        <div className="moon-card rounded-[24px] p-5 sm:p-6" aria-hidden="true">
          <div className="h-5 w-32 rounded-full bg-white/10" />
          <div className="mt-5 grid gap-3">
            <div className="h-16 rounded-2xl bg-white/10" />
            <div className="h-16 rounded-2xl bg-white/10" />
          </div>
        </div>
        <div className="moon-card rounded-[24px] p-5 sm:p-6" aria-hidden="true">
          <div className="h-5 w-28 rounded-full bg-white/10" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="h-40 rounded-2xl bg-white/10" />
            <div className="h-40 rounded-2xl bg-white/10" />
            <div className="h-40 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    </MoonShopMain>
  );
}
