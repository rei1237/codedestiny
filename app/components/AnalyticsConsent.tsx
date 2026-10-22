"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./AnalyticsConsent.module.css";

type Choice = "accepted" | "essential";
type ConsentWindow = Window & {
  cdSyncConsent?: () => void;
  __cdAppContext?: { isApp?: () => boolean };
};

function savedChoice(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)cd_cookie_consent=([^;]*)/);
    const value = match ? decodeURIComponent(match[1]) : "";
    return value === "accepted" || value === "essential" ? value : "";
  } catch { return ""; }
}

/** Same host cookie and values as the static shell; never select on behalf of a visitor. */
export default function AnalyticsConsent() {
  const pathname = usePathname() || "/";
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const requested = useRef(false);
  const excluded = /^\/(admin|gift|ggulggul)(\/|$)/.test(pathname);

  useEffect(() => {
    // Preserve the native-app consent policy. This banner is for web visitors.
    if ((window as ConsentWindow).__cdAppContext?.isApp?.()) return;
    setReady(true);
    setOpen(!excluded && !savedChoice());
  }, [pathname, excluded]);

  // Reopening lives in the footers ("쿠키 설정", data-cd-cookie-settings), not a floating pill that covered sticky CTAs.
  // The footers stay server components, so the click is picked up here by delegation.
  useEffect(() => {
    const reopen = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest?.("[data-cd-cookie-settings]")) return;
      requested.current = true;
      setOpen(true);
    };
    document.addEventListener("click", reopen);
    return () => document.removeEventListener("click", reopen);
  }, []);

  useEffect(() => {
    if (!open || !requested.current) return;
    requested.current = false;
    panel.current?.focus();
  }, [open]);

  function choose(value: Choice) {
    try {
      document.cookie = `cd_cookie_consent=${value}; path=/; max-age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      if (savedChoice() !== value) { setError(true); return; }
      // Mirror the shell's existing preference key; analytics reads the cookie.
      try { window.localStorage.setItem("cd_cookie_consent", value); } catch { /* Cookie remains authoritative. */ }
      document.documentElement.setAttribute("data-cd-cookie-consent", value);
      (window as ConsentWindow).cdSyncConsent?.();
      setError(false);
      setOpen(false);
    } catch { setError(true); }
  }

  if (!ready || !open) return null;
  return (
    <section ref={panel} tabIndex={-1} className={styles.banner} aria-labelledby="analytics-consent-title">
      <div className={styles.heading}>
        <span className={styles.ornament} aria-hidden="true" />
        <h2 id="analytics-consent-title">방문 분석 쿠키를 선택해 주세요</h2>
      </div>
      <p>로그인·결제에 필요한 필수 쿠키를 사용해요. 동의하면 방문과 구매 흐름을 분석하는 쿠키도 사용해요. 필수만 선택해도 서비스를 이용할 수 있어요.</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("essential")}>필수만 사용</button>
        <button type="button" onClick={() => choose("accepted")}>분석 쿠키 동의</button>
        <a href="/privacy-policy/">개인정보 처리방침</a>
      </div>
      {error ? <p className={styles.error} role="alert">선택을 저장하지 못했어요. 브라우저의 쿠키 허용 설정을 확인한 뒤 다시 선택해 주세요.</p> : null}
    </section>
  );
}
