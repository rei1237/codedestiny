import SikojenpovailuApp from "./SikojenpovailuApp";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/oracle/sikojen-povailu", {
  title: "핀란드 주석점 Sikojen Povailu",
  description:
    "핀란드 전통 주석점 Sikojen Povailu를 바탕으로 상징, 질문, 선택의 흐름을 살펴보는 무료 인터랙티브 오라클입니다.",
});

export default function SikojenpovailuPage() {
  return (
    <main>
      <h1 className="sr-only">핀란드 주석점 Sikojen Povailu</h1>
      <SikojenpovailuApp />
    </main>
  );
}
