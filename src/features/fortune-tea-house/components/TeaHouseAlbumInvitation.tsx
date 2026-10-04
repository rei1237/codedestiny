"use client";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import { albumVisitCopy } from "../data/albumVisitCopy";
import { fortuneTeaHouseAssets } from "../data/assets";
import { TAROT_ALBUM_UNLOCK_COST } from "../lib/honeyDrops";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "../styles/tea-album.module.css";

export default function TeaHouseAlbumInvitation({ honeyDrops, onOpen }: {
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  onOpen: () => void;
}) {
  const copy = useTeaHouseCopy("albumVisit", albumVisitCopy);
  const count = honeyDrops?.currentHoneyDrops ?? 0;
  const progress = copy.progress.replace("{count}", String(count)).replace("{cost}", String(TAROT_ALBUM_UNLOCK_COST));
  return <section className={styles.invitation} aria-labelledby="teaAlbumInvitationTitle">
    <Image src={fortuneTeaHouseAssets.premium.tarotAlbumCover} alt="" width={120} height={170} className={styles.bookCover}/>
    <div><span className={styles.eyebrow}>{copy.eyebrow}</span><h2 id="teaAlbumInvitationTitle">{copy.title}</h2><p>{copy.description.replace("{cost}", String(TAROT_ALBUM_UNLOCK_COST))}</p>
      <span className={styles.balance}>{honeyDrops?.tarotAlbumUnlocked ? copy.unlocked : honeyDrops?.authenticated ? progress : honeyDrops ? copy.guest : copy.loading}</span>
      {honeyDrops?.authenticated && !honeyDrops.tarotAlbumUnlocked && <progress max={TAROT_ALBUM_UNLOCK_COST} value={Math.min(count, TAROT_ALBUM_UNLOCK_COST)} aria-label={progress}/>}</div>
    <button className={styles.primary} type="button" onClick={onOpen}><BookOpen size={18} aria-hidden/>{copy.open}<ArrowRight size={16} aria-hidden/></button>
  </section>;
}
