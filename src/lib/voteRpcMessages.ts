export function isRpcErrorCode(msg: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(msg);
}

export function voteErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'ALREADY_VOTED':
      return '이미 이 아이디어에 투표했어요.';
    case 'NO_TICKETS':
      return '투표권이 부족해요.';
    case 'NO_ACTIVE_WEEK':
      return '진행 중인 주차가 없어요.';
    case 'IDEA_NOT_IN_CURRENT_WEEK':
      return '이번 주 아이디어가 아니에요.';
    case 'IDEA_GRADUATED':
      return '이 아이디어는 이미 600표를 넘겨 피드에서 내려갔어요.';
    case 'IDEA_NOT_FOUND':
      return '아이디어를 찾을 수 없어요.';
    case 'USER_NOT_FOUND':
      return '사용자 정보를 찾을 수 없어요.';
    case 'FORBIDDEN':
      return '권한이 없어요. 다시 로그인해 주세요.';
    case 'INVALID_RPC_RESPONSE':
    case 'INVALID_REWARD_AMOUNT':
      return '보상 처리에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
    default:
      return code ? `투표 실패: ${code}` : '투표에 실패했어요.';
  }
}
