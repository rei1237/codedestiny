import { buildMusicPublicUrl } from "@/lib/r2-public-url";

// 음악 플레이어(app/music/_data/musicManifest.ts)에서 실제로 사용 중인 앨범 커버.
// 최애운명 스테이지 연출의 시각 자원으로만 쓰이며, 재생/구매 등 음악 기능과는 연결하지 않는다.

export const DESTINY_BIAS_FALLBACK_ALBUM_SRC = "/music-covers/yeoni-1st-album.webp";

export type DestinyBiasAlbumAsset = {
  id: string;
  title: string;
  caption: string;
  src: string;
};

export const DESTINY_BIAS_STAGE_ALBUM: DestinyBiasAlbumAsset = {
  id: "yeoni-1st",
  title: "꽃돼지 1집",
  caption: "MAIN STAGE",
  src: DESTINY_BIAS_FALLBACK_ALBUM_SRC,
};

export const DESTINY_BIAS_LINEUP_ALBUMS: DestinyBiasAlbumAsset[] = [
  DESTINY_BIAS_STAGE_ALBUM,
  {
    id: "dest1nova-humanmode",
    title: "데스티노바 인간버전",
    caption: "OPENING ACT",
    src: buildMusicPublicUrl("humanmode/데스티노바 인간버전 앨범.webp"),
  },
  {
    id: "destiny-cafe",
    title: "운명의 찻집",
    caption: "ENCORE",
    // musicManifest의 destinycafe displayCoverUrl과 동일한 리터럴(assets 베이스 env 미설정 시 throw 방지)
    src: "https://assets.code-destiny.com/DestinyCafe/%EC%9A%B4%EB%AA%85%EC%9D%98%20%EC%B0%BB%EC%A7%91.webp",
  },
];

// 정사각 커버 원본 크기 (CLS 방지용 width/height 명시에 사용)
export const DESTINY_BIAS_ALBUM_SIZE = 900;
