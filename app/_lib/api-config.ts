/**
 * Cloudflare Worker API Configuration
 * 모든 API 호출은 클라이언트 사이드에서만 실행됩니다.
 */

const WORKER_BASE_URL = "https://code-destiny-web.bulegyung.workers.dev";

/**
 * API 기본 URL을 반환합니다.
 * Static export를 위해 항상 Worker URL 직접 사용
 */
export function getApiBaseUrl(): string {
  // 빌드 타임/클라이언트 모두 Worker URL 사용
  // _redirects 파일이 /api/*를 Worker로 프록시
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // 로컬 개발
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return (window as any).CODE_DESTINY_API_BASE_URL || 
             process.env.NEXT_PUBLIC_API_BASE_URL || 
             WORKER_BASE_URL;
    }
  }
  
  // 프로덕션: Worker 직접 호출 또는 /api 프록시
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
