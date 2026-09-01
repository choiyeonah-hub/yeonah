# 손주한통

**가족이 기억해야 할 일을, 가족보다 먼저 기억하는 AI 살림 비서**

집안일은 하는 게 힘든 게 아니라 계속 기억하는 게 힘듭니다.
분리수거 요일, 예방접종 시기, 시부모님 생신, 알림장 준비물, 관리비 납부일, 정수기 필터 —
종류도 주기도 적어둘 곳도 다 달라서 결국 한 사람의 머릿속에만 남습니다.

손주한통은 그 기억을 대신 들고 있습니다.

---

## 세 개의 엔진

| | | |
|---|---|---|
| **Brain Dump** | 말하면 AI가 정리 | “휴지 사야 되고 애 운동화 작아진 것 같고 엔진오일 언제 갈았는지 모르겠어” 한 문장을 오늘·이번주·조건부·확인필요·구매로 분해합니다. 알림장이나 보험 만기 문자는 캡처를 붙여넣으면 마감일과 할 일이 됩니다. |
| **Blind Spot** | 안 적은 일을 먼저 꺼냄 | 우리 집 조건(아이 나이·차·반려동물·주거)에 맞는 200여 개 한국 살림 항목이 자동으로 켜지고, 한 번도 적지 않은 일이 때가 되면 올라옵니다. |
| **Life Timeline** | 준비 시작 시점부터 역산 | 취학·예방접종·자동차 정기검사·음력 제사처럼 ‘그날’이 아니라 ‘준비를 시작해야 하는 날’을 계산해 알립니다. |

## 그 밖에

- **오늘 머리 쓸 일 3가지** — 판단이 필요한 것만 위로, 나머지는 앱이 기억
- **음력 제사·생신 자동 변환** — 2025~2045년 음력표 내장, 매년 양력 재계산
- **부부 분담과 넘기기** — 담당 지정, 컨디션 나쁜 날 몫 넘기기
- **살 것 목록** — 말하면 모이고, 사면 줄이 그어짐
- **휴일 날씨 브리핑 · 이사 계획 분해 · 자동차 정기검사 시점 계산**
- **가구 단위 실시간 공유** — 배우자가 완료하면 내 화면에 바로 반영

---

## 구조

단일 HTML 파일 + 서버리스 함수 3개. 빌드 과정이 없습니다.

```
index.html            앱 전체 (React 18 UMD + Babel standalone + Tailwind CDN)
api/classify.js       Anthropic 호출 프록시 (텍스트 + 이미지)
api/config.js         브라우저에 내려도 되는 공개 설정만 반환
api/weather.js        Open-Meteo 프록시 (API 키 불필요)
supabase-schema.sql   households 테이블 + RLS 정책
manifest.json         PWA 설정
```

문서:

```
DECISIONS.md          제품·사업 판단의 기록 (무엇을 왜 넣지 않았는지 포함)
BUSINESS-MODEL.md     원가·손익분기·제휴 구조 분석
```

## 왜 단일 파일인가

시안으로 시작해서 그대로 자란 구조입니다. 빌드가 없어 배포가 1초면 끝나고,
검증 단계에서는 이 속도가 구조적 아름다움보다 중요했습니다.
인수 후 컴포넌트 분리와 빌드 도입은 개발자 판단에 맡깁니다.

---

## 배포

Vercel에 이 저장소를 연결하면 됩니다. 프레임워크는 **Other**(정적)로 두세요.
`index.html`이 그대로 서빙되고 `api/` 아래 파일이 서버리스 함수가 됩니다.

`package.json`의 `"type": "module"`은 `api/*.js`가 ESM 문법(`export default`)을
쓰기 때문에 필요합니다. 지우지 마세요.

### 환경변수

Vercel 프로젝트 설정 → Environment Variables:

| 이름 | 필수 | 용도 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | AI 호출. **서버에서만** 쓰이고 브라우저로 내려가지 않습니다 |

세 개 모두 필수입니다. 하나라도 빠지면 앱이 부팅 화면에서 멈춥니다.
| `SUPABASE_URL` | ✅ | 가구 데이터 저장. 없으면 앱이 설정 안내 화면에서 멈춥니다 |
| `SUPABASE_ANON_KEY` | ✅ | 공개용 키입니다. 실제 보호는 DB의 RLS 정책이 담당합니다 |

`.env.example`을 참고하세요. **실제 키를 저장소에 커밋하지 마세요.**

### Supabase 설정

무료 요금제로 충분합니다.

1. **프로젝트 생성** — Region은 `Northeast Asia (Seoul)`를 고르면 빠릅니다.
   생성 시 정한 데이터베이스 비밀번호는 따로 보관하세요.
2. **SQL Editor** → `supabase-schema.sql` 내용을 통째로 붙여넣고 Run.
   households / household_members 두 테이블과 RLS 정책이 만들어집니다.
3. **Authentication → Sign In / Providers → Email** — 활성화하고,
   비밀번호 없이 링크로 들어오는 방식(매직링크)을 씁니다.
4. **Authentication → URL Configuration**
   - Site URL: 배포 주소 (예: `https://sonjuhantong.com`)
   - Redirect URLs: 같은 주소와 `https://sonjuhantong.com/**`, 그리고 옛 주소도 함께 남겨둡니다
   가족 초대 링크가 `/?join=CODE` 형태라 와일드카드가 필요합니다.
5. **Authentication → Emails → Magic Link** — 로그인 숫자가 담긴 메일입니다.
   앱은 `verifyOtp`로 여섯 자리를 받으므로 본문에 `{{ .Token }}`이 꼭 있어야 합니다.
   이름을 바꿨으면 **여기도 같이 바꿔야 합니다** — 코드에 없어서 앱을 고쳐도 안 바뀝니다.

   제목:
   ```
   손주한통 로그인 숫자 {{ .Token }}
   ```
   본문:
   ```html
   <h2 style="font-family:sans-serif">손주한통 로그인 숫자</h2>
   <p style="font-family:sans-serif">아래 여섯 자리를 앱에 넣어주세요.</p>
   <p style="font-family:monospace;font-size:32px;letter-spacing:8px;font-weight:700;color:#1F4B73">{{ .Token }}</p>
   <p style="font-family:sans-serif;font-size:13px">10분 안에 넣으셔야 합니다.
      본인이 요청한 것이 아니면 그냥 두셔도 됩니다.</p>
   <p style="font-family:sans-serif;font-size:12px;color:#767A6F">
      손주한통 — 어머니께 오늘 일정을 전화로 읽어드립니다</p>
   ```
   보내는 사람 이름은 템플릿이 아니라 SMTP 설정입니다. 기본 메일러를 쓰면
   Supabase 이름으로 나가고, 바꾸려면 **Project Settings → Authentication → SMTP**에
   따로 붙여야 합니다.
6. **Project Settings → API**에서 Project URL과 `anon` `public` 키를 복사해
   Vercel 환경변수에 넣고 **Redeploy**합니다.

---

## 개인정보 원칙

- AI 호출은 **서버를 경유**합니다. API 키가 브라우저에 내려가지 않습니다.
- 사진은 크기를 줄여 AI에 보내고 **앱에 저장하지 않습니다.** 뽑아낸 할 일만 남습니다.
- 아이는 생년월일 대신 **연령 단계**만 받습니다.
- 오늘 컨디션은 **당일만** 저장하고 누적하지 않습니다. 가족에게 보일지는 사용자가 정합니다.
- 가구별 데이터는 DB 수준에서 격리됩니다(RLS).
- 안내문 인식 시 이름·주민번호·차량번호·계좌번호·주소는 옮기지 않도록 프롬프트에 명시돼 있습니다.
