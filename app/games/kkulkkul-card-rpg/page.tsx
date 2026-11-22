import novel from "@/content/novel/episodes.source.json";
import Lobby from "./Lobby";
import { GAME_TITLE } from "./catalog";

export const metadata = { title: GAME_TITLE };

export default function CardRpgPage() {
  const opening = novel.episodes[0].beats
    .slice(0, 6)
    .map(({ id, t, s }) => ({ id, text: t, speaker: s }));
  return <Lobby opening={opening} />;
}
