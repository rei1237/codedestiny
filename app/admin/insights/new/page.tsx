import { redirect } from "next/navigation";

// 글 작성은 /admin/content 하나로 합쳤다.
// 같은 Insight 컬렉션을 편집기 두 벌이 서로 다른 필드 집합으로 쓰고 있었고(한쪽은 seo{} 중첩과
// summary·content·type 을 안 남겼다), 읽을 때는 중첩 seo 가 이겨서 어느 화면에서 고쳤는지에 따라
// SEO 와 발행 상태가 갈렸다. /admin/content 가 예약발행·발행검증·캐시퍼지·이력복원까지 갖춘 상위 집합이다.
// 이 주소를 북마크한 운영자가 막히지 않도록 리다이렉트만 남긴다.
export default function AdminInsightsNewRedirectPage() {
  redirect("/admin/content");
}
