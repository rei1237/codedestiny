"use client";

// 작명 v2 작명서 그림(에셋 A1~A7 + 점수 레이더). 전부 직접 그린 SVG·CSS — 남의 이미지·문양·로고를 베끼지 않는다.
// 🔴 paid-result-locale-copy 가드의 화면(surface)이다: 주석 밖에 한글을 쓰지 않는다. 문구는 copy 로만 받는다.
// 🔴 색만으로 뜻을 전하지 않는다 — 오행·길흉·관계에는 늘 글자 라벨을 함께 둔다.
// 🔴 여기서는 아무것도 계산하지 않는다. 엔진 값(획수·격·삼재·소리)을 그리기만 한다.

import { Fragment, useId, type CSSProperties, type ReactNode } from "react";
import styles from "./naming-v2.module.css";
import type { NamingV2Copy } from "./namingV2Copy";
import {
  V2_ELEMENTS,
  V2_GRIDS,
  V2_SCORE_KEYS,
  branchElement,
  branchHanja,
  controlsOf,
  elementTone,
  generatesOf,
  gridFormula,
  radicalChar,
  relationOf,
  stemHanja,
  suriElement,
  type V2Candidate,
  type V2Element,
  type V2Grade,
  type V2Relation,
  type V2Saju,
  type V2ScoreKey,
} from "./namingV2Types";

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");
const r1 = (n: number) => Math.round(n * 10) / 10;
const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

export const GRADE_TONE: Record<V2Grade, string> = { good: "var(--nv2-good)", half: "var(--nv2-muted)", bad: "var(--nv2-seal)" };
const RELATION_TONE: Record<V2Relation, string> = { generate: "var(--nv2-good)", same: "var(--nv2-muted)", control: "var(--nv2-seal)" };

/* ── A1 액자: 한지 + 금선 이중 테두리 + 당초문 모서리 + 보상화문 메달리온 ── */

export function HanjiFrame({ children, className, reveal = false, medallion = true, style }: {
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  medallion?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={cx(styles.paper, styles.frame, reveal && styles.reveal, className)} style={style}>
      <span className={styles.frameLine} aria-hidden="true" />
      {/* 위치·투명도는 감싸는 span 이 맡는다 — html2canvas(PDF)는 <svg> 의 계산 스타일(left·top 해석값·opacity)을 그림 안에 다시 넣어
          절대 배치된 svg 가 제 그림 밖으로 밀려 사라지고 투명도는 두 번 곱해진다(실측: 왼쪽 위 1개만 남음). */}
      {medallion ? <span className={styles.medallionWrap} aria-hidden="true"><BosanghwaMedallion className={styles.medallion} /></span> : null}
      <span className={cx(styles.corner, styles.cornerTL)} aria-hidden="true"><DangchoCorner className={styles.fill} /></span>
      <span className={cx(styles.corner, styles.cornerTR)} aria-hidden="true"><DangchoCorner className={styles.fill} flip="x" /></span>
      <span className={cx(styles.corner, styles.cornerBL)} aria-hidden="true"><DangchoCorner className={styles.fill} flip="y" /></span>
      <span className={cx(styles.corner, styles.cornerBR)} aria-hidden="true"><DangchoCorner className={styles.fill} flip="xy" /></span>
      <div className={styles.frameBody}>{children}</div>
    </div>
  );
}

const CORNER_FLIP = { x: "matrix(-1 0 0 1 64 0)", y: "matrix(1 0 0 -1 0 64)", xy: "matrix(-1 0 0 -1 64 64)" } as const;

/**
 * 당초문 모서리 — 모서리를 감싸는 이중 선과 안으로 말리는 덩굴, 잎 두 장(왼쪽 위 기준, flip 으로 뒤집어 네 귀에 쓴다).
 * 뒤집기는 SVG 안 transform 으로 한다 — <svg> 자체에 CSS 를 덜 걸어야 html2canvas(PDF)가 그림 안에 다시 넣는 계산 스타일이 적다.
 */
export function DangchoCorner({ className, flip }: { className?: string; flip?: keyof typeof CORNER_FLIP }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <g transform={flip ? CORNER_FLIP[flip] : undefined}>
        <path d="M3 42V10a7 7 0 0 1 7-7h32" />
        <path d="M8 34V15a7 7 0 0 1 7-7h19" strokeOpacity=".55" />
        <path d="M14 14c8 0 14 5 14 12 0 5-4 8-8 8-3.5 0-6-2.5-6-5.5 0-2.4 1.9-4.2 4.2-4.2" />
        <path d="M24 9c6 3.5 11 3.5 17 .5" strokeOpacity=".7" />
        <path d="M9 24c3.5 6 3.5 11 .5 17" strokeOpacity=".7" />
        <path d="M31 12.5c4-3 9-3 12 0-3.5 3-8.5 3-12 0z" fill="currentColor" fillOpacity=".28" />
        <path d="M12.5 31c-3 4-3 9 0 12 3-3.5 3-8.5 0-12z" fill="currentColor" fillOpacity=".28" />
        <circle cx="14" cy="14" r="1.8" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** 보상화문 메달리온 — 큰 꽃잎 8 + 작은 꽃잎 8, 꽃잎 끝 말림, 이중 원. 아주 옅게 배경에만 깐다. */
export function BosanghwaMedallion({ className }: { className?: string }) {
  const turns = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="96" />
      <circle cx="100" cy="100" r="90" strokeDasharray="2 5" />
      {turns.map((deg) => (
        <g key={`p${deg}`} transform={`rotate(${deg} 100 100)`}>
          <path d="M100 100C86 76 88 44 100 26C112 44 114 76 100 100Z" />
          <path d="M100 26c-6-6-4-14 2-15 5-1 7 4 4 7" />
          <path d="M100 92C95 78 96 62 100 50" strokeOpacity=".6" />
        </g>
      ))}
      {turns.map((deg) => (
        <g key={`s${deg}`} transform={`rotate(${deg + 22.5} 100 100)`}>
          <path d="M100 100C92 84 93 66 100 54C107 66 108 84 100 100Z" />
          <circle cx="100" cy="47" r="2.2" fill="currentColor" stroke="none" />
        </g>
      ))}
      <circle cx="100" cy="100" r="20" />
      <circle cx="100" cy="100" r="9" fill="currentColor" fillOpacity=".4" />
    </svg>
  );
}

/* ── A7 낙관 ── */

const CJK = /\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/u;

/** 붉은 인주 낙관. 한 글자는 가운데, 두 글자는 세로, 세·네 글자는 오른쪽 세로줄부터 읽는 2×2, 라틴 문자는 가로 한 줄. */
export function Seal({ text, size = 56, tilt = -4, round = false, stamp = false, fluid = false, className }: {
  text: string;
  size?: number;
  tilt?: number;
  round?: boolean;
  stamp?: boolean;
  /** true 면 겉 크기를 className 의 CSS 가 정한다(size 는 그림 좌표계로만 쓴다). */
  fluid?: boolean;
  className?: string;
}) {
  const chars = Array.from(text);
  const cjk = chars.length > 0 && chars.every((c) => CJK.test(c));
  const s = size;
  const ink: CSSProperties = { fill: "var(--nv2-bg)" };
  let glyphs: ReactNode;
  if (!cjk) {
    glyphs = (
      <text x={s / 2} y={s / 2} dominantBaseline="central" textAnchor="middle" fontSize={r1(s * Math.min(0.3, 1.5 / Math.max(chars.length, 1)))} letterSpacing="1" style={{ ...ink, fontFamily: "var(--font-premium)", fontWeight: 700 }}>
        {text}
      </text>
    );
  } else if (chars.length === 1) {
    glyphs = <text x={s / 2} y={s / 2} dominantBaseline="central" textAnchor="middle" fontSize={r1(s * 0.62)} className={styles.han} style={{ ...ink, fontWeight: 700 }}>{chars[0]}</text>;
  } else if (chars.length === 2) {
    glyphs = chars.map((c, k) => (
      <text key={k} x={s / 2} y={r1(s * (0.3 + 0.4 * k))} dominantBaseline="central" textAnchor="middle" fontSize={r1(s * 0.38)} className={styles.han} style={{ ...ink, fontWeight: 700 }}>{c}</text>
    ));
  } else {
    // 오른쪽 세로줄(위→아래) 다음 왼쪽 세로줄. 세 글자면 셋째가 왼쪽 줄 전체를 쓴다.
    const cells = chars.slice(0, 4).map((c, k) => {
      const right = k < 2;
      const x = right ? s * 0.69 : s * 0.31;
      const y = chars.length === 3 && k === 2 ? s * 0.5 : s * (0.3 + 0.4 * (k % 2));
      const fs = chars.length === 3 && k === 2 ? s * 0.44 : s * 0.32;
      return <text key={k} x={r1(x)} y={r1(y)} dominantBaseline="central" textAnchor="middle" fontSize={r1(fs)} className={styles.han} style={{ ...ink, fontWeight: 700 }}>{c}</text>;
    });
    glyphs = cells;
  }
  const inset = r1(s * 0.09);
  return (
    <span
      className={cx(styles.seal, stamp && styles.stamp, className)}
      style={{ ...(fluid ? null : { width: s, height: s }), ["--nv2-tilt" as string]: `${tilt}deg`, transform: stamp ? undefined : `rotate(${tilt}deg)` }}
      role="img"
      aria-label={text}
    >
      <svg viewBox={`0 0 ${s} ${s}`} width={fluid ? "100%" : s} height={fluid ? "100%" : s} aria-hidden="true" focusable="false">
        {round ? (
          <>
            <circle cx={s / 2} cy={s / 2} r={s / 2 - 1.5} style={{ fill: "var(--nv2-seal)" }} />
            <circle cx={s / 2} cy={s / 2} r={s / 2 - inset} fill="none" strokeWidth="1.2" style={{ stroke: "var(--nv2-bg)", strokeOpacity: 0.7 }} />
          </>
        ) : (
          <>
            <rect x="1.5" y="1.5" width={s - 3} height={s - 3} rx={r1(s * 0.08)} style={{ fill: "var(--nv2-seal)" }} />
            <rect x={inset} y={inset} width={r1(s - inset * 2)} height={r1(s - inset * 2)} rx={r1(s * 0.04)} fill="none" strokeWidth="1.2" style={{ stroke: "var(--nv2-bg)", strokeOpacity: 0.7 }} />
          </>
        )}
        {glyphs}
        {/* 인주가 덜 묻은 자리 — 손으로 찍은 질감 */}
        <circle cx={r1(s * 0.18)} cy={r1(s * 0.8)} r={r1(s * 0.025)} style={{ fill: "var(--nv2-bg)", fillOpacity: 0.35 }} />
        <circle cx={r1(s * 0.84)} cy={r1(s * 0.22)} r={r1(s * 0.018)} style={{ fill: "var(--nv2-bg)", fillOpacity: 0.3 }} />
        <circle cx={r1(s * 0.62)} cy={r1(s * 0.9)} r={r1(s * 0.014)} style={{ fill: "var(--nv2-bg)", fillOpacity: 0.3 }} />
      </svg>
    </span>
  );
}

/* ── 공통 작은 조각 ── */

export function ElementChip({ copy, element, suffix }: { copy: NamingV2Copy; element: V2Element | null; suffix?: string }) {
  const tone = elementTone(element);
  return (
    <span className={styles.chip} style={{ color: tone.color, background: tone.soft, borderColor: tone.color }}>
      <span className={styles.han} aria-hidden="true">{tone.hanja}</span>
      <span>{element ? copy.elements[element] : copy.unclassified}{suffix ? ` ${suffix}` : ""}</span>
    </span>
  );
}

export function GradeBadge({ copy, grade }: { copy: NamingV2Copy; grade: V2Grade }) {
  return <span className={styles.badge} style={{ color: GRADE_TONE[grade] }}>{copy.grades[grade]}</span>;
}

function segment(a: { x: number; y: number }, b: { x: number; y: number }, ra: number, rb: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x1: r1(a.x + (dx / d) * ra), y1: r1(a.y + (dy / d) * ra), x2: r1(b.x - (dx / d) * rb), y2: r1(b.y - (dy / d) * rb) };
}

function Arrow({ id, tone }: { id: string; tone: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" style={{ fill: tone }} />
    </marker>
  );
}

/* ── A2 오행 오각형: 원 크기 = 원국 개수, 고리 = 이름이 보태는 오행, 둘레 금선 = 상생, 별 점선 = 상극 ── */

export function ElementPentagon({ copy, counts, adds }: {
  copy: NamingV2Copy;
  counts?: Partial<Record<V2Element, number>>;
  adds?: Partial<Record<V2Element, number>>;
}) {
  const uid = safeId(useId());
  const CX = 170;
  const CY = 172;
  const R = 108;
  const hasCounts = Boolean(counts && V2_ELEMENTS.some((el) => typeof counts[el] === "number"));
  const radius = (el: V2Element) => (hasCounts ? r1(17 + 8 * Math.sqrt(Math.max(0, counts?.[el] || 0))) : 24);
  const angle = (el: V2Element) => ((-162 + 72 * V2_ELEMENTS.indexOf(el)) * Math.PI) / 180;
  const pos = (el: V2Element) => {
    // 화(火)를 꼭대기에 두고 시계 방향으로 상생 순서(목→화→토→금→수)가 돈다.
    const a = angle(el);
    return { x: r1(CX + R * Math.cos(a)), y: r1(CY + R * Math.sin(a)) };
  };
  const label = V2_ELEMENTS.map((el) => `${copy.elements[el]}${hasCounts ? ` ${counts?.[el] || 0}` : ""}${adds?.[el] ? ` +${adds[el]}` : ""}`).join(", ");
  return (
    <figure className={styles.figure}>
      <svg viewBox="0 0 340 334" className={styles.art} role="img" aria-label={label}>
        <defs>
          <Arrow id={`${uid}g`} tone="var(--nv2-good)" />
          <Arrow id={`${uid}c`} tone="var(--nv2-seal)" />
        </defs>
        {V2_ELEMENTS.map((el) => {
          const to = controlsOf(el);
          const s = segment(pos(el), pos(to), radius(el) + 3, radius(to) + 7);
          return <line key={`c${el}`} {...s} strokeWidth="1.2" strokeDasharray="5 5" markerEnd={`url(#${uid}c)`} style={{ stroke: "var(--nv2-seal)", strokeOpacity: 0.75 }} />;
        })}
        {V2_ELEMENTS.map((el) => {
          const to = generatesOf(el);
          const s = segment(pos(el), pos(to), radius(el) + 3, radius(to) + 7);
          return <line key={`g${el}`} {...s} strokeWidth="1.8" markerEnd={`url(#${uid}g)`} style={{ stroke: "var(--nv2-good)" }} />;
        })}
        {V2_ELEMENTS.map((el) => {
          const p = pos(el);
          const r = radius(el);
          const tone = elementTone(el);
          const add = adds?.[el] || 0;
          // 라벨은 중심 반대쪽(바깥)에 둔다 — 위쪽 세 꼭짓점은 원 위, 아래 두 꼭짓점은 원 아래. 상생·상극 선은 늘 안쪽으로 나간다.
          const outer = r + (add > 0 ? 6 : 0);
          const above = Math.sin(angle(el)) < 0;
          const lx = r1(p.x + Math.cos(angle(el)) * 8);
          const ly = r1(above ? p.y - outer - 7 : p.y + outer + 15);
          return (
            <g key={el}>
              {add > 0 ? <circle cx={p.x} cy={p.y} r={r + 6} fill="none" strokeWidth="2" className={styles.pulse} style={{ stroke: tone.color }} /> : null}
              <circle cx={p.x} cy={p.y} r={r} strokeWidth="1.6" style={{ fill: "var(--nv2-surface)", stroke: tone.color }} />
              <circle cx={p.x} cy={p.y} r={r} style={{ fill: tone.soft }} />
              <text x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle" fontSize={r1(Math.max(15, r * 0.82))} className={styles.han} style={{ fill: tone.color, fontWeight: 700 }}>{tone.hanja}</text>
              {/* 바탕색 테두리(halo)로 화살촉 근처에서도 숫자가 읽히게 한다 */}
              <text x={lx} y={ly} textAnchor="middle" fontSize="12.5" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" style={{ fill: "var(--nv2-ink-soft)", stroke: "var(--nv2-surface)" }}>
                {copy.elements[el]}{hasCounts ? ` ${counts?.[el] || 0}` : ""}
                {add > 0 ? <tspan style={{ fill: "var(--nv2-accent)", fontWeight: 700 }}>{` +${add}`}</tspan> : null}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={styles.legend}>
        <span className={styles.legendItem}><svg width="26" height="10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" strokeWidth="2" style={{ stroke: "var(--nv2-good)" }} /></svg>{copy.generateLegend}</span>
        <span className={styles.legendItem}><svg width="26" height="10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" strokeWidth="1.6" strokeDasharray="5 4" style={{ stroke: "var(--nv2-seal)" }} /></svg>{copy.controlLegend}</span>
        <span className={styles.legendItem}><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" style={{ stroke: "var(--nv2-accent)" }} /></svg>{copy.nameAddsLabel}</span>
      </div>
      <figcaption className={styles.caption}>{hasCounts ? copy.pentagonCaption : copy.pentagonCaptionNoCounts}</figcaption>
    </figure>
  );
}

/* ── 원국 기둥(년·월·일·시) — 엔진 기둥은 한글 간지라 한자로 바꿔 보인다 ── */

export function PillarRow({ copy, saju }: { copy: NamingV2Copy; saju: V2Saju }) {
  const keys = ["h", "d", "m", "y"] as const; // 명식은 오른쪽(년)에서 왼쪽(시)으로 읽는 관례
  const pillars = saju.pillars;
  if (!pillars || !keys.some((k) => pillars[k])) return null;
  return (
    <div className={styles.pillarRow}>
      {keys.map((k) => {
        const p = pillars[k];
        const stemEl = (p?.gE || null) as V2Element | null;
        const branchEl = branchElement(p?.j);
        return (
          <div key={k} className={styles.pillarCell}>
            <span className={styles.pillarKey}>{copy.pillarLabels[k]}</span>
            {p?.g || p?.j ? (
              <>
                <span className={cx(styles.han, styles.ganji)} style={{ color: elementTone(stemEl).color }}>{stemHanja(p?.g)}</span>
                <span className={styles.ganjiEl}>{stemEl ? copy.elements[stemEl] : copy.unclassified}</span>
                <span className={cx(styles.han, styles.ganji)} style={{ color: elementTone(branchEl).color }}>{branchHanja(p?.j)}</span>
                <span className={styles.ganjiEl}>{branchEl ? copy.elements[branchEl] : copy.unclassified}</span>
              </>
            ) : (
              <span className={styles.ganjiEmpty} aria-hidden="true">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 점수 레이더(6축, 0..1). 여러 이름을 겹쳐 비교할 수 있다 ── */

export interface RadarSeries { key: string; label: string; scores: Partial<Record<V2ScoreKey, number>>; color: string }

/** 비교 계열은 색 말고 선 모양으로도 갈린다(실선 → 긴 점선 → 짧은 점선). 범례도 같은 선을 그린다. */
const RADAR_DASH: Array<string | undefined> = [undefined, "6 4", "2 3"];

export function ScoreRadar({ copy, series }: { copy: NamingV2Copy; series: RadarSeries[] }) {
  const CX = 170;
  const CY = 146;
  const R = 92;
  const angle = (k: number) => ((-90 + 60 * k) * Math.PI) / 180;
  const at = (k: number, v: number) => ({ x: r1(CX + R * v * Math.cos(angle(k))), y: r1(CY + R * v * Math.sin(angle(k))) });
  const clamp = (v: number | undefined) => Math.max(0, Math.min(1, Number(v) || 0));
  const ring = (v: number) => V2_SCORE_KEYS.map((_, k) => { const p = at(k, v); return `${p.x},${p.y}`; }).join(" ");
  const single = series.length === 1 ? series[0] : null;
  const label = series.map((s) => `${s.label}: ${V2_SCORE_KEYS.map((key) => `${copy.scores[key]} ${Math.round(clamp(s.scores[key]) * 100)}`).join(", ")}`).join(" / ");
  return (
    <figure className={styles.figure}>
      <svg viewBox="0 0 340 292" className={styles.art} role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" strokeWidth="1" style={{ stroke: v === 1 ? "var(--nv2-gold-line)" : "var(--nv2-gold-faint)" }} />
        ))}
        {V2_SCORE_KEYS.map((key, k) => { const p = at(k, 1); return <line key={key} x1={CX} y1={CY} x2={p.x} y2={p.y} strokeWidth="1" style={{ stroke: "var(--nv2-gold-faint)" }} />; })}
        {series.map((s, n) => (
          <g key={s.key}>
            <polygon points={V2_SCORE_KEYS.map((key, k) => { const p = at(k, clamp(s.scores[key])); return `${p.x},${p.y}`; }).join(" ")} strokeWidth="2" strokeLinejoin="round" strokeDasharray={RADAR_DASH[n]} style={{ fill: s.color, fillOpacity: n > 0 ? 0.08 : 0.16, stroke: s.color }} />
            {V2_SCORE_KEYS.map((key, k) => { const p = at(k, clamp(s.scores[key])); return <circle key={key} cx={p.x} cy={p.y} r="3" style={{ fill: s.color }} />; })}
          </g>
        ))}
        {V2_SCORE_KEYS.map((key, k) => {
          const p = at(k, 1.17);
          const c = Math.cos(angle(k));
          const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
          const dy = Math.sin(angle(k)) < -0.5 ? -6 : Math.sin(angle(k)) > 0.5 ? 10 : 0;
          return (
            <text key={key} x={p.x} y={r1(p.y + dy)} textAnchor={anchor} fontSize="12" style={{ fill: "var(--nv2-ink-soft)" }}>
              {copy.scores[key]}
              {single ? <tspan style={{ fill: "var(--nv2-accent)", fontWeight: 700 }}>{` ${Math.round(clamp(single.scores[key]) * 100)}`}</tspan> : null}
            </text>
          );
        })}
      </svg>
      {series.length > 1 ? (
        <div className={styles.legend}>
          {series.map((s, n) => (
            <span key={s.key} className={styles.legendItem}><svg width="26" height="10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" strokeWidth="2.4" strokeDasharray={RADAR_DASH[n]} style={{ stroke: s.color }} /></svg>{s.label}</span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}

/* ── A6 소리오행 흐름: 상생 금선, 상극 붉은 끊긴 선, 비화 옅은 선 ── */

export function SoundLine({ copy, syllables, elements, relations }: {
  copy: NamingV2Copy;
  syllables: string[];
  elements: V2Element[];
  relations: V2Relation[];
}) {
  const uid = safeId(useId());
  const n = elements.length;
  if (!n) return null;
  const showSyllables = syllables.length === n;
  const GAP = 104;
  const NR = 28;
  const Y = 58;
  const W = 88 + (n - 1) * GAP;
  const x = (k: number) => 44 + k * GAP;
  const label = elements.map((el, k) => `${showSyllables ? syllables[k] : ""} ${copy.elements[el]}${k < relations.length ? ` — ${copy.relations[relations[k]]} —` : ""}`).join(" ");
  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} 124`} className={styles.art} style={{ maxWidth: W * 1.35 }} role="img" aria-label={label}>
        <defs>
          <Arrow id={`${uid}g`} tone="var(--nv2-good)" />
        </defs>
        {relations.slice(0, n - 1).map((rel, k) => {
          const x1 = x(k) + NR + 5;
          const x2 = x(k + 1) - NR - (rel === "generate" ? 9 : 5);
          const tone = RELATION_TONE[rel];
          return (
            <g key={k}>
              {rel === "control" ? (
                <>
                  <line x1={x1} y1={Y} x2={r1((x1 + x2) / 2 - 5)} y2={Y} strokeWidth="2.2" strokeDasharray="6 5" className={styles.flow} style={{ stroke: tone }} />
                  <line x1={r1((x1 + x2) / 2 + 5)} y1={Y} x2={x2} y2={Y} strokeWidth="2.2" strokeDasharray="6 5" className={styles.flow} style={{ stroke: tone }} />
                </>
              ) : (
                <line x1={x1} y1={Y} x2={x2} y2={Y} strokeWidth={rel === "generate" ? 2.4 : 1.5} markerEnd={rel === "generate" ? `url(#${uid}g)` : undefined} style={{ stroke: tone }} />
              )}
              <text x={r1((x(k) + x(k + 1)) / 2)} y={Y - 12} textAnchor="middle" fontSize="12" style={{ fill: tone, fontWeight: 600 }}>{copy.relations[rel]}</text>
            </g>
          );
        })}
        {elements.map((el, k) => {
          const tone = elementTone(el);
          return (
            <g key={k}>
              <circle cx={x(k)} cy={Y} r={NR} strokeWidth="1.6" style={{ fill: "var(--nv2-surface)", stroke: tone.color }} />
              <circle cx={x(k)} cy={Y} r={NR} style={{ fill: tone.soft }} />
              <text x={x(k)} y={Y} dominantBaseline="central" textAnchor="middle" fontSize="21" style={{ fill: "var(--nv2-ink)", fontWeight: 700 }}>
                {showSyllables ? syllables[k] : tone.hanja}
              </text>
              <text x={x(k)} y={Y + NR + 18} textAnchor="middle" fontSize="12.5" style={{ fill: tone.color, fontWeight: 600 }}>{copy.elements[el]}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>{copy.soundCaption}</figcaption>
    </figure>
  );
}

/* ── A4 원형이정 네 기둥 ── */

function formulaLabel(label: string, surnameHanja: string, nameChars: string[]): string {
  if (label === "姓" || label === "姓合") return surnameHanja;
  const m = /^名(\d)$/.exec(label);
  return m ? nameChars[Number(m[1]) - 1] || label : label;
}

export function GridPillars({ copy, candidate, surnameHanja }: { copy: NamingV2Copy; candidate: V2Candidate; surnameHanja: string }) {
  const nameChars = candidate.chars.map((c) => c.ch);
  return (
    <div className={styles.pillars}>
      {V2_GRIDS.map((grid) => {
        const value = candidate.grids[grid];
        const grade = candidate.grades[grid];
        const formula = gridFormula(candidate, grid);
        const suri = suriElement(value);
        return (
          <div key={grid} className={styles.pillar} style={{ borderColor: grade === "good" ? "var(--nv2-gold-line)" : undefined }}>
            <span className={styles.pillarRoof} aria-hidden="true">
              <svg className={styles.fill} viewBox="0 0 120 22" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M2 20C24 18 40 10 60 3C80 10 96 18 118 20" fill="none" strokeWidth="1.4" style={{ stroke: "var(--nv2-ornament)" }} />
                <path d="M14 20h92" strokeWidth="1" style={{ stroke: "var(--nv2-gold-line)" }} />
              </svg>
            </span>
            <span className={cx(styles.han, styles.pillarHan)}>{copy.grids[grid].han}</span>
            <span className={styles.pillarName}>{copy.grids[grid].name} · {copy.grids[grid].period}</span>
            <span className={styles.pillarValue}>{value}</span>
            <GradeBadge copy={copy} grade={grade} />
            {formula ? (
              <span className={styles.formula}>
                {formula.parts.map((part, k) => (
                  <Fragment key={k}>
                    {k > 0 ? " + " : null}
                    <span className={styles.formulaTerm}>
                      <span className={styles.han}>{formulaLabel(formula.labels[k], surnameHanja, nameChars)}</span>
                      {part}
                    </span>
                  </Fragment>
                ))}
              </span>
            ) : null}
            <span className={styles.pillarSuri}>{copy.suriElementLabel} <ElementChip copy={copy} element={suri} /></span>
          </div>
        );
      })}
    </div>
  );
}

/* ── A5 삼재 세 층(천·인·지) ── */

export function SamjaeTiers({ copy, samjae }: { copy: NamingV2Copy; samjae: V2Candidate["samjae"] }) {
  const tiers = [
    { key: "heaven" as const, value: samjae.heaven, element: samjae.combo[0] },
    { key: "human" as const, value: samjae.human, element: samjae.combo[1] },
    { key: "earth" as const, value: samjae.earth, element: samjae.combo[2] },
  ];
  return (
    <div className={styles.tiers}>
      {tiers.map((tier, k) => {
        const tone = elementTone(tier.element || null);
        const next = tiers[k + 1];
        const rel = next && tier.element && next.element ? relationOf(tier.element, next.element) : null;
        return (
          <div key={tier.key} className={styles.tierWrap}>
            <div className={styles.tier} style={{ width: `${70 + k * 15}%`, borderColor: tone.color, background: tone.soft }}>
              <span className={styles.tierName}>{copy.samjaeTiers[tier.key]}</span>
              <span className={styles.tierValue}>{tier.value}</span>
              <ElementChip copy={copy} element={tier.element || null} />
            </div>
            {rel ? (
              <span className={styles.tierLink} style={{ color: RELATION_TONE[rel] }}>
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M6 1v9M2 7l4 5 4-5" fill="none" strokeWidth="1.6" strokeLinecap="round" style={{ stroke: "currentColor" }} /></svg>
                {copy.relations[rel]}
              </span>
            ) : null}
          </div>
        );
      })}
      <div className={styles.tierFoot}>
        <GradeBadge copy={copy} grade={samjae.grade} />
        <span className={styles.caption}>{copy.samjaeReference}{samjae.disputed ? ` ${copy.samjaeDisputed}` : ""}</span>
      </div>
    </div>
  );
}

/* ── A3 획수 카드: 큰 한자, 훈음, 획수(다섯씩 묶은 눈금), 부수, 자원오행 ── */

export interface StrokeCardChar {
  ch: string;
  hangul?: string;
  hun?: string | null;
  strokes: number;
  jawon?: V2Element | null;
  radical?: number;
  flags?: string[];
}

function Tally({ count }: { count: number }) {
  const groups = Math.floor(count / 5);
  const rest = count % 5;
  const marks: ReactNode[] = [];
  for (let g = 0; g < groups; g += 1) {
    const ox = g * 20;
    marks.push(
      <g key={`g${g}`}>
        {[0, 1, 2, 3].map((k) => <line key={k} x1={ox + 2 + k * 4} y1="2" x2={ox + 2 + k * 4} y2="16" />)}
        <line x1={ox} y1="13" x2={ox + 16} y2="5" />
      </g>,
    );
  }
  for (let k = 0; k < rest; k += 1) marks.push(<line key={`r${k}`} x1={groups * 20 + 2 + k * 4} y1="2" x2={groups * 20 + 2 + k * 4} y2="16" />);
  const width = groups * 20 + rest * 4 + 2;
  return (
    <svg className={styles.tally} width={width} height="18" viewBox={`0 0 ${width} 18`} aria-hidden="true" focusable="false" strokeWidth="1.4" strokeLinecap="round" style={{ stroke: "var(--nv2-ornament)" }}>
      {marks}
    </svg>
  );
}

export function StrokeCard({ copy, char, compact = false }: { copy: NamingV2Copy; char: StrokeCardChar; compact?: boolean }) {
  const rad = radicalChar(char.radical);
  const flags = (char.flags || []).filter((flag) => copy.flags[flag]);
  return (
    <div className={cx(styles.strokeCard, compact && styles.strokeCardCompact)}>
      <span className={cx(styles.han, styles.strokeHan)} lang="ko">{char.ch}</span>
      {char.hangul ? (
        <span className={styles.strokeHun}>
          <span className={styles.srOnly}>{copy.hunEumLabel} </span>
          <b>{char.hangul}</b>
          {compact ? null : <span className={styles.strokeHunText}>{char.hun || copy.noHun}</span>}
        </span>
      ) : null}
      <span className={styles.strokeCount}>
        <Tally count={char.strokes} />
        {copy.strokesUnit(char.strokes)}
      </span>
      {!compact && rad ? (
        <span className={styles.strokeMeta}>{copy.radicalLabel} <span className={styles.han}>{rad}</span> {char.radical}</span>
      ) : null}
      {!compact && char.jawon !== undefined ? (
        <span className={styles.strokeMeta}>{copy.jawonLabel} <ElementChip copy={copy} element={char.jawon || null} /></span>
      ) : null}
      {!compact && flags.length ? (
        <span className={styles.flagRow}>{flags.map((flag) => <span key={flag} className={styles.flag}>{copy.flags[flag]}</span>)}</span>
      ) : null}
    </div>
  );
}

/* ── 이미지 저장 보조 ── */

const SVG_PAINT_PROPS = ["fill", "stroke", "stop-color"];
const SVG_TEXT_PROPS = ["font-family", "font-weight"];

/**
 * html-to-image 1.11 은 <svg> 를 통째로 복제하고 자식에는 계산된 스타일을 넣지 않는다(clone-node cloneChildren 이 svg 에서 멈춤).
 * 그래서 style 의 var(--nv2-*) 칠이 풀리지 않아 검정으로 떨어지고, 클래스로 준 한자 글꼴도 빠진다.
 * 캡처 직전에 계산값을 인라인으로 박고, 돌려준 함수로 바꾼 속성만 되돌린다. (PDF 의 html2canvas 는 SVG 계산 스타일을 스스로 복사한다)
 */
export function inlineSvgPaint(root: Element): () => void {
  const undo: Array<() => void> = [];
  root.querySelectorAll("svg *").forEach((node) => {
    if (!(node instanceof SVGElement)) return;
    const computed = window.getComputedStyle(node);
    const props = SVG_PAINT_PROPS.filter((prop) => node.style.getPropertyValue(prop).includes("var("));
    if (node instanceof SVGTextContentElement) props.push(...SVG_TEXT_PROPS);
    for (const prop of props) {
      const before = node.style.getPropertyValue(prop);
      const priority = node.style.getPropertyPriority(prop);
      node.style.setProperty(prop, computed.getPropertyValue(prop));
      undo.push(() => (before ? node.style.setProperty(prop, before, priority) : node.style.removeProperty(prop)));
    }
  });
  return () => {
    for (const restore of undo.reverse()) restore();
  };
}
