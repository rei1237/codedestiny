import TarotPromptMakerRouteClient from "./TarotPromptMakerRouteClient";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";

export default function TarotPromptMakerPage() {
  return (
    <>
      <TarotPromptMakerRouteClient />
      <ImmersiveRelatedLinks fromPath="/tarot/prompt-maker" />
    </>
  );
}
