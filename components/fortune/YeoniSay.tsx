"use client";
// 꿀꿀 무료 결과의 연이 말풍선(2026-11-22). MasterSay(정적 문구·표정)를 ko 로케일에서만 예화 색으로 그린다.
// 서버/첫 렌더는 비워 두어 하이드레이션 불일치가 없다(NakshatraSay 와 같은 방식). 결과 본문·결제와 무관한 장식이다.
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import MasterSay, { type MasterSayInput } from "@/components/fortune/MasterSay";

type YeoniDomain = Extract<MasterSayInput["domain"], "saju" | "humanDesign" | "healingTarot" | "mingriTarot" | "numerology">;

const YEHWA = {
  ["--reading-accent" as string]: "var(--cd-yehwa-line-deep, #a97b3e)",
  ["--reading-wash" as string]: "color-mix(in srgb, var(--cd-yehwa-line, #c9a46a) 9%, transparent)",
  ["--reading-line" as string]: "color-mix(in srgb, var(--cd-yehwa-line, #c9a46a) 45%, transparent)",
};

export default function YeoniSay({ domain, sectionKey }: { domain: YeoniDomain; sectionKey: string }) {
  const [isKo, setIsKo] = useState(false);
  useEffect(() => {
    const sync = () => setIsKo(getCurrentLoadingLocale() === "ko");
    sync();
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  if (!isKo) return null;
  return <div style={YEHWA}><MasterSay say={{ domain, sectionKey }} /></div>;
}
