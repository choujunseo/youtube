import { List, ListRow, Paragraph } from '@toss/tds-mobile';
import { getMaintenanceWindowLabelKst } from '@/lib/maintenanceWindowKst';

const MAINTENANCE_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u1F6E0.png';
const DRAWING_MESSAGE = '추첨 중';
const WIN_MESSAGE = '당첨! 상금이 지급되었는지 확인하세요!';
const LOSE_MESSAGE = '아쉽지만 다음 기회에..';

type TDrawState = 'drawing' | 'won' | 'lost';

function getDrawMessage(state: TDrawState): string {
  if (state === 'won') return WIN_MESSAGE;
  if (state === 'lost') return LOSE_MESSAGE;
  return DRAWING_MESSAGE;
}

function formatWon(n: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(n)}원`;
}

export default function MaintenancePage() {
  const maintenanceLabel = getMaintenanceWindowLabelKst().replace(/\s*\(KST\)\s*/g, '');
  const creatorDrawState: TDrawState = 'drawing';
  const voterDrawState: TDrawState = 'drawing';

  return (
    <main className="relative min-h-full bg-gray-50 pb-6">
      <header className="flex items-center justify-center px-4 pb-3 pt-6">
        <img
          src={MAINTENANCE_EMOJI_SRC}
          alt="점검"
          width={56}
          height={56}
          className="h-14 w-14 select-none object-contain"
          decoding="async"
          draggable={false}
        />
      </header>
      <section className="space-y-3 px-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            점검 시간 안내
          </Paragraph>
          <div className="mt-1">
            <Paragraph typography="t7" fontWeight="regular" color="#191F28">
              {maintenanceLabel}는 점검 시간이에요.
            </Paragraph>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="px-4 pb-2 pt-4">
            <Paragraph typography="t7" fontWeight="regular" color="#8B95A1">
              내 당첨 결과
            </Paragraph>
          </div>
          <List paddingBottom={0}>
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">창작</span>}
              right={
                <span className="text-sm font-semibold text-gray-900">{getDrawMessage(creatorDrawState)}</span>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">투표</span>}
              right={<span className="text-sm font-semibold text-gray-900">{getDrawMessage(voterDrawState)}</span>}
            />
          </List>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="px-4 pb-2 pt-4">
            <Paragraph typography="t7" fontWeight="regular" color="#8B95A1">
              1위 아이디어
            </Paragraph>
            <div className="mt-1 flex items-center gap-2">
              <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
                출근 10분 단축 루틴
              </Paragraph>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">#LIFE</span>
            </div>
            <div className="mt-1">
              <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                아침 동선 체크리스트를 자동으로 묶어서 시간을 줄여주는 아이디어예요.
              </Paragraph>
            </div>
          </div>
          <List paddingBottom={0}>
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">투표수</span>}
              right={<span className="text-sm font-semibold tabular-nums text-gray-900">128표</span>}
            />
          </List>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="px-4 pb-2 pt-4">
            <Paragraph typography="t7" fontWeight="regular" color="#8B95A1">
              상금 배분
            </Paragraph>
          </div>
          <List paddingBottom={0}>
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">창작자</span>}
              right={
                <span className="text-sm font-semibold tabular-nums text-gray-900">{formatWon(60000)}</span>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">투표 당첨자</span>}
              right={
                <span className="text-sm font-semibold tabular-nums text-gray-900">{formatWon(20000)}</span>
              }
            />
          </List>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="px-4 pb-2 pt-4">
            <Paragraph typography="t7" fontWeight="regular" color="#8B95A1">
              해당 주 최종 순위
            </Paragraph>
          </div>
          <List paddingBottom={0}>
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">1위</span>}
              right={<span className="text-sm font-semibold text-gray-900">출근 10분 단축 루틴</span>}
            />
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">2위</span>}
              right={<span className="text-sm font-semibold text-gray-900">하루 1분 절약 가계부</span>}
            />
            <ListRow
              border="none"
              horizontalPadding="medium"
              left={<span className="text-sm text-gray-600">3위</span>}
              right={<span className="text-sm font-semibold text-gray-900">직장인 점심 최적화 지도</span>}
            />
          </List>
        </div>
      </section>
    </main>
  );
}
