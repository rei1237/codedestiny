// The engine returns Korean stem/branch codes. Only the sexagenary cycle is valid.
export const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
export const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const STEM_ASSETS = ['gap','eul','byeong','jeong','mu','gi','gyeong','sin','im','gye'];
export const ILJU = Array.from({ length: 60 }, (_, i) => ({
  name: STEMS[i % 10] + BRANCHES[i % 12], stem: STEMS[i % 10],
  slug: `cycle-${String(i + 1).padStart(2, '0')}`, image: STEM_ASSETS[i % 10],
}));
