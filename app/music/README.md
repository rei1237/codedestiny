# Music R2 Checklist

## Public URL rule

Every R2 audio and cover URL used by the music player must be directly accessible when opened in a new browser tab.

Examples:

```txt
https://music.code-destiny.com/neosong/example.wav
https://music.code-destiny.com/neosong/%EB%84%A4%EC%98%A4%20%EB%8D%B0%EB%B7%94.webp
```

If a direct tab open fails, the player will also fail. Check the object key, public access, URL encoding, CORS, and file headers first.

## R2 CORS checklist

- Add the deployed production origin to `AllowedOrigins`.
- Keep the local dev origin while testing, for example `http://localhost:3000`.
- Allow `GET` and `HEAD`.
- Allow the `Range` request header for audio seeking.
- Expose range/length headers for browser audio playback.
- Confirm `.wav` files serve a valid audio Content-Type.

Cloudflare dashboard CORS policy example:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app-domain.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Cloudflare dashboard JSON and Wrangler CLI CORS JSON can use different shapes. Use the format that matches the actual application method.

## Generate manifest

The generator runs only in Node. R2 credentials stay on the server/script side and are never included in the client bundle.

Default output:

```bash
npm run generate:music-manifest
```

This writes:

```txt
public/music-manifest.json
```

Local object key list mode works without credentials:

```bash
npm run generate:music-manifest -- --input ./music-object-keys.txt
```

`music-object-keys.txt` example:

```txt
neosong/Code Destiny.wav
neosong/Code Destiny.webp
neosong/cover.webp
yeonisong/Moonlight Daydream.wav
yeonisong/Moonlight Daydream.webp
yeonisong/cover.webp
```

R2 listing mode uses server environment variables:

```bash
Account_ID=...
S3_API='{"accessKeyId":"...","secretAccessKey":"..."}'
R2_MUSIC_BUCKET=codestinymuisic
npm run generate:music-manifest
```

`S3_API` may also be stored as env-style text or `accessKeyId:secretAccessKey`. Keep this value in `.env.local` or server-only secret storage. Never expose it through `NEXT_PUBLIC_*`.

`S3_API` must be an R2 S3 credential pair. A Cloudflare API token is not enough for S3-compatible listing. Cloudflare R2 S3 Access Key ID is expected to be 32 characters.

Optional output formats:

```bash
npm run generate:music-manifest -- --out public/music-manifest.json
npm run generate:music-manifest -- --out src/data/generated-tracks.ts --format ts
```

Rules:

- Only `neosong/` and `yeonisong/` are scanned.
- Only `.wav` files become tracks.
- `.webp` covers are matched by the same basename first.
- If no same-basename `.webp` exists, `cover.webp` in the same folder is used.
- `.png` cover matching is also accepted as a fallback for existing assets.
- Generated manifests contain only public object keys and optional public URLs.
- Do not commit `.env` files or R2 credentials.
