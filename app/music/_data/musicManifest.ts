import { buildMusicPublicUrl } from "@/lib/r2-public-url";
import { getMusicTrackAccessPolicy } from "@/lib/music-access-policy";

// 잠금곡은 공개 CDN URL을 노출하지 않고, 서버가 바이트를 제한하는 미리듣기 프록시를 사용한다.
function buildMusicPreviewApiUrl(audioSourceKey: string, featureKey?: string) {
  const params = new URLSearchParams();
  params.set("key", audioSourceKey);
  if (featureKey) params.set("featureKey", featureKey);
  params.set("mode", "preview");
  return `/api/music/audio?${params.toString()}`;
}

export type ArtistKey = "neo" | "yeoni" | "dest1nova" | "lunabloom" | "destinycafe" | "meditation";
export type ArtistName = "Neo" | "Yeoni" | "DEST1NOVA" | "Luna bloom" | "Meditation";

export type Track = {
  id: string;
  artistKey: ArtistKey;
  artistName: ArtistName;
  title: string;
  audioKey: string;
  audioSourceKey: string;
  coverKey: string;
  audioUrl: string;
  coverUrl: string;
  durationSeconds?: number;
  mood?: string;
  order?: number;
  lyricsLookupKey?: string;
  accessTier: "free_full" | "locked_preview";
  previewLimitSeconds?: number;
  purchaseFeatureKey?: string;
  priceKRW?: number;
  coinCost?: number;
  // 재생은 free_full로 무료지만 MP3 다운로드는 구매가 필요한 트랙 표시.
  downloadRequiresPurchase?: boolean;
  downloadFileName: string;
};

type MusicFolder = "neosong" | "yeonisong" | "neosongmini1" | "yeonisongmini1" | "DEST1NOVA" | "DEST1NOVA/DEST1NOVA 2집" | "lunabloom" | "DestinyCafe" | "DestinyWar" | "Meditation";

type ArtistConfig = {
  artistKey: ArtistKey;
  artistName: ArtistName;
  folder: MusicFolder;
  fallbackCoverFileName: string;
  coverFileNames: readonly string[];
  displayCoverUrl?: string;
  noCover?: boolean;
};

type AudioFileEntry = string | null | {
  fileName: string;
  audioFolder?: MusicFolder;
};

type ArtistAudioManifest = {
  artistKey: ArtistKey;
  folder?: MusicFolder;
  audioFolder?: MusicFolder;
  fallbackCoverFileName?: string;
  coverFileNames?: readonly string[];
  displayCoverUrl?: string;
  audioFileNames: readonly AudioFileEntry[];
};

const ARTISTS = {
  neo: {
    artistKey: "neo",
    artistName: "Neo",
    folder: "neosong",
    fallbackCoverFileName: "네오 데뷔.webp",
    coverFileNames: ["네오 데뷔.webp"],
    displayCoverUrl: undefined,
  },
  yeoni: {
    artistKey: "yeoni",
    artistName: "Yeoni",
    folder: "yeonisong",
    fallbackCoverFileName: "꽃돼지 1집.png",
    coverFileNames: ["꽃돼지 1집.webp", "꽃돼지 1집.png"],
    displayCoverUrl: "/music-covers/yeoni-1st-album.webp",
  },
  dest1nova: {
    artistKey: "dest1nova",
    artistName: "DEST1NOVA",
    folder: "DEST1NOVA",
    fallbackCoverFileName: "DEST1NOVA.webp",
    coverFileNames: ["DEST1NOVA.webp"],
    displayCoverUrl: undefined,
  },
  lunabloom: {
    artistKey: "lunabloom",
    artistName: "Luna bloom",
    folder: "lunabloom",
    fallbackCoverFileName: "LUNA BLOOM.webp",
    coverFileNames: ["LUNA BLOOM.webp"],
    displayCoverUrl: undefined,
  },
  destinycafe: {
    artistKey: "destinycafe",
    artistName: "Yeoni",
    folder: "DestinyCafe",
    fallbackCoverFileName: "운명의 찻집.webp",
    coverFileNames: ["운명의 찻집.webp"],
    displayCoverUrl: "https://assets.code-destiny.com/DestinyCafe/%EC%9A%B4%EB%AA%85%EC%9D%98%20%EC%B0%BB%EC%A7%91.webp",
  },
  meditation: {
    artistKey: "meditation",
    artistName: "Meditation",
    folder: "Meditation",
    fallbackCoverFileName: "",
    coverFileNames: [],
    displayCoverUrl: undefined,
    noCover: true,
  },
} as const satisfies Record<ArtistKey, ArtistConfig>;

const artistAudioManifests = [
  {
    artistKey: "neo",
    audioFolder: "DEST1NOVA",
    audioFileNames: [
      "Code Destiny.mp3",
      "정재의 사랑.mp3",
      "인성 과다 생각감옥.mp3",
      "합충형파해 Spicy Love.mp3",
      "MBTI 물어보지마.mp3",
      "STAR-CROSSED.mp3",
      "내 사랑의 총량.mp3",
      "너는 나의 용신.mp3",
      "대운 업데이트!.mp3",
      "십성 로큰롤.mp3",
      "안괴 안돼.mp3",
      "운명에게 지지 않아.mp3",
      "운명은 위대하다.mp3",
    ],
  },
  {
    artistKey: "yeoni",
    audioFolder: "DEST1NOVA",
    audioFileNames: [
      "Gisin Out Yongsin In.mp3",
      "Moonlight Daydream.mp3",
      "Mystery of Life_new.mp3",
      "Star-ink Heartstorm.mp3",
      "탐랑 플러팅 주의보.mp3",
      "원진귀문 러브 알고리즘.mp3",
      "재회운아 도와줘.mp3",
      "달빛 운명여행 main title.mp3",
      "달빛 운명여행 remix ver.mp3",
      null,
      "러브 포츈.mp3",
      "별자리 지도 위에서.mp3",
      "숙요점 레슨.mp3",
      "연이의 Moonlight Code.mp3",
    ],
  },
  {
    artistKey: "neo",
    folder: "neosongmini1",
    fallbackCoverFileName: "네오 미니 앨범 1집.webp",
    coverFileNames: ["네오 미니 앨범 1집.webp"],
    audioFileNames: [
      { fileName: "매력의 sign.mp3", audioFolder: "DEST1NOVA" },
      { fileName: "비겁다자의 우정 지옥.mp3", audioFolder: "DEST1NOVA" },
      "새벽 끝.mp3",
      { fileName: "식상 폭발 말빨천재.mp3", audioFolder: "DEST1NOVA" },
      { fileName: "역마살 열차창.mp3", audioFolder: "DEST1NOVA" },
      { fileName: "재성아 나 돈 좀 줘.mp3", audioFolder: "DEST1NOVA" },
      { fileName: "탐랑성 Danger.mp3", audioFolder: "DEST1NOVA" },
    ],
  },
  {
    artistKey: "yeoni",
    folder: "yeonisongmini1",
    fallbackCoverFileName: "연이 미니 앨범 1집 (2).webp",
    coverFileNames: ["연이 미니 앨범 1집 (2).webp"],
    audioFileNames: [
      "Flower pig 매력살.mp3",
      { fileName: "기신은 bye bye.mp3", audioFolder: "DEST1NOVA" },
      { fileName: "달빛처럼 닿을게.mp3", audioFolder: "DEST1NOVA" },
      "도화 화개 love charm.mp3",
      "별빛 재판.mp3",
      "손끝 숨결.mp3",
    ],
  },
  {
    artistKey: "dest1nova",
    audioFileNames: [
      "Flip the Card.mp3",
      "I am your fate.mp3",
      "Karma, karma.mp3",
      "LUCKY THIEF.mp3",
      "Synastry gravity.mp3",
      "Zero hour, we don’t run.mp3",
      "별빛 궤도속 fatal-sign.mp3",
      "별이 말해.mp3",
      "오행 FLEX.mp3",
      "운세 soda pop.mp3",
      "자미제왕 컴백.mp3",
      "천동성 힐링남.mp3",
      "편관의 궤도.mp3",
    ],
  },
  {
    artistKey: "dest1nova",
    folder: "DEST1NOVA/DEST1NOVA 2집",
    fallbackCoverFileName: "DEST1NOVA2.webp",
    coverFileNames: ["DEST1NOVA2.webp"],
    audioFileNames: [
      "11PM.mp3",
      "ANDROMEDA.mp3",
      "Burn My Fate.mp3",
      "CONSTELLATION.mp3",
      "Draw My Fate.mp3",
      "Fatal Code feat. yeoni.mp3",
      "Fate Rider.mp3",
      "Golden Kindness.mp3",
      "HEAVEN LIGHT.mp3",
      "LUCKY RUSH_Title.mp3",
      "Milky Way Angle.mp3",
      "STARLINE.mp3",
      "Scarlet Orbit.mp3",
      "Starry Way.mp3",
      "saju Destiny.mp3",
      "달의 인력.mp3",
      "별이 될 거야.mp3",
      "불꽃의 운명.mp3",
      "은하수 아래.mp3",
      "은하수를 건너 니 곁으로 feat.yeoni.mp3",
    ],
  },
  {
    artistKey: "dest1nova",
    folder: "DestinyWar",
    fallbackCoverFileName: "데스티노바 인간버전 앨범.webp",
    coverFileNames: ["데스티노바 인간버전 앨범.webp"],
    displayCoverUrl: buildMusicPublicUrl("humanmode/데스티노바 인간버전 앨범.webp"),
    audioFileNames: [
      "Dream.mp3",
      "Moonlit Strategy Map.mp3",
      "Moonlit War Command Chamber.mp3",
      "The Moonlit War Room.mp3",
      "The war.mp3",
      "White Lion.mp3",
    ],
  },
  {
    artistKey: "lunabloom",
    audioFileNames: [
      "Devil’s draw.mp3",
      "Fate couture.mp3",
      "Month by month.mp3",
      "Reverse Card.mp3",
      "Star line.mp3",
      "Starline Destiny.mp3",
      "Velvet Tarot.mp3",
      "Welcome to Code Destiny.mp3",
      "귀인 NPC Key.mp3",
      "꽃과 칼 사이.mp3",
      "달의 궤도선.mp3",
      "럭키 컬러.mp3",
      "삼재 Escape.mp3",
      "원진 귀문 Gate.mp3",
      "포카 달빛코드.mp3",
      "형충파해 break.mp3",
    ],
  },
  {
    artistKey: "destinycafe",
    audioFileNames: [
      "Fortune Reveal.mp3",
      "Gentle Oriental Girl.mp3",
      "Kindness.mp3",
      "Moonlit Destiny Room.mp3",
      "Moonlit Tea House.mp3",
      "Moonlight Tea.mp3",
    ],
  },
  {
    artistKey: "meditation",
    audioFileNames: [
      "Crystal Garden.mp3",
      "Dawn in the Temple.mp3",
      "Fire Festival.mp3",
      "First Light on Water.mp3",
      "Flowing Light.mp3",
      "Focus Flow.mp3",
      "Inner Flame Awakening.mp3",
      "Midnight Pulse.mp3",
      "Moonlit Dawn.mp3",
      "Moonlit Forest Temple.mp3",
      "Moonlit Glass Box.mp3",
      "Moonlit River Return.mp3",
      "Moonlit Strategy Map.mp3",
      "Moonlit Temple Gate.mp3",
      "Rain Window Renewal.mp3",
      "Sacred Flame.mp3",
      "Starlight Drift.mp3",
      "Still Lake Dawn.mp3",
      "Still Lake Mind.mp3",
      "Sunrise Drum Circle.mp3",
      "The Memory of Water.mp3",
      "The Stars Remember Your Name.mp3",
      "Zero Point.mp3",
    ],
  },
] as const satisfies readonly ArtistAudioManifest[];

function keyFromFileName(folder: ArtistConfig["folder"], fileName: string) {
  const normalizedFileName = fileName.replace(/^\/+|\/+$/g, "");
  return `${folder}/${normalizedFileName}`;
}

function basenameFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

function titleFromAudioFileName(fileName: string) {
  return basenameFromFileName(fileName).replace(/[-_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function findCoverFileName(artist: ArtistConfig, audioFileName: string) {
  const audioBasename = basenameFromFileName(audioFileName).toLowerCase();
  return artist.coverFileNames.find((coverFileName) => (
    basenameFromFileName(coverFileName).toLowerCase() === audioBasename
  )) || artist.fallbackCoverFileName;
}

function resolveAudioFileEntry(entry: Exclude<AudioFileEntry, null>) {
  return typeof entry === "string" ? { fileName: entry } : entry;
}

function buildTrack(manifest: ArtistAudioManifest, audioFileEntry: Exclude<AudioFileEntry, null>, index: number): Track {
  const baseArtist = ARTISTS[manifest.artistKey];
  const resolvedAudio = resolveAudioFileEntry(audioFileEntry);
  const audioFileName = resolvedAudio.fileName;
  const hasFolderOverride = Boolean(manifest.folder);
  const artist: ArtistConfig = {
    ...baseArtist,
    folder: manifest.folder || baseArtist.folder,
    fallbackCoverFileName: manifest.fallbackCoverFileName || baseArtist.fallbackCoverFileName,
    coverFileNames: manifest.coverFileNames || baseArtist.coverFileNames,
    displayCoverUrl: manifest.displayCoverUrl ?? (hasFolderOverride ? undefined : baseArtist.displayCoverUrl),
  };
  const audioKey = keyFromFileName(artist.folder, audioFileName);
  const audioSourceKey = keyFromFileName(resolvedAudio.audioFolder || manifest.audioFolder || artist.folder, audioFileName);
  const coverKey = keyFromFileName(artist.folder, findCoverFileName(artist, audioFileName));
  const hasLyrics = audioFileName !== "Fortune Reveal.mp3";
  const accessPolicy = getMusicTrackAccessPolicy(audioSourceKey);

  return {
    id: `${artist.artistKey}-${String(index + 1).padStart(2, "0")}`,
    artistKey: artist.artistKey,
    artistName: artist.artistName,
    title: titleFromAudioFileName(audioFileName),
    audioKey,
    audioSourceKey,
    coverKey,
    audioUrl: accessPolicy.accessTier === "free_full"
      ? buildMusicPublicUrl(audioSourceKey)
      : buildMusicPreviewApiUrl(audioSourceKey, accessPolicy.purchaseFeatureKey),
    coverUrl: artist.noCover ? "" : (artist.displayCoverUrl || buildMusicPublicUrl(coverKey)),
    accessTier: accessPolicy.accessTier,
    ...(accessPolicy.previewLimitSeconds ? { previewLimitSeconds: accessPolicy.previewLimitSeconds } : {}),
    ...(accessPolicy.purchaseFeatureKey ? { purchaseFeatureKey: accessPolicy.purchaseFeatureKey } : {}),
    ...(accessPolicy.priceKRW ? { priceKRW: accessPolicy.priceKRW } : {}),
    ...(accessPolicy.coinCost ? { coinCost: accessPolicy.coinCost } : {}),
    ...(accessPolicy.downloadRequiresPurchase ? { downloadRequiresPurchase: true } : {}),
    downloadFileName: audioFileName,
    ...(hasLyrics ? { lyricsLookupKey: audioFileName } : {}),
    order: index + 1,
  };
}

const artistTrackCounts: Record<ArtistKey, number> = { neo: 0, yeoni: 0, dest1nova: 0, lunabloom: 0, destinycafe: 0, meditation: 0 };

export const tracks = artistAudioManifests.flatMap((manifest) => (
  manifest.audioFileNames.flatMap((audioFileName) => {
    const index = artistTrackCounts[manifest.artistKey];
    artistTrackCounts[manifest.artistKey] += 1;
    return audioFileName ? [buildTrack(manifest, audioFileName, index)] : [];
  })
));
export const neoTracks = tracks.filter((track) => track.artistKey === "neo");
export const yeoniTracks = tracks.filter((track) => track.artistKey === "yeoni");
export const dest1novaTracks = tracks.filter((track) => track.artistKey === "dest1nova");
export const lunaBloomTracks = tracks.filter((track) => track.artistKey === "lunabloom");
export const destinyCafeTracks = tracks.filter((track) => track.artistKey === "destinycafe");
export const meditationTracks = tracks.filter((track) => track.artistKey === "meditation");
export const allTracks = [...yeoniTracks, ...destinyCafeTracks, ...neoTracks, ...dest1novaTracks, ...lunaBloomTracks, ...meditationTracks];
