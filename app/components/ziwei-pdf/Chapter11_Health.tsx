import type { ZiweiChapterXI } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterXI | null | undefined };

export default function Chapter11_Health({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "XI. 질액궁" });
}
