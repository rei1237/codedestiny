"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  AFFIRMATION_CATEGORIES,
  getDailyLockScreenContent,
  getDailyLockScreenSequence,
  getKstDateKey,
  type LockScreenCard,
  type LockScreenContent,
} from "@/lib/lock-screen-content";
import {
  DAILY_FORTUNE_SYSTEMS,
  getDailyFortune,
  type DailyFortune,
  type DailyFortuneSystem,
} from "@/lib/lock-screen-daily-fortune";
import { readAiProfileSeed } from "../_lib/ai-prefill-seed";
import { isMobileAppRuntime } from "../_lib/auth-client";

// ── 꽃돼지(연이) 마스코트 — R1: 앱 번들 로컬 '단일 컷' 이미지(오프라인 동작) ──
// (기존 R2 CDN URL은 화면 켜지는 순간 네트워크가 없어 404. flower-pig-5-*는 스프라이트 시트라
//  통짜로 나오던 문제 → 잘라진 단일 캐릭터(꽃돼지-Photoroom·꽃돼지2-Photoroom)를 ASCII로 복사해 사용.)
const PIG_FALLBACK = "/images/fortune-tea-house/flower-pig-single-a.webp";
const PIG_POSES: readonly { key: string; label: string; url: string }[] = [
  { key: "pig1", label: "방긋", url: "/images/fortune-tea-house/flower-pig-single-a.webp" },
  { key: "pig2", label: "생글", url: "/images/fortune-tea-house/flower-pig-single-b.webp" },
];

const FONT_COLORS: readonly { key: string; label: string; hex: string }[] = [
  { key: "white", label: "화이트", hex: "#ffffff" },
  { key: "ink", label: "먹빛", hex: "#20143a" },
  { key: "gold", label: "샴페인 골드", hex: "#f6e4ad" },
];

const BACKGROUNDS: readonly { key: string; label: string; css: string; dark: boolean }[] = [
  { key: "twilight", label: "트와일라잇", css: "radial-gradient(circle at 22% 12%,rgba(140,120,255,.5),transparent 46%),radial-gradient(circle at 82% 22%,rgba(37,99,235,.42),transparent 44%),linear-gradient(160deg,#0b1225,#1b1745 58%,#2f0a4f)", dark: true },
  { key: "midnight", label: "미드나잇", css: "radial-gradient(circle at 78% 14%,rgba(196,181,253,.34),transparent 40%),linear-gradient(160deg,#07060f,#13102a 60%,#241a44)", dark: true },
  { key: "rose", label: "로즈 나이트", css: "radial-gradient(circle at 80% 12%,rgba(244,190,209,.4),transparent 40%),linear-gradient(160deg,#24081a,#3a0e28 58%,#521a3a)", dark: true },
  { key: "lavender", label: "라벤더 잉크", css: "radial-gradient(circle at 80% 12%,rgba(255,255,255,.5),transparent 34%),linear-gradient(160deg,#efe6fb,#cbb6f2 55%,#b79ee8)", dark: false },
  { key: "bluemist", label: "블루 미스트", css: "radial-gradient(circle at 78% 14%,rgba(255,255,255,.55),transparent 32%),linear-gradient(160deg,#dcefff,#bcd6f5 55%,#a9c6ef)", dark: false },
  { key: "cream", label: "연이 크림", css: "radial-gradient(circle at 80% 10%,rgba(255,255,255,.6),transparent 34%),linear-gradient(160deg,#fffaf7,#fff2f8 55%,#f4dbe6)", dark: false },
];

const BUTTON_STYLES: readonly { key: string; label: string }[] = [
  { key: "glass", label: "글래스" },
  { key: "solid", label: "솔리드" },
  { key: "gold", label: "골드" },
  { key: "neon", label: "네온" },
];

function pillStyle(key: string, dark: boolean): CSSProperties {
  switch (key) {
    case "solid":
      return { background: dark ? "rgba(196,181,253,.92)" : "rgba(124,58,237,.94)", color: dark ? "#1a1230" : "#fff", border: "1px solid rgba(196,181,253,.5)" };
    case "gold":
      return { background: "linear-gradient(135deg,#f6e4ad,#e8c977)", color: "#3a2a10", border: "1px solid rgba(246,228,173,.75)", boxShadow: "0 8px 26px -10px rgba(232,201,119,.7)" };
    case "neon":
      return { background: "rgba(8,10,26,.5)", color: "#c4f5ff", border: "1.5px solid #67e8f9", boxShadow: "0 0 20px rgba(103,232,249,.5),inset 0 0 12px rgba(103,232,249,.2)" };
    case "glass":
    default:
      return { background: dark ? "rgba(255,255,255,.17)" : "rgba(20,16,40,.14)", color: dark ? "#fff" : "#20143a", border: "1px solid rgba(255,255,255,.25)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };
  }
}

// ── 설정/상태 타입 ─────────────────────────────────────────────
interface AlarmSlot { on: boolean; time: string; label: string }
interface LockPrefs {
  enabled: boolean;
  fontColorKey: string;
  fontScale: number;
  backgroundKey: string;
  buttonStyleKey: string;
  pigPoseKey: string;
  changeOnLaunch: boolean;
  affirmationCats: string[]; // 듣고 싶은 확언 분야(비어 있으면 전체)
  dailyFortuneSystem: DailyFortuneSystem; // 오늘의 운세 점술 선택
  alarms: AlarmSlot[];
}
interface LockStats { todayKey: string; todayRead: number; totalRead: number }
interface ReadItem { dateKey: string; text: string; at: number }
interface LockState { prefs: LockPrefs; stats: LockStats; read: ReadItem[] }

const DEFAULT_STATE: LockState = {
  prefs: {
    enabled: true,
    fontColorKey: "white",
    fontScale: 1,
    backgroundKey: "twilight",
    buttonStyleKey: "glass",
    pigPoseKey: "pig1",
    changeOnLaunch: true,
    affirmationCats: [],
    dailyFortuneSystem: "sukuyo",
    alarms: [
      { on: true, time: "09:00", label: "오늘의 꽃" },
      { on: true, time: "15:00", label: "감정상담소" },
    ],
  },
  stats: { todayKey: "", todayRead: 0, totalRead: 0 },
  read: [],
};

const STORAGE_KEY = "cd_lockscreen_state_v1";
const DAILY_SYSTEM_KEYS = DAILY_FORTUNE_SYSTEMS.map((s) => s.key) as DailyFortuneSystem[];

type LockNativePlugin = {
  getState?: () => Promise<{ value?: string }>;
  setState?: (opts: { value: string }) => Promise<void>;
  dismiss?: () => Promise<void>;
  setEnabled?: (opts: { enabled: boolean }) => Promise<void>;
  requestOverlayPermission?: () => Promise<void>;
  scheduleAlarms?: (opts: { value: string }) => Promise<void>;
};

function nativeLock(): LockNativePlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const plugin = cap?.Plugins?.CodeDestinyLockScreen;
  return plugin ? (plugin as LockNativePlugin) : null;
}

function mergeState(raw: unknown): LockState {
  const base: LockState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<LockState>;
  if (obj.prefs && typeof obj.prefs === "object") {
    base.prefs = { ...base.prefs, ...obj.prefs };
    if (!Array.isArray(base.prefs.alarms) || base.prefs.alarms.length < 2) base.prefs.alarms = DEFAULT_STATE.prefs.alarms;
    if (!Array.isArray(base.prefs.affirmationCats)) base.prefs.affirmationCats = [];
    if (!DAILY_SYSTEM_KEYS.includes(base.prefs.dailyFortuneSystem)) base.prefs.dailyFortuneSystem = "sukuyo";
  }
  if (obj.stats && typeof obj.stats === "object") base.stats = { ...base.stats, ...obj.stats };
  if (Array.isArray(obj.read)) base.read = obj.read.slice(0, 200);
  return base;
}

async function loadState(): Promise<LockState> {
  const plugin = nativeLock();
  if (plugin?.getState) {
    try {
      const r = await plugin.getState();
      if (r && r.value) return mergeState(JSON.parse(r.value));
    } catch {
      /* fall through */
    }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeState(JSON.parse(raw));
  } catch {
    /* noop */
  }
  return mergeState(null);
}

async function persistState(state: LockState) {
  const json = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* noop */
  }
  const plugin = nativeLock();
  if (plugin?.setState) {
    try {
      await plugin.setState({ value: json });
    } catch {
      /* noop */
    }
  }
}

async function pushAlarmsToNative(prefs: LockPrefs) {
  const plugin = nativeLock();
  if (plugin?.scheduleAlarms) {
    try {
      await plugin.scheduleAlarms({ value: JSON.stringify({ enabled: prefs.enabled, alarms: prefs.alarms }) });
    } catch {
      /* noop */
    }
  }
}

// 잠금화면 첫 진입 시, 기본 ON을 실제 네이티브에도 1회 반영(설정 미진입 사용자 보조).
const NATIVE_DEFAULT_ON_MARK = "cd_lockscreen_native_default_on_v1";
function seedNativeDefaultOn(prefs: LockPrefs) {
  try {
    if (window.localStorage.getItem(NATIVE_DEFAULT_ON_MARK) === "1") return;
    const plugin = nativeLock();
    if (!plugin?.setEnabled) return;
    window.localStorage.setItem(NATIVE_DEFAULT_ON_MARK, "1");
    if (prefs.enabled) {
      void plugin.setEnabled({ enabled: true });
      if (plugin.requestOverlayPermission) void plugin.requestOverlayPermission();
    }
  } catch {
    /* noop */
  }
}

// ── 페이저 카드: 오늘의 운세 + 변주 시퀀스(R6) ────────────────
type PagerCard = { type: "daily" } | { type: "seq"; card: LockScreenCard };
type Sheet = "none" | "settings" | "theme" | "alarms" | "readlist";

export default function LockScreenFortuneClient() {
  // D-1: 웹에서는 의미 없으므로 노출하지 않는다(앱/네이티브 잠금화면 WebView만 통과).
  const [runtimeOk, setRuntimeOk] = useState<boolean | null>(null);
  const [state, setState] = useState<LockState | null>(null);
  const [content, setContent] = useState<LockScreenContent | null>(null);
  const [birth, setBirth] = useState<{ birthDate?: string; birthTime?: string }>({});
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [dismissed, setDismissed] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const readMarkedRef = useRef(false);
  const slideStartRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileAppRuntime()) {
      setRuntimeOk(false);
      try { window.location.replace("/"); } catch { /* noop */ }
      return;
    }
    setRuntimeOk(true);
  }, []);

  useEffect(() => {
    if (runtimeOk !== true) return;
    let alive = true;
    (async () => {
      const loaded = await loadState();
      if (!alive) return;
      const now = new Date();
      const todayKey = getKstDateKey(now);
      if (loaded.stats.todayKey !== todayKey) {
        loaded.stats.todayKey = todayKey;
        loaded.stats.todayRead = 0;
      }
      setState(loaded);
      setContent(getDailyLockScreenContent(now, loaded.prefs.affirmationCats));
      try { const seed = readAiProfileSeed(); setBirth({ birthDate: seed.birthDate, birthTime: seed.birthTime }); } catch { /* noop */ }
      seedNativeDefaultOn(loaded.prefs); // R2 보조: 기본 ON을 네이티브에 1회 반영
    })();
    return () => {
      alive = false;
    };
  }, [runtimeOk]);

  const affirmationCatsKey = state?.prefs.affirmationCats.join(",") ?? "";
  useEffect(() => {
    if (runtimeOk !== true || !state) return;
    setContent(getDailyLockScreenContent(new Date(), state.prefs.affirmationCats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affirmationCatsKey]);

  const dailySystem = state?.prefs.dailyFortuneSystem ?? "sukuyo";
  const dailyFortune: DailyFortune | null = useMemo(() => {
    if (!content) return null;
    return getDailyFortune(dailySystem, birth, new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailySystem, birth.birthDate, birth.birthTime, content?.dateKey]);

  const pagerCards: PagerCard[] = useMemo(() => {
    if (!content) return [{ type: "daily" }];
    const seq = getDailyLockScreenSequence(new Date(), state?.prefs.affirmationCats);
    const out: PagerCard[] = [{ type: "daily" }];
    seq.forEach((card) => out.push({ type: "seq", card }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.dateKey, affirmationCatsKey]);

  useEffect(() => {
    if (!state || !content || readMarkedRef.current) return;
    readMarkedRef.current = true;
    setState((prev) => {
      if (!prev) return prev;
      const already = prev.read.some((r) => r.dateKey === content.dateKey);
      const next: LockState = {
        ...prev,
        stats: { ...prev.stats, todayRead: prev.stats.todayRead + 1, totalRead: prev.stats.totalRead + 1 },
        read: already ? prev.read : [{ dateKey: content.dateKey, text: content.affirmation, at: Date.now() }, ...prev.read].slice(0, 200),
      };
      void persistState(next);
      return next;
    });
  }, [state, content]);

  const updatePrefs = useCallback((patch: Partial<LockPrefs>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: LockState = { ...prev, prefs: { ...prev.prefs, ...patch } };
      void persistState(next);
      if ("enabled" in patch) {
        const plugin = nativeLock();
        if (plugin?.setEnabled) void plugin.setEnabled({ enabled: next.prefs.enabled });
        if (next.prefs.enabled && plugin?.requestOverlayPermission) void plugin.requestOverlayPermission();
      }
      if ("alarms" in patch || "enabled" in patch) void pushAlarmsToNative(next.prefs);
      return next;
    });
  }, []);

  const updateAlarm = useCallback((idx: number, patch: Partial<AlarmSlot>) => {
    setState((prev) => {
      if (!prev) return prev;
      const alarms = prev.prefs.alarms.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      const next: LockState = { ...prev, prefs: { ...prev.prefs, alarms } };
      void persistState(next);
      void pushAlarmsToNative(next.prefs);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    const plugin = nativeLock();
    if (plugin?.dismiss) void plugin.dismiss();
  }, []);

  // D-5: 오른쪽으로 밀어서 잠금 해제(YESSI형 slide-to-unlock).
  const onSlideStart = (e: ReactTouchEvent) => {
    slideStartRef.current = e.touches[0]?.clientX ?? null;
  };
  const onSlideMove = (e: ReactTouchEvent) => {
    if (slideStartRef.current == null) return;
    const delta = (e.touches[0]?.clientX ?? slideStartRef.current) - slideStartRef.current;
    const track = trackRef.current?.offsetWidth ?? 260;
    const max = Math.max(120, track - 78);
    setSlideX(Math.max(0, Math.min(delta, max)));
  };
  const onSlideEnd = () => {
    const track = trackRef.current?.offsetWidth ?? 260;
    const max = Math.max(120, track - 78);
    if (slideX >= max * 0.78) dismiss();
    setSlideX(0);
    slideStartRef.current = null;
  };

  const bg = useMemo(() => BACKGROUNDS.find((b) => b.key === state?.prefs.backgroundKey) || BACKGROUNDS[0], [state?.prefs.backgroundKey]);
  const fontColor = useMemo(() => (FONT_COLORS.find((c) => c.key === state?.prefs.fontColorKey) || FONT_COLORS[0]).hex, [state?.prefs.fontColorKey]);
  const pig = useMemo(() => PIG_POSES.find((p) => p.key === state?.prefs.pigPoseKey) || PIG_POSES[0], [state?.prefs.pigPoseKey]);
  const scale = state?.prefs.fontScale ?? 1;
  const subColor = bg.dark ? "rgba(255,255,255,.74)" : "rgba(20,16,40,.66)";
  const chipBg = bg.dark ? "rgba(255,255,255,.14)" : "rgba(20,16,40,.1)";
  const panelBg = bg.dark ? "rgba(10,10,26,.55)" : "rgba(255,255,255,.6)";

  const onPigError = (e: { currentTarget: HTMLImageElement }) => {
    const t = e.currentTarget;
    if (t.src.indexOf(PIG_FALLBACK) < 0) t.src = PIG_FALLBACK;
  };

  if (runtimeOk !== true || !state || !content) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0b1225] text-slate-300">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-fuchsia-300" aria-hidden />
      </main>
    );
  }

  if (dismissed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: bg.css, color: fontColor }}>
        <img src={pig.url} onError={onPigError} alt="" width={96} height={96} className="h-24 w-24 object-contain drop-shadow-lg" />
        <p className="text-lg font-black">{content.greeting}</p>
        <button type="button" onClick={() => setDismissed(false)} className="rounded-full px-5 py-2.5 text-sm font-bold" style={pillStyle(state.prefs.buttonStyleKey, bg.dark)}>
          잠금화면 다시 보기
        </button>
      </main>
    );
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  const timeLabel = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const total = pagerCards.length;
  const idx = ((page % total) + total) % total;
  const current = pagerCards[idx];
  const nextPage = () => setPage((p) => p + 1);

  const slideMax = Math.max(120, (trackRef.current?.offsetWidth ?? 260) - 78);
  const slideProgress = Math.min(1, slideX / (slideMax || 1));

  return (
    <main className="relative min-h-[100dvh] overflow-hidden select-none" style={{ background: bg.css, color: fontColor }}>
      {/* 상단: 시간/날짜 + 설정(뒤로가기·홈 네비는 AppChrome self-managed로 숨김) */}
      <div className="flex items-start justify-between px-5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}>
        <div>
          <p className="font-black leading-none tracking-tight" style={{ fontSize: `calc(2.7rem * ${scale})` }}>{timeLabel}</p>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: subColor }}>{dateLabel}</p>
        </div>
        <button type="button" aria-label="잠금화면 설정" onClick={() => setSheet("settings")} className="mt-1 grid h-11 w-11 place-items-center rounded-full text-lg" style={{ background: chipBg }}>⚙️</button>
      </div>

      {/* 본문: 탭하면 다음 카드(변주) + 꽃돼지 마스코트 */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-44 pt-5 text-center" role="button" tabIndex={0} onClick={nextPage} aria-label="다음 문장 보기">
        <div className="relative mb-3 h-24 w-24">
          <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle,rgba(255,255,255,.28),transparent 68%)" }} aria-hidden />
          <img src={pig.url} onError={onPigError} alt="" width={96} height={96} className="cd-lock-float relative h-24 w-24 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,.28)]" />
        </div>

        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: chipBg }}>✨ {content.header}</span>

        {/* F-4: 오늘의 꽃말은 페이저가 아니라 화면에 항상 고정 노출(날마다 변주) */}
        <span className="mb-4 inline-flex max-w-[23rem] items-center justify-center gap-1 rounded-full px-3.5 py-1.5 text-center text-xs font-bold leading-snug" style={{ background: chipBg, color: subColor }}>
          🌸 오늘의 꽃 · {content.flower.name} — {content.flower.meaning}
        </span>

        {/* 카드 영역 — 탭마다 새 카드, 부드러운 전환 */}
        <div key={idx} className="cd-lock-card flex min-h-[10.5rem] w-full max-w-[23rem] flex-col items-center justify-center">
          {current.type === "daily" ? (
            <DailyFortuneCard fortune={dailyFortune} system={dailySystem} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} onPick={(k) => updatePrefs({ dailyFortuneSystem: k })} />
          ) : (
            <SeqCard card={current.card} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} />
          )}
        </div>

        {/* 진행 표시(슬림 바) + 힌트 */}
        <div className="mt-5 h-1 w-40 overflow-hidden rounded-full" style={{ background: bg.dark ? "rgba(255,255,255,.16)" : "rgba(20,16,40,.14)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((idx + 1) / total) * 100}%`, background: fontColor, opacity: 0.75 }} />
        </div>
        <p className="mt-2 text-[0.72rem] font-semibold" style={{ color: subColor }}>화면을 탭하면 다음 이야기 ({idx + 1}/{total})</p>
      </div>

      {/* D-5: 오른쪽으로 밀어서 잠금 해제 */}
      <div className="absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-6" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}>
        <div
          ref={trackRef}
          className="relative h-[62px] w-full max-w-[23rem] overflow-hidden rounded-full"
          style={{ background: bg.dark ? "rgba(255,255,255,.08)" : "rgba(20,16,40,.08)", border: "1px solid rgba(255,255,255,.18)" }}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: subColor, opacity: 1 - slideProgress }}>
            → 오른쪽으로 밀어서 잠금 해제
          </span>
          <button
            type="button"
            onClick={dismiss}
            onTouchStart={onSlideStart}
            onTouchMove={onSlideMove}
            onTouchEnd={onSlideEnd}
            className="absolute left-1.5 top-1.5 flex h-[50px] w-[70px] items-center justify-center rounded-full text-base font-black"
            style={{ ...pillStyle(state.prefs.buttonStyleKey, bg.dark), transform: `translateX(${slideX}px)`, transition: slideStartRef.current == null ? "transform .22s ease" : "none", touchAction: "none" }}
            aria-label="밀어서 잠금 해제"
          >
            Yes!
          </button>
        </div>
      </div>

      {/* 키프레임: 꽃돼지 float + 카드 전환 */}
      <style>{"@keyframes cdLockFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.cd-lock-float{animation:cdLockFloat 2.8s ease-in-out infinite}@keyframes cdLockCardIn{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:none}}.cd-lock-card{animation:cdLockCardIn .32s ease}@media(prefers-reduced-motion:reduce){.cd-lock-float,.cd-lock-card{animation:none}}"}</style>

      {sheet !== "none" ? (
        <SettingsSheet sheet={sheet} setSheet={setSheet} state={state} updatePrefs={updatePrefs} updateAlarm={updateAlarm} />
      ) : null}
    </main>
  );
}

// ── 오늘의 운세 카드(R3) ──────────────────────────────────────
function DailyFortuneCard({
  fortune, system, scale, subColor, panelBg, dark, onPick,
}: {
  fortune: DailyFortune | null; system: DailyFortuneSystem; scale: number; subColor: string; panelBg: string; dark: boolean; onPick: (k: DailyFortuneSystem) => void;
}) {
  return (
    <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }} onClick={(e) => e.stopPropagation()}>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {DAILY_FORTUNE_SYSTEMS.map((s) => {
          const on = s.key === system;
          return (
            <button
              key={s.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onPick(s.key); }}
              className="rounded-full border px-2.5 py-1 text-[0.72rem] font-bold transition-colors"
              style={on
                ? { borderColor: dark ? "#c4b5fd" : "#7c3aed", background: dark ? "rgba(196,181,253,.22)" : "rgba(124,58,237,.14)", color: dark ? "#e9e2ff" : "#4c1d95" }
                : { borderColor: "rgba(255,255,255,.18)", background: dark ? "rgba(255,255,255,.06)" : "rgba(20,16,40,.05)", color: subColor }}
            >
              {s.emoji} {s.label}
            </button>
          );
        })}
      </div>
      {fortune ? (
        <>
          <p className="text-xs font-black tracking-[0.06em]" style={{ color: dark ? "#c4b5fd" : "#7c3aed" }}>{fortune.emoji} {fortune.anchor}</p>
          <p className="mt-1.5 font-black leading-snug" style={{ fontSize: `calc(1.12rem * ${scale})` }}>{fortune.headline}</p>
          <p className="mt-1.5 leading-relaxed" style={{ color: subColor, fontSize: `calc(0.92rem * ${scale})` }}>{fortune.body}</p>
          {!fortune.personalized ? (
            <p className="mt-2 text-[0.68rem]" style={{ color: subColor }}>프로필 카드를 등록하면 나에게 맞춰 더 정확해져요.</p>
          ) : null}
        </>
      ) : (
        <p className="leading-relaxed" style={{ color: subColor }}>오늘의 운세를 준비하고 있어요…</p>
      )}
    </div>
  );
}

// ── 시퀀스 카드(확언/기운/명언/지식/인사) ─────────────────────
function SeqCard({
  card, scale, subColor, panelBg, dark,
}: {
  card: LockScreenCard; scale: number; subColor: string; panelBg: string; dark: boolean;
}) {
  if (card.kind === "affirmation") {
    return <p className="text-balance font-black leading-[1.34]" style={{ fontSize: `calc(1.5rem * ${scale})` }}>{card.affirmation}</p>;
  }
  if (card.kind === "energy") {
    return (
      <div>
        <p className="mb-1 text-xs font-black tracking-[0.16em]" style={{ color: subColor }}>오늘의 기운</p>
        <p className="text-balance font-black leading-[1.42]" style={{ fontSize: `calc(1.28rem * ${scale})` }}>{card.coreEnergy}</p>
      </div>
    );
  }
  if (card.kind === "quote" && card.quote) {
    return (
      <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }}>
        <p className="font-semibold leading-relaxed" style={{ fontSize: `calc(1.02rem * ${scale})` }}>“{card.quote.text}”</p>
        <p className="mt-2 text-sm font-bold" style={{ color: subColor }}>— {card.quote.author}</p>
      </div>
    );
  }
  if (card.kind === "knowledge" && card.knowledge) {
    return (
      <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }}>
        <p className="mb-1.5 text-xs font-black" style={{ color: dark ? "#c4b5fd" : "#7c3aed" }}>✧ {card.knowledge.system} 지식</p>
        <p className="leading-relaxed" style={{ fontSize: `calc(0.95rem * ${scale})` }}>{card.knowledge.text}</p>
      </div>
    );
  }
  // greeting
  return <p className="font-black leading-relaxed" style={{ color: dark ? "#f4bed1" : "#b31955", fontSize: `calc(1.1rem * ${scale})` }}>🐷 {card.greeting}</p>;
}

// ── 설정 시트 ─────────────────────────────────────────────────
function SettingsSheet({
  sheet, setSheet, state, updatePrefs, updateAlarm,
}: {
  sheet: Sheet; setSheet: (s: Sheet) => void; state: LockState;
  updatePrefs: (patch: Partial<LockPrefs>) => void; updateAlarm: (idx: number, patch: Partial<AlarmSlot>) => void;
}) {
  const { prefs, stats, read } = state;
  const title = sheet === "settings" ? "설정" : sheet === "theme" ? "테마 · 확언 · 운세" : sheet === "alarms" ? "알림 시간" : "읽은 문장 목록";
  return (
    <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-black/45 backdrop-blur-sm" onClick={() => setSheet("none")}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-[#141024] p-5 text-slate-100 shadow-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))", maxHeight: "88dvh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" aria-label="닫기" onClick={() => setSheet("none")} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg">×</button>
        </div>

        {sheet === "settings" ? (
          <div className="grid gap-3">
            <Row label="잠금화면 켜기" desc="화면을 켤 때 오늘의 문장을 잠금화면 위에 보여줍니다.">
              <Toggle on={prefs.enabled} onChange={(v) => updatePrefs({ enabled: v })} />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="오늘 읽음" value={stats.todayRead} />
              <Stat label="총 읽음" value={stats.totalRead} />
            </div>
            <MenuButton label="알림 시간" value={`${prefs.alarms.filter((a) => a.on).length}개 켜짐`} onClick={() => setSheet("alarms")} />
            <MenuButton label="테마 · 확언 분야 · 오늘의 운세" value="색·배경·질감·점술" onClick={() => setSheet("theme")} />
            <MenuButton label="읽은 문장 목록" value={`${read.length}개`} onClick={() => setSheet("readlist")} />
            <Row label="앱 켤 때마다 문장 바꾸기" desc="다음 실행 때 새 문장으로 갱신합니다.">
              <Toggle on={prefs.changeOnLaunch} onChange={(v) => updatePrefs({ changeOnLaunch: v })} />
            </Row>
            <p className="mt-1 text-center text-[0.7rem] text-slate-400">Code Destiny · 잠금화면 운세</p>
          </div>
        ) : null}

        {sheet === "alarms" ? (
          <div className="grid gap-3">
            {prefs.alarms.map((a, i) => (
              <div key={a.label} className="rounded-2xl bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">{a.label}</span>
                  <Toggle on={a.on} onChange={(v) => updateAlarm(i, { on: v })} />
                </div>
                <input
                  type="time" value={a.time} onChange={(e) => updateAlarm(i, { time: e.target.value })} disabled={!a.on}
                  className="w-full rounded-xl border border-white/15 bg-[#0b1225] px-3 py-2.5 text-base text-white disabled:opacity-40"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            ))}
            <p className="text-center text-[0.72rem] leading-relaxed text-slate-400">설정한 시간에 알림으로 오늘의 문장을 전해드립니다. (기기에서 알림·정확한 알람 권한이 필요할 수 있어요.)</p>
          </div>
        ) : null}

        {sheet === "theme" ? (
          <div className="grid gap-4">
            <div>
              <p className="mb-1 text-sm font-bold text-slate-300">오늘의 운세 점술</p>
              <p className="mb-2 text-[0.72rem] leading-relaxed text-slate-400">잠금화면 첫 카드에서 볼 오늘의 운세 방식을 고르세요.</p>
              <div className="flex flex-wrap gap-2">
                {DAILY_FORTUNE_SYSTEMS.map((s) => {
                  const on = prefs.dailyFortuneSystem === s.key;
                  return (
                    <button key={s.key} type="button" onClick={() => updatePrefs({ dailyFortuneSystem: s.key })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-fuchsia-300 bg-fuchsia-500/25 text-white" : "border-white/12 bg-white/5 text-slate-300"}`}>
                      {s.emoji} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-slate-300">듣고 싶은 확언 분야</p>
              <p className="mb-2 text-[0.72rem] leading-relaxed text-slate-400">고른 분야에서 오늘의 확언이 나와요. 아무것도 고르지 않으면 모든 분야에서 골고루 나옵니다.</p>
              <div className="flex flex-wrap gap-2">
                {AFFIRMATION_CATEGORIES.map((c) => {
                  const on = prefs.affirmationCats.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        updatePrefs({
                          affirmationCats: on
                            ? prefs.affirmationCats.filter((k) => k !== c.key)
                            : [...prefs.affirmationCats, c.key],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? "border-fuchsia-300 bg-fuchsia-500/25 text-white" : "border-white/12 bg-white/5 text-slate-300"}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">꽃돼지 캐릭터</p>
              <div className="grid grid-cols-4 gap-2.5">
                {PIG_POSES.map((p) => (
                  <button key={p.key} type="button" onClick={() => updatePrefs({ pigPoseKey: p.key })} className={`grid place-items-center rounded-2xl border-2 p-2 ${prefs.pigPoseKey === p.key ? "border-fuchsia-300 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <img src={p.url} alt={p.label} width={44} height={44} className="h-11 w-11 object-contain" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">버튼 질감</p>
              <div className="grid grid-cols-4 gap-2.5">
                {BUTTON_STYLES.map((b) => (
                  <button key={b.key} type="button" onClick={() => updatePrefs({ buttonStyleKey: b.key })} className={`h-12 rounded-xl border-2 text-xs font-bold ${prefs.buttonStyleKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={pillStyle(b.key, true)}>{b.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">글자 색상</p>
              <div className="flex gap-2.5">
                {FONT_COLORS.map((c) => (
                  <button key={c.key} type="button" onClick={() => updatePrefs({ fontColorKey: c.key })} className={`h-11 flex-1 rounded-xl border-2 text-xs font-bold ${prefs.fontColorKey === c.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: c.hex, color: c.key === "white" ? "#20143a" : "#fff" }}>{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">글자 크기 · {Math.round(prefs.fontScale * 100)}%</p>
              <input type="range" min={0.9} max={1.35} step={0.05} value={prefs.fontScale} onChange={(e) => updatePrefs({ fontScale: Number(e.target.value) })} className="w-full accent-fuchsia-400" />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">배경</p>
              <div className="grid grid-cols-2 gap-2.5">
                {BACKGROUNDS.map((b) => (
                  <button key={b.key} type="button" onClick={() => updatePrefs({ backgroundKey: b.key })} className={`h-20 rounded-2xl border-2 p-2 text-left text-xs font-black ${prefs.backgroundKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: b.css, color: b.dark ? "#fff" : "#20143a" }}>{b.label}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {sheet === "readlist" ? (
          <div className="grid gap-2">
            {read.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">아직 읽은 문장이 없어요.</p>
            ) : (
              read.slice(0, 60).map((r) => (
                <div key={`${r.dateKey}-${r.at}`} className="rounded-xl bg-white/5 px-3.5 py-3">
                  <p className="text-xs font-bold text-fuchsia-200/80">{r.dateKey}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-100">{r.text}</p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-4">
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        {desc ? <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p> : null}
      </div>
      {children}
    </div>
  );
}

function MenuButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 text-left">
      <span className="font-bold">{label}</span>
      <span className="text-sm text-slate-400">{value} ›</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${on ? "bg-fuchsia-500" : "bg-white/20"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
