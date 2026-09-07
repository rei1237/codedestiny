/**
 * 오늘 카드 이미지 조립. 1080×1920 PNG 한 장을 만들어 기기에 저장한다.
 *
 * 원본 대응: 셸 `generateShareCard`(js/luck-sync-diary.js:1706-1812). 규격(캔버스 치수 ·
 * 배경 3종 · 스티커/배지/닉네임/캡션)은 그대로 잇고, **얹는 내용은 다시 썼다**:
 * 🔴 셸 카드는 점수표와 명리 라벨을 얹지만 여기서는 Day View 와 **같은 문안**(`./day-copy.ts`)
 * 한 줄만 얹는다 — 화면과 카드가 어긋나면 사용자가 자기 기록과 대조할 수 없다.
 * 🔴 일기 본문은 넣지 않는다(목업 승인본). 밖으로 나가는 이미지에 들어가는 것은
 * 날짜 · 결 한 줄 · 루틴 달성 수 · 사용자가 직접 적은 캡션뿐이다.
 * 🔴 캔버스는 **저장을 누른 순간에만** 만든다 — 시트를 열 때 그리면 저장하지 않을 카드를
 * 매번 1080×1920 만큼 그리게 된다.
 */

import type { DiaryCardTheme } from "./entry-writes";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CARD_MARGIN = 88;
const CARD_TEXT_WIDTH = CARD_WIDTH - CARD_MARGIN * 2;

export interface DiaryShareCardInput {
  ymd: string;
  theme: DiaryCardTheme;
  /** 등급 이름. 「…결」 */
  headline: string;
  /** 그날을 읽는 줄. `./day-copy.ts` 가 고른 것 그대로다. */
  line: string;
  /** 「루틴 4/5」 같은 한 줄. 셀 수 없으면 빈 글자다. */
  achievement: string;
  nickname: string;
  caption: string;
  stickers: string[];
  badges: string[];
}

/**
 * 배경 3벌. 🔴 `soft` 만 밝은 바탕이라 글자색이 뒤집힌다 — 셸 `:1748-1749` 와 같은 규칙이다.
 * `vivid` 첫 색만 셸과 다르다(그쪽은 그날 기운 색을 쓴다). 여기서는 다이어리 강조색으로 고정한다.
 */
const CARD_THEME_STOPS: Record<DiaryCardTheme, readonly [string, string, string]> = {
  vivid: ["#b31955", "#4f46e5", "#0f172a"],
  soft: ["#fce7f3", "#ddd6fe", "#dbeafe"],
  night: ["#312e81", "#1e293b", "#020617"],
};

const CARD_TEXT = {
  ko: {
    title: "운기 다이어리",
    brand: "code-destiny",
    sticker: "스티커",
    badge: "배지",
    by: "by",
    caption: "#운기다이어리 #오늘기록",
  },
} as const;

const copy = CARD_TEXT.ko;

function font(weight: number, size: number): string {
  return `${weight} ${size}px "Noto Sans KR", sans-serif`;
}

/**
 * 글자를 폭에 맞춰 자른다. 🔴 한국어는 공백으로 끊기지 않는 줄이 흔해서 **글자 단위**로 센다 —
 * 단어 단위로 자르면 긴 한 덩어리가 카드 밖으로 나간다.
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      if (lines.length >= maxLines) return lines;
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** `2026-09-06` → `2026 · 09 · 06`. 카드 안에서만 쓰는 표기다. */
function formatCardDate(ymd: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.split("-").join(" · ") : ymd;
}

function drawCard(input: DiaryShareCardInput): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const stops = CARD_THEME_STOPS[input.theme] || CARD_THEME_STOPS.vivid;
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(0.55, stops[1]);
  gradient.addColorStop(1, stops[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.beginPath();
  ctx.arc(880, 190, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(220, 1720, 240, 0, Math.PI * 2);
  ctx.fill();

  const primary = input.theme === "soft" ? "#1f2937" : "#ffffff";
  const sub = input.theme === "soft" ? "#334155" : "rgba(255,255,255,.92)";

  ctx.fillStyle = primary;
  ctx.font = font(900, 62);
  ctx.fillText(copy.title, CARD_MARGIN, 190);
  ctx.fillStyle = sub;
  ctx.font = font(700, 42);
  ctx.fillText(formatCardDate(input.ymd), CARD_MARGIN, 258);

  ctx.fillStyle = input.theme === "night" ? "rgba(15,23,42,.5)" : "rgba(255,255,255,.2)";
  ctx.fillRect(CARD_MARGIN, 420, CARD_TEXT_WIDTH, 460);
  ctx.strokeStyle = input.theme === "soft" ? "rgba(31,41,55,.25)" : "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(CARD_MARGIN, 420, CARD_TEXT_WIDTH, 460);

  ctx.fillStyle = primary;
  ctx.font = font(900, 76);
  ctx.fillText(input.headline, CARD_MARGIN + 40, 530);

  ctx.font = font(600, 40);
  ctx.fillStyle = sub;
  wrapLines(ctx, input.line, CARD_TEXT_WIDTH - 80, 5).forEach((line, index) => {
    ctx.fillText(line, CARD_MARGIN + 40, 620 + index * 58);
  });

  let cursorY = 980;
  ctx.fillStyle = primary;
  if (input.achievement) {
    ctx.font = font(700, 40);
    ctx.fillText(input.achievement, CARD_MARGIN, cursorY);
    cursorY += 62;
  }
  if (input.stickers.length) {
    ctx.font = font(700, 34);
    ctx.fillText(`${copy.sticker}: ${input.stickers.slice(0, 2).join(" · ")}`, CARD_MARGIN, cursorY);
    cursorY += 56;
  }
  if (input.badges.length) {
    ctx.font = font(700, 32);
    ctx.fillText(`${copy.badge}: ${input.badges[input.badges.length - 1]}`, CARD_MARGIN, cursorY);
  }

  if (input.nickname) {
    ctx.font = font(800, 36);
    ctx.fillStyle = sub;
    ctx.fillText(`${copy.by} ${input.nickname}`, CARD_MARGIN, 1680);
  }

  ctx.fillStyle = primary;
  ctx.font = font(900, 48);
  ctx.fillText(copy.brand, CARD_MARGIN, 1780);
  ctx.font = font(600, 30);
  ctx.fillStyle = sub;
  wrapLines(ctx, input.caption || copy.caption, CARD_TEXT_WIDTH, 1).forEach((line) => {
    ctx.fillText(line, CARD_MARGIN, 1834);
  });

  return canvas;
}

/**
 * 카드를 만들어 내려받는다. 성공하면 `true`.
 * 🔴 셸 `:1808-1811` 과 같이 `<a download>` 한 번으로 끝낸다 — 새 창을 열면 모바일에서
 * 저장 대신 탭 이동이 된다.
 */
export function saveDiaryShareCard(input: DiaryShareCardInput): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = drawCard(input);
    if (!canvas) return false;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `diary-card-${input.ymd || "today"}.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}
