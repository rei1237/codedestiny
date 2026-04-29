/**
 * Cloudflare Worker API Configuration
 * 모든 API 호출은 클라이언트 사이드에서만 실행됩니다.
 */

const WORKER_BASE_URL = "https://code-destiny-web.bulegyung.workers.dev";

/**
 * API 기본 URL을 반환합니다.
 * 로컬 개발: 로컬 서버 또는 환경변수
 * 프로덕션: Cloudflare Worker
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // 빌드 타임에는 Worker URL 반환 (실제 사용되지 않음)
    return WORKER_BASE_URL;
  }

  const hostname = window.location.hostname;
  
  // 로컬 개발 환경
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return (window as any).CODE_DESTINY_API_BASE_URL || 
           process.env.NEXT_PUBLIC_API_BASE_URL || 
           "http://localhost:4000";
  }
  
  // 프로덕션: Cloudflare Worker 사용
  return WORKER_BASE_URL;
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
