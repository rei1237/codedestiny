import type { ZiweiChapterIX } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterIX | null | undefined };

export default function Chapter9_Network({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "IX. 노복궁과 형제궁" });
}
