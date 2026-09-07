"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { addMeditationMinute } from "../_lib/entry-writes";
import { DIARY_MEDITATION_TRACKS, findMeditationTrack } from "../_lib/meditation-tracks";
import styles from "../_styles/diary.module.css";

/**
 * 명상 음악 재생기. 🔴 **셸(레이아웃) 레벨에 상주한다** — 시트는 컨트롤만 가진다.
 * 오디오 엘리먼트를 시트 안에 두면 시트를 닫는 순간 언마운트되어 재생이 끊기는데,
 * 명상 중에 목록을 닫는 것은 정상 사용이다(계획 문서 PR-I 의 「오디오 지속」 조건).
 *
 * 🔴 **들은 시간만 센다** — 셸은 곡을 여는 순간 `meditationMinutes` 를 올리고 `satsCompleted`
 * 까지 켰지만(`js/luck-sync-diary.js:2516`), 여기서는 재생 위치가 실제로 흐른 만큼만
 * 모아 1분이 될 때마다 한 번 쓴다. 되감기·곡 교체는 세지 않는다.
 * 🔴 되감기 판별을 `timeupdate` 의 위치 차이로 하는 이유는, 타이머로 세면 브라우저가 탭을
 * 내렸을 때의 스로틀과 일시정지 구간까지 함께 세기 때문이다. 대신 화면을 오래 내려 둔
 * 구간은 **덜 세질 수 있다**(과소 계상 쪽이라 기록이 부풀지 않는다).
 */

interface DiaryAudioValue {
  /** 지금 걸려 있는 곡. 정지하면 `null` 이고 그때 미니 플레이어도 사라진다. */
  trackId: string | null;
  playing: boolean;
  /** 그 곡을 튼다. 이미 그 곡이면 재생/일시정지를 뒤집는다. */
  toggle: (trackId: string) => void;
  /** 목록 순서대로 튼다(걸린 곡이 없으면 첫 곡부터). */
  playInOrder: () => void;
  playShuffled: () => void;
  stop: () => void;
}

const DiaryAudioContext = createContext<DiaryAudioValue>({
  trackId: null,
  playing: false,
  toggle: () => {},
  playInOrder: () => {},
  playShuffled: () => {},
  stop: () => {},
});

export function useDiaryAudio(): DiaryAudioValue {
  return useContext(DiaryAudioContext);
}

const DIARY_AUDIO_TEXT = {
  ko: { label: "명상 음악", play: "재생", pause: "일시정지", stop: "정지", playing: "재생 중" },
  en: { label: "Meditation music", play: "Play", pause: "Pause", stop: "Stop", playing: "Playing" },
} as const;

const copy = DIARY_AUDIO_TEXT.ko;

/** 미니 플레이어가 차지하는 높이. 🔴 `--dy-nav-offset` 이 이 값을 더해 하단 여백을 한 곳에서 만든다. */
const MINI_PLAYER_HEIGHT = "52px";

function randomTrackId(exceptId: string | null): string {
  const pool = DIARY_MEDITATION_TRACKS.filter((track) => track.id !== exceptId);
  const list = pool.length > 0 ? pool : DIARY_MEDITATION_TRACKS;
  return list[Math.floor(Math.random() * list.length)].id;
}

export default function DiaryAudioProvider({ children }: { children: ReactNode }) {
  const { ymd } = useDiaryToday();
  const { updateEntry } = useDiaryWriter();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 직전 `timeupdate` 의 재생 위치. 차이를 재려는 것뿐이다. */
  const lastPositionRef = useRef(0);
  /** 아직 1분을 채우지 못한 초. 분으로 넘길 때마다 60을 덜어낸다. */
  const carrySecondsRef = useRef(0);

  const [trackId, setTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const track = findMeditationTrack(trackId);

  /* 엘리먼트는 상태를 따라간다 — 재생/정지 명령을 여기저기서 직접 내리면 화면 표시와
     실제 재생이 갈린다(버튼은 상태만 바꾼다). */
  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    if (!track) {
      element.pause();
      element.removeAttribute("src");
      element.load();
      return;
    }
    if (element.getAttribute("src") !== track.url) {
      element.src = track.url;
      lastPositionRef.current = 0;
    }
    if (playing) {
      element.play().catch(() => setPlaying(false));
    } else {
      element.pause();
    }
  }, [track, playing]);

  /* 🔴 하단 여백은 한 곳(`--dy-bottom-offset`)에서만 늘린다 — 미니 플레이어가 뜬 동안 본문·시트가
     그만큼 위로 올라와야 하는데, 여백을 화면마다 따로 더하면 어긋나는 곳이 반드시 생긴다.
     토큰이 `.shell` 에 선언돼 있고 이 컴포넌트는 그 안쪽이라, 상속의 출발점인 문서 루트에 쓴다. */
  useEffect(() => {
    if (!trackId || typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--dy-mini-h", MINI_PLAYER_HEIGHT);
    return () => {
      root.style.removeProperty("--dy-mini-h");
    };
  }, [trackId]);

  const handleTimeUpdate = useCallback(() => {
    const element = audioRef.current;
    if (!element || !trackId || !ymd) return;
    const delta = element.currentTime - lastPositionRef.current;
    lastPositionRef.current = element.currentTime;
    // 되감기(음수)와 건너뛰기·곡 교체(한 번에 5초 넘게 뛰는 것)는 들은 시간이 아니다.
    if (!(delta > 0) || delta > 5) return;

    carrySecondsRef.current += delta;
    while (carrySecondsRef.current >= 60) {
      carrySecondsRef.current -= 60;
      updateEntry(ymd, addMeditationMinute(trackId));
    }
  }, [trackId, ymd, updateEntry]);

  const handleEnded = useCallback(() => {
    lastPositionRef.current = 0;
    setTrackId((current) => {
      if (!current) return current;
      if (shuffle) return randomTrackId(current);
      const index = DIARY_MEDITATION_TRACKS.findIndex((item) => item.id === current);
      const next = DIARY_MEDITATION_TRACKS[(index + 1) % DIARY_MEDITATION_TRACKS.length];
      return next.id;
    });
  }, [shuffle]);

  const toggle = useCallback((nextId: string) => {
    setTrackId((current) => {
      if (current === nextId) {
        setPlaying((on) => !on);
        return current;
      }
      setPlaying(true);
      return nextId;
    });
  }, []);

  const playInOrder = useCallback(() => {
    setShuffle(false);
    setTrackId((current) => current || DIARY_MEDITATION_TRACKS[0].id);
    setPlaying(true);
  }, []);

  const playShuffled = useCallback(() => {
    setShuffle(true);
    setTrackId((current) => randomTrackId(current));
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setTrackId(null);
    carrySecondsRef.current = 0;
    lastPositionRef.current = 0;
  }, []);

  const value = useMemo<DiaryAudioValue>(
    () => ({ trackId, playing, toggle, playInOrder, playShuffled, stop }),
    [trackId, playing, toggle, playInOrder, playShuffled, stop],
  );

  return (
    <DiaryAudioContext.Provider value={value}>
      {children}
      {/* 🔴 `preload="none"` — 목록을 열기만 해도 23곡을 받아 오면 그것부터가 데이터 낭비다. */}
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {track ? (
        <div className={styles.miniPlayer} role="status" aria-label={copy.label}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => toggle(track.id)}
            aria-label={playing ? copy.pause : copy.play}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <span className={styles.miniTitle}>{track.title}</span>
          <button type="button" className={styles.iconButton} onClick={stop} aria-label={copy.stop}>
            ✕
          </button>
        </div>
      ) : null}
    </DiaryAudioContext.Provider>
  );
}
