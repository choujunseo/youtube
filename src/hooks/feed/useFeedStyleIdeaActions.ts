import { useToast } from '@toss/tds-mobile';
import { useCallback, useState } from 'react';
import { useInsertReportMutation } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';

/**
 * 피드·명예의 전당 공통: 신고(사유 모달 → 제출, 비로그인 가능). 투표는 피드에서 `useFeedInlineVote`.
 */
export function useFeedStyleIdeaActions() {
  const { openToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const reportMutation = useInsertReportMutation();
  const [reportModalIdeaId, setReportModalIdeaId] = useState<string | null>(null);

  const onReport = useCallback((ideaId: string) => {
    setReportModalIdeaId(ideaId);
  }, []);

  const closeReportModal = useCallback(() => {
    if (reportMutation.isPending) return;
    setReportModalIdeaId(null);
  }, [reportMutation.isPending]);

  const submitReportReason = useCallback(
    async (reasonDetail: string) => {
      if (!reportModalIdeaId) return;
      try {
        await reportMutation.mutateAsync({
          reporterUserId: userId ?? null,
          reportedIdeaId: reportModalIdeaId,
          reasonCode: 'OTHER',
          reasonDetail,
        });
        openToast('신고가 접수됐어요.', { higherThanCTA: true, duration: 2400 });
        setReportModalIdeaId(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '신고에 실패했어요.';
        openToast(msg, { higherThanCTA: true, duration: 2800 });
        throw err;
      }
    },
    [reportModalIdeaId, userId, reportMutation, openToast],
  );

  const reportingIdeaId =
    reportMutation.isPending && reportModalIdeaId != null ? reportModalIdeaId : null;

  return {
    onReport,
    reportingIdeaId,
    reportModalIdeaId,
    closeReportModal,
    submitReportReason,
    isReportSubmitting: reportMutation.isPending,
  };
}
