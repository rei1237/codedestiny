import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type SubscriptionNoticeOptions = {
  message?: string;
  reason?: string;
  tier?: string;
  autoCloseMs?: number;
};

const SUBSCRIPTION_NOTICE_COPY: Record<LoadingLocale, {
  tierPremium: string;
  tierStandard: string;
  tierDefault: string;
  defaultMessage: string;
  defaultReason: string;
  title: string;
  tierLabel: string;
  benefitLabel: string;
  benefitValue: string;
  serviceLabel: string;
  button: string;
}> = {
  ko: { tierPremium: "프리미엄", tierStandard: "스탠다드", tierDefault: "이용권", defaultMessage: "이용권 혜택이 적용되어 이번 리딩이 달빛의 흐름 안에서 열렸습니다. 별빛의 가호가 이 여정을 부드럽게 비춥니다.", defaultReason: "프리미엄 리딩", title: "이용권 혜택 적용 완료", tierLabel: "이용권 등급", benefitLabel: "적용 혜택", benefitValue: "이용권 혜택 적용", serviceLabel: "서비스", button: "우주의 리딩 계속하기" },
  en: { tierPremium: "Premium", tierStandard: "Standard", tierDefault: "Pass", defaultMessage: "Your pass benefit has opened this reading within a moonlit current. Starlight gently blesses the journey ahead.", defaultReason: "Premium reading", title: "Pass Benefit Applied", tierLabel: "Pass tier", benefitLabel: "Applied benefit", benefitValue: "Pass benefit applied", serviceLabel: "Service", button: "Continue the cosmic reading" },
  ja: { tierPremium: "プレミアム", tierStandard: "スタンダード", tierDefault: "パス", defaultMessage: "パス特典が適用され、このリーディングは月明かりの流れの中で開かれました。星の加護がこの旅路をやわらかく照らします。", defaultReason: "プレミアムリーディング", title: "パス特典の適用が完了しました", tierLabel: "パス等級", benefitLabel: "適用特典", benefitValue: "パス特典適用", serviceLabel: "サービス", button: "宇宙のリーディングを続ける" },
  "zh-CN": { tierPremium: "高级", tierStandard: "标准", tierDefault: "通行证", defaultMessage: "通行证权益已应用，本次解读在月光般的流动中开启。星光的守护正温柔照亮这段旅程。", defaultReason: "高级解读", title: "通行证权益已应用", tierLabel: "通行证等级", benefitLabel: "应用权益", benefitValue: "通行证权益应用", serviceLabel: "服务", button: "继续宇宙解读" },
  "zh-TW": { tierPremium: "高級", tierStandard: "標準", tierDefault: "通行證", defaultMessage: "通行證權益已套用，本次解讀在月光般的流動中開啟。星光的守護正溫柔照亮這段旅程。", defaultReason: "高級解讀", title: "通行證權益已套用", tierLabel: "通行證等級", benefitLabel: "套用權益", benefitValue: "通行證權益套用", serviceLabel: "服務", button: "繼續宇宙解讀" },
  vi: { tierPremium: "Premium", tierStandard: "Standard", tierDefault: "Vé quyền lợi", defaultMessage: "Quyền lợi của vé đã được áp dụng, mở ra phần luận giải này trong dòng trăng dịu. Ánh sao đang nhẹ nhàng soi sáng hành trình.", defaultReason: "Luận giải premium", title: "Đã áp dụng quyền lợi vé", tierLabel: "Hạng vé", benefitLabel: "Quyền lợi áp dụng", benefitValue: "Quyền lợi vé đã áp dụng", serviceLabel: "Dịch vụ", button: "Tiếp tục luận giải vũ trụ" },
  hi: { tierPremium: "प्रीमियम", tierStandard: "स्टैंडर्ड", tierDefault: "पास", defaultMessage: "आपका पास लाभ लागू हो गया है, और यह रीडिंग चांदनी की धारा में खुली है. तारों का आशीर्वाद इस यात्रा को कोमलता से रोशन करता है.", defaultReason: "प्रीमियम रीडिंग", title: "पास लाभ लागू हुआ", tierLabel: "पास स्तर", benefitLabel: "लागू लाभ", benefitValue: "पास लाभ लागू", serviceLabel: "सेवा", button: "कॉस्मिक रीडिंग जारी रखें" },
  es: { tierPremium: "Premium", tierStandard: "Estándar", tierDefault: "Pase", defaultMessage: "El beneficio de tu pase abrió esta lectura bajo una corriente de luna. La luz de las estrellas acompaña suavemente este viaje.", defaultReason: "Lectura premium", title: "Beneficio del pase aplicado", tierLabel: "Nivel del pase", benefitLabel: "Beneficio aplicado", benefitValue: "Beneficio del pase aplicado", serviceLabel: "Servicio", button: "Continuar la lectura cósmica" },
  fr: { tierPremium: "Premium", tierStandard: "Standard", tierDefault: "Pass", defaultMessage: "Le bénéfice de votre pass ouvre cette lecture dans un courant lunaire. La lumière des étoiles accompagne doucement ce voyage.", defaultReason: "Lecture premium", title: "Bénéfice du pass appliqué", tierLabel: "Niveau du pass", benefitLabel: "Bénéfice appliqué", benefitValue: "Bénéfice du pass appliqué", serviceLabel: "Service", button: "Continuer la lecture cosmique" },
  de: { tierPremium: "Premium", tierStandard: "Standard", tierDefault: "Pass", defaultMessage: "Dein Passvorteil hat diese Deutung in einem Mondlichtstrom geöffnet. Sternenlicht begleitet diese Reise sanft.", defaultReason: "Premium-Deutung", title: "Passvorteil angewendet", tierLabel: "Pass-Stufe", benefitLabel: "Angewendeter Vorteil", benefitValue: "Passvorteil angewendet", serviceLabel: "Service", button: "Kosmische Deutung fortsetzen" },
  nl: { tierPremium: "Premium", tierStandard: "Standaard", tierDefault: "Pas", defaultMessage: "Je pasvoordeel heeft deze lezing geopend in een zachte maanlichtstroom. Sterrenlicht begeleidt deze reis rustig.", defaultReason: "Premium lezing", title: "Pasvoordeel toegepast", tierLabel: "Pasniveau", benefitLabel: "Toegepast voordeel", benefitValue: "Pasvoordeel toegepast", serviceLabel: "Service", button: "Kosmische lezing voortzetten" },
  ms: { tierPremium: "Premium", tierStandard: "Standard", tierDefault: "Pas", defaultMessage: "Manfaat pas anda telah membuka bacaan ini dalam aliran cahaya bulan. Cahaya bintang memberkati perjalanan ini dengan lembut.", defaultReason: "Bacaan premium", title: "Manfaat pas digunakan", tierLabel: "Tahap pas", benefitLabel: "Manfaat digunakan", benefitValue: "Manfaat pas digunakan", serviceLabel: "Servis", button: "Teruskan bacaan kosmik" },
};

const SUBSCRIPTION_NOTICE_BADGE_COPY: Record<LoadingLocale, string> = {
  ko: "COSMIC PASS ACTIVE",
  en: "COSMIC PASS ACTIVE",
  ja: "COSMIC PASS ACTIVE",
  "zh-CN": "COSMIC PASS ACTIVE",
  "zh-TW": "COSMIC PASS ACTIVE",
  vi: "COSMIC PASS ACTIVE",
  hi: "COSMIC PASS ACTIVE",
  es: "COSMIC PASS ACTIVE",
  fr: "COSMIC PASS ACTIVE",
  de: "COSMIC PASS ACTIVE",
  nl: "COSMIC PASS ACTIVE",
  ms: "COSMIC PASS ACTIVE",
};

export function getSubscriptionTierLabel(tierRaw?: unknown, localeRaw: LoadingLocale = "ko"): string {
  const copy = SUBSCRIPTION_NOTICE_COPY[localeRaw] || SUBSCRIPTION_NOTICE_COPY.ko;
  let tier = String(tierRaw || "").trim().toLowerCase();
  if (tier.includes("family")) return "FAMILY";
  if (tier === "vip") tier = "vvip";
  if (tier === "unlimited") tier = "vvip";
  if (tier === "pro") tier = "premium";
  if (tier === "basic") tier = "standard";
  if (tier === "vvip") return "VVIP";
  if (tier === "premium") return copy.tierPremium;
  if (tier === "standard") return copy.tierStandard;
  if (tier && tier !== "free" && tier !== "none") return String(tierRaw).trim();
  return copy.tierDefault;
}

export function isSubscriptionIncludedResponse(data: any, chargedCoinsFallback = 0): boolean {
  const chargedCoins = Number(data?.chargedCoins ?? chargedCoinsFallback ?? 0);
  const tier = String(data?.subscriptionTier || "free").toLowerCase();
  return Boolean(
    data
      && (
        data.freeBySubscription === true
        || String(data.code || "") === "SUBSCRIPTION_INCLUDED"
        || (chargedCoins === 0 && tier !== "free")
      )
  );
}

export function showSubscriptionIncludedNotice(options: SubscriptionNoticeOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const locale = getCurrentLoadingLocale();
  const copy = SUBSCRIPTION_NOTICE_COPY[locale] || SUBSCRIPTION_NOTICE_COPY.ko;
  const badgeCopy = SUBSCRIPTION_NOTICE_BADGE_COPY[locale] || SUBSCRIPTION_NOTICE_BADGE_COPY.ko;
  const message = String(
    options.message
      || copy.defaultMessage
  );
  const reason = String(options.reason || copy.defaultReason);
  const tier = String(options.tier || "");
  const autoCloseMs = Number(options.autoCloseMs || 6200);

  const w = window as any;
  const now = Date.now();
  const key = `${reason}|${tier}`;
  if (w.__cdSubIncludedNoticeKey === key && (now - Number(w.__cdSubIncludedNoticeAt || 0)) < 2000) {
    return;
  }
  w.__cdSubIncludedNoticeKey = key;
  w.__cdSubIncludedNoticeAt = now;

  const oldRoot = document.getElementById("cd-sub-included-notice")
    || document.getElementById("cd-sub-included-notice-react");
  if (oldRoot && oldRoot.parentNode) oldRoot.parentNode.removeChild(oldRoot);

  const styleId = "cd-sub-included-notice-style";
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = ""
      + "@keyframes cdSubInFade { from { opacity:0; transform: translateY(12px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }"
      + "@keyframes cdSubStarTwinkle { 0%,100% { opacity:.35; transform: scale(1); } 50% { opacity:1; transform: scale(1.25); } }"
      + "@keyframes cdSubAuraPulse { 0%,100% { opacity:.35; transform: scale(1); } 50% { opacity:.7; transform: scale(1.08); } }";
    document.head.appendChild(styleEl);
  }

  const root = document.createElement("div");
  root.id = "cd-sub-included-notice";
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "100001";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.padding = "20px";
  root.style.background = "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.16), transparent 45%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.22), transparent 52%), rgba(3,7,18,0.56)";
  root.style.backdropFilter = "blur(8px)";

  const card = document.createElement("div");
  card.style.position = "relative";
  card.style.width = "min(92vw, 540px)";
  card.style.borderRadius = "24px";
  card.style.padding = "24px 22px 20px";
  card.style.border = "1px solid rgba(125,211,252,0.4)";
  card.style.background = "linear-gradient(160deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 45%, rgba(49,46,129,0.92) 100%)";
  card.style.boxShadow = "0 30px 60px rgba(2,6,23,0.6), 0 0 38px rgba(56,189,248,0.26), inset 0 1px 0 rgba(255,255,255,0.14)";
  card.style.color = "#e2e8f0";
  card.style.animation = "cdSubInFade 280ms cubic-bezier(.2,.9,.2,1)";
  card.style.overflow = "hidden";

  const auraTop = document.createElement("div");
  auraTop.style.position = "absolute";
  auraTop.style.width = "220px";
  auraTop.style.height = "220px";
  auraTop.style.left = "-80px";
  auraTop.style.top = "-110px";
  auraTop.style.borderRadius = "50%";
  auraTop.style.background = "radial-gradient(circle, rgba(56,189,248,0.5), rgba(56,189,248,0) 70%)";
  auraTop.style.filter = "blur(6px)";
  auraTop.style.animation = "cdSubAuraPulse 2.6s ease-in-out infinite";

  const auraBottom = document.createElement("div");
  auraBottom.style.position = "absolute";
  auraBottom.style.width = "240px";
  auraBottom.style.height = "240px";
  auraBottom.style.right = "-90px";
  auraBottom.style.bottom = "-130px";
  auraBottom.style.borderRadius = "50%";
  auraBottom.style.background = "radial-gradient(circle, rgba(167,139,250,0.45), rgba(167,139,250,0) 72%)";
  auraBottom.style.filter = "blur(8px)";
  auraBottom.style.animation = "cdSubAuraPulse 3.2s ease-in-out infinite";

  const stars = document.createElement("div");
  stars.style.position = "absolute";
  stars.style.inset = "0";
  stars.style.pointerEvents = "none";
  stars.innerHTML = '<span style="position:absolute;left:11%;top:16%;width:4px;height:4px;border-radius:999px;background:#bfdbfe;animation:cdSubStarTwinkle 2.1s ease-in-out infinite"></span>'
    + '<span style="position:absolute;left:82%;top:22%;width:5px;height:5px;border-radius:999px;background:#a5f3fc;animation:cdSubStarTwinkle 2.8s ease-in-out infinite"></span>'
    + '<span style="position:absolute;left:70%;top:68%;width:3px;height:3px;border-radius:999px;background:#e9d5ff;animation:cdSubStarTwinkle 1.9s ease-in-out infinite"></span>'
    + '<span style="position:absolute;left:22%;top:72%;width:3px;height:3px;border-radius:999px;background:#fef3c7;animation:cdSubStarTwinkle 2.5s ease-in-out infinite"></span>';

  const tierLabel = getSubscriptionTierLabel(tier, locale);

  const title = document.createElement("div");
  title.style.position = "relative";
  title.style.zIndex = "1";
  title.innerHTML = ""
    + '<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(56,189,248,0.14);border:1px solid rgba(125,211,252,0.36);font-size:11px;font-weight:800;letter-spacing:.1em;color:#bae6fd;">'
    + `<span>✦</span><span>${badgeCopy}</span></div>`
    + `<h3 style="margin:14px 0 8px;font-size:26px;line-height:1.28;color:#f8fafc;letter-spacing:-.02em;">${copy.title}</h3>`
    + `<p style="margin:0;color:rgba(226,232,240,.95);font-size:14px;line-height:1.65;">${message}</p>`;

  const meta = document.createElement("div");
  meta.style.position = "relative";
  meta.style.zIndex = "1";
  meta.style.marginTop = "14px";
  meta.style.padding = "12px";
  meta.style.borderRadius = "14px";
  meta.style.background = "rgba(15,23,42,0.48)";
  meta.style.border = "1px solid rgba(148,163,184,0.26)";
  meta.style.fontSize = "13px";
  meta.style.lineHeight = "1.7";
  meta.innerHTML = ""
    + `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#93c5fd;">${copy.tierLabel}</span><strong style="color:#f8fafc;">${tierLabel}</strong></div>`
    + `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#93c5fd;">${copy.benefitLabel}</span><strong style="color:#86efac;">${copy.benefitValue}</strong></div>`
    + `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#93c5fd;">${copy.serviceLabel}</span><strong style="color:#f8fafc;">${reason}</strong></div>`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = copy.button;
  btn.style.position = "relative";
  btn.style.zIndex = "1";
  btn.style.marginTop = "16px";
  btn.style.width = "100%";
  btn.style.border = "1px solid rgba(125,211,252,0.45)";
  btn.style.borderRadius = "12px";
  btn.style.padding = "12px 14px";
  btn.style.background = "linear-gradient(135deg, rgba(14,165,233,0.28), rgba(99,102,241,0.36))";
  btn.style.color = "#e0f2fe";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "800";
  btn.style.cursor = "pointer";

  function closeNotice() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
  }

  btn.addEventListener("click", closeNotice);
  root.addEventListener("click", (evt) => {
    if (evt.target === root) closeNotice();
  });

  card.appendChild(auraTop);
  card.appendChild(auraBottom);
  card.appendChild(stars);
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(btn);
  root.appendChild(card);
  document.body.appendChild(root);

  window.setTimeout(closeNotice, Number.isFinite(autoCloseMs) ? autoCloseMs : 6200);
}
