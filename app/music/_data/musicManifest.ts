import { buildMusicPublicUrl } from "@/lib/r2-public-url";

export type ArtistKey = "neo" | "yeoni" | "dest1nova" | "lunabloom";
export type ArtistName = "Neo" | "Yeoni" | "DEST1NOVA" | "Luna bloom";

export type Track = {
  id: string;
  artistKey: ArtistKey;
  artistName: ArtistName;
  title: string;
  audioKey: string;
  coverKey: string;
  audioUrl: string;
  coverUrl: string;
  durationSeconds?: number;
  mood?: string;
  order?: number;
  lyricsLookupKey?: string;
};

type MusicFolder = "neosong" | "yeonisong" | "neosongmini1" | "yeonisongmini1" | "DEST1NOVA" | "DEST1NOVA/DEST1NOVA 2집" | "lunabloom";

type ArtistConfig = {
  artistKey: ArtistKey;
  artistName: ArtistName;
  folder: MusicFolder;
  fallbackCoverFileName: string;
  coverFileNames: readonly string[];
  displayCoverUrl?: string;
};

type ArtistAudioManifest = {
  artistKey: ArtistKey;
  folder?: MusicFolder;
  fallbackCoverFileName?: string;
  coverFileNames?: readonly string[];
  displayCoverUrl?: string;
  audioFileNames: readonly string[];
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
} as const satisfies Record<ArtistKey, ArtistConfig>;

const artistAudioManifests = [
  {
    artistKey: "neo",
    audioFileNames: [
      "Code Destiny.wav",
      "정재의 사랑.wav",
      "인성 과다 생각감옥.wav",
      "합충형파해 Spicy Love.wav",
      "MBTI 물어보지마.wav",
      "STAR-CROSSED.wav",
      "내 사랑의 총량.wav",
      "너는 나의 용신.wav",
      "대운 업데이트!.wav",
      "십성 로큰롤.wav",
      "안괴 안돼.wav",
      "운명에게 지지 않아.wav",
      "운명은 위대하다.wav",
    ],
  },
  {
    artistKey: "yeoni",
    audioFileNames: [
      "Gisin Out Yongsin In.wav",
      "Moonlight Daydream.wav",
      "Mystery of Life_new.wav",
      "Star-ink Heartstorm.wav",
      "탐랑 플러팅 주의보.wav",
      "원진귀문 러브 알고리즘.wav",
      "재회운아 도와줘.wav",
      "달빛 운명여행 main title.wav",
      "달빛 운명여행 remix ver.wav",
      "달빛 점괘.wav",
      "러브 포츈.wav",
      "별자리 지도 위에서.wav",
      "숙요점 레슨.wav",
      "연이의 Moonlight Code.wav",
    ],
  },
  {
    artistKey: "neo",
    folder: "neosongmini1",
    fallbackCoverFileName: "네오 미니 앨범 1집.webp",
    coverFileNames: ["네오 미니 앨범 1집.webp"],
    audioFileNames: [
      "매력의 sign.wav",
      "비겁다자의 우정 지옥.wav",
      "새벽 끝.mp3",
      "식상 폭발 말빨천재.wav",
      "역마살 열차창.wav",
      "재성아 나 돈 좀 줘.wav",
      "탐랑성 Danger.wav",
    ],
  },
  {
    artistKey: "yeoni",
    folder: "yeonisongmini1",
    fallbackCoverFileName: "연이 미니 앨범 1집 (2).webp",
    coverFileNames: ["연이 미니 앨범 1집 (2).webp"],
    audioFileNames: [
      "Flower pig 매력살.mp3",
      "기신은 bye bye.wav",
      "달빛처럼 닿을게.wav",
      "도화 화개 love charm.mp3",
      "별빛 재판.mp3",
      "손끝 숨결.mp3",
    ],
  },
  {
    artistKey: "dest1nova",
    audioFileNames: [
      "Flip the Card.mp3",
      "I am your fate.wav",
      "Karma, karma.mp3",
      "LUCKY THIEF.mp3",
      "Synastry gravity.mp3",
      "Zero hour, we don’t run.mp3",
      "별빛 궤도속 fatal-sign.wav",
      "별이 말해.mp3",
      "오행 FLEX.mp3",
      "운세 soda pop.wav",
      "자미제왕 컴백.wav",
      "천동성 힐링남.mp3",
      "편관의 궤도.wav",
    ],
  },
  {
    artistKey: "dest1nova",
    folder: "DEST1NOVA/DEST1NOVA 2집",
    fallbackCoverFileName: "DEST1NOVA2.webp",
    coverFileNames: ["DEST1NOVA2.webp"],
    audioFileNames: [
      "ANDROMEDA.mp3",
      "Burn My Fate.mp3",
      "CONSTELLATION.mp3",
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

function buildTrack(manifest: ArtistAudioManifest, audioFileName: string, index: number): Track {
  const baseArtist = ARTISTS[manifest.artistKey];
  const hasFolderOverride = Boolean(manifest.folder);
  const artist: ArtistConfig = {
    ...baseArtist,
    folder: manifest.folder || baseArtist.folder,
    fallbackCoverFileName: manifest.fallbackCoverFileName || baseArtist.fallbackCoverFileName,
    coverFileNames: manifest.coverFileNames || baseArtist.coverFileNames,
    displayCoverUrl: manifest.displayCoverUrl ?? (hasFolderOverride ? undefined : baseArtist.displayCoverUrl),
  };
  const audioKey = keyFromFileName(artist.folder, audioFileName);
  const coverKey = keyFromFileName(artist.folder, findCoverFileName(artist, audioFileName));

  return {
    id: `${artist.artistKey}-${String(index + 1).padStart(2, "0")}`,
    artistKey: artist.artistKey,
    artistName: artist.artistName,
    title: titleFromAudioFileName(audioFileName),
    audioKey,
    coverKey,
    audioUrl: buildMusicPublicUrl(audioKey),
    coverUrl: artist.displayCoverUrl || buildMusicPublicUrl(coverKey),
    lyricsLookupKey: audioFileName,
    order: index + 1,
  };
}

const artistTrackCounts: Record<ArtistKey, number> = { neo: 0, yeoni: 0, dest1nova: 0, lunabloom: 0 };

export const tracks = artistAudioManifests.flatMap((manifest) => (
  manifest.audioFileNames.map((audioFileName) => {
    const index = artistTrackCounts[manifest.artistKey];
    artistTrackCounts[manifest.artistKey] += 1;
    return buildTrack(manifest, audioFileName, index);
  })
));
export const neoTracks = tracks.filter((track) => track.artistKey === "neo");
export const yeoniTracks = tracks.filter((track) => track.artistKey === "yeoni");
export const dest1novaTracks = tracks.filter((track) => track.artistKey === "dest1nova");
export const lunaBloomTracks = tracks.filter((track) => track.artistKey === "lunabloom");
export const allTracks = [...yeoniTracks, ...neoTracks, ...dest1novaTracks, ...lunaBloomTracks];
