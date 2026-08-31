# 하브루타 톡 — 가족 질문 대화 앱

바쁜 하루에도 아이와 눈을 마주치고 대화할 수 있도록, ChatGPT(OpenAI API)가 오늘 있었던 일에서
꼬리에 꼬리를 무는 하브루타 질문을 대신 만들어주는 가족용 웹 앱입니다.

## 핵심 기능

- **채팅형 인터페이스**: 가족이 오늘 있었던 일을 입력하면, AI가 그 내용을 이어받아 다음 질문을
  하나씩 만들어줍니다. 화면 상단에는 "지금 이 질문"이 큰 카드로 뜨는데, 이건 채팅을 보라는 게
  아니라 **그 질문을 함께 읽고 눈을 마주치며 이야기 나눈 뒤, 그 대화 내용을 채팅창에 기록**하라는
  용도입니다.
- **가족 연동**: 가족 코드(6자리)로 여러 기기에서 같은 가족 대화방에 참여합니다. 부모/아이 여러 명이
  같은 하루 세션에 이야기를 남길 수 있습니다.
- **나이대별 질문 층위**: 태어난 연도로 나이대(유아/어린이/초등고학년/청소년/성인)를 계산하고,
  나이대에 맞는 질문 깊이 범위 안에서 AI가 질문을 만듭니다.
- **질문 층위 점수화**: 하브루타 질문을 5단계 사다리로 분류합니다.
  1. 사실 확인 → 2. 감정 탐색 → 3. 이유 탐구 → 4. 상상·가정 → 5. 가치·적용
  대화가 이어질수록 한 단계씩 깊어지도록 유도하고, 오늘의 평균 깊이 / 누적 질문 수 /
  연속 대화 일수를 통계로 보여줍니다.
- **오늘 얘깃거리가 없을 때**: "오늘 얘깃거리가 없어요" 버튼을 누르면 AI가 무작위 그림 주제와
  그 그림으로 시작하는 첫 질문을 만들어줍니다(이미지 생성 실패 시에도 질문은 정상 진행).
- **지난 기록**: 채팅 중심 UI를 유지하면서도, 지난 날짜별 대화를 목록으로 훑어보고 다시 읽을 수
  있는 가벼운 기록 페이지를 제공합니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (가족/구성원/일별 세션/메시지) — Vercel 같은 서버리스 배포에서는
  로컬 파일(SQLite)이 재배포마다 초기화되기 때문에 Postgres를 씁니다.
- OpenAI API (`gpt-4o-mini`로 질문 생성, `gpt-image-1`로 무작위 주제 이미지 생성).
  생성된 이미지는 서버리스 환경이 디스크에 못 쓰므로 base64로 DB에 바로 저장합니다.
- 로그인은 별도 회원가입 없이 "가족 코드 + 닉네임"만으로 참여하는 경량 방식입니다
  (localStorage에 신원을 저장). 더 강한 보안이 필요하면 NextAuth 등으로 교체하세요.

## 로컬 개발

계정 가입 없이 바로 개발하려면 docker로 로컬 Postgres를 띄우세요.

```bash
npm install
cp .env.example .env
# .env 에 OPENAI_API_KEY 를 실제 키로 채워주세요 (서버에서만 사용, 브라우저에 노출되지 않음)

docker compose up -d   # 로컬 Postgres (localhost:5432, .env.example 기본값과 일치)
npm run db:push         # 스키마 반영
npm run dev              # http://localhost:3000
```

Neon/Vercel Postgres 같은 클라우드 DB를 로컬에서 바로 쓰고 싶다면, docker 없이
`.env`의 `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`만 그 DB 주소로 바꾸면 됩니다.

## 배포하기 (Vercel)

로또추첨기(260711)와 같은 방식으로, Vercel에 GitHub 저장소를 연결해서 배포합니다.
(이 코드를 만든 세션은 vercel.com에 대한 아웃바운드 접속이 막혀 있어서 CLI로 직접
배포는 못 하고, 아래 순서대로 대시보드에서 클릭 몇 번이면 끝나게 준비해뒀어요.)

1. **저장소 임포트**: [vercel.com/new](https://vercel.com/new) → `choiyeonah-hub/yeonah`
   저장소 선택 → Import. (Framework는 Next.js로 자동 인식됩니다.)
2. **Postgres 준비**: Vercel의 Storage 연동을 써도 되고(있다면), 아니면
   [neon.tech](https://neon.tech)에서 무료로 DB를 하나 만들어서 나오는
   **Connection string**을 그대로 써도 됩니다.
3. **환경변수 등록**: 프로젝트 **Settings → Environment Variables**에서 아래 세 개를
   추가합니다 (Production 체크). Neon처럼 연결 문자열이 하나뿐이면 두 값에 똑같이
   넣으면 됩니다.
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `OPENAI_API_KEY`
4. **Deploy** 클릭. **테이블은 따로 만들 필요 없습니다** — `package.json`의
   `vercel-build` 스크립트가 빌드할 때마다 `prisma db push`를 자동으로 실행해서
   스키마를 최신 상태로 맞춰줍니다(Vercel이 이 스크립트를 자동으로 감지해서 씁니다).
   이후로는 `claude/habruuta-chatgpt-app-81uq8q` 브랜치(또는 main)에 푸시할 때마다
   자동 재배포되고, 그때마다 스키마도 같이 동기화됩니다.

> 이미지 생성 기능을 쓰려면 OpenAI 계정에 `gpt-image-1` 사용 권한이 있어야 합니다.
> 권한이 없어도 앱은 죽지 않고, 그림 없이 질문만 정상적으로 생성됩니다.
>
> `vercel-build`는 `prisma db push --accept-data-loss`를 씁니다. 이후 스키마를 바꿀 때
> 컬럼을 지우거나 타입을 바꾸는 등 파괴적인 변경이 있으면 데이터가 조용히 사라질 수 있으니,
> 실제 가족 데이터가 쌓인 뒤에 스키마를 바꿀 땐 이 부분을 참고하세요.

## 폴더 구조

```
prisma/schema.prisma       # Family / Member / DaySession / Message
src/lib/depth.ts           # 질문 층위 사다리 + 나이대 계산
src/lib/openai.ts          # 꼬리질문 생성 / 무작위 이미지 주제 생성
src/app/api/*              # family, session, chat, topic, stats API
src/app/page.tsx           # 가족 만들기 / 참여하기
src/app/chat/page.tsx      # 오늘의 하브루타 채팅
src/app/history/*          # 지난 기록 목록 / 상세
```

## 참고 사항

- 이미지 생성(`gpt-image-1`)은 계정에 따라 별도 인증이 필요할 수 있습니다. 실패해도 앱은
  질문 생성까지는 계속 진행하도록 만들어져 있습니다.
- 배포 환경에서 `OPENAI_API_KEY`가 없거나 OpenAI 도메인에 대한 아웃바운드 네트워크가 막혀 있으면,
  사용자의 답변은 정상 저장되고 질문 생성 단계에서만 안내 메시지가 표시됩니다.

## 🐜 개미집 탐험대 (보너스 게임) — `/ant`

작은 사람이 되어 땅속 개미집을 탐험하는 2D 사이드뷰 게임입니다. 서버·DB 없이
브라우저 캔버스에서만 돌아가며, 접속할 때마다 개미집이 새로 만들어집니다.

- **목표**: 굴을 따라 내려가 먹이 부스러기를 모으고, 가장 깊은 곳의 여왕개미에게 바치기
- **조작**: 이동 `←` `→` (A/D) · 점프 `Space` · 벽 타고 오르내리기 `↑` `↓` (벽에 붙은 채)
  · 흙 파기 `J` (방향키와 같이 누르면 위/아래로) · 다시 시작 `R` · 모바일은 화면 아래 버튼
- **규칙**: 흙과 모래는 파낼 수 있지만 돌은 못 판다. 붉은 병정개미는 시야에 들어오면
  쫓아오지만 자기 방에서 멀어지면 포기한다. 빛이끼는 랜턴을, 이슬은 체력을 채워 준다.
- **구현**: `src/app/ant/page.tsx`(화면·조작), `src/lib/ant/world.ts`(개미집 생성),
  `src/lib/ant/game.ts`(물리·AI·렌더), `src/lib/ant/audio.ts`(효과음 합성)

개미집은 생성 직후 시작 지점에서 도달 가능한 칸을 전부 훑어서, 닿을 수 없는 아이템을
버리고 목표 개수를 정하기 때문에 항상 클리어할 수 있습니다.
