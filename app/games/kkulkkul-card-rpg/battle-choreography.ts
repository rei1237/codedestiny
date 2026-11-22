import type { BattleEvent } from "./battle";

export function isStrike(event?: BattleEvent) {
  return !!event && ["attack", "extra", "ultimate", "hit"].includes(event.kind);
}

// Fractions of the animation, independent of the combat clock and random seed.
export function choreography(event: BattleEvent, fast: boolean) {
  const ultimate = event.kind === "ultimate";
  const duration =
    (ultimate
      ? 1900
      : event.type === "Buster" || event.heavy
        ? 900
        : event.type === "Quick"
          ? 660
          : isStrike(event)
            ? 800
            : 460) / (fast ? 2 : 1);
  const amounts =
    event.hitAmounts ?? (event.kind === "hit" ? [event.amount] : []);
  const first = ultimate ? 0.59 : 0.46;
  const contacts = amounts.map((amount, i) => ({
    at:
      (first + (amounts.length === 1 ? 0 : (0.22 * i) / (amounts.length - 1))) *
      duration,
    amount,
  }));
  return { duration, contacts };
}

export function usesProjectile(person: string, event: BattleEvent) {
  if (event.kind === "hit") return false;
  if (person === "yeon" || person === "yun") return true;
  if (person === "neo" || person === "ln") return event.type === "Arts";
  return event.type === "Arts" || event.kind === "ultimate";
}

// Work in field-local CSS pixels. Read resting containers so an active
// transform never feeds back into its own flight path on resize.
export function positionStrike(
  field: HTMLElement,
  event: BattleEvent,
  ranged: boolean,
) {
  const fighters = Array.from(
    field.querySelectorAll<HTMLElement>("[data-fighter]"),
  );
  const source = fighters.find((el) => el.dataset.fighter === event.actorId);
  const target = fighters.find((el) => el.dataset.fighter === event.targetId);
  if (!source || !target) return;
  const bounds = field.getBoundingClientRect(),
    from = source.getBoundingClientRect(),
    to = target.getBoundingClientRect();
  const right = to.left > from.left ? 1 : -1;
  const x = from.left + from.width * 0.5,
    y = from.bottom - Math.min(from.width, from.height) * 0.48;
  const tx = to.left + to.width * 0.5,
    ty = to.bottom - Math.min(to.width, to.height) * 0.48;
  const dx = tx - x,
    dy = ty - y;
  const travel = ranged
    ? dx * 0.1
    : dx - right * Math.min(from.width, to.width) * 0.4;
  const vars = {
    "start-x": x - bounds.left,
    "start-y": y - bounds.top,
    "flight-x": dx,
    "flight-y": dy,
    "travel-x": travel,
    "travel-y": ranged ? dy * 0.1 : dy,
    lift: -Math.min(36, bounds.height * 0.12),
  };
  for (const [key, value] of Object.entries(vars))
    field.style.setProperty("--" + key, value + "px");
}
