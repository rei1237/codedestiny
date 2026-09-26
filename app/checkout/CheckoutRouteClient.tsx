"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { refreshAuth } from "@/app/_lib/auth-store";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getCheckoutCopy } from "./checkout-copy";
import styles from "./checkout.module.css";

const CheckoutClient = dynamic(() => import("./CheckoutClient"), {
  ssr: false,
  loading: () => <CheckoutShell />,
});

export default function CheckoutRouteClient() {
  // CheckoutClient 는 next/dynamic 청크라 다운로드 후에야 마운트된다 — 그 안의 refreshAuth() 를
  // 기다리면 청크 로드 → 인증 확인이 직렬이 된다. 청크 로드와 병렬로 여기서 먼저 시작해 둔다
  // (refreshAuth 는 인플라이트 요청을 병합하므로 CheckoutClient 마운트 시 재호출해도 안전하다).
  useEffect(() => {
    void refreshAuth();
    void import("@/app/_lib/billing-client")
      .then(({ prewarmPaidCheckout }) => prewarmPaidCheckout())
      .catch(() => { /* The checkout gate retains normal SDK loading and errors. */ });
  }, []);

  return <CheckoutClient />;
}

function CheckoutShell() {
  // 본체가 붙기 전 한 프레임을 채우는 셸이다. 여기가 한국어로 고정되면 해외 사용자는 결제 화면의
  // 첫 화면을 한국어로 본다 — 본체와 같은 표를 쓴다(checkout-copy.ts).
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getCheckoutCopy(lang);

  useEffect(() => {
    const sync = () => setLang(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.paper} aria-busy="true">
        <h1>{copy.title}</h1>
        <p className={styles.intro}>{copy.shellLoading}</p>
      </section>
    </div>
  );
}
