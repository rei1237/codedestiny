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
    <main className="min-h-screen bg-[#050516] px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl place-items-center">
        <section className="w-full max-w-md rounded-[28px] border border-violet-200/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="mx-auto h-16 w-16 rounded-full bg-violet-100/15" />
          <div className="mx-auto mt-6 h-5 w-32 rounded-full bg-violet-100/20" />
          <div className="mx-auto mt-4 h-8 w-3/4 rounded-2xl bg-white/10" />
          <div className="mx-auto mt-3 h-4 w-11/12 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-3">
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-violet-200/20" />
          </div>
        </section>
      </div>
    </main>
  );
}
