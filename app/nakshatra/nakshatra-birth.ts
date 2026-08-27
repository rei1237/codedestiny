// 나크샤트라 결정판 폼 — 출생 정보 유틸(정밀 UTC·프로필 카드·음력 변환).
// resolve API가 timezone을 "숫자 오프셋"으로 받으므로 IANA 문자열을 숫자로 변환하고,
// 프로필 카드(음력 저장분 포함)를 양력 폼 값으로 정규화한다.

import { authFetch } from "@/app/_lib/auth-client";
import { seedFromDestinyProfile, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import {
  normalizeDestinyProfileCard,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";

export interface PlacePreset {
  label: string;
  latitude: string;
  longitude: string;
  timezone: string; // IANA
}

// 출생지 프리셋(위경도·IANA 타임존). datalist 자동완성 + 정밀 UTC 계산용.
export const PLACE_PRESETS: PlacePreset[] = [
  { label: "서울, 한국", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { label: "부산, 한국", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { label: "인천, 한국", latitude: "37.4563", longitude: "126.7052", timezone: "Asia/Seoul" },
  { label: "대구, 한국", latitude: "35.8714", longitude: "128.6014", timezone: "Asia/Seoul" },
  { label: "광주, 한국", latitude: "35.1595", longitude: "126.8526", timezone: "Asia/Seoul" },
  { label: "대전, 한국", latitude: "36.3504", longitude: "127.3845", timezone: "Asia/Seoul" },
  { label: "제주, 한국", latitude: "33.4996", longitude: "126.5312", timezone: "Asia/Seoul" },
  { label: "Tokyo, Japan", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { label: "Delhi, India", latitude: "28.6139", longitude: "77.2090", timezone: "Asia/Kolkata" },
  { label: "Mumbai, India", latitude: "19.0760", longitude: "72.8777", timezone: "Asia/Kolkata" },
  { label: "New York, USA", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { label: "Los Angeles, USA", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
];

/**
 * IANA 타임존 문자열을 특정 출생 순간의 숫자 오프셋(시)으로 변환. 역사적 DST 반영.
 * 예: "Asia/Seoul" → 9, "Asia/Kolkata" → 5.5, "America/Los_Angeles"(여름) → -7.
 */
export function ianaOffsetHours(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string | undefined,
  fallback = 9,
): number {
  if (!timezone) return fallback;
  try {
    const instant = new Date(Date.UTC(year, month - 1, day, hour || 0, minute || 0));
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      hour: "numeric",
    });
    const name = formatter.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value || "";
    const matched = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!matched) return fallback;
    const sign = matched[1] === "-" ? -1 : 1;
    return sign * (Number(matched[2]) + Number(matched[3] || 0) / 60);
  } catch {
    return fallback;
  }
}

function isLunarCalType(calType: unknown): boolean {
  const value = String(calType || "").toLowerCase();
  return value.includes("lun") || value.includes("음");
}

/**
 * 음력(윤달 포함) 생년월일을 양력으로 변환. resolve는 양력만 받는다.
 *
 * 🔴 한국 음양력 코어를 **lazy 로드**한다. 표가 gzip 26.6KB 라 첫 화면 번들에 넣지 않는다 —
 *    예전에 lunar-javascript 를 lazy 로드하던 이유와 같다.
 * 🔴 코어로 옮긴 이유: 중국 음력(lunar-javascript)은 3.68% 의 음력 날짜에서 하루 어긋나고
 *    (실측 2026-08-27) 그 양력일이 그대로 서버로 간다. 서버는 이미 코어를 쓰므로,
 *    여기만 두면 음력 입력자만 두 달력이 섞인 결과를 받는다.
 */
export async function toSolarYmd(
  year: number,
  month: number,
  day: number,
  calType: unknown,
): Promise<{ year: number; month: number; day: number }> {
  if (!isLunarCalType(calType)) return { year, month, day };
  const isLeap = String(calType || "").toLowerCase().includes("leap") || String(calType || "").includes("윤");
  try {
    const { lunarToSolar } = await import("@/lib/korean-calendar");
    const solar = lunarToSolar(year, Math.abs(month), day, isLeap);
    if (!solar) return { year, month, day };
    return { year: solar.year, month: solar.month, day: solar.day };
  } catch {
    return { year, month, day };
  }
}

/** 로그인 사용자의 저장 프로필 카드 목록. 게스트·실패 시 빈 배열(무인증 안전). */
export async function fetchNakshatraProfileCards(): Promise<DestinyProfileCard[]> {
  if (typeof window === "undefined") return [];
  try {
    const response = await authFetch("/api/profile", { method: "GET" }, { retryOn401: false });
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    const list = Array.isArray(payload?.profiles) ? payload.profiles : [];
    return list
      .map((card: DestinyProfileCard) => normalizeDestinyProfileCard(card))
      .filter((card: DestinyProfileCard | null): card is DestinyProfileCard => Boolean(card));
  } catch {
    return [];
  }
}

/** resolve/premium API 가 받는 숫자형 출생 입력. */
export interface NakshatraBirthInput {
  year: number; month: number; day: number; hour: number; minute: number;
  timezone: number; lat: number; lon: number; timeUnknown: boolean;
  gender?: "male" | "female" | "";
}

function toText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

/**
 * 프로필 카드 시드 → 나크샤트라 입력.
 * 홈 '대표 운명 상담' 카드에서 바로 들어온 사람은 /nakshatra/calc 를 거치지 않아
 * sessionStorage 가 비어 있고, 그대로 두면 결제창이 아니라 "먼저 별을 계산해 주세요"
 * 막다른 길에 떨어진다. 음력 카드는 변환이 /nakshatra/calc 에 있으므로 여기서 추정하지 않는다.
 */
export function birthFromProfileSeed(seed: AiPrefillSeed | null): NakshatraBirthInput | null {
  if (!seed || seed.calendarType === "lunar") return null;
  const matchedDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(toText(seed.birthDate));
  if (!matchedDate) return null;
  const year = Number(matchedDate[1]);
  const month = Number(matchedDate[2]);
  const day = Number(matchedDate[3]);
  if (!year || !month || !day) return null;
  const matchedTime = seed.birthTimeUnknown ? null : /^(\d{1,2}):(\d{2})$/.exec(toText(seed.birthTime));
  const lat = Number(seed.latitude);
  const lon = Number(seed.longitude);
  return {
    year,
    month,
    day,
    hour: matchedTime ? Number(matchedTime[1]) : 12,
    minute: matchedTime ? Number(matchedTime[2]) : 0,
    timezone: Number(seed.timezone) || 9,
    lat: Number.isFinite(lat) && lat !== 0 ? lat : 37.5665,
    lon: Number.isFinite(lon) && lon !== 0 ? lon : 126.978,
    timeUnknown: !matchedTime,
    gender: seed.gender === "male" || seed.gender === "female" ? seed.gender : "",
  };
}

export interface NakshatraFormValues {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  timeUnknown: boolean;
  birthPlace: string;
  latitude: string;
  longitude: string;
  timezone: string; // IANA
  lunarConverted: boolean;
}

/** 프로필 카드 → 양력 폼 값(음력이면 변환). 파싱 불가면 null. */
export async function cardToFormValues(card: DestinyProfileCard): Promise<NakshatraFormValues | null> {
  const parts = resolveDestinyProfileBirthParts(card);
  if (!parts) return null;
  const seed = seedFromDestinyProfile(card);
  const calType = card.calType ?? card.birth?.calType ?? card.calendarType ?? seed.calendarType;
  const solar = await toSolarYmd(parts.year, parts.month, parts.day, calType);

  let hour = "";
  let minute = "";
  if (seed.birthTime && /^\d{1,2}:\d{2}$/.test(seed.birthTime)) {
    [hour, minute] = seed.birthTime.split(":");
  }
  const timeUnknown = seed.birthTimeUnknown === true;

  return {
    name: seed.name || card.name || "",
    year: String(solar.year),
    month: String(solar.month),
    day: String(solar.day),
    hour: timeUnknown ? "" : hour,
    minute: timeUnknown ? "" : minute,
    timeUnknown,
    birthPlace: seed.region || card.location?.label || "",
    latitude: seed.latitude || (card.location?.lat != null ? String(card.location.lat) : ""),
    longitude: seed.longitude || (card.location?.lng != null ? String(card.location.lng) : ""),
    timezone: seed.timezone || card.location?.tz || "Asia/Seoul",
    lunarConverted: isLunarCalType(calType),
  };
}

/** 카드 대표 라벨(picker 칩 표시용). */
export function cardChipLabel(
  card: DestinyProfileCard,
  copy: { formLunarSuffix: string; formNoNameLabel: string },
): { name: string; detail: string } {
  const parts = resolveDestinyProfileBirthParts(card);
  const dateText = parts
    ? `${parts.year}.${String(parts.month).padStart(2, "0")}.${String(parts.day).padStart(2, "0")}`
    : "";
  const calType = card.calType ?? card.birth?.calType ?? card.calendarType;
  const cal = isLunarCalType(calType) ? copy.formLunarSuffix : "";
  const region = card.location?.label || card.birthRegion || "";
  const detail = [dateText ? dateText + cal : "", region].filter(Boolean).join(" · ");
  return { name: card.name || copy.formNoNameLabel, detail };
}
