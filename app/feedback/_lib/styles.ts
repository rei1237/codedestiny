// 제보실 공용 Tailwind 클래스.
//
// CSS Module 을 쓰지 않는다 — 이 화면에는 Tailwind 로 표현 못 할 고유 기하가 없다.
// 색상 리터럴은 styles/theme-tokens.css 의 --cd-* 실제 토큰 값이며,
// App Router 페이지라 연이/네오 분기 없이 dark: 만 병행한다(CLAUDE.md UI/UX Standards).

export const CANVAS =
  "min-h-screen bg-gradient-to-b from-[#fffaf7] via-[#fff3f8] to-[#f8fbf4] dark:from-[#0a0818] dark:via-[#13102a] dark:to-[#090718]";

export const INK = "text-[#3c1830] dark:text-[#f4eeff]";
export const INK_MUTED = "text-[#70445c] dark:text-[rgba(200,170,255,0.72)]";
export const ACCENT = "text-[#b31955] dark:text-[#c4b5fd]";

export const GLASS_CARD =
  "rounded-3xl border border-[rgba(216,63,120,0.16)] bg-white/80 shadow-[0_18px_44px_rgba(120,20,60,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_44px_rgba(4,2,12,0.5)]";

export const FIELD_LABEL = "block text-sm font-bold text-[#3c1830] dark:text-[#f4eeff]";

// text-base = 16px. iOS 가 폼 포커스 시 확대하는 것을 막는 유일한 조건이다.
export const FIELD_INPUT =
  "w-full min-h-[44px] rounded-xl border border-[rgba(216,63,120,0.2)] bg-white/70 px-4 py-3 text-base text-[#3c1830] placeholder:text-[#b08699] transition-colors focus-visible:border-[#b31955] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955]/40 dark:border-white/12 dark:bg-white/[0.04] dark:text-[#f4eeff] dark:placeholder:text-[rgba(180,155,225,0.55)] dark:focus-visible:border-[#c4b5fd] dark:focus-visible:ring-[#c4b5fd]/40";

export const CTA_BUTTON =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#fff8dc] via-[#ead089] to-[#f4bed1] px-7 text-[15px] font-black tracking-tight text-[#3c1830] shadow-[0_10px_26px_rgba(234,208,137,0.38)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:from-[#c4b5fd] dark:via-[#a78bfa] dark:to-[#e8d5a3] dark:text-[#0a0818] dark:focus-visible:ring-[#c4b5fd] dark:focus-visible:ring-offset-[#0a0818]";

export const GHOST_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[rgba(216,63,120,0.24)] bg-white/60 px-5 text-sm font-bold text-[#b31955] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] dark:border-white/14 dark:bg-white/[0.04] dark:text-[#c4b5fd] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#c4b5fd]";
