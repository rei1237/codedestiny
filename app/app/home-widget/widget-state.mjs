/**
 * 홈 화면 위젯 설정 화면의 상태 전이. 완료("added")는 네이티브 성공 콜백이 보낸 토큰이
 * 방금 띄운 확인창의 토큰과 같을 때만 된다 — 사용자가 확인창을 취소하면 콜백이 없으므로
 * "requested" 에 머물고 다시 시도할 수 있다.
 *
 * @typedef {"idle"|"requested"|"added"|"updated"|"missing"|"failed"|"manual"|"web"} WidgetStatus
 * @param {WidgetStatus} current
 * @param {{type:"select"}|{type:"pin",status:string}|{type:"added",token?:string,pendingToken?:string}|{type:"update",status:string}|{type:"error"}} action
 * @returns {WidgetStatus}
 */
export function nextWidgetStatus(current, action) {
  if (current === "web") return current;
  switch (action.type) {
    case "select": return "idle";
    case "pin": return action.status === "requested" ? "requested" : "manual";
    case "added": return current === "requested" && action.token && action.token === action.pendingToken ? "added" : current;
    case "update": return action.status === "updated" ? "updated" : "missing";
    case "error": return "failed";
    default: return current;
  }
}
