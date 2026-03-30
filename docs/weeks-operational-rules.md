# 주차(`weeks`) 운영 규칙

앱·정산·피드가 모두 **`weeks.status`** 와 시각 필드에 의존합니다. 아래 순서를 기본으로 합니다.

---

## 1. 상태 값

| `status` | 의미 (권장) |
|----------|-------------|
| `active` | 현재 진행 주차. 투표·업로드·피드의 “이번 주”. |
| `fever` | 주간 마감 직전 구간(운영에서 플래그). 정산 RPC는 `fever` 또는 `closed` 주만 대상. |
| `closed` | 투표 종료 후, 정산 전(또는 fever 대신 closed만 써도 됨). |
| `settled` | `settle_week` / `try_run_weekly_settlement_kst` 처리 완료. `weekly_results` 있음. |

**`settled`는 반드시 정산 RPC로만 두는 것을 권장합니다.** 수동으로 `settled`로 바꾸면 `weekly_results`와 불일치할 수 있습니다.

---

## 2. 한 주의 권장 타임라인 (KST 기준)

1. **월~토(또는 일 초반)**  
   - 진행 주 1건: `status = 'active'`.  
   - `fetchActiveWeek` / `mv_live_ranking` 은 `active` 또는 `fever` 주 1건을 봅니다.

2. **일요일 23:30 ~ 자정 (피버 타임)**  
   - **앱:** 실시간 랭킹 탭 열림, 피드 배너 등(클라이언트 KST).  
   - **DB(선택):** `active` → `fever` 로 바꿔 운영상 “마감 구간”을 표시할 수 있음.  
   - 랭킹 탭은 DB `fever`와 무관하게 **클라이언트 시각**으로도 제한됨.

3. **월요일 00:00 ~ 06:00 (점검)**  
   - **앱:** `MaintenancePage` 전역.  
   - **cron:**  
     - `try_weekly_user_reset_kst()` — 업로드 카운트 0, 무료 티켓 +10.  
     - `try_run_weekly_settlement_kst()` — 미정산 `fever|closed` 주 1건 정산 → `settled`.  
   - 정산 전에 해당 주가 **`fever` 또는 `closed`** 이고 **`ideas`가 있어야** 함.

4. **월요일 06:00 이후**  
   - 앱 정상 노출.  
   - **다음 주차**를 위해 새 `weeks` 행을 **`active`** 로 추가 (아래 RPC 또는 수동 SQL).

---

## 3. 정산 전 체크리스트

- [ ] 정산 대상 주: `status IN ('fever','closed')`
- [ ] 동일 `week_id`에 `weekly_results` 없음
- [ ] 해당 주에 아이디어(및 필요 시 투표) 존재
- [ ] `prize_pool` 등 비즈니스 값 확인

---

## 4. SQL / RPC (권장)

### 4.1 상태만 변경 (정산 제외)

`set_week_status(week_id, 'fever' | 'closed' | 'active')` — `service_role` / SQL Editor에서 실행.

- `settled` 는 이 RPC에서 **막음** → 정산 파이프라인 사용.

### 4.2 다음 주 `active` 생성

`admin_create_active_week(year, week_number, start_at, end_at, fever_start_at, prize_pool)`  
- **동시에 `active`/`fever` 인 다른 주가 있으면 실패** (한 주만 진행).

수동 INSERT 예시는 아래 “수동 SQL” 참고.

---

## 5. 수동 SQL 예시 (참고)

```sql
-- 예: 2026년 ISO 13주차 (값은 실제 캘린더에 맞게 수정)
INSERT INTO public.weeks (
  year, week_number, start_at, end_at, fever_start_at, status, prize_pool
) VALUES (
  2026,
  13,
  '2026-03-30T00:00:00+09:00'::timestamptz,
  '2026-04-05T23:59:59+09:00'::timestamptz,
  '2026-04-05T23:30:00+09:00'::timestamptz,
  'active',
  1000000
);
```

`fever_start_at` 은 해당 주 일요일 23:30 KST 등으로 맞춤.

---

## 6. 자주 나는 이슈

| 증상 | 점검 |
|------|------|
| 피드/랭킹 비어 있음 | `active`/`fever` 주 1건 있는지, `mv_live_ranking` 갱신 여부 |
| 정산 안 됨 | 주가 `fever`/`closed` 인지, 이미 `weekly_results` 있는지, 점검 시간(KST 월 0~6)에 cron 도는지 |
| 정산 후에도 앱이 죽음 | **새 `active` 주** INSERT 했는지 |

---

## 7. 마이그레이션

- `015_week_ops_admin_rpcs.sql` — `set_week_status`, `admin_create_active_week`

---

## 8. 매주 운영 루틴 (정산 후 다음 주 `active`)

**언제:** KST 월요일 점검 구간(00:00~06:00) 안에 `try_run_weekly_settlement_kst` 가 돌고, 해당 주가 `settled` 로 바뀐 **이후**. 앱이 06:00 이후에도 피드·업로드를 쓰려면 **반드시** 새 진행 주 1건이 `active`(또는 운영 정책상 `fever` 전 단계)여야 합니다.

### 8.1 실행 전 확인 (SQL Editor)

```sql
-- 진행 중인 주가 없어야 admin_create_active_week 가 성공함
SELECT id, year, week_number, status, start_at
FROM public.weeks
WHERE status IN ('active', 'fever')
ORDER BY start_at DESC;

-- 방금 정산된 주(참고)
SELECT id, year, week_number, status
FROM public.weeks
WHERE status = 'settled'
ORDER BY end_at DESC
LIMIT 3;
```

`active`/`fever` 가 남아 있으면 먼저 `set_week_status(해당_id, 'closed')` 등으로 정리하거나, 운영 정책에 맞게 한 주만 남기세요.

### 8.2 RPC로 다음 주 생성 (권장)

`service_role` 또는 Dashboard SQL(소유자 권한)에서:

```sql
SELECT public.admin_create_active_week(
  p_year := 2026,                    -- ISO 연도 (실제 값으로 변경)
  p_week_number := 14,             -- ISO 주차 (실제 값으로 변경)
  p_start_at := '2026-04-06T00:00:00+09:00'::timestamptz,   -- 해당 주 월요일 00:00 KST
  p_end_at := '2026-04-12T23:59:59+09:00'::timestamptz,     -- 일요일 자정 직전 등 운영 정의에 맞게
  p_fever_start_at := '2026-04-12T23:30:00+09:00'::timestamptz,  -- 일요일 23:30 KST
  p_prize_pool := 1000000
);
```

- 반환 JSON `applied: true` 이면 성공.  
- `ALREADY_HAS_ACTIVE_OR_FEVER` 이면 8.1 에서 진행 주를 먼저 정리.  
- `DUPLICATE_YEAR_WEEK` 이면 `(year, week_number)` 가 이미 있음 → 날짜/주차 재확인.

템플릿만 복사할 파일: `youtube-vote-miniapp/scripts/admin-create-active-week-template.sql`

### 8.3 수동 INSERT (RPC 대신)

섹션 **5. 수동 SQL 예시** 와 동일. 단, INSERT 전에도 **8.1** 처럼 `active`/`fever` 중복이 없어야 앱이 한 주만 바라봅니다.

### 8.4 실패 시 앱 증상

- 새 주가 없으면 `fetchActiveWeek` 가 `null` → 피드·업로드·내 아이디어 등이 “진행 주 없음” 처리될 수 있음.
