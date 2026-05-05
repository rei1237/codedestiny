"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePayment } from "../hooks/usePayment";

export default function FlowerUnlockGate({
  slug,
  featureKey,
  requiredCoins = 50,
  currentPoints = 0,
}) {
  const router = useRouter();
  const { startPayment, endPayment } = usePayment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const nextPath = useMemo(() => {
    const raw = String(slug || "").replace(/^\/+/, "");
    return `/${raw}`;
  }, [slug]);

  const shortfall = Math.max(0, Number(requiredCoins || 0) - Number(currentPoints || 0));

  async function handleUnlock() {
    if (isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);
    let paymentOverlayActive = false;

    try {
      paymentOverlayActive = true;
      startPayment("결제를 확인 중입니다...");
      const response = await fetch("/api/coins/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost: Number(requiredCoins || 50),
          featureKey: String(featureKey || "flower-destiny"),
          reason: "운명의 꽃 상세 콘텐츠 해금",
          forceDeduct: true,
          requestId:
            "flower-unlock:" +
            String(featureKey || "flower-destiny") +
            ":" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 9),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (response.status === 402) {
        setMessage("코인이 부족합니다. 충전 페이지로 이동합니다.");
        router.push("/points");
        return;
      }

      if (!response.ok) {
        setMessage(String(payload?.message || "해금 처리에 실패했습니다. 잠시 후 다시 시도해 주세요."));
        return;
      }

      setMessage("해금이 완료되었습니다. 결과를 불러오는 중입니다.");
      router.refresh();
      endPayment();
      paymentOverlayActive = false;
    } catch (_error) {
      setMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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
        <p style={{ margin: 0, fontSize: "12px", color: "#f9a8d4", fontWeight: 700, letterSpacing: "0.05em" }}>LOCKED CONTENT</p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(1.35rem, 4vw, 2rem)", color: "#f8fafc", lineHeight: 1.3 }}>
          운명의 꽃 상세 결과는 해금 후 확인할 수 있습니다
        </h1>
        <p style={{ margin: 0, lineHeight: 1.8, color: "#dbe5ff" }}>
          이 페이지는 로그인 사용자 중 해당 콘텐츠를 해금한 경우에만 열립니다.
          <br />
          50코인을 사용하여 운명의 꽃 결과를 확인할 수 있습니다.
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
          <div>현재 보유 코인: <strong>{Number(currentPoints || 0).toLocaleString("ko-KR")}</strong></div>
          <div>필요 코인: <strong>{Number(requiredCoins || 0).toLocaleString("ko-KR")}</strong></div>
          {shortfall > 0 ? <div style={{ color: "#fda4af" }}>부족 코인: {shortfall.toLocaleString("ko-KR")}</div> : null}
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
              ? "해금 처리 중..."
              : "50코인을 사용하여 운명의 꽃을 확인하시겠습니까?"}
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
            코인 충전하기
          </button>
        </div>

        {message ? (
          <p style={{ margin: "12px 0 0", color: "#fef08a", fontSize: "0.92rem" }}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}
