import { List, ListRow, Paragraph } from '@toss/tds-mobile';
import MySubpageLayout from '@/components/my/MySubpageLayout';

export default function GuidePage() {
  return (
    <MySubpageLayout title="아이디어리그" subtitle="사용설명서">
      <section className="mx-auto w-full max-w-md space-y-4 px-4 pt-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            업로드 / 부스트
          </Paragraph>
          <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!mt-2">
            창의적인 유튜브 콘텐츠 아이디어를 업로드해 보세요
          </Paragraph>
          <div className="mt-3">
            <List>
              <ListRow
                border="none"
                horizontalPadding="small"
                left={
                  <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                    아이디어 업로드는 하루 최대 2개까지 가능해요.
                  </Paragraph>
                }
              />
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
                    광고를 보면 부스트를 얻을 수 있고, 부스트를 사용하면 내 아이디어 노출 확률이 상승해 졸업 확률이 높아져요.
                  </Paragraph>
                }
              />
              <ListRow
                border="none"
                horizontalPadding="small"
                left={
                  <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                    부스트는 "내가 투표한 아이디어" 탭에서 사용할 수 있어요.
                  </Paragraph>
                }
              />
            </List>
          </div>
        </article>

        <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <Paragraph typography="t5" fontWeight="semibold" color="#191F28">
            아이디어 졸업
          </Paragraph>
          <Paragraph typography="t7" fontWeight="semibold" color="#1D4ED8" className="!mt-2">
            아이디어가 600표에 도달하면 졸업하며 명예의 전당에 입성해요. 투표 순서에 따라 토스 포인트가 즉시 지급돼요.
          </Paragraph>
          <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!mt-2">
            서비스에서 처음으로 투표를 하신 분에게는 별도로 5원 프로모션이 지급돼요. 졸업 시 1번째 투표 보상 1,000원은 그와 별개로 정산돼요.
          </Paragraph>
          <div className="mt-3 overflow-x-auto rounded-lg border border-blue-200 bg-white">
            <table className="w-full min-w-[280px] border-collapse text-left text-xs text-[#4E5968]">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/80">
                  <th className="px-3 py-2 font-semibold text-[#191F28]">구분</th>
                  <th className="px-3 py-2 font-semibold text-[#191F28]">정산</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-blue-100">
                  <td className="px-3 py-2">창작자 (600표 달성)</td>
                  <td className="px-3 py-2 tabular-nums">3,000원</td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="px-3 py-2">1번째 투표 (최초 발굴)</td>
                  <td className="px-3 py-2 tabular-nums">1,000원</td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="px-3 py-2">150번째 투표</td>
                  <td className="px-3 py-2 tabular-nums">500원</td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="px-3 py-2">300번째 투표</td>
                  <td className="px-3 py-2 tabular-nums">800원</td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="px-3 py-2">450번째 투표</td>
                  <td className="px-3 py-2 tabular-nums">1,000원</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">600번째 투표 (졸업)</td>
                  <td className="px-3 py-2 tabular-nums">2,000원</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!mt-3">
            위 순위에 해당하지 않는 나머지 투표자(595명)에게는 각 1원이 지급돼요(100% 당첨).
          </Paragraph>
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
                  최초 로그인 시 웰컴 보너스 1장이 지급돼요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  출석 시 무료 투표권 1장이 지급돼요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="semibold" color="#B42318">
                  한 번 행사한 투표는 취소할 수 없어요. 신중하게 선택해 주세요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  투표권이 부족하면 광고를 보고 즉시 충전할 수 있어요.
                </Paragraph>
              }
            />
            </List>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            명예의 전당
          </Paragraph>
          <div className="mt-2">
            <List>
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  피드에서는 투표수가 공개되지 않아요(단, 투표수가 0인 경우는 공개됩니다). 아이디어의 가치에 집중해 주세요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  명예의 전당에서는 600표를 달성한 아이디어와 수상자를 확인할 수 있어요.
                </Paragraph>
              }
            />
            <ListRow
              border="none"
              horizontalPadding="small"
              left={
                <Paragraph typography="t7" fontWeight="regular" color="#4E5968">
                  명예의 전당 진입 시 전면형 광고가 노출될 수 있어요.
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
