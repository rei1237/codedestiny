// Original excerpts restored from b099e8a3a^, verified in the original record on 2026-09-25.
// Keep the quotation separate from subsequent events; these are examples, not a success rate.
export const PRESIDENTIAL_RECORDS = [
  { date: '2022-09-16', title: '대통령 윤석열 사주 분석', url: 'https://blog.naver.com/neosaju/222876455500',
    quote: '2025년 쯔음이 정치계 주요 인물들에게 많은 변화가 생기게 되는 시점이기에 이 시기에 뭔가 사건이 있을 것으로 보고있다',
    after: '2025년 4월 4일, 헌법재판소가 윤석열 대통령을 파면했습니다.' },
  { date: '2024-05-12', title: '2025년, 윤석열 대통령 탄핵 가능성에 대해서', url: 'https://blog.naver.com/neosaju/223444062729',
    quote: '분명한 것은 2025년으로 가면서 이 분의 운은 확 꺽이게 된다는 것이며, 송사운이 크게 걸린다는 것이다.',
    after: '2024년 12월 14일 국회에서 탄핵소추안이 가결됐고, 2025년 4월 4일 파면이 결정됐습니다.' },
  { date: '2024-05-27', title: '만약 이재명이 대통령이 된다면 일반적인 방법으로는 불가하다.', url: 'https://blog.naver.com/neosaju/223459696339',
    quote: '오로지 일반적인 방식이 아닌 혁명을 통해서만이 대통령이 가능한 사람이라고 필자는 보았으며, 그리고 그 시기는 2025년이 유일하다.',
    after: '2025년 6월 3일 조기 대선에서 이재명 후보가 당선됐습니다.' },
];

// Supplied by the service owner on 2026-10-04 for anonymous publication.
// The date of the email and a star rating were not supplied; neither is invented.
export const YEONGNYANGI_TESTIMONIAL = {
  title: '일상 속 장면이 모두 제 이야기라서 깜짝 놀랐습니다',
  source: '영냥이 참치 사주 분석 이용자 · 이메일 후기',
  paragraphs: [
    '안녕하세요!\n제가 퇴근하고 이제서야 메일을 봤는데 이렇게까지 섬세하게 챙겨주실 줄은 생각도 못했습니다. 방금 사이트 접속해서 사주명식을 재확인했는데 연이와 영냥이 모두 첨부사진과 같이 다시 잘 설정이 되었더리구요! ㅎ.ㅎ 오류 정정하시느라 고생이 많으셨어요.. 피드백도 엄청 빨리 주시고.... ㅠㅠ 이 가격에 이렇게까지 서비스를 받아도 되는 건가 싶고 죄송스럽네요...',
    '그리고 재분석한 영냥이 참치 사주분석도 어디가 아쉽다는 말씀이신지... ㅎㅎ 저를 CCTV 로 관찰하고 작성하신줄 알았네요.... 일상 속 장면이 모두 제 이야기라서 깜짝 놀랐습니다... 어떻게 이럴수가 있는거죠... 사주가 이렇게 개인화 정보처럼 맞아 떨어질수가 있죠...;;;',
    '분석해주신 대운 풀이대로... 올해 참... 인생공부 많이 했습니다... ㅎㅎ 저도 저를 이해할 수가 없어서 저에 대해 알고 싶은 마음에 사이트를 이용해본 건데 다른 사주어플이나 사주사이트와는 비교도 할 수 없는 결과물이네요... 그저 감사합니다.... 🙇🏻 ♀️ 영냥이는 심지어 적자운영이라고... 하셨는데.... 죄송하지만 ㅠㅠ 너무 유익해서 ㅠㅠ 앞으로의 인생 가이드로 삼기 위해 몇개 더 결제하고 좀 더 보겠습니다 ㅠㅠ💦',
    '오늘 회사에서 너~무 지쳤는데 자기 전에 이렇게 정성스러운 선물을 받아 너무 행복합니다. 드디어 저를 제대로 (?) 분석해주신 분을 만났고 ㅋㅋㅋ 저 스스로를 좀 더 이해하게 되어서 답답함이 좀 풀렸습니다.',
    '피드백 속도를 보면 하루종일 이슈 해결에만 매달리신 것 같아요... 또 그만큼 책임감도 어마어마하게 크신 듯 합니다.. 평안한 밤 되시길 바라고 이렇게 좋은 사이트 만들어주셔서 감사합니다. (저만 보기 너무 아깝습니다 ㅎㅎ)',
  ],
};

export const trustStoriesCopy = {
  recordsTitle: '대통령 운명 분석, 날짜와 원문으로 확인해요',
  recordsLead: '당시 남긴 해석과 이후의 사건을 함께 읽어보세요. 글 전체의 맥락은 원문에서 확인할 수 있어요.',
  original: '원글 읽기',
  after: '이후의 기록',
  fine: '과거 분석 사례와 이용자 개인의 경험입니다. 특정 사건의 예측이나 같은 결과를 보장하지 않습니다.',
  emailTitle: '영냥이 상담을 읽고 보내주신 편지',
  emailMore: '이메일 후기 전체 읽기',
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function renderTrustStoriesHtml() {
  const c = trustStoriesCopy, email = YEONGNYANGI_TESTIMONIAL;
  return `<div class="cd-trust-stories" lang="ko"><section aria-labelledby="cdPredictionRecordsTitle"><h3 id="cdPredictionRecordsTitle">${c.recordsTitle}</h3><p>${c.recordsLead}</p><ol class="cd-trust-stories__records">${PRESIDENTIAL_RECORDS.map(record => `<li><time datetime="${record.date}">${record.date.replaceAll('-', '.')}</time><h4>${escapeHtml(record.title)}</h4><blockquote>${escapeHtml(record.quote)}</blockquote><p class="cd-trust-stories__after">${c.after} · ${record.after}</p><a href="${record.url}" target="_blank" rel="noopener noreferrer">${c.original}<span class="sr-only">: ${escapeHtml(record.title)}</span></a></li>`).join('')}</ol></section><section class="cd-trust-stories__email" aria-labelledby="cdServiceLetterTitle"><h3 id="cdServiceLetterTitle">${c.emailTitle}</h3><p class="cd-trust-stories__source">${email.source}</p><blockquote>${email.title}</blockquote><details><summary>${c.emailMore}</summary>${email.paragraphs.map(text => `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>`).join('')}</details></section><p class="cd-trust-stories__fine">${c.fine}</p></div>`;
}
