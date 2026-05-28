import { redirect } from "next/navigation";

export default function SajuLoveBiblePage() {
  redirect("/?action=openLoveSecretModal&premiumIntent=love-secret-pdf&mode=solo");
}
