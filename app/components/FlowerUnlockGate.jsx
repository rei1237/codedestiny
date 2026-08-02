"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseFeature } from "../_lib/billing-client";
import { usePayment } from "../hooks/usePayment";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const FLOWER_UNLOCK_TEXT_TRANSLATIONS = {
  ko: {
    checkingPass: "이용권을 확인하고 있어요.",
    reason: "운명의 꽃 아틀리에 전체 해금",
    profileRequired: "프로필을 먼저 선택한 뒤 다시 진행해 주세요.",
    unlockFailed: "해금 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    unlockComplete: "해금이 완료되었습니다. 결과를 불러오는 중입니다.",
    networkError: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    lockedContent: "LOCKED CONTENT",
    title: "운명의 꽃 상세 결과는 해금 후 확인할 수 있습니다",
    desc1: "이 페이지는 로그인 사용자 중 해당 콘텐츠를 해금한 경우에만 열립니다.",
    desc2: "표시 금액은 기존 콘텐츠 가치와 동일한 원화 기준이며, 결제 페이지에서 원화 단건 결제로 해금할 수 있습니다.",
    currentValue: "현재 보유 원화 가치:",
    requiredValue: "필요 원화 가치:",
    shortfall: (amount) => `부족 원화 가치: ${amount}`,
    processing: "해금 처리 중...",
    unlockCta: "결제 후 운명의 꽃 아틀리에 전체를 해금하시겠습니까?",
    paymentPage: "결제 페이지 이동",
  },
  en: {
    checkingPass: "Checking your pass.",
    reason: "Full unlock for Destiny Flower Atelier",
    profileRequired: "Please select a profile first, then try again.",
    unlockFailed: "The unlock could not be completed. Please try again shortly.",
    unlockComplete: "Unlock complete. Loading your result.",
    networkError: "A network error occurred. Please try again shortly.",
    lockedContent: "LOCKED CONTENT",
    title: "The detailed Destiny Flower result opens after unlock",
    desc1: "This page opens only for logged-in users who have unlocked this content.",
    desc2: "The displayed amount follows the same KRW value as the existing content and can be unlocked with a one-time KRW payment on the payment page.",
    currentValue: "Current KRW value:",
    requiredValue: "Required KRW value:",
    shortfall: (amount) => `Shortfall: ${amount}`,
    processing: "Unlocking...",
    unlockCta: "Unlock the full Destiny Flower Atelier after payment?",
    paymentPage: "Go to payment page",
  },
  ja: {
    checkingPass: "利用券を確認しています。",
    reason: "運命の花アトリエ全体のロック解除",
    profileRequired: "先にプロフィールを選択してから、もう一度お試しください。",
    unlockFailed: "ロック解除を完了できませんでした。しばらくしてからもう一度お試しください。",
    unlockComplete: "ロック解除が完了しました。結果を読み込んでいます。",
    networkError: "ネットワークエラーが発生しました。しばらくしてからもう一度お試しください。",
    lockedContent: "LOCKED CONTENT",
    title: "運命の花の詳細結果はロック解除後に確認できます",
    desc1: "このページは、ログイン済みで該当コンテンツを解除したユーザーだけが開けます。",
    desc2: "表示金額は既存コンテンツと同じウォン基準で、決済ページからウォン単発決済で解除できます。",
    currentValue: "現在保有中のウォン価値:",
    requiredValue: "必要なウォン価値:",
    shortfall: (amount) => `不足ウォン価値: ${amount}`,
    processing: "ロック解除中...",
    unlockCta: "決済後、運命の花アトリエ全体を解除しますか？",
    paymentPage: "決済ページへ移動",
  },
};

function flowerUnlockCopy(locale) {
  return FLOWER_UNLOCK_TEXT_TRANSLATIONS[locale] || FLOWER_UNLOCK_TEXT_TRANSLATIONS.en;
}

export default function FlowerUnlockGate({
  slug,
  featureKey,
  requiredCoins = 200,
  currentPoints = 0,
}) {
  const router = useRouter();
  const { startPayment, endPayment } = usePayment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [locale, setLocale] = useState("ko");
  const copy = flowerUnlockCopy(locale);

  const nextPath = useMemo(() => {
    const raw = String(slug || "").replace(/^\/+/, "");
    return `/${raw}`;
  }, [slug]);

  const shortfall = Math.max(0, Number(requiredCoins || 0) - Number(currentPoints || 0));

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  async function handleUnlock() {
    if (isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);
    let paymentOverlayActive = false;

    try {
      paymentOverlayActive = true;
      startPayment(copy.checkingPass, "pass-checking");
      const purchaseResult = await purchaseFeature({
        cost: Number(requiredCoins || 200),
        featureKey: String(featureKey || "flower-fc"),
        reason: copy.reason,
        requestId:
          "flower-unlock:" +
          String(featureKey || "flower-fc") +
          ":" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 9),
      });

      const purchaseErrorCode = String(purchaseResult.error?.code || purchaseResult.code || "").trim().toUpperCase();
      if (purchaseResult.status === 401 || purchaseErrorCode === "AUTH_REQUIRED" || purchaseErrorCode === "NOT_LOGGED_IN" || purchaseErrorCode === "TOKEN_EXPIRED") {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (purchaseResult.status === 403 && (purchaseErrorCode === "MISSING_PROFILE_ID" || purchaseErrorCode === "PROFILE_REQUIRED" || purchaseErrorCode === "INVALID_PROFILE")) {
        setMessage(String(purchaseResult.error?.message || purchaseResult.message || copy.profileRequired));
        return;
      }

      if (!purchaseResult.ok) {
        setMessage(String(purchaseResult.error?.message || purchaseResult.message || copy.unlockFailed));
        return;
      }

      setMessage(copy.unlockComplete);
      router.refresh();
      endPayment();
      paymentOverlayActive = false;
    } catch (_error) {
      setMessage(copy.networkError);
    } finally {
      if (paymentOverlayActive) endPayment();
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 16px 56px", color: "#e2e8f0" }}>
      <section
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(244,114,182,0.35)",
          background: "linear-gradient(160deg, rgba(30,41,59,0.95), rgba(88,28,135,0.42))",
          padding: "22px 18px",
          boxShadow: "0 18px 42px rgba(2,6,23,0.35)",
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", color: "#f9a8d4", fontWeight: 700, letterSpacing: "0.05em" }}>{copy.lockedContent}</p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(1.35rem, 4vw, 2rem)", color: "#f8fafc", lineHeight: 1.3 }}>
          {copy.title}
        </h1>
        <p style={{ margin: 0, lineHeight: 1.8, color: "#dbe5ff" }}>
          {copy.desc1}
          <br />
          {copy.desc2}
        </p>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.28)",
            background: "rgba(15,23,42,0.5)",
            padding: "12px 12px",
            fontSize: "0.92rem",
            lineHeight: 1.7,
            color: "#e2e8f0",
          }}
        >
          <div>{copy.currentValue} <strong>{Number(currentPoints || 0).toLocaleString("ko-KR")}</strong></div>
          <div>{copy.requiredValue} <strong>{Number(requiredCoins || 0).toLocaleString("ko-KR")}</strong></div>
            {shortfall > 0 ? <div style={{ color: "#fda4af" }}>{copy.shortfall(shortfall.toLocaleString("ko-KR"))}</div> : null}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isSubmitting}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "12px 16px",
              fontWeight: 800,
              cursor: isSubmitting ? "default" : "pointer",
              background: "linear-gradient(135deg,#db2777,#9333ea)",
              color: "#fff",
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting
              ? copy.processing
              : copy.unlockCta}
          </button>

          <button
            type="button"
            onClick={() => router.push("/points")}
            style={{
              borderRadius: "12px",
              padding: "12px 16px",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid rgba(251,191,36,0.45)",
              background: "rgba(251,191,36,0.1)",
              color: "#fde68a",
            }}
          >
            {copy.paymentPage}
          </button>
        </div>

        {message ? (
          <p style={{ margin: "12px 0 0", color: "#fef08a", fontSize: "0.92rem" }}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}
