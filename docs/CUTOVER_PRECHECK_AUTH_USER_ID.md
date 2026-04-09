# `auth_user_id` 컷오버 전 사전 체크 (Supabase SQL)

배포 전 대시보드 SQL Editor에서 실행:

```sql
-- 1. toss_user_key 가 NULL 인 행 (연결 해제·탈퇴 등)
SELECT
  COUNT(*) AS null_toss_count
FROM
  public.users
WHERE
  toss_user_key IS NULL;

-- 2. soft-delete 행 수
SELECT
  COUNT(*) AS deleted_count
FROM
  public.users
WHERE
  is_deleted = TRUE;

-- 3. toss_user_key 중복 (있으면 마이그레이션 전 데이터 정리 필요)
SELECT
  toss_user_key,
  COUNT(*) AS n
FROM
  public.users
WHERE
  toss_user_key IS NOT NULL
GROUP BY
  toss_user_key
HAVING
  COUNT(*) > 1;
```

## 컷오버 순서

1. `supabase db push` (또는 해당 마이그레이션만 원격 적용)
2. Edge: `auth-token-exchange`, `toss-revoke-access` 배포 (`_shared` 미변경 시에도 규칙에 맞춰 필요 시 `toss-disconnect`, `payout-worker` 재배포)
3. 앱(프론트) 배포

## 롤백 요약

- 마이그레이션: `auth_user_id` 컬럼·인덱스·`current_user_id`·교체된 RLS/함수 역방향 복구(백업 권장)
- Edge만 이전 바이너리로 되돌리는 것으로 일부 증상 완화 가능하나, DB가 새 RLS면 클라이언트와 맞아야 함
