# Moon Music Player QA and Deployment

## Required Environment Variables

Client-safe public variables:

```bash
NEXT_PUBLIC_MUSIC_BASE_URL="https://music.code-destiny.com"
NEXT_PUBLIC_ASSETS_BASE_URL="https://assets.code-destiny.com"
```

Server/script-only variables for manifest generation:

```bash
Account_ID="your-cloudflare-account-id"
S3_API='{"accessKeyId":"your-r2-s3-access-key-id","secretAccessKey":"your-r2-s3-secret-access-key"}'
R2_MUSIC_BUCKET="codestinymuisic"
```

Use the actual bucket name if it differs in Cloudflare. Do not prefix secrets with `NEXT_PUBLIC_`. Do not commit `.env`, `.env.local`, access keys, secret keys, account tokens, or account IDs intended to stay private.

## R2 Custom Domain

Music and cover URLs are built from `NEXT_PUBLIC_MUSIC_BASE_URL` and object keys.

```txt
https://music.code-destiny.com/neosong/Code%20Destiny.wav
https://music.code-destiny.com/neosong/%EB%84%A4%EC%98%A4%20%EB%8D%B0%EB%B7%94.webp
```

Every generated URL must open directly in a new browser tab. If direct access fails, the player cannot load the file.

## CORS Policy

Add both localhost and the deployed production origin to the R2 bucket CORS policy.

Cloudflare dashboard JSON example:

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

Dashboard CORS JSON and Wrangler CORS JSON use different shapes. Apply the format for the method you are using.

## Manifest Location

Manual manifest:

```txt
app/music/_data/musicManifest.ts
```

Generated manifest script:

```txt
scripts/generate-music-manifest.ts
```

Default generated output:

```txt
public/music-manifest.json
```

Run:

```bash
npm run generate:music-manifest
```

Local object-key list mode:

```bash
npm run generate:music-manifest -- --input ./music-object-keys.txt
```

TypeScript output mode:

```bash
npm run generate:music-manifest -- --out src/data/generated-tracks.ts --format ts
```

## Add New Music

1. Upload `.wav` files to `neosong/` or `yeonisong/`.
2. Upload a same-basename `.webp` cover when a track needs a dedicated cover.
3. Keep folder fallback covers available:
   - `neosong/네오 데뷔.webp`
   - `yeonisong/꽃돼지 1집.png`
4. Update `app/music/_data/musicManifest.ts`, or run `npm run generate:music-manifest`.
5. Open the generated audio and cover URLs directly in a browser tab.
6. Run:

```bash
npm run typecheck -- --pretty false
npm run lint
npm run build
```

## QA Checklist

- Package install state is clean enough for build.
- TypeScript check passes.
- Lint has no blocking errors.
- Production build passes.
- `/music` opens on localhost.
- Neo, Yeoni, and All tabs switch correctly.
- Play and pause work after a user click.
- Previous and next controls change tracks.
- Seek bar updates and seeks.
- Volume and mute controls work.
- Repeat and shuffle controls toggle state.
- Current album cover displays, including `.webp`.
- Cover load failure shows the fallback artwork UI.
- Audio load failure shows a short user-facing error.
- Development mode shows detailed audio debug data in the console.
- Mobile layout stacks the playlist below the player.
- `prefers-reduced-motion` reduces animation.
- R2 `.wav` URLs open directly.
- R2 CORS includes localhost and production origins.
- Client bundle and tracked files contain no R2 secrets.

## Troubleshooting

Audio does not load:

- Check the R2 object key spelling.
- Open the `.wav` URL directly in a new tab.
- Confirm public access or custom domain routing.
- Confirm CORS allows `GET`, `HEAD`, and `Range`.
- Confirm the production origin and `http://localhost:3000` are in `AllowedOrigins`.
- Confirm `.wav` files return an audio Content-Type.
- Check Korean, spaces, and special characters are path-segment encoded.

Cover does not load:

- Open the cover URL directly in a new tab.
- Confirm `.webp` or `.png` object keys match the manifest.
- Confirm the folder fallback cover exists.

Manifest generation fails:

- `S3_API` must contain an R2 S3 Access Key ID and Secret Access Key pair.
- A Cloudflare API token is not the same as an R2 S3 credential pair.
- If credentials are unavailable, use local object-key list mode.

Security check:

- Keep R2 credentials only in `.env.local`, server runtime secrets, or CI secrets.
- Public manifests may contain object keys and public URLs only.
- Never expose R2 secret keys, access keys, or account tokens through `NEXT_PUBLIC_*`.
