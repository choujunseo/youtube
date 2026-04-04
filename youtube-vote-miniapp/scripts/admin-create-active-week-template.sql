-- Deprecated: `public.weeks` 및 주차 기반 정산은 마이그레이션 027 이후 제거되었습니다.
-- 운영 주차 생성 RPC(`admin_create_active_week`)는 더 이상 존재하지 않습니다.
--
-- 마일스톤(1,500표) 모델에서는 별도 "활성 주" 생성이 필요 없습니다.
-- 로컬/스테이징 데이터가 필요하면 `scripts/seed-feed-test-ideas.sql` 를 사용하세요.

SELECT 1 AS note;
