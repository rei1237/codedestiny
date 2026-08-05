import { redirect } from "next/navigation";

/** The planner remains inside the established diary experience, not a separate shell. */
export default function FortunePlannerPage() {
  redirect("/?fortunePlanner=1");
}
