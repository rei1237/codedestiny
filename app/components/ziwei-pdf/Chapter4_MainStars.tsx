import type { ZiweiChapterIV } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterIV | null | undefined };

export default function Chapter4_MainStars({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "IV. 14주성 완전 해석" });
}
