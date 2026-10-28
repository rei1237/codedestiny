/** Report-specific palettes follow the existing service worlds, never a global PDF skin. */
export const REPORT_COVER_THEMES = {
  newYear: { paper: [42,16,24], ink: [247,235,213], muted: [226,200,161], accent: [201,162,39], artwork: 'new-year-ai' },
  ziwei: { paper: [22,25,46], ink: [248,244,236], muted: [218,207,233], accent: [222,193,126], artwork: 'ziwei-ai' },
  astrology: { paper: [12,26,48], ink: [236,243,250], muted: [191,212,232], accent: [183,204,225], artwork: 'astrology-ai' },
  vedic: { paper: [67,38,27], ink: [255,244,223], muted: [232,205,172], accent: [232,174,87], artwork: 'vedic-ai' },
  lifeBook: { paper: [21,39,33], ink: [245,240,229], muted: [215,205,175], accent: [211,189,131], artwork: 'life-book-ai' },
  love: { paper: [251,240,236], ink: [64,37,48], muted: [112,74,87], accent: [139,81,105], artwork: 'love-secret-ai' },
  karma: { paper: [34,23,43], ink: [246,235,248], muted: [213,193,222], accent: [203,170,143], artwork: 'karma-destiny-ai' },
  sukuyo: { paper: [24,27,53], ink: [242,238,250], muted: [207,201,228], accent: [205,189,230], artwork: 'sukuyo' },
} as const;
export type ReportCoverTheme = keyof typeof REPORT_COVER_THEMES;
