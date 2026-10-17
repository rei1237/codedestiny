import Image from "next/image";

const artworkIds = new Set([
  "psycho", "narcissist", "chihuahua", "aura", "ttest", "persona", "thriller", "office",
  "seven", "hsp", "tci", "empathy", "mental", "romance", "mbti", "lovelang",
  "pastlife", "dopamine", "nunchi", "mentalfit", "villain", "idealsignal",
]);

// Decorative editorial scenes; the surrounding HTML owns the translated title.
// Source prompts and generated originals are recorded in docs/design/psychotest-bmovie-art.json.
export default function TestArtwork({ id, className }: { id: string; className?: string }) {
  const artId = artworkIds.has(id) ? id : "aura";
  const base = `/images/psychotest/bmovie-v1/${artId}`;
  return <picture className={`psy-artwork ${className || ""}`} aria-hidden="true">
    <source media="(max-width: 640px)" srcSet={`${base}-480.webp`} />
    <Image src={`${base}-960.webp`} width={960} height={640} alt="" loading="lazy" unoptimized />
  </picture>;
}
