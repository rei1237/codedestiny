// 첨부 스크린샷 업로드.
//
// app/admin/insights/_lib/imageUpload.ts 의 클라이언트 검증 + webp 축소 로직을 그대로 따르고
// 관리자 토큰 대신 authFetch 를 쓴다.

import { authFetch } from "@/app/_lib/auth-client";
import { FeedbackApiError, type FeedbackAttachment } from "./api";
import type { FeedbackCopy } from "./copy";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// 🔴 클라이언트 상한은 서버 상한(6MB) 이하여야 한다. 넘으면 긴 업로드가 끝난 뒤에야 413 이 난다.
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_SIDE = 2400;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function validateClientFile(file: File, copy: FeedbackCopy): void {
  if (!file) throw new Error(copy.uploadErrorNoFile);
  if (!ALLOWED_MIME_TYPES.has(String(file.type || "").toLowerCase())) {
    throw new Error(copy.uploadErrorBadType);
  }
  if (file.size <= 0) throw new Error(copy.uploadErrorEmptyFile);
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(copy.uploadErrorTooLarge(formatBytes(MAX_UPLOAD_SIZE)));
  }
}

async function readImageDimensions(file: File, copy: FeedbackCopy): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => reject(new Error(copy.uploadErrorDimensionRead));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** jpg/png 를 2400px 이하 webp 로 줄여 업로드 시간과 저장 용량을 아낀다. 실패하면 원본을 그대로 쓴다. */
async function maybeConvertToWebp(file: File, copy: FeedbackCopy): Promise<File> {
  const lowerType = String(file.type || "").toLowerCase();
  if (lowerType !== "image/jpeg" && lowerType !== "image/png") return file;

  try {
    const { width, height } = await readImageDimensions(file, copy);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width || 1, height || 1));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = () => reject(new Error(copy.uploadErrorOptimizeLoad));
        next.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const webpBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/webp", 0.86);
      });
      if (!webpBlob) return file;

      const baseName = String(file.name || "screenshot")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "screenshot";

      return new File([webpBlob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // 캔버스 변환 실패는 치명적이지 않다 — 원본으로 계속 진행한다.
    return file;
  }
}

export async function uploadFeedbackAttachment(file: File, copy: FeedbackCopy): Promise<FeedbackAttachment> {
  validateClientFile(file, copy);

  const optimized = await maybeConvertToWebp(file, copy);
  validateClientFile(optimized, copy);

  const formData = new FormData();
  formData.append("file", optimized);

  // authFetch 는 multipart 안전하다 — Content-Type 을 강제하지 않아 브라우저가 boundary 를 쓴다.
  // 다만 401 재시도 시 같은 init 으로 Request 를 다시 만들기 때문에 파일이 통째로 재업로드된다
  // (FormData 는 소비된 스트림이 아니라 재사용은 가능). 5MB 상한에서는 감수할 만하다.
  const response = await authFetch("/api/feedback/attachments", { method: "POST", body: formData });
  const data = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    const status = response.status;
    const serverMessage = String((data as { message?: string })?.message || "");
    const message = serverMessage
      || (status === 413 ? copy.uploadErrorTooLargeShort : "")
      || (status === 503 ? copy.uploadErrorStorageUnavailable : "")
      || copy.uploadErrorGeneric;
    throw new FeedbackApiError(message, status, String((data as { code?: string })?.code || ""));
  }

  const item = (data as { item?: Partial<FeedbackAttachment> })?.item || {};
  return {
    key: String(item.key || ""),
    url: String(item.url || ""),
    mimeType: String(item.mimeType || ""),
    size: Math.max(0, Number(item.size || 0) || 0),
  };
}

/** 드롭·붙여넣기·파일선택에서 온 목록을 이미지만 남기고 남은 슬롯만큼 자른다. */
export function pickImageFiles(files: FileList | File[] | null, remainingSlots: number): File[] {
  if (!files || remainingSlots <= 0) return [];
  return Array.from(files)
    .filter((file) => ALLOWED_MIME_TYPES.has(String(file.type || "").toLowerCase()))
    .slice(0, remainingSlots);
}
