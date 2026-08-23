import SikojenpovailuRouteClient from "./SikojenpovailuRouteClient";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const SIKOJEN_POVAILU_METADATA_COPY = {
  ko: {
    title: "핀란드 주석점 Sikojen Povailu",
    description:
      "핀란드 전통 주석점 Sikojen Povailu를 바탕으로 상징, 질문, 선택의 흐름을 살펴보는 무료 인터랙티브 오라클입니다.",
  },
  en: {
    title: "Finnish Tin Casting Oracle Sikojen Povailu",
    description:
      "A free interactive oracle inspired by the Finnish tin casting tradition Sikojen Povailu, reading symbols, questions, and the flow of choice.",
  },
  ja: {
    title: "フィンランド錫占い Sikojen Povailu",
    description:
      "フィンランド伝統の錫占いSikojen Povailuをもとに、象徴・問い・選択の流れを読む無料インタラクティブオラクルです。",
  },
  zh: {
    title: "芬兰锡占 Sikojen Povailu",
    description:
      "基于芬兰传统锡占 Sikojen Povailu，观察象征、问题与选择流向的免费互动神谕。",
  },
};

const sikojenPovailuMetadataCopy = SIKOJEN_POVAILU_METADATA_COPY.ko;

export const metadata = withUniqueRouteMetadata("/oracle/sikojen-povailu", {
  title: sikojenPovailuMetadataCopy.title,
  description: sikojenPovailuMetadataCopy.description,
});

export default function SikojenpovailuPage() {
  return (
    <main>
      <RouteMetadataLocaleSync entries={SIKOJEN_POVAILU_METADATA_COPY} />
      <h1 className="sr-only">{sikojenPovailuMetadataCopy.title}</h1>
      <SikojenpovailuRouteClient />
    </main>
  );
}
