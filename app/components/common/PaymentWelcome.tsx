"use client";
import { MeditatingYeongnyangi } from "./MeditatingYeongnyangi";
import styles from "./payment-welcome.module.css";
/** A verified receipt notice. Never captures focus, locks scrolling or covers the result. */
export function PaymentWelcome({ title, description }: { title: string; description: string }) {
  const night = typeof window !== 'undefined' && /^\/(yeongnyangi|checkout)(\/|$)/.test(window.location.pathname);
  return <div className={styles.backdrop} data-ggulggul-welcome="true" data-yn-night={night ? '' : undefined}>
    <div role="status" aria-live="polite" className={styles.card}>
      <MeditatingYeongnyangi compact />
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
  </div>;
}
