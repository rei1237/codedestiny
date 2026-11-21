"use client";

import { useCallback, useState } from "react";

/**
 * 카드 고르기 연출의 선택형 소리·진동. 기본은 꺼짐이고, 켠 사람만 들린다.
 * 새 음원 파일 없이 WebAudio 합성음 한 번(영냥이 TarotDrawRitual 의 chime 과 같은 방식)과 짧은 진동만 쓴다.
 * reduced-motion 이면 켜 두어도 아무것도 하지 않는다.
 */
export function useRitualFx(reduced: boolean) {
  const [on, setOn] = useState(false);

  const tick = useCallback(
    (high = false) => {
      if (!on || reduced) return;
      try {
        navigator.vibrate?.(10);
      } catch {
        /* 진동은 지원하지 않는 기기가 많다 */
      }
      try {
        const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;
        const context = new AudioCtor();
        const osc = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        osc.type = "sine";
        osc.frequency.setValueAtTime(high ? 660 : 520, now);
        osc.frequency.exponentialRampToValueAtTime(high ? 990 : 700, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(now + 0.3);
        osc.onended = () => void context.close();
      } catch {
        /* 소리는 선택 사항이라 실패해도 흐름을 막지 않는다 */
      }
    },
    [on, reduced],
  );

  const toggle = useCallback(() => setOn((value) => !value), []);
  return { on, toggle, tick };
}
