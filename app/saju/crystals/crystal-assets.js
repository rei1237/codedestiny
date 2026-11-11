// 빌드(SSG) 때 public/ 아래 원석·웹툰 이미지가 실제로 있는지 확인한다. 서버 컴포넌트에서만 import한다.
// 그림이 아직 없으면 웹툰은 대사만, 원석 카드는 오행 색 칩으로 대신해 깨진 이미지가 나가지 않게 한다.
import fs from "node:fs";
import path from "node:path";
import { CRYSTAL_CATALOG } from "../../../lib/saju/crystal-catalog.mjs";
import { SAJU_CRYSTAL_WEBTOON_CUTS } from "../../../lib/brand/saju-crystal-webtoon.mjs";
import { STONE_IMAGE } from "./StoneCard";

const publicFile = (url) => path.join(process.cwd(), "public", ...url.split("/").filter(Boolean));
const exists = (url) => {
  try {
    return fs.statSync(publicFile(url)).isFile();
  } catch {
    return false;
  }
};

/** 그림 파일(avif 전 폭 + webp 대체)이 모두 있는 컷만 src를 남기고, 나머지는 src를 비워 대사만 보이게 한다. */
export function sajuCrystalWebtoonCuts() {
  return SAJU_CRYSTAL_WEBTOON_CUTS.map((cut) => {
    const ready = exists(`${cut.src}-${cut.fallback}.webp`) && cut.widths.every((w) => exists(`${cut.src}-${w}.avif`));
    return { ...cut, lines: [...cut.lines], widths: [...cut.widths], src: ready ? cut.src : "" };
  });
}

/** 이미지 파일이 모두 있는 원석 id 목록. */
export function availableStoneIds() {
  return CRYSTAL_CATALOG
    .filter((c) => exists(`${c.image}-${STONE_IMAGE.fallback}.webp`) && STONE_IMAGE.widths.every((w) => exists(`${c.image}-${w}.avif`)))
    .map((c) => c.id);
}
