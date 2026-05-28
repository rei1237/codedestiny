import { redirect } from "next/navigation";

export default function SajuLifebookPage() {
  redirect("/?action=openLifeBookModal");
}
