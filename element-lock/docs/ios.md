# iOS: 구조, 빌드, 서명, 실기기 실행

## 요구 사항

- macOS + **Xcode 26.5 이상**(iOS 26.5 SDK). 차단 화면 버튼으로 앱을 여는 `ShieldActionResponse.openParentalControlsApp`이
  iOS 26.5 SDK부터 있습니다. 이전 SDK에서는 이 줄이 컴파일되지 않습니다(비공식 raw value 우회는 쓰지 않음).
- 배포 대상: iOS 16.0+ (개인용 `AuthorizationCenter.requestAuthorization(for: .individual)`이 16부터).
- 실제 iPhone(시뮬레이터에서는 Screen Time 차단을 검증할 수 없음).
- Apple Developer Program 계정, [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

## 구성

| 타깃 | 역할 | 확장 지점 |
|---|---|---|
| `ElementLock` (앱) | 온보딩, 권한 요청, FamilyActivityPicker, 퀴즈, 시간 지급, 재차단 일정 등록 | — |
| `ShieldConfiguration` | 시스템 차단 화면의 문구·색·버튼 지정(퀴즈는 넣을 수 없음) | `com.apple.ManagedSettingsUI.shield-configuration-service` |
| `ShieldAction` | 차단 화면 버튼 처리. iOS 26.5+: `.openParentalControlsApp`으로 원소잠금 열기 / 이전: 로컬 알림 후 닫기 | `com.apple.ManagedSettings.shield-action-service` |
| `DeviceActivityMonitor` | 허용 시간 일정 종료 시 차단 재적용(앱이 꺼져 있어도 OS가 실행) | `com.apple.deviceactivity.monitor-extension` |
| `ElementLockCore` (Swift 패키지) | 플랫폼 무관 학습·시간 규칙. `swift test`로 macOS에서 테스트 | — |

네 타깃 모두 `com.apple.developer.family-controls`와 같은 App Group(`group.app.elementlock`)을 가집니다.
공유 저장소: App Group `UserDefaults` — `learning.v1`(앱만 씀), `unlock.v1`(앱=지급, 모니터=재차단), `selection.v1`, `events.v1`(진단 기록).

### 시간 지급과 재차단 흐름

1. 잠금 해제 문제 정답 → `UnlockRules.requestGrant`(중복·연습·미정답·허용 중이면 거절).
2. **먼저** `DeviceActivityCenter.startMonitoring("elementlock.grant.<세션ID>", 일정)` 등록.
   DeviceActivity는 15분 미만 구간을 거부하므로(`intervalTooShort`) **종료 = 만료 시각**으로 두고 시작을 16분 앞으로 당깁니다
   (시작이 과거여도 됨). 시·분·초 구성요소만 사용합니다.
3. 등록 성공 시에만 `unlock.v1` 저장 → `ManagedSettingsStore(named: "elementlock")` 차단 해제.
   등록 실패 시 차단을 유지하고 오류를 표시하며, 같은 문제로 "다시 시도" 가능(문제는 아직 사용 처리 안 됨).
4. 만료 시 OS가 모니터 확장의 `intervalDidEnd`를 호출 → 활동 이름에서 세션 ID를 꺼내 저장된 세션과 비교
   → 같으면 차단 재적용, 다르면(이전 세션) 무시. 만료 60초 전보다 이른 콜백도 무시.
5. 앱이 다시 열릴 때 만료된 세션이 남아 있으면 앱이 차단을 재적용합니다(보조 경로, 진단 기록에 `app:`로 남음).
   정상 경로는 `monitor:` 기록입니다. 실기기 검증 때 둘을 구분해 보세요.

알려진 OS 제약: 콜백 시각은 OS가 정하며 초 단위로 정확하지 않습니다. 차단된 원래 앱을 자동으로 다시 열 수 없습니다.
차단 화면 안에서 퀴즈를 풀 수 없습니다(시스템이 정한 필드만 사용 가능).

## 처음 빌드하기

```bash
cd element-lock/ios
# 1) project.yml 에서 DEVELOPMENT_TEAM, EL_BUNDLE_ID, EL_APP_GROUP 을 본인 값으로 변경
# 2) Shared/SharedStore.swift 의 AppGroup.identifier 를 EL_APP_GROUP 과 같게 변경
xcodegen generate
open ElementLock.xcodeproj
```

Xcode에서:
1. 각 타깃(앱 + 확장 3개) Signing & Capabilities에서 Team 선택. Family Controls와 App Groups capability가 entitlements로 들어가 있는지 확인.
2. Apple Developer 사이트에서 App ID 4개(앱, `.ShieldConfiguration`, `.ShieldAction`, `.DeviceActivityMonitor`)와 App Group을 만들고 연결.
3. iPhone 연결 → `ElementLock` 스킴 → Run. 개발 빌드에서는 Family Controls 개발용 권한으로 동작합니다.

공통 규칙 테스트: `cd ElementLockCore && swift test`.

## Family Controls 배포 권한 (사용자만 할 수 있는 작업)

개발 서명으로는 기기 테스트가 되지만, **TestFlight/App Store 배포에는 Family Controls (Distribution) 권한 승인**이 필요합니다.
Apple의 Family Controls 권한 요청 양식에서 아래 **4개 번들 ID 각각**에 대해 신청하세요.

| 번들 ID | 쓰는 API |
|---|---|
| `<EL_BUNDLE_ID>` | FamilyControls(AuthorizationCenter, FamilyActivityPicker), ManagedSettings, DeviceActivity(일정 등록) |
| `<EL_BUNDLE_ID>.ShieldConfiguration` | ManagedSettingsUI ShieldConfigurationDataSource |
| `<EL_BUNDLE_ID>.ShieldAction` | ManagedSettings ShieldActionDelegate |
| `<EL_BUNDLE_ID>.DeviceActivityMonitor` | DeviceActivityMonitor, ManagedSettings |

신청서 설명 예시: "개인 사용자가 자기 기기에서 직접 고른 앱을, 주기율표 문제를 맞힐 때까지 Screen Time 차단으로 제한하는 학습 앱.
`.individual` 권한만 사용하며, 원격 자녀 관리나 데이터 수집은 없다. 앱 토큰은 기기 안 App Group에만 저장한다."

승인 후 각 App ID에 배포용 Family Controls capability가 붙었는지, 프로비저닝 프로파일을 다시 받았는지 확인하세요.
승인·서명·실기기 검증 전에는 배포 가능 상태가 아닙니다.

## 실기기 검증 순서 (필수, 아직 수행 안 됨)

`docs/test-plan.md`의 iOS 항목을 순서대로 수행하고 결과를 기록하세요. 특히:
- 본 앱을 앱 전환기에서 종료한 상태로 15분 만료 → 차단 재적용되는지, 진단 기록이 `monitor: reblocked`인지
- 자정을 넘기는 허용 시간(예: 23:50 정답)에서도 재차단되는지
- iOS 26.5 미만 기기에서 차단 화면 버튼 → 알림 → 원소잠금 열림
