import { redirect } from "next/navigation";

/** Legacy bookmark route for the former 운기·기일 다이어리. */
export default function LegacyLuckSyncDiaryPage() {
  redirect("/?fortunePlanner=1");
}
