import Image from "next/image";
import { PRESS_IMAGE, renderPressCoverageCopyHtml } from "../../lib/seo/press-coverage.mjs";

export default function PressCoverage() {
  return <section className="cd-press" aria-labelledby="cdPressTitle" lang="ko">
    <picture className="cd-press__picture">
      <source srcSet={PRESS_IMAGE.srcSet} sizes={PRESS_IMAGE.sizes} type="image/webp" />
      <Image className="cd-press__image" src={PRESS_IMAGE.src} alt={PRESS_IMAGE.alt} width={PRESS_IMAGE.width} height={PRESS_IMAGE.height} loading="lazy" />
    </picture>
    <div dangerouslySetInnerHTML={{ __html: renderPressCoverageCopyHtml() }} />
  </section>;
}
