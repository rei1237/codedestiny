"use client";

import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";

const original = (name: string) => `/assets/yeongnyangi/original/${name}.webp`;
const mood = (name: string) => `/assets/yeongnyangi/moods/${name}.webp`;
// 글자 없는 전신 표정만 쓴다(moods/README.md). 첫 장은 낮·밤 기본 포즈이고, 나머지는 감정이 번갈아 나오도록 배치한다.
const poses = [
  mood("coffee-savor"), mood("coffee-smile"), mood("heart"), mood("beam"), mood("wink"), mood("shy"),
  mood("sparkle"), mood("startled"), mood("ponder"), mood("abacus"), mood("wave"),
  mood("drum"), mood("weary"), mood("laptop"), mood("stretch"), mood("bubble-bath"), mood("blanket"),
  mood("side-sit"), mood("lounge"), mood("coffee-sigh"), mood("coffee-sulky"),
];
export default function CatMotion({ daytime = false }: { daytime?: boolean }) {
  const [pose, setPose] = useState(0);
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    if (frame === null) return;
    const timer = setTimeout(() => setFrame(frame >= 11 ? null : frame + 1), 110);
    return () => clearTimeout(timer);
  }, [frame]);
  // 낮에는 첫 두 장(밤 음미·낮 미소) 순서를 바꿔 미소로 시작한다.
  const still = poses[daytime && pose < 2 ? 1 - pose : pose];
  return <div className="ivory-stage measured-motion">
    <div className="cat-motion-canvas" aria-hidden="true">
      <img src={still} width={320} height={320} alt="" className={frame === null ? "motion-active" : ""} loading="lazy" />
      {[1,2,3,4,5,6].map(i => <img key={i} src={original(`walk-pose-${i}`)} width={240} height={230} alt="" className={frame !== null && frame % 6 === i - 1 ? "motion-active walk-pose" : "walk-pose"} loading="lazy" />)}
    </div>
    <button className="expression-button" aria-label="영냥이 표정 바꾸기" disabled={frame !== null} onClick={() => {
      const next = (pose + 1) % poses.length;
      // 표정은 한 장만 렌더한다. 이번 표정은 걷기 전환 동안 받고, 그다음 표정은 미리 받아 둔다.
      new Image().src = poses[(next + 1) % poses.length];
      setPose(next);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setFrame(0);
    }}><PawPrint size={16} /><span>표정 바꾸기</span></button>
  </div>;
}
