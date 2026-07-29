"use client";

/**
 * 마스터 인연의 서 — 생성 진행 화면.
 * 배치(4장씩)가 끝날 때마다 진행률이 갱신되고, 완성된 장 제목이 서가에 하나씩 꽂힌다.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getNarratorAsset, masterLoveCodexAssets } from "../data/assets";

const STAGE_LINES = [
  "명식을 세우고 오행의 무게를 재는 중입니다.",
  "명반 열두 궁에 별을 앉히는 중입니다.",
  "부부궁과 일간이 같은 말을 하는지 맞춰 보는 중입니다.",
  "끌림과 갈등이 시작되는 자리를 찾는 중입니다.",
  "지나온 대운과 다가올 세운을 겹쳐 보는 중입니다.",
  "마지막 편지를 옮겨 적는 중입니다.",
];

interface CodexGeneratingProps {
  completed: number;
  total: number;
  latestTitles: string[];
  name: string;
}

export default function CodexGenerating({ completed, total, latestTitles, name }: CodexGeneratingProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % STAGE_LINES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#0d0714]" aria-label="인연의 서 생성 중">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: `url("${masterLoveCodexAssets.backgrounds.library}")` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0714]/88 via-[#0d0714]/70 to-[#0d0714]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
        <Image
          src={getNarratorAsset("calm")}
          alt="책을 읽고 있는 박지은"
          width={360}
          height={500}
          unoptimized
          className="h-[26svh] w-auto object-contain drop-shadow-[0_20px_44px_rgba(0,0,0,.6)]"
        />

        <p className="mt-6 text-[11px] font-black tracking-[0.3em] text-amber-100/75">MASTER DESTINY</p>
        <h2 className="font-display mt-2 text-xl font-black text-rose-50 sm:text-2xl">
          {name ? `${name}님의 인연의 서를 쓰는 중입니다` : "당신의 인연의 서를 쓰는 중입니다"}
        </h2>

        <div
          className="mt-6 h-2 w-full overflow-hidden rounded-full bg-rose-100/10"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="인연의 서 완성 진행률"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-bold text-amber-100">
          {completed} / {total}장 · {percent}%
        </p>

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-rose-50/75">
          <Loader2 className="h-4 w-4 animate-spin text-amber-200" aria-hidden="true" />
          {STAGE_LINES[lineIndex]}
        </p>

        {latestTitles.length ? (
          <ul className="mt-8 w-full space-y-1.5 text-left" aria-label="완성된 장">
            {latestTitles.slice(-4).map((title) => (
              <li key={title} className="truncate rounded-lg border border-amber-200/20 bg-[#150b1e]/70 px-3 py-2 text-xs font-semibold text-amber-100/85">
                ✓ {title}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-8 text-[11px] leading-5 text-rose-100/45">
          창을 닫아도 지금까지 쓰인 장은 보관됩니다. 다시 들어오면 이어서 완성할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
