// Only the Toss package uses these same-size WebP derivatives. Web originals
// and their URLs remain unchanged. Sources/encoding are recorded in artwork.md.
export const TOSS_WEBP_ART = Object.freeze({
 '/assets/mascot/yeoni-reading-guide-v1.png': '/assets/toss-art/yeoni-reading-guide-v1.webp',
 '/assets/yeongnyangi/report-saju-yeongnyangi-v1.png': '/assets/toss-art/report-saju-yeongnyangi-v1.webp',
});

export function tossImageSource(source) {
 // Phones already request this exact 480px original through <picture>; use it on larger miniapp windows too.
 if(typeof source==='string'&&/^\/images\/psychotest\/bmovie-v1\/[a-z]+-960\.webp$/.test(source))return source.replace('-960.webp','-480.webp');
 return typeof source==='string'&&Object.hasOwn(TOSS_WEBP_ART,source)?TOSS_WEBP_ART[source]:source;
}
