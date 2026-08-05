import { buildSeoMetadata } from "../../lib/seo";
import FortuneChatClient from "./FortuneChatClient";

export const metadata = buildSeoMetadata({
  path: "/fortune-chat",
  noindex: true,
  title: "꽃돼지 운명상담 | Code Destiny",
  description: "꽃돼지와 대화하며 가벼운 고민부터 초융합 심층 리딩까지 하나의 상담방에서 이어가세요.",
});

export default function FortuneChatPage() {
  return <FortuneChatClient />;
}
