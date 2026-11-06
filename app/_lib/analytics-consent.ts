export function savedAnalyticsConsent(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)cd_cookie_consent=([^;]*)/);
    const value = match ? decodeURIComponent(match[1]) : "";
    return value === "accepted" || value === "essential" ? value : "";
  } catch { return ""; }
}
