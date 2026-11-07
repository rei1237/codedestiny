import type { TeaHouseStage } from "../data/story";

type TeaBackContext = {
  stage: TeaHouseStage;
  historyOpen: boolean;
  albumOpen: boolean;
  submitting: boolean;
  closeHistory: () => void;
  closeAlbum: () => void;
  showBusy: () => void;
  selectTea: () => void;
  goLanding: () => void;
};

export function handleTeaNativeBack(event: Event, context: TeaBackContext) {
  if (event.defaultPrevented) return;
  const action = context.historyOpen ? context.closeHistory : context.albumOpen ? context.closeAlbum
    : context.submitting ? context.showBusy : context.stage === "landing" ? null
    : context.stage === "questionInput" || context.stage === "teaCupRitual" ? context.selectTea : context.goLanding;
  if (action) { event.preventDefault(); action(); }
}
