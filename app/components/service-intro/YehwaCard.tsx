import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "../ServiceIntroSection.module.css";
import masks from "./yehwaIntroMasks.generated.module.css";

// 달빛 예화 카드 표면 — 밤하늘 그라디언트, 금빛 이중 테, 명조 제목, 반짝임 목록, FAQ 문항(Q).
// 기능 소개 카드(ServiceIntroSection)와 정보 화면의 안내 박스가 같은 표면을 쓴다.
// ornament 는 페이지의 첫 카드에만 켠다 — 카드마다 달·꽃이 붙으면 장식이 본문보다 시끄러워진다.
// 장식은 CSS 마스크 span(aria-hidden)이라 색인 HTML 에 SVG 경로가 실리지 않는다.
type YehwaCardTag = "div" | "section" | "header" | "article";

export default function YehwaCard({
  as: Tag = "div",
  tone = "night",
  ornament = true,
  className,
  children,
  ...rest
}: {
  as?: YehwaCardTag;
  tone?: "night" | "yeoni";
  ornament?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">) {
  const cls = [styles.card, masks.masks, ornament ? "" : styles.plain, className ?? ""].filter(Boolean).join(" ");
  return (
    <Tag data-tone={tone} className={cls} {...rest}>
      {ornament ? (
        <span className={styles.crest} aria-hidden="true">
          <span className={styles.halo}>
            <span className={styles.moon} />
          </span>
        </span>
      ) : null}
      <div className={styles.body}>{children}</div>
      {ornament ? <span className={styles.sprig} aria-hidden="true" /> : null}
    </Tag>
  );
}
