"use client";
import { useEffect } from "react";

const TARGET = "/neo-consultation/";

export default function NeoDecisionRedirect() {
  useEffect(() => { location.replace(TARGET + location.search + location.hash); }, []);
  return <p role="status">네오 작전 결정서는 꿀꿀운세로 옮겼어요. <a href={TARGET}>결정서 화면으로 이동하기</a></p>;
}
