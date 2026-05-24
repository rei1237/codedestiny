import type { ZiweiChapterXV } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterXV | null | undefined };

export default function Chapter15_FinalStrategy({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "XV. 자미 거장의 최종 전략 제언" });
}
