import type { ZiweiChapterIII } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterIII | null | undefined };

export default function Chapter3_FourTransformations({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "III. 선천 사화 정밀 분석" });
}
