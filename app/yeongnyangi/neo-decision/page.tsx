import type { Metadata } from "next";
import NeoDecisionRedirect from "./NeoDecisionRedirect";

// 2026-10-28: 네오 작전 결정서는 꿀꿀운세 소속 /neo-consultation/ 으로 옮겼다.
// 결제 복귀(?order=)와 이메일·북마크의 옛 주소가 끊기지 않도록 이 주소는 남겨 두고 쿼리·해시를 그대로 넘긴다.
export const metadata: Metadata = { title: "네오 작전 결정서 | 꿀꿀운세", description: "네오 작전 결정서는 꿀꿀운세의 /neo-consultation/ 에서 신청할 수 있습니다.", robots: { index: false, follow: false } };
export default function NeoDecisionPage() { return <NeoDecisionRedirect />; }
