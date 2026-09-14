"use client";

import dynamic from "next/dynamic";

const MasterLoveCodexPage = dynamic(() => import("@/src/features/master-love-codex/MasterLoveCodexPage"), {
  ssr: false,
  loading: () => <MasterLoveCodexShell />,
});

export default function MasterLoveCodexRouteClient() {
  return <MasterLoveCodexPage />;
}

function MasterLoveCodexShell() {
  return (
    <div className="min-h-[100svh] bg-[#f7f4ee] text-[#202b3e]">
      <section className="mx-auto flex min-h-[60svh] max-w-3xl flex-col justify-center px-5 py-16 text-center sm:px-8">
        <p className="text-[12px] font-black tracking-[0.34em] text-[#536078]">MASTER DESTINY</p>
        {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. 이 로딩 셸도 h1 이면
            서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다. */}
        <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">마스터 인연의 서</h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#536078]">
          사랑할 때 반복되는 마음의 지도를 펼칩니다. 이야기를 준비하고 있어요.
        </p>
      </section>
    </div>
  );
}
