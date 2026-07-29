/**
 * /all-fortunes 허브가 쓰는 운세 목록.
 *
 * 카탈로그를 새로 만들지 않는다 — app/_lib/serviceSections.js 가 이미 5개 섹션 ~50종을
 * 12개 로케일 카피와 함께 들고 있으므로 그걸 평평하게 펴서 쓴다.
 * 새 기능을 추가할 때도 여기가 아니라 serviceSections.js 에 넣는다.
 */
import { getLocalizedServiceSections } from "./serviceSections";

export interface FortuneEntry {
  /** localStorage(최근·즐겨찾기) 키로 쓰는 안정 식별자. href 에서 파생한다. */
  id: string;
  title: string;
  desc: string;
  href: string;
  sectionId: string;
  sectionTitle: string;
}

export interface FortuneSection {
  id: string;
  title: string;
  items: FortuneEntry[];
}

interface RawServiceItem {
  href?: string;
  title?: string;
  desc?: string;
}

interface RawServiceSection {
  id?: string;
  title?: string;
  items?: RawServiceItem[];
}

export function toFortuneId(href: string): string {
  return String(href || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export function getAllFortuneSections(locale = "ko"): FortuneSection[] {
  const sections = getLocalizedServiceSections(locale) as RawServiceSection[];
  const seen = new Set<string>();

  return sections
    .map((section) => {
      const sectionId = String(section.id || "");
      const sectionTitle = String(section.title || "");
      const items: FortuneEntry[] = [];

      for (const item of section.items || []) {
        const href = String(item.href || "").trim();
        if (!href) continue;
        const id = toFortuneId(href);
        // 별칭(aliases)으로 같은 기능이 두 번 실릴 수 있어 허브에서는 한 번만 보여준다.
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push({
          id,
          href,
          title: String(item.title || ""),
          desc: String(item.desc || ""),
          sectionId,
          sectionTitle,
        });
      }

      return { id: sectionId, title: sectionTitle, items };
    })
    .filter((section) => section.items.length > 0);
}

export function getAllFortuneEntries(locale = "ko"): FortuneEntry[] {
  return getAllFortuneSections(locale).flatMap((section) => section.items);
}
