"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export const GALAXY_NODES: { path: string; label: string; shortLabel: string; color: string }[] = [
  { path: "/vedic/chart", label: "베다점 차트", shortLabel: "차트", color: "from-sky-300 via-cyan-400 to-sky-200" },
  { path: "/vedic/personality", label: "타고난 성향", shortLabel: "성향", color: "from-emerald-300 via-teal-400 to-emerald-200" },
  { path: "/vedic/love", label: "연애운", shortLabel: "연애", color: "from-rose-300 via-pink-400 to-rose-200" },
  { path: "/vedic/wealth", label: "재물운", shortLabel: "재물", color: "from-amber-300 via-yellow-400 to-amber-200" },
  { path: "/vedic/health-yoga", label: "건강 및 요가", shortLabel: "건강·요가", color: "from-violet-300 via-indigo-400 to-violet-200" },
];

export default function GalaxyNav() {
  const router = useRouter();

  return (
    <section className="veda-orbit-root" aria-label="베다 네뷸라 네비게이션">
      {/* 중심 네뷸라 */}
      <div className="veda-orbit-core">
        <div className="veda-orbit-core-inner" />
        <div className="veda-orbit-core-ring veda-orbit-core-ring--1" />
        <div className="veda-orbit-core-ring veda-orbit-core-ring--2" />
      </div>

      {/* 궤도 링 */}
      <div className="veda-orbit-ring veda-orbit-ring--inner" />
      <div className="veda-orbit-ring veda-orbit-ring--mid" />
      <div className="veda-orbit-ring veda-orbit-ring--outer" />

      {/* 운명의 구체들 */}
      <div className="veda-orbit-orbs">
        {GALAXY_NODES.map((node, idx) => {
          const angleDeg = -90 + idx * (360 / GALAXY_NODES.length);
          return (
            <DestinyOrb
              key={node.path}
              node={node}
              angleDeg={angleDeg}
              radiusClass={
                idx % 3 === 0
                  ? "veda-orbit-radius-inner"
                  : idx % 3 === 1
                    ? "veda-orbit-radius-mid"
                    : "veda-orbit-radius-outer"
              }
              onClick={() => router.push(node.path)}
            />
          );
        })}
      </div>
    </section>
  );
}

type DestinyOrbProps = {
  node: (typeof GALAXY_NODES)[number];
  angleDeg: number;
  radiusClass: string;
  onClick: () => void;
};

function DestinyOrb({ node, angleDeg, radiusClass, onClick }: DestinyOrbProps) {
  return (
    <motion.button
      type="button"
      className={`veda-orbit-orb ${radiusClass}`}
      style={{ "--vedic-angle": `${angleDeg}deg` } as React.CSSProperties}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div
        className={`veda-orbit-orb-glow bg-gradient-to-br ${node.color}`}
      >
        <div className="veda-orbit-orb-core" />
      </div>
      <span className="veda-orbit-orb-label">{node.shortLabel}</span>
    </motion.button>
  );
}

