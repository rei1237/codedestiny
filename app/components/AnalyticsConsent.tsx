"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { savedAnalyticsConsent } from "../_lib/analytics-consent";
import styles from "./AnalyticsConsent.module.css";

type Choice = "accepted" | "essential";
type ConsentWindow = Window & {
  cdSyncConsent?: () => void;
  __cdAppContext?: { isApp?: () => boolean };
};

/** Same host cookie and values as the static shell; never select on behalf of a visitor. */
export default function AnalyticsConsent() {
  const pathname = usePathname() || "/";
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusedBeforeMove = useRef(false);
  const excluded = /^\/(admin|gift|ggulggul)(\/|$)/.test(pathname);
  const snuPage = /^\/snu(\/|$)/.test(pathname);
  const [inPageHost, setInPageHost] = useState<HTMLElement | null>(null);

  const inPage = snuPage || Boolean(inPageHost);

  useEffect(() => {
    const homeSlot = pathname === "/" ? document.getElementById("home-consent-slot") : null;
    if (!homeSlot) {
      setInPageHost(snuPage ? document.getElementById("snu-consent-slot") : null);
      return;
    }
    const desktop = window.matchMedia("(min-width: 769px)");
    const placeBanner = () => {
      focusedBeforeMove.current = Boolean(panel.current?.contains(document.activeElement));
      setInPageHost(desktop.matches ? homeSlot : null);
    };
    placeBanner();
    desktop.addEventListener("change", placeBanner);
    return () => desktop.removeEventListener("change", placeBanner);
  }, [pathname, snuPage]);

  useEffect(() => {
    // Preserve the native-app consent policy. This banner is for web visitors.
    if ((window as ConsentWindow).__cdAppContext?.isApp?.()) return;
    setReady(true);
    setOpen(!excluded && !savedAnalyticsConsent());
  }, [pathname, excluded]);

  // Reopening lives in the footers ("쿠키 설정", data-cd-cookie-settings), not a floating pill that covered sticky CTAs.
  // The footers stay server components, so the click is picked up here by delegation.
  useEffect(() => {
    const reopen = (event: MouseEvent) => {
      const trigger = (event.target as Element | null)?.closest<HTMLElement>("[data-cd-cookie-settings]");
      if (!trigger) return;
      opener.current = trigger;
      if (panel.current) panel.current.focus();
      setOpen(true);
    };
    document.addEventListener("click", reopen);
    return () => document.removeEventListener("click", reopen);
  }, []);

  useEffect(() => {
    if (!open || !opener.current) return;
    panel.current?.focus();
  }, [open]);

  useEffect(() => {
    if (focusedBeforeMove.current) panel.current?.focus();
    focusedBeforeMove.current = false;
  }, [inPageHost]);

  // Fixed banner covers the bottom of the page until a choice is made. Publish how much it covers so
  // sticky CTAs (guided flow) and the page bottom padding can sit clear of it instead of underneath.
  const floating = ready && open && !inPage;
  useEffect(() => {
    if (!floating) return;
    const root = document.documentElement;
    const node = panel.current;
    if (!node) return;
    // Inline so it outranks the bottom-nav padding; the banner always reaches higher than the nav.
    const body = document.body;
    const previousPadding = body.style.paddingBottom;
    const update = () => {
      const top = node.getBoundingClientRect().top;
      // The home page already reserves its fixed dock below the banner.
      const dockHeight = node.hasAttribute("data-entry") ? parseFloat(window.getComputedStyle(root).getPropertyValue("--cd-home-nav-height")) || 0 : 0;
      const cover = Math.max(0, Math.round(window.innerHeight - top + 12) - dockHeight);
      root.style.setProperty("--cd-consent-offset", `${cover}px`);
      body.style.paddingBottom = `${cover}px`;
    };
    update();
    root.classList.add("cd-consent-open");
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.classList.remove("cd-consent-open");
      root.style.removeProperty("--cd-consent-offset");
      body.style.paddingBottom = previousPadding;
    };
  }, [floating]);

  function choose(value: Choice) {
    try {
      document.cookie = `cd_cookie_consent=${value}; path=/; max-age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      if (savedAnalyticsConsent() !== value) { setError(true); return; }
      // Mirror the shell's existing preference key; analytics reads the cookie.
      try { window.localStorage.setItem("cd_cookie_consent", value); } catch { /* Cookie remains authoritative. */ }
      document.documentElement.setAttribute("data-cd-cookie-consent", value);
      (window as ConsentWindow).cdSyncConsent?.();
      setError(false);
      setOpen(false);
      opener.current?.focus({ preventScroll: !inPage });
      opener.current = null;
    } catch { setError(true); }
  }

  if (!ready || !open) return null;
  const banner = (
    <section ref={panel} tabIndex={-1} data-entry={pathname === "/" || undefined} className={`${styles.banner}${inPage ? ` ${styles.inPage}` : ""}`} aria-labelledby="analytics-consent-title">
      <div className={styles.heading}>
        <span className={styles.ornament} aria-hidden="true" />
        <h2 id="analytics-consent-title">방문 분석 쿠키 안내</h2>
      </div>
      <p>필수 쿠키는 로그인·결제에 쓰여요. 방문 통계용 Google Analytics 쿠키는 선택할 수 있어요.</p>
      <details className={styles.details}>
        <summary>쿠키 이용 안내</summary>
        <p>유럽경제지역·영국·스위스에서는 동의한 경우에만 방문을 분석해요. 필수 쿠키만 선택해도 서비스를 이용할 수 있어요.</p>
        <a href="/privacy-policy/">개인정보 처리방침</a>
      </details>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("essential")}>필수만 사용</button>
        <button type="button" onClick={() => choose("accepted")}>분석 쿠키 동의</button>
      </div>
      {error ? <p className={styles.error} role="alert">선택을 저장하지 못했어요. 브라우저의 쿠키 허용 설정을 확인한 뒤 다시 선택해 주세요.</p> : null}
    </section>
  );
  return inPage ? (inPageHost ? createPortal(banner, inPageHost) : null) : banner;
}
