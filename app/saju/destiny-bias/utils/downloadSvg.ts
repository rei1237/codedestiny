export function downloadSvg(svgText: string, fileName: string) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 300);
  }
}
