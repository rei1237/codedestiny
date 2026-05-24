import type { ZiweiChapterVIII } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterVIII | null | undefined };

export default function Chapter8_MoveHome({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "VIII. 천이궁과 전택궁" });
}
