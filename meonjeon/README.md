# 먼저ON — 배포용 패키지

> 생각나는 건 말하세요. 생각나지 않는 건 먼저 챙길게요.

```
index.html            앱 전체 (React + Tailwind + Supabase)
api/classify.js       AI 호출 서버 함수 (Anthropic 키는 여기서만 / 사진도 여기로)
api/config.js         Supabase 공개 설정 전달
api/weather.js        휴일 날씨 브리핑 (Open-Meteo, 키 없음)
supabase-schema.sql   DB 테이블·보안정책·베타지표 뷰
manifest.json         홈 화면 추가용
DECISIONS.md          베타 규모·개인정보·제휴 표기에 대한 결정과 근거
```

---

## 1단계 · Supabase 만들기 (15분)

1. **supabase.com** 가입 → New Project
   - 이름 `meonjeon` / 리전 **Northeast Asia (Seoul)** / DB 비밀번호는 따로 적어두기
2. 좌측 **SQL Editor** → New query → `supabase-schema.sql` 내용을 통째로 붙여넣고 **Run**
   - `Success. No rows returned`가 나오면 정상
3. **Authentication → Providers → Email**
   - Enable Email 켜기
   - **Confirm email 켜기**, Secure email change는 그대로
4. **Authentication → URL Configuration**
   - Site URL에 배포 주소를 넣습니다 (예: `https://meonjeon.vercel.app`)
   - Redirect URLs에도 같은 주소 추가
   - ⚠️ 이걸 안 하면 메일 링크를 눌러도 로그인이 안 됩니다
5. **Project Settings → API**에서 두 값 복사
   - `Project URL`
   - `anon public` 키

> anon 키는 브라우저에 노출돼도 되는 공개 키입니다. 실제 보호는 3단계에서 만든 RLS 정책이 합니다.

## 2단계 · Anthropic 키 (5분)

**console.anthropic.com** 가입 → 결제수단 등록 → API Keys → Create Key
베타 2주는 몇 달러면 충분합니다.

## 3단계 · Vercel 배포 (10분)

1. **vercel.com** 가입 → Add New → Project → 이 폴더를 통째로 드래그
   - 또는 폴더에서 `npx vercel`
2. Settings → **Environment Variables**에 3개 추가 (Production/Preview/Development 모두 체크)

| 이름 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic 키 |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public 키 |

3. Deployments → 최신 배포 → **Redeploy** (환경변수는 재배포해야 적용됩니다)
4. 배포 주소가 나오면 **1단계 4번의 Site URL을 그 주소로 수정**

---

## 가족 공유는 이렇게 작동합니다

1. 아내가 배포 주소 접속 → 이메일 입력 → 메일의 링크 클릭 → 로그인
2. 온보딩을 마치면 가구가 하나 생기고, 화면 위에 **초대코드**가 뜹니다
3. **가족 초대 링크 복사** 버튼 → 남편에게 카톡으로 전송
4. 남편이 그 링크로 자기 이메일 로그인 → **같은 집에 들어옴**
5. 한쪽이 할 일을 담으면 다른 쪽 화면에 "가족이 방금 업데이트했어요"가 뜹니다

## 베타 지표 보는 곳

Supabase → **Table Editor → beta_metrics** 뷰
가구코드 · 구성원수 · 할일수 · 완료수 · AI가먼저꺼낸일 · 사용이벤트 · 마지막사용

SQL Editor에서 이렇게도 볼 수 있어요.
```sql
select * from beta_metrics order by 마지막사용 desc;
```

2주 뒤 이 표가 발표 자료의 핵심 숫자가 됩니다.

---

## 알아둘 한계

- **동시 편집은 마지막 저장이 이깁니다.** 부부가 같은 순간에 다른 걸 고치면 하나가 덮일 수 있어요. 15가구 베타에서는 거의 문제가 안 되지만, 정식 서비스에서는 항목 단위 테이블로 나눠야 합니다.
- **닫힌 앱을 깨우는 푸시 알림이 없습니다.** 설정에서 브라우저 알림을 켤 수 있지만, 그건 앱이 열려 있을 때만 뜹니다. 진짜 푸시(Web Push + VAPID + 서비스워커 + 스케줄러)는 베타 다음 단계입니다.
- **공휴일은 손으로 넣어둔 표입니다** (`HOLIDAYS`, 2026·2027). 매년 12월에 다음 해를 한 줄 추가하세요.
- **날씨는 Open-Meteo**를 씁니다. 키가 필요 없고 소규모는 무료지만, 상업 규모가 되면 유료 요금제나 기상청 API로 바꿔야 합니다.
- 로그인 메일이 스팸함으로 갈 수 있습니다. 참가자에게 미리 안내하세요.

## 이번 판에서 새로 들어간 것

| 무엇 | 어디서 보나 |
|---|---|
| 휴일 날씨 브리핑 (연휴면 앞당겨 뜸) | 오늘 화면 · 쉬는 날 전날부터 |
| 주유·엔진오일 시점 계산 | 설정 → 자동차 숫자 → 오늘 화면 CAR 카드 |
| 이사 짐싸기 날짜별 계획 | 설정에서 ‘이사 예정’ 켜면 오늘 화면 MOVING 카드 |
| 알림장·냉장고 사진 스캔 | 말하기 → 📄 / 🧊 버튼 |
| 냉장고 재고·식단은 잘하는 앱으로 연결 | 식단·냉장고 관련 할 일 밑 링크 카드 |
| 기본 분담 · 내 몫만 보기 | 설정 → 기본 분담 / 오늘 화면 위 전환 |
| 일 넘기기와 넘어온 일 | 할 일 → 넘기기 / 받는 사람 오늘 화면 맨 위 |
| 반려동물 종류별 항목 | 설정 → 어떤 아이와 사나요 |
| 요일·날짜 지정 반복 | 주기 버튼 → 요일/날짜 |
| 예시 질문 고정·복사·바로 쓰기 | 말하기 아래, 영역 상세 위 |

`api/weather.js`는 환경변수가 필요 없습니다. 기존 3개(`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) 그대로 두면 됩니다.

## 베타 참가자에게 보낼 안내문 (복사해서 쓰세요)

> 안녕하세요, 먼저ON 베타에 참여해주셔서 감사합니다.
> 아래 주소로 들어가 이메일을 넣으시면 로그인 링크가 갑니다. 비밀번호는 없어요.
> (메일이 안 보이면 스팸함을 확인해주세요)
>
> 주소: https://○○○.vercel.app
>
> 2주 동안 하루 한 번, 생각나는 집안일을 그냥 말하듯 넣어주시면 됩니다.
> 띄어쓰기 안 해도 되고, 순서도 상관없어요.
> 배우자와 함께 쓰시려면 화면 위 '가족 초대 링크 복사'를 눌러 보내주세요.
