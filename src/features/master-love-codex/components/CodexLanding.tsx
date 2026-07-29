"use client";

/**
 * 마스터 운명 연애 비책 — 랜딩(입장 화면).
 * 프롤로그를 본 적 있으면 CTA 문구가 "바로 시작하기"로 바뀌고 다시보기 버튼이 붙는다.
 */

import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronLeft, Home, Sparkles } from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { masterLoveCodexAssets } from "../data/assets";
import { MASTER_LOVE_CODEX_FEATURE_KEY, MASTER_LOVE_CODEX_FEATURE_COST } from "../constants";

interface CodexLandingProps {
  hasSeenPrologue: boolean;
  chapterCount: number;
  onEnter: () => void;
  onReplayPrologue: () => void;
}

const HIGHLIGHTS = [
  { title: "사주 × 자미두수", body: "명식과 명반을 한자리에 놓고 서로 맞춰 봅니다. 어긋나는 지점까지 이유를 붙여 설명합니다." },
  { title: "스무 장의 전략서", body: "기질에서 시작해 끌림·갈등·재회·결혼까지, 관계의 처음과 끝을 순서대로 짚습니다." },
  { title: "박지은이 직접", body: "결과 화면이 아니라 한 사람이 읽어 주는 책입니다. 다 읽고 나면 PDF로 소장할 수 있습니다." },
];

export default function CodexLanding({ hasSeenPrologue, chapterCount, onEnter, onReplayPrologue }: CodexLandingProps) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0d0714]" aria-label="마스터 운명 연애 비책 입장">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45"
        style={{ backgroundImage: `url("${masterLoveCodexAssets.backgrounds.library}")` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 12%, rgba(196,141,255,.16), transparent 54%), linear-gradient(180deg, rgba(13,7,20,.86), rgba(13,7,20,.72) 34%, rgba(13,7,20,.98))" }}
        aria-hidden="true"
      />

      <nav className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8" aria-label="화면 이동">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 rounded-full border border-rose-100/20 px-3 py-1.5 text-xs font-bold text-rose-100/75 transition hover:border-rose-100/45 hover:text-rose-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          돌아가기
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full border border-rose-100/20 px-3 py-1.5 text-xs font-bold text-rose-100/75 transition hover:border-rose-100/45 hover:text-rose-50"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          홈으로
        </Link>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-8 text-center sm:px-8 sm:pt-12">
        <p className="text-[11px] font-black tracking-[0.34em] text-amber-100/80">MASTER DESTINY</p>
        <h1 className="font-display mt-3 text-3xl font-black leading-tight text-rose-50 sm:text-5xl">마스터 운명 연애 비책</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-rose-50/80 sm:text-base sm:leading-8">
          사주와 자미두수를 하나로 엮어, 운명의 안내자 박지은이 당신의 연애 인생을 {chapterCount}장에 걸쳐 읽어 내려갑니다.
          운세 결과가 아니라 한 권의 연애 전략서입니다.
        </p>

        <Image
          src={masterLoveCodexAssets.cover}
          alt="마스터 운명 연애 비책 — 신비의 도서관에서 펼쳐지는 연애 전략서"
          width={768}
          height={512}
          unoptimized
          priority
          className="mt-8 w-full max-w-lg rounded-3xl border border-amber-200/25 object-cover shadow-[0_36px_80px_-30px_rgba(0,0,0,.9)]"
        />

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onEnter}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 px-7 py-3.5 text-sm font-black text-[#2b1020] shadow-[0_18px_38px_-16px_rgba(255,214,150,.75)] transition hover:brightness-105 sm:text-base"
          >
            {hasSeenPrologue ? <Sparkles className="h-4 w-4" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
            {hasSeenPrologue ? "바로 시작하기" : "도서관에 들어가기"}
          </button>
          {hasSeenPrologue ? (
            <button
              type="button"
              onClick={onReplayPrologue}
              className="text-xs font-bold text-rose-100/65 underline-offset-4 transition hover:text-amber-100 hover:underline"
            >
              프롤로그 다시 보기
            </button>
          ) : null}
          <PriceBadge
            featureKey={MASTER_LOVE_CODEX_FEATURE_KEY}
            fallbackCoins={MASTER_LOVE_CODEX_FEATURE_COST}
            prefix="1회 이용 가격 "
            className="text-xs text-amber-100/75"
          />
        </div>

        <ul className="mt-12 grid w-full gap-3 text-left sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="rounded-2xl border border-rose-100/15 bg-[#150b1e]/70 p-4 backdrop-blur-sm">
              <p className="text-sm font-black text-amber-100">{item.title}</p>
              <p className="mt-2 text-[13px] leading-6 text-rose-50/75">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
