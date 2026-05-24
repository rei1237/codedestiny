import type { ZiweiChapterXIII } from "@/app/_lib/ziwei/premium/types";
import { renderZiweiChapterBlock } from "./chapterRenderer";

type Props = { chapter: ZiweiChapterXIII | null | undefined };

export default function Chapter13_YearRoadmap({ chapter }: Props) {
  return renderZiweiChapterBlock({ chapter, fallbackTitle: "XIII. 2026 丙午年 유년 로드맵" });
}
