import type { ZiweiChapterVII } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterVII | null | undefined };

export default function Chapter7_RelationshipFamily({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "VII. 부처궁과 자녀궁" });
}
