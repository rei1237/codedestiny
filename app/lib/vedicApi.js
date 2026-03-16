/**
 * 베다점(조티시) API 클라이언트
 * 출생 정보를 서버로 보내 차트를 받아옵니다.
 * 에러 시 서버에서 내려준 우주 컨셉 메시지(userMessage)를 그대로 사용합니다.
 */

/** API 응답 실패 시 기본으로 표시할 메시지 (우주 컨셉) */
export const VEDIC_DEFAULT_ERROR_MESSAGE =
  "우주의 흐름을 읽는 중 잠시 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 출생 차트 요청
 * @param {Object} input - { name?, birthDate, birthTime, latitude, longitude, timezone? }
 * @param {string} [apiBase] - API 서버 베이스 URL (미지정 시 NEXT_PUBLIC_API_BASE_URL 또는 localhost:4000)
 * @returns {Promise<{ ok: boolean, chart?: object, userMessage?: string, normalizedParams?: object }>}
 */
export async function fetchVedicBirthChart(input, apiBase) {
  const base =
    apiBase ||
    (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_BASE_URL) ||
    "http://localhost:4000";
  const url = `${base.replace(/\/+$/, "")}/api/vedic/birth-chart`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
        ayanamsa: input.ayanamsa,
        language: input.language,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const userMessage = data.userMessage || data.message || VEDIC_DEFAULT_ERROR_MESSAGE;

    if (!res.ok) {
      return { ok: false, userMessage, code: data.code };
    }

    if (!data.ok || !data.chart) {
      return { ok: false, userMessage: data.userMessage || userMessage };
    }

    return {
      ok: true,
      chart: data.chart,
      normalizedParams: data.normalizedParams,
    };
  } catch (err) {
    return {
      ok: false,
      userMessage: VEDIC_DEFAULT_ERROR_MESSAGE,
      code: "NETWORK_ERROR",
    };
  }
}
