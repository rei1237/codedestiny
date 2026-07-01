"use client";
/**
 * PremiumBlurGate — 프리미엄 블러 게이트 컴포넌트
 * CRO 전략: 무료 미리보기 일부 노출 → 핵심 인사이트 블러 → 황금 잠금 해제 CTA
 *
 * 사용법:
 *   <PremiumBlurGate
 *     previewContent={<FreeContent />}
 *     lockedContent={<PremiumContent />}
 *     lockedTitle="당신의 재물운이 막힌 결정적 이유"
 *     price={49000}
 *     onUnlock={() => router.push('/premium-unlock')}
 *   />
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/* ─────────────────────────────────────────
   타입 정의
───────────────────────────────────────── */
interface PremiumBlurGateProps {
  /** 무료로 표시되는 콘텐츠 */
  previewContent?: React.ReactNode;
  /** 잠긴 콘텐츠 (블러 처리됨) */
  lockedContent?: React.ReactNode;
  /** 잠긴 섹션 제목 */
  lockedTitle?: string;
  /** 잠긴 항목들 (목록 미리보기) */
  lockedItems?: string[];
  /** 가격 */
  price?: number;
  /** 상품명 */
  productName?: string;
  /** 원화 가치 계산 기준 */
  coinCost?: number;
  /** 잠금 해제 콜백 */
  onUnlock?: () => void;
  /** 상품 설명 짧게 */
  subDesc?: string;
  isCheckingAccess?: boolean;
  checkingAccessMessage?: string;
}

type PremiumBlurGateCopy = {
  lockedTitle: string;
  lockedItems: string[];
  productName: string;
  subDesc: string;
  freeBadge: string;
  moreItems: (count: number) => string;
  coinCta: (price: string) => string;
  priceCta: (productName: string, price: string) => string;
  footnote: string;
};

const PREMIUM_BLUR_GATE_COPY: Record<LoadingLocale, PremiumBlurGateCopy> = {
  ko: {
    lockedTitle: "당신의 재물운이 막힌 결정적 이유",
    lockedItems: [
      "2024~2034년 핵심 대운 전환점과 준비 전략",
      "재물운이 열리는 핵심 월·일 타이밍",
      "숨겨진 직업적 재능과 최적 커리어 경로",
      "연인·배우자와의 궁합 심층 분석",
      "건강 취약 시기와 에너지 관리 방법",
    ],
    productName: "인생 총운 해금",
    subDesc: "AI + 사주명리 · 8만 케이스 기반 정밀 분석",
    freeBadge: "✦ 무료 분석 결과",
    moreItems: (count) => `+ ${count}개 항목 더...`,
    coinCta: (price) => `${price} 결제로 해금하기`,
    priceCta: (productName, price) => `🔓 ${productName} 해금 — ${price}`,
    footnote: "· 1회 결제 · 앱 설치 없이 즉시 확인",
  },
  en: {
    lockedTitle: "The decisive reason your wealth flow is blocked",
    lockedItems: ["Key 10-year fortune turning points and strategy", "Months and days when wealth luck opens", "Hidden career talent and ideal path", "Deep relationship compatibility", "Health-sensitive periods and energy care"],
    productName: "Unlock life fortune",
    subDesc: "AI + Four Pillars · precision reading from 80,000 cases",
    freeBadge: "✦ Free preview result",
    moreItems: (count) => `+ ${count} more items...`,
    coinCta: (price) => `Unlock with ${price}`,
    priceCta: (productName, price) => `🔓 Unlock ${productName} — ${price}`,
    footnote: "· One-time payment · Instant access without app install",
  },
  ja: {
    lockedTitle: "金運の流れを止めている決定的な理由",
    lockedItems: ["2024〜2034年の大運転換点と準備戦略", "金運が開く月日とタイミング", "隠れた仕事の才能と最適な進路", "恋人・配偶者との相性深層分析", "健康に注意したい時期とエネルギー管理"],
    productName: "人生総合運の解錠",
    subDesc: "AI + 四柱推命 · 8万ケース基盤の精密分析",
    freeBadge: "✦ 無料プレビュー結果",
    moreItems: (count) => `+ さらに${count}項目...`,
    coinCta: (price) => `${price}で解錠`,
    priceCta: (productName, price) => `🔓 ${productName} — ${price}`,
    footnote: "· 1回決済 · アプリ不要ですぐ確認",
  },
  "zh-CN": {
    lockedTitle: "阻碍你财运流动的关键原因",
    lockedItems: ["2024–2034 年大运转折与准备策略", "财运开启的月份、日期与时机", "隐藏的职业天赋与理想路径", "恋人/伴侣关系的深度合盘", "健康敏感时期与能量管理"],
    productName: "解锁人生总运",
    subDesc: "AI + 四柱推命 · 基于 8 万案例的精密分析",
    freeBadge: "✦ 免费预览结果",
    moreItems: (count) => `+ 还有 ${count} 项...`,
    coinCta: (price) => `用 ${price} 解锁`,
    priceCta: (productName, price) => `🔓 解锁${productName} — ${price}`,
    footnote: "· 单次支付 · 无需安装应用即可查看",
  },
  "zh-TW": {
    lockedTitle: "阻礙你財運流動的關鍵原因",
    lockedItems: ["2024–2034 年大運轉折與準備策略", "財運開啟的月份、日期與時機", "隱藏的職業天賦與理想路徑", "戀人/伴侶關係的深度合盤", "健康敏感時期與能量管理"],
    productName: "解鎖人生總運",
    subDesc: "AI + 四柱推命 · 基於 8 萬案例的精密分析",
    freeBadge: "✦ 免費預覽結果",
    moreItems: (count) => `+ 還有 ${count} 項...`,
    coinCta: (price) => `用 ${price} 解鎖`,
    priceCta: (productName, price) => `🔓 解鎖${productName} — ${price}`,
    footnote: "· 單次付款 · 無需安裝應用即可查看",
  },
  vi: {
    lockedTitle: "Lý do then chốt khiến dòng tài lộc bị nghẽn",
    lockedItems: ["Bước ngoặt đại vận 2024–2034 và chiến lược chuẩn bị", "Tháng, ngày và thời điểm tài lộc mở ra", "Tài năng nghề nghiệp ẩn và hướng đi phù hợp", "Phân tích sâu duyên hợp với người yêu/bạn đời", "Giai đoạn sức khỏe nhạy cảm và cách giữ năng lượng"],
    productName: "Mở khóa tổng vận đời",
    subDesc: "AI + Tứ trụ · phân tích chính xác từ 80.000 trường hợp",
    freeBadge: "✦ Kết quả xem trước miễn phí",
    moreItems: (count) => `+ thêm ${count} mục...`,
    coinCta: (price) => `Mở khóa với ${price}`,
    priceCta: (productName, price) => `🔓 Mở khóa ${productName} — ${price}`,
    footnote: "· Thanh toán một lần · Xem ngay, không cần cài app",
  },
  hi: {
    lockedTitle: "आपकी धन-धारा रुकने का निर्णायक कारण",
    lockedItems: ["2024–2034 के प्रमुख दशा मोड़ और तैयारी रणनीति", "धन-योग खुलने के महीने, दिन और समय", "छिपी करियर प्रतिभा और श्रेष्ठ मार्ग", "प्रेमी/जीवनसाथी के साथ गहन अनुकूलता", "स्वास्थ्य-संवेदनशील समय और ऊर्जा प्रबंधन"],
    productName: "जीवन भाग्य अनलॉक",
    subDesc: "AI + चार स्तंभ · 80,000 मामलों पर आधारित सूक्ष्म विश्लेषण",
    freeBadge: "✦ मुफ्त पूर्वावलोकन परिणाम",
    moreItems: (count) => `+ ${count} और आइटम...`,
    coinCta: (price) => `${price} से अनलॉक करें`,
    priceCta: (productName, price) => `🔓 ${productName} अनलॉक — ${price}`,
    footnote: "· एक बार भुगतान · ऐप इंस्टॉल किए बिना तुरंत देखें",
  },
  es: {
    lockedTitle: "La razón decisiva por la que tu flujo de dinero se bloquea",
    lockedItems: ["Giros clave de fortuna 2024–2034 y estrategia", "Meses, días y momentos en que se abre la fortuna material", "Talento profesional oculto y camino ideal", "Compatibilidad profunda con pareja o vínculo amoroso", "Periodos sensibles de salud y cuidado energético"],
    productName: "Desbloquear fortuna de vida",
    subDesc: "AI + Cuatro Pilares · análisis preciso basado en 80.000 casos",
    freeBadge: "✦ Resultado gratuito de vista previa",
    moreItems: (count) => `+ ${count} elementos más...`,
    coinCta: (price) => `Desbloquear con ${price}`,
    priceCta: (productName, price) => `🔓 Desbloquear ${productName} — ${price}`,
    footnote: "· Pago único · Acceso inmediato sin instalar app",
  },
  fr: {
    lockedTitle: "La raison décisive qui bloque votre flux financier",
    lockedItems: ["Tournants majeurs 2024–2034 et stratégie de préparation", "Mois, jours et timings où la chance matérielle s'ouvre", "Talent professionnel caché et voie idéale", "Compatibilité profonde avec l'amour ou le partenaire", "Périodes santé sensibles et gestion de l'énergie"],
    productName: "Déverrouiller la fortune de vie",
    subDesc: "AI + Quatre Piliers · analyse précise fondée sur 80 000 cas",
    freeBadge: "✦ Résultat d'aperçu gratuit",
    moreItems: (count) => `+ ${count} éléments de plus...`,
    coinCta: (price) => `Déverrouiller avec ${price}`,
    priceCta: (productName, price) => `🔓 Déverrouiller ${productName} — ${price}`,
    footnote: "· Paiement unique · Accès immédiat sans installer d'application",
  },
  de: {
    lockedTitle: "Der entscheidende Grund, warum dein Geldfluss blockiert ist",
    lockedItems: ["Wichtige 10-Jahres-Wendepunkte 2024–2034 und Strategie", "Monate, Tage und Timing für finanzielles Glück", "Verborgene berufliche Talente und idealer Weg", "Tiefe Kompatibilität mit Liebe oder Partner", "Gesundheitlich sensible Phasen und Energiemanagement"],
    productName: "Lebensglück freischalten",
    subDesc: "AI + Vier Säulen · präzise Analyse aus 80.000 Fällen",
    freeBadge: "✦ Kostenloses Vorschauergebnis",
    moreItems: (count) => `+ ${count} weitere Punkte...`,
    coinCta: (price) => `Mit ${price} freischalten`,
    priceCta: (productName, price) => `🔓 ${productName} freischalten — ${price}`,
    footnote: "· Einmalzahlung · Sofort ansehen, keine App-Installation",
  },
  nl: {
    lockedTitle: "De beslissende reden waarom je geldstroom blokkeert",
    lockedItems: ["Belangrijke 10-jaars keerpunten 2024–2034 en strategie", "Maanden, dagen en timing waarop geldgeluk opent", "Verborgen beroepstalent en ideaal pad", "Diepe compatibiliteit met liefde of partner", "Gezondheidsgevoelige periodes en energiebeheer"],
    productName: "Levensgeluk ontgrendelen",
    subDesc: "AI + Vier Pilaren · nauwkeurige analyse uit 80.000 cases",
    freeBadge: "✦ Gratis voorbeeldresultaat",
    moreItems: (count) => `+ ${count} extra items...`,
    coinCta: (price) => `Ontgrendel met ${price}`,
    priceCta: (productName, price) => `🔓 ${productName} ontgrendelen — ${price}`,
    footnote: "· Eenmalige betaling · Direct bekijken zonder app-installatie",
  },
  ms: {
    lockedTitle: "Sebab utama aliran rezeki anda tersekat",
    lockedItems: ["Titik perubahan 10 tahun 2024–2034 dan strategi persediaan", "Bulan, hari dan masa rezeki terbuka", "Bakat kerjaya tersembunyi dan laluan terbaik", "Keserasian mendalam dengan kekasih atau pasangan", "Tempoh kesihatan sensitif dan pengurusan tenaga"],
    productName: "Buka kunci nasib hidup",
    subDesc: "AI + Empat Tiang · analisis tepat daripada 80,000 kes",
    freeBadge: "✦ Keputusan pratonton percuma",
    moreItems: (count) => `+ ${count} item lagi...`,
    coinCta: (price) => `Buka kunci dengan ${price}`,
    priceCta: (productName, price) => `🔓 Buka ${productName} — ${price}`,
    footnote: "· Bayaran sekali · Akses segera tanpa pasang aplikasi",
  },
};

const PREMIUM_GATE_NUMBER_LOCALE: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

const PREMIUM_GATE_PRICE_SUFFIX: Record<LoadingLocale, string> = {
  ko: "원",
  en: " KRW",
  ja: "ウォン",
  "zh-CN": "韩元",
  "zh-TW": "韓元",
  vi: " KRW",
  hi: " KRW",
  es: " KRW",
  fr: " KRW",
  de: " KRW",
  nl: " KRW",
  ms: " KRW",
};

const ACCESS_CHECKING_MESSAGE = "빠르게 잠금 해제 권한을 확인 중입니다..";

/* ─────────────────────────────────────────
   샘플 잠긴 콘텐츠 렌더러
───────────────────────────────────────── */
function DefaultLockedContent({ items }: { items: string[] }) {
  return (
    <div className="space-y-3 p-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="text-amber-400 mt-0.5 text-sm flex-shrink-0">✦</span>
          <p className="text-sm text-violet-100/90 leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   별 파티클 (잠금 오버레이용)
───────────────────────────────────────── */
function LockParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-amber-400/30 select-none"
          style={{
            left: `${8 + (i * 137.5) % 84}%`,
            top: `${10 + (i * 73) % 80}%`,
            fontSize: 10 + (i % 3) * 5,
          }}
          animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -8, 0] }}
          transition={{ duration: 2.5 + (i % 3), delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {["✦", "✧", "⋆", "·"][i % 4]}
        </motion.div>
      ))}
    </div>
  );
}

function hasKoreanText(value?: string) {
  return /[가-힣]/.test(String(value || ""));
}

function resolvePremiumGateText(value: string | undefined, fallback: string, locale: LoadingLocale) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (locale !== "ko" && hasKoreanText(text)) return fallback;
  return text;
}

function resolvePremiumGateItems(items: string[] | undefined, fallback: string[], locale: LoadingLocale) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  if (locale === "ko") return source;
  const localized = source.map((item, index) => hasKoreanText(item) ? fallback[index] : item).filter(Boolean);
  return localized.length ? localized : fallback;
}

function formatPremiumGatePrice(amount: number, locale: LoadingLocale, withWonPrefix = false) {
  const numberLocale = PREMIUM_GATE_NUMBER_LOCALE[locale] || PREMIUM_GATE_NUMBER_LOCALE.ko;
  const normalizedAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (locale === "ko" && withWonPrefix) return `₩${normalizedAmount.toLocaleString("ko-KR")}`;
  return `${new Intl.NumberFormat(numberLocale).format(normalizedAmount)}${PREMIUM_GATE_PRICE_SUFFIX[locale] || PREMIUM_GATE_PRICE_SUFFIX.ko}`;
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function PremiumBlurGate({
  previewContent,
  lockedContent,
  lockedTitle,
  lockedItems,
  price = 49000,
  productName,
  coinCost,
  onUnlock,
  subDesc,
  isCheckingAccess = false,
  checkingAccessMessage,
}: PremiumBlurGateProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = PREMIUM_BLUR_GATE_COPY[locale] || PREMIUM_BLUR_GATE_COPY.ko;
  const displayLockedTitle = resolvePremiumGateText(lockedTitle, copy.lockedTitle, locale);
  const displayLockedItems = resolvePremiumGateItems(lockedItems, copy.lockedItems, locale);
  const displayProductName = resolvePremiumGateText(productName, copy.productName, locale);
  const displaySubDesc = resolvePremiumGateText(subDesc, copy.subDesc, locale);
  const displayCheckingAccessMessage = resolvePremiumGateText(checkingAccessMessage, ACCESS_CHECKING_MESSAGE, locale);
  const formattedPrice = formatPremiumGatePrice(price, locale, true);
  const formattedCoinValue = formatPremiumGatePrice(Math.max(0, Math.floor(Number(coinCost || 0) * 100)), locale);

  return (
    <div className="relative space-y-4">
      {/* ── 무료 미리보기 섹션 ───────────────── */}
      {previewContent && (
        <motion.div
          className="relative rounded-2xl overflow-hidden border border-violet-700/20 bg-gradient-to-b from-violet-950/40 to-slate-900/60 p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* FREE 배지 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest"
              style={{ background: "rgba(167,139,250,0.18)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
              {copy.freeBadge}
            </span>
          </div>
          {previewContent}
        </motion.div>
      )}

      {/* ── 잠긴 프리미엄 섹션 ───────────────── */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(212,168,67,0.25)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* 블러 처리된 콘텐츠 */}
        <div
          className="relative"
          style={{
            background: "linear-gradient(180deg, rgba(30,20,60,0.85) 0%, rgba(20,12,40,0.95) 100%)",
            filter: "blur(4px)",
            userSelect: "none",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest"
                style={{ background: "rgba(212,168,67,0.18)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.3)" }}>
                👑 PREMIUM
              </span>
            </div>
            {lockedContent || <DefaultLockedContent items={displayLockedItems} />}
          </div>
        </div>

        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
          style={{ background: "linear-gradient(180deg, rgba(8,5,20,0.2) 0%, rgba(8,5,20,0.88) 40%, rgba(8,5,20,0.97) 100%)" }}>
          <LockParticles />

          <div className="relative z-10 text-center max-w-xs">
            {/* 잠금 아이콘 */}
            <motion.div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.4)" }}
              animate={{ boxShadow: ["0 0 12px rgba(212,168,67,0.2)", "0 0 30px rgba(212,168,67,0.5)", "0 0 12px rgba(212,168,67,0.2)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              🔐
            </motion.div>

            {/* 제목 */}
            <h3 className="text-base font-bold text-white mb-1 leading-tight">
              {displayLockedTitle}
            </h3>
            <p className="text-xs text-violet-300/60 mb-4 leading-relaxed">
              {displaySubDesc}
            </p>

            {/* 잠긴 항목 힌트 */}
            <div className="text-left space-y-1.5 mb-5">
              {displayLockedItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-violet-200/50">
                  <span className="text-amber-500/60 flex-shrink-0">⊹</span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
              {displayLockedItems.length > 3 && (
                <div className="text-xs text-violet-400/40 pl-4">{copy.moreItems(displayLockedItems.length - 3)}</div>
              )}
            </div>

            {isCheckingAccess && (
              <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
                {displayCheckingAccessMessage}
              </p>
            )}

            {/* CTA 버튼 */}
            <motion.button
              type="button"
              onClick={isCheckingAccess ? undefined : onUnlock}
              disabled={isCheckingAccess}
              aria-busy={isCheckingAccess ? "true" : undefined}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              className="relative min-h-12 w-full touch-manipulation overflow-hidden rounded-xl py-3.5 text-sm font-bold tracking-wide disabled:cursor-wait disabled:opacity-75"
              style={{
                background: "linear-gradient(135deg,#d4a843 0%,#f0c060 50%,#b8860b 100%)",
                color: "#1a0e00",
                boxShadow: "0 4px 24px rgba(212,168,67,0.35)",
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 6px 32px rgba(212,168,67,0.55)" }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 버튼 빛 효과 */}
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)" }}
                animate={isHovering ? { x: ["-100%", "100%"] } : { x: "-100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <span className="relative z-10">
                {isCheckingAccess
                  ? displayCheckingAccessMessage
                  : coinCost
                  ? copy.coinCta(formattedCoinValue)
                  : copy.priceCta(displayProductName, formattedPrice)}
              </span>
            </motion.button>

            <p className="text-[10px] text-violet-400/35 mt-2.5">
              {copy.footnote}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
