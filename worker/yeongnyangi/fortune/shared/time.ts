import { BirthProfile, FortuneError } from "./contracts";
// Resolve wall-clock time with IANA history. Reject skipped/repeated DST times.
export function chartInput(profile: BirthProfile) {
  if (!profile.birthTime || !profile.birthPlace)
    throw new FortuneError("BIRTH_PLACE_REQUIRED");
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour, minute] = profile.birthTime.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.birthPlace.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  function offset(t: number) {
    const parts = Object.fromEntries(
      formatter.formatToParts(t).map((p) => [p.type, p.value]),
    );
    return (
      Date.UTC(
        +parts.year,
        +parts.month - 1,
        +parts.day,
        +parts.hour,
        +parts.minute,
        +parts.second,
      ) - t
    );
  }
  const offsets = new Set(
    [-2, -1, 0, 1, 2].map((d) => offset(wall + d * 86400000)),
  );
  const valid = [...offsets].filter((o) => offset(wall - o) === o);
  if (valid.length !== 1) throw new FortuneError("AMBIGUOUS_BIRTH_TIME");
  return {
    year,
    month,
    day,
    hour,
    minute,
    timezone: valid[0] / 3600000,
    lat: profile.birthPlace.latitude,
    lon: profile.birthPlace.longitude,
    utc: new Date(wall - valid[0]),
  };
}
