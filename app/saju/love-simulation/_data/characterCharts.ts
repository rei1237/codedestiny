// 프리셋 캐릭터 16명의 고정 사주 원국.
// 생년월일시는 lunar-javascript(=사주 엔진이 쓰는 것과 동일 라이브러리)로 각 캐릭터의 선언된
// dayMaster(일간)와 일치하도록 역검증했다. 모두 양력·정오대 시각이라 진태양시 보정에도 일주가 불변이며,
// getCharacterNormalizedSaju가 실인물과 동일한 결정론 엔진(computeNatalFromInput)으로 명식을 만든다.

import type { AnimalDestinyInput } from "../../animal-destiny/lib/types";
import type { NormalizedSaju } from "../_engine/compatibilityTypes";
import { normalizeCharacterChart } from "../_engine/normalizeSaju";
import type { CharacterId } from "./loveCodeMvp";

export const CHARACTER_BIRTH_CHARTS: Record<CharacterId, AnimalDestinyInput> = {
  "kang-taejun": { name: "강태준", birthDate: "1994-03-11", birthTime: "14:00", gender: "male", calendarType: "solar" }, // 일주 병신(丙)
  "kwon-sehyun": { name: "권세현", birthDate: "1991-09-17", birthTime: "14:00", gender: "male", calendarType: "solar" }, // 일주 경인(庚)
  michael: { name: "미카엘", birthDate: "1993-11-28", birthTime: "11:00", gender: "male", calendarType: "solar" }, // 일주 계축(癸)
  "seo-yuan": { name: "서유안", birthDate: "1990-05-14", birthTime: "13:00", gender: "male", calendarType: "solar" }, // 일주 기묘(己)
  "seo-ijun": { name: "서이준", birthDate: "1992-07-15", birthTime: "13:00", gender: "male", calendarType: "solar" }, // 일주 임진(壬)
  "yoon-siwoo": { name: "윤시우", birthDate: "1996-04-07", birthTime: "10:00", gender: "male", calendarType: "solar" }, // 일주 갑술(甲)
  "han-yunseo": { name: "한윤서", birthDate: "1995-08-14", birthTime: "10:00", gender: "male", calendarType: "solar" }, // 일주 정축(丁)
  "kim-ming": { name: "김밍", birthDate: "1997-02-18", birthTime: "13:00", gender: "female", calendarType: "solar" }, // 일주 신묘(辛)
  "park-jieun": { name: "박지은", birthDate: "1998-12-12", birthTime: "10:00", gender: "female", calendarType: "solar" }, // 일주 계사(癸)
  saebyeok: { name: "새벽", birthDate: "1993-06-24", birthTime: "13:00", gender: "female", calendarType: "solar" }, // 일주 병자(丙)
  seoyeon: { name: "서연", birthDate: "1999-10-20", birthTime: "11:00", gender: "female", calendarType: "solar" }, // 일주 을사(乙)
  soha: { name: "소화", birthDate: "1995-03-24", birthTime: "10:00", gender: "female", calendarType: "solar" }, // 일주 갑인(甲)
  jiyoon: { name: "지윤", birthDate: "1996-01-16", birthTime: "09:00", gender: "female", calendarType: "solar" }, // 일주 임자(壬)
  harin: { name: "하린", birthDate: "2000-05-09", birthTime: "14:00", gender: "female", calendarType: "solar" }, // 일주 정묘(丁)
  neo: { name: "네오", birthDate: "1992-11-01", birthTime: "15:00", gender: "male", calendarType: "solar" }, // 일주 신사(辛)
  yeoni: { name: "연이", birthDate: "1998-04-28", birthTime: "14:00", gender: "female", calendarType: "solar" }, // 일주 을사(乙)
};

const CHART_CACHE = new Map<CharacterId, NormalizedSaju | null>();

/** 캐릭터의 고정 원국을 정규화(메모 캐시). 실인물과 동일 엔진 경로. */
export function getCharacterNormalizedSaju(id: CharacterId): NormalizedSaju | null {
  if (!CHART_CACHE.has(id)) {
    const input = CHARACTER_BIRTH_CHARTS[id];
    CHART_CACHE.set(id, input ? normalizeCharacterChart(input) : null);
  }
  return CHART_CACHE.get(id) ?? null;
}
