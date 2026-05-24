import type { ZiweiChapterXII } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterXII | null | undefined };

export default function Chapter12_DecadeFlow({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "XII. 대한 정밀 분석" });
}
