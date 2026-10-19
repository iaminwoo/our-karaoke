# 뭐 부를까?

부부가 함께 사용하는 개인용 노래방 레퍼토리 관리 웹앱입니다.

## 시작하기

1. `.env.example`을 참고해 `.env.local`에 Supabase 공개 연결 정보를 입력합니다.
2. 개발 서버를 시작합니다.

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 환경변수

`NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용합니다.
Service Role Key 및 Secret Key는 이 프로젝트에 넣거나 브라우저에 노출하지 않습니다.

Supabase 정보가 없는 상태에서도 앱은 실행됩니다. 이때 환경변수 설정 안내 화면을 표시합니다.

## 검사 및 빌드

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Supabase 마이그레이션

`supabase/migrations/20261018000000_create_karaoke_songs.sql`은 검토용 파일입니다.
공유 Supabase 프로젝트에 자동 실행하지 않으며, 실행 전 SQL Editor에서
`public.karaoke_songs` 테이블이 없는지 확인해야 합니다.

