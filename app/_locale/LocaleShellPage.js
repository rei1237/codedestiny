"use client";

import { usePathname } from "next/navigation";

/**
 * Locale roots (/en-us, …) are rewritten to legacy HTML (URL stays /{locale}).
 */
export default function LocaleShellPage() {
  const pathname = usePathname() || "/";
  return (
    <main className="min-h-[40vh] bg-slate-950 px-4 py-10 text-center text-slate-300">
      <p className="text-sm">
        서비스 화면은{" "}
        <a href={pathname} className="text-amber-300 underline">
          {pathname}
        </a>
        입니다.
      </p>
    </main>
  );
}
