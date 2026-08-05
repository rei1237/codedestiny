import { redirect } from "next/navigation";

export default function FortunePlannerPage() {
  redirect("/?fortunePlanner=1");
}
