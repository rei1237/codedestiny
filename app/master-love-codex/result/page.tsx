"use client";

import dynamic from "next/dynamic";

const MasterLoveCodexResultClient = dynamic(() => import("./MasterLoveCodexResultClient"), {
  ssr: false,
  loading: () => (
    <main aria-busy="true" className="flex min-h-[100svh] items-center justify-center bg-[#0d0714] px-6 text-center">
      <p className="text-sm font-bold text-rose-50/85">보관된 비책을 여는 중입니다.</p>
    </main>
  ),
});

export default function MasterLoveCodexResultPage() {
  return <MasterLoveCodexResultClient />;
}
