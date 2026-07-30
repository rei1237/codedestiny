import { redirect } from "next/navigation";

// 사이트 콘텐츠 편집은 통합 CMS(/admin/cms)로 합쳤다.
// 유명인 사주는 그대로 편집할 수 있고, 구버전 웹소설(소설/회차) 탭은 라이트 노벨로 대체됐다.
// 이 주소를 북마크한 운영자가 막히지 않도록 리다이렉트만 남긴다.
export default function AdminSiteContentRedirectPage() {
  redirect("/admin/cms");
}
