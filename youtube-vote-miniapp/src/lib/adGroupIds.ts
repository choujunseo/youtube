/** 업로드 제출 시마다 시청하는 리워드 광고 그룹 */
export function uploadSubmitAdGroupId(): string {
  return (
    (import.meta.env.VITE_AD_GROUP_UPLOAD as string | undefined) ||
    (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ||
    'upload_submit_dev'
  );
}
