import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";

const DEFAULT_SAMPLE_DIR = process.env.PALM_SAMPLE_DIR || "C:/Users/Neo/Desktop/손금";
const DEFAULT_BASE = process.env.PALM_SMOKE_BASE || "http://127.0.0.1:3000";
const LIMIT = Number(process.env.PALM_SMOKE_LIMIT || 10);

// 손바닥 샘플만 고정 사용 (얼굴/배경 계열 배제)
const PALM_ALLOWLIST = [
  "046aedeca3d761bf28bf369047add154_res.jpeg",
  "1513726700758.jpg",
  "1515812505635.jpg",
  "1515812510372.jpg",
  "672e8cf2ae026964d58d94225db5d0e6_res.jpeg",
  "691fe0a5398d4b11da0eccec2a4e90f7_res.jpeg",
  "9sqfbrhnzobg1.jpeg",
  "does-anyone-else-have-marbled-hands-v0-25igbrtok2mf1.jpg",
  "read-my-palm-pls-33f-v0-amx0q1sqnt7g1.webp",
  "SE-40e69a2d-1da2-458c-86ad-c515694fc727.jpg",
];

// 스모크 설정에서 얼굴/배경 계열을 명시적으로 제외
const EXCLUDED_NAME_HINTS = [/face/i, /background/i, /얼굴/, /배경/, /wall/i, /desk/i, /table/i];

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const TEST_SIDES = ["left", "right"];

function parseCliArg(flag) {
  const hit = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!hit) return "";
  return hit.slice(flag.length + 1).trim();
}

function resolveMime(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function shouldExcludeByName(fileName) {
  return EXCLUDED_NAME_HINTS.some((pattern) => pattern.test(fileName));
}

function buildAuthToken() {
  const secret =
    process.env.PALM_SMOKE_JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    "dev-secret";
  const issuer = process.env.JWT_ISSUER || "code-destiny-api";
  const audience = process.env.JWT_AUDIENCE || process.env.AUTH_AUDIENCE || "code-destiny-web";

  return jwt.sign(
    {
      userId: "507f1f77bcf86cd799439011",
      role: "user",
    },
    secret,
    {
      issuer,
      audience,
      expiresIn: "20m",
    },
  );
}

async function readDataUrl(filePath, fileName) {
  const raw = await fs.readFile(filePath);
  const mimeType = resolveMime(fileName);
  const base64 = raw.toString("base64");
  return {
    mimeType,
    sizeBytes: raw.byteLength,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

async function run() {
  const base = parseCliArg("--base") || DEFAULT_BASE;
  const sampleDir = parseCliArg("--sampleDir") || DEFAULT_SAMPLE_DIR;
  const token = buildAuthToken();

  const selected = PALM_ALLOWLIST
    .filter((name) => !shouldExcludeByName(name))
    .slice(0, LIMIT)
    .map((name) => ({
      name,
      fullPath: path.join(sampleDir, name),
    }));

  if (selected.length !== LIMIT) {
    throw new Error(`샘플 수가 부족합니다. expected=${LIMIT}, actual=${selected.length}`);
  }

  const missing = [];
  for (const sample of selected) {
    try {
      await fs.access(sample.fullPath);
    } catch (e) {
      missing.push(sample.fullPath);
    }
  }
  if (missing.length > 0) {
    throw new Error(`샘플 파일 누락:\n${missing.join("\n")}`);
  }

  const results = [];
  for (const [index, sample] of selected.entries()) {
    const image = await readDataUrl(sample.fullPath, sample.name);

    for (const side of TEST_SIDES) {
      const payload = {
        uploadedHandSide: side,
        dominantHand: side,
        analysisPurpose: "general",
        leftPalmImage: side === "left" ? image.dataUrl : null,
        rightPalmImage: side === "right" ? image.dataUrl : null,
        leftImageQuality:
          side === "left"
            ? {
                brightness: "normal",
                sharpness: "normal",
                contrast: "normal",
                palmCoverage: 0.65,
              }
            : null,
        rightImageQuality:
          side === "right"
            ? {
                brightness: "normal",
                sharpness: "normal",
                contrast: "normal",
                palmCoverage: 0.65,
              }
            : null,
      };

      const response = await fetch(`${base}/api/palm/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let json = null;
      try {
        json = await response.json();
      } catch (e) {
        json = null;
      }

      const mode = json?.data?.mode || "";
      const reasonCode = json?.reasonCode || json?.data?.reasonCode || "";
      const isPass = response.status === 200 && ["full", "partial", "fallback"].includes(String(mode));

      results.push({
        no: index + 1,
        side,
        file: sample.name,
        status: response.status,
        mode,
        reasonCode,
        pass: isPass,
        sizeBytes: image.sizeBytes,
      });

      const marker = isPass ? "PASS" : "FAIL";
      console.log(
        `[${marker}] #${index + 1}/${side} ${sample.name} status=${response.status} mode=${String(mode || "-")} reasonCode=${String(reasonCode || "-")}`,
      );
    }
  }

  const passed = results.filter((row) => row.pass).length;
  const failed = results.length - passed;
  const leftPassed = results.filter((row) => row.side === "left" && row.pass).length;
  const rightPassed = results.filter((row) => row.side === "right" && row.pass).length;
  const leftTotal = results.filter((row) => row.side === "left").length;
  const rightTotal = results.filter((row) => row.side === "right").length;

  console.log("\n=== PALM SMOKE SUMMARY ===");
  console.log(`base=${base}`);
  console.log(`sampleDir=${sampleDir}`);
  console.log(`selected=${selected.length} samples (palm-only)`);
  console.log(`requests=${results.length} (left+right)`);
  console.log(`left=${leftPassed}/${leftTotal}`);
  console.log(`right=${rightPassed}/${rightTotal}`);
  console.log(`passed=${passed}`);
  console.log(`failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("SMOKE_OK palm-only-10-left-right");
}

run().catch((error) => {
  console.error("SMOKE_FATAL", error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
