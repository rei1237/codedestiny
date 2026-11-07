import type {DomainId as FortuneDomainId} from "@/worker/yeongnyangi/fortune/shared/contracts";
import { topicCatalog, type TopicId } from "@/worker/yeongnyangi/fortune/topics";
// Home "영냥이가 골라봤어" cards enter the paid book flow with a topic. The server catalog is the allowlist; this adds UI copy.
export const topicEntry = {
  love: { title: "마음이 닿는 순간", artKey: "love", domains: ["tarot", "saju", "sukuyo"], readingMode: "personal" },
  money: { title: "나의 재물 흐름", artKey: "money", domains: ["saju", "ziwei", "astrology", "vedic"], readingMode: "personal" },
  year: { title: "올해, 남은 이야기", artKey: "year", domains: ["ziwei", "saju", "vedic", "astrology"], readingMode: "personal" },
  relationship: { title: "낯익은 인연의 비밀", artKey: "relationship", domains: ["sukuyo"], readingMode: "compatibility" },
} as const satisfies Partial<Record<TopicId, { title: string; artKey: string; domains: readonly FortuneDomainId[]; readingMode: "personal" | "compatibility" }>>;
export type HomeTopicId = keyof typeof topicEntry;
export function isHomeTopic(value: string | null | undefined): value is HomeTopicId {
  return !!value && value in topicEntry;
}
export function topicLabel(topicId: HomeTopicId) {
  return topicCatalog[topicId].label;
}
export function topicHref(domain: FortuneDomainId, topicId?: HomeTopicId) {
  return `/yeongnyangi/fortune/?domain=${domain}${topicId ? `&topic=${topicId}` : ""}`;
}
