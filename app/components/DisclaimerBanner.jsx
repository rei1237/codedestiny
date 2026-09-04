/**
 * DisclaimerBanner — 면책 조항 배너 컴포넌트
 * 저장 경로: app/components/DisclaimerBanner.jsx
 *
 * 사용법:
 *   import DisclaimerBanner from "@/app/components/DisclaimerBanner";
 *   <DisclaimerBanner />            // 기본 (닫기 가능)
 *   <DisclaimerBanner dismissible={false} />  // 고정 표시
 */
"use client";

import { useState, useEffect } from "react";
import styles from "./LegalUi.module.css";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const STORAGE_KEY = "cd_disclaimer_dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DISCLAIMER_COPY = {
  ko: {
    aria: "면책 조항 안내",
    prefix: "본 서비스는",
    strong: "오락 및 참고 목적",
    suffix: "의 콘텐츠이며, 실제 의료·법률·금융 상담을 대체하지 않습니다. 중요한 결정은 반드시 전문가와 상담하세요.",
    close: "면책 조항 닫기",
  },
  en: {
    aria: "Disclaimer notice",
    prefix: "This service provides content for",
    strong: "entertainment and reference only",
    suffix: " and does not replace medical, legal, or financial advice. Please consult a qualified professional for important decisions.",
    close: "Close disclaimer notice",
  },
  ja: {
    aria: "免責事項のお知らせ",
    prefix: "本サービスは",
    strong: "娯楽および参考目的",
    suffix: "のコンテンツであり、医療・法律・金融の相談に代わるものではありません。重要な判断は必ず専門家にご相談ください。",
    close: "免責事項を閉じる",
  },
  "zh-CN": {
    aria: "免责声明提示",
    prefix: "本服务提供",
    strong: "娱乐与参考用途",
    suffix: "内容，不能替代医疗、法律或金融咨询。重要决定请务必咨询合格专业人士。",
    close: "关闭免责声明",
  },
  "zh-TW": {
    aria: "免責聲明提示",
    prefix: "本服務提供",
    strong: "娛樂與參考用途",
    suffix: "內容，不能取代醫療、法律或金融諮詢。重要決定請務必諮詢合格專業人士。",
    close: "關閉免責聲明",
  },
  vi: {
    aria: "Thông báo miễn trừ trách nhiệm",
    prefix: "Dịch vụ này cung cấp nội dung cho",
    strong: "giải trí và tham khảo",
    suffix: " và không thay thế tư vấn y tế, pháp lý hoặc tài chính. Với quyết định quan trọng, hãy tham khảo chuyên gia đủ năng lực.",
    close: "Đóng thông báo miễn trừ",
  },
  hi: {
    aria: "Disclaimer notice",
    prefix: "यह सेवा",
    strong: "मनोरंजन और संदर्भ",
    suffix: " के लिए सामग्री देती है, और चिकित्सा, कानूनी या वित्तीय सलाह का विकल्प नहीं है। महत्वपूर्ण निर्णयों के लिए योग्य विशेषज्ञ से सलाह लें।",
    close: "Disclaimer बंद करें",
  },
  es: {
    aria: "Aviso de exención de responsabilidad",
    prefix: "Este servicio ofrece contenido con fines de",
    strong: "entretenimiento y referencia",
    suffix: " y no sustituye asesoría médica, legal ni financiera. Para decisiones importantes, consulta a un profesional cualificado.",
    close: "Cerrar aviso legal",
  },
  fr: {
    aria: "Avis de non-responsabilité",
    prefix: "Ce service propose un contenu à des fins de",
    strong: "divertissement et référence",
    suffix: " et ne remplace pas un avis médical, juridique ou financier. Pour les décisions importantes, consultez un professionnel qualifié.",
    close: "Fermer l'avis de non-responsabilité",
  },
  de: {
    aria: "Haftungsausschluss",
    prefix: "Dieser Service bietet Inhalte zu",
    strong: "Unterhaltungs- und Referenzzwecken",
    suffix: " und ersetzt keine medizinische, rechtliche oder finanzielle Beratung. Bitte wenden Sie sich bei wichtigen Entscheidungen an qualifizierte Fachleute.",
    close: "Haftungsausschluss schließen",
  },
  nl: {
    aria: "Disclaimer melding",
    prefix: "Deze service biedt inhoud voor",
    strong: "entertainment en referentie",
    suffix: " en vervangt geen medisch, juridisch of financieel advies. Raadpleeg voor belangrijke beslissingen een gekwalificeerde professional.",
    close: "Disclaimer sluiten",
  },
  ms: {
    aria: "Notis penafian",
    prefix: "Servis ini menyediakan kandungan untuk",
    strong: "hiburan dan rujukan",
    suffix: " dan tidak menggantikan nasihat perubatan, undang-undang atau kewangan. Untuk keputusan penting, sila rujuk profesional bertauliah.",
    close: "Tutup notis penafian",
  },
};

export default function DisclaimerBanner({ dismissible = true, className = "" }) {
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState("ko");
  const copy = DISCLAIMER_COPY[locale] || DISCLAIMER_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
    if (!dismissible) {
      setVisible(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const dismissedAt = raw ? Number(raw) : 0;
      const valid = Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS;
      if (!valid) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [dismissible]);

  function handleDismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={`${styles.disclaimerBar} ${className}`}
      role="note"
      aria-label={copy.aria}
    >
      <span className={styles.disclaimerIcon}>⚠️</span>
      <span className={styles.disclaimerText}>
        {copy.prefix} <strong>{copy.strong}</strong>{copy.suffix}
      </span>
      {dismissible && (
        <button
          className={styles.disclaimerClose}
          onClick={handleDismiss}
          aria-label={copy.close}
        >
          ✕
        </button>
      )}
    </div>
  );
}
