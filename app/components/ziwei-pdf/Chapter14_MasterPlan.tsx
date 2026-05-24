import type { ZiweiChapterXIV } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterXIV | null | undefined };

export default function Chapter14_MasterPlan({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "XIV. 생애 마스터플랜" });
}
