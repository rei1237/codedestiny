"use client";

import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./book-open-cover.module.css";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface BookOpenCoverCopy {
  kicker: string;
  skipButton: string;
  skipAriaLabel: string;
}

const BOOK_OPEN_COVER_EN: BookOpenCoverCopy = {
  kicker: "Life Book",
  skipButton: "Read now",
  skipAriaLabel: "Skip the cover and go to the text",
};

const BOOK_OPEN_COVER_COPY: Partial<Record<LoadingLocale, BookOpenCoverCopy>> = {
  ko: { kicker: "인생의 책", skipButton: "바로 읽기", skipAriaLabel: "표지를 건너뛰고 본문으로" },
  ja: { kicker: "人生の本", skipButton: "すぐ読む", skipAriaLabel: "表紙を飛ばして本文へ" },
  "zh-CN": { kicker: "人生之书", skipButton: "立即阅读", skipAriaLabel: "跳过封面直接进入正文" },
  "zh-TW": { kicker: "人生之書", skipButton: "立即閱讀", skipAriaLabel: "跳過封面直接進入正文" },
  vi: { kicker: "Cuốn Sách Cuộc Đời", skipButton: "Đọc ngay", skipAriaLabel: "Bỏ qua bìa sách và vào nội dung" },
  hi: { kicker: "जीवन की पुस्तक", skipButton: "अभी पढ़ें", skipAriaLabel: "कवर छोड़कर सीधे मुख्य भाग पर जाएं" },
  es: { kicker: "Libro de la Vida", skipButton: "Leer ahora", skipAriaLabel: "Saltar la portada e ir al contenido" },
  fr: { kicker: "Livre de Vie", skipButton: "Lire maintenant", skipAriaLabel: "Passer la couverture et aller au contenu" },
  de: { kicker: "Lebensbuch", skipButton: "Jetzt lesen", skipAriaLabel: "Cover überspringen und zum Inhalt gehen" },
  nl: { kicker: "Levensboek", skipButton: "Nu lezen", skipAriaLabel: "Omslag overslaan en naar de inhoud gaan" },
  ms: { kicker: "Buku Kehidupan", skipButton: "Baca sekarang", skipAriaLabel: "Langkau kulit buku dan pergi ke kandungan" },
};

function getBookOpenCoverCopy(locale: LoadingLocale): BookOpenCoverCopy {
  return BOOK_OPEN_COVER_COPY[locale] || BOOK_OPEN_COVER_EN;
}

function useBookOpenCoverCopy(): BookOpenCoverCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getBookOpenCoverCopy(locale);
}

type BookOpenCoverProps = {
  attemptId: string;
  title: string;
  subtitle: string;
  ownerName: string;
  onOpened: () => void;
};

const OPEN_ANIMATION_MS = 820;

function alreadyOpened(attemptId: string) {
  if (typeof window === "undefined" || !attemptId) return true;
  try {
    // 🔴 재열람 기능이다 — 매번 8초 애니메이션을 보게 하면 학대다. 세션당 1회만 재생한다.
    return window.sessionStorage.getItem(`lifeBookOpened:${attemptId}`) === "1";
  } catch {
    return false;
  }
}

function markOpened(attemptId: string) {
  try {
    window.sessionStorage.setItem(`lifeBookOpened:${attemptId}`, "1");
  } catch {
    // best-effort
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BookOpenCover({ attemptId, title, subtitle, ownerName, onOpened }: BookOpenCoverProps) {
  const copy = useBookOpenCoverCopy();
  const [phase, setPhase] = useState<"closed" | "opening" | "done">("closed");
  const skipRef = useRef<HTMLButtonElement | null>(null);

  const finish = useCallback(() => {
    markOpened(attemptId);
    setPhase("done");
    onOpened();
  }, [attemptId, onOpened]);

  useEffect(() => {
    if (alreadyOpened(attemptId) || prefersReducedMotion()) {
      finish();
      return undefined;
    }
    // 키보드 사용자가 가장 먼저 닿는 곳이 "바로 읽기"여야 한다.
    skipRef.current?.focus();
    const timer = window.setTimeout(() => setPhase("opening"), 420);
    return () => window.clearTimeout(timer);
  }, [attemptId, finish]);

  useEffect(() => {
    if (phase !== "opening") return undefined;
    const timer = window.setTimeout(finish, OPEN_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase, finish]);

  if (phase === "done") return null;

  return (
    <div className={styles.stage} data-phase={phase} role="presentation">
      <div className={styles.cover}>
        <div className={styles.spine} aria-hidden="true" />
        <div className={styles.plate}>
          <BookOpen className={styles.emblem} aria-hidden="true" />
          <p className={styles.kicker}>{copy.kicker}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <p className={styles.owner}>主人公 · {ownerName}</p>
        </div>
      </div>
      <button ref={skipRef} type="button" onClick={finish} className={styles.skip} aria-label={copy.skipAriaLabel}>
        {copy.skipButton}
      </button>
    </div>
  );
}
