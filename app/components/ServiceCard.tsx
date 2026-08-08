import { useEffect, useRef, useState } from "react";
import type { DestinyIconName } from "./icons/DestinyIcon";
import { FeatureMarketingLink } from "./FeatureMarketingDetailModal";
import FeatureSymbol from "./icons/FeatureSymbol";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

type Badge = {
  text: string;
  tone?: "free" | "coin" | "new" | "soft";
};

export type ServiceCardModel = {
  title: string;
  description: string;
  href: string;
  emoji?: string;
  iconName?: DestinyIconName;
  image?: string;
  badges?: Badge[];
  cta?: string;
};

function cleanTitle(raw: string) {
  return raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function badgeClass(tone: Badge["tone"]) {
  if (tone === "free") return "border-emerald-200/45 bg-emerald-400/15 text-emerald-50";
  if (tone === "coin") return "border-amber-200/55 bg-amber-400/20 text-amber-50";
  if (tone === "new") return "border-pink-200/55 bg-pink-400/20 text-pink-50";
  return "border-sky-100/30 bg-sky-900/35 text-sky-50";
}

const SERVICE_CARD_CTA: Record<LoadingLocale, string> = {
  ko: "바로가기",
  en: "Open",
  ja: "開く",
  "zh-CN": "打开",
  "zh-TW": "開啟",
  vi: "Mở",
  hi: "खोलें",
  es: "Abrir",
  fr: "Ouvrir",
  de: "Öffnen",
  nl: "Openen",
  ms: "Buka",
};

type BadgeTone = NonNullable<Badge["tone"]> | "default";

const SERVICE_CARD_BADGE_FALLBACK: Record<LoadingLocale, Record<BadgeTone, string>> = {
  ko: { free: "무료", coin: "유료", new: "신규", soft: "안내", default: "안내" },
  en: { free: "Free", coin: "Paid", new: "New", soft: "Guide", default: "Guide" },
  ja: { free: "無料", coin: "有料", new: "新着", soft: "ガイド", default: "ガイド" },
  "zh-CN": { free: "免费", coin: "付费", new: "新", soft: "指南", default: "指南" },
  "zh-TW": { free: "免費", coin: "付費", new: "新", soft: "指南", default: "指南" },
  vi: { free: "Miễn phí", coin: "Trả phí", new: "Mới", soft: "Gợi ý", default: "Gợi ý" },
  hi: { free: "मुफ्त", coin: "सशुल्क", new: "नया", soft: "मार्गदर्शिका", default: "मार्गदर्शिका" },
  es: { free: "Gratis", coin: "De pago", new: "Nuevo", soft: "Guía", default: "Guía" },
  fr: { free: "Gratuit", coin: "Payant", new: "Nouveau", soft: "Guide", default: "Guide" },
  de: { free: "Gratis", coin: "Kostenpflichtig", new: "Neu", soft: "Guide", default: "Guide" },
  nl: { free: "Gratis", coin: "Betaald", new: "Nieuw", soft: "Gids", default: "Gids" },
  ms: { free: "Percuma", coin: "Berbayar", new: "Baharu", soft: "Panduan", default: "Panduan" },
};

// 유료 뱃지는 한국어 원문이 이미 원화 표기("3,000원", "궁합 5,000원", "3,000원~12,000원")다.
// 비한국어 로케일에서 통째로 fallback 단어로 치환하면 가격이 사라지므로, 금액만 뽑아
// 통화 표기(lib/payment/coin-pricing.ts의 비한국어 규칙과 동일한 "KRW 5,000")로 바꾼다.
// 한국어 수식어(궁합/해금/1회)는 번역 자산이 없어 생략한다.
function toLocalizedPriceBadge(text?: string) {
  const converted = String(text || "").replace(/([\d,]+)\s*원/g, (_match, amount) => `KRW ${amount}`);
  const priceOnly = converted.match(/KRW [\d,]+(?:\s*~\s*KRW [\d,]+)?/);
  return priceOnly ? priceOnly[0] : "";
}

function hasKoreanText(value?: string) {
  return /[가-힣]/.test(String(value || ""));
}

function resolveBadgeText(badge: Badge, locale: LoadingLocale) {
  if (locale === "ko" || !hasKoreanText(badge.text)) return badge.text;
  const tone = badge.tone || "default";
  if (tone === "coin") {
    const price = toLocalizedPriceBadge(badge.text);
    if (price) return price;
  }
  return SERVICE_CARD_BADGE_FALLBACK[locale]?.[tone] || SERVICE_CARD_BADGE_FALLBACK.en[tone];
}

export default function ServiceCard({ item }: { item: ServiceCardModel }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const touchStartPos = useRef({ x: 0, y: 0 });
  const defaultCta = SERVICE_CARD_CTA[locale] || SERVICE_CARD_CTA.ko;
  const cta = item.cta && (locale === "ko" || !hasKoreanText(item.cta)) ? item.cta : defaultCta;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setIsScrolling(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isScrolling) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const resolvedImage = item.image
    ? getAssetUrlFromPublicPath(item.image, { fallbackPublicPath: item.image })
    : undefined;

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-100/15 bg-[linear-gradient(160deg,rgba(8,18,42,0.94),rgba(16,31,62,0.92)_56%,rgba(27,29,62,0.92))] p-4 shadow-[0_14px_34px_rgba(5,11,29,0.45)] transition duration-300 hover:-translate-y-1 hover:border-sky-100/40 hover:shadow-[0_22px_48px_rgba(7,18,46,0.58)]]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.18),transparent_58%)] opacity-90" aria-hidden />
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="relative z-10 text-sm font-extrabold leading-6 text-slate-50">
          <span className="mr-1.5 inline-flex align-middle text-sky-100/95">
            <FeatureSymbol route={item.href} iconName={item.iconName} size={16} variant="soft" />
          </span>
          {cleanTitle(item.title)}
        </h3>
      </div>

      {resolvedImage && (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-100/15">
          <img
            src={resolvedImage}
            alt={item.title}
            className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" aria-hidden />
        </div>
      )}

      <p className="mb-3 min-h-[44px] text-xs leading-5 text-slate-200/95">{item.description}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(item.badges || []).map((badge) => {
          const text = resolveBadgeText(badge, locale);
          return (
            <span
              key={`${item.title}-${text}`}
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${badgeClass(badge.tone)}`}
            >
              {text}
            </span>
          );
        })}
      </div>

      <div className="mt-auto">
        <FeatureMarketingLink
          href={item.href}
          target={{
            title: cleanTitle(item.title),
            description: item.description,
            href: item.href,
            badges: item.badges,
          }}
          onClick={handleClick}
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-sky-100/35 bg-[linear-gradient(135deg,rgba(56,189,248,0.32),rgba(30,64,175,0.38))] px-3 py-2 text-xs font-semibold text-sky-50 transition duration-300 group-hover:border-sky-100/55 group-hover:bg-[linear-gradient(135deg,rgba(56,189,248,0.42),rgba(37,99,235,0.46))]"
        >
          {cta}
          <span aria-hidden>→</span>
        </FeatureMarketingLink>
      </div>
    </article>
  );
}
