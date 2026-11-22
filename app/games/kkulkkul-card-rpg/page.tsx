import novel from "@/content/novel/episodes.source.json";
import Lobby from "./Lobby";
import { GAME_TITLE } from "./catalog";

export const metadata = { title: GAME_TITLE };

export default function CardRpgPage() {
  const opening = novel.episodes[0].beats
    .slice(0, 3)
    .map(({ id, t }) => ({ id, text: t }));
  return <Lobby opening={opening} />;
}
