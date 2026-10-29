import tzLookup from "tz-lookup";
const GEOCODE_FALLBACK_SEOUL = {
  lat: 37.5665,
  lng: 126.978,
  name: "서울 (기본값)",
  timezone: "Asia/Seoul",
  fallback: true,
};

function cleanGeocodeText(value, maxLength = 0) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function validGeocodeCoordinates(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

export async function geocodePlace(placeInput, fetcher = fetch) {

  const place = cleanGeocodeText(placeInput, 120);
  if (!place) return { data: { error: "NO_PLACE" }, status: 400 };

  try {
    const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
    geocodeUrl.searchParams.set("q", place);
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("accept-language", "ko,en");
    // 좌표를 IANA 시간대로 변환해 한 국가 안의 여러 시간대도 구분한다.
    geocodeUrl.searchParams.set("addressdetails", "1");

    const response = await fetcher(geocodeUrl.toString(), {
      headers: { "User-Agent": "CodeDestiny/1.0 (geocode)" },
    });
    if (!response.ok) return { data: GEOCODE_FALLBACK_SEOUL, status: 200 };

    const payload = await response.json().catch(() => null);
    const first = Array.isArray(payload) ? payload[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!first || !validGeocodeCoordinates(lat, lng)) return { data: GEOCODE_FALLBACK_SEOUL, status: 200 };

    return { status: 200, data: {
      lat,
      lng,
      name: cleanGeocodeText(first.display_name || place, 180),
      timezone: tzLookup(lat, lng),
      fallback: false,
    } };
  } catch {
    return { data: GEOCODE_FALLBACK_SEOUL, status: 200 };
  }
}

