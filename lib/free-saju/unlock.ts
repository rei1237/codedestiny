/**
 * `/saju/free` "재물 시크릿 키워드" 공유 해제 상태.
 *
 * ViralShareBar 의 아무 채널(X·스레드·링크·이미지)이 onShared 를 부르면 연다(사용자 결정 2026-11-08,
 * 코인·금전 보상 없음, 카카오 제외). sessionStorage 는 사생활 모드·차단에서 throw 할 수 있으니
 * 읽기·쓰기를 모두 try/catch 로 감싸고, 실패하면 메모리에서만 해제한다(새로고침하면 다시 잠김).
 */
export const WEALTH_UNLOCK_STORAGE_KEY = "cd:free-saju:wealth-unlock";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function createWealthUnlockStore(getStorage: () => StorageLike | null = defaultStorage) {
  let memoryUnlocked = false;
  return {
    isUnlocked(): boolean {
      if (memoryUnlocked) return true;
      try {
        return getStorage()?.getItem(WEALTH_UNLOCK_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    },
    /** 저장까지 됐으면 true, 메모리에서만 열렸으면 false. 어느 쪽이든 isUnlocked() 는 true. */
    unlock(): boolean {
      memoryUnlocked = true;
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(WEALTH_UNLOCK_STORAGE_KEY, "1");
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const wealthUnlockStore = createWealthUnlockStore();
