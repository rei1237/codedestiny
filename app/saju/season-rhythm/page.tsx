import FreeFeatureDetail from "../../components/free-feature/FreeFeatureDetail";
import { buildSeoMetadata } from "../../../lib/seo";
import { getFreeFeatureDetail } from "../../../lib/marketing/free-feature-details.mjs";

/* 무료 홍보 칩 상세. 문구·색인 여부(indexable)는 lib/marketing/free-feature-details.mjs 에서 바꾼다. */
const detail = getFreeFeatureDetail("season-rhythm");

export const metadata = buildSeoMetadata({
  path: detail.path,
  title: detail.title,
  description: detail.description,
  keywords: detail.keywords,
  noindex: !detail.indexable,
});

export default function SajuSeasonRhythmDetailPage() {
  return <FreeFeatureDetail slug="season-rhythm" />;
}
