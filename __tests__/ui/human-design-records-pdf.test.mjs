import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('보관함 휴먼디자인 리포트 버튼은 결과 화면과 같은 플랜·도표 캡처·조판기로 PDF를 만든다', () => {
  const download = fs.readFileSync('app/human-design/report/_components/ReportDownload.tsx', 'utf8');
  const saved = fs.readFileSync('app/records/view/SavedHumanDesignPdfButton.tsx', 'utf8');
  const reading = fs.readFileSync('app/records/view/SavedServiceReading.tsx', 'utf8');
  for (const source of [download, saved]) {
    assert.match(source, /captureChartSlots/);
    assert.match(source, /exportHumanDesignReportPdf/);
  }
  assert.match(saved, /buildHumanDesignReportPlan/);
  assert.doesNotMatch(saved, /fetch\(|postPaidBody/);
  // 리포트(sections) 기록에만 붙고, 차트·해석 기록에는 붙지 않는다.
  assert.match(reading, /family==='human-design'[\s\S]*serviceId==='human-design'[\s\S]*SavedHumanDesignPdfButton/);
});
