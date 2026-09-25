import TarotPromptMakerRouteClient from "./TarotPromptMakerRouteClient";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";
import TarotPromptGuide from "./TarotPromptGuide";
import { Suspense } from "react";

export default function TarotPromptMakerPage() {
  return (
    <main className="min-h-dvh bg-[#080612]">
      <Suspense fallback={null}>
        <TarotPromptMakerRouteClient />
      </Suspense>
      <TarotPromptGuide />
      <ImmersiveRelatedLinks fromPath="/tarot/prompt-maker" />
    </main>
  );
}
