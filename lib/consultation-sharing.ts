// Public invitations are built from this catalog, never from a private result URL.
export const consultationShareBrands = {
  tea: {
    title: '운명의 찻집 · 연이',
    invitation: '오늘 내 마음에 남은 한 문장. 너에게도 건네고 싶어서.',
    path: '/fortune-tea-house/',
    image: '/images/fortune-tea-house/flower-pig-honey-hug.webp',
    background: '#fff2e9', ink: '#44273b', accent: '#885069',
  },
  neo: {
    title: '네오의 팩폭 전략실',
    invitation: '이번 주 내 작전은 이거야. 너라면 어디부터 바꿀래?',
    path: '/neo-operation-room/',
    image: '/neo-operation-room/lion-seal-loading.webp',
    background: '#211831', ink: '#f6efdf', accent: '#ddba76',
  },
  codex: {
    title: '마스터 인연의 서',
    invitation: '관계를 돌아보며 마음에 남은 한 문장을 나눌게.',
    path: '/master-love-codex/',
    image: '/feature-details/assets/master-love-codex-og.webp',
    background: '#171320', ink: '#f6efdf', accent: '#d7bb81',
  },
} as const;

export type ConsultationShareBrand = keyof typeof consultationShareBrands;
export type ConsultationShareChoice = { id: string; label: string; text: string };

export function trimShareText(text: string, limit = 360) {
  const characters = Array.from(text.trim());
  return characters.length > limit ? characters.slice(0, limit - 1).join('') + '…' : characters.join('');
}

export function consultationInvitationUrl(brand: ConsultationShareBrand, channel: string) {
  const url = new URL(consultationShareBrands[brand].path, 'https://code-destiny.com');
  url.searchParams.set('utm_source', ['copy', 'native', 'kakao', 'image'].includes(channel) ? channel : 'share');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', `${brand}_consultation_result`);
  return url.toString();
}

function availableChoices(choices: Array<{ id: string; label: string; text?: string }>): ConsultationShareChoice[] {
  return choices.filter(choice => typeof choice.text === 'string' && choice.text.trim()).map(choice => ({ ...choice, text: choice.text!.trim() }));
}

// TeaHouseResultSheet receives completed/readable results, not progressive sections.
// Use raw saved fields so sanitizer placeholders never become shareable advice.
export function teaHouseShareChoices(result: {
  resultId?: string; synthesis?: { summary?: string }; actionPrescription?: string; closingLine?: string;
}): ConsultationShareChoice[] {
  if (!result.resultId) return [];
  return availableChoices([
    { id: 'summary', label: '상담 한 줄 요약', text: result.synthesis?.summary },
    { id: 'action', label: '오늘 해볼 작은 행동', text: result.actionPrescription },
    { id: 'closing', label: '마음에 남은 마지막 말', text: result.closingLine },
  ]);
}

export function neoShareChoices(session: {
  id?: string; sessionId?: string; status?: string; refinementStatus?: string;
  initialBriefing?: { frontlineSummary?: string; actionOrders?: string[] } | null;
  refinedOrder?: { verdict?: { statement?: string }; thisWeekFirstStep?: string } | null;
} | null): ConsultationShareChoice[] {
  if (!session || !(session.id || session.sessionId) || session.status !== 'completed' || session.refinementStatus === 'generating') return [];
  return availableChoices([
    { id: 'first-step', label: '이번 주 첫 실행', text: session.refinedOrder?.thisWeekFirstStep },
    { id: 'verdict', label: '네오의 최종 판단', text: session.refinedOrder?.verdict?.statement },
    { id: 'frontline', label: '지금 내 판세', text: session.initialBriefing?.frontlineSummary },
    { id: 'action', label: '첫 번째 작전', text: session.initialBriefing?.actionOrders?.[0] },
  ]);
}

export function masterLoveCodexShareChoices(session: {
  sessionId?: string; status?: string;
  chapters?: Array<{ content?: { keySentence?: string; insight?: string; actions?: string[] } }>;
}, completeChapterCount: number): ConsultationShareChoice[] {
  if (!session.sessionId || session.status !== 'completed' ||
      completeChapterCount <= 0 || session.chapters?.length !== completeChapterCount) return [];
  const content = session.chapters?.map(chapter => chapter.content).filter(Boolean) || [];
  return availableChoices([
    { id: 'sentence', label: '인연의 서에서 남은 한 문장', text: content.find(chapter => chapter?.keySentence?.trim())?.keySentence },
    { id: 'action', label: '관계에서 해볼 작은 행동', text: content.flatMap(chapter => chapter?.actions || []).find(action => typeof action === 'string' && action.trim()) },
    { id: 'insight', label: '관계를 바라보는 시선', text: content.find(chapter => chapter?.insight?.trim())?.insight },
  ]);
}

// The image stays in the browser. It contains only the owner's edited excerpt.
export async function renderConsultationShareCard(brand: ConsultationShareBrand, text: string): Promise<Blob> {
  const design = consultationShareBrands[brand];
  const font = '"Noto Sans KR", sans-serif';
  const fontSize = Array.from(text).length <= 100 ? 56 : 42;
  await document.fonts.load(`${fontSize}px ${font}`, text);
  const art = await new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = design.image;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('IMAGE_UNAVAILABLE');
  context.font = `${fontSize}px ${font}`;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && context.measureText(line + character).width > 900) { lines.push(line); line = ''; }
      line += character;
    }
    lines.push(line);
  }
  const lineHeight = fontSize + 20;
  canvas.height = Math.max(1080, 570 + lines.length * lineHeight);
  context.fillStyle = design.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = design.ink;
  context.font = `700 40px ${font}`;
  context.fillText(design.title, 80, 110);
  context.font = `26px ${font}`;
  context.fillText('내가 고른 상담 한 장', 80, 158);
  if (art) {
    const scale = Math.min(200 / art.width, 200 / art.height);
    context.drawImage(art, 790 + (200 - art.width * scale) / 2, 24, art.width * scale, art.height * scale);
  }
  context.strokeStyle = design.accent;
  context.beginPath(); context.moveTo(80, 245); context.lineTo(1000, 245); context.stroke();
  context.font = `${fontSize}px ${font}`;
  lines.forEach((line, index) => context.fillText(line, 90, 340 + index * lineHeight));
  context.fillStyle = design.accent;
  context.font = `27px ${font}`;
  context.fillText(design.invitation, 80, canvas.height - 170);
  context.font = `24px ${font}`;
  context.fillText('운세는 선택을 돕는 참고 이야기입니다.', 80, canvas.height - 110);
  context.fillText(`code-destiny.com${design.path}`, 80, canvas.height - 65);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('IMAGE_UNAVAILABLE')), 'image/png'));
}
