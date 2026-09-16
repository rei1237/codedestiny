"use client";

import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";

const poses = ["night-read", "prologue-cat", "day-drink", "room-sleep"];
export default function CatMotion({ daytime = false }: { daytime?: boolean }) {
  const [pose, setPose] = useState(0);
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    if (frame === null) return;
    const timer = setTimeout(() => setFrame(frame >= 11 ? null : frame + 1), 110);
    return () => clearTimeout(timer);
  }, [frame]);
  const still = pose === 0 && daytime ? "day-drink" : poses[pose];
  return <div className="ivory-stage measured-motion">
    <div className="cat-motion-canvas" aria-hidden="true">
      <img src={`/assets/yeongnyangi/original/${still}.webp`} width={320} height={320} alt="" className={frame === null ? "motion-active" : ""} loading="lazy" />
      {[1,2,3,4,5,6].map(i => <img key={i} src={`/assets/yeongnyangi/original/walk-pose-${i}.webp`} width={240} height={230} alt="" className={frame !== null && frame % 6 === i - 1 ? "motion-active walk-pose" : "walk-pose"} loading="lazy" />)}
    </div>
    <button className="expression-button" aria-label="영냥이 표정 바꾸기" disabled={frame !== null} onClick={() => {
      setPose(value => (value + 1) % poses.length);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setFrame(0);
    }}><PawPrint size={16} /><span>표정 바꾸기</span></button>
  </div>;
}
