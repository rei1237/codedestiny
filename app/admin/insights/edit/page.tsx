"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InsightEditorPage from "../_components/InsightEditorPage";

function AdminInsightsEditInner() {
  const searchParams = useSearchParams();
  const insightId = String(searchParams?.get("id") || "");
  return <InsightEditorPage mode="edit" insightId={insightId} />;
}

export default function AdminInsightsEditPage() {
  return (
    <Suspense fallback={null}>
      <AdminInsightsEditInner />
    </Suspense>
  );
}
