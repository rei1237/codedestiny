declare module 'virtual:consultation-webtoons' {
  const stories: typeof import('../../../lib/brand/consultation-webtoons.mjs').consultationWebtoons;
  export const coverDirectory: string;
  export default stories;
}

declare module 'virtual:service-guide' {
  export const quickGuideStories: typeof import('../../../lib/brand/service-guide-webtoon.mjs').quickGuideStories;
  export const guideGroups: typeof import('../../../lib/brand/service-guide-webtoon.mjs').guideGroups;
}
