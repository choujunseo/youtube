# idea-league-ui-shell

`youtube-vote-miniapp`에서 **UI·프론트 전체**를 복사한 뒤, **그린필드 Supabase** 스키마·RPC·Edge Function 템플릿을 추가한 작업 폴더다.

## 포함된 것

- `src/` — 페이지·컴포넌트·훅·서비스·타입 (`user_id`·600표 졸업·`week_weight_total_for_idea` 등 새 DB 계약에 맞춤)
- `supabase/migrations/` — 베이스라인 스키마 + RLS + RPC
- `supabase/functions/` — `auth-token-exchange`, `toss-disconnect`, `payout-worker` (스텁)
- `public/`, `index.html`, Vite·Tailwind·ESLint·TS·Granite 설정
- `docs/PRODUCT_SPEC_FOR_OPUS.md`, `docs/OPUS_UI_PRESERVE_AND_GREENFIELD_PROMPT.md`
- `.env.example`, `supabase/.edge-secrets.source.env.example`, `.gitignore`

## 복사하지 않은 것 (선택)

- `node_modules/`, `dist/`, `certs/`, `scripts/`, `.env`, `supabase/.edge-secrets.source.env`

## 시작

```bash
cd idea-league-ui-shell
npm ci
cp .env.example .env
# .env 에 새 Supabase 프로젝트 URL/anon key 등 채운 뒤
npm run dev
```

## Supabase

1. [Supabase CLI](https://supabase.com/docs/guides/cli)로 프로젝트 생성·링크: `supabase link`
2. 로컬: `npm run db:start` 후 `npm run db:reset` (마이그레이션 적용)
3. 원격: `supabase db push` 또는 대시보드 SQL
4. **Authentication → Providers → Anonymous** 활성화
5. Edge: `supabase/.edge-secrets.source.env.example` 를 복사해 값 채운 뒤 `npm run secrets:edge`, 이후 `supabase functions deploy auth-token-exchange` 등

## 다음 단계

- Toss 콘솔·파트너 API(mTLS 등)에 맞춰 `auth-token-exchange` 의 인증 헤더·엔드포인트 검증
- `payout-worker` 에 실제 토스 프로모션/지급 API 연동
- 원본 레포는 그대로 두었고, 여기는 **복사본 + 백엔드 스캐폴딩**이다.
