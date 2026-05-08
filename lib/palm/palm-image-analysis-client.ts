type HandSide = "left" | "right" | "unknown";

type Point = {
  x: number;
  y: number;
};

type LandmarkMap = {
  wrist: Point;
  thumbBase: Point;
  thumbTip: Point;
  indexBase: Point;
  indexTip: Point;
  middleBase: Point;
  middleTip: Point;
  ringBase: Point;
  ringTip: Point;
  littleBase: Point;
  littleTip: Point;
};

type BinaryBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
};

type LineCandidate = {
  id: string;
  path: Point[];
  startPoint: Point;
  endPoint: Point;
  length: number;
  depthScore: number;
  curvatureScore: number;
  breaks: number;
  branches: number;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  averageIntensity: number;
};

type ImageQualityResult = {
  isPalmDetected: boolean;
  handSide: HandSide;
  brightness: "good" | "normal" | "dark";
  sharpness: "good" | "normal" | "blurry";
  contrast: "good" | "normal" | "low";
  palmCoverage: number;
  rotation: number;
  warnings: string[];
  hasEnoughQuality: boolean;
};

export type PalmImageAnalysisResult = {
  handSide: HandSide;
  handLandmarks: LandmarkMap | null;
  lineCandidates: LineCandidate[];
  imageQuality: ImageQualityResult;
  debug: {
    imageWidth: number;
    imageHeight: number;
    lineMapConfidence: number;
    handMaskArea: number;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

function rgbaAt(data: Uint8ClampedArray, x: number, y: number, width: number): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function polylineLength(path: Point[]): number {
  if (path.length < 2) return 0;
  let out = 0;
  for (let i = 1; i < path.length; i += 1) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    out += Math.hypot(dx, dy);
  }
  return out;
}

function computeCurvature(path: Point[]): number {
  if (path.length < 3) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < path.length - 1; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const c = path[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const n1 = Math.hypot(abx, aby);
    const n2 = Math.hypot(bcx, bcy);
    if (n1 < 1e-6 || n2 < 1e-6) continue;
    const cos = clamp((abx * bcx + aby * bcy) / (n1 * n2), -1, 1);
    const ang = Math.acos(cos);
    sum += ang;
    count += 1;
  }
  if (count === 0) return 0;
  return clamp(sum / (count * Math.PI), 0, 1);
}

function grayscaleFromRgba(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = rgbaAt(rgba, x, y, width);
      out[idx(x, y, width)] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  return out;
}

function computeBrightness(gray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < gray.length; i += 1) sum += gray[i];
  return sum / Math.max(1, gray.length);
}

function computeContrast(gray: Uint8Array): number {
  const mean = computeBrightness(gray);
  let sq = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const d = gray[i] - mean;
    sq += d * d;
  }
  return Math.sqrt(sq / Math.max(1, gray.length));
}

function computeSharpness(gray: Uint8Array, width: number, height: number): number {
  let acc = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const c = gray[idx(x, y, width)];
      const lap =
        4 * c -
        gray[idx(x - 1, y, width)] -
        gray[idx(x + 1, y, width)] -
        gray[idx(x, y - 1, width)] -
        gray[idx(x, y + 1, width)];
      acc += Math.abs(lap);
      n += 1;
    }
  }
  return acc / Math.max(1, n);
}

function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i += 1) hist[gray[i]] += 1;

  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t += 1) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let varMax = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) {
      varMax = between;
      threshold = t;
    }
  }

  return threshold;
}

function binaryDilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[idx(nx, ny, width)] > 0) {
            on = 1;
            break;
          }
        }
      }
      out[idx(x, y, width)] = on;
    }
  }
  return out;
}

function binaryErode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 1;
      for (let dy = -radius; dy <= radius && on; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            on = 0;
            break;
          }
          if (mask[idx(nx, ny, width)] === 0) {
            on = 0;
            break;
          }
        }
      }
      out[idx(x, y, width)] = on;
    }
  }
  return out;
}

function binaryClose(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return binaryErode(binaryDilate(mask, width, height, radius), width, height, radius);
}

function binaryOpen(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return binaryDilate(binaryErode(mask, width, height, radius), width, height, radius);
}

function connectedComponents(mask: Uint8Array, width: number, height: number, minPixels = 1) {
  const seen = new Uint8Array(mask.length);
  const out: Array<{ pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }> = [];
  const dirs = [-1, 0, 1];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = idx(x, y, width);
      if (!mask[start] || seen[start]) continue;

      const queue = [start];
      seen[start] = 1;
      const pixels: number[] = [];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      while (queue.length) {
        const cur = queue.pop() as number;
        pixels.push(cur);
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        for (let yi = 0; yi < dirs.length; yi += 1) {
          for (let xi = 0; xi < dirs.length; xi += 1) {
            const dx = dirs[xi];
            const dy = dirs[yi];
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = idx(nx, ny, width);
            if (!mask[ni] || seen[ni]) continue;
            seen[ni] = 1;
            queue.push(ni);
          }
        }
      }

      if (pixels.length >= minPixels) {
        out.push({ pixels, minX, minY, maxX, maxY });
      }
    }
  }

  return out;
}

function buildInitialHandMask(rgba: Uint8ClampedArray, gray: Uint8Array, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = rgbaAt(rgba, x, y, width);
      const maxV = Math.max(r, g, b);
      const minV = Math.min(r, g, b);
      const likelySkin =
        r > 35 &&
        g > 20 &&
        b > 10 &&
        maxV - minV > 12 &&
        Math.abs(r - g) > 8 &&
        r > g &&
        r > b;
      mask[idx(x, y, width)] = likelySkin ? 1 : 0;
    }
  }

  let refined = binaryClose(mask, width, height, 2);
  refined = binaryOpen(refined, width, height, 1);

  const components = connectedComponents(refined, width, height, Math.floor((width * height) * 0.01));
  if (components.length > 0) {
    components.sort((a, b) => b.pixels.length - a.pixels.length);
    const out = new Uint8Array(width * height);
    for (let i = 0; i < components[0].pixels.length; i += 1) out[components[0].pixels[i]] = 1;
    return out;
  }

  const t = otsuThreshold(gray);
  const dark = new Uint8Array(width * height);
  const bright = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    dark[i] = gray[i] < t ? 1 : 0;
    bright[i] = gray[i] > t ? 1 : 0;
  }

  const candidates = [binaryOpen(binaryClose(dark, width, height, 1), width, height, 1), binaryOpen(binaryClose(bright, width, height, 1), width, height, 1)];
  let best = new Uint8Array(width * height);
  let bestScore = -Infinity;

  for (let m = 0; m < candidates.length; m += 1) {
    const comps = connectedComponents(candidates[m], width, height, Math.floor((width * height) * 0.03));
    for (let c = 0; c < comps.length; c += 1) {
      const comp = comps[c];
      const areaRatio = comp.pixels.length / (width * height);
      const cx = (comp.minX + comp.maxX) / 2;
      const cy = (comp.minY + comp.maxY) / 2;
      const centerDist = Math.hypot(cx - width / 2, cy - height / 2) / Math.hypot(width / 2, height / 2);
      const score = areaRatio * 2 - centerDist;
      if (score > bestScore) {
        bestScore = score;
        best.fill(0);
        for (let i = 0; i < comp.pixels.length; i += 1) best[comp.pixels[i]] = 1;
      }
    }
  }

  return best;
}

function maskBoundingBox(mask: Uint8Array, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let area = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[idx(x, y, width)]) continue;
      area += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (area === 0 || maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    area,
  };
}

function detectHandSideFromMask(mask: Uint8Array, width: number, height: number, box: BinaryBox, declaredHandSide?: "left" | "right"): HandSide {
  const leftLimit = Math.floor(box.minX + box.width * 0.35);
  const rightStart = Math.floor(box.minX + box.width * 0.65);
  const yStart = Math.floor(box.minY + box.height * 0.35);
  const yEnd = Math.floor(box.minY + box.height * 0.88);

  let leftCount = 0;
  let rightCount = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = box.minX; x < leftLimit; x += 1) {
      if (x >= 0 && x < width && y >= 0 && y < height && mask[idx(x, y, width)]) leftCount += 1;
    }
    for (let x = rightStart; x <= box.maxX; x += 1) {
      if (x >= 0 && x < width && y >= 0 && y < height && mask[idx(x, y, width)]) rightCount += 1;
    }
  }

  if (leftCount > rightCount * 1.08) return "right";
  if (rightCount > leftCount * 1.08) return "left";
  if (declaredHandSide) return declaredHandSide;
  return "unknown";
}

function topYNearX(mask: Uint8Array, width: number, height: number, xCenter: number, halfWindow: number, fallbackY: number): number {
  const xStart = Math.max(0, Math.floor(xCenter - halfWindow));
  const xEnd = Math.min(width - 1, Math.floor(xCenter + halfWindow));
  for (let y = 0; y < height; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      if (mask[idx(x, y, width)]) return y;
    }
  }
  return fallbackY;
}

function makeLandmarksFromMask(mask: Uint8Array, width: number, height: number, box: BinaryBox, handSide: HandSide): LandmarkMap {
  const side = handSide === "unknown" ? "right" : handSide;

  const xBy = {
    thumb: side === "right" ? box.minX + box.width * 0.16 : box.minX + box.width * 0.84,
    index: side === "right" ? box.minX + box.width * 0.31 : box.minX + box.width * 0.69,
    middle: box.minX + box.width * 0.5,
    ring: side === "right" ? box.minX + box.width * 0.67 : box.minX + box.width * 0.33,
    little: side === "right" ? box.minX + box.width * 0.83 : box.minX + box.width * 0.17,
  };

  const tipFallback = box.minY + box.height * 0.08;
  const tipWindow = Math.max(3, Math.floor(box.width * 0.04));

  const thumbTipY = topYNearX(mask, width, height, xBy.thumb, tipWindow, Math.floor(tipFallback + box.height * 0.09));
  const indexTipY = topYNearX(mask, width, height, xBy.index, tipWindow, Math.floor(tipFallback));
  const middleTipY = topYNearX(mask, width, height, xBy.middle, tipWindow, Math.floor(tipFallback));
  const ringTipY = topYNearX(mask, width, height, xBy.ring, tipWindow, Math.floor(tipFallback + box.height * 0.02));
  const littleTipY = topYNearX(mask, width, height, xBy.little, tipWindow, Math.floor(tipFallback + box.height * 0.04));

  const mcpY = box.minY + box.height * 0.36;
  const wristY = box.minY + box.height * 0.96;

  return {
    wrist: { x: round((box.minX + box.width * 0.5) / width), y: round(wristY / height) },
    thumbBase: { x: round(xBy.thumb / width), y: round((box.minY + box.height * 0.54) / height) },
    thumbTip: { x: round(xBy.thumb / width), y: round(thumbTipY / height) },
    indexBase: { x: round(xBy.index / width), y: round(mcpY / height) },
    indexTip: { x: round(xBy.index / width), y: round(indexTipY / height) },
    middleBase: { x: round(xBy.middle / width), y: round((box.minY + box.height * 0.34) / height) },
    middleTip: { x: round(xBy.middle / width), y: round(middleTipY / height) },
    ringBase: { x: round(xBy.ring / width), y: round(mcpY / height) },
    ringTip: { x: round(xBy.ring / width), y: round(ringTipY / height) },
    littleBase: { x: round(xBy.little / width), y: round((box.minY + box.height * 0.39) / height) },
    littleTip: { x: round(xBy.little / width), y: round(littleTipY / height) },
  };
}

function integralImage(gray: Uint8Array, width: number, height: number): Float64Array {
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += gray[idx(x - 1, y - 1, width)];
      integral[idx(x, y, width + 1)] = integral[idx(x, y - 1, width + 1)] + row;
    }
  }
  return integral;
}

function boxMean(integral: Float64Array, width: number, x0: number, y0: number, x1: number, y1: number): number {
  const iw = width + 1;
  const height = integral.length / iw - 1;
  const ax = clamp(Math.floor(x0), 0, width);
  const ay = clamp(Math.floor(y0), 0, height);
  const bx = clamp(Math.floor(Math.max(ax + 1, x1)), 0, width);
  const by = clamp(Math.floor(Math.max(ay + 1, y1)), 0, height);
  const sum =
    integral[idx(bx, by, iw)] -
    integral[idx(ax, by, iw)] -
    integral[idx(bx, ay, iw)] +
    integral[idx(ax, ay, iw)];
  return sum / ((bx - ax) * (by - ay));
}

function grayDilate(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let m = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const v = src[idx(nx, ny, width)];
          if (v > m) m = v;
        }
      }
      out[idx(x, y, width)] = m;
    }
  }
  return out;
}

function grayErode(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let m = 255;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const v = src[idx(nx, ny, width)];
          if (v < m) m = v;
        }
      }
      out[idx(x, y, width)] = m;
    }
  }
  return out;
}

function sobelEdge(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const gx =
        -gray[idx(x - 1, y - 1, width)] - 2 * gray[idx(x - 1, y, width)] - gray[idx(x - 1, y + 1, width)] +
        gray[idx(x + 1, y - 1, width)] + 2 * gray[idx(x + 1, y, width)] + gray[idx(x + 1, y + 1, width)];
      const gy =
        -gray[idx(x - 1, y - 1, width)] - 2 * gray[idx(x, y - 1, width)] - gray[idx(x + 1, y - 1, width)] +
        gray[idx(x - 1, y + 1, width)] + 2 * gray[idx(x, y + 1, width)] + gray[idx(x + 1, y + 1, width)];
      out[idx(x, y, width)] = clamp(Math.round(Math.hypot(gx, gy) * 0.22), 0, 255);
    }
  }
  return out;
}

function zhangSuenThinning(src: Uint8Array, width: number, height: number, maxIteration = 24): Uint8Array {
  const out = new Uint8Array(src);
  const p = (x: number, y: number) => out[idx(x, y, width)];

  for (let iter = 0; iter < maxIteration; iter += 1) {
    let changed = 0;

    for (let phase = 0; phase < 2; phase += 1) {
      const del: number[] = [];
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          if (p(x, y) === 0) continue;

          const p2 = p(x, y - 1);
          const p3 = p(x + 1, y - 1);
          const p4 = p(x + 1, y);
          const p5 = p(x + 1, y + 1);
          const p6 = p(x, y + 1);
          const p7 = p(x - 1, y + 1);
          const p8 = p(x - 1, y);
          const p9 = p(x - 1, y - 1);

          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;

          const a =
            (p2 === 0 && p3 === 1 ? 1 : 0) +
            (p3 === 0 && p4 === 1 ? 1 : 0) +
            (p4 === 0 && p5 === 1 ? 1 : 0) +
            (p5 === 0 && p6 === 1 ? 1 : 0) +
            (p6 === 0 && p7 === 1 ? 1 : 0) +
            (p7 === 0 && p8 === 1 ? 1 : 0) +
            (p8 === 0 && p9 === 1 ? 1 : 0) +
            (p9 === 0 && p2 === 1 ? 1 : 0);
          if (a !== 1) continue;

          if (phase === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }

          del.push(idx(x, y, width));
        }
      }

      if (del.length > 0) {
        changed += del.length;
        for (let i = 0; i < del.length; i += 1) out[del[i]] = 0;
      }
    }

    if (changed === 0) break;
  }

  return out;
}

function neighborIndexes(i: number, width: number, height: number): number[] {
  const x = i % width;
  const y = Math.floor(i / width);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      out.push(idx(nx, ny, width));
    }
  }
  return out;
}

function farthestPair(points: number[], width: number): [number, number] {
  let bestA = points[0];
  let bestB = points[Math.max(0, points.length - 1)];
  let best = -1;

  const sample = points.length > 90 ? points.filter((_, i) => i % Math.ceil(points.length / 90) === 0) : points;
  for (let i = 0; i < sample.length; i += 1) {
    const ai = sample[i];
    const ax = ai % width;
    const ay = Math.floor(ai / width);
    for (let j = i + 1; j < sample.length; j += 1) {
      const bi = sample[j];
      const bx = bi % width;
      const by = Math.floor(bi / width);
      const d = (ax - bx) ** 2 + (ay - by) ** 2;
      if (d > best) {
        best = d;
        bestA = ai;
        bestB = bi;
      }
    }
  }

  return [bestA, bestB];
}

function shortestPathWithinSet(start: number, end: number, pointSet: Set<number>, width: number, height: number): number[] {
  if (start === end) return [start];

  const queue = [start];
  const parent = new Map<number, number>();
  parent.set(start, -1);

  while (queue.length) {
    const cur = queue.shift() as number;
    const neighbors = neighborIndexes(cur, width, height);
    for (let i = 0; i < neighbors.length; i += 1) {
      const nx = neighbors[i];
      if (!pointSet.has(nx) || parent.has(nx)) continue;
      parent.set(nx, cur);
      if (nx === end) {
        const path: number[] = [end];
        let p = end;
        while (parent.get(p) !== -1) {
          p = parent.get(p) as number;
          path.push(p);
        }
        path.reverse();
        return path;
      }
      queue.push(nx);
    }
  }

  return [];
}

function simplifyPath(path: Point[], maxPoints = 96): Point[] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out: Point[] = [];
  for (let i = 0; i < path.length; i += step) out.push(path[i]);
  if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]);
  return out;
}

function extractLineCandidatesFromMask(params: {
  gray: Uint8Array;
  handMask: Uint8Array;
  width: number;
  height: number;
  box: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}): { candidates: LineCandidate[]; confidence: number } {
  const { gray, handMask, width, height, box } = params;

  const padX = Math.floor(box.width * 0.08);
  const padY = Math.floor(box.height * 0.08);
  const x0 = clamp(box.minX - padX, 0, width - 1);
  const y0 = clamp(box.minY - padY, 0, height - 1);
  const x1 = clamp(box.maxX + padX, 0, width - 1);
  const y1 = clamp(box.maxY + padY, 0, height - 1);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  const cropGray = new Uint8Array(cw * ch);
  const cropMask = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const srcI = idx(x + x0, y + y0, width);
      const dstI = idx(x, y, cw);
      cropGray[dstI] = gray[srcI];
      cropMask[dstI] = handMask[srcI];
    }
  }

  const integ = integralImage(cropGray, cw, ch);
  const enhanced = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const local = boxMean(integ, cw, x - 2, y - 2, x + 3, y + 3);
      const v = cropGray[idx(x, y, cw)];
      enhanced[idx(x, y, cw)] = clamp(Math.round((v - local) * 2 + 128), 0, 255);
    }
  }

  const closed = grayErode(grayDilate(enhanced, cw, ch, 2), cw, ch, 2);
  const blackHat = new Uint8Array(cw * ch);
  for (let i = 0; i < blackHat.length; i += 1) {
    blackHat[i] = clamp(closed[i] - enhanced[i], 0, 255);
  }

  const blackInteg = integralImage(blackHat, cw, ch);
  const edge = sobelEdge(enhanced, cw, ch);
  const lineMask = new Uint8Array(cw * ch);

  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const i = idx(x, y, cw);
      if (!cropMask[i]) continue;

      const inPalmBand = y >= Math.floor(ch * 0.12) && y <= Math.floor(ch * 0.95);
      if (!inPalmBand) continue;

      const local = boxMean(blackInteg, cw, x - 7, y - 7, x + 8, y + 8);
      const isDarkLine = blackHat[i] > local + 6 && blackHat[i] > 12;
      const isEdge = edge[i] > 42 && blackHat[i] > 6;
      lineMask[i] = isDarkLine || isEdge ? 1 : 0;
    }
  }

  let cleaned = binaryOpen(binaryClose(lineMask, cw, ch, 1), cw, ch, 1);
  const preComps = connectedComponents(cleaned, cw, ch, 12);
  if (preComps.length === 0) {
    return { candidates: [], confidence: 0 };
  }

  const pruned = new Uint8Array(cw * ch);
  for (let c = 0; c < preComps.length; c += 1) {
    const comp = preComps[c];
    if (comp.pixels.length < 18) continue;
    for (let i = 0; i < comp.pixels.length; i += 1) pruned[comp.pixels[i]] = 1;
  }

  const skeleton = zhangSuenThinning(pruned, cw, ch, 22);
  cleaned = skeleton;
  const components = connectedComponents(cleaned, cw, ch, 16);

  const candidates: LineCandidate[] = [];

  for (let c = 0; c < components.length; c += 1) {
    const comp = components[c];
    const pointSet = new Set<number>(comp.pixels);
    const endpoints: number[] = [];
    let junctions = 0;

    for (let i = 0; i < comp.pixels.length; i += 1) {
      const p = comp.pixels[i];
      const nCount = neighborIndexes(p, cw, ch).filter((n) => pointSet.has(n)).length;
      if (nCount === 1) endpoints.push(p);
      if (nCount >= 3) junctions += 1;
    }

    const [startIdx, endIdx] =
      endpoints.length >= 2
        ? farthestPair(endpoints, cw)
        : farthestPair(comp.pixels, cw);

    let pathIdx = shortestPathWithinSet(startIdx, endIdx, pointSet, cw, ch);
    if (pathIdx.length < 2) {
      pathIdx = [startIdx, endIdx];
    }

    let path: Point[] = pathIdx.map((pi) => {
      const px = pi % cw;
      const py = Math.floor(pi / cw);
      return {
        x: (x0 + px) / width,
        y: (y0 + py) / height,
      };
    });

    path = simplifyPath(path, 110).map((p) => ({ x: round(p.x, 5), y: round(p.y, 5) }));

    const length = polylineLength(path);
    if (length < 0.06) continue;

    let intensityAcc = 0;
    let intensitySq = 0;
    for (let i = 0; i < pathIdx.length; i += 1) {
      const pi = pathIdx[i];
      intensityAcc += cropGray[pi];
      intensitySq += cropGray[pi] * cropGray[pi];
    }
    const avgIntensity = intensityAcc / Math.max(1, pathIdx.length);
    const stdIntensity = Math.sqrt(
      Math.max(0, intensitySq / Math.max(1, pathIdx.length) - avgIntensity * avgIntensity),
    );

    const darkness = clamp((170 - avgIntensity) / 170, 0, 1);
    const depthScore = clamp(darkness * 0.7 + clamp(stdIntensity / 40, 0, 1) * 0.3, 0, 1);
    const curvatureScore = computeCurvature(path);
    const branches = junctions + Math.max(0, endpoints.length - 2);
    const breaks = Math.max(0, Math.floor((endpoints.length - 2) / 2));

    const confidence = clamp(
      0.28 +
        Math.min(0.35, length * 0.9) +
        depthScore * 0.22 +
        Math.min(0.12, path.length / 140) -
        breaks * 0.05,
      0,
      1,
    );

    const minX = comp.minX / cw;
    const maxX = comp.maxX / cw;
    const minY = comp.minY / ch;
    const maxY = comp.maxY / ch;

    candidates.push({
      id: `line-${c + 1}`,
      path,
      startPoint: path[0],
      endPoint: path[path.length - 1],
      length: round(length, 5),
      depthScore: round(depthScore, 5),
      curvatureScore: round(curvatureScore, 5),
      breaks,
      branches,
      confidence: round(confidence, 5),
      boundingBox: {
        x: round((x0 / width) + minX * (cw / width), 5),
        y: round((y0 / height) + minY * (ch / height), 5),
        width: round((maxX - minX) * (cw / width), 5),
        height: round((maxY - minY) * (ch / height), 5),
      },
      averageIntensity: round(avgIntensity, 3),
    });
  }

  candidates.sort((a, b) => b.confidence * b.length - a.confidence * a.length);
  const deduped: LineCandidate[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    const overlap = deduped.some((d) => {
      const ds = Math.hypot(c.startPoint.x - d.startPoint.x, c.startPoint.y - d.startPoint.y);
      const de = Math.hypot(c.endPoint.x - d.endPoint.x, c.endPoint.y - d.endPoint.y);
      return ds < 0.06 && de < 0.06;
    });
    if (!overlap) deduped.push(c);
    if (deduped.length >= 18) break;
  }

  const conf = deduped.length
    ? clamp(
        deduped.reduce((acc, c) => acc + c.confidence, 0) / deduped.length * 0.7 +
          Math.min(0.3, deduped.length / 14),
        0,
        1,
      )
    : 0;

  return { candidates: deduped, confidence: round(conf, 5) };
}

async function imageToBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("이미지를 디코딩하지 못했습니다."));
    el.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 컨텍스트를 만들지 못했습니다.");
  ctx.drawImage(img, 0, 0);
  return createImageBitmap(canvas);
}

export async function analyzePalmImageFile(
  file: File,
  options?: { declaredHandSide?: "left" | "right" },
): Promise<PalmImageAnalysisResult> {
  const bitmap = await imageToBitmap(file);

  const maxDim = 360;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(96, Math.round(bitmap.width * scale));
  const height = Math.max(96, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("이미지 분석용 캔버스 초기화에 실패했습니다.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = grayscaleFromRgba(imageData.data, width, height);

  const brightnessRaw = computeBrightness(gray);
  const sharpnessRaw = computeSharpness(gray, width, height);
  const contrastRaw = computeContrast(gray);

  const handMask = buildInitialHandMask(imageData.data, gray, width, height);
  const box = maskBoundingBox(handMask, width, height);
  const warnings: string[] = [];

  const hasPalm = Boolean(box && box.area > width * height * 0.08);
  const coverage = box ? (box.width * box.height) / (width * height) : 0;

  if (brightnessRaw < 80) warnings.push("이미지가 어둡습니다.");
  if (sharpnessRaw < 35) warnings.push("손금이 흐릿합니다.");
  if (contrastRaw < 20) warnings.push("손금과 피부의 대비가 낮습니다.");
  if (coverage < 0.35) warnings.push("손바닥이 너무 작게 촬영되었습니다.");
  if (coverage > 0.95) warnings.push("손 일부가 잘렸을 가능성이 있습니다.");

  const handSide = box ? detectHandSideFromMask(handMask, width, height, box, options?.declaredHandSide) : "unknown";

  const handLandmarks = box ? makeLandmarksFromMask(handMask, width, height, box, handSide) : null;

  const { candidates, confidence } = box
    ? extractLineCandidatesFromMask({
        gray,
        handMask,
        width,
        height,
        box,
      })
    : { candidates: [], confidence: 0 };

  const hasEnoughQuality =
    brightnessRaw >= 80 &&
    sharpnessRaw >= 35 &&
    contrastRaw >= 20 &&
    coverage >= 0.2 &&
    coverage <= 0.97;

  return {
    handSide,
    handLandmarks,
    lineCandidates: candidates,
    imageQuality: {
      isPalmDetected: hasPalm,
      handSide,
      brightness: brightnessRaw > 120 ? "good" : brightnessRaw > 80 ? "normal" : "dark",
      sharpness: sharpnessRaw > 60 ? "good" : sharpnessRaw > 35 ? "normal" : "blurry",
      contrast: contrastRaw > 32 ? "good" : contrastRaw > 20 ? "normal" : "low",
      palmCoverage: round(coverage, 5),
      rotation: 0,
      warnings,
      hasEnoughQuality,
    },
    debug: {
      imageWidth: width,
      imageHeight: height,
      lineMapConfidence: confidence,
      handMaskArea: box?.area || 0,
    },
  };
}
