/**
 * Cloudflare Worker API Configuration
 * 모든 API 호출은 클라이언트 사이드에서만 실행됩니다.
 */

const WORKER_BASE_URL = "https://code-destiny-web.bulegyung.workers.dev";

/**
 * API 기본 URL을 반환합니다.
 * 로컬 개발: Worker 직접 호출 (CORS 필요)
 * 프로덕션: Same-origin /api (Pages Functions 라우팅)
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // 빌드 타임: same-origin 사용 (실제 fetch는 클라이언트에서만)
    return "/api";
  }

  const hostname = window.location.hostname;
  
  // 로컬 개발: Worker 직접 호출
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return (window as any).CODE_DESTINY_API_BASE_URL || 
           process.env.NEXT_PUBLIC_API_BASE_URL || 
           WORKER_BASE_URL;
  }
  
  // 프로덕션: Same-origin /api (Pages가 Worker로 라우팅)
  return "/api";
}

/**
 * API 엔드포인트 URL을 생성합니다.
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * 안전한 fetch wrapper
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}
