"use client";

import Link from "next/link";
import { hasPhoneInput } from "./phone-input";

/**
 * 결제용 휴대폰 번호 — 선택 동의 고지 (개인정보 보호법 제15조 제2항 · 제22조).
 *
 * 가입 마무리 화면(AuthShell)과 프로필 보완 화면(/onboarding)이 **함께 쓴다**.
 * 예전에는 같은 동의 문구가 두 파일에 복붙돼 있어 한쪽만 고치면 조용히 어긋났다
 * (phone-input.ts 를 두 화면이 공유하는 것과 같은 이유로 여기로 합쳤다).
 *
 * 🔴 제15조 제2항이 요구하는 **네 가지를 모두** 화면에 둔다 — ①이용 목적 ②수집 항목
 * ③보유·이용 기간 ④거부 권리와 거부 시 불이익. 하나라도 빠지면 동의를 받은 것으로 보기 어렵다.
 * 접어 두지 않는 것도 같은 이유다: 법정 고지가 기본 숨김이면 고지했다고 말하기 어렵다.
 *
 * 🔴 "거부해도 불이익이 없다"가 사실이려면 호출하는 화면에 **건너뛰기 경로가 살아 있어야 한다.**
 * 그 경로를 없애려면 이 문구도 함께 고쳐야 한다(가드가 두 화면 모두에서 이를 고정한다).
 */

export type PhoneConsentCopy = {
  legend: string;
  agree: string;
  itemLabel: string;
  itemBody: string;
  purposeLabel: string;
  purposeBody: string;
  retentionLabel: string;
  retentionBody: string;
  refusalLabel: string;
  refusalBody: string;
  policyLink: string;
};

export const PHONE_CONSENT_COPY_KO: PhoneConsentCopy = {
  legend: "선택 동의",
  agree: "결제 진행 목적의 휴대폰 번호 수집·이용에 동의합니다.",
  itemLabel: "수집 항목",
  itemBody: "휴대폰 번호",
  purposeLabel: "이용 목적",
  purposeBody: "결제 진행 및 구매자 확인 (결제대행사 포트원·KG이니시스에 전달)",
  retentionLabel: "보유·이용 기간",
  retentionBody: "회원 탈퇴 시까지. 단, 전자상거래법 등 법령상 보존 의무가 있는 거래기록은 그 기간",
  refusalLabel: "거부 권리",
  refusalBody: "동의하지 않아도 서비스를 이용할 수 있고 불이익이 없습니다. 결제할 때 다시 여쭤봅니다.",
  policyLink: "개인정보처리방침 전문",
};

export const PHONE_CONSENT_COPY_EN: PhoneConsentCopy = {
  legend: "Optional consent",
  agree: "I agree to the collection and use of my phone number for payment processing.",
  itemLabel: "What we collect",
  itemBody: "Mobile phone number",
  purposeLabel: "Why",
  purposeBody: "Processing payments and verifying the purchaser (shared with our payment providers, PortOne and KG Inicis)",
  retentionLabel: "How long",
  retentionBody: "Until you delete your account — except transaction records we must keep by law",
  refusalLabel: "Your right to refuse",
  refusalBody: "You can decline and still use the service; there is no penalty. We will ask again at checkout.",
  policyLink: "Read the full privacy policy",
};

type PhoneConsentNoticeProps = {
  /** 입력 중인 번호. 비어 있으면 아무것도 렌더하지 않는다(고지는 수집할 때만 필요하다). */
  phone: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  copy: PhoneConsentCopy;
  /** 체크박스 id — 한 페이지에 두 번 뜨는 일은 없지만 화면마다 다른 id 를 쓴다. */
  id: string;
  invalid?: boolean;
  describedBy?: string;
};

export default function PhoneConsentNotice({
  phone, checked, onChange, copy, id, invalid = false, describedBy,
}: PhoneConsentNoticeProps) {
  if (!hasPhoneInput(phone)) return null;

  const rows: Array<[string, string]> = [
    [copy.itemLabel, copy.itemBody],
    [copy.purposeLabel, copy.purposeBody],
    [copy.retentionLabel, copy.retentionBody],
    [copy.refusalLabel, copy.refusalBody],
  ];

  return (
    <fieldset className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] p-3 motion-safe:animate-consent-reveal">
      <legend className="px-1 text-xs font-bold text-[#cfc4e5]">{copy.legend}</legend>
      {/* 용어-설명 구조라 dl 이 실제로 맞는 마크업이다. */}
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] leading-5">
        {rows.map(([label, body]) => (
          <div key={label} className="contents">
            <dt className="whitespace-nowrap font-bold text-[#cfc4e5]">{label}</dt>
            <dd className="text-[#b9aecf]">{body}</dd>
          </div>
        ))}
      </dl>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm leading-5 text-[#ddd4ec]"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="h-5 w-5 shrink-0 accent-[#8f6ccc]"
        />
        <span>{copy.agree}</span>
      </label>
      <p className="mt-1 pl-9 text-[11px] leading-5 text-[#a99dbd]">
        <Link href="/privacy" target="_blank" className="underline underline-offset-4">{copy.policyLink}</Link>
      </p>
    </fieldset>
  );
}
