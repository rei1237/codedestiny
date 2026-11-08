// Only the Toss package uses these same-size WebP derivatives. Web originals
// and their URLs remain unchanged. Sources/encoding are recorded in artwork.md.
export const TOSS_WEBP_ART = Object.freeze({
 '/assets/mascot/yeoni-reading-guide-v1.png': '/assets/toss-art/yeoni-reading-guide-v1.webp',
 '/assets/yeongnyangi/report-saju-yeongnyangi-v1.png': '/assets/toss-art/report-saju-yeongnyangi-v1.webp',
});

export function tossImageSource(source) {
 return typeof source==='string'&&Object.hasOwn(TOSS_WEBP_ART,source)?TOSS_WEBP_ART[source]:source;
}
