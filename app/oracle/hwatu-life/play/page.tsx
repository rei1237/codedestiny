import { redirect } from "next/navigation";

export const metadata = {
  title: "화투 인생 패 테스트 — 7문항으로 내 인생 패 찾기",
  description:
    "7문항 선택으로 나를 상징하는 화투 인생 패(삼광·고도리·청단·똥광)를 무료로 찾아보세요.",
};

export default function HwatuLifePlayPage() {
  redirect("/oracle/hwatu-life");
}
