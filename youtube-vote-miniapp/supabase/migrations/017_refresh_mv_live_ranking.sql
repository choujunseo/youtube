-- 라이브 랭킹: 클라이언트는 mv_live_ranking SELECT만 (요청마다 집계하지 않음).
-- 초기 생성·이전 마이그레이션 직후 MV가 빈 스냅샷으로 남는 경우가 많아, 배포 시 1회 갱신.
--
-- 운영: 피버 구간에는 public.refresh_live_ranking()을 주기 호출하세요
-- (pg_cron, Edge, 정산 RPC try_run_weekly_settlement_kst 등 기존 경로와 병행).

REFRESH MATERIALIZED VIEW public.mv_live_ranking;
