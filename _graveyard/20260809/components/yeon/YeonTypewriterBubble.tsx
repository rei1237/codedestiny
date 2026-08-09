"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  lines: string[];
  onComplete?: () => void;
};

export default function YeonTypewriterBubble({ lines, onComplete }: Props) {
  const safeLines = useMemo(() => lines.filter(Boolean), [lines]);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [skipAll, setSkipAll] = useState(false);

  useEffect(() => {
    setLineIndex(0);
    setCharIndex(0);
    setSkipAll(false);
  }, [safeLines.join("|")]);

  useEffect(() => {
    if (skipAll || safeLines.length === 0) return;
    if (lineIndex >= safeLines.length) {
      onComplete?.();
      return;
    }

    const current = safeLines[lineIndex] || "";
    if (charIndex < current.length) {
      const t = window.setTimeout(() => setCharIndex((n) => n + 1), 18);
      return () => window.clearTimeout(t);
    }

    const next = window.setTimeout(() => {
      setLineIndex((n) => n + 1);
      setCharIndex(0);
    }, 220);
    return () => window.clearTimeout(next);
  }, [charIndex, lineIndex, onComplete, safeLines, skipAll]);

  const rendered = skipAll
    ? safeLines
    : safeLines.slice(0, lineIndex).concat((safeLines[lineIndex] || "").slice(0, charIndex));

  return (
    <div className="rounded-3xl border border-white/35 bg-white/25 p-4 backdrop-blur-md">
      <div className="space-y-2 text-sm leading-7 text-white">
        {rendered.map((line, idx) => (
          <p key={`${idx}-${line.slice(0, 12)}`}>{line}</p>
        ))}
      </div>
      {!skipAll ? (
        <button
          type="button"
          onClick={() => {
            setSkipAll(true);
            onComplete?.();
          }}
          className="mt-3 rounded-full border border-white/45 bg-white/18 px-3 py-1 text-xs font-semibold text-white"
        >
          한 번에 보기
        </button>
      ) : null}
    </div>
  );
}
