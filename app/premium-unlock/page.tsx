import { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";
import PremiumUnlockClient from "./PremiumUnlockClient";

const PREMIUM_UNLOCK_METADATA_COPY = {
  title: "인생 총운 전문가 상담 | Code Destiny",
  description:
    "생년월일시와 명리 계산값을 바탕으로 대운, 세운, 성향, 일, 재물, 관계의 큰 흐름을 차분히 읽어드립니다.",
  openGraphTitle: "인생 총운 전문가 상담",
  openGraphDescription: "타고난 명식과 시간의 흐름으로 삶의 큰 방향을 살핍니다.",
} as const;

export const metadata: Metadata = withUniqueRouteMetadata("/premium-unlock", {
  title: PREMIUM_UNLOCK_METADATA_COPY.title,
  description: PREMIUM_UNLOCK_METADATA_COPY.description,
  openGraph: {
    title: PREMIUM_UNLOCK_METADATA_COPY.openGraphTitle,
    description: PREMIUM_UNLOCK_METADATA_COPY.openGraphDescription,
  },
}) as Metadata;

export default function PremiumUnlockPage() {
  return (
    <main style={{ background: "#05040d", color: "#e2e8f0" }}>
      <PremiumUnlockClient />
    </main>
  );
}
