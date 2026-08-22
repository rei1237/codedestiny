import { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";
import PremiumUnlockClient from "./PremiumUnlockClient";

const PREMIUM_UNLOCK_METADATA_COPY = {
  ko: {
    title: "인생 총운 전문가 상담 | Code Destiny",
    description:
      "생년월일시와 명리 계산값을 바탕으로 대운, 세운, 성향, 일, 재물, 관계의 큰 흐름을 차분히 읽어드립니다.",
  },
  en: {
    title: "Life Fortune Expert Consultation | Code Destiny",
    description:
      "From your birth date and time and the calculated Myeongni values, we read the larger currents of your luck cycles, disposition, work, wealth, and relationships.",
  },
  ja: {
    title: "人生総運 専門家相談 | Code Destiny",
    description:
      "生年月日時と命理の計算値をもとに、大運・歳運・性向・仕事・財・関係の大きな流れを落ち着いて読み解きます。",
  },
  zh: {
    title: "人生总运专家咨询 | Code Destiny",
    description:
      "以出生年月日时与命理计算值为基础，平静地读出大运、流年、性情、事业、财富与关系的大流向。",
  },
};

/* 서버가 렌더하는 메타데이터·OG 는 한국어 정본 그대로 둔다 — 크롤러와 소셜 공유 미리보기는
   canonical 한국어를 보고, 실사용자 브라우저의 탭 제목·설명만 RouteMetadataLocaleSync 가
   하이드레이션 후 로케일에 맞게 바꾼다(이미 배선된 11개 라우트와 같은 계약). */
const premiumUnlockMetadataCopy = PREMIUM_UNLOCK_METADATA_COPY.ko;

export const metadata: Metadata = withUniqueRouteMetadata("/premium-unlock", {
  title: premiumUnlockMetadataCopy.title,
  description: premiumUnlockMetadataCopy.description,
  openGraph: {
    title: "인생 총운 전문가 상담",
    description: "타고난 명식과 시간의 흐름으로 삶의 큰 방향을 살핍니다.",
  },
}) as Metadata;

export default function PremiumUnlockPage() {
  return (
    <main style={{ background: "#05040d", color: "#e2e8f0" }}>
      <RouteMetadataLocaleSync entries={PREMIUM_UNLOCK_METADATA_COPY} />
      <PremiumUnlockClient />
    </main>
  );
}
