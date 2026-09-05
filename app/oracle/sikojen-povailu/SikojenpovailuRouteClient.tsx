"use client";

import dynamic from "next/dynamic";

import { SikojenTopNav } from "./components/SikojenTopNav";

const SikojenpovailuApp = dynamic(() => import("./SikojenpovailuApp"), {
  ssr: false,
  loading: () => <SikojenpovailuShell />,
});

/**
 * 청크가 도착하기 전까지 그리는 셸.
 *
 * 본 화면과 같은 파스텔 그라디언트·같은 골격을 써서 로딩과 본편이 한 세계로 이어지게 한다.
 * 상단 내비를 함께 그려 로딩 중에도 빠져나갈 수 있다.
 */
function SikojenpovailuShell() {
  return (
    <div
      aria-busy="true"
      className="fixed inset-0 z-[2147483000] overflow-hidden bg-[linear-gradient(180deg,#fff1f2_0%,#fdf2f8_50%,#fff1f2_100%)] px-4"
    >
      <SikojenTopNav />
      <div className="mx-auto flex h-full w-full max-w-sm flex-col items-center justify-center gap-4">
        <div className="h-32 w-32 animate-pulse rounded-full bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
        <div className="h-9 w-52 max-w-full animate-pulse rounded-full bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-full bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
        <div className="h-4 w-52 max-w-full animate-pulse rounded-full bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
        <div className="mt-2 h-32 w-full animate-pulse rounded-[18px] bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
        <div className="mt-1 h-12 w-44 animate-pulse rounded-full bg-[rgba(216,63,120,0.10)] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export default function SikojenpovailuRouteClient() {
  return <SikojenpovailuApp />;
}
