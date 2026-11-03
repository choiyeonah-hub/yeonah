# 원소잠금 / Element Lock

주기율표 문제를 맞히면, 내가 고른 앱(유튜브·SNS·게임 등)을 정해진 시간 동안 쓸 수 있는 자율 학습 앱입니다.
iOS(SwiftUI + Screen Time API)와 Android(Kotlin + Jetpack Compose + 접근성 서비스) 네이티브 앱입니다.

- 판매: 한국 스토어 유료 다운로드 4,400원, 1회 결제. 구독·광고·인앱결제·서버·회원가입 없음.
- 데이터: 원소 데이터·학습 기록·설정 모두 기기 안에만 저장, 오프라인 동작. Android 앱에는 인터넷 권한이 없습니다.

## 현재 상태 (정직한 요약)

| 항목 | 상태 |
|---|---|
| 원소 데이터 1~118 (`shared-data/elements.json`) | 완료, 검증 스크립트 통과 |
| 공통 학습 규칙 (출제·판정·복습·숙달·시간 지급·재차단 판단·상태) | Kotlin 구현 + 단위 테스트 30개 **실행·통과** / Swift 동일 구현 + XCTest 작성(**미실행**: 이 환경에 Swift 없음) |
| Android 앱 (Compose UI, 접근성 서비스 차단, 차단 화면) | 코드 완료. Android SDK 없이 하는 **Kotlin 타입 검사 통과**. 실제 Gradle/APK 빌드·기기 실행은 **미실행** |
| iOS 앱 + 확장 3개 (Shield 설정, Shield 동작, DeviceActivity 모니터) | 코드 완료. **컴파일·실기기 검증 미실행** (Xcode·Apple 서명 필요) |
| 실기기 차단 → 퀴즈 → 해제 → 재차단 | **미검증**. `docs/test-plan.md`의 체크리스트로 직접 확인해야 함 |
| 스토어 등록·가격 설정 | 문서만 작성(`docs/store-and-pricing.md`). 아무것도 설정·제출하지 않음 |

배포 가능한 완성품이 아닙니다. iOS는 Family Controls 배포 권한 승인 + 서명 + 실기기 검증, Android는 SDK 빌드 + 실기기 검증 + Play 접근성 선언 심사가 남아 있습니다.

## 폴더 구조

```
element-lock/
  shared-data/     elements.json(원소 데이터) + tools/(생성·검증 스크립트)
  android/         Gradle 프로젝트 — :core(순수 Kotlin 학습 규칙), :app(Android 앱)
    tools/typecheck-without-sdk/   SDK 없이 :app 소스를 타입 검사하는 보조 프로젝트
  ios/             XcodeGen project.yml, App/, Shared/, 확장 3개, ElementLockCore(Swift 패키지)
  design/          아이콘 생성 스크립트
  docs/            ios.md, android.md, store-and-pricing.md, test-plan.md, privacy-policy.md
```

## 바로 실행할 수 있는 명령

```bash
# 원소 데이터 검증 (Python 3, 표준 라이브러리만)
python3 shared-data/tools/validate_elements.py

# Kotlin 공통 규칙 단위 테스트 (JDK 17+; Android SDK 불필요)
cd android && ./gradlew :core:test

# Android 앱 소스 타입 검사 (Android SDK 없이)
cd android && ./gradlew -p tools/typecheck-without-sdk compileKotlin

# iOS 문구 키 누락 검사
python3 ios/tools/check_strings.py

# Swift 공통 규칙 테스트 (macOS + Xcode 필요)
cd ios/ElementLockCore && swift test
```

Android APK 빌드·설치는 `docs/android.md`, iOS 빌드·실기기 실행은 `docs/ios.md`를 보세요.

## 핵심 동작 규칙

- 잠금 해제 문제 1개 정답 → 고른 앱 전체를 15분(설정에서 30분) 사용. 시간은 **정답 시점부터 흐르는 실제 시각** 기준입니다.
- 남은 시간이 있으면 추가 문제를 요구하지 않고, 그동안은 새 시간을 지급하지 않습니다(연장 없음).
- 같은 문제의 반복 탭·중복 콜백은 무시됩니다(문제 ID 기준 1회만 지급).
- 자유 연습은 기록만 남고 시간을 지급하지 않습니다.
- 오답만으로는 시간이 지급되지 않으며, 힌트·재시도 후 정답은 잠금 해제를 허용하되 기록에는 '도움받은 정답'으로 남습니다.
- 재차단: iOS는 DeviceActivity 일정 종료 콜백(확장 프로그램), Android는 접근성 서비스의 만료 시점 1회 점검 + 창 전환 이벤트마다 시각 재확인. 앱 내부 카운트다운은 표시용입니다.
- 오래된 세션의 종료 콜백은 세션 ID가 달라 무시됩니다.
