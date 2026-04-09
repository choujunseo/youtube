import { Button } from '@toss/tds-mobile';
import { useState } from 'react';

interface IVoteActionProps {
  disabled?: boolean;
  loading?: boolean;
  onConfirmVote: () => Promise<void> | void;
}

export default function VoteAction(props: IVoteActionProps) {
  const { disabled = false, loading = false, onConfirmVote } = props;
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmVote();
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        disabled={disabled || loading}
        display="full"
        loading={loading}
        onClick={() => setIsConfirmOpen(true)}
      >
        이 아이디어에 투표하기
      </Button>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/45 animate-modal-backdrop-in"
            aria-hidden
          />
          <div className="relative w-full max-w-md animate-bottom-sheet-in rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-base font-semibold text-gray-900">투표를 진행할까요?</p>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              투표 후에는 철회할 수 없습니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="weak" disabled={isSubmitting} onClick={() => setIsConfirmOpen(false)}>
                닫기
              </Button>
              <Button loading={isSubmitting} onClick={() => void handleConfirm()}>
                투표 확정
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
