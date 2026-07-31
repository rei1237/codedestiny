// MediaPipe Hands 기반 실제 손 랜드마크 검출.
//
// 배경: 종전 buildApproxPalmLandmarks 는 피부톤 bbox 에서 21점을 "지어냈다".
// 그래서 손이 아닌 사진(벽·종이 등)도 항상 인식 성공으로 처리돼 판독이 나왔고,
// 오버레이 선은 실제 손 해부와 무관한 고정 비율 좌표에 그려졌다.
// 이 모듈은 진짜 21점을 얻어 (a) 손이 없으면 거부하고 (b) 가이드 선을 실제 해부에 앵커링한다.
//
// 로더 패턴은 관상 기능(PhysiognomyUI.js)이 FaceMesh 로 이미 쓰고 있는 것을 그대로 따른다:
// 다중 CDN 폴백 + 스크립트 중복 로드 방지 + 준비 타임아웃.
//
// 🔴 실패는 하드 실패가 아니다. CDN 차단(사내망·Capacitor 앱 등)이나 초기화 실패 시
//    null 을 반환하고, 호출부는 기존 근사 경로로 degrade 한다. 손금 진입 자체를 막지 않는다.

const MEDIAPIPE_CDN_BASES = ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"];
const HANDS_VERSION = "0.4.1646424915";
const SCRIPT_LOAD_TIMEOUT_MS = 12000;
const DETECT_TIMEOUT_MS = 10000;

/** MediaPipe Hands 21점 인덱스 중 손바닥 기준점으로 쓰는 것들. */
export const HAND_LANDMARK_INDEX = {
  wrist: 0,
  thumbCmc: 1,
  thumbTip: 4,
  indexMcp: 5,
  indexTip: 8,
  middleMcp: 9,
  middleTip: 12,
  ringMcp: 13,
  pinkyMcp: 17,
  pinkyTip: 20,
} as const;

export type HandLandmarkPoint = { x: number; y: number; z: number };

export type PalmLandmarkResult = {
  /** 21점, 이미지 픽셀 좌표. */
  points: HandLandmarkPoint[];
  /** MediaPipe 가 추정한 좌/우. 사진 미러링에 따라 뒤집힐 수 있어 참고용으로만 쓴다. */
  handedness: "Left" | "Right" | "unknown";
  handednessScore: number;
  imageWidth: number;
  imageHeight: number;
};

type MediaPipeHands = {
  setOptions(options: Record<string, unknown>): void;
  onResults(callback: (results: Record<string, unknown>) => void): void;
  send(input: { image: CanvasImageSource }): Promise<void>;
  close?(): void;
};

let runtimePromise: Promise<MediaPipeHands | null> | null = null;
let runtimeInstance: MediaPipeHands | null = null;
/** CDN 이 막힌 환경에서 매 업로드마다 12초씩 까먹지 않도록, 한 번 실패하면 세션 내 재시도하지 않는다. */
let runtimeUnavailable = false;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(code)), Math.max(1, timeoutMs));
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function loadScriptFromCandidates(candidates: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const sources = candidates.filter(Boolean);
    let index = 0;

    const tryNext = () => {
      const src = sources[index];
      index += 1;
      if (!src) {
        reject(new Error("MEDIAPIPE_SCRIPT_LOAD_FAILED"));
        return;
      }

      const existing = Array.from(document.querySelectorAll("script[src]")).find((script) => {
        const currentSrc = script.getAttribute("src") || "";
        return currentSrc === src || (script as HTMLScriptElement).src === src;
      }) as HTMLScriptElement | undefined;
      if (existing && existing.dataset.loaded === "1") {
        resolve(existing.src || src);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.dataset.palmMediapipe = "hands";
      script.onload = () => {
        script.dataset.loaded = "1";
        resolve(script.src || src);
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  });
}

async function createHandsRuntime(): Promise<MediaPipeHands | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const globalWindow = window as unknown as { Hands?: new (config: Record<string, unknown>) => MediaPipeHands };

  if (!globalWindow.Hands) {
    const scriptSrc = await withTimeout(
      loadScriptFromCandidates(
        MEDIAPIPE_CDN_BASES.map((base) => `${base}/@mediapipe/hands@${HANDS_VERSION}/hands.js`),
      ),
      SCRIPT_LOAD_TIMEOUT_MS,
      "MEDIAPIPE_SCRIPT_TIMEOUT",
    );
    // wasm/모델 파일은 스크립트가 실제로 로드된 CDN 과 같은 곳에서 받아야 한다
    // (jsdelivr 로 폴백됐는데 unpkg 에서 wasm 을 찾으면 깨진다).
    (globalWindow as unknown as { __palmHandsAssetBase?: string }).__palmHandsAssetBase = String(scriptSrc).replace(
      /\/hands\.js(?:\?.*)?$/,
      "",
    );
  }

  if (!globalWindow.Hands) return null;

  const assetBase =
    (globalWindow as unknown as { __palmHandsAssetBase?: string }).__palmHandsAssetBase
    || `${MEDIAPIPE_CDN_BASES[0]}/@mediapipe/hands@${HANDS_VERSION}`;

  const hands = new globalWindow.Hands({
    locateFile: (file: string) => `${assetBase}/${file}`,
  });

  hands.setOptions({
    // 정지 이미지 판독이므로 추적을 끈다(프레임 간 상태 재사용 금지).
    staticImageMode: true,
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return hands;
}

async function ensureHandsRuntime(): Promise<MediaPipeHands | null> {
  if (runtimeUnavailable) return null;
  if (runtimeInstance) return runtimeInstance;
  if (!runtimePromise) {
    runtimePromise = createHandsRuntime().catch((error) => {
      console.warn("[palm-landmarks] MediaPipe Hands unavailable", { message: (error as Error)?.message });
      return null;
    });
  }

  const runtime = await runtimePromise;
  if (!runtime) {
    runtimeUnavailable = true;
    runtimePromise = null;
    return null;
  }
  runtimeInstance = runtime;
  return runtime;
}

/**
 * 검출 결과.
 * 🔴 "손이 없다"(no-hand)와 "검출기를 못 썼다"(unavailable)는 반드시 구분해야 한다.
 *    둘을 null 하나로 합치면, CDN 이 막힌 사용자의 정상적인 손 사진을
 *    "손이 아니다"라며 거부하게 된다.
 */
export type PalmLandmarkDetection =
  | { status: "detected"; result: PalmLandmarkResult }
  | { status: "no-hand" }
  | { status: "unavailable"; reason: string };

/**
 * 이미지에서 손 랜드마크를 검출한다. 절대 throw 하지 않는다.
 */
export async function detectPalmLandmarks(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
): Promise<PalmLandmarkDetection> {
  if (!imageWidth || !imageHeight) return { status: "unavailable", reason: "EMPTY_IMAGE" };

  const hands = await ensureHandsRuntime();
  if (!hands) return { status: "unavailable", reason: "RUNTIME_UNAVAILABLE" };

  try {
    const results = await withTimeout(
      new Promise<Record<string, unknown>>((resolve, reject) => {
        hands.onResults((value) => resolve(value));
        hands.send({ image }).catch(reject);
      }),
      DETECT_TIMEOUT_MS,
      "MEDIAPIPE_DETECT_TIMEOUT",
    );

    const multiHandLandmarks = results.multiHandLandmarks as Array<Array<HandLandmarkPoint>> | undefined;
    const first = Array.isArray(multiHandLandmarks) ? multiHandLandmarks[0] : null;
    // 추론은 정상적으로 끝났는데 손이 안 나온 것 — 이건 진짜 "손 없음"이다.
    if (!Array.isArray(first) || first.length < 21) return { status: "no-hand" };

    const handednessList = results.multiHandedness as Array<{ label?: string; score?: number }> | undefined;
    const handednessRaw = String(handednessList?.[0]?.label || "");
    const handedness = handednessRaw === "Left" || handednessRaw === "Right" ? handednessRaw : "unknown";

    return {
      status: "detected",
      result: {
        points: first.map((point) => ({
          x: Number(point.x) * imageWidth,
          y: Number(point.y) * imageHeight,
          z: Number(point.z) || 0,
        })),
        handedness,
        handednessScore: Number(handednessList?.[0]?.score) || 0,
        imageWidth,
        imageHeight,
      },
    };
  } catch (error) {
    // 타임아웃·런타임 오류는 "손 없음"이 아니다.
    console.warn("[palm-landmarks] detection failed", { message: (error as Error)?.message });
    return { status: "unavailable", reason: "DETECT_ERROR" };
  }
}

/**
 * 21점을 palm-map-engine 이 받는 이름표 형태로 변환한다.
 * (worker 의 normalizePalmCoordinateSystem 이 이 키들을 읽는다)
 */
export function toEngineLandmarkMap(result: PalmLandmarkResult): Record<string, { x: number; y: number }> {
  const map: Record<string, { x: number; y: number }> = {};
  for (const [name, index] of Object.entries(HAND_LANDMARK_INDEX)) {
    const point = result.points[index];
    if (!point) continue;
    map[name] = { x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) };
  }
  // 인덱스 키도 함께 실어 엔진이 어느 쪽 규약을 쓰든 읽을 수 있게 한다.
  result.points.forEach((point, index) => {
    map[String(index)] = { x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) };
  });
  return map;
}

/**
 * 손바닥 사각 영역(손목 ~ 손가락 MCP)을 계산한다.
 * 종전의 피부톤 bbox 대신 이 값으로 가이드 선을 앵커링한다.
 */
export function computePalmRegion(result: PalmLandmarkResult): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} | null {
  const { wrist, thumbCmc, indexMcp, pinkyMcp } = HAND_LANDMARK_INDEX;
  const anchors = [wrist, thumbCmc, indexMcp, pinkyMcp, HAND_LANDMARK_INDEX.middleMcp, HAND_LANDMARK_INDEX.ringMcp]
    .map((index) => result.points[index])
    .filter(Boolean);
  if (anchors.length < 4) return null;

  const xs = anchors.map((point) => point.x);
  const ys = anchors.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;

  return { minX, minY, width, height };
}
