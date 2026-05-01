import { redirect } from "next/navigation";

/**
 * MAIN ENTRY RULE:
 * - 메인 서비스 화면은 정적 서비스 화면(public/static/index.html)이 기준이다.
 * - React 홈은 보조 랜딩으로 /landing 경로에서만 사용한다.
 */
export default function Home() {
  redirect("/static/index.html");
}
