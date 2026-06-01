async function triggerBlobDownload(blob: Blob, fileName: string) {
  const pngUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = fileName;
    link.rel = "noopener";
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(pngUrl), 300);
  }
}

async function createPngBlobFromPreviewElement(previewElement: HTMLElement) {
  const [{ toBlob }] = await Promise.all([
    import("html-to-image"),
    document.fonts?.ready ?? Promise.resolve(),
  ]);

  const rect = previewElement.getBoundingClientRect();
  const pixelRatio = Math.min(3, Math.max(2, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2));

  return toBlob(previewElement, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: "transparent",
    canvasWidth: Math.max(1, Math.round(rect.width * pixelRatio)),
    canvasHeight: Math.max(1, Math.round(rect.height * pixelRatio)),
  });
}

async function createPngBlobFromSvg(svgText: string) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("SVG 이미지를 읽을 수 없습니다."));
      img.src = blobUrl;
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.documentElement;

    const width = Number(svg.getAttribute("width") || 1080);
    const height = Number(svg.getAttribute("height") || 1680);

    const canvas = document.createElement("canvas");
    canvas.width = Number.isFinite(width) ? width : 1080;
    canvas.height = Number.isFinite(height) ? height : 1680;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((output) => resolve(output), "image/png");
    });

    if (!pngBlob) {
      throw new Error("PNG 변환에 실패했습니다.");
    }

    return pngBlob;
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300);
  }
}

export async function buildPngBlobFromDestinyBiasCard(svgText: string) {
  const previewElement = typeof document !== "undefined"
    ? document.getElementById("destiny-bias-card-preview") as HTMLElement | null
    : null;

  if (previewElement) {
    try {
      const domBlob = await createPngBlobFromPreviewElement(previewElement);
      if (domBlob) return domBlob;
    } catch {
      // DOM 캡처가 실패하면 SVG->Canvas 방식으로 폴백
    }
  }

  return createPngBlobFromSvg(svgText);
}

export async function downloadPngFromSvg(svgText: string, fileName: string) {
  const pngBlob = await buildPngBlobFromDestinyBiasCard(svgText);
  await triggerBlobDownload(pngBlob, fileName);
}
