# UI 유지 + Supabase 그린필드 — 베껴갈 파일 & Opus용 프롬프트

## 1) UI·UX만 가져갈 때 복사 우선 디렉터리

| 경로 | 비고 |
|------|------|
| `src/pages/*.tsx` | 화면 전부. 이후 데이터 소스만 갈아끼우면 됨 |
| `src/components/**` | 공통·피드·투표·랭킹·마이·광고·리포트 등 UI 조각 |
| `src/styles/**`, `src/index.css`, `src/App.css` | 글로벌 스타일·미니앱 UX 규칙(스크롤/선택 등) |
| `src/App.tsx` | 라우트·레이아웃 골격 유지 |
| `src/main.tsx` | 엔트리 |
| `public/**` | 파비콘·아이콘 등 정적 자산 |
| `index.html` | 필요 시 `lang`/타이틀만 조정 |
| `tailwind.config.*`, `postcss.config.*` | 있다면 함께 |
| `granite.config.ts` | 앱인토스 Web 빌드/dev 설정 |
| `vite.config.ts` | `@` alias 등 |

## 2) 토스·미니앱 브릿지 (UI와 같이 유지 권장)

| 경로 | 비고 |
|------|------|
| `src/utils/tossBridge.ts` | SDK 래핑·목 분기 |
| `src/mocks/tossSdkMock.ts` | 로컬/목용 |

## 3) 데이터·백엔드에 묶인 코드 — **그린필드 시 교체·재작성 대상**

아래는 **UI를 살리되** 새 Supabase 스키마·API 계약에 맞게 **새로 짜거나 얇은 어댑터로 통째 교체**하는 편이 안전하다.

- `src/services/*` (supabase 직접 호출·RPC 이름·테이블 컬럼 하드코딩)
- `src/hooks/queries/**`, `src/hooks/useAuth.ts`, `src/hooks/useVote.ts`, `src/hooks/useTickets.ts`, `src/hooks/useRewardedAd.ts`, `src/hooks/feed/**`
- `src/lib/supabaseMappers.ts`, `src/lib/queryKeys.ts`, `src/lib/queryClient.ts`
- `src/types/*` (DB 스키마와 1:1인 타입은 새 스키마에 맞게 재정의)
- `src/store/authStore.ts` (필드는 유지 가능하나 persist 스키마·토큰 처리는 새 백엔드에 맞출 것)
- `supabase/**` 전부 (마이그레이션·Edge Functions·config — **새 프로젝트에서 새로 작성**)
- `.env` / `VITE_*` — 새 프로젝트 URL·키로 교체

## 4) 순수(또는 거의 순수) 로직 — UI와 함께 옮겨도 되는 것

제품 규칙이 바뀌지 않으면 그대로 두고, 바뀌면 수치만 조정.

- `src/lib/profanityCheck.ts`, `src/lib/uploadLimits.ts`, `src/lib/ideaDisplayTags.ts`, `src/lib/ideaCategoryLabel.ts`
- `src/lib/formatBoostRemaining.ts`, `src/lib/boostConfig.ts`, `src/lib/boostActive.ts`, `src/lib/feedExposureConfig.ts`, `src/lib/feverWindowKst.ts`, `src/lib/maintenanceWindowKst.ts`
- `src/lib/ideaVoteProbability.ts`, `src/lib/voteTicketPolicy.ts`, `src/lib/rankingRowToIdea.ts` *(새 API 응답 형태에 맞게 시그니처만 조정 가능)*
- `src/lib/openEventStorage.ts`, `src/lib/uploadDraftStorage.ts`, `src/lib/guestFeedSession.ts`

---

## 5) Opus에게 그대로 붙여 넣을 프롬프트

아래 블록 전체를 복사해 Opus(또는 기획용 LLM)에 전달하면 된다.

```
역할: 시니어 풀스택 아키텍트. 목표는 **토스 미니앱(WebView) UI/UX는 현재 레포와 동일하게 유지**하되, **Supabase는 완전히 새 프로젝트**로 파고 **DB·RLS·RPC/Edge·클라이언트 데이터 계층을 처음부터 다시 설계**하는 것이다.

## 입력 문서 (반드시 읽고 계획에 반영)
- 동일 레포의 `docs/PRODUCT_SPEC_FOR_OPUS.md` — 제품 정책·화면 플로·600표 마일스톤 등
- 동일 레포의 `docs/OPUS_UI_PRESERVE_AND_GREENFIELD_PROMPT.md` — UI로 남길 경로 vs 교체할 경로

## 하드 제약 (위반 금지)
- React 18 + Vite + TS + Tailwind + React Query + Zustand + React Router v6 유지
- `@apps-in-toss/web-framework`, `@toss/tds-mobile` 유지
- 미니앱: 외부 도메인으로 `window.open` / `location.href` 등 금지, 라우팅은 앱 내부만
- 모바일 퍼스트, 기존 화면 구조·컴포넌트 분해를 최대한 보존 (복사 우선 목록 참고)

## 기술 방향
1) **새 Supabase 프로젝트** 생성 가정. 기존 `supabase/migrations`는 참고만 하고, **한 벌의 baseline 마이그레이션**으로 재작성할 계획을 세운다.
2) **Edge Functions**: 토스 OAuth/mTLS·토큰 교환·(필요 시) 워커·웹훅을 새 프로젝트 시크릿 체계에 맞게 정의한다.
3) **프론트**: `src/pages`, `src/components`, `src/styles`, `tossBridge` 등 UI 셸은 유지하고, `src/services`·`hooks/queries`·`useAuth`는 **새 API 계약**에 맞는 얇은 레이어로 교체하는 단계를 쪼갠다.
4) **인증**: 익명 Supabase 세션 + 토스 `appLogin` → Edge 교환 패턴을 유지할지, 대안(예: PKCE-only)을 제시할지 비교해 **한 가지**를 추천하고 근거를 적는다.

## 산출물 (너의 답변에 포함할 것)
A. **페이즈별 실행 계획** (예: P0 스키마+RLS, P1 RPC/Edge, P2 프론트 어댑터, P3 시드/운영)
B. **새 ERD 요약** (핵심 테이블·FK·인덱스 후보)
C. **RLS 정책 원칙** (users/ideas/votes/payouts/notifications 등 역할별)
D. **프론트 교체 체크리스트** (파일 단위: 유지 / 수정 / 삭제)
E. **리스크·오픈 퀘스션** (토스 콘솔 referrer, mTLS, promotion API, 광고 SDK 등 외부 의존)
F. **마이그레이션 네이밍/CLI 이슈** (한 파일 다문장 prepared statement 문제 등, 과거 레슨 반영)

코드는 이번 턴에서 작성하지 말고, **설계와 작업 순서**만 구체적으로 작성해라.
```

---

## 6) 사람이 할 일 (요약)

1. 위 **복사 우선 목록**대로 새 Vite 프로젝트(또는 브랜치)에 UI 파일 옮김  
2. Opus 계획 확정 후 **새 Supabase**에 마이그레이션·Edge 배포  
3. `src/services` + React Query 훅을 새 계약에 맞게 연결  
4. `.env` / Edge secrets를 **새 프로젝트 ref**로만 채우기 (구 프로젝트 키 혼용 금지)
