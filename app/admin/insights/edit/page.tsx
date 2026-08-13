import { redirect } from "next/navigation";

// 글 수정은 /admin/content 하나로 합쳤다(사유는 ../new/page.tsx 주석 참고).
// 정적 export 라 쿼리스트링(?id=)은 서버에서 읽을 수 없으므로 목록으로 보낸다.
// 운영자는 거기서 같은 글을 찾아 이어서 편집한다.
export default function AdminInsightsEditRedirectPage() {
  redirect("/admin/content");
}
