"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { lifeCalibrationInputEnabled } from "@/lib/life-calibration/flags.mjs";
import LifeCalibrationOff from "./LifeCalibrationOff";

// 인증·저장 상태를 읽는 화면이라 정적 export 프리렌더에 올리지 않는다(`/account/notifications` 와 같은 구성).
// 플래그가 꺼져 있으면 입력 화면 묶음을 받지도, API 를 부르지도 않는다.
const LifeCalibrationScreen = dynamic(() => import("./LifeCalibrationScreen"), { ssr: false });

export default function LifeCalibrationRouteClient() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => { setEnabled(lifeCalibrationInputEnabled({ search: window.location.search })); }, []);
  if (enabled === null) return <main aria-busy="true" />;
  return enabled ? <LifeCalibrationScreen /> : <LifeCalibrationOff />;
}
