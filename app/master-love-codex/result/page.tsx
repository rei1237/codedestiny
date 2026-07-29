"use client";

import dynamic from "next/dynamic";

const MasterLoveCodexResultClient = dynamic(() => import("./MasterLoveCodexResultClient"), {
  ssr: false,
  loading: () => (
    <main aria-busy="true" className="flex min-h-[100svh] items-center justify-center bg-[#0a0818] px-6 text-center">
      <p className="text-[0.9375rem] tracking-[0.24em] text-[#e8d5a3]">Unsealing</p>
    </main>
  ),
});

export default function MasterLoveCodexResultPage() {
  return <MasterLoveCodexResultClient />;
}
