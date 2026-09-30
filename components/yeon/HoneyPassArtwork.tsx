import Image from "next/image";

// Visual identity only. Price, eligibility and expiry remain in their existing registries.
const HONEY_PASS_ARTWORK = {
  standard: "/assets/yeoni/honey-passes/standard-honey-pass-v1.webp",
  premium: "/assets/yeoni/honey-passes/premium-honey-pass-v1.webp",
  vvip: "/assets/yeoni/honey-passes/vvip-honey-pass-v1.webp",
  family: "/assets/yeoni/honey-passes/family-honey-pass-v1.webp",
} as const;

type Props = {
  tier?: string | null;
  className?: string;
  sizes?: string;
};

export default function HoneyPassArtwork({ tier, className = "h-28 w-28", sizes = "112px" }: Props) {
  if (!tier || !Object.hasOwn(HONEY_PASS_ARTWORK, tier)) return null;
  const src = HONEY_PASS_ARTWORK[tier as keyof typeof HONEY_PASS_ARTWORK];
  return (
    <span className={`relative block shrink-0 ${className}`} data-yeoni-honey-tier={tier} aria-hidden="true">
      <Image src={src} alt="" fill sizes={sizes} className="object-contain" />
    </span>
  );
}
