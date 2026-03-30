import { Button } from '@toss/tds-mobile';

interface IQueryErrorPanelProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** 네트워크/쿼리 실패 시 한 줄 안내 + 재시도 (UX 라이팅: 능동·해요체) */
export default function QueryErrorPanel(props: IQueryErrorPanelProps) {
  const { title = '불러오지 못했어요', message, onRetry, retryLabel = '다시 시도' } = props;

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/90 p-4">
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-1 text-sm leading-5 text-red-700/90">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button size="small" variant="weak" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
