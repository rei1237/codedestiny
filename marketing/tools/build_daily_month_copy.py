"""Create source copy for the 12-zodiac Instagram daily-fortune series."""
from datetime import date, timedelta
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
START = date(2026, 9, 9)
END = date(2026, 10, 15)
ZODIACS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']
BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
HANJA_STEMS = dict(zip(STEMS, '甲乙丙丁戊己庚辛壬癸'))
HANJA_BRANCHES = dict(zip(BRANCHES, '子丑寅卯辰巳午未申酉戌亥'))

THEMES = [
    ('일정', '마감과 약속을 한 번 더 확인해보세요.'),
    ('관계', '상대가 알아주길 기다리기보다 짧게 뜻을 전해보세요.'),
    ('일', '해야 할 일의 우선순위를 한 줄로 정리해보세요.'),
    ('돈', '새 지출이나 제안은 기준을 적어본 뒤 판단해보세요.'),
    ('마음', '피로가 쌓인 신호를 무시하지 말고 쉬는 시간을 남겨두세요.'),
    ('배움', '새로운 정보보다 이미 정리한 것을 실제로 써보세요.'),
    ('협업', '역할과 완료 기준을 먼저 맞추면 흐름이 한결 편해집니다.'),
]

def pillar(day):
    # 2026-09-09 병술 is the established project reference; the sexagenary
    # sequence advances by one each calendar day.
    offset = (day - START).days
    stem = STEMS[(2 + offset) % 10]
    branch = BRANCHES[(10 + offset) % 12]
    return f'{stem}{branch}({HANJA_STEMS[stem]}{HANJA_BRANCHES[branch]})', branch

def relation(zodiac_index, day_branch_index):
    diff = (day_branch_index - zodiac_index) % 12
    if diff == 0:
        return '겹침'
    if diff == 6:
        return '충'
    if diff in (3, 9):
        return '호흡'
    if diff in (4, 8):
        return '조율'
    if diff in (2, 10):
        return '변화'
    return '정리'

def reading(zodiac, rel, theme, day_number):
    topic, action = theme
    openers = {
        '겹침': f'{zodiac}띠는 오늘 내 속도와 주변의 요청이 겹쳐 마음이 분주할 수 있어요.',
        '충': f'{zodiac}띠는 오늘 예상과 다른 {topic} 변화가 생겨도 바로 결론을 내리지 않는 편이 좋겠습니다.',
        '호흡': f'{zodiac}띠는 오늘 사람들과 호흡을 맞추며 막힌 {topic}를 풀어보기 좋은 흐름입니다.',
        '조율': f'{zodiac}띠는 오늘 익숙한 방식과 새로운 요구 사이에서 기준을 조율할 일이 생길 수 있어요.',
        '변화': f'{zodiac}띠는 오늘 작은 변화를 시도하고 싶어질 수 있지만, 한 번에 여러 방향으로 움직이지는 마세요.',
        '정리': f'{zodiac}띠는 오늘 쌓인 생각과 {topic}을 차분히 정리할수록 다음 선택이 선명해질 수 있습니다.',
    }
    middles = [
        '잘하려는 마음이 앞설수록 설명을 생략하지 말고, 내가 할 수 있는 범위를 먼저 말해보세요.',
        '상대의 반응을 미리 단정하기보다 확인할 질문 하나를 고르면 오해를 덜 수 있어요.',
        '급한 일과 중요한 일을 나누면, 하루가 끝났을 때 남는 피로도 줄어들겠습니다.',
        '이미 해둔 것을 다시 살피는 시간이 새로운 선택을 늘리는 것보다 더 도움이 될 수 있어요.',
        '관계에서도 내 속도를 지키는 작은 간격을 남겨두면 마음이 한결 편해질 수 있습니다.',
        '작은 약속 하나를 끝까지 지키는 쪽이, 큰 계획을 더하는 것보다 신뢰를 만듭니다.',
        '오늘의 흐름은 개인의 사주 전체를 대신하지 않으니, 한 문장 참고로 가볍게 활용해보세요.',
    ]
    return f'{openers[rel]} {middles[(day_number + len(zodiac)) % len(middles)]}'

days, dates, pillars = [], [], []
current = START
while current <= END:
    pillar_text, branch = pillar(current)
    branch_index = BRANCHES.index(branch)
    theme = THEMES[(current - START).days % len(THEMES)]
    dates.append(current.isoformat())
    pillars.append(pillar_text)
    days.append([reading(zodiac, relation(index, branch_index), theme, (current - START).days) for index, zodiac in enumerate(ZODIACS)])
    current += timedelta(days=1)

output = ROOT / 'copy' / 'daily-month-20260909-20261015.json'
output.write_text(json.dumps({
    'dates': dates,
    'pillars': pillars,
    'zodiacs': ZODIACS,
    'notes': '10년 경력 명리학자의 띠별 오늘 운세. 띠와 당일 지지의 관계를 바탕으로 쓴 일반 편집 해석이며 개인 원국 전체의 길흉 판정이 아닙니다.',
    'days': days,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {output} with {len(dates)} dates.')
