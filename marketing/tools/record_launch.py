"""Record verified launch URLs and the user's ongoing publishing authorization."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
base = 'https://www.threads.com/@codedestiny_official/post/'
urls = ['DdCSd1ikqs1', 'DdCSeTJEl6E', 'DdCSfBVEg5W', 'DdCSfc3krya']
p = root/'content-log.md'
s = p.read_text(encoding='utf-8')
s = s.replace('현재 신규 콘텐츠는 제작 상태이며 게시되지 않았다.', '2026-09-09 Threads D01 4개 연속 글과 T01 공개를 실제 계정에서 확인했다.')
lines = s.splitlines()
for i, line in enumerate(lines):
    if '| T01 사주 |' in line:
        lines[i] = line.replace('| 미게시 |', '| 2026-09-09 KST |', 1).replace('| — | — | — | — | — | — | — | — | 제작 완료 |', f'| {base}DdCSvMaEgBz | — | — | — | — | — | — | — | 공개 확인 |')
s = '\n'.join(lines)+'\n'
if base+urls[0] not in s:
    for i, code in enumerate(urls):
        s += f'| 2026-09-09 KST | Threads | 띠별 오늘 운세 연속글 | D01 {i+1}/4 | 10년 경력 명리학자의 띠별 오늘 운세 | 내 사주 전체와 함께 읽기 | {base}{code} | — | — | — | — | — | — | — | 공개 확인; 자체 연속 답글은 독자 반응에서 제외 |\n'
    s += '| 2026-09-09 시도 | Instagram | 카드뉴스 6장 | C01 | 사주에 물이 없으면 마음도 메마를까? | 저장 후 다시 읽기 | — | — | — | — | — | — | — | — | 미게시: Chrome 확장 파일 URL 접근 권한 필요, WebP 변환 없음 |\n'
p.write_text(s,encoding='utf-8')
(root/'copy/published-20260909.json').write_text(json.dumps({'date':'2026-09-09','daily_urls':[base+x for x in urls],'general_url':base+'DdCSvMaEgBz','instagram_status':'blocked_file_url_permission','automation_id':'code-destiny-2027','automation_status':'ACTIVE','run_times_kst':['07:10','21:10']},ensure_ascii=False,indent=2),encoding='utf-8')

old = '예약 자동화 code-destiny-2027 ACTIVE 확인. 매주 일요일 21:10 KST 실행하되 11월 1일 전에는 게시하지 않는다. Codex 자동 실행 예약이며 Meta 자체 예약은 아니다. 로그인과 앱 실행이 필요하다.'
new = '통합 자동화 code-destiny-2027 ACTIVE 확인. 매일 07:10 KST 띠별 운세, 21:10 KST 일반 콘텐츠를 운영한다. 신년편은 11/1부터 해당 일요일 21:10 일반 슬롯을 대체하며 11월 전 공개하지 않는다. Codex 실행 예약이며 Meta 자체 예약이 아니다. 로그인과 앱 실행이 필요하다.'
for name in ['STRATEGY.md','new-year-schedule.md','tools/build_content.py','tools/finalize_schedule.py']:
    p=root/name
    t=p.read_text(encoding='utf-8').replace(old,new)
    t=t.replace(' 일반 콘텐츠의 첫 실제 게시 권한은 별도로 확인한다.', ' 일반 콘텐츠 게시도 2026-09-09 사용자 승인 완료.')
    p.write_text(t,encoding='utf-8')
for name in ['content-calendar.md','tools/build_content.py']:
    p=root/name
    p.write_text(p.read_text(encoding='utf-8').replace('07:30','07:10'),encoding='utf-8')
p=root/'HANDOFF.md'
t=p.read_text(encoding='utf-8')
t=t.replace('- 게시 완료: 이번 작업 신규 게시 0건. 기존 Instagram 1건과 Threads 관측치는 performance.md.', '- 게시 완료: Threads D01 12띠 연속글4개 + T01 일반 사주글1개, 독립 시리즈는2개. 실제 URL은 content-log.md. Instagram C01은 파일 접근 권한 차단으로 미게시.')
t=t.replace('이번 첫 주의 실제 즉시 게시 권한은 완성본 제시 후 한 번만 확인할 예정. 답변을 받으면 여기 기록하고 같은 범위 반복 확인 금지.', '2026-09-09 사용자가 “일일운세나 기타 운세 글들은 오늘부터 진행해줘”라고 실제 게시와 지속 운영 승인. 같은 범위 반복 확인 금지.')
t=t.replace('마지막 회차 완료 후 PAUSED 처리.', '마지막 회차 후 신년만 종료하고 일일·일반 운영은 계속한다.')
t=t.replace('실제 게시 URL 없음.', '실제 Threads 게시 URL은 content-log.md에 기록.')
t += '\n## 최신 운영 상태 — 이전 예약 설명보다 우선\n'+new+'\n한 작업에 활성 heartbeat는1개만 가능하므로 별도 아침/저녁 생성은 거절됐고 기존 신년 자동화를 통합 업데이트했다. 신년 날짜와 일간 순서는 유지. 신년 종료 시 통합 자동화를 정지하지 않는다.\n일일 첫 공개: '+base+urls[0]+'\n일반 사주 첫 공개: '+base+'DdCSvMaEgBz\nInstagram C01 6장은 WebP 업로드 파일 선택 단계에서 Not allowed. 사용자 Chrome ChatGPT 확장 세부정보의 파일 URL 접근 허용 필요. 안내 완료. 활성화 전 업로드 반복 시도 금지. C01은 미게시이므로 T01과 플랫폼별로 상태를 분리한다.\n다음 작업: 오늘 아침 D01 중복 금지. 오늘 저녁 T01 재게시 금지, C01 업로드 권한 해결 여부 확인. 다음 날짜에 해당 날짜 원고 사용. 신규 게시물의 24h/72h/7d 인사이트 회수.\n'
p.write_text(t,encoding='utf-8')
print('Recorded 5 verified Threads URLs, Instagram blocker and active combined schedule.')
