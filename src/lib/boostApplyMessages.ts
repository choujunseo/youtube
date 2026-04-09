export function boostApplyErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'NO_BOOST_CHARGES':
      return '부스트 충전이 부족해요. My에서 광고 보고 충전해 주세요.';
    case 'ALREADY_BOOSTED':
      return '이미 부스트가 적용 중이에요.';
    case 'IDEA_NOT_FOUND':
      return '아이디어를 찾을 수 없어요.';
    case 'FORBIDDEN':
      return '권한이 없어요. 다시 로그인해 주세요.';
    default:
      return code ? `부스트 적용 실패: ${code}` : '부스트 적용에 실패했어요.';
  }
}
