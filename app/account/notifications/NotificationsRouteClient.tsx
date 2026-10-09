"use client";

import dynamic from "next/dynamic";

// 인증 상태를 읽는 화면이라 정적 export 프리렌더에 올리지 않는다(`/account/phone` 과 같은 구성).
// 광고 메일 푸터의 '수신 설정' 링크가 이 주소로 온다.
const EmailMarketingPreference = dynamic(() => import("../../components/EmailMarketingPreference"), { ssr: false });

export default function NotificationsRouteClient() {
  return (
    <main className="min-h-screen px-4 py-8">
      <h1 className="mx-auto max-w-[44rem] text-2xl font-bold">수신 설정</h1>
      <EmailMarketingPreference source="preferences" settings />
      <p className="mx-auto max-w-[44rem] text-sm">
        카카오톡 채널 소식 설정은 <a href="/channel/" className="underline underline-offset-4">채널 페이지</a>에서 할 수 있어요.
      </p>
    </main>
  );
}
