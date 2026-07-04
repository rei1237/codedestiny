"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";

type FeatureMarketingBadge = {
  text?: string;
  tone?: string;
};

export type FeatureMarketingTarget = {
  title: string;
  description?: string;
  subtitle?: string;
  href: string;
  slug?: string;
  featureKey?: string;
  category?: string;
  accessType?: string;
  priceLabel?: string;
  coinPrice?: number | null;
  badges?: FeatureMarketingBadge[];
};

type FeatureMarketingCopy = {
  category: string;
  badge: string;
  headline: string;
  subheadline: string;
  painPoints: string[];
  unlockBenefits: string[];
  previewText: string;
  trustNotes: string[];
  ctaLabel: string;
};

type FeatureMarketingLinkProps = {
  target: FeatureMarketingTarget;
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
};

const SAFE_TRUST_NOTES = [
  "결제 전 기능 내용을 먼저 확인할 수 있어요.",
  "이용권·월정석·단건결제 판단은 기존 서비스 기준을 그대로 따릅니다.",
  "운세 결과는 참고용이며, 중요한 선택은 현실적인 판단과 함께 확인해 주세요.",
];

const CATEGORY_COPY: Record<string, Omit<FeatureMarketingCopy, "ctaLabel">> = {
  saju: {
    category: "사주",
    badge: "심화 해석",
    headline: "내 사주가 반복해서 보내는 신호를 조금 더 깊게 읽어보세요.",
    subheadline: "기질과 흐름, 반복되는 선택 패턴을 함께 정리하는 해석입니다.",
    painPoints: ["같은 고민이 계속 반복될 때", "내 장점과 약점이 헷갈릴 때", "지금 운의 압박이 어디서 오는지 알고 싶을 때"],
    unlockBenefits: ["기질의 핵심 흐름", "현재 시기에 강하게 작용하는 포인트", "조심해야 할 선택 패턴", "현실적인 행동 기준"],
    previewText: "사주 해석은 길흉을 겁주듯 말하지 않고, 지금의 흐름과 선택 기준을 차분히 드러냅니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  tarot: {
    category: "타로",
    badge: "카드 리딩",
    headline: "지금 마음에 남은 질문을 카드의 상징으로 펼쳐보세요.",
    subheadline: "현재 감정과 가까운 흐름, 선택의 힌트를 짧고 선명하게 읽는 리딩입니다.",
    painPoints: ["마음은 급한데 답이 흐릿할 때", "상대의 감정이나 가까운 흐름이 궁금할 때", "선택 전에 마음을 정리하고 싶을 때"],
    unlockBenefits: ["현재 분위기 해석", "감정의 온도와 흐름", "조심해야 할 반응", "다음 행동 힌트"],
    previewText: "타로 리딩은 결과를 확정하지 않고, 지금 질문 주변에 떠오르는 상징과 흐름을 비춥니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  sukuyo: {
    category: "숙요점",
    badge: "관계 해석",
    headline: "두 사람 사이의 끌림과 거리감을 좋고 나쁨보다 섬세하게 읽어보세요.",
    subheadline: "관계의 결, 충돌 패턴, 인연의 리듬을 중심으로 정리하는 해석입니다.",
    painPoints: ["이상하게 끌리지만 자주 부딪힐 때", "상대와의 관계 패턴을 알고 싶을 때", "오래 갈 수 있는 인연인지 궁금할 때"],
    unlockBenefits: ["두 사람의 기본 관계성", "가까워질 때 생기는 장점", "충돌이 생기는 지점", "관계를 부드럽게 만드는 조언"],
    previewText: "숙요점은 궁합을 좋다/나쁘다로만 단정하지 않고, 관계가 움직이는 거리감을 먼저 비춥니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  ziwei: {
    category: "자미두수",
    badge: "심화 해석",
    headline: "명반 안에서 인생 구조와 지금의 방향성을 차분히 읽어보세요.",
    subheadline: "궁별 흐름과 별의 배치를 따라 장기 방향을 살피는 해석입니다.",
    painPoints: ["내 인생의 구조를 큰 틀에서 보고 싶을 때", "일·돈·관계의 중심축이 궁금할 때", "장기 흐름과 현재 선택을 함께 보고 싶을 때"],
    unlockBenefits: ["명궁과 주요 궁의 흐름", "궁별로 강하게 떠오르는 포인트", "장기 방향성과 주의 패턴", "다음 선택을 위한 기준"],
    previewText: "자미두수 해석은 별의 배치를 따라, 지금 내 삶의 구조에서 무엇이 강하게 움직이는지 살핍니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  astrology: {
    category: "점성술",
    badge: "별자리 해석",
    headline: "별자리와 행성 흐름이 지금 마음에 비추는 방향을 확인해보세요.",
    subheadline: "심리 흐름과 시기의 감각을 함께 읽는 점성술 해석입니다.",
    painPoints: ["감정과 선택의 타이밍이 궁금할 때", "내 별자리 흐름을 더 구체적으로 보고 싶을 때", "지금의 방향성을 차분히 정리하고 싶을 때"],
    unlockBenefits: ["별자리와 행성 흐름의 핵심", "심리적으로 강하게 작용하는 포인트", "주의해야 할 선택 패턴", "다음 시기를 준비하는 힌트"],
    previewText: "점성술 해석은 별의 상징을 통해, 지금 마음과 선택의 방향을 부드럽게 비춥니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  vedic: {
    category: "베다점",
    badge: "시점 해석",
    headline: "질문이 떠오른 지금의 시점과 내면의 흐름을 함께 살펴보세요.",
    subheadline: "베다점의 상징과 시간 감각으로 선택의 방향을 정리하는 해석입니다.",
    painPoints: ["지금 선택의 의미가 궁금할 때", "마음속 질문이 쉽게 내려놓아지지 않을 때", "시기와 방향을 함께 보고 싶을 때"],
    unlockBenefits: ["질문의 핵심 흐름", "시점과 내면의 상징 해석", "선택을 막는 걸림돌", "현실적인 다음 기준"],
    previewText: "베다점은 질문이 열린 시점의 결을 따라, 지금 필요한 기준을 차분히 가리킵니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  oracle: {
    category: "오라클",
    badge: "상징 리딩",
    headline: "지금 놓치기 쉬운 신호를 상징의 언어로 짧게 확인해보세요.",
    subheadline: "선택 앞의 마음을 정리하는 신탁형 리딩입니다.",
    painPoints: ["결정은 해야 하는데 확신이 부족할 때", "반복되는 신호가 있다고 느낄 때", "짧지만 선명한 상징 해석이 필요할 때"],
    unlockBenefits: ["현재 질문의 상징 메시지", "놓치기 쉬운 포인트", "주의해야 할 흐름", "다음 행동을 위한 힌트"],
    previewText: "오라클은 미래를 확정하지 않고, 지금 질문 주변에 떠오르는 상징을 비춥니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
  report: {
    category: "프리미엄 리포트",
    badge: "심화 상담형",
    headline: "흩어진 생각을 하나의 해석으로 묶어보세요.",
    subheadline: "현재 고민과 흐름을 더 구체적으로 정리해보는 프리미엄 해석입니다.",
    painPoints: ["같은 고민이 반복된다고 느낄 때", "단순 요약보다 구체적인 흐름이 필요할 때", "선택 전에 내 생각을 정리하고 싶을 때"],
    unlockBenefits: ["핵심 흐름 요약", "주제별 해석 포인트", "조심해야 할 패턴", "다음 행동 기준"],
    previewText: "프리미엄 해석은 결과를 과장하지 않고, 지금 필요한 질문의 결을 차분히 정리합니다.",
    trustNotes: SAFE_TRUST_NOTES,
  },
};

const EXPLICIT_COPY: Record<string, Partial<FeatureMarketingCopy>> = {
  "life-book-ai-consultation": {
    category: "프리미엄 리포트",
    badge: "AI 상담형",
    headline: "내 삶의 큰 흐름을 한 번 깊게 정리해두는 시간을 가져보세요.",
    subheadline: "사주 흐름을 바탕으로 인생의 방향과 반복 패턴을 상담형으로 풀어보는 프리미엄 기능입니다.",
    painPoints: ["삶의 방향을 큰 틀에서 정리하고 싶을 때", "반복되는 선택 패턴의 이유가 궁금할 때", "지금의 전환점을 더 깊게 읽고 싶을 때"],
    ctaLabel: "인생의 책 열람하기",
  },
  "ziwei-ai-consultation": {
    category: "자미두수",
    badge: "AI 상담형",
    headline: "별의 배치가 지금의 질문을 어디로 이끄는지 차분히 읽어보세요.",
    subheadline: "명궁과 12궁의 흐름을 바탕으로, 고민의 중심과 다음 선택 기준을 정리하는 상담형 해석입니다.",
    ctaLabel: "자미두수 상담 열기",
  },
  "loveSimulation": {
    category: "사주",
    badge: "연애 시뮬레이션",
    headline: "내 연애 패턴이 어떤 장면에서 빛나고 흔들리는지 확인해보세요.",
    subheadline: "사주 오행과 일간 흐름을 바탕으로 관계의 케미와 대화 포인트를 시뮬레이션처럼 보여줍니다.",
    ctaLabel: "LOVE CODE 열람하기",
  },
  "destiny_meeting_place": {
    category: "사주",
    badge: "장소 리딩",
    headline: "내 인연이 머무르기 쉬운 장소의 결을 살펴보세요.",
    subheadline: "사주 흐름을 바탕으로 인연과 장소, 타이밍의 상징을 정리하는 리딩입니다.",
    ctaLabel: "인연의 장소 열람하기",
  },
  "destiny-bias-analyze": {
    category: "사주",
    badge: "포토카드 리딩",
    headline: "최애와 나 사이에 떠오르는 무드와 감정 코드를 한 장씩 펼쳐보세요.",
    subheadline: "팬심과 관계 상상을 카드형 문장으로 정리해, 지금의 설렘과 거리감을 가볍게 읽는 리딩입니다.",
    ctaLabel: "최애운명 열람하기",
  },
  "tarot-prompt-maker": {
    category: "타로",
    badge: "프롬프트형",
    headline: "내 질문에 맞는 타로 상담의 문장을 먼저 정리해보세요.",
    subheadline: "카드 해석을 더 깊게 이어가기 위한 질문과 상담 흐름을 프롬프트로 묶는 기능입니다.",
    ctaLabel: "프롬프트 열람하기",
  },
  "stonehengeRunes": {
    category: "오라클",
    badge: "룬 리딩",
    headline: "지금 선택 앞에 떠오른 룬의 상징을 조용히 펼쳐보세요.",
    subheadline: "룬 문자의 상징으로 현재 질문과 다음 행동의 결을 읽는 오라클 리딩입니다.",
    ctaLabel: "룬 오라클 열람하기",
  },
};

const EXPLICIT_ALIAS: Record<string, string> = {
  "/life-book-ai": "life-book-ai-consultation",
  "/ziwei-ai": "ziwei-ai-consultation",
  "/saju/love-simulation": "loveSimulation",
  "/saju/destiny-meeting-place": "destiny_meeting_place",
  "/saju/destiny-bias": "destiny-bias-analyze",
  "/tarot/prompt-maker": "tarot-prompt-maker",
  "/index.html?action=openRuneOracle": "stonehengeRunes",
};

function textKey(target: FeatureMarketingTarget) {
  return [target.featureKey, target.slug, target.href, target.title, target.description, target.subtitle].filter(Boolean).join(" ").toLowerCase();
}

function inferCategory(target: FeatureMarketingTarget) {
  const raw = textKey(target);
  if (/sukuyo|sukyo|숙요/.test(raw)) return "sukuyo";
  if (/ziwei|jami|자미|명반/.test(raw)) return "ziwei";
  if (/vedic|jyotish|베다/.test(raw)) return "vedic";
  if (/astro|별자리|점성/.test(raw)) return "astrology";
  if (/tarot|타로|reunion|love-relationship/.test(raw)) return "tarot";
  if (/oracle|rune|juyuk|kemet|ifa|geomancy|오라클|신탁|룬|주역/.test(raw)) return "oracle";
  if (/life-book|love-secret|ai-consultation|premium|report|리포트|상담/.test(raw)) return "report";
  return "saju";
}

function explicitCopy(target: FeatureMarketingTarget) {
  const hrefKey = EXPLICIT_ALIAS[target.href || ""] || target.href || "";
  return EXPLICIT_COPY[target.featureKey || ""] || EXPLICIT_COPY[target.slug || ""] || EXPLICIT_COPY[hrefKey];
}

export function isPaidMarketingTarget(target: FeatureMarketingTarget) {
  if (target.accessType && target.accessType !== "free") return true;
  if ((target.coinPrice || 0) > 0) return true;
  const badgeText = (target.badges || []).map((badge) => badge.text || "").join(" ");
  const raw = `${target.href} ${target.description || ""} ${target.subtitle || ""} ${target.priceLabel || ""} ${badgeText}`;
  return /(원|결제|코인|유료|해금|premium|paid|life-book-ai|love-secret-ai|ziwei-ai|tarot\/prompt-maker|saju\/love-simulation|saju\/destiny-bias|saju\/destiny-meeting-place|palm-reading)/i.test(raw);
}

export function resolveFeatureMarketingCopy(target: FeatureMarketingTarget): FeatureMarketingCopy {
  const category = CATEGORY_COPY[inferCategory(target)] || CATEGORY_COPY.saju;
  const explicit = explicitCopy(target) || {};
  return {
    ...category,
    ...explicit,
    ctaLabel: explicit.ctaLabel || (target.accessType === "premium_report" ? "리포트 확인하기" : "결제하고 자세히 보기"),
    trustNotes: explicit.trustNotes || category.trustNotes,
  };
}

function priceText(target: FeatureMarketingTarget) {
  if (target.priceLabel) return target.priceLabel;
  const badgePrice = (target.badges || []).map((badge) => badge.text || "").find((text) => /(원|코인|해금|결제)/.test(text));
  if (badgePrice) return badgePrice;
  if ((target.coinPrice || 0) > 0) return formatKrwFromCoins(target.coinPrice);
  return "기존 결제 정책 확인";
}

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  bodyScrollLockCount += 1;
  body.style.overflow = "hidden";
  body.setAttribute("data-cd-scroll-lock", "true");
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount !== 0) return;

  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
  body.removeAttribute("data-cd-scroll-lock");
}

function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [enabled]);
}

const modalSheetScrollStyle: CSSProperties = {
  maxHeight: "calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom)))",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

export function FeatureMarketingDetailModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: FeatureMarketingTarget;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const copy = useMemo(() => resolveFeatureMarketingCopy(target), [target]);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/72 px-0 sm:items-center sm:px-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="featureMarketingTitle"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-white/12 bg-[linear-gradient(180deg,#081427,#111a34_56%,#070b1d)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:max-w-[620px] sm:rounded-2xl sm:p-6"
        style={modalSheetScrollStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-sky-200/25 bg-sky-300/10 px-2.5 py-1 text-[11px] font-black text-sky-100">{copy.category}</span>
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">{copy.badge}</span>
            </div>
            <h2 id="featureMarketingTitle" className="m-0 text-xl font-black leading-tight text-[#fff3c4]">{target.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8 text-lg font-black text-white" aria-label="닫기">
            ×
          </button>
        </div>

        <p className="m-0 text-sm font-bold leading-6 text-slate-100">{copy.headline}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{copy.subheadline}</p>

        <div className="mt-4 grid gap-3">
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-sky-100">이런 생각이 들 때 열어보면 좋아요.</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
              {copy.painPoints.map((item) => <li key={item} className="list-none">• {item}</li>)}
            </ul>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-amber-100">잠금 해제 후 이런 내용을 확인할 수 있어요.</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
              {copy.unlockBenefits.map((item) => <li key={item} className="list-none">• {item}</li>)}
            </ul>
          </section>
          <p className="m-0 rounded-lg border border-amber-200/18 bg-amber-200/[0.075] p-3 text-sm font-semibold leading-6 text-amber-50">{copy.previewText}</p>
          <section className="rounded-lg border border-emerald-200/16 bg-emerald-200/[0.055] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-emerald-100">안심하고 확인하세요</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-xs leading-5 text-emerald-50/86">
              {copy.trustNotes.map((item) => <li key={item} className="list-none">• {item}</li>)}
            </ul>
          </section>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/10 bg-[linear-gradient(to_top,#070b1d_76%,rgba(7,11,29,0))] px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <span>{priceText(target)}</span>
            <span>{target.accessType === "free" ? "무료 기능" : "결제 후 기존 화면으로 이동"}</span>
          </div>
          <Link href={target.href} onClick={onClose} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f3d680] px-4 text-sm font-black text-[#111827] no-underline">
            {copy.ctaLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function FeatureMarketingLink({ target, href, className, children, onClick, "aria-label": ariaLabel }: FeatureMarketingLinkProps) {
  const [open, setOpen] = useState(false);
  const finalHref = href || target.href;
  const finalTarget = useMemo(() => ({ ...target, href: finalHref }), [target, finalHref]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !isPaidMarketingTarget(finalTarget)) return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <Link href={finalHref} className={className} onClick={handleClick} aria-label={ariaLabel}>
        {children}
      </Link>
      <FeatureMarketingDetailModal open={open} target={finalTarget} onClose={() => setOpen(false)} />
    </>
  );
}
