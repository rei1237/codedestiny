"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, PawPrint } from "lucide-react";
import { story } from "./home-data";

const assetPath = (name: string) => `/assets/yeongnyangi/original/${name}.webp`;

export default function StoryPanel({ step, onPrevious, onNext, onClose, onReading }: {
  step: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onReading: () => void;
}) {
  const readingRef = useRef<HTMLDivElement>(null);
  const scene = story[step];
  const last = step === story.length - 1;

  useEffect(() => {
    if (readingRef.current) readingRef.current.scrollTop = 0;
    const next = story[step + 1];
    if (!next) return;
    const links = [next.background, next.character, next.after].filter(Boolean).map((name) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = assetPath(name!);
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((link) => link.remove());
  }, [step]);

  return (
    <div className="story-panel">
      <div key={`visual-${step}`} className={`story-visual mood-${scene.mood}${scene.portrait ? " is-portrait" : ""}`} aria-hidden="true">
        <img className="story-background" src={assetPath(scene.background)} alt="" width={900} height={506} decoding="async" />
        <div className={`story-cast${scene.after ? " has-transition" : ""}`}>
          <img className="story-character first-frame" src={assetPath(scene.character)} alt="" width={520} height={520} decoding="async" />
          {scene.after && <img className="story-character final-frame" src={assetPath(scene.after)} alt="" width={520} height={520} decoding="async" />}
        </div>
        <span className="story-scene-caption">영묘진인의 이야기</span>
      </div>
      <div className="story-reading" ref={readingRef}>
        <div className="story-progress" role="group" aria-label={`${step + 1} / ${story.length} 장면`}>
          {story.map((item, index) => <span key={item.title} className={index <= step ? "read" : ""} />)}
        </div>
        <div className="story-text" aria-live="polite" aria-atomic="true">
          <h2>{scene.title}</h2>
          <span className="story-page-number">{String(step + 1).padStart(2, "0")} / 08</span>
          <p>{scene.text}</p>
          <blockquote>{scene.line}</blockquote>
        </div>
      </div>
      <div className="story-controls">
        <button className="icon-button" aria-label="이전 장면" disabled={step === 0} onClick={onPrevious}><ArrowLeft size={19} /></button>
        <button className="story-next" onClick={last ? onReading : onNext}>
          {last ? <PawPrint size={17} /> : null}
          {last ? "영냥이에게 운세 보기" : "다음 이야기"}<ArrowRight size={17} />
        </button>
        <button className="story-exit" onClick={onClose}>{last ? "점술방으로 돌아가기" : "이야기 나가기"}</button>
      </div>
    </div>
  );
}
