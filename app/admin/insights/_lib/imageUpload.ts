export type UploadUsage = "featured" | "body";

export type UploadedInsightImage = {
  url: string;
  key: string;
  alt: string;
  width: number;
  height: number;
  mimeType: string;
  size: number;
};

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_UPLOAD_SIZE = 6 * 1024 * 1024;

function resolveAdminRequestCredentials(apiBase: string): RequestCredentials {
  if (typeof window === "undefined") return "include";

  const base = String(apiBase || "").trim();
  if (!base) return "include";

  try {
    return new URL(base).origin === window.location.origin ? "include" : "omit";
  } catch (e) {
    return "include";
  }
}

function validateClientFile(file: File): void {
  if (!file) throw new Error("이미지 파일을 선택해 주세요.");
  if (!ALLOWED_MIME_TYPES.has(String(file.type || "").toLowerCase())) {
    throw new Error("jpg, jpeg, png, webp 파일만 업로드할 수 있습니다.");
  }
  if (file.size <= 0) {
    throw new Error("빈 파일은 업로드할 수 없습니다.");
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("이미지 용량은 6MB 이하만 허용됩니다.");
  }
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => reject(new Error("이미지 크기를 읽지 못했습니다."));
      img.src = objectUrl;
    });
    return size;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function maybeConvertToWebp(file: File): Promise<File> {
  const lowerType = String(file.type || "").toLowerCase();
  if (lowerType !== "image/jpeg" && lowerType !== "image/png") {
    return file;
  }

  const { width, height } = await readImageDimensions(file);
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(width || 1, height || 1));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("이미지 최적화 중 로드에 실패했습니다."));
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

    const baseName = String(file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";

    return new File([webpBlob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadInsightImage(params: {
  apiBase?: string;
  file: File;
  usage: UploadUsage;
  alt: string;
  adminToken?: string;
}): Promise<UploadedInsightImage> {
  const apiBase = String(params.apiBase || "");
  const usage = params.usage;
  const alt = String(params.alt || "").trim().slice(0, 300);
  const adminToken = String(params.adminToken || "").trim();

  validateClientFile(params.file);

  const optimizedFile = await maybeConvertToWebp(params.file);
  validateClientFile(optimizedFile);

  const dimensions = await readImageDimensions(optimizedFile);

  const formData = new FormData();
  formData.append("file", optimizedFile);
  formData.append("usage", usage);
  formData.append("alt", alt);
  formData.append("width", String(dimensions.width || 0));
  formData.append("height", String(dimensions.height || 0));

  const endpoint = `${apiBase}/api/admin/insights/upload-image`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: resolveAdminRequestCredentials(apiBase),
    headers: FLOWER_ADMIN_TOKEN_RE.test(adminToken)
      ? { "x-admin-token": adminToken }
      : undefined,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("관리자 권한이 필요합니다. 다시 로그인해 주세요.");
    }
    throw new Error(String(data?.message || "이미지 업로드에 실패했습니다."));
  }

  const item = data?.item || {};
  return {
    url: String(item.url || ""),
    key: String(item.key || ""),
    alt: String(item.alt || ""),
    width: Math.max(0, Number(item.width || 0) || 0),
    height: Math.max(0, Number(item.height || 0) || 0),
    mimeType: String(item.mimeType || ""),
    size: Math.max(0, Number(item.size || 0) || 0),
  };
}
