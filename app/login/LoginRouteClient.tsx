"use client";

import dynamic from "next/dynamic";

const LoginClient = dynamic(() => import("./LoginClient"), {
  ssr: false,
  loading: () => <LoginShell />,
});

export default function LoginRouteClient() {
  return <LoginClient />;
}

function LoginShell() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6" aria-busy="true">
      <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] py-3">
        <section className="my-auto w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7">
          <div className="mx-auto h-[52px] w-[52px] rounded-2xl bg-white/10" />
          <div className="mx-auto mt-4 h-8 w-3/5 rounded-2xl bg-white/10" />
          <div className="mx-auto mt-2 h-4 w-11/12 rounded-full bg-white/[0.07]" />
          <div className="my-4 min-h-6" />
          <div className="grid gap-3">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="mt-2 h-12 rounded-xl bg-white/[0.07]" />
            <div className="h-12 rounded-xl bg-[#7c5cbf]/45" />
          </div>
        </section>
      </div>
    </main>
  );
}
