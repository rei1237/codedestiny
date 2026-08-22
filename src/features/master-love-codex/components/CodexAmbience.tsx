"use client";

/**
 * 코덱스 앰비언스 — 고요한 서고의 배경음 한 겹.
 *
 * 오디오 요소와 토글은 이 파일 한 곳에만 둔다. 입장 라우트와 열람 라우트가 같은
 * 컴포넌트를 서로 다른 트랙으로 마운트하므로 재생 로직을 각자 만들지 않는다.
 * 자동재생은 브라우저 정책상 제스처가 필요해 막힐 수 있으므로, 막히면 첫 상호작용에서
 * 한 번만 다시 시도한다(운명의 찻집과 같은 방식 — 새 계층을 얹지 않았다).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MASTER_LOVE_CODEX_BGM_KEY } from "../constants";
import type { MasterLoveCodexBgmTrack } from "../data/assets";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexAmbienceProps {
  /** 단계에 맞는 트랙 — 바뀌면 그 자리에서 갈아탄다 */
  track: MasterLoveCodexBgmTrack;
}

export default function CodexAmbience({ track }: CodexAmbienceProps) {
  const copy = useMasterLoveCodexCopy();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MASTER_LOVE_CODEX_BGM_KEY) === "off") setEnabled(false);
    } catch { /* best-effort */ }
    setPreferenceReady(true);
  }, []);

  const play = useCallback(async (force = false) => {
    const audio = audioRef.current;
    if (!audio || !preferenceReady || (!force && !enabled)) return;
    try {
      audio.volume = track.volume;
      if (audio.src !== track.url) {
        audio.src = track.url;
        audio.load();
      }
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [enabled, preferenceReady, track.url, track.volume]);

  useEffect(() => {
    if (!preferenceReady) return undefined;
    if (!enabled) {
      audioRef.current?.pause();
      setPlaying(false);
      return undefined;
    }

    void play();

    let unlocked = false;
    const removeUnlockListeners = () => {
      window.removeEventListener("pointerdown", unlockOnFirstInteraction);
      window.removeEventListener("keydown", unlockOnFirstInteraction);
      window.removeEventListener("touchstart", unlockOnFirstInteraction);
    };
    function unlockOnFirstInteraction() {
      if (unlocked) return;
      unlocked = true;
      removeUnlockListeners();
      const audio = audioRef.current;
      if (!audio || audio.paused) void play();
    }
    window.addEventListener("pointerdown", unlockOnFirstInteraction);
    window.addEventListener("keydown", unlockOnFirstInteraction);
    window.addEventListener("touchstart", unlockOnFirstInteraction);

    return removeUnlockListeners;
  }, [enabled, play, preferenceReady]);

  function toggleBgm() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    try {
      window.localStorage.setItem(MASTER_LOVE_CODEX_BGM_KEY, nextEnabled ? "on" : "off");
    } catch { /* best-effort */ }
    if (nextEnabled) void play(true);
  }

  return (
    <>
      <audio ref={audioRef} className={styles.bgmAudio} data-track={track.key} loop preload="none" />
      <button
        type="button"
        className={styles.bgmToggle}
        data-active={enabled && playing ? "true" : "false"}
        aria-label={enabled ? copy.bgmOnAriaLabel : copy.bgmOffAriaLabel}
        aria-pressed={enabled}
        onClick={toggleBgm}
      >
        {enabled
          ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
        <em>{enabled ? (playing ? "ON" : "READY") : "OFF"}</em>
      </button>
    </>
  );
}
