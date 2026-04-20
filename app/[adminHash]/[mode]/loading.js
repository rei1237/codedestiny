import ServiceRenderSkeleton from "../../components/ServiceRenderSkeleton";

export const metadata = {
  title: "서비스 로딩 화면 | Code Destiny",
  description: "서비스 로딩 전용 상태 화면입니다.",
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true, "max-snippet": -1 },
  },
};

export default function Loading() {
  return <ServiceRenderSkeleton />;
}
