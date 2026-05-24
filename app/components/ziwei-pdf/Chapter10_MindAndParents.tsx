import type { ZiweiChapterX } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterX | null | undefined };

export default function Chapter10_MindAndParents({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "X. 복덕궁과 부모궁" });
}
