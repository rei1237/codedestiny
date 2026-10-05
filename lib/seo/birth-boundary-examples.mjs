// Fictional inputs. Verified against the existing service adapter, never a second engine.
export const boundaryExamples = {
  ko: {
    heading: '같은 출생지에서 23시 경계를 비교한 계산 예시',
    input: '가상 입력: 양력 1988-01-07, 여성, 서울(위도 37.5665·경도 126.978), Asia/Seoul. 아래 시각만 바꿉니다.',
    basis: '이 날짜에는 서머타임이 없습니다. 경도 보정량 약 -32.088분을 분 단위로 반올림해 -32분을 적용합니다. 보정 후 23시가 된 시점에 다음 날 일진으로 넘어가며, 시주의 천간도 그 일간을 기준으로 정합니다.',
    columns: ['입력 시각', '보정 시각', '일주', '시주'],
    rows: [
      { time: '22:59', corrected: '22:27', day: '辛酉', hour: '己亥' },
      { time: '23:00', corrected: '22:28', day: '辛酉', hour: '己亥' },
      { time: '23:32', corrected: '23:00', day: '壬戌', hour: '庚子' },
      { time: '00:10', corrected: '전날 23:38', day: '辛酉', hour: '戊子' },
    ],
    note: '기준 확인일: 2026-10-05. 영냥이 사주 어댑터를 네트워크 없이 실행해 네 기둥과 보정 정보를 대조했습니다. 해석의 적중률을 검증한 자료는 아닙니다. 다른 출생지·날짜에는 보정량과 결과가 달라집니다.',
  },
};

export function boundaryTableHtml() {
  const c = boundaryExamples.ko;
  return `<h2>${c.heading}</h2><p>${c.input}</p><table><thead><tr>${c.columns.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${c.rows.map(r => `<tr><td>${r.time}</td><td>${r.corrected}</td><td>${r.day}</td><td>${r.hour}</td></tr>`).join('')}</tbody></table><p>${c.basis}</p><p>${c.note}</p>`;
}
