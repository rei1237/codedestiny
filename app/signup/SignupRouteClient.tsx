"use client";

import dynamic from "next/dynamic";

const SignupClient = dynamic(() => import("./SignupClient"), {
  ssr: false,
  loading: () => <SignupShell />,
});

export default function SignupRouteClient() {
  return <SignupClient />;
}

function SignupShell() {
  return (
    <main className="min-h-screen bg-[#080617] px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl place-items-center">
        <section className="w-full max-w-xl rounded-[28px] border border-violet-200/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="h-4 w-28 rounded-full bg-violet-100/20" />
          <div className="mt-5 h-9 w-3/4 rounded-2xl bg-white/10" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-3">
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-violet-200/20" />
          </div>
        </section>
      </div>
    </main>
  );
}
