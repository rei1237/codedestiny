// 인증 퍼널(로그인·가입·가입 마무리) 공용 입력 클래스.
//
// app/feedback/_lib/styles.ts 와 같은 규약이다 — CSS Module 없이 Tailwind 만 쓰고,
// 색상 리터럴은 DESIGN.md 의 neo 토큰 실제 값(neo-bg #0a0818 · neo-text #f4eeff ·
// neo-accent #c4b5fd)을 그대로 적는다. 예전에는 근사치 리터럴(#090b1a·#c9b7f0)이 박혀 있었다.
//
// 🔴 이 화면들은 dark: 병행이 아니라 **다크 단일 커밋**이다(AuthShell 이 [color-scheme:dark] 로
// 고정한다). 그래서 여기에는 dark: 짝을 두지 않는다 — 반쪽 오버라이드가 생길 여지 자체를 없앤다.

// text-base = 16px. iOS 가 폼 포커스 시 확대하는 것을 막는 유일한 조건이다.
// 상태 전부 구현: default · hover · focus-visible · disabled.
export const AUTH_INPUT =
  "min-h-12 w-full rounded-xl border border-[#c4b5fd]/25 bg-[#0a0818] px-3 text-base text-[#f4eeff] outline-none transition-colors placeholder:text-[#9a8cc0] hover:border-[#c4b5fd]/40 focus-visible:border-[#c4b5fd] focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/40 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none";

export const AUTH_LABEL = "mb-1.5 block text-sm font-bold text-[#e7def7]";
