/** Effective birth-date offset, including historic daylight saving. */
export function ianaOffsetHours(year, month, day, hour, minute, timezone, fallback = 9) {
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
