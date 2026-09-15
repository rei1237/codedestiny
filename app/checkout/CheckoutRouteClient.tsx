"use client";

import dynamic from "next/dynamic";

const CheckoutClient = dynamic(() => import("./CheckoutClient"), {
  ssr: false,
  loading: () => <CheckoutShell />,
});

export default function CheckoutRouteClient() {
  return <CheckoutClient />;
}

function CheckoutShell() {
  return (
    <div className="min-h-screen bg-[#0b0a14] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80">Yeongnyangi</p>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">영냥이 복채 결제</h1>
        <p className="mt-4 text-sm leading-7 text-amber-50/75">결제 정보를 불러오고 있어요.</p>
      </section>
    </div>
  );
}
