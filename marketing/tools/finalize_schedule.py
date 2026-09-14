"""Apply the confirmed November publishing window to editorial documents."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
status = '통합 자동화 code-destiny-2027 ACTIVE 확인. 매일 07:10 KST 띠별 운세, 21:10 KST 일반 콘텐츠를 운영한다. 신년편은 11/1부터 해당 일요일 21:10 일반 슬롯을 대체하며 11월 전 공개하지 않는다. Codex 실행 예약이며 Meta 자체 예약이 아니다. 로그인과 앱 실행이 필요하다.'
for name in ['tools/build_content.py', 'new-year-schedule.md']:
    p = root / name
    s = p.read_text(encoding='utf-8')
    s = s.replace('예약 자동화 카드는 suggested_create로 렌더됨. 카드 확정 전에는 활성 예약이 아니며 Meta 자체 예약도 아직 없음.', status)
    s = s.replace('원고 초안 준비 / 예약 카드 확정 필요', '원고 초안 준비 / 자동 실행 예약 활성')
    p.write_text(s, encoding='utf-8')
p = root / 'copy/monthly-and-new-year.md'
s = p.read_text(encoding='utf-8')
start, end = s.index('## Y01'), s.index('## 편집 근거와 경계')
s = s[:start] + '## 신년운세 공개 일정\n2027 신년운세는 9·10월에 공개하지 않는다. 11월 1일 갑목부터 매주 일요일 한 일간씩 공개한다. 원고는 new-year-2027-stems.md, 일정은 ../new-year-schedule.md를 따른다.\n\n' + s[end:]
p.write_text(s, encoding='utf-8')
p = root / 'STRATEGY.md'
s = p.read_text(encoding='utf-8').replace('자동 운영 시간은 아직 합의/설정하지 않았다. 계속 운영은 HANDOFF와 자료로 이어가며 예약 자동화는 명시된 시간 확정 후 설정한다.', status + ' 일반 콘텐츠 게시도 2026-09-09 사용자 승인 완료. 기존 일일 Worker 게시와 중복하지 않는다.')
p.write_text(s, encoding='utf-8')
p = root / 'HANDOFF.md'
s = p.read_text(encoding='utf-8')
s += '\n## 신년 예약 확정 업데이트\n' + status + '\n11/1 갑목 → 11/8 을목 → 11/15 병화 → 11/22 정화 → 11/29 무토 → 12/6 기토 → 12/13 경금 → 12/20 신금 → 12/27 임수 → 2027/1/3 계수. 이전 suggested_create 카드는 확정하지 않는다. 동일 시리즈 자동화 중복 생성 금지. 마지막 회차 완료 후 PAUSED 처리.\n\n## 제작 완료 상태\nThreads 14편, 띠별 운세 7일×12띠, 월간 원고, 신년 일간별 10편 초안, 카드뉴스 5세트 29장, Stories 7장, Reels 3편 MP4와 WebP 장면 렌더 완료. 실제 게시 URL 없음. 아직 제품 전체 check:fast는 실행하지 않았으며 렌더 검증을 제품 테스트 통과로 해석하지 않는다.\n'
p.write_text(s, encoding='utf-8')
p = root / 'content-log.md'
if not p.exists():
    data = json.loads((root/'copy/week01.json').read_text(encoding='utf-8'))
    lines = ['# 콘텐츠 발행 기록', '', '현재 신규 콘텐츠는 제작 상태이며 게시되지 않았다. 미수집 지표는 —로 표시한다. 예약은 게시 완료가 아니다. 기존 게시물 관측은 research/account-audit.md 및 performance.md 참조.', '', '| 날짜 | 플랫폼 | 종류 | 주제/ID | Hook | CTA | URL | 조회수 | 좋아요 | 댓글 | 저장 | 공유 | 프로필 방문 | 사이트 유입 | 비고 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for t in data['threads']:
        hook = t['text'].split('\n')[0]
        lines.append(f"| 미게시 | Threads | 텍스트 | {t['id']} {t['pillar']} | {hook} | {t['cta']} | — | — | — | — | — | — | — | — | 제작 완료 |")
    for i, name in enumerate(['갑목','을목','병화','정화','무토','기토','경금','신금','임수','계수'], 1):
        lines.append(f'| 예약표 참조 | Threads/Instagram | 신년운세 | Y{i:02} {name} | 일간별 원고 참조 | 내 일간 확인 | — | — | — | — | — | — | — | — | 자동화 활성, 게시 전 검수 |')
    p.write_text('\n'.join(lines)+'\n', encoding='utf-8')
print('November schedule and publishing status synchronized.')
