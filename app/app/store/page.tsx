import AppPassStoreClient from "./AppPassStoreClient";

export const metadata = {
  title: "이용권",
  description: "Code Destiny 이용권 구매",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppPassStorePage() {
  return (
    <>
      <header className="cd-app-bar px-4 pb-3">
        <h1 className="cd-app-title pt-3">이용권</h1>
        <p className="cd-app-body mt-1">
          이용권이 있으면 커버 범위 안의 기능은 결제 없이 바로 열립니다.
        </p>
      </header>
      <AppPassStoreClient />
    </>
  );
}
