# Fortune Fish surface

- Mode: Experience. Target: fortune-teller-fish.html (public mirror generated).
- Request: one cute animated fish, sprite sheet, movement-led fortune, remove miscellaneous features, American casual character.
- Local direction: American seaside poster; warm paper, coral/orange fish, sea-glass pond, compressed Big Shoulders lettering already available in the project. Korean controls and interpretation.
- One goldfish; four sprite rows: swim, lift, curl, rest; four frames per row. Generated with built-in ImageGen on 2026-10-17, transparent 1254 x 1254 PNG. Asset: public/assets/fortune-fish/coral-fish-sprite-v1.png. Original retained in Codex generated_images.
- Flow: load asset -> observe a random movement -> reveal one interpretation and action -> repeat. No levels, species selection, categories, collection, or gacha UI. Existing ftf_v3 storage is neither read nor deleted.
- Payment/auth shared scripts unchanged; no API, DB, payment, or LLM invocation in the reading controller. Random symbolic readings are disclosed in the footer.
- Motion: sprite frames plus gentle movement; visible pause control; reduced motion uses static pose with equivalent observation text.
- QA: Playwright local-only network, 360/390/430/1280 widths, four outcomes, repeat, pause, reduced motion, prior local storage preserved, no JS errors. Read-only visual reviewer: no major defects in 390/1280/result captures.
- Detector: uppercase brand tracking, intentionally padded-by-layout pond artwork, and page-local display/type scale flagged as warnings; no blocker. New local typography does not change the global design system.

- Service cover (2026-10-17): fortune-fish-cover-v1.webp, generated with built-in ImageGen using the approved fish sprite as character reference. One orange goldfish, cream and sea-glass gouache water; 1280px WebP. Used by the home service introduction and standalone Open Graph image. Sprite and reading behavior unchanged.
