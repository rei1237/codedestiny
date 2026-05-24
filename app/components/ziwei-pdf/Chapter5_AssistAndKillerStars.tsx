import type { ZiweiChapterV } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterV | null | undefined };

export default function Chapter5_AssistAndKillerStars({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "V. 보좌성과 살성의 역학 관계" });
}
