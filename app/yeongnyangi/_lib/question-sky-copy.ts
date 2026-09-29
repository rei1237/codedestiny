import {SPIRIT_NOTICE} from '@/worker/yeongnyangi/fortune/spirit-contract';

export const questionSkyCopy={
  ko:{
    entry:{kicker:'질문 순간의 상담',title:'영냥 신점',description:'질문이 떠오른 순간의 기운과 인연의 흐름',action:'질문 남기기'},
    input:{
      title:'영냥 신점',horaryTitle:'영냥 호라리',intro:'질문이 마음에 떠오른 순간, 그때의 하늘과 자리에서 이야기의 결을 읽어줄게.',
      description:'질문이 떠오른 순간의 기운과 자리에서, 선택에 비친 상징과 관계의 조건을 살펴보는 전통 상담 방식이야.',notice:SPIRIT_NOTICE,
      questionLabel:'영냥이에게 궁금한 한 가지',questionPlaceholder:'가장 알고 싶은 한 가지를 적어줘.',
      topicLabel:'궁금한 주제',topicHelp:'고른 주제보다 직접 적어준 질문을 먼저 살펴볼게.',relationshipLabel:'그 사람과 나의 관계',
      cityLabel:'질문이 떠올랐을 때 내가 있던 도시',cityPlaceholder:'질문자 도시 선택',locationConfirmed:'확인한 현재 위치를 사용할게. 시간대:',
      cityHelp:'도시를 선택하면 도시 중심, 현재 위치에 동의하면 확인한 위치를 사용해. 상대방의 위치가 아니라 질문 당시 네가 있던 장소야.',
      timeLabel:'질문이 떠오른 날짜와 시각',timeHelp:'기억하는 시각을 그대로 적어줘. 시간대는 도시를 기준으로 서버에서 확인하고 저장해. 정확히 기억나지 않으면 임의로 채우지 말고 질문을 새로 정리한 순간을 기준으로 해줘. 출생정보는 필요하지 않아.',
      situationLabel:'이미 알고 있는 상황',situationPlaceholder:'이름과 주소 대신 네가 알고 있는 상황만 적어줘.',boundaryLabel:'상대가 연락을 거절하거나 차단한 상황이에요',
      checkoutTitle:'상담 내용 확인',paidSummary:'영냥 신점 · 1차 결과와 심화 상담 1회',paidPrice:'Family 또는 단건 결제',
      freeSummary:'전통 서양 호라리 계산과 외부 AI 상담 프롬프트',freePrice:'무료 · 프롬프트 제공',freeSubmit:'무료 호라리 프롬프트 만들기',
      submit:'결제 내용 확인하기',busy:'질문 순간의 결을 살피는 중',preparing:'상담 준비 상태를 확인하고 있어요.',unavailable:'지금은 상담 준비 중이에요. 결제는 진행되지 않아요.',
      validation:'질문 한 가지와 질문이 떠오른 도시·시각을 확인해 주세요.',initialError:'상담을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.',availabilityError:'상담 준비 상태를 확인하지 못했어요. 잠시 후 다시 열어 주세요.',
      imageAlt:'부채와 방울을 든 한복 차림의 영냥이',navigation:'상담 이동',library:'내 상담 기록',other:'다른 상담 고르기',
      relationships:['그 밖의 관계','나 자신의 선택','알아가는 사이','연인','헤어진 사이','친구','가족','동료'],
    },
    result:{
      title:'영냥 신점',questionLabel:'내가 남긴 질문',consultedAt:'상담 기준',region:'질문자 지역',regionSuffix:'도시 중심 기준의 상징 풀이',
      answerLabel:'핵심 답변',saving:'질문의 결을 살피는 중',deepening:'심화 답을 정리하는 중',complete:'모든 이야기를 저장했어.',awaiting:'첫 답을 마쳤어. 아래에서 한 번 더 깊게 물어볼 수 있어.',
      progress:'이야기 저장과 최종 확인 진행률',followupTitle:'한 번 더 깊게 물어볼래?',followupDescription:'첫 답에서 갈라진 지점 하나를 골라 더 구체적으로 살펴볼 수 있어.',followupPlaceholder:'심화해서 알고 싶은 한 가지를 적어줘.',followupSubmit:'심화 질문 보내기',followupBusy:'심화 답을 준비하는 중',followupUsed:'이번 상담에 포함된 심화 질문을 모두 사용했어.',
      finalTitle:'영냥이의 마무리',share:'익명 요약 공유하기',shareDone:'공유 창에서 선택한 동작을 마쳤어요.',shareCopied:'익명 소개를 복사했어요.',shareCancelled:'공유를 취소했어요.',shareError:'공유를 마치지 못했어요. 아래 상담 공유에서 문구를 복사할 수 있어요.',
      noticeNavigation:'다음 상담',library:'내 상담 기록',newReading:'새 상담 시작하기',moodAlt:'상담의 흐름을 살피는 영냥이',
      errors:{FOLLOWUP_INPUT_INVALID:'심화 질문은 5자 이상 600자 이하의 한 가지 질문으로 적어 주세요.',FOLLOWUP_NOT_AVAILABLE:'지금은 심화 질문을 받을 수 없어요. 첫 결과를 다시 확인해 주세요.',FOLLOWUP_ALREADY_USED:'이번 상담에 포함된 심화 질문은 이미 사용했어요.'},
    },
  },
} as const;

export const questionSkyTopicCopy:Record<string,string>={relationship:'관계의 흐름',space:'공간의 기운',contact:'연락',reunion:'재회',work:'일과 진로',money:'재물',home:'주거와 이사',study:'시험과 공부',travel:'이동과 여행',general:'그 밖의 질문'};
export const questionSkyCopyFor=()=>questionSkyCopy.ko;
