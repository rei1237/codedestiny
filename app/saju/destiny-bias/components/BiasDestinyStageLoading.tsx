"use client";

import DestinyBiasLoadingScreen from "./DestinyBiasLoadingScreen";

type Props = {
  message: string;
  progress: number;
};

export default function BiasDestinyStageLoading({ message, progress }: Props) {
  return <DestinyBiasLoadingScreen message={message} progress={progress} />;
}
