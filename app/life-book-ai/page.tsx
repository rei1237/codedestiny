import LifeBookAiRouteClient from "./LifeBookAiRouteClient";

export const metadata = {
  title: "인생의 책 AI 상담 | Code Destiny",
  description: "생년월일과 명식의 흐름을 바탕으로 한 사람의 인생 서사를 상담처럼 읽어드립니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifeBookAiPage() {
  return <LifeBookAiRouteClient />;
}
