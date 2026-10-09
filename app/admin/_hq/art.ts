// 별빛 운영본부 일러스트 경로 — 관리자 화면에서만 참조한다(공개 화면 번들에는 실리지 않는다).
// 원본·프롬프트·참조 정본은 public/assets/admin-hq/manifest.json 에 남긴다.
// 🔴 네오는 정본 외형(은발·네이비 제복의 인간 전략가)이다. 🦁 는 문장 모티프로만 쓴다.

export interface HqArtItem {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const HQ_ART = {
  background: null as HqArtItem | null,
  yeongnyangiGuide: { src: "/assets/yeongnyangi/expressions/welcome.webp", alt: "안내하는 영냥이", width: 128, height: 128 },
  yeongnyangiCelebrate: { src: "/assets/yeongnyangi/original/expression-happy.webp", alt: "기뻐하는 영냥이", width: 160, height: 150 },
  yeongnyangiFocus: { src: "/assets/yeongnyangi/expressions/curious.webp", alt: "집중하는 영냥이", width: 128, height: 128 },
  yeoniLibrary: { src: "/assets/mascot/yeoni-reading-guide-v1.webp", alt: "서재의 연이", width: 640, height: 640 },
  neoGuardian: { src: "/neo-operation-room/briefing/neo-explain-v1.webp", alt: "관제실의 네오", width: 480, height: 720 },
} satisfies Record<string, HqArtItem | null>;

/** 등급 문장 이미지(6단계, Lv 1·5·10·20·30·40). 없으면 RankEmblem 이 SVG 문장을 그린다. */
export const RANK_EMBLEM_ART: (HqArtItem | null)[] = [null, null, null, null, null, null];

export const KEEPER_ART: Record<string, HqArtItem> = {
  영냥이: HQ_ART.yeongnyangiGuide,
  연이: HQ_ART.yeoniLibrary,
  네오: HQ_ART.neoGuardian,
};
