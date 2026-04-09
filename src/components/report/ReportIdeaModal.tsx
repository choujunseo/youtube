import { Button, useToast } from '@toss/tds-mobile';
import { useState } from 'react';

const REPORT_REASON_MAX = 500;

interface IReportIdeaModalProps {
  ideaId: string | null;
  onClose: () => void;
  /** 성공 시 모달은 부모에서 닫힘 */
  onSubmit: (reasonDetail: string) => Promise<void>;
  isSubmitting: boolean;
}

/** `ideaId`가 바뀔 때마다 부모에서 `key={ideaId}`로 마운트해 사유 입력을 초기화 */
function ReportIdeaModalPanel(props: Omit<IReportIdeaModalProps, 'ideaId'>) {
  const { onClose, onSubmit, isSubmitting } = props;
  const { openToast } = useToast();
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    const t = reason.trim();
    if (!t) {
      openToast('신고 사유를 입력해 주세요.', { higherThanCTA: true, duration: 2400 });
      return;
    }
    if (t.length > REPORT_REASON_MAX) {
      openToast(`사유는 ${REPORT_REASON_MAX}자 이하로 입력해 주세요.`, { higherThanCTA: true, duration: 2600 });
      return;
    }
    try {
      await onSubmit(t);
    } catch {
      // 부모 훅에서 토스트 처리
    }
  };

  return (
    <div className="relative w-full max-w-md animate-top-sheet-in rounded-2xl bg-white p-4 shadow-xl">
      <p className="text-center text-base font-semibold text-gray-900">신고</p>
      <p className="mt-1 text-sm leading-5 text-gray-600">
        신고 사유를 입력해 주세요. 접수 후 검토할게요.
      </p>
      <textarea
        className="mt-3 min-h-[100px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-200"
        value={reason}
        maxLength={REPORT_REASON_MAX}
        placeholder="신고 사유"
        disabled={isSubmitting}
        onChange={(e) => setReason(e.target.value)}
      />
      <p className="mt-1 text-right text-xs text-gray-400">
        {reason.length}/{REPORT_REASON_MAX}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="weak" disabled={isSubmitting} onClick={onClose}>
          취소
        </Button>
        <Button loading={isSubmitting} disabled={isSubmitting} onClick={() => void handleSubmit()}>
          제출
        </Button>
      </div>
    </div>
  );
}

export default function ReportIdeaModal(props: IReportIdeaModalProps) {
  const { ideaId, onClose, onSubmit, isSubmitting } = props;

  if (ideaId == null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        role="button"
        tabIndex={-1}
        className="absolute inset-0 bg-black/45 animate-modal-backdrop-in"
        aria-label="신고 창 닫기"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !isSubmitting) onClose();
        }}
      />
      <ReportIdeaModalPanel key={ideaId} onClose={onClose} onSubmit={onSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
