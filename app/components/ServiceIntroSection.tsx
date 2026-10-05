import type { ReactNode } from "react";
import styles from "./ServiceIntroSection.module.css";
import masks from "./service-intro/yehwaIntroMasks.generated.module.css";

// AI 상담 라우트 8개는 서비스 설명·이용 상황·진행 순서·FAQ 전체를
// <section className="sr-only"> 안에 넣어 화면에는 보이지 않게 두고 있었다.
// 짧은 접근성 레이블이 아니라 페이지 본문 전체를 숨긴 형태라
// Google 의 Hidden text and links 정책에 걸릴 소지가 크다.
//
// 내용 자체는 실제로 유용하므로 지우지 않고 "숨김만" 없앤다.
// 마크업은 각 페이지에 그대로 두고(순수 h1/h2/p/ul/ol), 여기서 자손 선택자로만
// 스타일을 입혀 8개 페이지의 본문을 건드리지 않는다.
//
// 배치는 인터랙티브 앱 아래. 위에 두면 도구까지 스크롤이 길어진다.
//
// 2026-10-05 달빛 예화 공통 양식: 명조 제목, 상단 초승달 + 꽃가지 띠, 하단 맺음 가지, 반짝임 목록 표식.
// 스타일은 ./ServiceIntroSection.module.css, 장식 선 기하는 생성기 산출물(service-intro/)이 소유한다.
// 장식은 CSS 마스크라 색인 HTML 에 SVG 경로가 실리지 않는다(장식 span 은 aria-hidden).
// tone="yeoni" 는 연이(꽃돼지) 화면용 딥 플럼 변주다 — 구조·서체는 같고 표면·글자·선 색만 한 세트로 바뀐다.
export default function ServiceIntroSection({
  label,
  tone = "night",
  children,
}: {
  label: string;
  tone?: "night" | "yeoni";
  children: ReactNode;
}) {
  return (
    <section aria-label={label} data-tone={tone} className={`${styles.section} ${masks.masks}`}>
      {/* 좌우 여백은 좁은 화면에서만 줄인다(#1435 와 같은 처방 — 글자를 줄이는 대신 열을 넓힌다).
          실측 2026-09-02 /neo-operation-room/ 360x800: 바깥 px-4(16) + 카드 px-5(20) + ul pl-5(20)
          이 겹쳐 li 본문 열이 266px 였다(#1435 기준선: 254px 문제 · 274px 수용). 카드 안쪽만
          12px 로 좁힌다. 바깥 16px 는 그대로 둔다 — 바로 아래 ImmersiveRelatedLinks 가 같은 px-4 를
          써서 두 블록의 좌변이 맞아 있다. 폭이 남는 sm(640px) 이상에서는 넓힌다. */}
      <div className={styles.card}>
        <span className={styles.crest} aria-hidden="true">
          <span className={styles.halo}>
            <span className={styles.moon} />
          </span>
        </span>
        <div className={styles.body}>{children}</div>
        <span className={styles.sprig} aria-hidden="true" />
      </div>
    </section>
  );
}
