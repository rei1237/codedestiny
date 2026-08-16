// 인증 퍼널(로그인·가입·가입 마무리·프로필 보완) 공용 입력 클래스.
//
// app/feedback/_lib/styles.ts 와 같은 규약이다 — CSS Module 없이 Tailwind 만 쓰고,
// 색상 리터럴은 DESIGN.md 의 neo 토큰 실제 값(neo-bg #0a0818 · neo-bg-deep #13102a ·
// neo-text #f4eeff · neo-text-muted #c8aaff · neo-accent #c4b5fd)을 그대로 적는다.
//
// 🔴 이 화면들은 dark: 병행이 아니라 **다크 단일 커밋**이다(AuthShell 이 [color-scheme:dark] 로
// 고정한다). 그래서 여기에는 dark: 짝을 두지 않는다 — 반쪽 오버라이드가 생길 여지 자체를 없앤다.
//
// 예전에는 이 문자열들이 AuthShell.tsx 와 OnboardingClient.tsx 에 복붙돼 있었고, 값도
// 토큰이 아니라 근사치 리터럴(#090b1a·#12152b·#c9b7f0)이었다. 한 화면만 고치면 같은 퍼널
// 안에서 이음매가 보였다.

/** 입력 배경은 카드(neo-bg-deep)보다 한 단 더 깊게 둔다 — 눌린 면으로 읽혀야 입력 가능해 보인다. */
const INPUT_SURFACE = "bg-[#0a0818]";

// text-base = 16px. iOS 가 폼 포커스 시 확대하는 것을 막는 유일한 조건이다.
// 상태 전부 구현: default · hover · focus-visible · disabled (error 는 AUTH_INPUT_INVALID 로 덧댄다).
export const AUTH_INPUT =
  `min-h-12 w-full rounded-xl border border-[#c4b5fd]/25 ${INPUT_SURFACE} px-3 text-base text-[#f4eeff] outline-none transition-colors placeholder:text-[#9a8cc0] hover:border-[#c4b5fd]/40 focus-visible:border-[#c4b5fd] focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/40 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none`;

/** 검증 실패한 입력. 색만 바꾸지 말고 호출부에서 aria-invalid 와 함께 쓴다(색맹 사용자에게 색은 신호가 아니다). */
export const AUTH_INPUT_INVALID =
  "border-[#ff8ca5]/70 hover:border-[#ff8ca5]/80 focus-visible:border-[#ff8ca5] focus-visible:ring-[#ff8ca5]/40";

export const AUTH_LABEL = "mb-1.5 flex items-center gap-2 text-sm font-bold text-[#e7def7]";

/** "선택" 처럼 라벨을 수식하는 꼬리표. 라벨 문자열에 괄호로 붙이면 위계가 뭉개진다. */
export const AUTH_LABEL_CHIP =
  "rounded-full border border-[#c4b5fd]/30 px-2 py-0.5 text-[11px] font-bold leading-4 text-[#c8aaff]";

export const AUTH_HINT = "mt-1.5 text-xs leading-5 text-[#c8aaff]";

/** 필드 바로 아래 붙는 오류. 상단 배너는 서버·네트워크 오류 전용으로 남긴다. */
export const AUTH_FIELD_ERROR = "mt-1.5 text-xs leading-5 text-[#ffb3c4]";

/** 숫자가 실시간으로 하이픈 처리될 때 폭이 흔들리지 않게 한다. */
export const AUTH_TABULAR = "[font-variant-numeric:tabular-nums]";
