import { redirect } from "next/navigation";

/**
 * AUXILIARY LANDING (React Home)
 * - 메인 서비스 화면만 사용하도록 /index.html 로 통합 리다이렉트
 */
export default function LandingPage() {
  redirect("/index.html");
}
