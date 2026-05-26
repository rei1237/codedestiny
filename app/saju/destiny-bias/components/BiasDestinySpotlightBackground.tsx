"use client";

import CosmicConcertBackground from "./CosmicConcertBackground";

interface BiasDestinySpotlightBackgroundProps {
  isLowSpec?: boolean;
  reduceMotion?: boolean;
}

export default function BiasDestinySpotlightBackground({
  isLowSpec,
  reduceMotion,
}: BiasDestinySpotlightBackgroundProps) {
  return <CosmicConcertBackground isLowSpec={isLowSpec} reduceMotion={reduceMotion} />;
}
