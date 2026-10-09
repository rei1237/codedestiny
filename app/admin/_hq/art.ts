// 별빛 운영본부 일러스트 경로 — 관리자 화면에서만 참조한다(공개 화면 번들에는 실리지 않는다).
// 생성 원본은 assets/admin-hq/originals/, 프롬프트·참조 정본·크기·해시는 public/assets/admin-hq/manifest.json 에 남긴다.
// 🔴 네오는 정본 외형(은발·네이비 제복의 인간 전략가)이다. 🦁 는 문장 모티프로만 쓴다.

export interface HqArtItem {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const ART = "/assets/admin-hq";

export const HQ_ART = {
  /** 장식 — 글자는 히어로 그라디언트가 대비를 지킨다. */
  background: { src: `${ART}/guild-observatory-bg.webp`, alt: "", width: 1920, height: 640 },
  yeongnyangiGuide: { src: `${ART}/yeongnyangi-guide-avatar.webp`, alt: "안내하는 영냥이", width: 176, height: 176 },
  /** 전신 — 레벨업 연출용. 원형 자리에는 아래 얼굴 크롭을 쓴다. */
  yeongnyangiCelebrate: { src: `${ART}/yeongnyangi-celebrate.webp`, alt: "기뻐하는 영냥이", width: 623, height: 640 },
  yeongnyangiCelebrateAvatar: { src: `${ART}/yeongnyangi-celebrate-avatar.webp`, alt: "기뻐하는 영냥이", width: 176, height: 176 },
  yeongnyangiFocus: { src: `${ART}/yeongnyangi-focus-avatar.webp`, alt: "집중하는 영냥이", width: 176, height: 176 },
  yeoniLibrary: { src: `${ART}/yeoni-library-avatar.webp`, alt: "서재의 연이", width: 176, height: 176 },
  neoGuardian: { src: `${ART}/neo-guardian-avatar.webp`, alt: "관제실의 네오", width: 176, height: 176 },
} satisfies Record<string, HqArtItem | null>;

/** 등급 문장 이미지(6단계, Lv 1·5·10·20·30·40). 못 불러오면 RankEmblem 이 SVG 문장을 그린다. */
export const RANK_EMBLEM_ART: (HqArtItem | null)[] = [1, 5, 10, 20, 30, 40].map((level) => ({
  src: `${ART}/rank-emblem-lv${level}.webp`,
  alt: "",
  width: 256,
  height: 256,
}));

export const KEEPER_ART: Record<string, HqArtItem> = {
  영냥이: HQ_ART.yeongnyangiGuide,
  연이: HQ_ART.yeoniLibrary,
  네오: HQ_ART.neoGuardian,
};
