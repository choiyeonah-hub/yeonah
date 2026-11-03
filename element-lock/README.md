# 원소잠금 / Element Lock

주기율표 문제를 맞히면, 내가 고른 앱(유튜브·SNS·게임 등)을 정해진 시간 동안 쓸 수 있는 자율 학습 앱입니다.
iOS(SwiftUI + Screen Time API)와 Android(Kotlin + Jetpack Compose + 접근성 서비스) 네이티브 앱입니다.

- 판매: 한국 스토어 유료 다운로드 4,400원, 1회 결제. 구독·광고·인앱결제·서버·회원가입 없음.
- 데이터: 원소 데이터·학습 기록·설정 모두 기기 안에만 저장, 오프라인 동작. Android 앱에는 인터넷 권한이 없습니다.

## 현재 상태 (2026-11-03, GitHub Actions 실행 [41635355534](https://github.com/choiyeonah-hub/yeonah/actions/runs/41635355534) 기준)

| 항목 | 상태 |
|---|---|
| 원소 데이터 1~118, 문구 키 검사 | CI 통과 |
| 학습 규칙 테스트 | Kotlin 31개, Swift 17개 CI 통과 |
| Android debug APK | CI에서 **생성됨**(아티팩트 `element-lock-debug-apk`), lint 오류 0. **실기기 설치·차단 테스트는 미실행** |
| iOS 시뮬레이터 빌드 (앱 + 확장 3개) | CI 통과 — Xcode 26.6/SDK 26.5, Xcode 26.4.x/SDK 26.4(대체 동작) 모두 |
| iOS 기기용 컴파일 (서명 없음) | CI 통과. **설치할 수 없는 파일**이며 서명된 설치 파일(IPA)은 아직 없음 |
| iOS 실기기 차단 → 퀴즈 → 해제 → 재차단 | **미검증** (`docs/testflight.md` → `docs/test-plan.md`) |
| 스토어 등록·가격 설정 | 문서만(`docs/store-and-pricing.md`). 아무것도 설정·제출하지 않음 |

## 폴더 구조

```
element-lock/
  shared-data/     elements.json(원소 데이터) + tools/(생성·검증 스크립트)
  android/         Gradle 프로젝트 — :core(순수 Kotlin 학습 규칙), :app(Android 앱)
    tools/typecheck-without-sdk/   SDK 없이 :app 소스를 타입 검사하는 보조 프로젝트
  ios/             XcodeGen project.yml, App/, Shared/, 확장 3개, ElementLockCore(Swift 패키지)
  design/          아이콘 생성 스크립트
  docs/            ios.md, android.md, testflight.md, store-and-pricing.md, test-plan.md, privacy-policy.md
  tools/           export-to-new-repo.sh (별도 저장소로 옮길 준비, 이 저장소는 변경하지 않음)
CI: 저장소 루트 .github/workflows/element-lock.yml (element-lock/ 변경 시에만 실행)
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

- 원소 이름: 화면·퀴즈는 교과서 표기(나트륨, 칼륨). 대한화학회 공식명(소듐, 포타슘) 등 다른 이름은 원소 상세와 검색에서 제공.
- 잠금 해제 문제 1개 정답 → 고른 앱 전체를 15분(설정에서 30분) 사용. 시간은 **정답 시점부터 흐르는 실제 시각** 기준입니다.
- 남은 시간이 있으면 추가 문제를 요구하지 않고, 그동안은 새 시간을 지급하지 않습니다(연장 없음).
- 같은 문제의 반복 탭·중복 콜백은 무시됩니다(문제 ID 기준 1회만 지급).
- 자유 연습은 기록만 남고 시간을 지급하지 않습니다.
- 오답만으로는 시간이 지급되지 않으며, 힌트·재시도 후 정답은 잠금 해제를 허용하되 기록에는 '도움받은 정답'으로 남습니다.
- 재차단: iOS는 DeviceActivity 일정 종료 콜백(확장 프로그램), Android는 접근성 서비스의 만료 시점 1회 점검 + 창 전환 이벤트마다 시각 재확인. 앱 내부 카운트다운은 표시용입니다.
- 오래된 세션의 종료 콜백은 세션 ID가 달라 무시됩니다.
