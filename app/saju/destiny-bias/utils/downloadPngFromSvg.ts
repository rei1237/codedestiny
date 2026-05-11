export async function downloadPngFromSvg(svgText: string, fileName: string) {
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

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((output) => resolve(output), "image/png");
    });

    if (!pngBlob) {
      throw new Error("PNG 변환에 실패했습니다.");
    }

    const pngUrl = URL.createObjectURL(pngBlob);
    try {
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = fileName;
      link.rel = "noopener";
      link.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(pngUrl), 300);
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300);
  }
}
