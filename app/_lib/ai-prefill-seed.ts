import { readCurrentDestinyProfile, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";

export type AiPrefillSeed = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: "solar" | "lunar";
  timezone?: string;
  city?: string;
  country?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
};

function trimValue(value: unknown): string {
  return String(value || "").trim();
}

function splitSeedRegion(value: unknown): [string, string] {
  const normalized = trimValue(value);
  if (!normalized) return ["", ""];
  const commaParts = normalized
    .split(",")
    .map((entry) => trimValue(entry))
    .filter(Boolean);
  if (commaParts.length >= 2) {
    return [commaParts[0], commaParts.slice(1).join(", ")];
  }
  const slashParts = normalized
    .split("/")
    .map((entry) => trimValue(entry))
    .filter(Boolean);
  if (slashParts.length >= 2) {
    return [slashParts[0], slashParts.slice(1).join(" / ")];
  }
  return [normalized, ""];
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 0) return false;
    if (value === 1) return true;
  }
  return undefined;
}

function toCalendarType(value: unknown): "solar" | "lunar" | undefined {
  const raw = trimValue(value).toLowerCase();
  if (!raw) return undefined;
  if (["lunar", "lun", "luna", "음력"].includes(raw)) return "lunar";
  if (["solar", "sol", "solaris", "양력"].includes(raw)) return "solar";
  return undefined;
}

function normalizeGender(value: unknown): string | undefined {
  const raw = trimValue(value).toLowerCase();
  if (!raw) return undefined;
  if (["male", "m", "man", "남", "남성", "남자"].includes(raw)) return "male";
  if (["female", "f", "woman", "여", "여성", "여자"].includes(raw)) return "female";
  if (["unknown", "none", "notset"].includes(raw)) return "unknown";
  return raw;
}
function formatHourMinute(value: unknown): string {
  const raw = trimValue(value);
  if (!raw) return "";
  if (/^\d{1,2}:\d{2}$/u.test(raw)) {
    const [hour, minute] = raw.split(":");
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  if (/^\d{3,4}$/u.test(raw)) {
    const hour = raw.slice(0, -2).padStart(2, "0");
    const minute = raw.slice(-2).padStart(2, "0");
    return `${hour}:${minute}`;
  }
  return "";
}

function toDecimalString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const raw = trimValue(value);
  if (!raw) return undefined;
  const normalized = Number(raw);
  if (Number.isFinite(normalized)) return String(normalized);
  return undefined;
}

export function readAiProfileSeed(): AiPrefillSeed {
  return seedFromDestinyProfile(readCurrentDestinyProfile());
}

export function seedFromDestinyProfile(profile: DestinyProfileCard | null | undefined): AiPrefillSeed {
  if (!profile) return {};

  const seed: AiPrefillSeed = {};
  const name = trimValue(profile.name);
  const birthDate = trimValue(profile.birthDate);
  const directBirthTime = formatHourMinute(profile.birthTime);
  const hour = formatHourMinute(profile.birthHour);
  const minute = formatHourMinute(profile.birthMinute);
  const calendarType = toCalendarType(profile.calType ?? profile.calendarType);
  const birthTimeUnknown = toBool(profile.timeUnknown ?? profile.birthTimeUnknown ?? profile.noBirthTime);

  if (name) seed.name = name;
  if (birthDate) seed.birthDate = birthDate;
  if (calendarType) seed.calendarType = calendarType;
  if (birthTimeUnknown !== undefined) seed.birthTimeUnknown = birthTimeUnknown;
  if (directBirthTime) {
    seed.birthTime = directBirthTime;
  } else if (hour || minute) {
    const hh = hour || "00";
    const mm = minute || "00";
    seed.birthTime = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  const gender = normalizeGender(profile.gender);
  if (gender) seed.gender = gender;

  const [seedCity, seedCountry] = splitSeedRegion(profile.birthRegion);
  if (seedCity || seedCountry) {
    const region = [seedCity, seedCountry].filter(Boolean).join(", ");
    seed.region = region || trimValue(profile.birthRegion);
    if (seedCity) seed.city = seedCity;
    if (seedCountry) seed.country = seedCountry;
  }

  const profileLocation = (profile as { location?: { tz?: unknown; timezone?: unknown; lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown } }).location;
  const timezone = trimValue(profileLocation?.tz ?? profileLocation?.timezone ?? (profile as { timezone?: unknown }).timezone ?? (profile as { tz?: unknown }).tz);
  if (timezone) seed.timezone = timezone;

  const latitude = toDecimalString(
    profileLocation?.lat ?? profileLocation?.latitude ?? (profile as { latitude?: unknown }).latitude,
  );
  const longitude = toDecimalString(
    profileLocation?.lng ?? profileLocation?.longitude ?? (profile as { longitude?: unknown }).longitude,
  );
  if (latitude) seed.latitude = latitude;
  if (longitude) seed.longitude = longitude;

  return seed;
}

