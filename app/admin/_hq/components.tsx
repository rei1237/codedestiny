"use client";

// 별빛 운영본부 공용 부품. 버튼·입력은 _components/ui.ts(adminButton 계열)를 그대로 쓰고 여기서는 다시 만들지 않는다.
// 🔴 상태는 색만으로 전하지 않는다 — StatusBadge 가 아이콘과 문구를 항상 함께 붙인다.
// 🔴 이미지는 글자를 막지 않는다 — 고정 비율 + loading="lazy", 실패하면 그냥 숨긴다.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  PlugZap,
  Sparkles,
  X,
} from "lucide-react";
import { ADMIN_CARD, ADMIN_CARD_HAIR, adminButton } from "../_components/ui";
import { HQ_ART, RANK_EMBLEM_ART, type HqArtItem } from "./art";
import { formatNumber, formatXp } from "./format";
import type { Tone, XpState } from "./types";

const TONE_ICON: Record<Tone, typeof Info> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  err: AlertOctagon,
  info: Info,
  muted: CircleDashed,
  accent: Sparkles,
};

export function StatusBadge({ tone, label, title }: { tone: Tone; label: string; title?: string }) {
  const Icon = TONE_ICON[tone] || Info;
  return (
    <span className="cd-hq-badge" data-tone={tone} title={title}>
      <Icon aria-hidden="true" size={13} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/** 화면 머리말 — 게임식 이름과 실제 기능명을 항상 함께 쓴다. */
export function HqPageHeader({
  game,
  label,
  description,
  actions,
}: {
  game: string;
  label: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="cd-adm-brand cd-hq-quiet text-[13px]">{game}</p>
        <h1 className="mt-0.5 text-xl font-bold leading-tight text-[var(--cd-adm-ink)] sm:text-2xl">{label}</h1>
        {description ? <p className="cd-hq-quiet mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function HqPanel({
  title,
  game,
  action,
  children,
  hair = false,
  className = "",
  bodyClassName = "p-4",
  id,
}: {
  title?: React.ReactNode;
  game?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  hair?: boolean;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={`${ADMIN_CARD}${hair ? ` ${ADMIN_CARD_HAIR}` : ""} rounded-[var(--cd-adm-radius-lg)] ${className}`}
    >
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cd-adm-line)] px-4 py-3">
          <h2 id={headingId} className="text-[15px] font-semibold text-[var(--cd-adm-ink)]">
            {title}
            {game ? <span className="cd-hq-quiet ml-2 text-[12px] font-normal">{game}</span> : null}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone,
  badge,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  badge?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="cd-hq-panel2 flex min-h-[104px] flex-col justify-between gap-2 rounded-[var(--cd-adm-radius)] p-3" title={hint}>
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p className="cd-hq-quiet text-[13px] leading-snug [word-break:keep-all]">{label}</p>
        {badge}
      </div>
      <p className={`cd-hq-num text-xl font-bold leading-tight ${tone ? `cd-hq-tone-${tone}` : "text-[var(--cd-adm-ink)]"}`}>{value}</p>
      {sub ? <p className="cd-hq-quiet text-[12px] leading-snug">{sub}</p> : null}
    </div>
  );
}

export function XpBar({ state, compact = false }: { state: Pick<XpState, "level" | "title" | "intoLevel" | "needForNext" | "progress" | "totalXp">; compact?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, state.progress)) * 1000) / 10;
  return (
    <div className="min-w-0">
      {!compact ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="text-[var(--cd-adm-ink)]">
            <span className="cd-hq-num font-bold">Lv {state.level}</span> · {state.title}
          </span>
          <span className="cd-hq-num cd-hq-quiet">
            {formatNumber(state.intoLevel)} / {formatNumber(state.needForNext)} XP
          </span>
        </div>
      ) : null}
      <div
        className="cd-hq-xpbar"
        role="progressbar"
        aria-label={`운영 레벨 ${state.level} 진행률`}
        aria-valuemin={0}
        aria-valuemax={state.needForNext}
        aria-valuenow={state.intoLevel}
        aria-valuetext={`${pct}% · 다음 레벨까지 ${formatXp(state.needForNext - state.intoLevel)}`}
      >
        <div className="cd-hq-xpbar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LoadingBlock({ lines = 3, label = "불러오는 중" }: { lines?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="cd-hq-skeleton h-4" style={{ width: `${92 - index * 14}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  art,
  action,
}: {
  title: string;
  body?: React.ReactNode;
  art?: HqArtItem | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      {art ? <HqImage art={art} className="h-20 w-20 rounded-full object-cover" /> : <CircleDashed aria-hidden="true" className="cd-hq-quiet" size={28} />}
      <p className="text-[15px] font-semibold text-[var(--cd-adm-ink)]">{title}</p>
      {body ? <div className="cd-hq-quiet max-w-md text-sm">{body}</div> : null}
      {action}
    </div>
  );
}

/** 연동 대기 — 실제 값 0 과 다른 상태다. 숫자 0 을 그리지 않고 무엇이 비었는지와 연결 절차를 보여 준다. */
export function IntegrationPending({
  title,
  missing = [],
  steps = [],
  compact = false,
}: {
  title: string;
  missing?: string[];
  steps?: string[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-[var(--cd-adm-radius)] border border-dashed border-[var(--cd-adm-line-strong)] p-3">
      <div className="flex items-start gap-2">
        <PlugZap aria-hidden="true" size={18} className="cd-hq-tone-warn mt-0.5 flex-none" />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--cd-adm-ink)]">{title}</p>
            <StatusBadge tone="warn" label="연동 대기" />
          </div>
          <p className="cd-hq-quiet text-[13px]">아직 연결되지 않아 값을 0 으로 세지 않고 비워 둡니다. 이 출처의 XP 도 쌓이지 않습니다.</p>
          {missing.length ? (
            <p className="cd-hq-quiet text-[12px]">
              필요한 비밀값: {missing.map((name) => <code key={name} className="mx-0.5 rounded bg-[var(--cd-adm-field)] px-1 py-0.5 text-[var(--cd-adm-ink)]">{name}</code>)}
            </p>
          ) : null}
          {!compact && steps.length ? (
            <ol className="ml-4 list-decimal space-y-1 text-[13px] text-[var(--cd-adm-ink)]">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 키보드 화살표·Home·End 로 옮겨 다니는 탭(WAI-ARIA tabs). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string; icon?: typeof Info }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex overflow-x-auto border-b border-[var(--cd-adm-line)]">
      {items.map((item, index) => {
        const Icon = item.icon;
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="cd-hq-tab"
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {Icon ? <Icon aria-hidden="true" size={16} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** 오른쪽 드로어. Esc 로 닫고, 열릴 때 안으로 포커스를 옮기고, 닫히면 원래 자리로 돌려준다. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="overlay"
            className="cd-hq-overlay"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="cd-hq-drawer outline-none"
            initial={reduce ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--cd-adm-line)] px-4 py-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold leading-snug text-[var(--cd-adm-ink)]">{title}</h2>
                {subtitle ? <div className="cd-hq-quiet mt-1 text-[13px]">{subtitle}</div> : null}
              </div>
              <button type="button" className={`${adminButton("neutral")} min-h-[44px] min-w-[44px] px-0`} onClick={onClose} aria-label="닫기">
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
            {footer ? <footer className="border-t border-[var(--cd-adm-line)] px-4 py-3">{footer}</footer> : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/** 이미지는 고정 비율로 자리를 먼저 잡고, 못 불러오면 조용히 숨긴다. */
export function HqImage({ art, className = "", eager = false }: { art: HqArtItem; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art.src}
      alt={art.alt}
      width={art.width}
      height={art.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

const EMBLEM_LABELS = ["별빛 견습생 문장", "운명 기록가 문장", "별의 안내자 문장", "천체 설계자 문장", "운명 길드장 문장", "운명 길드장 · 사자 문장"];

/** 등급 문장 6단계. 그림이 없으면 단계별 꼭짓점 수가 다른 SVG 별 문장을 그린다. */
export function RankEmblem({ tier, size = 56 }: { tier: number; size?: number }) {
  const index = Math.max(0, Math.min(5, Math.floor(tier)));
  const art = RANK_EMBLEM_ART[index];
  const [failed, setFailed] = useState(false);
  if (art && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={art.src} alt={EMBLEM_LABELS[index]} width={size} height={size} loading="lazy" decoding="async" className="flex-none" onError={() => setFailed(true)} />
    );
  }
  const points = 4 + index;
  const outer = 22;
  const inner = 9 + index;
  const path = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    return `${(32 + radius * Math.cos(angle)).toFixed(2)},${(32 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={EMBLEM_LABELS[index]} className="flex-none">
      <circle cx="32" cy="32" r="29" fill="#1d2540" stroke="#c7a56a" strokeOpacity={0.35 + index * 0.1} strokeWidth="2" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#9a7bef" strokeOpacity="0.35" strokeWidth="1" />
      <polygon points={path} fill="#c7a56a" fillOpacity={0.55 + index * 0.08} stroke="#f4f0e7" strokeOpacity="0.5" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="3.2" fill="#f4f0e7" />
    </svg>
  );
}

/** 레벨업 연출 — 약 1초, 소리 없음. 동작 줄이기 설정이면 움직임 없이 문구만 보여 준다. 확인은 서버 ackLevel 로 남긴다. */
export function LevelUpBurst({
  from,
  to,
  title,
  onClose,
}: {
  from: number;
  to: number;
  title: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const onKey = useCallback((event: React.KeyboardEvent) => { if (event.key === "Escape") onClose(); }, [onClose]);
  return (
    <div className="cd-hq-overlay flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`레벨 ${to} 달성`} onKeyDown={onKey}>
      <motion.div
        className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} relative w-full max-w-sm rounded-[var(--cd-adm-radius-lg)] p-6 text-center`}
        initial={reduce ? false : { scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {!reduce ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: "0 0 0 2px rgba(199,165,106,0.7), 0 0 48px rgba(154,123,239,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4] }}
            transition={{ duration: 1, times: [0, 0.4, 1] }}
          />
        ) : null}
        <HqImage art={HQ_ART.yeongnyangiCelebrate} className="mx-auto h-24 w-auto" eager />
        <p className="cd-adm-brand cd-hq-quiet mt-3 text-[13px]">운영 레벨 상승</p>
        <p className="cd-hq-num mt-1 text-2xl font-bold text-[var(--cd-adm-ink)]">Lv {from} → Lv {to}</p>
        <p className="mt-1 text-sm text-[var(--cd-adm-ink)]">{title}</p>
        <p className="cd-hq-quiet mt-2 text-[12px]">검증된 작업·매출·참여로만 오른 운영 XP 입니다. 고객 월정석·이용권과는 무관합니다.</p>
        <button ref={closeRef} type="button" className={`${adminButton("primary", { size: "lg" })} mt-5 w-full`} onClick={onClose}>
          확인
        </button>
      </motion.div>
    </div>
  );
}

/** 변경 결과 안내(스크린리더에도 읽힌다). */
export function HqNotice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = TONE_ICON[tone] || Info;
  return (
    <p role={tone === "err" ? "alert" : "status"} className={`flex items-start gap-2 rounded-[var(--cd-adm-radius)] border border-[var(--cd-adm-line)] bg-[var(--cd-adm-field)] px-3 py-2 text-[13px] cd-hq-tone-${tone}`}>
      <Icon aria-hidden="true" size={15} className="mt-0.5 flex-none" />
      <span className="text-[var(--cd-adm-ink)]">{children}</span>
    </p>
  );
}

/** 캐릭터 한 줄 안내 — 그림은 장식(alt 는 이름만), 글이 본문이다. */
export function KeeperLine({ art, name, children }: { art: HqArtItem; name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <HqImage art={art} className="h-11 w-11 flex-none rounded-full border border-[var(--cd-adm-line)] bg-[var(--cd-adm-panel-2)] object-cover object-top" />
      <div className="min-w-0 text-sm">
        <p className="cd-hq-quiet text-[12px]">{name}</p>
        <div className="text-[var(--cd-adm-ink)]">{children}</div>
      </div>
    </div>
  );
}
