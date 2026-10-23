// Use the existing approved brand sources; no new character artwork.
import sharp from "sharp";
import { copyFile } from "node:fs/promises";
const assets = "apps/mobile/ios/App/App/Assets.xcassets";
await sharp("public/images/brand/moonlight-garden-icon-source.png")
  .resize(1024, 1024).png().toFile(assets + "/AppIcon.appiconset/AppIcon-512@2x.png");
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await copyFile("apps/mobile/android/app/src/main/res/drawable/splash.png", assets + "/Splash.imageset/" + name);
}
console.log("iOS icons and splash reuse the approved Moonlight Garden assets.");
