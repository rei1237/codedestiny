"use client";
import { useEffect, useState } from "react";
import { ChevronRight, Repeat2 } from "lucide-react";
import { companions } from "./catalog";
import s from "./lobby.module.css";

export function Portrait({
  index,
  frame = 0,
}: {
  index: number;
  frame?: number;
}) {
  const hero = companions[index];
  const luna = hero.sheet === "luna";
  return (
    <svg
      role="img"
      aria-label={hero.name}
      viewBox="0 0 320 384"
      overflow="hidden"
    >
      <svg width="320" height="384" overflow="hidden">
        <image
          href={`/assets/novel/atelier/${hero.sheet}.webp`}
          x={-320 * (luna ? 0 : frame)}
          width="1280"
          height="384"
        />
        {luna && frame > 1 && (
          <path
            fill="#a65360"
            d={
              frame === 3
                ? "M165 262 Q170 263 173 259 Q176 262 181 261 Q175 276 165 262Z"
                : "M167 262 Q171 262 173 259 Q175 262 179 262 Q174 269 167 262Z"
            }
          />
        )}
      </svg>
    </svg>
  );
}

function useSpeech(text: string, still: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval>;
    function start() {
      clearInterval(timer);
      if (still || media.matches) {
        setCount(text.length);
        return;
      }
      let cursor = 0;
      setCount(cursor);
      timer = setInterval(() => {
        setCount(++cursor);
        if (cursor >= text.length) clearInterval(timer);
      }, 45);
    }
    start();
    media.addEventListener("change", start);
    return () => {
      clearInterval(timer);
      media.removeEventListener("change", start);
    };
  }, [still, text]);
  const [skipped, setSkipped] = useState(false);
  const speaking = !skipped && count < text.length;
  const frame = speaking ? [0, 2, 3, 2][Math.floor(count / 2) % 4] : 0;
  return {
    visible: speaking ? text.slice(0, count) : text,
    frame,
    speaking,
    finish: () => setSkipped(true),
  };
}

export function NovelLine({
  text,
  speaker,
  still,
  idleActor,
}: {
  text: string;
  speaker: string;
  still: boolean;
  idleActor?: string;
}) {
  const speech = useSpeech(text, still);
  const actor = companions.findIndex((c) => c.speaker === speaker);
  const portrait =
    actor >= 0 ? actor : companions.findIndex((c) => c.speaker === idleActor);
  return (
    <div className={s.novelLine}>
      {portrait >= 0 && (
        <Portrait index={portrait} frame={actor >= 0 ? speech.frame : 0} />
      )}
      <div>
        <small>
          {actor >= 0
            ? companions[actor].name
            : speaker === "sys"
              ? "알림"
              : "이야기"}
        </small>
        <blockquote aria-label={text}>
          <span aria-hidden="true">{speech.visible}</span>
        </blockquote>
        {speech.speaking && (
          <button onClick={speech.finish}>문장 전체 보기</button>
        )}
      </div>
    </div>
  );
}

export function Dialogue({
  index,
  line,
  still,
  next,
  swap,
}: {
  index: number;
  line: number;
  still: boolean;
  next: () => void;
  swap: () => void;
}) {
  const hero = companions[index];
  const text = hero.lines[line];
  const { visible, frame, speaking, finish } = useSpeech(text, still);
  return (
    <>
      <div
        className={s.portrait}
        data-low-face={["luna", "moka", "neo_cat"].includes(hero.sheet)}
      >
        <Portrait index={index} frame={frame} />
      </div>
      <div className={s.speech}>
        <div>
          <b>{hero.name}</b>
          <button aria-label="대표 캐릭터 교체" onClick={swap}>
            <Repeat2 size={16} />
          </button>
        </div>
        <button
          className={s.line}
          aria-label={text + (speaking ? " · 대사 전체 보기" : " · 다음 대사")}
          onClick={() => (speaking ? finish() : next())}
        >
          <span aria-hidden="true">{visible}</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}
