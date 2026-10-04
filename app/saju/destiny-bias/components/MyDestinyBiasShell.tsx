"use client";

import { useEffect } from "react";
import "../../../../styles/fonts-serif.css";
import "../destiny-bias-fonts.css";
import stage from "../encore.module.css";

interface MyDestinyBiasShellProps {
  children: React.ReactNode;
}

/** 최애운명 전체화면 셸 — 밤 공연장 무대(스포트라이트 빔·헤이즈·필름 그레인). 장식은 전부 CSS, 실존 굿즈·로고 모사 없음. */
export default function MyDestinyBiasShell({ children }: MyDestinyBiasShellProps) {
  // Lock body scroll to this shell when mounted
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className={`${stage.shell} fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]`}
    >
      <div className={stage.backdrop} aria-hidden>
        <span className={stage.photo} />
        <span className={stage.haze} />
        <span className={`${stage.beam} ${stage.beamLeft}`} />
        <span className={`${stage.beam} ${stage.beamCenter}`} />
        <span className={`${stage.beam} ${stage.beamRight}`} />
        <span className={stage.rig} />
        <span className={stage.crowd} />
        <span className={stage.grain} />
        <span className={stage.vignette} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
