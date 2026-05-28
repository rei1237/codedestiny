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

const STORAGE_KEY = "cd_disclaimer_dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function DisclaimerBanner({ dismissible = true, className = "" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!dismissible) {
      setVisible(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const dismissedAt = raw ? Number(raw) : 0;
      const valid = Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS;
      if (!valid) setVisible(true);
    } catch (e) {
      setVisible(true);
    }
  }, [dismissible]);

  function handleDismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={`${styles.disclaimerBar} ${className}`}
      role="note"
      aria-label="면책 조항 안내"
    >
      <span className={styles.disclaimerIcon}>⚠️</span>
      <span className={styles.disclaimerText}>
        본 서비스는 <strong>오락 및 참고 목적</strong>의 콘텐츠이며,
        실제 의료·법률·금융 상담을 대체하지 않습니다.
        중요한 결정은 반드시 전문가와 상담하세요.
      </span>
      {dismissible && (
        <button
          className={styles.disclaimerClose}
          onClick={handleDismiss}
          aria-label="면책 조항 닫기"
        >
          ✕
        </button>
      )}
    </div>
  );
}
