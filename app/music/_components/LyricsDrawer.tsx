"use client";

import { useEffect, useState } from "react";
import type { MusicCopy } from "../_lib/musicCopy";
import styles from "../music-lounge.module.css";
import { CloseIcon } from "./MusicIcons";

// 가사 모듈(약 287KB)은 서랍이 처음 열릴 때만 import 한다. 프리페치 없음.
let musicLyricsModulePromise: Promise<{ lyricsFromAudioFileName: (audioFileName: string) => string | undefined }> | null = null;
const lyricsTextCache = new Map<string, string>();

function getMusicLyricsModule() {
  if (!musicLyricsModulePromise) {
    musicLyricsModulePromise = import("../_data/musicLyrics");
  }
  return musicLyricsModulePromise;
}

type LyricsDrawerProps = {
  copy: MusicCopy;
  title: string;
  lyricsLookupKey: string | undefined;
  onClose: () => void;
};

export function LyricsDrawer({ copy, title, lyricsLookupKey, onClose }: LyricsDrawerProps) {
  const [lyricsText, setLyricsText] = useState(() => (lyricsLookupKey && lyricsTextCache.get(lyricsLookupKey)) || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!lyricsLookupKey) {
      setLyricsText("");
      setIsLoading(false);
      return;
    }
    if (lyricsTextCache.has(lyricsLookupKey)) {
      setLyricsText(lyricsTextCache.get(lyricsLookupKey) || "");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLyricsText("");

    void getMusicLyricsModule()
      .then((module) => {
        if (cancelled) return;
        const nextLyrics = module.lyricsFromAudioFileName(lyricsLookupKey);
        const nextLyricsText = typeof nextLyrics === "string" ? nextLyrics.trim() : "";
        lyricsTextCache.set(lyricsLookupKey, nextLyricsText);
        setLyricsText(nextLyricsText);
      })
      .catch(() => {
        if (!cancelled) {
          lyricsTextCache.set(lyricsLookupKey, "");
          setLyricsText("");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lyricsLookupKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <section id="music-lyrics" className={styles.lyrics} aria-label={copy.lyricsAria}>
      <div className={styles.lyricsHead}>
        <h2 className={styles.lyricsTitle}>{title}</h2>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={copy.close}>
          <CloseIcon />
        </button>
      </div>
      <div className={styles.lyricsBody} aria-busy={isLoading}>
        {isLoading ? (
          <p className={styles.lyricsNote}>{copy.lyricsLoading}</p>
        ) : lyricsText ? (
          <pre className={styles.lyricsText}>{lyricsText}</pre>
        ) : (
          <p className={styles.lyricsNote}>{copy.lyricsEmpty}</p>
        )}
      </div>
    </section>
  );
}
