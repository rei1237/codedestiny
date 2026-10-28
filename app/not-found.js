import YeoniNotFound from "../components/errors/YeoniNotFound";

export const metadata = {
  title: "페이지를 찾을 수 없습니다 | 꿀꿀 운세",
  description: "연이와 함께 다시 길을 찾아보세요. 홈이나 사주 분석으로 돌아갈 수 있습니다.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <YeoniNotFound />;
}
