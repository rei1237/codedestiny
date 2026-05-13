export type FitTextOptions = {
  maxWidth: number;
  maxLines: number;
  fontSize: number;
  minFontSize?: number;
  lineHeight?: number;
};

export type FittedText = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  truncated: boolean;
};

function charWidthRatio(char: string) {
  if (/\s/.test(char)) return 0.36;
  if (/[A-Z]/.test(char)) return 0.66;
  if (/[a-z]/.test(char)) return 0.54;
  if (/[0-9]/.test(char)) return 0.56;
  if (/[\u0000-\u007f]/.test(char)) return 0.58;
  return 0.95;
}

export function measureTextWidth(text: string, fontSize: number) {
  const normalized = String(text || "");
  let width = 0;

  for (const char of normalized) {
    width += charWidthRatio(char) * fontSize;
  }

  return width;
}

function normalizeByWords(text: string) {
  const input = String(text || "").trim().replace(/\s+/g, " ");
  if (!input) return [];

  if (/\s/.test(input)) {
    return input.split(" ");
  }

  return Array.from(input);
}

function withEllipsis(line: string, maxWidth: number, fontSize: number) {
  if (!line) return "";
  const source = Array.from(line);
  let cursor = source.length;

  while (cursor > 0) {
    const rendered = `${source.slice(0, cursor).join("")}...`;
    if (measureTextWidth(rendered, fontSize) <= maxWidth) {
      return rendered;
    }
    cursor -= 1;
  }

  return "...";
}

export function splitTextByLines(text: string, maxWidth: number, fontSize: number) {
  const tokens = normalizeByWords(text);
  if (!tokens.length) return [];

  const lines: string[] = [];
  const hasSpace = /\s/.test(String(text || "").trim());
  let current = "";

  for (const token of tokens) {
    const candidate = current
      ? hasSpace
        ? `${current} ${token}`
        : `${current}${token}`
      : token;

    if (measureTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = token;
      continue;
    }

    const chars = Array.from(token);
    let bucket = "";
    for (const char of chars) {
      const charCandidate = `${bucket}${char}`;
      if (measureTextWidth(charCandidate, fontSize) <= maxWidth) {
        bucket = charCandidate;
      } else {
        if (bucket) lines.push(bucket);
        bucket = char;
      }
    }
    current = bucket;
  }

  if (current) lines.push(current);
  return lines;
}

export function clampTextForCard(lines: string[], maxLines: number, maxWidth: number, fontSize: number) {
  if (lines.length <= maxLines) {
    return {
      lines,
      truncated: false,
    };
  }

  const next = lines.slice(0, maxLines);
  next[maxLines - 1] = withEllipsis(next[maxLines - 1], maxWidth, fontSize);

  return {
    lines: next,
    truncated: true,
  };
}

export function wrapCardText(text: string, maxWidth: number, fontSize: number, maxLines: number) {
  const split = splitTextByLines(text, maxWidth, fontSize);
  return clampTextForCard(split, maxLines, maxWidth, fontSize);
}

export function fitTextToBox(text: string, options: FitTextOptions): FittedText {
  const minFontSize = Math.min(options.fontSize, Math.max(11, options.minFontSize || 14));

  for (let font = options.fontSize; font >= minFontSize; font -= 1) {
    const wrapped = wrapCardText(text, options.maxWidth, font, options.maxLines);
    if (!wrapped.truncated) {
      return {
        lines: wrapped.lines,
        fontSize: font,
        lineHeight: options.lineHeight || Math.round(font * 1.33),
        truncated: false,
      };
    }
  }

  const forcedFont = minFontSize;
  const wrapped = wrapCardText(text, options.maxWidth, forcedFont, options.maxLines);
  return {
    lines: wrapped.lines,
    fontSize: forcedFont,
    lineHeight: options.lineHeight || Math.round(forcedFont * 1.3),
    truncated: wrapped.truncated,
  };
}

