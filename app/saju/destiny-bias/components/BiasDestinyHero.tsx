"use client";

import { m, useReducedMotion } from "framer-motion";
import BiasDestinyAlbumStage from "./BiasDestinyAlbumStage";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  onEnter: () => void;
  stageLoading: number;
};

export default function BiasDestinyHero({ onEnter, stageLoading }: Props) {
  const copy = useDestinyBiasCopy();
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(145deg,rgba(7,4,22,0.92),rgba(26,11,63,0.72))] p-5 shadow-[0_0_52px_rgba(109,59,255,0.24)] md:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,217,138,0.2),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(64,200,255,0.2),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(255,95,210,0.22),transparent_44%)]" aria-hidden />
      <div className="pointer-events-none absolute -left-10 top-6 h-36 w-36 rounded-full bg-[var(--bias-pink)]/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-8 top-10 h-32 w-32 rounded-full bg-[var(--bias-blue)]/20 blur-3xl" aria-hidden />

      <div className="pointer-events-none absolute left-0 right-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(255,249,232,0.16),rgba(255,255,255,0))]" aria-hidden />

      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--bias-gold)]/45 bg-[var(--bias-gold)]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--bias-gold)]">
            LIVE ARENA GATE OPEN
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white drop-shadow-[0_0_24px_rgba(255,217,138,0.5)] md:text-5xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-white/86 md:text-base">
            {copy.heroDescription}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full bg-[linear-gradient(92deg,var(--bias-gold),var(--bias-pink),var(--bias-purple),var(--bias-blue))] px-6 text-sm font-extrabold text-[#150826] shadow-[0_0_28px_rgba(255,95,210,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(255,217,138,0.5)]"
            >
              {copy.heroEnterButton}
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full border border-white/28 bg-white/8 px-6 text-sm font-semibold text-white/92 transition hover:border-[var(--bias-gold)]/65 hover:bg-[var(--bias-gold)]/10"
            >
              {copy.heroSkipButton}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] md:max-w-xl">
            {[
              "Spotlight Score",
              "Fanlight Sync",
              "Encore Energy",
            ].map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-center font-semibold text-white/85">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <BiasDestinyAlbumStage>
            <p className="text-[11px] tracking-[0.2em] text-[var(--bias-lavender)]/85">SPOTLIGHT READING</p>
            <p className="mt-1 text-sm font-semibold text-[var(--bias-pink)]">{copy.heroSyncText}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-[var(--bias-lavender)]/35">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--bias-gold),var(--bias-pink),var(--bias-blue))] shadow-[0_0_18px_rgba(255,95,210,0.8)]"
                style={{ width: `${stageLoading}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-[var(--bias-blue)]/90">{stageLoading}%</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                "Crowd Heat",
                "Sync BPM",
                "Encore Card",
              ].map((feature) => (
                <div key={feature} className="rounded-xl border border-white/14 bg-white/5 px-2 py-3 text-center text-[11px] font-semibold text-white/85">
                  {feature}
                </div>
              ))}
            </div>
          </BiasDestinyAlbumStage>
        </div>
      </div>
    </m.section>
  );
}
