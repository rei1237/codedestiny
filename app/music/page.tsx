import MusicRouteClient from "./MusicRouteClient";

import { Suspense } from "react";

const MUSIC_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Code Destiny Moon Library | Code Destiny",
    description: "달빛 무드의 코드데스티니 뮤직 플레이리스트를 감상하세요.",
  },
  en: {
    title: "Code Destiny Moon Library | Code Destiny",
    description: "Listen to Code Destiny music playlists in a moonlit mood.",
  },
  ja: {
    title: "Code Destiny Moon Library | Code Destiny",
    description: "月明かりのムードでCode Destinyの音楽プレイリストをお楽しみください。",
  },
} as const;

const musicPageCopy = MUSIC_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: musicPageCopy.title,
  description: musicPageCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function MusicPage() {
  return (
    <Suspense fallback={null}>
      <MusicRouteClient />
    </Suspense>
  );
}
