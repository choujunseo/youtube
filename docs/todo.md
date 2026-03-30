# TODO

## Phase A (진행 중 · 앱 개발 병행)

- [x] Supabase 클라이언트: 익명 세션 `persistSession` + `storageKey` (RLS/Edge JWT 안정화)
- [x] `authStore` / `ITokenExchangeResponse` 정렬: `authLinked`, `profileNameDecrypted`

## Milestone 4: 타입 · 서비스 · React Query

- [x] 도메인 타입: `week`, `idea`, `vote`, `ranking`, `adLog`, `weeklyResult`, `report`
- [x] 매퍼: `src/lib/supabaseMappers.ts`
- [x] 쿼리 키 / `QUERY_STALE`: `src/lib/queryKeys.ts`, `src/lib/queryClient.ts`
- [x] 서비스: `weekService`, `ideaService`, `voteService`, `rankingService`, `adLogService`, `weeklyResultService`, `reportService`
- [x] 훅: `src/hooks/queries/*` → `export` from `hooks/queries/index.ts`
- [x] 피드 페이지를 mock 대신 쿼리 훅 기반으로 교체

## Milestone 5: Swipe Feed · Dark Zone UI

- [x] `SwipeFeed` 무한 스크롤 (Intersection Observer + `useInfiniteQuery`)
- [x] `IdeaCard` (다크존: 투표 전 순위/표수 비공개)
- [x] `IdeaCardVoted` (투표 후 순위/확률 공개)
- [x] 피드에서 신고 버튼 연동 (`reports` insert)
- [x] `IdeaDetailPage` / `RankingPage` mock 제거 및 동일 서비스 훅으로 통일

## Milestone 6: Vote Action · Ticket System

- [x] `VoteAction.tsx` 확인 모달(투표 철회 불가) 적용
- [x] `useVote` 훅 낙관적 티켓 차감 + 실패 롤백
- [x] `useTickets` 훅 (free/ad 합산 + 주간 리셋 시점 체크)
- [x] `TicketBadge.tsx` 컴포넌트 적용
- [x] `ProbabilityGauge.tsx` 컴포넌트 적용

## Milestone 7: Rewarded Ad Integration

- [x] `useRewardedAd` 훅 (`GoogleAdMob` 래핑 + `isSupported` 판별)
- [x] `AdRewardButton.tsx` 티켓 충전 플로우 (광고 → `reward_ticket_recharge` RPC)
- [x] `adLogService` 로그/지급 연동 (`VITE_AD_GROUP_ID` 및 옵션 `adGroupId` 지원)
- [x] 티켓 지급: DB RPC `reward_ticket_recharge` (문서/스펙 정리 완료, Edge 지급 경로 없음)

## Milestone 8: Idea Upload · Creator Dashboard

- [x] `UploadPage.tsx` 주 7건까지 · 초과 시 `최대 업로드 개수 도달` · 제출마다 리워드 광고
- [x] `BoostButton.tsx` 광고 → `activateIdeaBoost` + `ad_logs`(`boost`)
- [x] `MyIdeasPage.tsx` 크리에이터 전용 순위 · 주간 가중치 비중 표시
- [x] 부스트 만료: `isBoostActive` (`boost_expires_at`)
- [x] 투표권: 주간 무료 10 + 광고 추가 무제한 안내 (`TicketBadge` / `FREE_WEEKLY_VOTE_TICKETS`)
- [x] `youtube-vote-miniapp-technical-spec.md` 업로드 상한·업로드 흐름(7건·RPC) 등 Milestone 7~9와 정합

## Milestone 9: 주간 운영 UI (점검 · 피버 · 랭킹)

### 9.1 월요일 점검 창 (KST 00:00~06:00)

- [x] 일반 라우트/`BottomNav` 숨김, `MaintenancePage`만 표시 (`점검 중이에요`, `00:00~06:00`)
- [ ] 출시 전 원복: 점검 시간 개발용 임시값을 운영값(`00:00~06:00`, KST)으로 복구 (`VITE_MAINTENANCE_START_HOUR_KST=0`, `VITE_MAINTENANCE_END_HOUR_KST=6`)

### 9.2 피버 타임 · 라이브 랭킹 UX

- [x] `useFeverMode` / `useFeverUi`: `weeks.status === 'fever'` + KST 일요일 23:30~자정 클라이언트 창 (피드 배너·부스트 가중)
- [x] `useRankingAccessibleKst` / `isFeverCountdownWindowKst`: **실시간 랭킹 열람은 KST 일 23:30~24:00만** (탭 비활성·`/ranking` 직접 진입 시 `/feed`)
- [x] `FeverBanner`: 랭킹 버튼은 열람 가능 시에만 링크, 아니면 비활성 + 안내 문구
- [x] `useLiveRankingQuery`: 자동 폴링 없음 · `RankingPage`는 **당겨서 새로고침**만
- [x] 피버 시에도 하단 탭으로 피드·랭킹 자유 선택 (자동 리다이렉트 없음, 랭킹 탭은 위 시간대에만 클릭 가능)

## 미래 단계 (서버 · 정책 정합)

- [ ] `weeks.status`를 `fever`로 두는 시점과 **랭킹 열람 KST 창**을 운영 규칙으로 맞출지(현재는 DB fever와 무관하게 클라이언트 시각만으로 랭킹 탭 제한)
- [ ] 피드 `useIdeasInfiniteQuery` 피버 구간 10초 폴링 — 상품상 필요 시 유지/조정 검토

## Milestone 10: 주간 정산 · 결과 화면

- [x] `fetchLatestSettledWeek` / `useLatestSettledWeekQuery` — `weeks.status = settled` 최신 1건
- [x] `/result` → `ResultEntryPage`에서 최신 정산 주차로 리다이렉트 (없으면 안내 문구)
- [x] `ResultPage` — `weekly_results` + 우승 `ideas` 제목 · 상금 표시 · `full_ranking` JSON 상위 노출(있을 때)
- [x] My 「지난 주 정산 결과」→ `/result/:weekId`
- [x] DB RPC `settle_week(week_id)` — `weekly_results` 삽입, `weeks.status → settled`, 상금 60/20/20%, 가중 투표자 2명 (`011_settle_week_rpc.sql`)
- [x] `try_run_weekly_settlement_kst` — KST 월요일 **00~06시(점검 창)** 미정산 `fever|closed` 주차 1건에 `settle_week` + `refresh_live_ranking` (`012` + 패치 `013`)
- [x] Edge `weekly-settlement` — `CRON_SECRET` Bearer 시 RPC 호출 (`supabase/functions/weekly-settlement`)
- [x] Edge `weekly-settlement` — 정산 후 `enqueue_weekly_prize_payouts` + `prize_payouts` 자동 실지급 처리(실패 시 재시도 대상 유지)
- [x] 운영: pg_cron에 `try_weekly_user_reset_kst` / `try_run_weekly_settlement_kst` 등록
- [x] 주차 운영 규칙 문서 `docs/weeks-operational-rules.md` + RPC `set_week_status` / `admin_create_active_week` (`015_week_ops_admin_rpcs.sql`)
- [x] 운영 루틴: 매주 정산 후 `admin_create_active_week(...)` 또는 문서의 수동 INSERT로 다음 주 `active` 생성 — `docs/weeks-operational-rules.md` §8 + `scripts/admin-create-active-week-template.sql`

## 토스 업로드 전 로컬 한계 (메모)

- `public.users` 없이·웹만으로는 로그인·`userId`·RLS 경로가 맞지 않아 **피드가 비어 보일 수 있음**. 피드·투표·업로드 **실연동 스모크는 앱인토스에 빌드 올린 뒤** 토스 앱에서 로그인한 계정으로 확인하기로 미룸.

## Milestone 11: 폴리시 · 애니메이션 · 안정화

- [x] 투표 확정·확률 반영 등 짧은 전환/피드백 (마이크로 인터랙션)
- [x] 피드·리스트 스켈레톤 로딩 정리 (`SwipeFeed`·`RankingPage`·`IdeaDetailPage`·`MyIdeasPage`·`ResultEntryPage`)
- [x] 에러 바운더리 + 주요 플로우 실패 시 토스트 문구 일관성
- [x] TDS 버튼·타이포·여백 톤앤매너 점검 — `BrandPageHeader` + `Paragraph` 타이틀/라벨, 점검 페이지 문구(이에요)
- [x] (선택) 네트워크 실패·재시도 UX

**토스 업로드 직후 검증(스모크)**: 로그인 → `users` 행 생성 → 피드 노출 → 투표·업로드 1회 (`todo` 하단 Milestone 2 사후 검증과 겹침)

## 앱 완성 후 · 최종 검수 전 (Milestone 2 사후 검증)

- [ ] 토스 프로모션 실서버 검증: `TOSS_PROMOTION_CODE`/mTLS 시크릿 세팅 후 `weekly-settlement` 자동 지급 end-to-end 확인
- [ ] 로그인 1회 후 `users.auth_user_id`가 `auth.uid()`와 연결되는지 확인
- [ ] 복호화 키/AAD 설정 시 `users.display_name`이 복호화 반영되는지 확인
- [ ] `toss-disconnect` 콜백 후 soft delete 동작 확인
  - [ ] `toss_user_key = null`
  - [ ] `display_name = '탈퇴한 유저'`
  - [ ] `is_deleted = true`
  - [ ] `unlink_referrer` 저장 확인
- [ ] RLS 경로에서 아이디어/투표 최소 1회 성공 확인
- [ ] `cast_vote_atomic` 호출 결과(티켓 차감/가중치/확률) 확인

## Next Milestone 진행 전 메모

- [ ] **앱인토스 빌드 업로드** 후 실기기 스모크 (피드·투표·업로드 — 로컬은 유저 없으면 생략)
- [ ] `auth-token-exchange` / `toss-disconnect` 최신 배포 상태 재확인
- [ ] Edge Function Secrets 누락 없는지 재확인
