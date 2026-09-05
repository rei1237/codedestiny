'use client';

import React from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { useSikojenPovailuCopy } from '../_lib/copy';

/**
 * 장식 입자 위치는 모듈 상수로 고정한다.
 * 렌더 중 Math.random() 으로 뽑으면 리렌더마다 별이 순간이동한다.
 * 중앙 본문을 피해 가장자리에만 둔다.
 */
const PARTICLES = [
  { emoji: '⭐', left: '8%', top: '14%', delay: '0s' },
  { emoji: '✨', left: '88%', top: '10%', delay: '0.4s' },
  { emoji: '⭐', left: '16%', top: '62%', delay: '0.8s' },
  { emoji: '✨', left: '82%', top: '54%', delay: '1.2s' },
  { emoji: '⭐', left: '6%', top: '38%', delay: '1.6s' },
  { emoji: '✨', left: '92%', top: '76%', delay: '0.2s' },
  { emoji: '⭐', left: '24%', top: '88%', delay: '1.0s' },
  { emoji: '✨', left: '74%', top: '30%', delay: '1.8s' },
] as const;

const INTRO_BULLET_ICONS = ['🔥', '💧', '✨', '🐷', '🖥️'] as const;

export function PhaseWelcoming() {
  const copy = useSikojenPovailuCopy();
  const { setPhase } = useSikojenpovailuContext();

  const introBullets = [
    copy.welcomeIntroBullet1,
    copy.welcomeIntroBullet2,
    copy.welcomeIntroBullet3,
    copy.welcomeIntroBullet4,
    copy.welcomeIntroBullet5,
  ];

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-20">
      {/* 부드러운 핑크/크림 배경 */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-rose-50" />

      {/* 배경 장식 - 부드러운 그라데이션 원 */}
      <div className="absolute right-[8%] top-24 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-pink-200 to-rose-100 opacity-15 blur-3xl motion-reduce:animate-none" />
      <div
        className="absolute bottom-32 left-[6%] h-72 w-72 animate-pulse rounded-full bg-gradient-to-tr from-yellow-100 to-pink-100 opacity-[0.12] blur-3xl motion-reduce:animate-none"
        style={{ animationDelay: '0.5s' }}
      />

      {/* 별/꽃 장식 입자 — 장식이라 대비 기준 대상이 아니다(DESIGN.md) */}
      {PARTICLES.map((particle, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute animate-pulse text-2xl opacity-35 motion-reduce:animate-none"
          style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* 본문 — 절대 위치 + 매직넘버 마진 대신 세로 흐름 배치 */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-3 text-center">
        {/* 연이 캐릭터 - 스프라이트 시트 순환 */}
        <div className="relative animate-[gentle-bob_2.5s_ease-in-out_infinite] motion-reduce:animate-none">
          <YeonSpriteAvatar
            frames={[1, 2, 3, 4, 3, 2, 5, 6]}
            size={200}
            alt={copy.welcomeSpriteAlt}
            ringClassName="from-rose-300 to-pink-300"
            intervalMs={780}
          />
          {/* 주석 국자 */}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-3 rotate-12 text-4xl drop-shadow-md sm:-right-5 sm:text-5xl"
          >
            🥄
          </span>
        </div>

        <h2
          className="mt-1 text-[32px] font-bold leading-tight tracking-[0.01em] text-[#b31955] sm:text-4xl md:text-5xl"
          style={{ fontFamily: 'var(--font-playful)' }}
        >
          TERVETULOA!
        </h2>

        <p
          className="text-xl font-bold text-[#8e1240] sm:text-2xl"
          style={{ fontFamily: 'var(--font-playful)' }}
        >
          {copy.welcomeGreeting}
        </p>

        <p className="max-w-sm whitespace-pre-line text-sm leading-relaxed text-[#70445c] sm:text-base">
          {copy.welcomeSubtitle}
        </p>

        {/* 핀란드 주석점 소개 카드 */}
        <div className="mt-2 w-full max-w-sm rounded-[18px] border border-[rgba(216,63,120,0.22)] bg-white/[0.86] p-4 text-left backdrop-blur-sm">
          <h3 className="mb-2 text-center text-[11px] font-bold tracking-[0.04em] text-[#b31955]">
            {copy.welcomeIntroHeading}
          </h3>
          <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-[#5c3348]">
            {introBullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-2">
                <span aria-hidden="true">{INTRO_BULLET_ICONS[index]}</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — 브랜드 골드 관문 (--cd-cta 계열) */}
        <button
          type="button"
          onClick={() => setPhase('ritual-prep')}
          className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-[15px] font-bold text-[#3c1830] shadow-[0_6px_16px_rgba(198,150,60,0.28)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.968] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
          style={{ background: 'linear-gradient(135deg, #fff8dc 0%, #ead089 48%, #f4bed1 100%)' }}
        >
          {copy.welcomeCtaButton}
          <span aria-hidden="true" className="text-lg">✨</span>
        </button>
      </div>

      <style>{`
        @keyframes gentle-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
