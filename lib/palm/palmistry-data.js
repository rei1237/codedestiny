const PALMISTRY_DATA = {
  handRoles: {
    innate: {
      label: "선천적 손",
      meaning: "타고난 기질, 본래 성향, 잠재력, 무의식적 반응을 보여주는 손",
      uiCopy: "타고난 당신의 결",
    },
    acquired: {
      label: "후천적 손",
      meaning: "현재의 성향, 살아오며 만들어진 습관, 사회적 자아, 지금 발현 중인 흐름을 보여주는 손",
      uiCopy: "현재 살아가는 당신의 흐름",
    },
    mixed: {
      label: "혼합형 손",
      meaning: "선천성과 후천성이 함께 섞여 나타나는 손",
      uiCopy: "본래의 결성과 현재의 흐름이 함께 나타나는 손",
    },
  },

  handShapes: {
    earth: {
      label: "흙의 손",
      keywords: ["현실감", "안정성", "책임감", "생활력", "꾸준함"],
      description:
        "손바닥이 넓고 손가락이 비교적 짧거나 단단해 보이는 형태입니다. 현실 감각이 강하고, 감정이나 말보다 실제 행동과 결과를 중요하게 여기는 타입으로 해석합니다.",
      love: "연애에서는 쉽게 불타오르기보다 신뢰와 생활 안정감을 중시합니다.",
      career: "꾸준함, 관리력, 실무 감각이 필요한 일에서 강점이 있습니다.",
      caution: "변화가 필요한 순간에도 익숙한 방식에 머물 수 있습니다.",
    },
    fire: {
      label: "불의 손",
      keywords: ["열정", "직감", "추진력", "표현력", "도전"],
      description:
        "손바닥이 길고 손가락은 상대적으로 짧거나 힘 있게 보이는 형태입니다. 생각보다 행동이 빠르고, 감정과 직감이 강하게 작동하는 타입으로 해석합니다.",
      love: "연애에서는 빠른 설렘과 강한 표현력이 장점이지만, 식는 속도도 빠를 수 있습니다.",
      career: "기획, 창작, 리더십, 영업, 콘텐츠처럼 에너지를 밖으로 발산하는 일에 강합니다.",
      caution: "감정이 앞설 때 결정이 빨라질 수 있으므로 속도 조절이 필요합니다.",
    },
    air: {
      label: "바람의 손",
      keywords: ["사고력", "소통", "분석", "호기심", "네트워크"],
      description:
        "손바닥은 비교적 네모나고 손가락이 길거나 가늘어 보이는 형태입니다. 정보 처리, 말, 관계, 아이디어가 중요한 타입으로 해석합니다.",
      love: "연애에서는 대화의 결이 맞아야 마음이 열립니다.",
      career: "글쓰기, 교육, 상담, 마케팅, 전략, IT, 기획 분야와 잘 맞습니다.",
      caution: "생각이 많아질수록 감정 표현이 늦어질 수 있습니다.",
    },
    water: {
      label: "물의 손",
      keywords: ["감수성", "직관", "공감", "상상력", "섬세함"],
      description:
        "손바닥과 손가락이 길고 부드러운 인상을 주는 형태입니다. 감정, 분위기, 관계의 미묘한 변화를 잘 감지하는 타입으로 해석합니다.",
      love: "연애에서는 깊은 정서적 교감과 안정감을 중요하게 봅니다.",
      career: "예술, 상담, 심리, 치유, 디자인, 글쓰기처럼 감성과 직관이 필요한 일에 강합니다.",
      caution: "타인의 감정을 지나치게 흡수하면 쉽게 지칠 수 있습니다.",
    },
    mixed: {
      label: "혼합형 손",
      keywords: ["복합성", "적응력", "다중 재능", "유연성", "변화"],
      description:
        "한 가지 손형으로 단정하기 어려운 복합형입니다. 상황에 따라 여러 성향을 번갈아 쓰는 타입으로 해석합니다.",
      love: "관계에서도 한 가지 방식보다 상대와 상황에 따라 다른 모습을 보일 수 있습니다.",
      career: "여러 능력을 섞는 융합형 업무에 강합니다.",
      caution: "방향성이 흐려지지 않도록 핵심 기준을 세우는 것이 중요합니다.",
    },
  },

  majorLines: {
    lifeLine: {
      label: "생명선",
      safeMeaning: "수명이 아니라 에너지 운용, 회복 리듬, 생활 지속성을 보는 선",
      keywords: ["에너지", "회복력", "생활 리듬", "지속력", "자기관리"],
      variants: {
        long_deep: {
          title: "깊고 긴 생명선",
          summary: "기본 에너지와 생활 지속성이 강한 편입니다.",
          detail:
            "깊고 긴 생명선은 수명을 뜻한다기보다, 삶을 꾸준히 밀고 가는 힘과 회복 루틴이 비교적 안정적이라는 상징으로 해석합니다. 쉽게 포기하기보다 다시 일어나는 힘이 있고, 생활의 리듬이 잡히면 장기적으로 성과를 쌓아가는 타입입니다.",
          advice: ["꾸준한 루틴을 만들면 운의 체감이 좋아집니다.", "몸을 혹사하기보다 리듬을 유지하는 것이 중요합니다."],
        },
        short_deep: {
          title: "짧지만 깊은 생명선",
          summary: "에너지는 강하지만 집중적으로 쓰는 타입입니다.",
          detail:
            "짧지만 깊은 생명선은 에너지가 약하다는 뜻이 아니라, 힘을 넓게 분산하기보다 특정한 목표나 상황에 집중적으로 쓰는 성향을 보여줍니다. 몰입할 때는 강하지만, 쉬는 타이밍을 놓치면 피로가 빠르게 누적될 수 있습니다.",
          advice: ["짧은 집중과 확실한 휴식의 리듬이 잘 맞습니다.", "에너지 소모가 큰 관계나 일은 주기적으로 정리하세요."],
        },
        faint: {
          title: "흐린 생명선",
          summary: "에너지 관리와 회복 루틴이 중요한 손입니다.",
          detail:
            "흐린 생명선은 삶의 기반 에너지가 불안정하다기보다, 현재의 생활 리듬이나 자기관리 방식이 아직 선명하게 자리 잡지 않았다는 뜻으로 볼 수 있습니다. 환경의 영향을 많이 받고, 피로와 감정 소모가 운의 체감에 크게 작용할 수 있습니다.",
          advice: ["수면, 식사, 산책처럼 기본 루틴을 먼저 안정시키세요.", "무리한 변화보다 작은 반복이 중요합니다."],
        },
        broken: {
          title: "중간에 끊김이 있는 생명선",
          summary: "생활 리듬의 전환점이 있는 타입입니다.",
          detail:
            "생명선의 끊김은 나쁜 징조가 아니라, 생활 방식이나 에너지 사용 방식에 전환이 필요했던 시기 또는 앞으로 필요한 변화를 상징합니다. 오래된 습관을 계속 유지하기보다, 새로운 생활 구조를 만들어야 운의 흐름이 안정됩니다.",
          advice: ["최근 생활 패턴에서 가장 큰 에너지 누수를 찾아보세요.", "관계, 일, 수면 중 하나를 먼저 정리하는 것이 좋습니다."],
        },
        branched_out: {
          title: "가지가 뻗은 생명선",
          summary: "활동 반경이 넓어지고 삶의 방향이 다양해지는 손입니다.",
          detail:
            "생명선에서 바깥으로 뻗는 가지는 이동, 확장, 새로운 경험에 대한 욕구를 상징합니다. 한곳에만 머무르기보다 다양한 환경에서 에너지를 얻는 타입일 수 있습니다.",
          advice: ["새로운 장소, 사람, 배움이 활력을 줍니다.", "단, 확장만큼 회복 공간도 함께 만들어야 합니다."],
        },
      },
    },

    headLine: {
      label: "두뇌선",
      safeMeaning: "사고방식, 판단력, 집중력, 상상력, 의사결정 습관을 보는 선",
      keywords: ["사고", "판단", "집중", "상상력", "의사결정"],
      variants: {
        long_straight: {
          title: "길고 곧은 두뇌선",
          summary: "현실 판단력과 분석력이 강한 타입입니다.",
          detail:
            "길고 곧은 두뇌선은 생각을 오래 끌고 가는 힘과 현실적인 판단 기준을 의미합니다. 감정보다 논리, 분위기보다 사실, 즉흥보다 계획을 중시하는 경향이 있습니다.",
          advice: ["기획, 분석, 전략 업무에 강점이 있습니다.", "관계에서는 너무 이성적으로만 반응하지 않도록 주의하세요."],
        },
        long_curved: {
          title: "길고 부드럽게 휘는 두뇌선",
          summary: "현실성과 상상력이 함께 작동하는 타입입니다.",
          detail:
            "두뇌선이 길면서 부드럽게 내려가면 한 가지 문제를 깊게 파고들면서도 상상력과 감각을 함께 사용하는 성향으로 봅니다. 논리와 직관을 모두 쓸 수 있는 장점이 있습니다.",
          advice: ["창작, 상담, 콘텐츠, 기획 분야에 잘 맞습니다.", "생각이 너무 깊어질 때는 실행 기준을 정하세요."],
        },
        short: {
          title: "짧은 두뇌선",
          summary: "판단이 빠르고 직관적으로 움직이는 타입입니다.",
          detail:
            "짧은 두뇌선은 생각이 부족하다는 뜻이 아니라, 오래 고민하기보다 빠르게 판단하고 행동하는 성향을 나타냅니다. 상황 판단이 빠르지만, 복잡한 문제에서는 한 번 더 확인하는 습관이 필요합니다.",
          advice: ["즉시성이 필요한 일에 강합니다.", "큰 결정은 하루 정도 숙성시키는 습관이 좋습니다."],
        },
        separated_start: {
          title: "생명선과 떨어져 시작하는 두뇌선",
          summary: "독립적이고 자기 판단이 강한 손입니다.",
          detail:
            "두뇌선이 생명선과 떨어져 시작하면 어릴 때부터 독립성이 강하거나, 자기 판단에 따라 움직이려는 경향이 있다고 봅니다. 타인의 기준보다 스스로 납득하는 것이 중요합니다.",
          advice: ["독립적인 프로젝트에 강합니다.", "관계에서는 상대에게 충분한 설명을 해주는 것이 좋습니다."],
        },
        joined_start: {
          title: "생명선과 붙어 시작하는 두뇌선",
          summary: "신중하고 안정 확인 후 움직이는 타입입니다.",
          detail:
            "두뇌선이 생명선과 붙어 시작하면 신중함, 조심성, 안정 확인 욕구가 강한 편으로 봅니다. 쉽게 움직이지 않지만 한 번 확신하면 꾸준히 밀고 가는 힘이 있습니다.",
          advice: ["중요한 선택 전 체크리스트를 만들면 좋습니다.", "기회를 놓치지 않도록 결정 마감 시간을 정하세요."],
        },
      },
    },

    heartLine: {
      label: "감정선",
      safeMeaning: "사랑 방식, 감정 표현, 애착, 관계 기대, 상처받는 포인트를 보는 선",
      keywords: ["사랑", "감정", "애착", "표현", "관계 온도"],
      variants: {
        deep_curved: {
          title: "깊고 곡선적인 감정선",
          summary: "감정이 깊고 애정 표현이 풍부한 타입입니다.",
          detail:
            "깊고 부드럽게 휘는 감정선은 관계에서 진심, 애착, 정서적 교감을 중요하게 여기는 성향을 보여줍니다. 한 번 마음을 열면 깊게 연결되려 하고, 상대의 작은 반응에도 의미를 부여할 수 있습니다.",
          advice: ["진심은 장점이지만 감정 과몰입은 조절이 필요합니다.", "관계의 속도를 천천히 맞추세요."],
        },
        straight: {
          title: "직선적인 감정선",
          summary: "감정보다 신뢰와 기준을 중시하는 타입입니다.",
          detail:
            "감정선이 비교적 곧으면 감정을 크게 드러내기보다 차분하게 조절하는 성향으로 봅니다. 사랑을 말보다 책임, 태도, 일관성으로 표현하는 경우가 많습니다.",
          advice: ["상대에게 마음이 없어서가 아니라 표현 방식이 절제된 것임을 알려주세요.", "가끔은 직접적인 애정 표현이 필요합니다."],
        },
        ending_under_index: {
          title: "검지 아래로 향하는 감정선",
          summary: "이상적이고 진심 어린 사랑을 추구합니다.",
          detail:
            "감정선이 검지 아래로 향하면 관계에서 기준과 이상이 높은 편입니다. 단순한 호감보다 존중, 신뢰, 가치관의 일치를 중요하게 봅니다.",
          advice: ["높은 기준은 장점이지만, 완벽한 상대를 기다리다 기회를 놓치지 않도록 하세요."],
        },
        ending_under_middle: {
          title: "중지 아래로 향하는 감정선",
          summary: "감정 표현이 신중하고 현실적인 타입입니다.",
          detail:
            "감정선이 중지 아래로 향하면 사랑에서도 현실성과 책임감을 중요하게 보는 경향이 있습니다. 쉽게 들뜨기보다 안정성을 확인하고 마음을 여는 편입니다.",
          advice: ["상대가 차갑게 느끼지 않도록 작은 표현을 자주 해보세요."],
        },
        many_branches: {
          title: "잔가지가 많은 감정선",
          summary: "감정이 섬세하고 관계 신호를 예민하게 읽습니다.",
          detail:
            "감정선에 잔가지가 많으면 관계에서 작은 말, 표정, 분위기를 민감하게 감지하는 성향으로 봅니다. 공감 능력은 강하지만, 오해도 쉽게 생길 수 있습니다.",
          advice: ["느낌만으로 판단하기보다 확인하는 대화를 해보세요.", "감정 기록이 도움이 됩니다."],
        },
      },
    },

    fateLine: {
      label: "운명선",
      safeMeaning: "직업 방향, 사회적 목표, 자립성, 인생 방향을 보는 선",
      keywords: ["직업", "목표", "사회성", "자립", "방향성"],
      variants: {
        strong_center: {
          title: "중앙을 뚜렷하게 올라가는 운명선",
          summary: "목표의식과 사회적 방향성이 강한 손입니다.",
          detail:
            "운명선이 손바닥 중앙을 또렷하게 올라가면 스스로의 길을 만들고자 하는 의지가 강하다고 봅니다. 외부 환경에 흔들리더라도 결국 자기 기준을 세우는 타입입니다.",
          advice: ["장기 목표를 시각화하면 힘이 커집니다.", "직업적 정체성을 분명히 하는 것이 중요합니다."],
        },
        weak_or_absent: {
          title: "희미하거나 약한 운명선",
          summary: "정해진 길보다 유동적인 삶의 방향을 가진 타입입니다.",
          detail:
            "운명선이 약하다고 해서 직업운이 나쁘다는 뜻은 아닙니다. 정해진 하나의 길보다 여러 가능성을 탐색하거나, 삶의 방향이 상황에 따라 바뀌는 유연한 타입으로 볼 수 있습니다.",
          advice: ["한 번에 평생 직업을 정하려 하지 않아도 됩니다.", "작은 프로젝트를 통해 방향을 찾아가세요."],
        },
        starts_from_lifeLine: {
          title: "생명선에서 시작하는 운명선",
          summary: "자기 노력과 생활 기반에서 길을 만드는 손입니다.",
          detail:
            "운명선이 생명선 쪽에서 시작하면 외부의 운보다 자기 노력, 가족 환경, 생활 기반의 영향을 많이 받는다고 봅니다. 스스로 쌓아 올리는 성취형에 가깝습니다.",
          advice: ["루틴과 실력이 곧 운을 만듭니다.", "기초를 오래 다지는 일이 유리합니다."],
        },
        starts_from_moonMount: {
          title: "월구에서 시작하는 운명선",
          summary: "사람, 대중, 외부 인연을 통해 길이 열리는 타입입니다.",
          detail:
            "운명선이 월구 쪽에서 올라오면 타인, 대중, 고객, 이동, 외부 네트워크가 삶의 방향에 큰 영향을 준다고 봅니다. 혼자보다 사람과 연결될 때 기회가 커질 수 있습니다.",
          advice: ["콘텐츠, 상담, 서비스, 커뮤니티 기반 일이 잘 맞을 수 있습니다.", "좋은 인연을 관리하는 것이 중요합니다."],
        },
        broken: {
          title: "끊김이 있는 운명선",
          summary: "직업적 전환점이 있는 타입입니다.",
          detail:
            "운명선의 끊김은 직업운의 끝이 아니라 방향 전환, 역할 변화, 삶의 기준 수정이 필요한 시기를 상징합니다. 한 번의 변화 이후 더 자기다운 길을 찾는 경우가 많습니다.",
          advice: ["전환기를 실패로 보지 말고 재설계의 기회로 보세요.", "변화 전후의 공통 키워드를 찾아보세요."],
        },
      },
    },
  },

  minorLines: {
    sunLine: {
      label: "태양선",
      meaning: "표현력, 인기, 창작, 브랜딩, 세상에 기억되는 방식을 보는 보조선",
      variants: {
        strong: {
          title: "선명한 태양선",
          detail:
            "자기 표현력, 창작 감각, 브랜딩 능력이 비교적 잘 발달한 손입니다. 사람들에게 기억되는 이미지가 있고, 이름을 걸고 하는 일에서 힘이 생길 수 있습니다.",
        },
        faint: {
          title: "희미한 태양선",
          detail:
            "아직 자신의 표현 방식이나 브랜드 정체성이 선명하게 자리 잡는 과정으로 볼 수 있습니다. 꾸준히 보여주는 활동이 태양선을 키우는 방식이 됩니다.",
        },
        absent: {
          title: "태양선이 약하거나 감지되지 않음",
          detail:
            "태양선이 뚜렷하지 않다고 해서 인기가 없다는 뜻은 아닙니다. 아직 대외적인 표현보다 내실, 준비, 실무 중심의 에너지가 더 강하게 작동한다고 볼 수 있습니다.",
        },
      },
    },
    moneyLine: {
      label: "재물선",
      meaning: "확정 재물운이 아니라 돈을 다루는 습관, 가치 창출 방식, 거래 감각을 보는 보조선",
      variants: {
        strong: {
          title: "선명한 재물선",
          detail:
            "돈의 흐름을 감지하고 가치를 만들어내는 감각이 비교적 좋은 손입니다. 특히 자신의 기술, 말, 정보, 거래 능력을 통해 수입 루트를 만드는 데 강점이 있을 수 있습니다.",
        },
        multiple: {
          title: "여러 갈래의 재물선",
          detail:
            "수입원이 하나로 고정되기보다 여러 방향으로 열릴 가능성을 상징합니다. 다만 분산이 지나치면 관리가 어려울 수 있으므로 기준이 필요합니다.",
        },
        faint: {
          title: "희미한 재물선",
          detail:
            "돈의 흐름이 아직 선명하게 고정되지 않았거나, 수입보다 관리 습관을 먼저 다져야 하는 상태로 해석할 수 있습니다.",
        },
      },
    },
    marriageLine: {
      label: "결혼선",
      meaning: "결혼 횟수가 아니라 깊은 관계에서 원하는 안정감과 약속 방식을 보는 보조선",
      variants: {
        clear_single: {
          title: "선명한 관계선",
          detail:
            "깊은 관계에서 안정감과 신뢰를 중요하게 보는 타입입니다. 한 번 마음을 정하면 관계를 가볍게 여기지 않고 책임감 있게 이어가려는 경향이 있습니다.",
        },
        multiple_faint: {
          title: "여러 잔선이 있는 관계선",
          detail:
            "관계에서 여러 가능성을 탐색하거나, 마음이 쉽게 흔들릴 수 있는 섬세함을 나타냅니다. 결혼 횟수로 단정하지 말고 관계 경험에 대한 민감성으로 해석합니다.",
        },
        upward: {
          title: "위로 향하는 관계선",
          detail:
            "관계를 통해 삶이 밝아지고 동기부여를 얻는 타입입니다. 좋은 관계가 커리어와 자존감에도 긍정적인 영향을 줄 수 있습니다.",
        },
        downward: {
          title: "아래로 기우는 관계선",
          detail:
            "관계에서 책임감이나 걱정이 커질 수 있습니다. 깊이 사랑할수록 상대의 문제를 자신의 짐처럼 느끼지 않도록 경계가 필요합니다.",
        },
      },
    },
    mercuryLine: {
      label: "수성선",
      meaning: "소통력, 사업 감각, 정보 처리, 컨디션 관리 리듬을 보는 보조선",
      variants: {
        strong: {
          title: "선명한 수성선",
          detail:
            "말, 정보, 거래, 설득, 비즈니스 감각이 강하게 작동할 수 있는 손입니다. 사람과 정보를 연결하는 능력이 수입이나 기회와 연결되기 쉽습니다.",
        },
        broken: {
          title: "끊김이 있는 수성선",
          detail:
            "소통 방식이나 일의 리듬이 중간중간 흔들릴 수 있습니다. 일정 관리, 컨디션 관리, 말의 정리가 중요합니다.",
        },
        faint: {
          title: "희미한 수성선",
          detail:
            "사업성이나 소통 능력이 없다는 뜻이 아니라, 아직 표현 방식이 안정적으로 정리되는 과정으로 볼 수 있습니다.",
        },
      },
    },
    intuitionLine: {
      label: "직관선",
      meaning: "감각, 예감, 분위기 파악, 무의식적 판단력을 보는 보조선",
      variants: {
        visible: {
          title: "직관선이 보이는 손",
          detail:
            "분위기, 사람의 감정, 말의 이면을 빠르게 감지하는 편입니다. 논리보다 먼저 느낌으로 상황을 파악하는 경우가 많습니다.",
        },
        faint: {
          title: "희미한 직관선",
          detail:
            "직관이 없는 것이 아니라, 현실 판단과 감각이 함께 섞여 작동하는 타입으로 볼 수 있습니다.",
        },
      },
    },
  },

  mounts: {
    venus: {
      label: "금성구",
      area: "엄지 아래 도톰한 영역",
      keywords: ["애정", "친밀감", "체력", "매력", "생활력"],
      strong: "애정 표현과 친밀감 욕구가 풍부합니다. 사람을 따뜻하게 대하고, 관계에서 정서적 온도를 중요하게 봅니다.",
      weak: "친밀감 표현이 조심스럽거나 에너지를 아껴 쓰는 편입니다. 관계에서 천천히 마음이 열릴 수 있습니다.",
      caution: "강하면 애정 과잉이나 소유욕, 약하면 표현 부족으로 나타날 수 있습니다.",
    },
    moon: {
      label: "월구",
      area: "손바닥 바깥쪽 아래 영역",
      keywords: ["상상력", "직관", "감수성", "여행", "무의식"],
      strong: "상상력과 직관이 풍부하고, 낯선 세계나 감성적 경험에서 영감을 받는 타입입니다.",
      weak: "현실 감각이 더 강하고, 감정보다 실제 조건을 우선하는 경향이 있습니다.",
      caution: "강하면 공상이나 감정 과몰입, 약하면 감성적 여백 부족으로 나타날 수 있습니다.",
    },
    jupiter: {
      label: "목성구",
      area: "검지 아래",
      keywords: ["자존감", "야망", "리더십", "성장욕", "명예"],
      strong: "자기 확장 욕구와 리더십이 강합니다. 인정받고 성장하려는 힘이 큽니다.",
      weak: "앞에 나서기보다 조용히 실력을 쌓는 편입니다. 자신감 표현을 키우면 좋습니다.",
      caution: "강하면 자존심 과잉, 약하면 자기 저평가로 나타날 수 있습니다.",
    },
    saturn: {
      label: "토성구",
      area: "중지 아래",
      keywords: ["책임감", "신중함", "고독", "인내", "깊이"],
      strong: "책임감과 인내심이 강하고, 혼자 깊이 파고드는 힘이 있습니다.",
      weak: "무거운 책임보다 유연한 흐름을 선호합니다.",
      caution: "강하면 고립감이나 부담감, 약하면 지속력 부족으로 나타날 수 있습니다.",
    },
    sun: {
      label: "태양구",
      area: "약지 아래",
      keywords: ["표현력", "명예", "창작", "인기", "브랜딩"],
      strong: "사람들에게 기억되는 이미지와 표현력이 좋습니다. 창작과 브랜딩에 강점이 있습니다.",
      weak: "드러나는 것보다 내실을 쌓는 쪽이 편합니다.",
      caution: "강하면 인정 욕구 과잉, 약하면 자기 표현 부족으로 나타날 수 있습니다.",
    },
    mercury: {
      label: "수성구",
      area: "새끼손가락 아래",
      keywords: ["소통", "사업감각", "거래", "정보", "설득"],
      strong: "말, 정보, 거래, 협상에 강합니다. 네트워크를 통해 기회가 열릴 수 있습니다.",
      weak: "말보다 행동으로 신뢰를 쌓는 타입입니다.",
      caution: "강하면 계산적으로 보일 수 있고, 약하면 기회 표현이 부족할 수 있습니다.",
    },
    mars: {
      label: "화성구",
      area: "손바닥 중앙과 엄지/월구 사이 영역",
      keywords: ["용기", "방어력", "갈등 대응", "추진력", "버티는 힘"],
      strong: "위기 상황에서 버티고 밀고 나가는 힘이 있습니다.",
      weak: "갈등을 피하려는 경향이 있어 자기 주장 훈련이 필요할 수 있습니다.",
      caution: "강하면 공격성, 약하면 회피성으로 나타날 수 있습니다.",
    },
  },

  fingers: {
    thumb: {
      label: "엄지",
      meaning: "의지력, 자기결정권, 생활 주도성",
      variants: {
        strong: "자기 결정력이 강하고 한번 정한 일은 밀고 가는 힘이 있습니다.",
        flexible: "상황에 맞춰 타협하고 조율하는 능력이 좋습니다.",
        stiff: "기준이 뚜렷하지만 고집으로 보일 수 있습니다.",
      },
    },
    index: {
      label: "검지",
      meaning: "자존감, 리더십, 성장 욕구",
      variants: {
        long: "리더십과 자기 확장 욕구가 강한 편입니다.",
        short: "앞에 나서기보다 실속과 안정감을 중시합니다.",
      },
    },
    middle: {
      label: "중지",
      meaning: "책임감, 현실성, 인내",
      variants: {
        long: "책임감과 신중함이 강합니다.",
        balanced: "현실성과 유연성이 균형을 이룹니다.",
      },
    },
    ring: {
      label: "약지",
      meaning: "표현력, 매력, 창작, 대중성",
      variants: {
        long: "표현력과 무대 감각, 창작성이 강하게 나타날 수 있습니다.",
        short: "드러나는 표현보다 안정적 역할을 선호할 수 있습니다.",
      },
    },
    little: {
      label: "새끼손가락",
      meaning: "소통력, 거래 감각, 관계 언어",
      variants: {
        long: "말, 설득, 거래, 관계 조율에 강점이 있습니다.",
        short: "말보다는 행동과 신뢰로 관계를 쌓는 편입니다.",
      },
    },
  },

  scoringRules: {
    love: {
      factors: ["heartLine", "venusMount", "marriageLine", "moonMount"],
      high: "정서적 교감과 관계 몰입도가 높은 편입니다.",
      medium: "관계에서 균형과 신뢰를 중시합니다.",
      low: "감정보다 신중함과 거리 조절이 먼저 작동할 수 있습니다.",
    },
    career: {
      factors: ["fateLine", "headLine", "jupiterMount", "saturnMount"],
      high: "사회적 목표와 일의 방향성이 비교적 선명합니다.",
      medium: "상황에 따라 커리어 방향을 조율하는 타입입니다.",
      low: "정해진 길보다 경험을 통해 방향을 찾아가는 타입입니다.",
    },
    wealth: {
      factors: ["moneyLine", "mercuryMount", "fateLine", "sunLine"],
      high: "가치 창출과 돈의 흐름을 감지하는 감각이 좋습니다.",
      medium: "수입보다 관리 습관을 다질수록 재물 흐름이 안정됩니다.",
      low: "돈을 버는 방식보다 돈을 다루는 기준을 먼저 정리하는 것이 중요합니다.",
    },
    vitality: {
      factors: ["lifeLine", "venusMount", "marsMount"],
      high: "기본 에너지와 회복력이 좋은 편입니다.",
      medium: "생활 리듬에 따라 에너지 편차가 생길 수 있습니다.",
      low: "무리보다 회복 루틴과 환경 정리가 중요합니다.",
    },
    creativity: {
      factors: ["sunLine", "moonMount", "headLine", "ringFinger"],
      high: "표현력과 창작 감각이 강하게 작동합니다.",
      medium: "현실성과 감각을 함께 쓰는 창작형입니다.",
      low: "창작보다 안정적 실행과 정리에 강점이 있을 수 있습니다.",
    },
    communication: {
      factors: ["mercuryLine", "mercuryMount", "littleFinger", "headLine"],
      high: "말, 정보, 설득, 네트워크에 강점이 있습니다.",
      medium: "필요한 상황에서 소통력이 발휘되는 타입입니다.",
      low: "말보다 행동과 신뢰로 관계를 만드는 타입입니다.",
    },
  },

  combinationRules: [
    {
      id: "deepHeart_strongVenus",
      when: ["heartLine.deep_curved", "mounts.venus.strong"],
      title: "애정 온도가 높은 손",
      interpretation:
        "감정선이 깊고 금성구가 발달하면 애정과 친밀감을 중요하게 여기는 손으로 해석합니다. 관계에서 마음이 열리면 깊게 몰입하고, 상대에게 따뜻함을 주는 능력이 큽니다.",
      caution: "상대의 반응에 지나치게 휘둘리거나 애정 확인 욕구가 커질 수 있습니다.",
    },
    {
      id: "straightHead_strongFate",
      when: ["headLine.long_straight", "fateLine.strong_center"],
      title: "현실형 커리어 손",
      interpretation:
        "두뇌선이 곧고 운명선이 강하면 목표 설정, 계획, 실행이 잘 연결되는 손입니다. 커리어에서 자기 기준을 세우고 장기적으로 성과를 쌓는 데 강합니다.",
      caution: "관계에서는 감정보다 기준이 앞서 차갑게 보일 수 있습니다.",
    },
    {
      id: "strongMoon_curvedHead",
      when: ["mounts.moon.strong", "headLine.long_curved"],
      title: "직관과 상상력이 강한 손",
      interpretation:
        "월구가 강하고 두뇌선이 부드럽게 내려가면 상상력, 감수성, 직관이 강하게 작동합니다. 예술, 상담, 글쓰기, 콘텐츠 기획에 강점이 있습니다.",
      caution: "현실 검증 없이 느낌만 믿으면 방향이 흐려질 수 있습니다.",
    },
    {
      id: "weakFate_strongSun",
      when: ["fateLine.weak_or_absent", "minorLines.sunLine.strong"],
      title: "정해진 길보다 표현으로 길을 여는 손",
      interpretation:
        "운명선은 약하지만 태양선이 강하면 전통적인 직업 경로보다 자기 표현, 창작, 대외 이미지, 개인 브랜딩을 통해 길이 열릴 수 있습니다.",
      caution: "꾸준한 시스템 없이 표현만 앞서면 성과가 흩어질 수 있습니다.",
    },
    {
      id: "manyHeartBranches_mercuryStrong",
      when: ["heartLine.many_branches", "mounts.mercury.strong"],
      title: "관계 신호를 잘 읽는 소통형 손",
      interpretation:
        "감정선 잔가지와 수성구 발달이 함께 보이면 사람의 말투, 표정, 분위기를 빠르게 읽고 대응하는 능력이 좋습니다.",
      caution: "상대의 작은 반응을 과도하게 해석하지 않도록 확인 대화가 필요합니다.",
    },
  ],
};

const PALM_READING_TABS = [
  {
    key: "overview",
    label: "전체",
    icon: "🌕",
    description: "손 전체의 인상, 손형, 주요 선, 종합 점수를 한 번에 봅니다.",
  },
  {
    key: "lifeLine",
    label: "생명선",
    icon: "🌱",
    description: "수명이 아니라 에너지 운용, 회복 리듬, 생활 지속성을 봅니다.",
  },
  {
    key: "headLine",
    label: "두뇌선",
    icon: "🧠",
    description: "사고방식, 판단력, 집중력, 현실성, 상상력을 봅니다.",
  },
  {
    key: "heartLine",
    label: "감정선",
    icon: "💗",
    description: "사랑 방식, 감정 표현, 애착, 관계 기대를 봅니다.",
  },
  {
    key: "fateLine",
    label: "운명선",
    icon: "🌀",
    description: "직업 방향, 사회적 목표, 자립성, 삶의 방향성을 봅니다.",
  },
  {
    key: "moneySun",
    label: "재물/태양선",
    icon: "💰",
    description: "돈을 다루는 습관, 가치 창출, 표현력, 브랜딩 감각을 봅니다.",
  },
  {
    key: "loveMarriage",
    label: "연애/결혼선",
    icon: "💍",
    description: "결혼 횟수가 아니라 깊은 관계에서 원하는 안정감과 약속 방식을 봅니다.",
  },
  {
    key: "mounts",
    label: "손바닥 구丘",
    icon: "⛰",
    description: "금성구, 월구, 목성구 등 손바닥의 에너지 영역을 봅니다.",
  },
  {
    key: "innateAcquired",
    label: "선천/후천 비교",
    icon: "☯️",
    description: "자주 쓰는 손과 자주 쓰지 않는 손을 비교해 타고난 나와 현재의 나를 봅니다.",
  },
  {
    key: "prescription",
    label: "맞춤 처방",
    icon: "🧭",
    description: "오늘의 조언, 7일 루틴, 관계·재물·직업 조언을 제공합니다.",
  },
];

const HAND_COMPARISON_RULES = {
  lifeLine: {
    innateStrong_acquiredWeak: {
      title: "본래 회복력은 좋지만 현재는 에너지 소모가 큰 상태",
      detail:
        "선천적 손의 생명선이 강하고 후천적 손의 생명선이 약하면, 타고난 회복력은 있지만 현재의 생활 방식이나 관계, 일의 구조가 에너지를 많이 소모시키고 있다는 신호로 해석합니다.",
      advice: "새로운 목표보다 먼저 생활 리듬과 에너지 누수를 정리하는 것이 좋습니다.",
    },
    innateWeak_acquiredStrong: {
      title: "후천적 자기관리로 에너지를 키운 손",
      detail:
        "선천적 손보다 후천적 손의 생명선이 강하면, 본래 타고난 에너지보다 살아오며 만든 루틴과 자기관리 능력이 더 강해졌다고 볼 수 있습니다.",
      advice: "지금의 루틴을 유지하면 장기적인 운의 체감이 좋아집니다.",
    },
  },
  headLine: {
    innateCurved_acquiredStraight: {
      title: "감수성에서 현실 판단으로 이동한 손",
      detail:
        "선천적 손의 두뇌선은 곡선형인데 후천적 손은 직선형이면, 본래 감수성과 상상력이 강했지만 현재는 현실 판단과 논리적 기준이 더 강해진 상태로 해석합니다.",
      advice: "현실성은 장점이지만, 본래의 직관과 창의성을 너무 억누르지 마세요.",
    },
    innateStraight_acquiredCurved: {
      title: "이성에서 직관으로 확장된 손",
      detail:
        "선천적 손은 직선형이고 후천적 손은 곡선형이면, 본래는 이성적이고 계산적인 성향이 강했지만 현재는 직관과 감성을 더 많이 쓰게 된 상태로 해석합니다.",
      advice: "느낌을 활용하되 중요한 결정은 현실 검증을 함께 하세요.",
    },
  },
  heartLine: {
    innateDeep_acquiredFaint: {
      title: "깊은 감정을 방어적으로 조절하게 된 손",
      detail:
        "선천적 손의 감정선이 깊고 후천적 손이 흐려졌다면, 본래는 감정이 깊지만 관계 경험을 통해 표현을 조절하거나 방어하는 쪽으로 바뀌었을 수 있습니다.",
      advice: "안전한 관계에서는 감정을 조금씩 표현하는 연습이 필요합니다.",
    },
    innateFaint_acquiredDeep: {
      title: "관계 경험을 통해 감정 표현이 열린 손",
      detail:
        "선천적 손보다 후천적 손의 감정선이 깊어졌다면, 살아오며 관계 경험을 통해 감정 표현과 애착 능력이 확장된 것으로 해석합니다.",
      advice: "깊어진 감정 표현을 건강한 경계와 함께 사용하세요.",
    },
  },
  fateLine: {
    innateWeak_acquiredStrong: {
      title: "현재 삶에서 목표의식이 강화된 손",
      detail:
        "선천적 손보다 후천적 손의 운명선이 강하면, 원래보다 현재의 사회적 목표, 직업 방향, 자립성이 강해진 상태로 봅니다.",
      advice: "지금 잡은 목표를 장기 계획으로 정리하면 좋습니다.",
    },
    innateStrong_acquiredWeak: {
      title: "본래의 방향을 다시 재정비하는 손",
      detail:
        "선천적 손의 운명선이 강한데 후천적 손이 약하면, 본래 목표의식은 강했지만 현재는 진로, 역할, 삶의 방향을 다시 점검하는 시기일 수 있습니다.",
      advice: "완전히 새 길을 찾기보다 원래 중요했던 가치를 다시 확인하세요.",
    },
  },
};

const SAMPLE_PALM_READING = {
  reportType: "palm-reading",
  profile: {
    dominantHand: "right",
    analysisPurpose: "love",
  },
  handContext: {
    uploadedHands: ["right"],
    leftHandRole: "innate",
    rightHandRole: "acquired",
    interpretationBasis: {
      innateMeaning: "타고난 기질, 잠재력, 본래 성향, 무의식적 패턴",
      acquiredMeaning: "현재의 성향, 후천적 변화, 사회적 자아, 현재 삶의 흐름",
      mixedMeaning: "선천성과 후천성이 함께 반영된 손",
    },
  },
  imageQuality: {
    isPalmDetected: true,
    handSide: "right",
    brightness: "good",
    sharpness: "normal",
    palmCoverage: 0.88,
    rotation: 4,
    warnings: [],
  },
  rightHandReading: {
    handShape: {
      type: "water",
      labelKo: "물의 손",
      palmRatio: "긴 손바닥과 부드러운 손가락 비율",
      fingerRatio: "감수성과 직관이 잘 드러나는 비율",
      summary:
        "감정과 직관의 결이 섬세하고, 관계에서 분위기와 말의 이면을 잘 감지하는 손입니다.",
    },
    majorLines: {
      lifeLine: {
        detected: true,
        length: "medium",
        depth: "medium",
        curvature: "normal",
        breaks: 0,
        branches: 2,
        summary: "에너지를 넓게 쓰기보다 관계와 감정의 안정감에 따라 리듬이 달라집니다.",
        advice: "관계에서 소모가 클 때는 혼자 회복하는 시간을 반드시 확보하세요.",
      },
      headLine: {
        detected: true,
        length: "long",
        direction: "curved",
        startRelationWithLifeLine: "joined",
        breaks: 0,
        branches: 1,
        summary: "생각이 깊고 감각적인 판단을 함께 사용하는 타입입니다.",
        advice: "느낌이 강할수록 현실 확인을 함께 하면 선택의 질이 좋아집니다.",
      },
      heartLine: {
        detected: true,
        length: "long",
        curvature: "strong",
        endingArea: "underIndex",
        breaks: 0,
        branches: 4,
        summary: "연애에서는 깊은 신뢰와 정서적 교감을 중요하게 여깁니다.",
        advice: "상대의 반응을 과해석하지 않도록 확인 대화를 습관화하세요.",
      },
      fateLine: {
        detected: true,
        strength: "medium",
        startArea: "middlePalm",
        endArea: "saturnMount",
        breaks: 1,
        summary: "직업 방향은 고정형보다 경험을 통해 점차 선명해지는 흐름입니다.",
        advice: "현재의 일에서 의미와 성장 포인트를 찾는 것이 중요합니다.",
      },
    },
    minorLines: {
      sunLine: {
        detected: true,
        strength: "faint",
        summary: "표현력은 있지만 아직 대외적으로 선명하게 드러나는 과정입니다.",
      },
      moneyLine: {
        detected: true,
        strength: "medium",
        summary: "돈은 한 번에 크게 얻기보다 꾸준히 관리하며 안정시키는 흐름이 좋습니다.",
      },
      marriageLine: {
        detected: true,
        strength: "clear_single",
        summary: "깊은 관계에서는 신뢰, 약속, 정서적 안정감을 중요하게 봅니다.",
      },
      mercuryLine: {
        detected: false,
        strength: "unknown",
        summary: "수성선은 선명하게 감지되지 않아 보수적으로 해석합니다.",
      },
    },
    mounts: {
      venus: {
        fullness: "medium",
        summary: "애정 표현은 깊지만 무조건 빠르게 열리는 타입은 아닙니다.",
      },
      moon: {
        fullness: "strong",
        summary: "상상력과 직관이 강하고, 관계의 분위기를 예민하게 감지합니다.",
      },
      jupiter: {
        fullness: "medium",
        summary: "자존감과 성장 욕구가 균형 있게 작동합니다.",
      },
      saturn: {
        fullness: "medium",
        summary: "책임감은 있지만 지나치게 무겁게 짊어지지 않으려는 균형이 있습니다.",
      },
      sun: {
        fullness: "weak",
        summary: "대외적 표현보다 내면의 감수성과 준비가 더 강합니다.",
      },
      mercury: {
        fullness: "medium",
        summary: "필요한 순간에는 말을 잘하지만, 감정이 깊을 때는 침묵할 수 있습니다.",
      },
      mars: {
        fullness: "medium",
        summary: "갈등을 정면으로 밀어붙이기보다 상황을 보며 대응하는 타입입니다.",
      },
    },
    scores: {
      love: 82,
      career: 67,
      wealth: 61,
      vitality: 64,
      creativity: 78,
      communication: 70,
    },
    overall: {
      title: "감정의 깊이와 직관이 살아 있는 손",
      summary:
        "이 손은 관계에서 분위기와 감정의 결을 섬세하게 읽는 힘이 강합니다. 사랑에서는 빠른 자극보다 깊은 신뢰와 정서적 안정감을 더 중요하게 여기며, 직업적으로는 사람의 마음을 읽거나 감각을 표현하는 분야에서 강점이 드러납니다.",
      strengths: ["공감 능력", "직관", "감정의 깊이", "관계 감지력", "상상력"],
      cautions: ["과해석", "감정 소모", "표현 지연", "상대 반응 민감성", "회복 시간 부족"],
      recommendedActions: [
        "중요한 관계에서는 느낌만으로 판단하지 말고 직접 확인하세요.",
        "혼자 회복하는 시간을 일정에 넣으세요.",
        "감정 표현을 작은 문장으로 자주 나누세요.",
      ],
    },
  },
  bothHandsComparison: {
    enabled: false,
    innateSummary: "",
    acquiredSummary:
      "이번에 업로드한 오른손은 자주 쓰는 손으로, 현재의 성향과 살아온 흐름을 보여주는 후천적 손입니다.",
    differenceSummary: "",
    growthSummary: "",
    loveSummary: "",
    careerSummary: "",
    wealthSummary: "",
  },
  validation: {
    hasPalm: true,
    hasEnoughQuality: true,
    hasMajorLines: true,
    missingFields: [],
  },
};

module.exports = {
  PALMISTRY_DATA,
  PALM_READING_TABS,
  HAND_COMPARISON_RULES,
  SAMPLE_PALM_READING,
};
