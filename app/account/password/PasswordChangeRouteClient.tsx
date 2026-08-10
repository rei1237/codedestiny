"use client";

import dynamic from "next/dynamic";

// 인증 상태를 읽는 화면이라 정적 export 프리렌더에 올리지 않는다(`/login` 과 같은 구성).
const PasswordChangeClient = dynamic(() => import("./PasswordChangeClient"), {
  ssr: false,
  loading: () => <PasswordChangeSkeleton />,
});

export default function PasswordChangeRouteClient() {
  return <PasswordChangeClient />;
}

function PasswordChangeSkeleton() {
  return (
    <main className="min-h-screen bg-[#090b1a] px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[440px] place-items-center">
        <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-6">
          <div className="mx-auto h-7 w-40 rounded-xl bg-white/10" />
          <div className="mx-auto mt-3 h-4 w-11/12 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-4">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-[#7c5cbf]/40" />
          </div>
        </section>
      </div>
    </main>
  );
}
