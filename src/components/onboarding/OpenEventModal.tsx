import { Button, Paragraph } from '@toss/tds-mobile';

interface IOpenEventModalProps {
  open: boolean;
  onDismiss: () => void;
}

export default function OpenEventModal(props: IOpenEventModalProps) {
  const { open, onDismiss } = props;
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-event-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 animate-modal-backdrop-in"
        aria-label="오픈 이벤트 닫기"
        onClick={onDismiss}
      />
      <div className="relative w-full max-w-md animate-modal-backdrop-in rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
        <p id="open-event-title" className="text-center text-lg font-bold text-gray-900">
          오픈 이벤트
        </p>
        <div className="mt-3 space-y-2">
          <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
            아이디어리그에 오신 걸 환영해요.
          </Paragraph>
          <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
            이번 주 아이디어에 투표하고, 일요일 밤 실시간 랭킹에서 주간 순위를 확인해 보세요. 이용 방법은 My 탭의 「아이디어리그
            사용설명서」에 정리해 두었어요.
          </Paragraph>
        </div>
        <div className="mt-5">
          <Button display="full" onClick={onDismiss}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
