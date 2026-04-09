# 아이디어리그 미니앱 — 제품·기능 명세 (Opus / 재설계용)

이 문서는 **현재 레포 구현을 기준**으로 정리했으며, DB·Edge·프론트를 다시 짤 때 **기능 동등성**과 **정책**을 맞추기 위한 입력 자료다.  
코드 경로는 `youtube-vote-miniapp/` 기준.

---

## 0. 표(투표) 정책 — **600표 단일 기준 (1500표 폐지)**

| 항목 | 방향 |
|------|------|
| **졸업 / 피드 제외 / 보상 트리거** | 모두 **`total_vote_count` ≥ 600** 기준으로 통일한다. |
| **1500표** | 더 이상 사용하지 않는다. (기존 마이그레이션·RPC·`payout_logs.reason`·프론트 조건에서 제거 대상) |
| **피드** | RPC·쿼리에서 「졸업(노출 제외)」아이디어는 **600표 이상**으로 판단한다. |
| **명예의 전당** | 이미 600 기준으로 목록을 만든다. 동일 규칙 유지. |
| **페이아웃·워커** | 마일스톤/랭크 보상 로직이 1500 계열 reason을 쓰고 있다면 **600 졸업 모델**에 맞게 reason·트리거를 재정의한다. |

> 구현 시: 레포 전체에서 `1500` 문자열 검색 후 제거·대체한다.

---

## 1. 스택·제약

- React 18 + Vite + TypeScript + Tailwind + React Query + Zustand + React Router v6  
- Supabase (Postgres + Auth + Edge Functions)  
- 토스 미니앱 WebView: `@apps-in-toss/web-framework`, `@toss/tds-mobile`  
- **외부 링크·`window.open`** 등 금지 (앱 내 라우팅만)

---

## 2. 인증·세션

- Supabase **익명 로그인** 후 `auth-token-exchange` Edge에서 토스 `appLogin` 인가코드 교환.
- Zustand **persist** (`idea-league-auth-v1`): 로그인 여부, 유저, 토스 액세스 토큰 등.
- **`/` 웰컴**
  - persist hydration 전에는 「다음」 비활성(로딩).
  - 「다음」→ `login('interactive')` → 토스 로그인 시트 → 성공 시 **닉네임 없으면 모달**(1~20자, 비속어 필터) → `/feed`.
  - 이미 로그인 + 유효 `user.id`면 시트 없이 닉네임 확인 후 피드.
- **`VITE_IS_MOCK=true`**: 웰컴에서 로그인 생략 후 `/feed`.
- **`VITE_USE_MOCK_APP_LOGIN` / 목 로그인**: 실제 토스 시트 없이 가짜 인가코드.
- 웰컴이 아닌 경로: **자동 `login('auto')`** 1회 시도.
- 로그인 직후 **`claim_attendance_ticket`** RPC (실패해도 로그인 유지).

---

## 3. 내비게이션

- 하단 탭: **피드** `/feed`, **명예의 전당** `/hall-of-fame`, **업로드** `/upload`, **My** `/my`.
- `/`, `/idea/:id` 에서 하단 탭 숨김.
- `/ranking` → `/hall-of-fame` 리다이렉트.

---

## 4. 피드 `/feed`

- 헤더: 「이번주 아이디어리그」.
- **`fetch_feed_ideas_page`** 무한 스크롤 (페이지 10, offset).
- **비로그인**: `localStorage` 고정 UUID(`guest_feed_v1`)로 동일 RPC 호출 (DB에 게스트 행 없어도 됨).
- **졸업(피드 제외)**: **600표 이상** 아이디어는 피드 후보에서 제외 (정책 §0).
- 클라이언트 **재정렬**: 부스트 가중·최신성·지터·부스트 연속 노출 캡 (`VITE_FEED_*` 등).
- 카드: 제목·설명·크리에이터 표시명·태그·BOOST 뱃지·**투표수 숫자 비노출**·0표·미투표 시 「최초 발굴」·투표 완료 시 버튼 비활성.
- 「투표하기」→ **`/idea/:id`** (피드에서 직접 RPC 투표 아님).
- **신고**: 모달 → `reports` insert, `reasonCode` = `OTHER` + 상세, 비로그인 reporter 허용(서버 RLS와 일치 필요).
- 로그인 유저: 뷰포트 기준 **`idea_impressions`** 배치 기록.
- **Pull-to-refresh**.

---

## 5. 아이디어 상세 `/idea/:id`

- `ideas` 단건 + 해당 아이디어에 대한 내 `votes` 여부.
- 확률 게이지: `weighted_share` / `total_weighted_shares`.
- 티켓: 무료 + 광고 티켓 합산 표시.
- **`cast_vote_atomic`**: 낙관적 티켓 차감, 실패 시 롤백. 성공 시 `markIdeaImpressionAsVote`.
- 에러 코드 UX: `ALREADY_VOTED`, `NO_TICKETS`, `NO_ACTIVE_WEEK`, `IDEA_NOT_IN_CURRENT_WEEK`, `USER_NOT_FOUND`, `FORBIDDEN` 등.
- 티켓 없음 모달 → 리워드 광고 → **`reward_ticket_recharge`**.

---

## 6. 업로드 `/upload`

- **KST 기준 하루 최대 2회** 업로드.
- 제목 ≤50자, 설명 ≤100자, 태그 1~4개·태그당 ≤16자, 중복 불가.
- 클라이언트 **비속어** 차단.
- **로컬 초안** (유저 + KST 일자 스코프).
- **리워드 광고 시청 완료 후** `ideas` insert → `patchUserAfterIdeaUpload` → 성공 시 `/my/ideas`.
- 닉네임 없으면 업로드 불가.
- (스키마상 썸네일 필드 가능하나 현재 폼은 텍스트 중심.)

---

## 7. 명예의 전당 `/hall-of-fame`

- **600표 이상** 아이디어 목록 + `payout_logs` 등으로 **첫 표 유저** 매핑 + 표시명.
- 피드와 동일 **신고** 흐름.
- 진입 시 **전면 광고 게이트**(지원 기기): `localStorage` **3시간 쿨다운**.
- Pull-to-refresh.

---

## 8. My `/my`

- 보유 티켓, 활성 부스트 개수(내 아이디어 기준).
- 메뉴: 내 투표 / 내 아이디어 / 광고 티켓 / 광고 부스트 / 공유 리워드 / 설명서 / 알림.
- 광고 티켓: **`reward_ticket_recharge`**.
- 광고 부스트: 대상 아이디어 **`activateIdeaBoost`** + `ad_logs`.
- 공유: **`contactsViral`** + **`reward_share_viral_ticket`** (`VITE_CONTACTS_VIRAL_MODULE_ID`).

---

## 9. My 하위

| 경로 | 기능 |
|------|------|
| `/my/ideas` | 내 아이디어 전체, 태그·BOOST·투표수 표시, BoostButton. `VITE_MY_TABS_PREVIEW` 시 목 UI. |
| `/my/votes` | 투표 목록·아이디어·KST 요일 라벨·당첨 확률. 비로그인 안내. |
| `/my/reward-tickets` | 보유 티켓, 주간 무료 10장 문구, AdRewardButton. |
| `/my/guide` | 사용 설명서. |
| `/my/notifications` | `user_notifications` 목록·읽음·`idea_id` 링크. 프리뷰 모드 지원. |

---

## 10. 티켓·표시 정책 (요약)

- `free_tickets`, `ad_tickets`, `ticket_reset_at` (주간 리셋 표시용).
- 표시용 문구: 주간 무료 **10장** (`FREE_WEEKLY_VOTE_TICKETS`).
- **졸업·피드·보상: 600표 단일 기준** (§0).

---

## 11. 프론트가 호출하는 RPC (이름·의미 유지 권장)

| RPC | 역할 |
|-----|------|
| `fetch_feed_ideas_page` | 피드 페이지 (졸업 제외 = **600 미만**) |
| `cast_vote_atomic` | 투표 1건·티켓·집계·(졸업 시) 보상 큐 등 |
| `claim_attendance_ticket` | 출석/웰컴 티켓 |
| `reward_share_viral_ticket` | 공유 리워드 티켓 |
| `reward_ticket_recharge` | 광고 후 티켓 (`p_ad_group_id`, `p_reward_amount`) |

파라미터·반환 JSON은 기존 `src/services/` 및 마이그레이션을 참고해 재정의한다.

---

## 12. 주요 테이블·뷰 (개념)

- `users` (토스 키, 닉네임, 티켓, 업로드 카운트, `auth_user_id`, soft delete 등)
- `ideas` (태그, 부스트, **total_vote_count**, 졸업은 **600+** 로 판단)
- `votes`, `idea_impressions`, `reports`, `ad_logs`
- `payout_logs` (보상 큐; **600 졸업**에 맞는 `reason` 집합으로 재설계)
- `user_notifications`
- (선택) `mv_live_ranking` 등 랭킹 스냅샷 — 제품에 남기면 유지

---

## 13. Edge Functions

| 함수 | 역할 |
|------|------|
| `auth-token-exchange` | 토스 OAuth·`users` upsert·`auth_user_id` 연결·이름 복호화(키 있을 때) |
| `toss-disconnect` | 연결 끊기 웹훅 (GET/POST, Basic) |
| `payout-worker` | `payout_logs` 처리·토스 API·알림 적재 (**600 정책**에 맞게 reason/트리거 정리) |

---

## 14. 환경 변수 (이름 체계 유지 권장)

- 클라이언트: `VITE_SUPABASE_*`, 광고 그룹 `VITE_AD_GROUP_UPLOAD`, `VITE_AD_GROUP_BOOST`, `VITE_AD_GROUP_VOTE_TICKET`, `VITE_AD_GROUP_HALL_OF_FAME_GATE`, `VITE_CONTACTS_VIRAL_MODULE_ID`, `VITE_IS_MOCK`, `VITE_USE_MOCK_APP_LOGIN`, `VITE_MY_TABS_PREVIEW`, `VITE_FEED_*`, `VITE_BOOST_DURATION_MINUTES`, 프로모션 `VITE_PROMOTION_CODE_CREATOR` / `VITE_PROMOTION_CODE_VOTER` / `VITE_PROMOTION_CODE_FIRST_VOTE` (`.env.example` 참고)
- Edge Secret: `TOSS_CLIENT_ID`, `TOSS_CLI_SECRET`, `TOSS_MTLS_CERT_PEM`/`TOSS_MTLS_KEY_PEM` 또는 `*_B64`, `TOSS_PARTNER_REQUIRE_MTLS`, `TOSS_USER_INFO_*`, `TOSS_WEBHOOK_*`, `SUPABASE_SERVICE_ROLE_KEY` 등 (`supabase/.edge-secrets.source.env.example` 참고)

---

## 15. Opus에게 시킬 때 한 줄 요약

> **기능은 본 문서와 동일하게 유지하고, DB·RPC·RLS는 새로 짠다. Secret·`VITE_*` **이름**은 유지한다. **표 관련 임계값은 600표만 쓰고 1500표는 전면 제거한다.**

---

## 16. 작업 후 스모크 체크 (수동)

1. 웰컴 → 로그인 → 닉네임 → 피드  
2. 비로그인 피드 노출  
3. 상세 투표·티켓 없음 광고  
4. 업로드 2회 캡·광고 후 등록  
5. 600표 이상 아이디어가 피드에 안 나옴  
6. 명예의 전당 600+ 목록·신고·게이트 광고  
7. My 티켓/부스트/공유/알림  
8. Edge 로그인·연결 끊기·페이아웃(스테이징)
