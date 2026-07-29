"use client";

/**
 * 봉인 해독 — 생성 진행 화면.
 *
 * 배치(4장씩)가 끝날 때마다 진행률이 갱신된다. 진행률은 5~95로 클램프해 두어
 * 시작 직후에도 멈춘 것처럼 보이지 않고, 끝나기 전에 100처럼 보이지도 않는다.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { getNarratorAsset } from "../data/assets";
import { CODEX_ACTS } from "../data/acts";
import styles from "../styles/codex.module.css";

const DECRYPT_LINES = [
  { latin: "Decrypting", korean: "명식을 세우고 오행의 무게를 재는 중" },
  { latin: "Reading Destiny", korean: "명반 열두 궁에 별을 앉히는 중" },
  { latin: "Cross-checking", korean: "부부궁과 일간이 같은 말을 하는지 맞춰 보는 중" },
  { latin: "Tracing Threads", korean: "끌림과 갈등이 시작되는 자리를 찾는 중" },
  { latin: "Synchronizing", korean: "지나온 대운과 다가올 세운을 겹쳐 보는 중" },
  { latin: "Sealing", korean: "마지막 편지를 옮겨 적는 중" },
] as const;

interface CodexGeneratingProps {
  completed: number;
  total: number;
  latestTitles: string[];
  name: string;
}

export default function CodexGenerating({ completed, total, latestTitles, name }: CodexGeneratingProps) {
  const [lineIndex, setLineIndex] = useState(0);

  // 시작 직후 0%로 멈춰 보이거나 끝나기 전에 100%로 보이지 않게 5~95로 가둔다.
  const raw = total > 0 ? Math.round((completed / total) * 100) : 0;
  const percent = completed >= total && total > 0 ? 100 : Math.min(95, Math.max(5, raw));
  const currentAct = CODEX_ACTS.find((act) => completed + 1 >= act.from && completed + 1 <= act.to) || CODEX_ACTS[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % DECRYPT_LINES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const line = DECRYPT_LINES[lineIndex];

  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center py-16 text-center" aria-label="인연의 서 생성 중">
      <div className={styles.measure}>
        <Image
          src={getNarratorAsset("calm")}
          alt="책을 읽고 있는 박지은"
          width={360}
          height={500}
          unoptimized
          className="mx-auto h-[24svh] w-auto object-contain"
          style={{ filter: "drop-shadow(0 22px 46px rgba(0,0,0,.65))" }}
        />

        <p
          className={`${styles.numeral} mt-10 text-[clamp(1.0625rem,3.6vw,1.375rem)]`}
          style={{ letterSpacing: "0.2em", color: "var(--codex-gold)" }}
          aria-live="polite"
        >
          {line.latin}
        </p>
        <p className="mt-4 text-[0.9375rem] leading-8" style={{ color: "var(--codex-ink-text-muted)" }}>
          {line.korean}
        </p>

        <hr className={`${styles.rule} mt-10`} />

        <div
          className="mt-6 h-px w-full"
          style={{ background: "rgba(232,213,163,.14)" }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="인연의 서 완성 진행률"
        >
          <div
            className="h-px transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%`, background: "var(--codex-gold)", boxShadow: "0 0 14px 0 rgba(232,213,163,.6)" }}
          />
        </div>
        <p className={`${styles.numeral} mt-5 text-[0.875rem]`} style={{ letterSpacing: "0.14em", color: "var(--codex-gold)" }}>
          {currentAct.numeral} · {completed} / {total}
        </p>

        <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--codex-ink-text-muted)" }}>
          {name ? `${name}님의 인연의 서를 쓰는 중입니다` : "당신의 인연의 서를 쓰는 중입니다"}
        </p>

        {latestTitles.length ? (
          <ul className="mx-auto mt-10 max-w-[36ch] space-y-2 text-left" aria-label="완성된 장">
            {latestTitles.slice(-3).map((title) => (
              <li
                key={title}
                className="truncate border-b border-[color:var(--codex-rule)] pb-2 text-[0.8125rem]"
                style={{ color: "var(--codex-ink-text-muted)" }}
              >
                {title}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-12 text-[0.75rem] leading-6" style={{ color: "rgba(185,173,153,.62)" }}>
          창을 닫아도 지금까지 쓰인 장은 보관됩니다. 다시 들어오면 이어서 완성할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
