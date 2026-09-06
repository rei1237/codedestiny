"use client";

/**
 * 결제 후 자동 재개 — React 호출부용 공유 훅.
 *
 * 🔴 왜 필요한가: 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 `ensurePaidAccess` 의 `await` 가
 * 페이지와 함께 죽는다. 복귀한 문서는 새 문서라 클로저가 전부 사라져 `onPaid` 가 영영 실행되지 않는다 —
 * "결제했는데 메인 화면"의 정체다. 정적 축(js/**)이 쓰는 것과 같은 계약을 React 에서 쓰기 위한 얇은 배선이다.
 *
 * 계약(정본: js/core/checkout-entry.js 의 sanitizePaidResumeDescriptor ~ runPaidResume):
 * 1. 결제 **직전에** 화면 상태를 서술자로 굳힌다 — `args` 는 원시값만 살아남으므로 배열·객체는
 *    `JSON.stringify` 로 한 칸에 접는다.
 * 2. 컴포넌트 마운트 시 핸들러를 등록한다. 복귀 직후 아직 하이드레이션 전이어도 runPaidResume 이
 *    최대 8초 기다린다.
 * 3. 🔴 핸들러는 **게이트를 다시 타는 공개 함수가 아니라 게이트 없는 코어**를 부른다 — 다시 타면
 *    영수증 삼중키(featureKey|contentKey|profileId)가 어긋났을 때 결제창이 다시 떠 재과금이 된다.
 * 4. 🔴 `action` 은 빈 문자열이다. React 라우트는 PG 복귀 URL 이 그 라우트 자신이라 이미 열려 있다 —
 *    딥링크를 넣으면 openPaidResumeSurface 가 셸 타일을 눌러 이중 이동이 난다.
 *
 * 서버에 결제 증빙을 다시 실어 보내는 기능은 두 번째 인자 `grant`(PaidResumeGrant)를 그대로 쓴다.
 * 없으면 402 다 — 화면은 열렸는데 서버 기록이 없어 다음에 또 결제되는 상태가 정확히 그것이다.
 */

import { useCallback, useEffect, useRef } from "react";
import checkoutEntry, {
  type PaidResumeDescriptor,
  type PaidResumeGrant,
} from "@/js/core/checkout-entry.js";

/** 서술자에 실을 수 있는 값. checkout-entry 가 나머지는 조용히 버린다. */
export type PaidResumeArgs = Record<string, string | number | boolean | null>;

/**
 * 재개 실행부. `false` 를 돌려주면 복귀 처리가 '지금 열기' 카드를 그린다(재개 실패는 화면을
 * 멈추는 것이 아니라 사용자가 직접 여는 경로로 떨어진다).
 */
export type PaidResumeRunner = (
  args: PaidResumeArgs,
  grant: PaidResumeGrant | null,
) => boolean | Promise<boolean>;

/**
 * @param kind 재개 종류. 기능당 하나이며 서술자와 핸들러가 이 값으로 만난다.
 * @param run  복귀 후 실행할 게이트 없는 코어.
 * @returns `ensurePaidAccess({ resume })` 에 넣을 서술자 생성기.
 */
export function usePaidResume(kind: string, run: PaidResumeRunner) {
  const runRef = useRef<PaidResumeRunner>(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!kind) return undefined;
    // 🔴 해제 API 가 없다(registerPaidResumeHandler 만 있다) — 언마운트 뒤에도 레지스트리에는
    //    이 클로저가 남으므로, 죽은 화면이 재개를 삼키지 않게 alive 로 즉시 false 를 돌린다.
    let alive = true;
    try {
      checkoutEntry.registerPaidResumeHandler(kind, (descriptor, grant) => {
        if (!alive) return false;
        const args =
          descriptor && descriptor.args && typeof descriptor.args === "object"
            ? (descriptor.args as PaidResumeArgs)
            : {};
        return runRef.current(args, grant || null);
      });
    } catch {
      /* 등록 실패는 재개 포기로만 이어진다 — 정상 인페이지 결제 흐름은 그대로다. */
    }
    return () => {
      alive = false;
    };
  }, [kind]);

  return useCallback(
    (args: PaidResumeArgs = {}): PaidResumeDescriptor => ({ kind, action: "", args }),
    [kind],
  );
}

/** 배열·객체를 서술자 한 칸에 접는다. 실패하면 빈 문자열이라 호출부가 재개를 포기할 수 있다. */
export function packPaidResumeArg(value: unknown): string {
  try {
    return JSON.stringify(value) || "";
  } catch {
    return "";
  }
}

/** packPaidResumeArg 의 역. 복원 실패는 `null` 이며 호출부는 그때 `false` 를 돌려준다. */
export function unpackPaidResumeArg<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default usePaidResume;
