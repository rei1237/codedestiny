"use client";

import { usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { stripLocalePrefix } from "../_lib/localePath";
import { resolveFeatureAccessModel, useServerPrice } from "@/app/hooks/useServerPrice";
import { useMobileFortuneRenderTrace } from "@/app/_lib/mobile-fortune-trace";
import { useTPick } from "@/lib/i18n/useT";

const ShareWidget = lazy(() => import("./ShareWidget"));

const FEATURE_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof FEATURE_LOCALES)[number];

const FEATURE_LOCALE_ALIAS: Record<string, LoadingLocale> = {
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-hans": "zh-CN",
  "zh-tw": "zh-TW",
  "zh-hant": "zh-TW",
  "zh-hk": "zh-TW",
  "zh-mo": "zh-TW",
  "vi-vn": "vi",
  "en-us": "en",
  "ja-jp": "ja",
};

function normalizeFeatureLocaleCode(value?: string | null): LoadingLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (!normalized) return "ko";
  const alias = FEATURE_LOCALE_ALIAS[normalized];
  if (alias) return alias;
  return FEATURE_LOCALES.find((locale) => locale.toLowerCase() === normalized) || "ko";
}

function getCurrentFeatureLocale(): LoadingLocale {
  try {
    const languageGetter = (window as Window & { cdGetCurrentLanguage?: () => string | undefined }).cdGetCurrentLanguage;
    const current = languageGetter?.();
    if (current) return normalizeFeatureLocaleCode(current);
  } catch {}
  try {
    const lang = new URLSearchParams(window.location.search || "").get("lang");
    if (lang) return normalizeFeatureLocaleCode(lang);
  } catch {}
  try {
    const stored = window.localStorage.getItem("cd_lang");
    if (stored) return normalizeFeatureLocaleCode(stored);
  } catch {}
  try {
    const match = document.cookie.match(/(?:^|;\s*)cd_locale=([^;]+)/);
    if (match?.[1]) return normalizeFeatureLocaleCode(decodeURIComponent(match[1]));
  } catch {}
  return "ko";
}

type ServiceContent = {
  title?: string;
  h1?: string;
  description?: string;
  landingPoints?: string[];
  seoText?: string;
  ogImage?: string;
  valueGuideTitle?: string;
  valueSections?: Array<{
    title: string;
    body: string;
  }>;
};

type ServiceLike = ServiceContent & {
  localized?: Partial<Record<LoadingLocale, ServiceContent>>;
};

/* ═══════════════════════════════════════════
   Per-slug icon / badge / decoration config
═══════════════════════════════════════════ */
interface SlugCfg {
  icon: string;
  badge: string;
  tag?: string;
  particles: string[];
  extraBlock?: React.ReactNode;
}
const SLUG_CFG: Record<string, SlugCfg> = {
  "/flower":            { icon:"🌺", badge:"ATELIER",      tag:"사주·점성술·자미두수·숙요 꽃", particles:["🌸","✦","💮","🌼","🌺"] },
  "/tarot/self-esteem": { icon:"⚔️", badge:"FREE QUEST",   tag:"5카드 성장 퀘스트",      particles:["✦","⚔️","✨","⭐","✦"] },
  "/tarot/reunion":     { icon:"🕯️", badge:"REUNION",      tag:"5카드 등대 스프레드",    particles:["🕯️","✦","💌","🌊","✦"] },
  "/tarot/year":        { icon:"🐉", badge:"12 ZODIAC",    tag:"12개월 운세 타로",       particles:["🐉","⭐","✨","🌙","✦"] },
  "/oracle/hwatu":      { icon:"🎴", badge:"TRADITIONAL",  tag:"전통 화투 운세",          particles:["🌸","🌺","🎴","🍁","🌊"] },
  "/oracle/kemet":      { icon:"𓂀", badge:"KEMET ORACLE", tag:"이집트 신탁 오라클",     particles:["✦","𓂀","🌙","⭐","✦"] },
  "/oracle/juyuk":      { icon:"☯",  badge:"I CHING",      tag:"64괘 거북점",             particles:["☯","☰","☲","☵","☴"] },
  "/oracle/sukuyo":     { icon:"🌑", badge:"27 LUNAR",     tag:"27수 별자리 운세",        particles:["🌑","🌒","🌓","🌔","🌕"] },
  "/vedic/jyotish":     { icon:"🕉️", badge:"JYOTISH",      tag:"베다 점성술",             particles:["🕉️","✦","⭐","🌟","✦"] },
  "/animal/physio":     { icon:"🦁", badge:"전문 관상",       tag:"셀카 얼굴 관상 분석",    particles:["🦁","🐯","🦊","🐻","🐼"] },
  "/animal/mbti":       { icon:"🦊", badge:"MBTI TOTEM",   tag:"16가지 토템 케미",        particles:["🦊","🦁","🐺","🦅","🐬"] },
  "/animal/totem":      { icon:"🦅", badge:"TOTEM CARD",   tag:"수호 동물 카드 리딩",     particles:["🦅","🦉","🐺","🦁","🐉"] },
  "/dream/tarot":       { icon:"💭", badge:"DREAM PROMPT",  tag:"AI 꿈 프롬프트",        particles:["💭","🌙","✨","⭐","💫"] },
  "/dream/psycho":      { icon:"🧠", badge:"FREUD STUDY",  tag:"정신분석 해몽",           particles:["🧠","🌀","💭","🔮","✦"] },
  "/tarot/healing":     { icon:"☀️", badge:"HEALING",       tag:"4카드 힐링 스프레드",      particles:["☀️","🌿","✦","💛","🌟"] },
  "/tarot/mingri":      { icon:"🎴", badge:"전문 타로",       tag:"78장 유니버설 덱 전문가 리딩", particles:["🎴","✦","⭐","🔮","💫"] },
  "/tarot/love":        { icon:"💕", badge:"LOVE TAROT",     tag:"6카드 연애 관계 스프레드",  particles:["💕","🌹","✦","💌","🌸"] },
  "/saju/basic":        { icon:"🌸", badge:"SAJU",           tag:"사주팔자 만세력 기본 해석",  particles:["🌸","☯","✦","⭐","🌟"] },
  "/saju/sibyl":        { icon:"⚡", badge:"SIBYL SYSTEM",   tag:"사주 기반 진로 적성 × 운명 위험 계수", particles:["⚡","☯","📊","⭐","🌟"] },
  "/saju/lifebook":     { icon:"📜", badge:"LIFE BOOK",     tag:"프리미엄 사주 심층 분석 리포트",  particles:["📜","✦","☯","⭐","💫"] },
  "/saju/love-secret":  { icon:"💕", badge:"LOVE SECRET",   tag:"사주 기반 연애 전략 · 이상형 분석", particles:["💕","🌹","☯","✦","🌸"] },
  "/saju/love-bible":   { icon:"💕", badge:"LOVE SECRET",   tag:"사주 기반 연애 전략 · 이상형 분석", particles:["💕","🌹","☯","✦","🌸"] },
  "/saju/love-simulation": { icon:"💕", badge:"LOVE CODE",  tag:"사주 연애 시뮬레이션",            particles:["💕","🎲","☯","🌸","✦"] },
  "/ziwei/chart":       { icon:"☸",  badge:"ZIWEI",          tag:"12궁·사화·대한 심화 상담", particles:["☸","✦","⭐","🌙","🌟"] },
  "/astrology/cosmic":  { icon:"🌌", badge:"COSMIC CHART",   tag:"태양·달·상승궁 분석",       particles:["🌌","⭐","✦","🌙","🌟"] },
  "/oracle/hwatu-life": { icon:"🀄", badge:"HWATU LIFE",     tag:"7문항 화투 인생 패 테스트", particles:["🀄","🌸","🍁","🌊","🎴"] },
  "/oracle/sikojen-povailu": { icon:"🐷", badge:"TIN ORACLE", tag:"핀란드 주석 납점 오라클",  particles:["🐷","✦","❄️","🌊","⭐"] },
  "/oracle/royal-tea":  { icon:"🍵", badge:"TEA ORACLE",     tag:"타세오그래피 찻잎 리딩",   particles:["🍵","🌿","✦","☕","🌸"] },
};

/* ═══════════════════════════════════════════
   Category themes
═══════════════════════════════════════════ */
interface Theme {
  bg: string;
  orb1: string; orb2: string;
  glow: string; border: string;
  accent: string; titleGrad: string;
  ptBg: string; ptBorder: string; ptDot: string;
  btnPrimary: string; btnGlow: string;
  btnSec: string; btnSecBorder: string;
  badge: string; seo: string; divider: string;
}
const THEMES: Record<string, Theme> = {
  saju: {
    bg: "linear-gradient(155deg,#0c0805 0%,#1a1005 45%,#100c06 100%)",
    orb1:"rgba(245,158,11,0.22)", orb2:"rgba(180,83,9,0.14)",
    glow:"rgba(252,211,77,0.14)", border:"rgba(252,211,77,0.28)",
    accent:"#fcd34d", titleGrad:"linear-gradient(135deg,#fffbeb 0%,#f59e0b 55%,#fde68a 100%)",
    ptBg:"rgba(245,158,11,0.09)", ptBorder:"rgba(252,211,77,0.22)", ptDot:"#f59e0b",
    btnPrimary:"linear-gradient(135deg,#92400e 0%,#d97706 100%)",
    btnGlow:"0 14px 36px rgba(146,64,14,0.48),0 0 0 1px rgba(252,211,77,0.22)",
    btnSec:"rgba(252,211,77,0.08)", btnSecBorder:"rgba(252,211,77,0.28)",
    badge:"rgba(252,211,77,0.88)", seo:"rgba(252,211,77,0.44)", divider:"rgba(252,211,77,0.14)",
  },
  ziwei: {
    bg: "linear-gradient(155deg,#08041c 0%,#120832 45%,#0a0520 100%)",
    orb1:"rgba(139,92,246,0.26)", orb2:"rgba(236,72,153,0.14)",
    glow:"rgba(196,181,253,0.18)", border:"rgba(196,181,253,0.3)",
    accent:"#c4b5fd", titleGrad:"linear-gradient(135deg,#f5f3ff 0%,#8b5cf6 55%,#ec4899 100%)",
    ptBg:"rgba(139,92,246,0.1)", ptBorder:"rgba(196,181,253,0.24)", ptDot:"#a78bfa",
    btnPrimary:"linear-gradient(135deg,#5b21b6 0%,#9333ea 100%)",
    btnGlow:"0 14px 36px rgba(91,33,182,0.48),0 0 0 1px rgba(196,181,253,0.22)",
    btnSec:"rgba(196,181,253,0.09)", btnSecBorder:"rgba(196,181,253,0.3)",
    badge:"rgba(196,181,253,0.88)", seo:"rgba(196,181,253,0.44)", divider:"rgba(196,181,253,0.14)",
  },
  astrology: {
    bg: "linear-gradient(155deg,#040812 0%,#060e2a 45%,#050a1c 100%)",
    orb1:"rgba(56,189,248,0.2)", orb2:"rgba(99,102,241,0.16)",
    glow:"rgba(125,211,252,0.14)", border:"rgba(125,211,252,0.28)",
    accent:"#7dd3fc", titleGrad:"linear-gradient(135deg,#f0f9ff 0%,#38bdf8 55%,#818cf8 100%)",
    ptBg:"rgba(56,189,248,0.09)", ptBorder:"rgba(125,211,252,0.22)", ptDot:"#38bdf8",
    btnPrimary:"linear-gradient(135deg,#0369a1 0%,#4338ca 100%)",
    btnGlow:"0 14px 36px rgba(3,105,161,0.48),0 0 0 1px rgba(125,211,252,0.22)",
    btnSec:"rgba(125,211,252,0.08)", btnSecBorder:"rgba(125,211,252,0.28)",
    badge:"rgba(125,211,252,0.88)", seo:"rgba(125,211,252,0.44)", divider:"rgba(125,211,252,0.14)",
  },
  flower: {
    bg: "linear-gradient(155deg,#0f0a1e 0%,#1e0f34 45%,#0d1825 100%)",
    orb1:"rgba(255,182,220,0.28)", orb2:"rgba(192,132,252,0.22)",
    glow:"rgba(244,114,182,0.2)", border:"rgba(244,114,182,0.3)",
    accent:"#f9a8d4", titleGrad:"linear-gradient(135deg,#fce7f3 0%,#e879f9 55%,#f9a8d4 100%)",
    ptBg:"rgba(244,114,182,0.08)", ptBorder:"rgba(244,114,182,0.22)", ptDot:"#f472b6",
    btnPrimary:"linear-gradient(135deg,#be185d 0%,#9333ea 100%)",
    btnGlow:"0 14px 36px rgba(190,24,93,0.48),0 0 0 1px rgba(244,114,182,0.22)",
    btnSec:"rgba(244,114,182,0.09)", btnSecBorder:"rgba(244,114,182,0.34)",
    badge:"rgba(244,114,182,0.88)", seo:"rgba(249,168,212,0.46)", divider:"rgba(244,114,182,0.16)",
  },
  tarot: {
    bg: "linear-gradient(155deg,#0a0514 0%,#140832 45%,#0f0c22 100%)",
    orb1:"rgba(124,58,237,0.24)", orb2:"rgba(255,215,0,0.1)",
    glow:"rgba(167,139,250,0.18)", border:"rgba(167,139,250,0.3)",
    accent:"#c4b5fd", titleGrad:"linear-gradient(135deg,#f5f3ff 0%,#a78bfa 55%,#fbbf24 100%)",
    ptBg:"rgba(124,58,237,0.1)", ptBorder:"rgba(167,139,250,0.24)", ptDot:"#a78bfa",
    btnPrimary:"linear-gradient(135deg,#7c3aed 0%,#c026d3 100%)",
    btnGlow:"0 14px 36px rgba(124,58,237,0.48),0 0 0 1px rgba(167,139,250,0.22)",
    btnSec:"rgba(167,139,250,0.09)", btnSecBorder:"rgba(167,139,250,0.3)",
    badge:"rgba(196,181,253,0.88)", seo:"rgba(167,139,250,0.46)", divider:"rgba(167,139,250,0.14)",
  },
  oracle: {
    bg: "linear-gradient(155deg,#0c0a04 0%,#201606 45%,#120e05 100%)",
    orb1:"rgba(217,119,6,0.22)", orb2:"rgba(180,83,9,0.14)",
    glow:"rgba(251,191,36,0.15)", border:"rgba(220,185,80,0.3)",
    accent:"#fbbf24", titleGrad:"linear-gradient(135deg,#fef3c7 0%,#f59e0b 55%,#fde68a 100%)",
    ptBg:"rgba(217,119,6,0.09)", ptBorder:"rgba(220,185,80,0.24)", ptDot:"#d97706",
    btnPrimary:"linear-gradient(135deg,#92400e 0%,#d97706 100%)",
    btnGlow:"0 14px 36px rgba(146,64,14,0.48),0 0 0 1px rgba(251,191,36,0.22)",
    btnSec:"rgba(251,191,36,0.08)", btnSecBorder:"rgba(251,191,36,0.3)",
    badge:"rgba(251,191,36,0.88)", seo:"rgba(251,191,36,0.44)", divider:"rgba(220,185,80,0.14)",
  },
  animal: {
    bg: "linear-gradient(155deg,#060e04 0%,#0e1e0a 45%,#080f06 100%)",
    orb1:"rgba(251,146,60,0.2)", orb2:"rgba(34,197,94,0.14)",
    glow:"rgba(251,146,60,0.16)", border:"rgba(251,146,60,0.3)",
    accent:"#fb923c", titleGrad:"linear-gradient(135deg,#fff7ed 0%,#fb923c 55%,#4ade80 100%)",
    ptBg:"rgba(251,146,60,0.09)", ptBorder:"rgba(251,146,60,0.24)", ptDot:"#f97316",
    btnPrimary:"linear-gradient(135deg,#ea580c 0%,#16a34a 100%)",
    btnGlow:"0 14px 36px rgba(234,88,12,0.42),0 0 0 1px rgba(251,146,60,0.22)",
    btnSec:"rgba(251,146,60,0.08)", btnSecBorder:"rgba(251,146,60,0.3)",
    badge:"rgba(251,146,60,0.88)", seo:"rgba(251,146,60,0.44)", divider:"rgba(251,146,60,0.14)",
  },
  dream: {
    bg: "linear-gradient(155deg,#06091c 0%,#0d1032 45%,#090c22 100%)",
    orb1:"rgba(99,102,241,0.24)", orb2:"rgba(168,85,247,0.18)",
    glow:"rgba(165,180,252,0.15)", border:"rgba(165,180,252,0.28)",
    accent:"#a5b4fc", titleGrad:"linear-gradient(135deg,#eef2ff 0%,#818cf8 55%,#c084fc 100%)",
    ptBg:"rgba(99,102,241,0.1)", ptBorder:"rgba(165,180,252,0.22)", ptDot:"#818cf8",
    btnPrimary:"linear-gradient(135deg,#4338ca 0%,#7c3aed 100%)",
    btnGlow:"0 14px 36px rgba(67,56,202,0.48),0 0 0 1px rgba(165,180,252,0.22)",
    btnSec:"rgba(165,180,252,0.08)", btnSecBorder:"rgba(165,180,252,0.28)",
    badge:"rgba(165,180,252,0.88)", seo:"rgba(165,180,252,0.44)", divider:"rgba(165,180,252,0.14)",
  },
  vedic: {
    bg: "linear-gradient(155deg,#0d0904 0%,#201408 45%,#160f06 100%)",
    orb1:"rgba(245,158,11,0.24)", orb2:"rgba(239,68,68,0.12)",
    glow:"rgba(252,211,77,0.15)", border:"rgba(252,211,77,0.28)",
    accent:"#fcd34d", titleGrad:"linear-gradient(135deg,#fffbeb 0%,#f59e0b 55%,#fde68a 100%)",
    ptBg:"rgba(245,158,11,0.09)", ptBorder:"rgba(252,211,77,0.22)", ptDot:"#f59e0b",
    btnPrimary:"linear-gradient(135deg,#b45309 0%,#d97706 100%)",
    btnGlow:"0 14px 36px rgba(180,83,9,0.48),0 0 0 1px rgba(252,211,77,0.22)",
    btnSec:"rgba(252,211,77,0.08)", btnSecBorder:"rgba(252,211,77,0.28)",
    badge:"rgba(252,211,77,0.88)", seo:"rgba(252,211,77,0.44)", divider:"rgba(252,211,77,0.14)",
  },
};

/* Per-slug theme overrides (e.g. sukuyo oracle → lunar indigo) */
const SLUG_THEME_OVERRIDE: Partial<Record<string, Partial<Theme>>> = {
  "/oracle/sukuyo": {
    bg:"linear-gradient(155deg,#08091e 0%,#10143a 45%,#090c20 100%)",
    orb1:"rgba(99,102,241,0.22)", orb2:"rgba(168,85,247,0.16)",
    glow:"rgba(165,180,252,0.14)", border:"rgba(165,180,252,0.28)",
    accent:"#a5b4fc", titleGrad:"linear-gradient(135deg,#eef2ff 0%,#818cf8 55%,#c084fc 100%)",
    ptDot:"#818cf8", badge:"rgba(165,180,252,0.88)",
    btnPrimary:"linear-gradient(135deg,#312e81 0%,#7c3aed 100%)",
    btnGlow:"0 14px 36px rgba(49,46,129,0.48),0 0 0 1px rgba(165,180,252,0.22)",
  },
  "/oracle/hwatu-life": {
    bg:"linear-gradient(155deg,#1c0202 0%,#300808 45%,#1c0505 100%)",
    orb1:"rgba(220,38,38,0.22)", orb2:"rgba(0,0,0,0.5)",
    glow:"rgba(220,38,38,0.16)", border:"rgba(220,38,38,0.32)",
    accent:"#fca5a5", titleGrad:"linear-gradient(135deg,#fff1f2 0%,#f87171 55%,#fbbf24 100%)",
    ptDot:"#f87171", badge:"rgba(252,165,165,0.88)",
    btnPrimary:"linear-gradient(135deg,#991b1b 0%,#dc2626 100%)",
    btnGlow:"0 14px 36px rgba(153,27,27,0.48),0 0 0 1px rgba(220,38,38,0.22)",
  },
  "/oracle/hwatu": {
    bg:"linear-gradient(155deg,#1c0202 0%,#300808 45%,#1c0505 100%)",
    orb1:"rgba(220,38,38,0.22)", orb2:"rgba(0,0,0,0.5)",
    glow:"rgba(220,38,38,0.16)", border:"rgba(220,38,38,0.32)",
    accent:"#fca5a5", titleGrad:"linear-gradient(135deg,#fff1f2 0%,#f87171 55%,#fbbf24 100%)",
    ptDot:"#f87171", badge:"rgba(252,165,165,0.88)",
    btnPrimary:"linear-gradient(135deg,#991b1b 0%,#dc2626 100%)",
    btnGlow:"0 14px 36px rgba(153,27,27,0.48),0 0 0 1px rgba(220,38,38,0.22)",
  },
};

/* Action map */
const ACTION_MAP: Record<string, string> = {
  "/animal/physio":"openPhysiognomyApp", "/animal/mbti":"openMbtiModal",
  "/animal/totem":"openAnimalTotemModal", "/animal/saju-guardian":"openSajuAnimalPage",
  "/tarot/self-esteem":"openTarotSelfEsteemModal",
  "/tarot/reunion":"openTarotReunionModal", "/tarot/year":"openTarotYearFortuneModal",
  "/oracle/hwatu":"openHwatuModal", "/oracle/kemet":"openKemetModal",
  "/oracle/juyuk":"openJuyukModal", "/oracle/sukuyo":"openSukuyoModal",
  "/vedic/jyotish":"navigateToVedic",
  "/flower":"openDestinyFlowerStudio",
  "/dream/tarot":"openDreamModal", "/dream/psycho":"openPsychoDreamModal",
  "/tarot/healing":"openTarotHealingModal",
  "/tarot/mingri":"openTarotModal",
  "/tarot/love":"openTarotLoveModal",
  "/tarot/mindscan":"startMindScanTarot",
  "/saju/basic":"checkPrivacyAndCalculate",
  "/saju/sibyl":"openSibylModal",
  "/saju/love-simulation":"openLoveSimulation",
  "/astrology/cosmic":"openAstroModal",
  "/oracle/hwatu-life":"openHwatuModal",
  "/oracle/ifa":"openIfaOracle",
  "/oracle/rune":"openRuneOracle",
  "/oracle/royal-tea":"openRoyalTeaOracle",
  "/yoga-guru":"openYogaGuru",
};

// Price text is derived from the Worker registry through useServerPrice.
// Keep this table limited to route -> canonical featureKey mapping.
const PAID_SLUG_META: Record<string, { featureKey: string }> = {
  // 🔴 셸 타일의 `data-tile-lock-key`/`data-feature-key` 와 반드시 같아야 한다 —
  // 여기 적힌 키가 랜딩의 가격 표시를 만들고, 실제로 돈을 받는 것은 셸 타일의 잠금 키다.
  // 2026-08-23 까지 이 4줄이 `flower-studio-per-use`(5,000원 회당)였는데 셸은 `flower-fc`
  // (20,000원 영구 해금)를 물어서, 랜딩이 실제의 1/4 가격을 광고하고 있었다.
  // `flower-studio-per-use` 는 이 4줄 말고 청구·검증하는 곳이 전혀 없다(전수 grep).
  // 가드: __tests__/ui/action-entry-dispatch.static.test.js
  "/flower":           { featureKey: "flower-fc" },
  "/dream/psycho":     { featureKey: "dream-psycho-analysis" },
  "/tarot/love": { featureKey: "tarot-love-relationship" },
  "/tarot/reunion": { featureKey: "tarot-reunion-reading" },
  "/tarot/year": { featureKey: "tarot-year-fortune" },
  "/oracle/royal-tea": { featureKey: "royal-tea-oracle" },
  "/oracle/ifa": { featureKey: "ifa-oracle" },
  "/yoga-guru": { featureKey: "yoga-guru-per-use" },
};

type FeatureLandingCopy = {
  defaultTitle: string;
  defaultDescription: string;
  valueGuideTitle: string;
  corePoints: string;
  freeMainService: string;
  paidCta: (price: string) => string;
  /** 영구 해금 상품(accessModel: unlock)용 CTA. 회당 결제와 문구가 달라야 한다. */
  unlockCta: (price: string) => string;
  freeCta: string;
  insights: string;
  paidNotice: string;
  mainBrand: string;
  mainDescription: string;
  categoryTags: Record<string, string>;
};

const FEATURE_LANDING_COPY: Record<LoadingLocale, FeatureLandingCopy> = {
  ko: {
    defaultTitle: "운세 서비스",
    defaultDescription: "Code Destiny 메인 기능으로 연결되는 서비스입니다.",
    valueGuideTitle: "실전 활용 가이드",
    corePoints: "핵심 포인트",
    freeMainService: "FREE · 무료 메인 서비스",
    paidCta: (price) => `유료 기능 실행 · ${price}`,
    unlockCta: (price) => `해금하고 이용하기 · ${price}`,
    freeCta: "기능 바로 실행",
    insights: "관련 인사이트 보기",
    paidNotice: "유료 기능입니다. 바로가기를 누르면 메인 화면에서 결제 확인이 먼저 표시됩니다.",
    mainBrand: "꿀꿀 만세력",
    mainDescription: "사주·타로·점성술·자미두수 통합 플랫폼",
    categoryTags: {},
  },
  en: {
    defaultTitle: "Fortune service",
    defaultDescription: "A service connected to the main Code Destiny experience.",
    valueGuideTitle: "Practical Guide",
    corePoints: "Key Points",
    freeMainService: "FREE · Main free service",
    paidCta: (price) => `Start paid feature · ${price}`,
    unlockCta: (price) => `Unlock forever · ${price}`,
    freeCta: "Start feature",
    insights: "View related insights",
    paidNotice: "This is a paid feature. Payment access is checked on the main screen before it opens.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Four Pillars, tarot, astrology, and Zi Wei in one platform",
    categoryTags: { flower: "Flower destiny report", tarot: "Tarot reading", oracle: "Oracle reading", vedic: "Vedic astrology", animal: "Totem reading", dream: "Dream interpretation", saju: "Four Pillars reading", ziwei: "Zi Wei Dou Shu chart", astrology: "Astrology chart", yoga: "Yoga reset" },
  },
  ja: {
    defaultTitle: "占いサービス",
    defaultDescription: "Code Destinyのメイン機能につながるサービスです。",
    valueGuideTitle: "実践活用ガイド",
    corePoints: "注目ポイント",
    freeMainService: "FREE · 無料メインサービス",
    paidCta: (price) => `有料機能を実行 · ${price}`,
    unlockCta: (price) => `永久アンロック · ${price}`,
    freeCta: "機能を開く",
    insights: "関連インサイトを見る",
    paidNotice: "有料機能です。開く前にメイン画面で決済確認が表示されます。",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "四柱推命・タロット・占星術・紫微斗数を一つに結ぶプラットフォーム",
    categoryTags: { flower: "花の運勢リポート", tarot: "タロットリーディング", oracle: "オラクルリーディング", vedic: "ヴェーダ占星術", animal: "トーテムリーディング", dream: "夢占い", saju: "四柱推命リーディング", ziwei: "紫微斗数命盤", astrology: "占星術チャート", yoga: "ヨガリセット" },
  },
  "zh-CN": {
    defaultTitle: "占卜服务",
    defaultDescription: "连接到 Code Destiny 主功能的服务。",
    valueGuideTitle: "实用指南",
    corePoints: "重点提示",
    freeMainService: "FREE · 免费主服务",
    paidCta: (price) => `启动付费功能 · ${price}`,
    unlockCta: (price) => `永久解锁 · ${price}`,
    freeCta: "立即启动功能",
    insights: "查看相关洞察",
    paidNotice: "这是付费功能。打开前会先在主画面确认支付权限。",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "四柱推命、塔罗、占星与紫微斗数一体平台",
    categoryTags: { flower: "花之命运报告", tarot: "塔罗牌解读", oracle: "神谕解读", vedic: "吠陀占星", animal: "图腾解读", dream: "梦境解析", saju: "四柱推命解读", ziwei: "紫微斗数命盘", astrology: "占星星盘", yoga: "瑜伽重置" },
  },
  "zh-TW": {
    defaultTitle: "占卜服務",
    defaultDescription: "連接到 Code Destiny 主功能的服務。",
    valueGuideTitle: "實用指南",
    corePoints: "重點提示",
    freeMainService: "FREE · 免費主服務",
    paidCta: (price) => `啟動付費功能 · ${price}`,
    unlockCta: (price) => `永久解鎖 · ${price}`,
    freeCta: "立即啟動功能",
    insights: "查看相關洞察",
    paidNotice: "這是付費功能。開啟前會先在主畫面確認付款權限。",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "四柱推命、塔羅、占星與紫微斗數整合平台",
    categoryTags: { flower: "花之命運報告", tarot: "塔羅牌解讀", oracle: "神諭解讀", vedic: "吠陀占星", animal: "圖騰解讀", dream: "夢境解析", saju: "四柱推命解讀", ziwei: "紫微斗數命盤", astrology: "占星星盤", yoga: "瑜伽重置" },
  },
  vi: {
    defaultTitle: "Dịch vụ vận mệnh",
    defaultDescription: "Dịch vụ kết nối với trải nghiệm chính của Code Destiny.",
    valueGuideTitle: "Hướng dẫn ứng dụng",
    corePoints: "Điểm chính",
    freeMainService: "FREE · Dịch vụ chính miễn phí",
    paidCta: (price) => `Mở tính năng trả phí · ${price}`,
    unlockCta: (price) => `Mở khóa vĩnh viễn · ${price}`,
    freeCta: "Mở tính năng",
    insights: "Xem góc nhìn liên quan",
    paidNotice: "Đây là tính năng trả phí. Màn hình chính sẽ kiểm tra quyền thanh toán trước khi mở.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Nền tảng hợp nhất Tứ trụ, tarot, chiêm tinh và Tử Vi Đẩu Số",
    categoryTags: { flower: "Báo cáo vận mệnh hoa", tarot: "Trải bài tarot", oracle: "Lời oracle", vedic: "Chiêm tinh Vệ Đà", animal: "Đọc biểu tượng totem", dream: "Giải mã giấc mơ", saju: "Luận Tứ trụ", ziwei: "Lá số Tử Vi Đẩu Số", astrology: "Bản đồ chiêm tinh", yoga: "Yoga reset" },
  },
  hi: {
    defaultTitle: "भाग्य सेवा",
    defaultDescription: "Code Destiny के मुख्य अनुभव से जुड़ी सेवा.",
    valueGuideTitle: "व्यावहारिक मार्गदर्शिका",
    corePoints: "मुख्य बिंदु",
    freeMainService: "FREE · मुफ्त मुख्य सेवा",
    paidCta: (price) => `पेड फीचर शुरू करें · ${price}`,
    unlockCta: (price) => `हमेशा के लिए अनलॉक करें · ${price}`,
    freeCta: "फीचर शुरू करें",
    insights: "संबंधित इनसाइट देखें",
    paidNotice: "यह पेड फीचर है. खुलने से पहले मुख्य स्क्रीन पर भुगतान पहुँच जाँची जाएगी.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "चार स्तंभ, टैरो, ज्योतिष और Zi Wei को जोड़ने वाला मंच",
    categoryTags: { flower: "फूल भाग्य रिपोर्ट", tarot: "टैरो रीडिंग", oracle: "ओरेकल रीडिंग", vedic: "वैदिक ज्योतिष", animal: "टोटेम रीडिंग", dream: "स्वप्न व्याख्या", saju: "चार स्तंभ रीडिंग", ziwei: "ज़ी वेई डोउ शू चार्ट", astrology: "ज्योतिष चार्ट", yoga: "योग रीसेट" },
  },
  es: {
    defaultTitle: "Servicio de destino",
    defaultDescription: "Un servicio conectado con la experiencia principal de Code Destiny.",
    valueGuideTitle: "Guía práctica",
    corePoints: "Puntos clave",
    freeMainService: "FREE · Servicio principal gratis",
    paidCta: (price) => `Abrir función de pago · ${price}`,
    unlockCta: (price) => `Desbloquear para siempre · ${price}`,
    freeCta: "Abrir función",
    insights: "Ver insights relacionados",
    paidNotice: "Esta función es de pago. La pantalla principal comprobará el acceso antes de abrirla.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Plataforma de Cuatro Pilares, tarot, astrología y Zi Wei",
    categoryTags: { flower: "Informe floral del destino", tarot: "Lectura de tarot", oracle: "Lectura oracular", vedic: "Astrología védica", animal: "Lectura de tótem", dream: "Interpretación de sueños", saju: "Lectura de Cuatro Pilares", ziwei: "Carta Zi Wei Dou Shu", astrology: "Carta astrológica", yoga: "Reinicio de yoga" },
  },
  fr: {
    defaultTitle: "Service de destinée",
    defaultDescription: "Un service relié à l'expérience principale de Code Destiny.",
    valueGuideTitle: "Guide pratique",
    corePoints: "Points clés",
    freeMainService: "FREE · Service principal gratuit",
    paidCta: (price) => `Ouvrir la fonction payante · ${price}`,
    unlockCta: (price) => `Débloquer définitivement · ${price}`,
    freeCta: "Ouvrir la fonction",
    insights: "Voir les insights liés",
    paidNotice: "Cette fonction est payante. L'accès au paiement sera vérifié sur l'écran principal avant l'ouverture.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Plateforme réunissant Quatre Piliers, tarot, astrologie et Zi Wei",
    categoryTags: { flower: "Rapport floral de destinée", tarot: "Lecture de tarot", oracle: "Lecture oracle", vedic: "Astrologie védique", animal: "Lecture totem", dream: "Interprétation des rêves", saju: "Lecture des Quatre Piliers", ziwei: "Thème Zi Wei Dou Shu", astrology: "Carte astrologique", yoga: "Réinitialisation yoga" },
  },
  de: {
    defaultTitle: "Schicksalsservice",
    defaultDescription: "Ein Service, der mit der Hauptfunktion von Code Destiny verbunden ist.",
    valueGuideTitle: "Praxisguide",
    corePoints: "Kernpunkte",
    freeMainService: "FREE · Kostenloser Hauptservice",
    paidCta: (price) => `Bezahlfunktion öffnen · ${price}`,
    unlockCta: (price) => `Dauerhaft freischalten · ${price}`,
    freeCta: "Funktion öffnen",
    insights: "Verwandte Insights ansehen",
    paidNotice: "Dies ist eine Bezahlfunktion. Vor dem Öffnen wird der Zahlungszugang auf dem Hauptbildschirm geprüft.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Plattform für Vier Säulen, Tarot, Astrologie und Zi Wei",
    categoryTags: { flower: "Blumen-Schicksalsbericht", tarot: "Tarot-Lesung", oracle: "Orakel-Lesung", vedic: "Vedische Astrologie", animal: "Totem-Lesung", dream: "Traumdeutung", saju: "Vier-Säulen-Lesung", ziwei: "Zi-Wei-Dou-Shu-Chart", astrology: "Astrologie-Chart", yoga: "Yoga-Reset" },
  },
  nl: {
    defaultTitle: "Bestemmingsservice",
    defaultDescription: "Een service die is verbonden met de hoofdbeleving van Code Destiny.",
    valueGuideTitle: "Praktische gids",
    corePoints: "Kernpunten",
    freeMainService: "FREE · Gratis hoofdservice",
    paidCta: (price) => `Betaalde functie openen · ${price}`,
    unlockCta: (price) => `Voor altijd ontgrendelen · ${price}`,
    freeCta: "Functie openen",
    insights: "Gerelateerde inzichten bekijken",
    paidNotice: "Dit is een betaalde functie. Het hoofdscherm controleert de betaaltoegang voordat deze opent.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Platform voor Vier Pilaren, tarot, astrologie en Zi Wei",
    categoryTags: { flower: "Bloemenrapport voor bestemming", tarot: "Tarotlezing", oracle: "Orakellezing", vedic: "Vedische astrologie", animal: "Totemlezing", dream: "Droomduiding", saju: "Vierpijlerlezen", ziwei: "Zi Wei Dou Shu-kaart", astrology: "Astrologische kaart", yoga: "Yoga-reset" },
  },
  ms: {
    defaultTitle: "Servis takdir",
    defaultDescription: "Servis yang disambungkan kepada pengalaman utama Code Destiny.",
    valueGuideTitle: "Panduan praktikal",
    corePoints: "Perkara utama",
    freeMainService: "FREE · Servis utama percuma",
    paidCta: (price) => `Buka ciri berbayar · ${price}`,
    unlockCta: (price) => `Buka kunci selamanya · ${price}`,
    freeCta: "Buka ciri",
    insights: "Lihat wawasan berkaitan",
    paidNotice: "Ini ialah ciri berbayar. Skrin utama akan menyemak akses bayaran sebelum ia dibuka.",
    mainBrand: "Kkulkkul Manseryuk",
    mainDescription: "Platform Empat Tiang, tarot, astrologi dan Zi Wei dalam satu aliran",
    categoryTags: { flower: "Laporan takdir bunga", tarot: "Bacaan tarot", oracle: "Bacaan oracle", vedic: "Astrologi Veda", animal: "Bacaan totem", dream: "Tafsiran mimpi", saju: "Bacaan Empat Tiang", ziwei: "Carta Zi Wei Dou Shu", astrology: "Carta astrologi", yoga: "Reset yoga" },
  },
};

type FeatureSlugTagCopyMap = Partial<Record<LoadingLocale, Record<string, string>>>;
type FeatureLandingSlugTagsModule = {
  FEATURE_SLUG_TAG_COPY: FeatureSlugTagCopyMap;
};
const PARTICLE_POS = [
  { top:"6%",  left:"4%"   },
  { top:"14%", right:"5%"  },
  { top:"42%", left:"2%"   },
  { top:"62%", right:"3%"  },
  { top:"82%", left:"6%"   },
];
function resolveFeatureLocaleFromPath(pathname: string): LoadingLocale {
  const localeSegment = String(pathname || "").split("/").filter(Boolean)[0];
  if (!localeSegment) return "ko";
  return normalizeFeatureLocaleCode(localeSegment);
}

function resolveFeatureLocale(pathname: string): LoadingLocale {
  const pathLocale = resolveFeatureLocaleFromPath(pathname);
  if (pathLocale !== "ko") return pathLocale;
  return getCurrentFeatureLocale();
}

function resolveFeatureBasePath(pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  if (basePath.length <= 1) return basePath || "/";
  return basePath.replace(/\/+$/, "");
}

function hasKoreanText(value?: string) {
  return /[가-힣]/.test(String(value || ""));
}

function resolveFeatureText(value: string | undefined, fallback: string, locale: LoadingLocale) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (locale !== "ko" && hasKoreanText(text)) return fallback;
  return text;
}

function resolveFeatureOptionalText(value: string | undefined, locale: LoadingLocale) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (locale !== "ko" && hasKoreanText(text)) return "";
  return text;
}

function resolveLocalizedService(service: ServiceLike | undefined, locale: LoadingLocale): ServiceContent | undefined {
  if (!service) return undefined;
  if (locale === "ko") return service;
  const localized = service.localized?.[locale] || service.localized?.en;
  return localized ? { ...service, ...localized } : service;
}

function resolveFeatureTag(
  basePath: string,
  category: string,
  tag: string | undefined,
  locale: LoadingLocale,
  copy: FeatureLandingCopy,
  slugTagCopy?: FeatureSlugTagCopyMap | null,
) {
  if (locale === "ko" || !tag || !hasKoreanText(tag)) return tag;
  return slugTagCopy?.[locale]?.[basePath] || slugTagCopy?.en?.[basePath] || copy.categoryTags[category] || copy.defaultTitle;
}

/* ═══════════════════════════════════════════
   Component
═══════════════════════════════════════════ */
export default function FeatureLandingPage({ service }: { service?: ServiceLike }) {
  useMobileFortuneRenderTrace("FeatureLandingPage");
  const pathname = usePathname() || "/";
  const basePath = resolveFeatureBasePath(pathname);
  const [locale, setLocale] = useState<LoadingLocale>(() => resolveFeatureLocaleFromPath(pathname));
  const [shareReady, setShareReady] = useState(false);
  const [slugTagCopy, setSlugTagCopy] = useState<FeatureSlugTagCopyMap | null>(null);
  const shareMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocale(resolveFeatureLocale(pathname));
  }, [pathname]);

  useEffect(() => {
    if (locale === "ko" || slugTagCopy) return;
    let cancelled = false;
    import("./FeatureLandingPage.slugTags")
      .then((module: FeatureLandingSlugTagsModule) => {
        if (!cancelled) setSlugTagCopy(module.FEATURE_SLUG_TAG_COPY);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale, slugTagCopy]);

  useEffect(() => {
    if (shareReady) return;
    const target = shareMountRef.current;
    if (!target || !("IntersectionObserver" in window)) {
      const timer = window.setTimeout(() => setShareReady(true), 4000);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShareReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [shareReady]);

  const action = ACTION_MAP[basePath];
  const runHref = basePath === "/oracle/sikojen-povailu"
    ? "/oracle/sikojen-povailu"
    : basePath === "/oracle/rune"
    ? "/oracle/rune"
    // 이파점의 도구는 App Router 가 아니라 정적 파일(public/ifa-oracle.html)이고
    // Cloudflare Pages 가 확장자를 떼고 /ifa-oracle 로 서빙한다. 랜딩(/oracle/ifa)은
    // 색인 대상이고 도구는 noindex 라, 실행 버튼만 그쪽으로 보낸다.
    : basePath === "/oracle/ifa"
    ? "/ifa-oracle"
    : basePath === "/ziwei/chart"
    ? "/ziwei/chart"
    : action
    ? `/index.html?action=${encodeURIComponent(action)}`
    : "/index.html";
  const paidMeta = PAID_SLUG_META[basePath];
  const isPaidFeature = !!paidMeta;
  // 서버 가격 정본 조회. 유료 기능은 UI fallback 가격을 사용하지 않는다.
  const paidPrice = useServerPrice({
    featureKey: paidMeta?.featureKey,
  });
  // 회당 결제와 영구 해금은 같은 값을 내도 성격이 다르다. 레지스트리의 accessModel 을 그대로 따른다.
  const isUnlockFeature = resolveFeatureAccessModel(paidMeta?.featureKey) === "unlock";
  // 가격을 못 푼 상태의 문구. PriceBadge 와 **같은 키**를 쓴다 — 사본을 만들면 두 화면이 갈라진다.
  const pick = useTPick();
  const pricePendingLabel = (paidPrice.loading
    ? pick("preview.priceLoading", "가격 확인 중")
    : pick("preview.priceUnknown", "가격 확인 필요")) || "";

  const category = basePath.split("/")[1] ?? "tarot";
  const baseTheme = THEMES[category] ?? THEMES.tarot;
  const override = SLUG_THEME_OVERRIDE[basePath] ?? {};
  const t: Theme = { ...baseTheme, ...override };
  const cfg: SlugCfg = SLUG_CFG[basePath] ?? {
    icon:"✨", badge:"SERVICE", particles:["✦","⭐","✨","💫","✦"],
  };
  const copy = FEATURE_LANDING_COPY[locale] || FEATURE_LANDING_COPY.ko;
  const activeService = resolveLocalizedService(service, locale);
  const localizedTag = resolveFeatureTag(basePath, category, cfg.tag, locale, copy, slugTagCopy);
  const titleFallback = locale === "ko" ? copy.defaultTitle : (cfg.badge || copy.defaultTitle);
  const title = resolveFeatureText(activeService?.h1 || activeService?.title, titleFallback, locale);
  const description = resolveFeatureText(activeService?.description, copy.defaultDescription, locale);
  const rawPoints = Array.isArray(activeService?.landingPoints) ? activeService!.landingPoints! : [];
  const points = locale === "ko" ? rawPoints : rawPoints.filter((point) => !hasKoreanText(point));
  const rawValueSections = Array.isArray(activeService?.valueSections) ? activeService.valueSections : [];
  const valueSections = locale === "ko" ? rawValueSections : rawValueSections.filter((section) => !hasKoreanText(section.title) && !hasKoreanText(section.body));
  const valueGuideTitle = resolveFeatureText(activeService?.valueGuideTitle, copy.valueGuideTitle, locale);
  const seoText = resolveFeatureOptionalText(activeService?.seoText, locale);
  const isFlower = category === "flower";

  return (
    <main style={{ minHeight:"100dvh", background:t.bg, color:"#f1f5f9", position:"relative", overflow:"hidden" }}>

      {/* CSS animations */}
      <style>{`
        @keyframes flp-orb { 0%,100%{opacity:.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes flp-float {
          0%,100%{transform:translateY(0) rotate(0deg);opacity:.55}
          40%{transform:translateY(-14px) rotate(6deg);opacity:.85}
          70%{transform:translateY(-7px) rotate(-4deg);opacity:.7}
        }
        @keyframes flp-petal {
          0%,100%{transform:translateY(0) scale(1) rotate(0deg)}
          50%{transform:translateY(-18px) scale(1.06) rotate(12deg)}
        }
        @keyframes flp-in {
          from{opacity:0;transform:translateY(22px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes flp-shine {
          0%{transform:translateX(-120%) skewX(-12deg)}
          100%{transform:translateX(120%) skewX(-12deg)}
        }
        @keyframes flp-pig-bounce {
          0%,100%{transform:translateY(0) scale(1) rotate(-4deg)}
          40%{transform:translateY(-7px) scale(1.08) rotate(4deg)}
          70%{transform:translateY(-3px) scale(1.04) rotate(-2deg)}
        }
        @keyframes flp-manse-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(255,183,178,0.55),0 12px 32px rgba(255,139,167,0.28)}
          50%{box-shadow:0 0 0 8px rgba(255,183,178,0),0 16px 40px rgba(255,139,167,0.42)}
        }
        @keyframes flp-manse-shine {
          0%{transform:translateX(-130%) skewX(-14deg);opacity:0}
          20%{opacity:0.5}
          80%{opacity:0.5}
          100%{transform:translateX(130%) skewX(-14deg);opacity:0}
        }
        .flp-in { animation: flp-in .65s cubic-bezier(.22,1,.36,1) both; }
        .flp-d1 { animation-delay:.08s; }
        .flp-d2 { animation-delay:.18s; }
        .flp-d3 { animation-delay:.28s; }
        .flp-d4 { animation-delay:.4s; }
        .flp-btn-p { transition: transform .18s ease, filter .18s ease, box-shadow .18s ease; }
        .flp-btn-p:hover { transform:translateY(-3px); filter:brightness(1.1); }
        .flp-btn-p:active { transform:translateY(0) scale(.97); }
        .flp-btn-s { transition: transform .18s ease, background .18s ease; }
        .flp-btn-s:hover { transform:translateY(-2px); }
        .flp-img-wrap::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(125deg,transparent 35%,rgba(255,255,255,.12) 55%,transparent 75%);
          transform:translateX(-120%) skewX(-12deg);
          pointer-events:none;
        }
        .flp-img-wrap:hover::after { animation: flp-shine .7s ease forwards; }
        @media (max-width: 768px), (prefers-reduced-motion: reduce) {
          .flp-orb,.flp-particle,.flp-petal,.flp-hero-icon,.flp-manse-card,.flp-manse-shine,.flp-manse-logo { animation:none!important; }
          .flp-orb,.flp-particle,.flp-petal { display:none!important; }
          .flp-hero-icon { filter:none!important; }
          .flp-img-wrap { box-shadow:0 14px 34px rgba(15,23,42,.34)!important; }
          .flp-in { animation-duration:.32s; }
          .flp-btn-p:hover,.flp-btn-s:hover { transform:none; }
        }
      `}</style>

      {/* Ambient orbs */}
      <div className="flp-orb" aria-hidden="true" style={{
        position:"absolute", top:"-18%", left:"-12%", width:"58%", height:"58%",
        borderRadius:"50%", background:`radial-gradient(circle,${t.orb1} 0%,transparent 70%)`,
        filter:"blur(52px)", pointerEvents:"none",
        animation:"flp-orb 9s ease-in-out infinite",
      }}/>
      <div className="flp-orb" aria-hidden="true" style={{
        position:"absolute", bottom:"2%", right:"-14%", width:"65%", height:"65%",
        borderRadius:"50%", background:`radial-gradient(circle,${t.orb2} 0%,transparent 70%)`,
        filter:"blur(64px)", pointerEvents:"none",
        animation:"flp-orb 11s ease-in-out 4s infinite",
      }}/>

      {/* Floating particle decorations */}
      {cfg.particles.map((p, i) => (
        <div key={i} className={`flp-particle ${i >= 3 ? "flp-particle-extra" : ""}`} aria-hidden="true" style={{
          position:"absolute",
          opacity: 0.08 + i * 0.035,
          pointerEvents:"none",
          ...PARTICLE_POS[i],
          animation:`flp-float ${4.2 + i * 0.9}s ease-in-out ${i * 0.55}s infinite`,
          userSelect:"none",
        }}>
          <span style={{
            display:"inline-flex",
            alignItems:"center",
            justifyContent:"center",
            width:14 + (i % 3) * 5,
            height:14 + (i % 3) * 5,
            fontSize:14 + (i % 3) * 5,
            lineHeight:1,
            color:"rgba(245,243,255,0.72)",
          }}>{p}</span>
        </div>
      ))}

      {/* ── Flower category: extra petal orbs ── */}
      {isFlower && (
        <>
          <div className="flp-petal" aria-hidden="true" style={{
            position:"absolute", top:"28%", left:"50%",
            width:"320px", height:"320px", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(236,72,153,.08) 0%,transparent 70%)",
            filter:"blur(40px)", pointerEvents:"none", transform:"translateX(-50%)",
          }}/>
          {["TL","TR","BL","BR"].map((pos,i) => (
            <div key={pos} className="flp-petal" aria-hidden="true" style={{
              position:"absolute",
              top: i < 2 ? "18%" : "70%",
              left: i % 2 === 0 ? "12%" : undefined,
              right: i % 2 !== 0 ? "12%" : undefined,
              width:"44px", height:"44px", borderRadius:"50%",
              background:`radial-gradient(circle,${["rgba(244,114,182,.18)","rgba(216,180,254,.14)","rgba(251,207,232,.12)","rgba(196,132,252,.16)"][i]} 0%,transparent 70%)`,
              filter:"blur(12px)", pointerEvents:"none",
              animation:`flp-petal ${3.5 + i * 0.7}s ease-in-out ${i * 0.4}s infinite`,
            }}/>
          ))}
        </>
      )}

      {/* Content */}
      <div style={{
        position:"relative", zIndex:1,
        maxWidth:"680px", margin:"0 auto",
        padding:"clamp(36px,8vw,68px) clamp(16px,5vw,32px) 56px",
      }}>

        {/* Badge */}
        <div className="flp-in" style={{ textAlign:"center", marginBottom:"18px" }}>
          <span style={{
            display:"inline-block", fontSize:"0.63rem", fontWeight:800,
            letterSpacing:"0.24em", color:t.badge,
            background:"rgba(255,255,255,0.05)", border:`1px solid ${t.border}`,
            padding:"5px 18px", borderRadius:"999px", textTransform:"uppercase",
            backdropFilter:"blur(6px)",
          }}>{cfg.badge}</span>
        </div>

        {/* Icon + Title */}
        <header className="flp-in flp-d1" style={{ textAlign:"center", marginBottom:"30px" }}>
          <div className="flp-hero-icon" style={{
            lineHeight:1, marginBottom:"16px",
            filter:`drop-shadow(0 0 22px ${t.orb1})`,
            animation:`flp-float 4s ease-in-out infinite`,
            display:"inline-flex",
          }}>
            <span style={{
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              width:72,
              height:72,
              fontSize:56,
              lineHeight:1,
              filter:"drop-shadow(0 0 10px rgba(180,200,255,0.45))",
            }}>{cfg.icon}</span>
          </div>
          <h1 style={{
            fontFamily:"'Noto Serif KR','Noto Serif',serif",
            fontSize:"clamp(1.6rem,5vw,2.35rem)", fontWeight:800,
            lineHeight:1.22, letterSpacing:"-0.02em",
            background:t.titleGrad,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            margin:"0 0 8px", wordBreak:"keep-all",
          }}>{title}</h1>
          {localizedTag && (
            <p style={{ fontSize:"0.78rem", color:t.accent, opacity:.68, letterSpacing:"0.1em", margin:0 }}>
              {localizedTag}
            </p>
          )}
        </header>

        {/* OG Image */}
        {activeService?.ogImage && (
          <div className="flp-in flp-d2 flp-img-wrap" style={{
            borderRadius:"20px", overflow:"hidden", marginBottom:"26px",
            border:`1px solid ${t.border}`,
            boxShadow:`0 20px 60px ${t.glow},0 0 0 1px rgba(255,255,255,0.04)`,
            position:"relative", height:"220px",
          }}>
            <img
              src={activeService.ogImage}
              alt={title}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={1200}
              height={630}
              sizes="(max-width: 768px) 92vw, 760px"
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            />
            <div style={{
              position:"absolute", inset:0,
              background:`linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)`,
            }}/>
            {/* Title overlay on image */}
            <div style={{
              position:"absolute", bottom:"14px", left:"16px",
              fontSize:"0.72rem", fontWeight:800, letterSpacing:"0.16em",
              color:"rgba(255,255,255,0.7)", textTransform:"uppercase",
            }}>{cfg.badge}</div>
          </div>
        )}

        {/* Description */}
        <div className="flp-in flp-d2" style={{
          background:"rgba(255,255,255,0.04)", border:`1px solid ${t.border}`,
          borderRadius:"16px", padding:"20px 22px", marginBottom:"20px",
          backdropFilter:"blur(10px)", boxShadow:`0 6px 28px ${t.glow}`,
        }}>
          <p style={{
            fontSize:"clamp(0.88rem,2.2vw,0.97rem)", lineHeight:1.92,
            color:"rgba(241,245,249,0.88)", margin:0, wordBreak:"keep-all",
          }}>{description}</p>
        </div>

        {/* Feature points */}
        {points.length > 0 && (
          <div className="flp-in flp-d3" style={{ marginBottom:"28px" }}>
            <h2 style={{
              fontSize:"0.66rem", fontWeight:800, letterSpacing:"0.22em",
              textTransform:"uppercase", color:t.accent, opacity:.72,
              marginBottom:"10px", marginTop:0,
            }}>{copy.corePoints}</h2>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",
              gap:"8px",
            }}>
              {points.map((pt, i) => (
                <div key={i} style={{
                  background:t.ptBg, border:`1px solid ${t.ptBorder}`,
                  borderRadius:"12px", padding:"11px 14px",
                  display:"flex", alignItems:"flex-start", gap:"9px",
                  backdropFilter:"blur(4px)",
                }}>
                  <span style={{
                    width:"6px", height:"6px", borderRadius:"50%", background:t.ptDot,
                    flexShrink:0, marginTop:"7px", boxShadow:`0 0 8px ${t.ptDot}`,
                  }}/>
                  <span style={{
                    fontSize:"0.84rem", color:"rgba(241,245,249,0.9)",
                    lineHeight:1.62, wordBreak:"keep-all",
                  }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Long-form value section (low-value content reinforcement) */}
        {valueSections.length > 0 && (
          <section className="flp-in flp-d3" style={{ marginBottom:"30px" }} aria-label={valueGuideTitle}>
            <h2 style={{
              fontSize:"0.66rem", fontWeight:800, letterSpacing:"0.22em",
              textTransform:"uppercase", color:t.accent, opacity:.78,
              marginBottom:"12px", marginTop:0,
            }}>{valueGuideTitle}</h2>
            <div style={{ display:"grid", gap:"10px" }}>
              {valueSections.map((section, i) => (
                <article key={`${section.title}-${i}`} style={{
                  background:"rgba(255,255,255,0.045)",
                  border:`1px solid ${t.ptBorder}`,
                  borderRadius:"12px",
                  padding:"14px 14px 12px",
                  boxShadow:`0 4px 20px ${t.glow}`,
                }}>
                  <h3 style={{
                    margin:"0 0 6px",
                    color:t.accent,
                    fontSize:"0.84rem",
                    letterSpacing:"0.01em",
                    fontWeight:800,
                    lineHeight:1.45,
                  }}>{section.title}</h3>
                  <p style={{
                    margin:0,
                    color:"rgba(241,245,249,0.88)",
                    fontSize:"0.82rem",
                    lineHeight:1.8,
                    wordBreak:"keep-all",
                  }}>{section.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Divider */}
        <div style={{
          height:"1px",
          background:`linear-gradient(90deg,transparent,${t.divider},transparent)`,
          marginBottom:"24px",
        }}/>

        <div className="flp-in flp-d4" style={{ marginBottom:"12px" }}>
          <a
            className="flp-manse-card"
            href="/"
            style={{
              display:"flex", alignItems:"center", gap:"12px",
              padding:"15px 20px",
              background:"linear-gradient(135deg,#ffe4ec 0%,#fff5dc 50%,#fce4ff 100%)",
              borderRadius:"16px",
              border:"1.5px solid rgba(255,183,178,0.7)",
              textDecoration:"none",
              position:"relative", overflow:"hidden",
              animation:"flp-manse-pulse 2.4s ease-in-out infinite",
            }}
          >
            {/* shine sweep */}
            <span className="flp-manse-shine" aria-hidden="true" style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:"linear-gradient(120deg,transparent 30%,rgba(255,255,255,0.55) 55%,transparent 75%)",
              animation:"flp-manse-shine 3.6s ease-in-out 1.2s infinite",
            }}/>

            <span className="flp-manse-logo" style={{
              flexShrink:0, width:"46px", height:"46px",
              borderRadius:"50%", overflow:"hidden",
              border:"2px solid rgba(255,139,167,0.45)",
              boxShadow:"0 4px 12px rgba(255,139,167,0.28)",
              animation:"flp-pig-bounce 3.2s ease-in-out infinite",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"#fff",
            }}>
              <img
                src="https://code-destiny.com/icons/app-logo-512.webp"
                alt={copy.mainBrand}
                width={46} height={46}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              />
            </span>

            <span style={{ flex:1, minWidth:0 }}>
              <span style={{
                display:"block",
                fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.18em",
                color:"rgba(213,63,90,0.72)", textTransform:"uppercase",
                marginBottom:"2px",
              }}>{copy.freeMainService}</span>
              <span style={{
                display:"block",
                fontSize:"1rem", fontWeight:900,
                background:"linear-gradient(135deg,#be185d 0%,#d97706 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                lineHeight:1.2,
              }}>{copy.mainBrand}</span>
              <span style={{
                display:"block",
                fontSize:"0.73rem", color:"rgba(120,60,60,0.68)",
                marginTop:"3px", lineHeight:1.4,
              }}>{copy.mainDescription}</span>
            </span>

            <span style={{
              flexShrink:0, width:"28px", height:"28px",
              borderRadius:"50%",
              background:"linear-gradient(135deg,rgba(255,139,167,0.18),rgba(255,183,178,0.28))",
              border:"1px solid rgba(255,139,167,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"0.75rem", color:"rgba(190,24,93,0.8)",
            }}>→</span>
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="flp-in flp-d4" style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          <a href={runHref} className="flp-btn-p" style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:"10px", padding:"16px 24px", background:t.btnPrimary,
            color:"#fff", borderRadius:"14px", fontWeight:800, fontSize:"1rem",
            textDecoration:"none", boxShadow:t.btnGlow, letterSpacing:"0.03em",
            fontFamily:"'Noto Sans KR',sans-serif",
          }}>
            <span style={{
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              width:18,
              height:18,
              fontSize:16,
              lineHeight:1,
            }}>{cfg.icon}</span>
            <span>{isPaidFeature
              ? (isUnlockFeature ? copy.unlockCta : copy.paidCta)(
                  paidPrice.label || pricePendingLabel,
                )
              : copy.freeCta}</span>
          </a>
          <a href="/insights/" className="flp-btn-s" style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"13px 24px", background:t.btnSec,
            border:`1px solid ${t.btnSecBorder}`,
            color:t.accent, borderRadius:"14px",
            fontWeight:700, fontSize:"0.9rem",
            textDecoration:"none", letterSpacing:"0.02em",
          }}>
            {copy.insights}
          </a>
        </div>

        <div ref={shareMountRef}>
          {shareReady ? (
            <Suspense fallback={null}>
              <ShareWidget
                title={title}
                description={description}
                path={basePath}
                image={activeService?.ogImage}
                contentType="software"
                contentId={basePath}
              />
            </Suspense>
          ) : null}
        </div>

        {isPaidFeature && (
          <p style={{
            marginTop:"10px", marginBottom:0,
            fontSize:"0.78rem", lineHeight:1.6, textAlign:"center",
            color:"rgba(248,250,252,0.78)",
          }}>
            {copy.paidNotice}
          </p>
        )}

        {/* SEO text */}
        {seoText && (
          <p style={{
            marginTop:"36px", fontSize:"0.73rem", lineHeight:1.75,
            color:t.seo, textAlign:"center", padding:"0 4px", wordBreak:"keep-all",
          }}>{seoText}</p>
        )}
      </div>
    </main>
  );
}


