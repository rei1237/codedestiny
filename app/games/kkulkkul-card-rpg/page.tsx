import novel from "@/content/novel/episodes.source.json";
import Lobby from "./Lobby";
import { GAME_TITLE } from "./catalog";

export const metadata = {
  title: GAME_TITLE,
  description: "꿀꿀운세의 카드 RPG 운명의 연대기에서 첫 이야기를 읽고, 동료 카드를 살펴보며 전투와 모험을 이어가세요.",
  robots: { index: false, follow: true },
};

export default function CardRpgPage() {
  const opening = novel.episodes[0].beats
    .slice(0, 6)
    .map(({ id, t, s }) => ({ id, text: t, speaker: s }));
  return <Lobby opening={opening} />;
}
