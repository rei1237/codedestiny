"use client";

/**
 * 유료 상담 판매 화면에서 "결제하면 무엇을 받는가"를 숫자로 못박는 블록.
 *
 * 값을 여기서 만들지 않는다 — 각 상담 라우트가 서버에서 실제로 강제하는 분량
 * 계약(worker/routes/*.js 의 MIN/MAX_*_CHARS, 챕터 목록)을 호출부가 i18n 키로
 * 넘긴다. 화면이 서버 계약보다 크게 말하면 그건 과장 광고가 되므로, 숫자를
 * 바꿀 일이 생기면 서버 상수를 먼저 보고 옮긴다.
 *
 * 스타일은 상품마다 팔레트가 달라 컨테이너 클래스만 받는다(기능이 소유한
 * 디자인을 공용 컴포넌트가 재도색하지 않는다).
 */
import { useT } from "@/lib/i18n/useT";

interface DeliverableSpecProps {
  /** i18n 키 프리픽스. 예: "premiumUnlock.deliverable" */
  keyPrefix: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  titleClassName?: string;
  noteClassName?: string;
}

const FIELDS = [
  { label: "volumeLabel", value: "volumeValue" },
  { label: "chaptersLabel", value: "chaptersValue" },
  { label: "keepLabel", value: "keepValue" },
] as const;

export function DeliverableSpec({
  keyPrefix,
  className = "",
  labelClassName = "",
  valueClassName = "",
  titleClassName = "",
  noteClassName = "",
}: DeliverableSpecProps) {
  const t = useT();
  return (
    <dl className={className}>
      <div className="sm:col-span-3">
        <p className={titleClassName}>{t(`${keyPrefix}.title`)}</p>
      </div>
      {FIELDS.map((field) => (
        <div key={field.label}>
          <dt className={labelClassName}>{t(`${keyPrefix}.${field.label}`)}</dt>
          <dd className={valueClassName}>{t(`${keyPrefix}.${field.value}`)}</dd>
        </div>
      ))}
      <p className={`sm:col-span-3 ${noteClassName}`}>{t(`${keyPrefix}.guarantee`)}</p>
    </dl>
  );
}
