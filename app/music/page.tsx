import MusicPlayerExample from "./MusicPlayerExample";

import { Suspense } from "react";

export const metadata = {
  title: "Code Destiny Moon Library | Code Destiny",
  description: "달빛 무드의 코드데스티니 뮤직 플레이리스트를 감상하세요.",
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
      <MusicPlayerExample />
    </Suspense>
  );
}
