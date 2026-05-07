import { redirect } from "next/navigation";

export const metadata = {
  title: "IFA 오라클 - 요루바 256 오두 신탁 | Code Destiny",
  description:
    "이파(IFA) 오라클은 요루바 256 오두 체계를 기반으로 질문의 방향을 해석하는 신탁 서비스입니다.",
};

export default function IfaOraclePage() {
  redirect("/ifa-oracle.html?source=oracle-ifa");
}
