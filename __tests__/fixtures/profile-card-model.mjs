/**
 * 출생 기반 해금 테스트용 ProfileCard 모델 대역.
 * 리졸버(worker/lib/birth-scoped-unlock-identity.js)는 ProfileCard.findOne({userId, profileId}).select().lean() 만 부른다.
 * cards 배열을 테스트가 직접 고치면(생년월일 수정·삭제) 다음 조회부터 반영된다.
 */
export const TEST_USER_ID = "64b0000000000000000000a1";
export const OTHER_USER_ID = "64b0000000000000000000b2";
export const TEST_BIRTH = Object.freeze({ year: 1990, month: 5, day: 17, hour: 9, minute: 30, timeUnknown: false, calType: "solar" });

export function testCard(profileId, { userId = TEST_USER_ID, gender = "F", ...birth } = {}) {
  return { userId, profileId, gender, birth: { ...TEST_BIRTH, ...birth } };
}

export function profileCardModel(cards = []) {
  return {
    cards,
    findOne(filter = {}) {
      const match = () => cards.find(
        (card) => String(card.userId) === String(filter.userId) && card.profileId === filter.profileId,
      ) || null;
      const query = {
        select: () => query,
        session: () => query,
        lean: async () => match(),
        then: (resolve, reject) => Promise.resolve(match()).then(resolve, reject),
      };
      return query;
    },
  };
}
