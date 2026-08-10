import { expandRichMeaning } from "./rich-card-meanings.mjs";

const WARNING_CARD_PROFILES = {
  M16: {
    names: ["탑", "The Tower", "Tower"],
    keywords: ["붕괴", "문제 노출", "구조 점검", "충격"],
    meaning: "탑은 약한 기반이 갑자기 흔들리며 숨은 문제가 표면으로 올라오는 카드입니다.",
    caution: "문제를 덮거나 급히 키우면 균열이 더 커질 수 있습니다.",
    advice: "확장보다 구조 점검, 계약·비용·관계 균열 확인을 먼저 두세요.",
    pulse: "갑작스러운 변화가 들어와도 바로 밀어붙이기보다 흔들린 기반을 먼저 확인해야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 빠른 확장이 아니라, 무너질 부분을 먼저 발견해 손실을 줄이는 데 있습니다.",
    actions: ["숨은 비용과 책임 소재를 적습니다.", "계약·일정·사람 사이의 균열을 확인합니다."],
    rich: {
      keywords: ["급변", "붕괴", "구조 점검", "숨은 균열", "재편"],
      reversedKeywords: ["지연된 충격", "억눌린 균열", "변화 회피", "미뤄진 붕괴", "경계 필요"],
      upright: {
        scene: "번개에 무너지는 탑처럼, 약한 기반이 한순간에 흔들려 감춰둔 문제가 표면으로 드러나는 자리입니다.",
        core: "안정돼 보이던 토대가 갑자기 흔들리는 카드입니다. 충격은 아프지만, 무너지는 것은 애초에 부실했던 구조이니 이참에 균열을 직시하세요.",
        love: "겉으로 괜찮아 보여도 감춰진 균열이 드러날 수 있는 시기입니다. 감정의 크기로 덮기보다 관계의 토대부터 차분히 점검하세요.",
        relationship: "쌓아온 것이 흔들리는 충격이 올 수 있습니다. 급히 봉합하기보다 무엇이 부실했는지 먼저 확인해야 같은 붕괴를 막습니다.",
        reunion: "예전 관계의 틀은 이미 흔들렸습니다. 그리움으로 원래대로 복원하려 하기보다, 무너진 지점을 직시하고 새로 세울지 판단하세요.",
        exMind: "상대는 관계에 대한 인식이 급격히 바뀌었거나, 예상 밖의 진실을 마주해 흔들리고 있어 확신보다 경계가 앞섭니다.",
        currentMind: "지금 마음은 예상치 못한 충격 속에서 혼란스럽지만, 동시에 덮어둔 문제를 직시하기 시작한 상태입니다.",
        future: "가까운 흐름에 급작스러운 변화나 진실의 노출이 있습니다. 무리하게 확장하기보다 흔들린 기반을 먼저 점검하세요.",
        career: "예상 밖의 변화나 구조 문제가 드러날 수 있습니다. 밀어붙이기 전에 계약·비용·책임 소재의 균열부터 확인하세요.",
        money: "갑작스러운 지출이나 재정 충격에 대비하세요. 불안정한 구조는 덮지 말고 이참에 손실선을 정리하는 편이 낫습니다.",
        daily: "오늘은 예상 밖의 일이 생길 수 있습니다. 흔들려도 급히 키우지 말고 숨은 비용과 균열부터 확인하세요.",
        advice: "무너지는 것을 억지로 붙들지 마세요. 확장보다 구조 점검을 먼저 두고, 계약·비용·관계의 균열을 확인해 손실을 줄이세요.",
        caution: "충격을 부정하고 낡은 구조를 고집하면, 균열이 덮인 채 더 크게 무너집니다.",
      },
      reversed: {
        scene: "무너질 것을 간신히 붙들고 있는, 지연되고 억눌린 붕괴의 자리입니다.",
        core: "탑 역방향은 경고가 사라진 것이 아니라 지연되거나 안쪽으로 숨어 있는 상태입니다. 터질 것을 억누를수록 내부 균열이 깊어집니다.",
        love: "문제를 알면서도 덮어두어 관계가 위태롭게 유지됩니다. 곪은 것을 급히 키우지도, 계속 미루지도 말고 서서히 균열을 확인하세요.",
        relationship: "터질 갈등을 억누르며 간신히 버티는 상태입니다. 진실을 확인하는 것이 오히려 관계를 지킵니다.",
        reunion: "무너진 것을 억지로 복원하려 하면 더 크게 흔들립니다. 근본 균열을 외면한 재회는 같은 붕괴로 이어집니다.",
        exMind: "상대는 관계의 문제를 알면서도 폭발을 피하려 애쓰거나, 변화를 두려워하며 경계하고 있습니다.",
        currentMind: "지금 마음은 다가올 변화를 두려워하며, 터질 것 같은 긴장을 억누르고 있는 상태입니다.",
        future: "미룬 변화는 결국 찾아옵니다. 억누를수록 나중의 충격이 커지니, 지금 숨은 균열을 서서히 풀어야 합니다.",
        career: "곪은 문제를 덮어두면 나중에 더 크게 터집니다. 흔들리기 전에 계약·비용의 위험 조건을 미리 점검하세요.",
        money: "잠재된 재정 위험을 외면하지 마세요. 미리 손실선을 정리하지 않으면 갑작스러운 충격이 옵니다.",
        daily: "오늘은 미뤄둔 문제를 조금씩이라도 확인하세요. 억누르기만 하면 긴장과 균열이 쌓입니다.",
        advice: "터질 것을 억누르지 마세요. 급히 키우지도 말고, 숨은 비용과 균열을 하나씩 확인해 충격을 미리 낮추세요.",
        caution: "변화를 계속 회피하면, 통제할 수 있었던 균열이 통제 불가능한 사태가 됩니다.",
      },
    },
  },
  M15: {
    names: ["악마", "The Devil", "Devil"],
    keywords: ["집착", "유혹", "의존", "속박"],
    meaning: "악마는 강한 끌림과 욕망 뒤에 빠져나오기 어려운 조건이 붙는 카드입니다.",
    caution: "달콤한 제안, 반복되는 집착, 의존 구조를 가볍게 넘기면 선택권이 줄어듭니다.",
    advice: "수익이나 끌림보다 해지 조건, 위약금, 중독성 패턴, 경계선을 먼저 확인하세요.",
    pulse: "욕망의 힘이 강할수록 지금은 매력보다 묶이는 조건을 차갑게 봐야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 욕망을 키우는 데가 아니라, 묶인 고리를 알아차리고 선택권을 되찾는 데 있습니다.",
    actions: ["해지 조건과 책임 범위를 확인합니다.", "반복되는 집착 행동 하나를 중단 목록에 적습니다."],
    rich: {
      keywords: ["집착", "유혹", "의존", "속박", "경계 필요"],
      reversedKeywords: ["속박 자각", "끊어내기", "경계 회복", "해방 시도", "재발 주의"],
      upright: {
        scene: "느슨한 사슬에 스스로 묶인 채, 벗어날 수 있는데도 욕망의 고리에서 나오지 못하는 자리입니다.",
        core: "강한 끌림과 욕망 뒤에 빠져나오기 어려운 조건이 붙는 카드입니다. 매력에 취하기 전에, 무엇이 나를 묶고 있는지 차갑게 확인할 때입니다.",
        love: "강한 끌림 속에 집착이나 의존이 섞인 관계입니다. 열정이 속박으로 변하지 않는지, 사랑인지 익숙함인지 냉정하게 구분하세요.",
        relationship: "서로에게 얽매여 벗어나기 어려운 관계입니다. 감정의 크기보다 경계선과 의존 구조를 먼저 점검해야 합니다.",
        reunion: "그리움이 아니라 집착이나 익숙함에 매달리는 건 아닌지 돌아보세요. 헤어나지 못하는 이유가 사랑인지 두려움인지 확인이 먼저입니다.",
        exMind: "상대는 강한 끌림이나 미련에 얽매여 있지만, 그것이 건강한 감정인지는 불확실해 경계가 필요합니다.",
        currentMind: "지금 마음은 벗어나야 함을 알면서도 욕망이나 두려움에 묶여 선택권을 놓치고 있는 상태입니다.",
        future: "집착을 자각하지 못하면 묶인 고리가 깊어집니다. 매력을 키우기보다 무엇이 나를 묶는지 직시할 때입니다.",
        career: "안정이라는 이름의 굴레나 달콤한 제안에 묶일 수 있습니다. 수익보다 해지 조건과 책임 범위를 먼저 확인하세요.",
        money: "과소비, 도박성 유혹, 물질 집착을 조심하세요. 위약금·중독성 패턴을 가볍게 넘기면 선택권이 줄어듭니다.",
        daily: "오늘은 끊고 싶은 습관이나 집착 하나를 자각해 보세요. 인식이 경계 회복의 시작입니다.",
        advice: "무엇에 묶여 있는지 직시하세요. 끌림보다 해지 조건과 경계선을 먼저 확인하고, 반복되는 집착 하나를 중단 목록에 적으세요.",
        caution: "욕망과 집착을 방치하면, 스스로 만든 굴레가 점점 더 단단해지고 선택권이 사라집니다.",
      },
      reversed: {
        scene: "묶여 있던 사슬을 스스로 풀어내려 하지만, 아직 불안정한 해방의 자리입니다.",
        core: "악마 역방향은 얽매인 것을 자각하고 벗어나려는 상태입니다. 다만 회복이 아직 불안정해, 방심하면 익숙한 굴레로 되돌아가기 쉽습니다.",
        love: "집착이나 의존에서 벗어나려는 시기입니다. 굴레를 끊는 용기가 필요하되, 미련이 다시 발목을 잡지 않도록 경계하세요.",
        relationship: "속박에서 벗어나 관계를 재정립하려는 흐름입니다. 놓아야 할 것을 놓되, 같은 패턴으로 돌아가지 않도록 경계선을 지키세요.",
        reunion: "집착을 내려놓으면 마음이 편해집니다. 매달리던 것에서 벗어나는 것이 회복이지만, 익숙함에 이끌려 되돌아가지 않도록 조심하세요.",
        exMind: "상대는 얽매였던 감정에서 벗어나려 하거나, 관계를 정리하고 자유로워지려 하고 있습니다.",
        currentMind: "지금 마음은 굴레를 자각하고 벗어나고 싶어 하지만, 아직 완전히 끊어내지 못한 불안정한 상태입니다.",
        future: "얽매였던 것에서 벗어날 기회입니다. 다만 회복 초기라 재발에 주의하며 경계선을 다잡아야 합니다.",
        career: "속박이나 나쁜 조건에서 벗어날 기회입니다. 익숙한 굴레를 끊되, 성급함이 또 다른 덫이 되지 않게 확인하세요.",
        money: "과소비나 나쁜 재정 습관을 끊어낼 때입니다. 욕망의 굴레에서 벗어나되, 방심하면 다시 새어나갈 수 있으니 경계하세요.",
        daily: "오늘은 끊어내고 싶던 것에서 한 걸음 벗어나 보세요. 다만 다시 익숙한 굴레로 돌아가지 않도록 마음을 다잡으세요.",
        advice: "묶였던 것을 놓아주세요. 자각하고 끊어내는 지금이 자유를 되찾는 순간이지만, 재발하지 않도록 경계선을 분명히 하세요.",
        caution: "벗어나는 과정이 아직 불안정하니, 다시 익숙한 굴레로 돌아가지 않도록 방심을 경계하세요.",
      },
    },
  },
  M18: {
    names: ["달", "The Moon", "Moon"],
    keywords: ["불안", "착각", "모호함", "숨은 감정"],
    meaning: "달은 불안, 착각, 숨은 감정이 섞여 판단이 흐려지는 카드입니다.",
    caution: "직감만 믿고 단정하면 상상과 사실이 뒤엉킬 수 있습니다.",
    advice: "확인된 행동, 기록, 약속과 머릿속 가정을 분리한 뒤 판단하세요.",
    pulse: "모호함이 짙은 자리라 지금은 느낌을 부정하지 않되 사실 확인을 앞세워야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 더 큰 확신이 아니라, 불안을 기록하고 확인 가능한 근거를 되찾는 데 있습니다.",
    actions: ["사실과 추측을 두 칸으로 나눠 적습니다.", "확인되지 않은 감정 결론은 하루 보류합니다."],
    rich: {
      keywords: ["불안", "모호함", "숨은 감정", "착각 주의", "사실 확인"],
      reversedKeywords: ["혼란 정리", "진실 노출", "불안 완화", "오해 해소", "점진적 명료"],
      upright: {
        scene: "달빛 아래 실체가 흐릿해, 무엇이 진짜인지 분간하기 어려운 안갯속 자리입니다.",
        core: "불안과 착각, 숨은 감정이 섞여 판단이 흐려지는 카드입니다. 겉으로 보이는 것이 전부가 아니며, 상상이 사실을 앞지르지 않도록 확인이 먼저입니다.",
        love: "감정이 모호하고 불안이 커지는 시기입니다. 확실하지 않은 것을 지레짐작하기보다, 확인된 행동과 머릿속 가정을 분리해 보세요.",
        relationship: "오해나 불확실함이 관계를 흐리게 합니다. 상상으로 결론 내리지 말고, 사실과 추측을 나눠 진실을 확인해야 합니다.",
        reunion: "지금은 모든 것이 불분명한 안갯속입니다. 불안에 휩쓸려 단정하지 말고, 흐름이 선명해질 때까지 감정 결론을 보류하세요.",
        exMind: "상대의 마음은 겉으로 잘 드러나지 않고 복잡합니다. 보이는 태도가 진심의 전부가 아니니 성급한 단정을 삼가세요.",
        currentMind: "지금 마음은 불안과 의심으로 흔들리며, 무엇이 진짜인지 확신하지 못하는 상태입니다.",
        future: "가까운 흐름은 아직 불분명합니다. 성급한 결론보다 진실이 드러날 때까지 사실 확인을 앞세우세요.",
        career: "정보가 불충분하거나 상황이 불투명한 시기입니다. 확실하지 않은 것에 큰 결정을 걸지 말고 근거를 확인하세요.",
        money: "불확실한 정보나 감춰진 위험에 주의하세요. 왠지 불안하다면 그 직감을 무시하지 말고 사실부터 확인하세요.",
        daily: "오늘은 불안한 생각이 커질 수 있습니다. 상상과 사실을 구분하고, 확인된 것만 붙드세요.",
        advice: "불안이 만든 상상에 휘둘리지 마세요. 사실과 추측을 두 칸으로 나눠 적고, 확인되지 않은 감정 결론은 하루 보류하세요.",
        caution: "두려움이 만든 상상을 사실로 착각하면, 있지도 않은 문제로 스스로를 괴롭히게 됩니다.",
      },
      reversed: {
        scene: "안개가 걷히며 흐릿하던 것들이 서서히 제 모습을 드러내는 자리입니다.",
        core: "달 역방향은 혼란과 불안이 걷히고 진실이 드러나기 시작하는 상태입니다. 다만 아직 정리되는 과정이니, 다 안다고 단정하기엔 이릅니다.",
        love: "오해가 풀리고 감정이 선명해지는 시기입니다. 불안이 가라앉되, 확인되지 않은 부분은 여전히 사실로 검증하세요.",
        relationship: "감춰졌던 진실이 드러나거나 오해가 정리됩니다. 불확실함이 걷히며 방향이 보이기 시작합니다.",
        reunion: "흐릿했던 상황이 정리되고 마음이 분명해집니다. 불안을 넘어서면 진짜 답이 보이지만, 성급한 확신은 아직 이릅니다.",
        exMind: "상대의 진심이 서서히 드러나거나, 관계에 대한 혼란을 정리하고 있습니다.",
        currentMind: "지금 마음은 불안이 가라앉으며 점차 명료해지고, 진짜 감정을 마주하기 시작했습니다.",
        future: "가까운 흐름에서 불확실함이 걷히고 진실이 드러납니다. 흐름이 분명해지며 결정할 수 있게 됩니다.",
        career: "불투명했던 상황이 정리되고 방향이 잡히는 시기입니다. 감춰진 정보가 드러나 판단이 쉬워집니다.",
        money: "불확실했던 재정 상황이 명확해집니다. 감춰진 위험이 드러나 대비할 수 있게 됩니다.",
        daily: "오늘은 안개가 걷히듯 혼란이 정리됩니다. 불안했던 문제의 실체가 보이기 시작합니다.",
        advice: "불안이 걷히고 있습니다. 이제 상상이 아니라 드러난 사실을 근거로 차분히 판단하되, 아직 확인 안 된 부분은 보류하세요.",
        caution: "진실이 드러나는 과정이 아직 진행 중이니, 성급히 다 안다고 단정하지는 마세요.",
      },
    },
  },
  S10: {
    names: ["소드 텐", "소드 10", "검 10", "Ten of Swords", "10 of Swords"],
    keywords: ["종결", "소진", "배신감", "최악의 생각"],
    meaning: "소드 10은 생각과 긴장이 한계에 닿아 더 버티는 방식이 끝나는 카드입니다.",
    caution: "끝난 패턴을 억지로 되살리면 소진과 상처가 반복될 수 있습니다.",
    advice: "무리한 재시작보다 중단, 회복, 손실 확정을 먼저 받아들이세요.",
    pulse: "지금은 다시 밀어붙일 때가 아니라 끝난 구조를 인정하고 회복 공간을 확보할 때입니다.",
    opportunity: "좋게 살릴 수 있는 단서는 재도전의 속도가 아니라, 멈춰야 할 패턴을 분명히 끝내는 데 있습니다.",
    actions: ["오늘 중단할 행동 하나를 정합니다.", "몸과 일정의 회복 시간을 먼저 확보합니다."],
    rich: {
      keywords: ["종결", "소진", "바닥", "회복 필요", "중단"],
      reversedKeywords: ["회복 시작", "재기", "서서히 일어남", "무리 금지", "점진 회복"],
      upright: {
        scene: "등에 여러 검이 꽂힌 채 바닥에 누운, 한 방식이 완전히 끝나버린 자리입니다.",
        core: "생각과 긴장이 한계에 닿아, 버티던 방식이 끝나는 카드입니다. 밑바닥처럼 느껴지지만 여기가 끝이라는 것은 곧 회복이 시작될 지점이라는 뜻입니다.",
        love: "관계의 한 방식이 소진되어 끝에 다다른 시기입니다. 억지로 되살리기보다 끝난 것을 인정하고 회복 공간을 확보하세요.",
        relationship: "지치고 상처받아 더 버티기 어려운 상태입니다. 무리한 재시작보다 중단과 회복을 먼저 받아들여야 합니다.",
        reunion: "끝난 패턴을 억지로 되살리면 소진과 상처가 반복됩니다. 지금은 다시 밀어붙일 때가 아니라 회복이 먼저입니다.",
        exMind: "상대는 관계에서 완전히 지쳤거나 마음이 바닥에 닿아, 더 버틸 여력이 없는 상태입니다.",
        currentMind: "지금 마음은 소진과 배신감으로 바닥에 닿아, 최악의 생각까지 스치는 힘든 상태입니다.",
        future: "지금의 방식으로는 더 나아가기 어렵습니다. 끝을 인정하고 회복의 시간을 가지면 바닥에서 다시 올라올 수 있습니다.",
        career: "한 방식이나 프로젝트가 소진되어 끝나는 시기입니다. 무리한 재시작보다 손실을 확정하고 회복 공간을 확보하세요.",
        money: "재정적으로 바닥을 친 느낌일 수 있습니다. 없는 자원을 있는 것처럼 계산하지 말고 손실을 인정하는 것이 먼저입니다.",
        daily: "오늘은 무리하지 말고 회복에 집중하세요. 멈춰야 할 것을 멈추는 것이 재기의 시작입니다.",
        advice: "끝난 것을 억지로 붙들지 마세요. 중단·회복·손실 확정을 먼저 받아들이고, 몸과 일정의 회복 시간을 확보하세요.",
        caution: "끝난 패턴을 무리하게 되살리면, 소진과 상처만 반복됩니다.",
      },
      reversed: {
        scene: "바닥에 누워 있던 몸을 조심스레 일으켜, 회복이 시작되는 자리입니다.",
        core: "소드 10 역방향은 최악의 바닥을 지나 서서히 회복이 시작되는 상태입니다. 다만 아직 기력이 약하니, 급하게 밀어붙이면 다시 주저앉을 수 있습니다.",
        love: "힘든 시기를 지나 관계나 마음이 서서히 회복되는 흐름입니다. 조급하지 않게 천천히 기운을 되찾으세요.",
        relationship: "바닥을 지나 회복이 시작됩니다. 다만 아직 상처가 아무는 중이니 무리한 기대는 삼가세요.",
        reunion: "최악은 지났고 회복의 여지가 생깁니다. 서두르지 말고 천천히 다가가야 다시 주저앉지 않습니다.",
        exMind: "상대는 힘든 시기를 지나 서서히 마음을 추스르고 있지만, 아직 완전히 회복되지는 않았습니다.",
        currentMind: "지금 마음은 바닥을 지나 조금씩 기운을 되찾고 있지만, 여전히 조심스럽고 약한 상태입니다.",
        future: "가까운 흐름에서 서서히 회복됩니다. 다만 급하게 밀어붙이면 다시 지치니 페이스를 지키세요.",
        career: "소진된 상태에서 서서히 재기하는 시기입니다. 무리한 확장보다 천천히 기반을 회복하세요.",
        money: "바닥을 지나 재정이 서서히 회복됩니다. 조급한 만회 시도보다 안정적인 회복이 우선입니다.",
        daily: "오늘은 회복에 집중하되, 무리하지 마세요. 서서히 일어나는 지금 페이스를 지키는 것이 중요합니다.",
        advice: "최악은 지났습니다. 서서히 회복하되 급하게 밀어붙이지 말고, 몸과 마음의 기력을 먼저 되찾으세요.",
        caution: "회복 초기에 무리하면, 겨우 일어난 몸이 다시 주저앉을 수 있습니다.",
      },
    },
  },
  P05: {
    names: ["펜타클 파이브", "펜타클 5", "Five of Pentacles", "5 of Pentacles"],
    keywords: ["결핍", "재정 압박", "소외", "지원 부족"],
    meaning: "펜타클 5는 돈, 몸, 관계에서 부족함과 고립감이 현실 압박으로 떠오르는 카드입니다.",
    caution: "혼자 버티거나 없는 자원을 있는 것처럼 계산하면 손실이 커질 수 있습니다.",
    advice: "비용 축소, 도움 요청, 회수 일정, 생활 기반 점검을 먼저 하세요.",
    pulse: "지금은 낙관으로 덮기보다 부족한 자원과 실제 지원선을 확인해야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 큰 수익 기대가 아니라, 누수와 고립을 줄이는 현실 지원을 찾는 데 있습니다.",
    actions: ["고정비와 당장 줄일 지출을 분리합니다.", "도움을 요청할 사람이나 제도를 하나 확인합니다."],
    rich: {
      keywords: ["결핍", "재정 압박", "고립감", "지원 필요", "현실 점검"],
      // 공용 키워드라 애정운·재회운 답변에도 그대로 붙는다. 금전 어휘 대신 결핍 축으로 둔다.
      reversedKeywords: ["회복 시작", "도움 발견", "고립 탈출", "결핍 완화", "지원 연결"],
      upright: {
        scene: "눈 내리는 밤, 불 켜진 창문 앞을 지나면서도 안으로 들어가지 못하는 결핍과 고립의 자리입니다.",
        core: "돈·몸·관계에서 부족함과 고립감이 현실 압박으로 떠오르는 카드입니다. 혼자 버티려 하기보다, 바로 옆의 도움과 지원선을 확인할 때입니다.",
        love: "관계에서 정서적 결핍이나 소외감을 느끼는 시기입니다. 혼자 참기보다 필요한 것을 솔직히 말하는 것이 고립을 줄입니다.",
        relationship: "서로 지쳐 마음의 여유가 부족한 상태입니다. 없는 것을 있는 척하기보다 부족함을 인정하고 도움을 청하세요.",
        reunion: "결핍감이나 외로움 때문에 다시 찾는 건 아닌지 돌아보세요. 고립을 메우려는 재회는 오래가기 어렵습니다.",
        exMind: "상대는 정서적·현실적으로 지쳐 여유가 없거나, 소외감 속에서 마음을 닫고 있습니다.",
        currentMind: "지금 마음은 부족함과 고립감으로 위축되어, 혼자 버티려다 더 힘들어지는 상태입니다.",
        future: "지금은 부족함이 두드러지는 시기입니다. 낙관으로 덮기보다 누수를 줄이고 실제 지원선을 확보하면 흐름이 회복됩니다.",
        career: "자원이나 지원이 부족해 압박을 느끼는 시기입니다. 혼자 떠안지 말고 도움을 요청할 사람이나 제도를 확인하세요.",
        money: "재정 압박이 현실로 떠오릅니다. 없는 자원을 있는 것처럼 계산하지 말고, 고정비와 줄일 지출부터 분리하세요.",
        daily: "오늘은 부족함이 크게 느껴질 수 있습니다. 혼자 버티기보다 도움을 청하는 것이 지혜입니다.",
        advice: "혼자 버티지 마세요. 비용을 줄이고, 도움을 요청할 사람이나 제도를 하나 확인하며, 생활 기반부터 점검하세요.",
        caution: "혼자 버티거나 없는 자원을 있는 것처럼 계산하면, 결핍과 손실이 더 커집니다.",
      },
      reversed: {
        scene: "추위 속을 헤매다 마침내 안으로 들어갈 문을 발견하는, 회복이 시작되는 자리입니다.",
        core: "펜타클 5 역방향은 결핍과 고립에서 벗어나 회복이 시작되는 상태입니다. 도움이나 출구가 보이기 시작하지만, 아직 완전히 안정되지는 않았습니다.",
        love: "정서적 결핍에서 벗어나 관계가 따뜻함을 되찾는 흐름입니다. 도움을 받아들이면 고립이 풀립니다.",
        relationship: "지쳤던 관계에 여유가 돌아오기 시작합니다. 서로 손 내밀면 회복이 빨라집니다.",
        reunion: "고립에서 벗어나 마음의 여유가 생기는 시기입니다. 결핍을 메우려는 마음이 아니라 진짜 회복인지 확인하세요.",
        exMind: "상대는 힘든 시기를 지나 여유를 되찾기 시작했거나, 도움을 받아들이며 마음을 열고 있습니다.",
        currentMind: "지금 마음은 결핍에서 벗어나 조금씩 안정을 되찾고, 도움을 받아들일 여유가 생기고 있습니다.",
        future: "가까운 흐름에서 부족함이 회복되고 지원이 연결됩니다. 다만 안정 초기이니 무리한 지출은 삼가세요.",
        career: "부족했던 자원이나 지원이 채워지기 시작합니다. 도움이 연결되며 압박이 줄어듭니다.",
        money: "재정 압박이 서서히 풀리는 흐름입니다. 회수나 지원이 들어오되, 아직 안정 초기이니 관리를 이어가세요.",
        daily: "오늘은 도움이나 출구가 보이기 시작합니다. 손 내미는 것을 주저하지 마세요.",
        advice: "고립에서 벗어나고 있습니다. 들어온 도움을 받아들이되, 안정 초기이니 지출 관리와 생활 기반 점검을 이어가세요.",
        caution: "회복이 시작됐다고 방심해 다시 혼자 떠안으면, 결핍 상태로 되돌아갈 수 있습니다.",
      },
    },
  },
};

const NAME_TO_CODE = Object.entries(WARNING_CARD_PROFILES).reduce((map, [code, profile]) => {
  profile.names.forEach((name) => map.set(normalizeCardToken(name), code));
  return map;
}, new Map());

const OPTIMISM_REPLACEMENTS = [
  [/에너지가\s*자연스럽게\s*움직이는\s*신호입니다\.?/g, "경고 신호가 선명하게 드러나는 자리입니다."],
  [/흐름은\s*비교적\s*열려\s*있으며,\s*행동을\s*붙이면\s*현실\s*변화로\s*이어질\s*가능성이\s*큽니다\.?/g, "흐름을 낙관으로 덮기보다 먼저 위험 조건을 확인해야 합니다."],
  [/오늘\s*가능한\s*실행\s*단위를\s*작게\s*설정하고\s*끝까지\s*완료하세요\.?/g, "오늘은 실행보다 확인과 정리를 먼저 끝내세요."],
  [/작은\s*실행을\s*반복(?:해|할수록)[^.。!?]*[.。!?]?/g, "작게 움직이기 전 위험 조건을 먼저 분리하세요."],
  [/가능성이\s*(?:올라갑니다|큽니다|살아\s*있습니다)\.?/g, "가능성보다 경계 조건이 먼저입니다."],
  [/좋은\s*결과가\s*기대됩니다\.?/g, "낙관보다 점검이 먼저입니다."],
  [/과감히\s*확장(?:하세요|합니다|해도\s*좋습니다)?\.?/g, "확장보다 구조와 손실선을 먼저 확인하세요."],
  [/기대\s*이상의\s*결과를\s*만들\s*수\s*있습니다\.?/g, "기대보다 손실 제한이 먼저입니다."],
  [/흐름이\s*안정적으로\s*강화됩니다\.?/g, "불안정한 조건을 먼저 낮춰야 합니다."],
  [/현실로\s*드러나기\s*쉽습니다\.?/g, "현실 변수로 드러날 수 있어 확인이 필요합니다."],
];

function asText(value) {
  return String(value || "").trim();
}

function normalizeCardToken(value) {
  return asText(value).toLowerCase().replace(/[\s_·\-]+/g, "");
}

function getCandidateTokens(cardLike = {}) {
  if (typeof cardLike === "string") return [cardLike];
  if (!cardLike || typeof cardLike !== "object") return [];
  return [
    cardLike.code,
    cardLike.cardCode,
    cardLike.cardId,
    cardLike.id,
    cardLike.nameKo,
    cardLike.nameKr,
    cardLike.cardNameKo,
    cardLike.cardNameKr,
    cardLike.nameEn,
    cardLike.name,
    cardLike.cardNameEn,
    cardLike.cardName,
  ].filter(Boolean);
}

function normalizeWarningCardCode(cardLike) {
  for (const token of getCandidateTokens(cardLike)) {
    const clean = asText(token).toUpperCase();
    if (WARNING_CARD_PROFILES[clean]) return clean;
    const byName = NAME_TO_CODE.get(normalizeCardToken(token));
    if (byName) return byName;
  }
  return "";
}

function getWarningCardGuard(cardLike) {
  const code = normalizeWarningCardCode(cardLike);
  return code ? { code, ...WARNING_CARD_PROFILES[code] } : null;
}

function containsWarningSignal(text, profile) {
  const source = asText(text);
  if (!source || !profile) return false;
  return [...profile.keywords, "점검", "확인", "보류", "중단", "손실", "경계", "균열", "압박"].some((word) => source.includes(word));
}

function stripLeadingCardSubject(text, profile) {
  let next = asText(text);
  (profile?.names || []).forEach((name) => {
    const lead = asText(name);
    if (lead) next = next.replace(new RegExp(`^${lead}[은는]\\s*`), "");
  });
  return next;
}

function guardWarningTarotText(text, cardLike, options = {}) {
  const profile = getWarningCardGuard(cardLike);
  let next = asText(text || options.fallback);
  if (!profile || !next) return next;

  OPTIMISM_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });

  const field = asText(options.field);
  if (field === "meaning" || field === "cardMeaning" || field === "interpretation") {
    next = containsWarningSignal(next, profile) ? next : `${profile.meaning} ${next}`;
  }
  if (field === "caution") {
    next = next.includes(profile.caution)
      ? next
      : (containsWarningSignal(next, profile) ? `${profile.caution} ${next}` : profile.caution);
  }
  if (field === "advice" || field === "action" || field === "actionStep" || field === "uplift" || field === "opportunity") {
    const fallbackAdvice = field === "opportunity" ? profile.opportunity : (profile.actions[0] || profile.advice);
    next = containsWarningSignal(next, profile) ? next : fallbackAdvice;
  }
  if (field === "pulse") {
    next = profile.pulse;
  }

  return next.replace(/\s{2,}/g, " ").trim();
}

function guardWarningTarotList(list, cardLike, options = {}) {
  const source = Array.isArray(list) ? list : [];
  const guarded = source.map((item) => guardWarningTarotText(item, cardLike, options)).filter(Boolean);
  const profile = getWarningCardGuard(cardLike);
  if (profile && !guarded.some((item) => containsWarningSignal(item, profile))) {
    guarded.unshift(options.field === "caution" ? profile.caution : profile.advice);
  }
  return Array.from(new Set(guarded));
}

function buildWarningCardMeaningOverride(cardLike, orientation = "upright") {
  const profile = getWarningCardGuard(cardLike);
  if (!profile) return null;
  const orient = orientation === "reversed" ? "reversed" : "upright";
  // 전문 리치 문구가 정의된 경고 카드는 페일세이프 의도(경계성)를 유지하면서
  // 카드 고유 서사가 살아나는 자연스러운 문장으로 오버라이드한다.
  if (profile.rich) {
    const expanded = expandRichMeaning(profile.rich);
    return expanded[orient];
  }
  const reversed = orientation === "reversed";
  const firstAction = profile.actions[0] || profile.advice;
  const secondAction = profile.actions[1] || firstAction;
  const prefix = reversed
    ? `${profile.names[0]} 역방향은 경고가 사라진 것이 아니라 지연되거나 안쪽으로 숨어 있는 상태입니다.`
    : `${profile.names[0]} 정방향은 ${stripLeadingCardSubject(profile.meaning, profile)}`;
  return {
    keywords: profile.keywords,
    core: [prefix, profile.pulse],
    light: [profile.opportunity],
    shadow: [profile.caution],
    monthly: [`이번 달에는 ${profile.advice}`],
    love: [`연애에서는 감정의 크기보다 ${profile.advice}`],
    relationship: [`관계에서는 단정과 과속보다 ${profile.advice}`],
    reunion: [`재회에서는 그리움보다 ${profile.advice}`],
    exMind: [`상대의 속마음은 확신보다 경계가 앞설 수 있어 ${profile.advice}`],
    currentMind: [`현재 심리는 불안과 방어가 섞여 있어 ${profile.advice}`],
    future: [`가까운 흐름은 무리하게 열기보다 ${profile.advice}`],
    career: [`진로와 일에서는 ${profile.advice}`],
    money: [`금전에서는 ${profile.advice}`],
    moneyWork: [`금전과 일에서는 ${profile.advice}`],
    healthMind: [`건강과 멘탈에서는 ${profile.advice}`],
    daily: [`오늘은 ${profile.advice}`],
    general: [`전체 흐름은 낙관보다 ${profile.advice}`],
    advice: [firstAction, secondAction],
    caution: [profile.caution],
    recoveryAdvice: [firstAction],
    coreMeaning: prefix,
    psychologicalMeaning: profile.caution,
    selfEsteemMeaning: `자기 기준을 지키려면 ${secondAction}`,
    shadowText: profile.caution,
    shadowNote: profile.caution,
    adviceText: firstAction,
  };
}

function guardWarningTarotSection(section, cardLike) {
  const profile = getWarningCardGuard(cardLike || section);
  if (!profile || !section || typeof section !== "object") return section;
  const next = { ...section };
  // directMeaning/contextualInterpretation/practicalAdvice 는 수비학 타로가 쓰는 최신 카드 스키마의
  // 필드명이다. 여기 없으면 그 화면에서는 경고 카드 순화가 통째로 건너뛰어진다(레거시 배열만 순화되던 문제).
  const meaningFields = ["meaning", "content", "cardMeaning", "interpretation", "topicInterpretation", "hiddenPattern", "questionSpecificMeaning", "summary", "overall", "overallFlow", "strongestSignal", "oracleMessage", "storyFlow", "finalReading", "directMeaning", "contextualInterpretation", "numerologyBridge"];
  const cautionFields = ["caution", "risk", "shadow", "shadowText"];
  const adviceFields = ["advice", "action", "actionTip", "actionStep", "uplift", "opportunity", "finalAdvice", "timingAdvice", "recoveryAdvice", "practicalAdvice"];

  meaningFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "meaning" });
  });
  cautionFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "caution" });
  });
  adviceFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "advice" });
  });
  if (Array.isArray(next.practicalActions)) {
    next.practicalActions = guardWarningTarotList(next.practicalActions, profile, { field: "advice" }).slice(0, 5);
  }
  if (Array.isArray(next.actionPlan)) {
    next.actionPlan = guardWarningTarotList(next.actionPlan, profile, { field: "advice" }).slice(0, 6);
  }
  return next;
}

export {
  buildWarningCardMeaningOverride,
  getWarningCardGuard,
  guardWarningTarotList,
  guardWarningTarotSection,
  guardWarningTarotText,
  isWarningTarotCard,
  normalizeWarningCardCode,
};

function isWarningTarotCard(cardLike) {
  return Boolean(normalizeWarningCardCode(cardLike));
}
