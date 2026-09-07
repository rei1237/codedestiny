"use client";

import type { DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { cardChipLabel } from "../nakshatra-birth";
import type { NakshatraCopy } from "../_lib/copy";
import { profileId, type NakshatraProfileContext } from "../_lib/nakshatra-context";

export default function NakshatraProfilePicker({
  context,
  copy,
  disabled = false,
}: {
  context: NakshatraProfileContext;
  copy: NakshatraCopy;
  disabled?: boolean;
}) {
  if (context.profilesLoading || context.profiles.length === 0) return null;
  const errorMessage = context.error === "card"
    ? copy.formCardReadError
    : context.error === "network"
      ? copy.formNetworkError
      : "";

  return (
    <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-label={copy.formSavedLabel}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100/80">{copy.formSavedLabel}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {context.profiles.map((profile, index) => {
          const chip = cardChipLabel(profile, copy);
          const key = profileId(profile) || `${chip.name}-${index}`;
          const active = context.selectedProfileId === profileId(profile);
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || context.selecting}
              aria-pressed={active}
              onClick={() => void context.selectProfile(profile)}
              className={`relative flex min-h-14 min-w-[190px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition sm:min-w-0 ${
                active
                  ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_0_1px_rgba(229,199,137,0.22)]"
                  : "border-white/10 bg-white/[0.02] hover:border-amber-200/45 hover:bg-white/[0.05]"
              } disabled:cursor-wait disabled:opacity-60`}
            >
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-200/30 bg-amber-200/[0.08] text-sm font-semibold text-amber-100">
                {(chip.name || "★").trim().charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-50">{chip.name || copy.formNoNameLabel}</span>
                <span className="block truncate text-[11px] leading-5 text-slate-400">{chip.detail}</span>
              </span>
              {active && <span aria-hidden="true" className="ml-auto text-xs font-bold text-amber-100">✓</span>}
            </button>
          );
        })}
      </div>
      {errorMessage && <p role="alert" className="mt-3 text-xs leading-6 text-rose-200">{errorMessage}</p>}
    </section>
  );
}

export type { DestinyProfileCard };
