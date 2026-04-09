import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { Button, Paragraph, useToast } from '@toss/tds-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export default function MyWithdrawPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openToast } = useToast();
  const { withdraw } = useAuth();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleWithdraw = async () => {
    setBusy(true);
    try {
      const result = await withdraw();
      if (result.ok) {
        queryClient.clear();
        openToast('탈퇴 처리가 완료됐어요.', { higherThanCTA: true, duration: 2400 });
        navigate('/feed', { replace: true });
        return;
      }
      openToast(result.message || '탈퇴에 실패했어요.', { higherThanCTA: true, duration: 3200 });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <MySubpageLayout title="탈퇴하기">
        <section className="mx-auto w-full max-w-md space-y-4 px-4 pt-4">
          <Paragraph typography="t6" fontWeight="regular" color="#4E5968">
            로그인한 뒤에만 탈퇴할 수 있어요.
          </Paragraph>
          <Button onClick={() => navigate('/my')}>My로 돌아가기</Button>
        </section>
      </MySubpageLayout>
    );
  }

  return (
    <MySubpageLayout title="탈퇴하기" subtitle="서비스 탈퇴">
      <section className="mx-auto w-full max-w-md space-y-5 px-4 pt-4 pb-8">
        <article className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <Paragraph typography="t5" fontWeight="bold" color="#191F28">
            회원 탈퇴 전 반드시 확인해 주세요.
          </Paragraph>

          <div className="space-y-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              1. 누적 상금 및 투표권 영구 소멸
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              탈퇴 즉시 아직 정산받지 않은 모든 누적 상금과 보유 중인 투표권(티켓)은 전액 소멸되며, 어떠한 경우에도
              복구되지 않습니다. 탈퇴 전 반드시 잔여 상금을 확인해 주세요.
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              2. 진행 중인 아이디어 상금 포기
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              본인이 작성한 아이디어가 아직 600표(졸업)를 달성하지 않은 상태에서 탈퇴할 경우, 추후 아이디어가
              졸업하더라도 창작자 상금(3,000원)은 지급되지 않습니다. 탈퇴와 동시에 해당 정산 권리는 영구 포기한
              것으로 간주합니다.
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              3. 작성한 아이디어 게시물 유지
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              원활한 보물찾기(투표) 생태계 유지를 위해, 탈퇴 전 이미 피드에 등록하신 아이디어는 삭제되지 않으며
              작성자명이 &apos;알 수 없음&apos;으로 변경되어 유지됩니다.
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              노출을 원하지 않는 아이디어가 있다면 반드시 탈퇴 전에 직접 삭제하신 후 탈퇴를 진행해 주세요.
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              4. 재가입 제한 (부정 이용 방지)
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              무분별한 탈퇴 및 첫 가입·첫 투표 혜택의 중복 수령을 방지하기 위해, 탈퇴 후 30일 동안 동일한 정보로
              재가입이 엄격히 제한됩니다.
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              5. 개인정보 파기
            </Paragraph>
            <Paragraph typography="t7" fontWeight="regular" color="#4E5968" className="!leading-6">
              회원님의 모든 개인정보는 탈퇴 즉시 파기됩니다. 단, 관련 법령에 따른 의무 보존 기록 및 플랫폼 부정
              이용(어뷰징) 방지를 위한 최소한의 식별 정보는 일정 기간 보관 후 파기됩니다.
            </Paragraph>
          </div>
        </article>

        <Button
          variant="weak"
          className="!text-red-600"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          탈퇴하기
        </Button>

        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 animate-modal-backdrop-in"
              aria-label="닫기"
              onClick={() => !busy && setConfirmOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md animate-top-sheet-in rounded-b-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
              <p className="text-base font-semibold text-gray-900">정말 탈퇴할까요?</p>
              <p className="mt-2 text-sm leading-5 text-gray-600">
                상금·투표권이 소멸하고 계정이 비활성화돼요. 미졸업 아이디어의 창작자 상금 권리도 포기돼요. 되돌리기
                어려워요.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="weak" disabled={busy} onClick={() => setConfirmOpen(false)}>
                  취소
                </Button>
                <Button loading={busy} className="!bg-red-500" onClick={() => void handleWithdraw()}>
                  탈퇴 확정
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </MySubpageLayout>
  );
}
