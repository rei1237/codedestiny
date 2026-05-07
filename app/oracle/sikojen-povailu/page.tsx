import SikojenpovailuApp from "./SikojenpovailuApp";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/oracle/sikojen-povailu", {
  title: "핀란드 주석점 Sikojen Povailu | Code Destiny",
  description:
    "핀란드 전통 주석점(낙점) 의식을 무료로 체험하세요. 5단계 인터랙티브 낙점 오라클.",
});

export default function SikojenpovailuPage() {
  return <SikojenpovailuApp />;
}
