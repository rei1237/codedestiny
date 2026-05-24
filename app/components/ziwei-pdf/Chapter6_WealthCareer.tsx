import type { ZiweiChapterVI } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterVI | null | undefined };

export default function Chapter6_WealthCareer({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "VI. 재백궁과 관록궁" });
}
