import { List, ListRow, Paragraph } from '@toss/tds-mobile';
import MySubpageLayout from '@/components/my/MySubpageLayout';

export default function GuidePage() {
  return (
    <MySubpageLayout title="아이디어리그" subtitle="사용설명서">
      <section className="mx-auto w-full max-w-md space-y-4 px-4 pt-2">
        <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <Paragraph typography="t5" fontWeight="semibold" color="#191F28">
            상금은 어떻게 받나요?
          </Paragraph>
          <div className="mt-2">
            <List>
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  창작자: 내가 올린 아이디어가 주간 최종 1등을 차지하면 상금을 받아요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  투표자: 최종 1등 아이디어에 투표했다면 상금 당첨 기회가 주어져요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="semibold" color="#1D4ED8">
                  특히, 남들보다 일찍 투표할수록 내 지분이 커져 당첨 확률이 훨씬 높아져요.
                </Paragraph>
              }
            />
            </List>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            투표권은 어떻게 얻나요?
          </Paragraph>
          <div className="mt-2">
            <List>
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  매주 무료 투표권 10장이 지급돼요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  투표권이 부족하면 짧은 광고를 보고 추가 투표권을 받을 수 있어요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="semibold" color="#B42318">
                  한 번 행사한 투표는 절대 철회할 수 없어요. 신중하게 선택해 주세요.
                </Paragraph>
              }
            />
            </List>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            아이디어 등록과 부스트
          </Paragraph>
          <div className="mt-2">
            <List>
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  아이디어 등록 시 1회 광고 시청이 필요해요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  부스트 광고를 보면 2시간 동안 내 글이 다른 유저 피드에 노출될 확률이 대폭 올라가요.
                </Paragraph>
              }
            />
            </List>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            블라인드와 피버 타임
          </Paragraph>
          <div className="mt-2">
            <List>
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  평일과 토요일에는 아이디어 순위와 전체 투표 수가 공개되지 않아요. 내 안목을 믿고 투표해 보세요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  매주 일요일 23:30~24:00에는 실시간 순위가 열리는 피버 타임 랭킹 창이 열려요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  자정 마감 후 최종 결과와 정산 내역은 My 탭에서 확인할 수 있어요.
                </Paragraph>
              }
            />
            </List>
          </div>
        </article>
      </section>
    </MySubpageLayout>
  );
}
