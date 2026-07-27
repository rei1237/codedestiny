import type { ReactNode } from "react";
// 듀얼 페르소나 토큰(--cd-*) 보장. 번들러가 중복 import를 dedupe하므로 안전.
import "@/styles/theme-tokens.css";

export default function LockScreenFortuneLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
