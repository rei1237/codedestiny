"use client";

import { useMemo, useState } from "react";
import type { FptiAnalysisResult } from "@/lib/fpti/fpti-types";
import { useFptiSharedCopy } from "./_lib/copy";

type Props = {
  result: FptiAnalysisResult;
};

function symbolPalette(code: string) {
  const primary = code.includes("V") ? "#67E8F9" : "#F59E0B";
  const secondary = code.includes("L") ? "#38BDF8" : "#F97316";
  const glow = code.startsWith("M") ? "#A78BFA" : "#FDE68A";
  return { primary, secondary, glow };
}

function typeBadgeText(result: FptiAnalysisResult) {
  return `${result.code} | ${result.typeName}`;
}

export default function FptiShareCard({ result }: Props) {
  const copy = useFptiSharedCopy();
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(
    () => copy.shareText(result.code, result.typeName, result.oneLiner),
    [copy, result],
  );

  const palette = useMemo(() => symbolPalette(result.code), [result.code]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-100">{copy.shareCardTitle}</h4>
        <span className="text-xs text-slate-300">{copy.shareCardCaption}</span>
      </div>

      <div className="rounded-3xl border border-white/20 bg-[radial-gradient(circle_at_20%_10%,rgba(125,211,252,0.25),transparent_40%),radial-gradient(circle_at_90%_90%,rgba(245,158,11,0.2),transparent_45%),linear-gradient(145deg,#070d1f,#111c36)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-cyan-200">SAJU FPTI SYMBOL CARD</p>
            <p className="mt-1 text-xl font-bold text-amber-200">{result.code}</p>
            <p className="text-sm text-slate-100">{result.typeName}</p>
          </div>
          <div className="rounded-full border border-white/25 px-2.5 py-1 text-[11px] text-slate-100">{typeBadgeText(result)}</div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-3">
          <svg viewBox="0 0 360 180" className="h-auto w-full" role="img" aria-label="FPTI symbol card graphic">
            <defs>
              <linearGradient id="fptiStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={palette.primary} />
                <stop offset="100%" stopColor={palette.secondary} />
              </linearGradient>
              <radialGradient id="fptiGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={palette.glow} stopOpacity="0.7" />
                <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="360" height="180" fill="url(#fptiGlow)" />
            <circle cx="180" cy="90" r="52" fill="none" stroke="url(#fptiStroke)" strokeWidth="3" />
            <circle cx="180" cy="90" r="30" fill="none" stroke="url(#fptiStroke)" strokeWidth="2" opacity="0.75" />
            <path d="M60 126 C110 56, 250 56, 300 126" fill="none" stroke="url(#fptiStroke)" strokeWidth="2.5" opacity="0.9" />
            <path d="M74 52 L180 24 L286 52 L180 80 Z" fill="none" stroke="url(#fptiStroke)" strokeWidth="2" opacity="0.8" />
            <text x="180" y="97" textAnchor="middle" fill="#F8FAFC" fontSize="26" fontWeight="700">{result.code}</text>
          </svg>
        </div>

        <p className="mt-3 text-sm text-slate-100">{result.oneLiner}</p>
        <p className="mt-1 text-xs text-cyan-100">{copy.shareTypeDescLabel} {result.summary}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#050617]/70 p-2 backdrop-blur">
        <button
          type="button"
          onClick={copyToClipboard}
          className="rounded-full bg-[linear-gradient(120deg,#0ea5e9,#2563eb,#f59e0b)] px-4 py-2 text-xs font-semibold text-white"
        >
          {copied ? copy.shareCopyDone : copy.shareCopyIdle}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#E9C46A]/55 px-4 py-2 text-xs text-[#F6D365]"
        >
          {copy.shareToFriendLabel}
        </a>
      </div>
    </section>
  );
}
