"use client";
import { useLayoutEffect, useRef } from "react";
import { PaymentPigVisual } from "./PaymentPigVisual";
import styles from "./payment-welcome.module.css";

/** Presentation only: callers must already hold a confirmed server grant. */
export function PaymentWelcome({ title, description }: { title: string; description: string }) {
  const card = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusedCard = card.current;
    focusedCard?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected && document.activeElement === focusedCard) previous.focus({ preventScroll: true }); };
  }, []);
  return <div className={styles.backdrop} data-ggulggul-welcome="true">
    <div ref={card} tabIndex={-1} role="status" aria-live="polite" onKeyDown={event => { if (event.key === "Tab") event.preventDefault(); }} className={styles.card}>
      <PaymentPigVisual tone="pass" />
      <h2>{title}</h2><p>{description}</p>
      <span className={styles.petals} aria-hidden="true" />
    </div>
  </div>;
}
