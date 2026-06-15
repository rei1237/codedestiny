const assetOrigin = process.env.CODE_DESTINY_ASSET_ORIGIN || "https://assets.code-destiny.com";
const appOrigin = process.env.CODE_DESTINY_APP_ORIGIN || "https://code-destiny.com";

const fonts = [
  {
    file: "Mulmaru.woff2",
    role: "display",
    formats: ["font/woff2"],
    required: true,
  },
  {
    file: "Galmuri11-Bold.woff2",
    role: "decorative",
    formats: ["font/woff2"],
    required: true,
  },
  {
    file: "The Jamsil OTF 4 Medium.otf",
    role: "premium",
    formats: ["font/otf", "application/vnd.ms-opentype", "application/octet-stream"],
    required: true,
  },
  {
    file: "netmarbleM.ttf",
    role: "playful",
    formats: ["font/ttf", "application/x-font-ttf", "application/octet-stream"],
    required: true,
  },
];

const encodePath = (file) => file.split("/").map(encodeURIComponent).join("/");
const makeUrl = (file) => new URL(encodePath(file), `${assetOrigin.replace(/\/+$/, "")}/`).href;
const normalizeType = (value) => (value || "").split(";")[0].trim().toLowerCase();

const failures = [];
const warnings = [];

for (const font of fonts) {
  const url = makeUrl(font.file);
  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      Origin: appOrigin,
    },
  });

  const type = normalizeType(response.headers.get("content-type"));
  const cors = response.headers.get("access-control-allow-origin") || "";
  const cacheControl = response.headers.get("cache-control") || "";
  const size = response.headers.get("content-length") || "unknown";

  if (!response.ok) {
    failures.push(`${font.file}: HTTP ${response.status}`);
  }

  if (!font.formats.includes(type)) {
    failures.push(`${font.file}: unexpected MIME "${type || "missing"}"`);
  }

  if (!(cors === "*" || cors.includes(appOrigin))) {
    failures.push(`${font.file}: CORS does not allow ${appOrigin}`);
  }

  if (!cacheControl) {
    warnings.push(`${font.file}: Cache-Control header is missing`);
  } else if (!/max-age=31536000/i.test(cacheControl) || !/immutable/i.test(cacheControl)) {
    warnings.push(`${font.file}: Cache-Control is not immutable long-cache (${cacheControl})`);
  }

  console.log(`${font.role.padEnd(10)} ${font.file} ${response.status} ${type} ${size} bytes`);
}

if (warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nR2 font asset verification passed.");
