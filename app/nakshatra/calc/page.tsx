import Link from "next/link";
import NakshatraFormClient from "../NakshatraFormClient";

export default function NakshatraCalcPage() {
  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#070812] px-4 py-10 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_12%,rgba(212,175,55,0.14),transparent_38%),linear-gradient(150deg,#0a0818_0%,#141031_55%,#070510_100%)]"
      />
      <div className="mx-auto w-full max-w-2xl">
        <nav className="mb-6 text-sm">
          <Link href="/nakshatra" className="text-amber-100/80 transition hover:text-amber-100">
            ← 나크샤트라 결정판
          </Link>
        </nav>
        <header className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">Nakshatra Codex</p>
          <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-slate-50 md:text-4xl">
            내 별의 두 이름을 확인하세요
          </h1>
          <p className="mx-auto mt-4 max-w-md break-keep text-sm leading-7 text-slate-300">
            생년월일을 입력하면 달이 머무는 자리를 계산해, 동양 27수와 인도 27 나크샤트라를
            나란히 읽어 드립니다.
          </p>
        </header>
        <NakshatraFormClient />
      </div>
    </main>
  );
}
