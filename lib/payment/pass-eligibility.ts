import {
  MIN_PASS_COVERABLE_COIN,
  MONTHLY_PASS_LIMITS_KRW,
  PASS_LIMITS_KRW,
} from "@/worker/lib/profile-limits";

export type PassTier = "standard" | "premium" | "vvip" | "family";

export type PassUsageSnapshot = {
  tier?: string | null;
  limitKRW?: number | null;
  usedKRW?: number | null;
  remainingKRW?: number | null;
  perItemLimitKRW?: number | null;
};

export type PassEligibility = {
  minimumTier: PassTier | null;
  coveredByCurrentPass: boolean;
  monthlyExhausted: boolean;
  label: string;
};

const PASS_TIER_ORDER: PassTier[] = ["standard", "premium", "vvip", "family"];
const PASS_TIER_LABELS: Record<string, Record<PassTier, string>> = {
  ko: { standard: "스탠다드 꿀", premium: "프리미엄 꿀", vvip: "VVIP 꿀단지", family: "Code Destiny Family" },
  en: { standard: "Standard Honey", premium: "Premium Honey", vvip: "VVIP Honey Jar", family: "Code Destiny Family" },
  ja: { standard: "スタンダードハニー", premium: "プレミアムハニー", vvip: "VVIPハニージャー", family: "Code Destiny Family" },
  "zh-cn": { standard: "标准蜂蜜", premium: "高级蜂蜜", vvip: "VVIP蜂蜜罐", family: "Code Destiny Family" },
  "zh-tw": { standard: "標準蜂蜜", premium: "高級蜂蜜", vvip: "VVIP蜂蜜罐", family: "Code Destiny Family" },
  vi: { standard: "Mật ong Standard", premium: "Mật ong Premium", vvip: "Hũ mật ong VVIP", family: "Code Destiny Family" },
  hi: { standard: "स्टैंडर्ड हनी", premium: "प्रीमियम हनी", vvip: "VVIP हनी जार", family: "Code Destiny Family" },
  es: { standard: "Miel estándar", premium: "Miel premium", vvip: "Tarro de miel VVIP", family: "Code Destiny Family" },
  fr: { standard: "Miel Standard", premium: "Miel Premium", vvip: "Pot de miel VVIP", family: "Code Destiny Family" },
  de: { standard: "Standard-Honig", premium: "Premium-Honig", vvip: "VVIP-Honigglas", family: "Code Destiny Family" },
  nl: { standard: "Standard Honing", premium: "Premium Honing", vvip: "VVIP Honingpot", family: "Code Destiny Family" },
  ms: { standard: "Madu Standard", premium: "Madu Premium", vvip: "Balang Madu VVIP", family: "Code Destiny Family" },
};

function normalizeLocale(locale: string | undefined): string {
  const normalized = String(locale || "ko").trim().toLowerCase().replace("_", "-");
  return normalized === "zh" || normalized === "zh-hans" ? "zh-cn" : normalized === "zh-hant" ? "zh-tw" : normalized;
}

function getTierLabels(locale?: string): Record<PassTier, string> {
  return PASS_TIER_LABELS[normalizeLocale(locale)] || PASS_TIER_LABELS.ko;
}

const PASS_ELIGIBILITY_COPY: Record<string, {
  notCovered: string;
  exhausted: string;
  included: (tier: string) => string;
}> = {
  ko: { notCovered: "이용권 미포함 · 단건 구매", exhausted: "이용권 적용 대상 · 이번 이용권 기간 한도 소진", included: (tier) => `${tier} 이상 이용권 포함` },
  en: { notCovered: "Not covered by pass · Single purchase", exhausted: "Pass-eligible · Pass period limit exhausted", included: (tier) => `${tier} pass or higher included` },
  ja: { notCovered: "利用권対象外 · 単品購入", exhausted: "利用권対象 · 利用권期間の上限に達しました", included: (tier) => `${tier}以上の利用권に含まれます` },
  "zh-cn": { notCovered: "不包含在利用券内 · 单次购买", exhausted: "适用利用券 · 本利用券期间额度已用尽", included: (tier) => `包含在${tier}及以上利用券内` },
  "zh-tw": { notCovered: "不包含在利用券內 · 單次購買", exhausted: "適用利用券 · 本利用券期間額度已用盡", included: (tier) => `包含在${tier}及以上利用券內` },
  vi: { notCovered: "Không bao gồm trong vé · Mua lẻ", exhausted: "Được áp dụng · Đã hết hạn mức trong kỳ vé", included: (tier) => `Bao gồm từ vé ${tier} trở lên` },
  hi: { notCovered: "पास में शामिल नहीं · एकल खरीद", exhausted: "पास के लिए योग्य · पास अवधि की सीमा समाप्त", included: (tier) => `${tier} पास या उससे ऊपर में शामिल` },
  es: { notCovered: "No incluido en el pase · Compra individual", exhausted: "Incluido en el pase · Límite del periodo agotado", included: (tier) => `Incluido desde el pase ${tier}` },
  fr: { notCovered: "Non inclus dans le pass · Achat à l’unité", exhausted: "Éligible au pass · Limite de la période épuisée", included: (tier) => `Inclus avec le pass ${tier} ou supérieur` },
  de: { notCovered: "Nicht im Pass enthalten · Einzelkauf", exhausted: "Pass-berechtigt · Limit des Passzeitraums erreicht", included: (tier) => `Im ${tier}-Pass oder höher enthalten` },
  nl: { notCovered: "Niet inbegrepen in pas · Losse aankoop", exhausted: "Geschikt voor pas · Limiet van de pasperiode bereikt", included: (tier) => `Inbegrepen vanaf de ${tier}-pas` },
  ms: { notCovered: "Tidak termasuk dalam pas · Pembelian tunggal", exhausted: "Layak untuk pas · Had tempoh pas telah habis", included: (tier) => `Termasuk dalam pas ${tier} atau lebih tinggi` },
};

function getEligibilityCopy(locale?: string) {
  return PASS_ELIGIBILITY_COPY[normalizeLocale(locale)] || PASS_ELIGIBILITY_COPY.en;
}

function normalizeTier(value: unknown): PassTier | null {
  return PASS_TIER_ORDER.includes(value as PassTier) ? value as PassTier : null;
}

function resolveMinimumTier(canonicalPriceKRW: number): PassTier | null {
  const price = Math.max(0, Math.floor(Number(canonicalPriceKRW || 0)));
  return PASS_TIER_ORDER.find((tier) => price <= Number(PASS_LIMITS_KRW[tier] || 0)) || null;
}

/** Display-only description of pass coverage. Server payment enforcement remains authoritative. */
export function describePassEligibility(
  canonicalPriceKRW: number,
  passUsage?: PassUsageSnapshot | null,
  locale?: string,
): PassEligibility {
  const minimumTier = resolveMinimumTier(canonicalPriceKRW);
  const currentTier = normalizeTier(passUsage?.tier);
  const currentRank = currentTier ? PASS_TIER_ORDER.indexOf(currentTier) : -1;
  const minimumRank = minimumTier ? PASS_TIER_ORDER.indexOf(minimumTier) : -1;
  const monthlyLimitKRW = currentTier ? Number(MONTHLY_PASS_LIMITS_KRW[currentTier] || 0) : 0;
  const usedKRW = Math.max(0, Number(passUsage?.usedKRW || 0));
  const remainingKRW = passUsage?.remainingKRW == null
    ? Math.max(0, monthlyLimitKRW - usedKRW)
    : Math.max(0, Number(passUsage.remainingKRW));
  const minimumCoverableKRW = Number(MIN_PASS_COVERABLE_COIN || 0) * 100;
  const monthlyExhausted = Boolean(
    currentTier
      && monthlyLimitKRW > 0
      && remainingKRW < minimumCoverableKRW,
  );
  const coveredByCurrentPass = Boolean(minimumTier && currentTier && currentRank >= minimumRank && !monthlyExhausted);

  if (!minimumTier) {
    return { minimumTier: null, coveredByCurrentPass: false, monthlyExhausted, label: getEligibilityCopy(locale).notCovered };
  }
  if (monthlyExhausted && currentRank >= minimumRank) {
    return {
      minimumTier,
      coveredByCurrentPass: false,
      monthlyExhausted: true,
      label: getEligibilityCopy(locale).exhausted,
    };
  }
  return {
    minimumTier,
    coveredByCurrentPass,
    monthlyExhausted: false,
    label: getEligibilityCopy(locale).included(getTierLabels(locale)[minimumTier]),
  };
}

export function getPassTierLabel(tier: string | null | undefined, locale?: string): string {
  const normalized = normalizeTier(tier);
  return normalized ? getTierLabels(locale)[normalized] : "";
}
