"use client";

import Link from "next/link";

import { useFeedbackCopy } from "../_lib/copy";
import { NOT_COLLECTED, type EnvEntry } from "../_lib/environment";
import { ACCENT, INK, INK_MUTED } from "../_lib/styles";

interface EnvironmentPanelProps {
  entries: EnvEntry[];
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * 수집 고지 패널.
 *
 * 🔴 여기 렌더되는 목록과 실제로 서버에 전송되는 배열은 collectEnvironment() 가 만든
 *    같은 객체다. 두 곳을 따로 만들지 않기 때문에 고지와 전송 내용이 어긋날 수 없다.
 */
export default function EnvironmentPanel({ entries, enabled, onToggle }: EnvironmentPanelProps) {
  const copy = useFeedbackCopy();

  return (
    <div className="rounded-2xl border border-[rgba(216,63,120,0.14)] bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className={`text-[13px] leading-relaxed ${INK_MUTED}`}>
        {copy.envIntroPrefix}{" "}
        <strong className={`font-bold ${INK}`}>{copy.envIntroBold}</strong>{" "}
        {copy.envIntroSuffix}
      </p>

      <details className="group mt-3">
        <summary
          className={`inline-flex min-h-[32px] cursor-pointer list-none items-center gap-1.5 text-[13px] font-bold ${ACCENT} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] dark:focus-visible:ring-[#c4b5fd]`}
        >
          {copy.envDetailsSummary}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none">▾</span>
        </summary>

        <div className="mt-3 space-y-4">
          <div>
            <p className={`mb-2 text-[12px] font-bold ${INK}`}>{copy.envSentHeading}</p>
            <dl className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.key} className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
                  <dt className={`min-w-[104px] shrink-0 ${INK_MUTED}`}>{entry.label}</dt>
                  <dd className={`min-w-0 break-all ${INK}`}>{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className={`mb-2 text-[12px] font-bold ${INK}`}>{copy.envNotCollectedHeading}</p>
            <ul className={`list-inside list-disc space-y-1 text-[12px] ${INK_MUTED}`}>
              {NOT_COLLECTED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className={`text-[12px] ${INK_MUTED}`}>
            {copy.envPrivacyPrefix}{" "}
            <Link
              href="/privacy-policy"
              className={`font-bold underline underline-offset-2 ${ACCENT}`}
            >
              {copy.envPrivacyLink}
            </Link>
            {copy.envPrivacySuffix}
          </p>
        </div>
      </details>

      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-[18px] w-[18px] shrink-0 accent-[#b31955] dark:accent-[#c4b5fd]"
        />
        <span className={`text-[13px] font-bold ${INK}`}>{copy.envToggleLabel}</span>
      </label>

      {!enabled && (
        <p className={`mt-1 text-[12px] ${INK_MUTED}`} role="status">
          {copy.envToggleOffWarning}
        </p>
      )}
    </div>
  );
}
