// Owned character artwork; callers select a preset, never an arbitrary image URL.
export function insightCharacter(brand) { return brand === 'yeongnyangi' ? 'yeongnyangi' : brand === 'neo' ? 'neo' : 'yeoni'; }
export function insightArtwork(brand) { return `/assets/sharing/${insightCharacter(brand)}-letter-v1.webp`; }
