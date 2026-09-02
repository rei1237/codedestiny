"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import { useT, useTPick, type Translate, type TranslatePick } from "@/lib/i18n/useT";

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
  /* 셸 계약(#629): 실제 기능 목록(feats)이 마케팅 문구(painPoints)에 덮이지 않는다.
     feats 가 있으면 "주요 기능", 폴백으로 painPoints 를 쓸 때만 "이런 생각이 들 때" 제목을 붙인다. */
  feats: string[];
  featsAreFeatures: boolean;
  unlockBenefits: string[];
  previewText: string;
  trustNotes: string[];
  recommendedFor?: string[];
  /* 분석 깊이는 사람이 실측해 적은 양의 정수만 넣는다. 값이 없으면 섹션을 렌더하지 않는다. */
  reportScale?: { chapters?: number; sections?: number; dataPoints?: number; minWords?: number; readMinutes?: number };
  answersQuestions?: string[];
  analysisSteps?: { label: string; detail?: string }[];
  valueCompare?: { rows: { axis: string; free?: string; premium: string }[] };
  faq?: { q: string; a: string }[];
  ctaNote?: string;
  ctaLabel?: string;
};

/* ── 정본 카피(생성 JSON) ────────────────────────────────────────────────────
   카피 정본은 정적 셸 index.html 의 `FEATURE_MARKETING_COPY` 이고, 이 모듈은
   `npm run sync:marketing-copy` 가 옮겨 둔 사본을 읽는다. 예전에는 여기 손으로 베낀
   9종 포크(CATEGORY_COPY·EXPLICIT_COPY·EXPLICIT_ALIAS·EXPLICIT_DICT_NS)가 있었는데,
   셸이 65종을 저작하는 동안 그 9종만 갱신돼 같은 상품의 홈 시트와 허브 모달이 서로 다른
   말을 했다. 이제 두 화면이 한 데이터를 본다.

   🔴 정적 import 하지 않는다 — 400KB 짜리 JSON 이 통째로 클라이언트 번들에 실린다.
   모달은 유료 카드를 눌렀을 때만 열리므로, 그때 처음 청크를 받는다. */

type RawCopy = {
  category?: string;
  badge?: string;
  headline?: string;
  subheadline?: string;
  feats?: string[];
  painPoints?: string[];
  unlockBenefits?: string[];
  previewText?: string;
  trustNotes?: string[];
  recommendedFor?: string[];
  answersQuestions?: string[];
  analysisSteps?: { label: string; detail?: string }[];
  valueCompare?: { rows: { axis: string; free?: string; premium: string }[] };
  faq?: { q: string; a: string }[];
  reportScale?: FeatureMarketingCopy["reportScale"];
  ctaNote?: string;
  ctaLabel?: string;
  featureId?: string;
};

type MarketingEntry = { dictNs: string; copy: RawCopy };

type MarketingBook = {
  categoryKeyByKo: Record<string, string>;
  trustNotes: { paid: string[]; free: string[] };
  templates: Record<string, MarketingEntry>;
  items: Record<string, MarketingEntry>;
};

let bookPromise: Promise<MarketingBook> | null = null;
let featureIdIndex: Map<string, string> | null = null;

function loadMarketingBook(): Promise<MarketingBook> {
  if (!bookPromise) {
    bookPromise = import("@/lib/marketing/feature-marketing-copy.generated.json").then((mod) => {
      const book = (mod.default ?? mod) as unknown as MarketingBook;
      // 셸 타일은 `data-feature-key` 로도 카피를 찾는다. 허브가 넘기는 featureKey 가 셸 카피 키와
      // 다른 상품(작전실 등)을 위해 featureId 역인덱스를 마지막 후보로 둔다.
      const index = new Map<string, string>();
      for (const [key, entry] of Object.entries(book.items)) {
        const id = entry.copy.featureId;
        if (id && !index.has(id)) index.set(id, key);
      }
      featureIdIndex = index;
      return book;
    });
  }
  return bookPromise;
}

function useMarketingBook(enabled: boolean) {
  const [book, setBook] = useState<MarketingBook | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadMarketingBook().then((loaded) => {
      if (alive) setBook(loaded);
    }).catch(() => {
      // 카피를 못 받아도 제목·가격·CTA 는 그대로 동작해야 한다 — 모달을 비우지 않는다.
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return book;
}

/** 셸 `_marketingKeys` 의 React 판. 타일 DOM 대신 target 필드에서 같은 후보 목록을 만든다. */
function marketingKeys(target: FeatureMarketingTarget) {
  const keys: string[] = [];
  const push = (value?: string) => {
    const key = String(value || "").trim();
    if (key && !keys.includes(key)) keys.push(key);
  };
  push(target.featureKey);
  push(target.slug);
  // 셸의 `data-action` 자리 — 액션 URL 로 넘어오는 타깃은 이 값이 카피 키다.
  const action = /[?&]action=([^&#]+)/.exec(target.href || "");
  if (action) push(action[1]);
  push(target.href);
  const path = String(target.href || "").split("?")[0].split("#")[0];
  push(path);
  // 셸 카피는 `trailingSlash` 때문에 `/x` 와 `/x/` 가 따로 저작돼 있다. 둘 다 후보로 둔다.
  if (path && path !== "/") push(path.endsWith("/") ? path.replace(/\/+$/, "") : `${path}/`);
  return keys;
}

function findMarketingItem(book: MarketingBook, target: FeatureMarketingTarget): MarketingEntry | null {
  for (const key of marketingKeys(target)) {
    const entry = book.items[key];
    if (entry) return entry;
  }
  const aliased = target.featureKey ? featureIdIndex?.get(target.featureKey) : "";
  return (aliased && book.items[aliased]) || null;
}

function textKey(target: FeatureMarketingTarget) {
  return [target.featureKey, target.slug, target.href, target.category, target.title, target.description, target.subtitle]
    .filter(Boolean).join(" ").toLowerCase();
}

/**
 * 셸 `_inferMarketingTemplate` 의 React 판. **정규식과 순서를 셸과 같게 유지한다** —
 * 어긋나면 같은 기능이 홈에서는 오라클, 허브에서는 사주 템플릿으로 떨어져 두 화면의 문구가 갈린다.
 * `__tests__/ui/feature-marketing-modal-i18n.static.test.js` 가 셸 원문과 대조한다.
 */
function inferTemplate(target: FeatureMarketingTarget) {
  const raw = textKey(target);
  if (/music|album|song|track|곡|앨범|음악/.test(raw)) return "music";
  if (/sukuyo|sukyo|숙요/.test(raw)) return "sukuyo";
  if (/ziwei|jami|jamidusu|자미|명반/.test(raw)) return "ziwei";
  if (/vedic|veda|jyotish|베다/.test(raw)) return "vedic";
  if (/astro|astrology|별자리|점성/.test(raw)) return "astrology";
  if (/tarot|타로|reunion|love-relationship/.test(raw)) return "tarot";
  if (/oracle|juyuk|kemet|rune|geomancy|ifa|olympus|tea|신탁|오라클|주역|룬/.test(raw)) return "oracle";
  if (/report|lifebook|life-book|love-secret|operation-room|consultation|premium|리포트|상담/.test(raw)) return "report";
  return "saju";
}

/* ── 로케일화 ────────────────────────────────────────────────────────────────
   🔴 `useT` 가 아니라 `useTPick` 을 쓴다 — `ko.json` 에는 `featureMarketing` 네임스페이스가
   아예 없다(한국어는 셸 소스가 정본). `useT` 는 키가 없으면 "번역을 준비 중입니다"를 돌려주므로
   ko 로케일에서 모달이 통째로 덮인다. 셸의 `_pvwTrKeep` 과 같은 계약이다.

   🔴 필드마다 **그 값을 가져온 쪽의 네임스페이스**로 조회한다. 상품과 카테고리를 먼저 합쳐 놓고
   한 네임스페이스로 조회하면, 카테고리에서 온 값을 상품 사전에서 찾다가 못 찾아 한국어가 그대로
   남는다 — 2026-09-03 실측으로 en 사전 기준 204건이 그 자리다(셸 `_localizeMarketingCopy` 가
   ns 하나만 쓰기 때문에 셸에는 실제로 그 구멍이 있다. 셸 수정은 축2 범위 밖이라 여기서 되풀이만
   하지 않는다). 카테고리 템플릿 ns 9종은 `template_music` 의 badge·headline 을 빼면 전부 번역돼 있다. */

/** 사전에 값이 실제로 있는지. `useTPick` 은 없으면 넘긴 값을 돌려주므로 표식으로 판별한다. */
const PROBE = " probe";
function hasTranslation(pick: TranslatePick, key: string) {
  return pick(key, PROBE) !== PROBE;
}

function buildMarketingCopy(
  book: MarketingBook,
  target: FeatureMarketingTarget,
  paid: boolean,
  pick: TranslatePick,
): FeatureMarketingCopy {
  const templateId = inferTemplate(target);
  const template = book.templates[templateId] || book.templates.saju;
  const item = findMarketingItem(book, target);

  /* 셸 `_resolvePreviewData` 의 확정 순서 — 상품(copy) → 카테고리(template).
     얕은 병합에 맡기지 않는다(상품 전용 값 위에 카테고리 일반 값이 남는 사고가 있었다). */
  const from = <K extends keyof RawCopy>(field: K) => {
    if (item && item.copy[field] !== undefined) return { ns: item.dictNs, value: item.copy[field] as NonNullable<RawCopy[K]> };
    if (template.copy[field] !== undefined) return { ns: template.dictNs, value: template.copy[field] as NonNullable<RawCopy[K]> };
    return null;
  };
  const text = (field: keyof RawCopy, dictField: string) => {
    const source = from(field);
    return source ? (pick(`featureMarketing.${source.ns}.${dictField}`, source.value as string) as string) : undefined;
  };
  const list = (field: keyof RawCopy, dictField: string) => {
    const source = from(field);
    if (!source) return undefined;
    return (source.value as string[]).map((entry, i) => pick(`featureMarketing.${source.ns}.${dictField}.${i}`, entry) as string);
  };

  /* 카테고리 칩은 사전에 표기가 있는 것만 쓴다 — 매핑이 없는 표기(상담·휴먼 디자인·관상 등 6종)를
     그대로 두면 11개 로케일에 한국어가 샌다. 그때는 카테고리 템플릿 표기로 내려간다. */
  let chipName = (item?.copy.category || template.copy.category || "") as string;
  if (!book.categoryKeyByKo[chipName]) chipName = (template.copy.category as string) || chipName;
  const chipKey = book.categoryKeyByKo[chipName];
  const category = chipKey ? (pick(`featureMarketingCategory.${chipKey}`, chipName) as string) : chipName;

  /* 셸은 badge·headline 을 렌더하지 않아 사전에도 102개 ns 중 17개에만 있다(2026-09-03 실측).
     번역이 없는 자리에서 원문을 그대로 쓰면 비한국어 로케일에 한국어가 남으므로, 번역이 있는
     카테고리 템플릿 값으로 내려간다. 둘 다 없으면 원문이 남는다(`template_music` — 축4 PR-6 몫).
     ko 는 사전 자체가 없어 언제나 원문으로 떨어진다 — 그게 맞는 동작이다. */
  const toned = (field: "badge" | "headline") => {
    const own = item?.copy[field];
    if (item && own && hasTranslation(pick, `featureMarketing.${item.dictNs}.${field}`)) {
      return pick(`featureMarketing.${item.dictNs}.${field}`, own) as string;
    }
    const fallback = template.copy[field];
    if (fallback && hasTranslation(pick, `featureMarketing.${template.dictNs}.${field}`)) {
      return pick(`featureMarketing.${template.dictNs}.${field}`, fallback) as string;
    }
    return own || fallback || "";
  };

  /* feats 우선(#629). 템플릿에는 feats 가 없으므로 폴백은 painPoints 한 축이다. */
  const ownFeats = item?.copy.feats;
  const featsSource = ownFeats
    ? { ns: item!.dictNs, value: ownFeats, features: true }
    : (() => {
        const source = from("painPoints");
        return source ? { ns: source.ns, value: source.value as string[], features: false } : null;
      })();
  const feats = (featsSource?.value || []).map(
    (entry, i) => pick(`featureMarketing.${featsSource!.ns}.feats.${i}`, entry) as string,
  );

  /* 신뢰 문구는 셸 상수를 공유한다 — 기본값일 때는 상품 ns 가 아니라 공용 키를 본다. */
  const ownTrust = item?.copy.trustNotes;
  const trustNotes = ownTrust
    ? ownTrust.map((entry, i) => pick(`featureMarketing.${item!.dictNs}.premiumOutcomes.${i}`, entry) as string)
    : (paid ? book.trustNotes.paid : book.trustNotes.free).map(
        (entry, i) => pick(`featureMarketingTrust.${paid ? "paid" : "free"}.${i}`, entry) as string,
      );

  const steps = from("analysisSteps");
  const compare = from("valueCompare");
  const faq = from("faq");

  return {
    category,
    badge: toned("badge"),
    headline: toned("headline"),
    // 셸 `merged.tagline = subheadline||headline||...` — 사전 키는 어느 쪽에서 왔든 `tagline` 이다.
    subheadline: text("subheadline", "tagline") || text("headline", "tagline") || "",
    feats,
    featsAreFeatures: Boolean(featsSource?.features),
    unlockBenefits: list("unlockBenefits", "premiumChapters") || [],
    previewText: text("previewText", "premiumIntro") || "",
    trustNotes,
    recommendedFor: list("recommendedFor", "premiumAudience"),
    // 🔴 분석 깊이만 템플릿을 보지 않는다 — 카테고리 공용 숫자는 그 상품의 실제 분량이 아니다.
    reportScale: item?.copy.reportScale,
    answersQuestions: list("answersQuestions", "answersQuestions"),
    analysisSteps: steps
      ? (steps.value as NonNullable<RawCopy["analysisSteps"]>).map((step, i) => ({
          label: pick(`featureMarketing.${steps.ns}.analysisSteps.${i}.label`, step.label) as string,
          detail: pick(`featureMarketing.${steps.ns}.analysisSteps.${i}.detail`, step.detail),
        }))
      : undefined,
    // 🔴 무료 기능에 유료 프레이밍을 붙이지 않는다(셸 `if(merged.ct!=='paid')valueCompare=null`).
    valueCompare: paid && compare
      ? {
          rows: (compare.value as NonNullable<RawCopy["valueCompare"]>).rows.map((row, i) => ({
            axis: pick(`featureMarketing.${compare.ns}.valueCompare.${i}.axis`, row.axis) as string,
            free: pick(`featureMarketing.${compare.ns}.valueCompare.${i}.free`, row.free),
            premium: pick(`featureMarketing.${compare.ns}.valueCompare.${i}.premium`, row.premium) as string,
          })),
        }
      : undefined,
    faq: faq
      ? (faq.value as NonNullable<RawCopy["faq"]>).map((entry, i) => ({
          q: pick(`featureMarketing.${faq.ns}.faq.${i}.q`, entry.q) as string,
          a: pick(`featureMarketing.${faq.ns}.faq.${i}.a`, entry.a) as string,
        }))
      : undefined,
    ctaNote: text("ctaNote", "ctaNote"),
    ctaLabel: text("ctaLabel", "fallbackCta"),
  };
}

const SCALE_LABELS: [keyof NonNullable<FeatureMarketingCopy["reportScale"]>, string][] = [
  ["chapters", "preview.scaleChapters"],
  ["sections", "preview.scaleSections"],
  ["dataPoints", "preview.scaleDataPoints"],
  ["minWords", "preview.scaleMinWords"],
  ["readMinutes", "preview.scaleReadMinutes"],
];

/* 숫자 자릿수 구분은 기존 동작(ko-KR)을 그대로 둔다 — 하드코딩된 로케일 포맷 정리는
   별건(PR #983)이고, 이 칩의 값 범위에서는 서식이 갈리지 않는다. */
function scaleChips(scale: FeatureMarketingCopy["reportScale"], t: Translate): string[] {
  if (!scale) return [];
  return SCALE_LABELS.flatMap(([key, translationKey]) => {
    const value = scale[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return [];
    return [t(translationKey, { count: value.toLocaleString("ko-KR") })];
  });
}

type FeatureMarketingLinkProps = {
  target: FeatureMarketingTarget;
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
};

export function isPaidMarketingTarget(target: FeatureMarketingTarget) {
  if (target.accessType && target.accessType !== "free") return true;
  // 🔴 accessType="free" 는 선언이고 아래는 휴리스틱이다. 선언이 이긴다 —
  // 그러지 않으면 priceLabel "부분 유료"/"20,000원" 같은 문구 하나로 무료 기능이 유료로 잡혀
  // 팝업이 "왜 유료인가요" 표를 띄우고, featureKey 가 없어 가격도 못 받으므로
  // priceReady 가 영영 false 라 CTA 까지 잠긴다(사주·타로·숙요·베다·점성술 5종 실측).
  if (target.accessType === "free") return false;
  if ((target.coinPrice || 0) > 0) return true;
  const badgeText = (target.badges || []).map((badge) => badge.text || "").join(" ");
  const raw = `${target.href} ${target.description || ""} ${target.subtitle || ""} ${target.priceLabel || ""} ${badgeText}`;
  return /(원|결제|코인|유료|해금|premium|paid|life-book-ai|love-secret-ai|ziwei-ai|tarot\/prompt-maker|saju\/love-simulation|saju\/destiny-bias|saju\/destiny-meeting-place|palm-reading)/i.test(raw);
}

/** 생성 JSON 이 도착하기 전에는 `null` 이다 — 호출부는 제목·가격·CTA 만으로 먼저 그린다. */
export function useFeatureMarketingCopy(target: FeatureMarketingTarget, enabled = true): FeatureMarketingCopy | null {
  const pick = useTPick();
  const book = useMarketingBook(enabled);
  const paid = isPaidMarketingTarget(target);
  return useMemo(() => (book ? buildMarketingCopy(book, target, paid, pick) : null), [book, paid, pick, target]);
}

function priceText(target: FeatureMarketingTarget, price: { label: string; loading: boolean }, t: Translate) {
  if (target.accessType === "free") return t("preview.priceFree");
  if (price.loading) return t("preview.priceLoading");
  return price.label || t("preview.priceUnknown");
}

const modalSheetScrollStyle: CSSProperties = {
  maxHeight: "calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom)))",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

// 카드를 탭해 모달이 열린 직후, 같은 좌표로 떨어지는 유령 탭·연타가 백드롭에 맞아
// 모달을 즉시 닫아 버리던 문제를 막는다. 모바일에서 시트는 하단 정렬이라 화면 상단이
// 전부 백드롭이고, 카드가 상단에 있으면 두 번째 탭이 정확히 백드롭에 떨어진다.
const BACKDROP_CLOSE_GUARD_MS = 500;

// 이동이 시작되지 않는 최악의 경우에도 버튼이 영구히 잠기지 않게 하는 안전장치.
const NAV_PENDING_FAILSAFE_MS = 6000;

function trimTrailingSlash(path: string) {
  return String(path || "").replace(/\/+$/, "") || "/";
}

// 정적 셸 액션 URL(`/index.html?action=...`)과 외부 주소는 App Router 로 이동할 수 없다.
// 이런 링크는 하드 이동으로 보낸다.
function isRouterNavigable(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  return !href.includes("index.html") && !href.includes("action=");
}

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
  const openedAtRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [navPending, setNavPending] = useState(false);
  const t = useT();
  const copy = useFeatureMarketingCopy(target, open);
  const canonicalPrice = useServerPrice({ featureKey: target.featureKey });
  const isPaidTarget = isPaidMarketingTarget(target);
  const priceReady = !isPaidTarget || Boolean(canonicalPrice.label);
  useBodyScrollLock(open);

  // 오픈 시각은 `open` 이 바뀔 때만 갱신한다 — onClose 처럼 매 렌더 새로 만들어지는 값에
  // 묶으면 가드 기준 시각이 계속 밀려 백드롭 닫기가 영구히 무력화된다.
  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
    else setNavPending(false);
  }, [open]);

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

  useEffect(() => {
    if (!navPending) return;
    const timer = window.setTimeout(() => setNavPending(false), NAV_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [navPending]);

  const closeFromBackdrop = useCallback(() => {
    if (Date.now() - openedAtRef.current < BACKDROP_CLOSE_GUARD_MS) return;
    if (navPending) return;
    onClose();
  }, [navPending, onClose]);

  const handleCtaClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭·수정키 클릭은 브라우저 기본 동작에 맡긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isPaidTarget && !canonicalPrice.label) return;
    if (navPending) return;

    if (!isRouterNavigable(target.href)) {
      setNavPending(true);
      window.location.assign(target.href);
      return;
    }

    // 이미 그 화면이면 이동할 게 없다 — 모달만 닫는다(대기 표시로 갇히는 것 방지).
    if (trimTrailingSlash(pathname) === trimTrailingSlash(target.href)) {
      onClose();
      return;
    }

    // 여기서 모달을 닫지 않는다. 닫으면 라우트 전환이 끝날 때까지 화면에 아무 변화가 없어
    // "버튼을 눌렀는데 팝업만 닫히고 아무 일도 안 일어난다"로 보이고, 그게 연타·이탈을 부른다.
    // 이동이 완료되면 이 트리가 언마운트되므로 별도 닫기 처리가 필요 없다.
    setNavPending(true);
    router.push(target.href);
  }, [canonicalPrice.label, isPaidTarget, navPending, onClose, pathname, router, target.href]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/72 px-0 sm:items-center sm:px-4" role="presentation" onClick={closeFromBackdrop}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="featureMarketingTitle"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-white/12 bg-[linear-gradient(180deg,#081427,#111a34_56%,#070b1d)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:max-w-[620px] sm:rounded-2xl sm:p-6"
        style={modalSheetScrollStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {copy?.category && <span className="rounded-full border border-sky-200/25 bg-sky-300/10 px-2.5 py-1 text-[11px] font-black text-sky-100">{copy.category}</span>}
              {copy?.badge && <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">{copy.badge}</span>}
            </div>
            <h2 id="featureMarketingTitle" className="m-0 text-xl font-black leading-tight text-[#fff3c4]">{target.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8 text-lg font-black text-white" aria-label={t("common.close")}>
            ×
          </button>
        </div>

        {copy ? (
          <>
            <p className="m-0 text-sm font-bold leading-6 text-slate-100">{copy.headline}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{copy.subheadline}</p>

            {/* 순서 계약 — 정적 셸(index.html)의 팝업과 같다:
                무엇을 얻는가 → 어떻게 분석하는가 → 실제 리포트 예시 → 누구에게 맞는가 → 가격 → CTA */}
            <div className="mt-4 grid gap-3">
              {/* ① 무엇을 얻는가 */}
              {copy.feats.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-sky-100">{t(copy.featsAreFeatures ? "preview.featuresLabel" : "preview.painPointsLabel")}</h3>
                  <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                    {copy.feats.map((item) => <li key={item} className="list-none">• {item}</li>)}
                  </ul>
                </section>
              )}
              {copy.previewText && <p className="m-0 rounded-lg border border-amber-200/18 bg-amber-200/[0.075] p-3 text-sm font-semibold leading-6 text-amber-50">{copy.previewText}</p>}
              {copy.unlockBenefits.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-amber-100">{t("preview.deliverablesLabel")}</h3>
                  <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                    {copy.unlockBenefits.map((item) => (
                      <li key={item} className="list-none pl-5 -indent-5"><span className="pr-2 font-black text-amber-200">✓</span>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              {scaleChips(copy.reportScale, t).length > 0 && (
                <section>
                  <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.scaleLabel")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scaleChips(copy.reportScale, t).map((chip) => (
                      <span key={chip} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs font-black text-slate-100">{chip}</span>
                    ))}
                  </div>
                </section>
              )}
              {copy.answersQuestions && copy.answersQuestions.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-sky-100">{t("preview.questionsLabel")}</h3>
                  <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                    {copy.answersQuestions.map((item) => <li key={item} className="list-none">• {item}</li>)}
                  </ul>
                </section>
              )}

              {/* ② 어떻게 분석하는가 — 사용자가 이해하는 단계까지만(내부 로직·모델은 쓰지 않는다) */}
              {copy.analysisSteps && copy.analysisSteps.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.stepsLabel")}</h3>
                  <ol className="m-0 grid list-none gap-2.5 p-0">
                    {copy.analysisSteps.map((step, index) => (
                      <li key={step.label} className="grid grid-cols-[20px_1fr] gap-2.5">
                        <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border border-amber-200/60 text-[10px] font-black text-amber-200">{index + 1}</span>
                        <span>
                          <b className="block text-sm font-black text-slate-100">{step.label}</b>
                          {step.detail && <span className="mt-0.5 block text-xs leading-5 text-slate-300">{step.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* ④ 누구에게 맞는가 */}
              {copy.recommendedFor && copy.recommendedFor.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-violet-100">{t("preview.recommendedLabel")}</h3>
                  <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                    {copy.recommendedFor.map((item) => <li key={item} className="list-none">• {item}</li>)}
                  </ul>
                </section>
              )}

              {/* ⑤ 가격 — 무료와 무엇이 다른지 먼저 납득시키고 신뢰 요소를 붙인다 */}
              {copy.valueCompare && copy.valueCompare.rows.length > 0 && (
                <section>
                  <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.compareLabel")}</h3>
                  <div role="table" className="overflow-hidden rounded-lg border border-white/10">
                    <div role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 bg-white/[0.06]">
                      {["", t("preview.compareFree"), t("preview.comparePremium")].map((head, i) => (
                        <span key={head || "axis"} role="columnheader" className={`px-2.5 py-2 text-xs font-black text-slate-100${i === 2 ? " bg-white/[0.05]" : ""}`}>{head}</span>
                      ))}
                    </div>
                    {copy.valueCompare.rows.slice(0, 5).map((row) => (
                      <div key={row.axis} role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 last:border-b-0">
                        <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-300">{row.axis}</span>
                        <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-400">{row.free?.trim() || "—"}</span>
                        <span role="cell" className="bg-white/[0.05] px-2.5 py-2 text-xs font-bold leading-5 text-slate-100">{row.premium}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {copy.trustNotes.length > 0 && (
                <section className="rounded-lg border border-emerald-200/16 bg-emerald-200/[0.055] p-3">
                  <h3 className="m-0 mb-2 text-xs font-black text-emerald-100">{t("preview.outcomesLabel")}</h3>
                  <ul className="m-0 grid gap-1.5 p-0 text-xs leading-5 text-emerald-50/86">
                    {copy.trustNotes.map((item) => <li key={item} className="list-none">• {item}</li>)}
                  </ul>
                </section>
              )}

              {/* ⑥ FAQ — 기본 접힘. 펼쳐 두면 스크롤이 길어져 CTA 도달이 늦어진다. */}
              {copy.faq && copy.faq.length > 0 && (
                <section>
                  <h3 className="m-0 mb-1 text-xs font-black text-slate-300">{t("preview.faqLabel")}</h3>
                  <div className="rounded-lg border border-white/10">
                    {copy.faq.slice(0, 5).map((item) => (
                      <details key={item.q} className="border-b border-white/10 last:border-b-0">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-slate-100">{item.q}</summary>
                        <div className="px-3 pb-3 text-xs leading-6 text-slate-300">{item.a}</div>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          // 카피 청크(400KB)를 받는 동안 — 제목·가격·CTA 는 이미 위아래에 있으므로 본문만 자리를 잡는다.
          <div className="mt-4 grid gap-3" aria-hidden>
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
            ))}
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/10 bg-[linear-gradient(to_top,#070b1d_76%,rgba(7,11,29,0))] px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <span aria-live="polite">{priceText(target, canonicalPrice, t)}</span>
            <span>{t(target.accessType === "free" ? "preview.accessFree" : "preview.accessPaid")}</span>
          </div>
          <Link
            href={target.href}
            onClick={handleCtaClick}
            aria-busy={navPending}
            aria-disabled={!priceReady}
            tabIndex={priceReady ? undefined : -1}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f3d680] px-4 text-sm font-black text-[#111827] no-underline transition-opacity ${navPending || !priceReady ? "pointer-events-none opacity-55" : ""}`}
          >
            {navPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-[#111827]" aria-hidden />
                {t("preview.navPending")}
              </>
            ) : (copy?.ctaLabel || t(target.accessType === "premium_report" ? "preview.ctaReport" : "preview.ctaPaid"))}
          </Link>
          <p className="mb-1 mt-2 text-center text-xs leading-5 text-slate-400">
            {copy?.ctaNote || t(target.accessType === "free" ? "preview.ctaNoteFree" : "preview.ctaNoteDefault")}
          </p>
        </div>
      </section>
    </div>
  );
}

export function FeatureMarketingLink({ target, href, className, children, onClick, "aria-label": ariaLabel }: FeatureMarketingLinkProps) {
  const [open, setOpen] = useState(false);
  // 무료 기능은 팝업 없이 바로 이동한다. 그런데 대상 라우트의 청크가 콜드면 전환이 수 초 걸리고
  // 그 동안 화면이 그대로라, :active 로 눌린 표시가 손을 떼는 순간 사라진 뒤에는 아무 피드백이 없다.
  // 탭이 접수됐다는 표시를 이동이 시작될 때까지 남긴다.
  const [navigating, setNavigating] = useState(false);
  const finalHref = href || target.href;
  const finalTarget = useMemo(() => ({ ...target, href: finalHref }), [target, finalHref]);

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setTimeout(() => setNavigating(false), NAV_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [navigating]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!isPaidMarketingTarget(finalTarget)) {
      // 기본 동작(next/link 이동)을 막지 않는다 — 표시만 남긴다.
      if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setNavigating(true);
      return;
    }
    event.preventDefault();
    setOpen(true);
  };

  // 매 렌더 새 함수를 넘기면 모달 쪽 effect(포커스 이동·키 리스너)가 계속 재실행된다.
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Link
        href={finalHref}
        className={navigating ? `${className || ""} opacity-70 transition-opacity` : className}
        onClick={handleClick}
        aria-busy={navigating}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
      {open ? <FeatureMarketingDetailModal open target={finalTarget} onClose={handleClose} /> : null}
    </>
  );
}
