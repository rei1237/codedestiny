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
  ko: { standard: "작은 꿀단지", premium: "중간 꿀단지", vvip: "큰 꿀단지", family: "패밀리 꿀단지" },
  en: { standard: "Small Honey Jar", premium: "Medium Honey Jar", vvip: "Large Honey Jar", family: "Family Honey Jar" },
  ja: { standard: "小さなはちみつ壺", premium: "中くらいのはちみつ壺", vvip: "大きなはちみつ壺", family: "ファミリーはちみつ壺" },
  "zh-cn": { standard: "小蜜罐", premium: "中蜜罐", vvip: "大蜜罐", family: "家庭蜜罐" },
  "zh-tw": { standard: "小蜜罐", premium: "中蜜罐", vvip: "大蜜罐", family: "家庭蜜罐" },
  vi: { standard: "Hũ mật ong nhỏ", premium: "Hũ mật ong vừa", vvip: "Hũ mật ong lớn", family: "Hũ mật ong gia đình" },
  hi: { standard: "छोटा शहद जार", premium: "मध्यम शहद जार", vvip: "बड़ा शहद जार", family: "फ़ैमिली शहद जार" },
  es: { standard: "Tarro de miel pequeño", premium: "Tarro de miel mediano", vvip: "Tarro de miel grande", family: "Tarro de miel familiar" },
  fr: { standard: "Petit pot de miel", premium: "Pot de miel moyen", vvip: "Grand pot de miel", family: "Pot de miel familial" },
  de: { standard: "Kleines Honigglas", premium: "Mittleres Honigglas", vvip: "Großes Honigglas", family: "Familien-Honigglas" },
  nl: { standard: "Kleine honingpot", premium: "Middelgrote honingpot", vvip: "Grote honingpot", family: "Gezinshoningpot" },
  ms: { standard: "Balang Madu Kecil", premium: "Balang Madu Sederhana", vvip: "Balang Madu Besar", family: "Balang Madu Keluarga" },
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
  ko: { notCovered: "이용권 미포함 · 단건 구매", exhausted: "이용권 적용 대상 · 이용 한도 소진 · 이용권 재구매 또는 단건 구매", included: (tier) => `${tier} 이상 이용권 포함` },
  en: { notCovered: "Not covered by pass · Single purchase", exhausted: "Pass-eligible · Usage limit used up · Buy a new pass or single purchase", included: (tier) => `${tier} pass or higher included` },
  ja: { notCovered: "利用券対象外 · 単品購入", exhausted: "利用券対象 · 利用上限に達しました · 利用券の再購入または単品購入", included: (tier) => `${tier}以上の利用券に含まれます` },
  "zh-cn": { notCovered: "不包含在利用券内 · 单次购买", exhausted: "适用利用券 · 使用额度已用尽 · 重新购买利用券或单次购买", included: (tier) => `包含在${tier}及以上利用券内` },
  "zh-tw": { notCovered: "不包含在利用券內 · 單次購買", exhausted: "適用利用券 · 使用額度已用盡 · 重新購買利用券或單次購買", included: (tier) => `包含在${tier}及以上利用券內` },
  vi: { notCovered: "Không bao gồm trong vé · Mua lẻ", exhausted: "Được áp dụng vé · Đã dùng hết hạn mức sử dụng · Mua vé mới hoặc mua lẻ", included: (tier) => `Bao gồm từ vé ${tier} trở lên` },
  hi: { notCovered: "पास में शामिल नहीं · एकल खरीद", exhausted: "पास के लिए योग्य · उपयोग सीमा समाप्त · नया पास या एकल खरीद", included: (tier) => `${tier} पास या उससे ऊपर में शामिल` },
  es: { notCovered: "No incluido en el pase · Compra individual", exhausted: "Apto para el pase · Límite de uso agotado · Nuevo pase o compra individual", included: (tier) => `Incluido desde el pase ${tier}` },
  fr: { notCovered: "Non inclus dans le pass · Achat à l’unité", exhausted: "Éligible au pass · Limite d’utilisation épuisée · Nouveau pass ou achat à l’unité", included: (tier) => `Inclus avec le pass ${tier} ou supérieur` },
  de: { notCovered: "Nicht im Pass enthalten · Einzelkauf", exhausted: "Pass-berechtigt · Nutzungslimit aufgebraucht · Neuer Pass oder Einzelkauf", included: (tier) => `Im ${tier}-Pass oder höher enthalten` },
  nl: { notCovered: "Niet inbegrepen in pas · Losse aankoop", exhausted: "Geschikt voor pas · Gebruikslimiet bereikt · Nieuwe pas of losse aankoop", included: (tier) => `Inbegrepen vanaf de ${tier}-pas` },
  ms: { notCovered: "Tidak termasuk dalam pas · Pembelian tunggal", exhausted: "Layak untuk pas · Had penggunaan telah habis · Pas baharu atau pembelian tunggal", included: (tier) => `Termasuk dalam pas ${tier} atau lebih tinggi` },
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
