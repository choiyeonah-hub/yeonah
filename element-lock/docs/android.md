# Android: 구조, 빌드, 설치, Play 정책

## 동작 방식

- 사용자가 고른 앱의 **실행 감지**: `AccessibilityService`가 `TYPE_WINDOW_STATE_CHANGED` 이벤트의 `packageName`만 읽습니다.
  `canRetrieveWindowContent=false`라 화면 내용·입력·메시지는 받을 수 없고, 읽거나 저장하지 않습니다.
- 고른 앱이 앞에 오면 `BlockActivity`(별도 task, 최근 앱 목록 제외)를 띄웁니다. 뒤로 가기 = 홈 화면.
  차단 화면이 가려지면(다른 앱으로 이동) 스스로 닫힙니다.
- 허용 시간 만료: 서비스가 만료 시각에 1회 점검(`Handler.postDelayed`)하고, 이후 모든 창 전환 이벤트에서도 현재 시각으로 다시 판단합니다.
  폴링·포그라운드 서비스·정확한 알람·오버레이 권한을 쓰지 않습니다.
- 절대 막지 않는 앱: 원소잠금 자신, 설정, 전화·긴급전화(기본 전화 앱 포함), 시스템 UI, 권한·설치 관리자, 기본 홈 앱, 키보드.
  앱 선택 목록에도 나오지 않으며, 저장된 목록에 들어 있어도 무시됩니다(`BlockPolicy` 테스트로 확인).
- 상태 표시: 접근성 권한 꺼짐(권한 없음/해제), 켜져 있지만 서비스가 실행 중이 아님(강제 종료·제조사 절전), 일시정지, 제한 중, 허용 중을 구분합니다.

권한: 접근성 서비스 바인딩 외에 **추가 권한 없음**(인터넷·사용 기록 접근·다른 앱 위에 그리기·모든 패키지 조회 없음).
앱 목록은 `<queries>`의 LAUNCHER/HOME 인텐트로만 조회합니다.

## 빌드·설치 (Android SDK 필요)

```bash
cd element-lock/android
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties   # 또는 ANDROID_HOME 설정
./gradlew :core:test            # 공통 규칙 테스트
./gradlew :app:assembleDebug    # → app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Android Studio(Narwhal 이상 권장)로 `android/` 폴더를 열어도 됩니다. SDK가 설정되지 않으면 `:app`은 건너뛰고 `:core`만 빌드됩니다.

이 저장소 작업 환경에서는 Android SDK와 Google Maven에 접근할 수 없어 **APK를 만들지 못했습니다.**
대신 `./gradlew -p tools/typecheck-without-sdk compileKotlin`으로 앱 소스 전체를 Compose Desktop + Robolectric android-all
+ 최소 스텁에 대해 타입 검사했고 통과했습니다. 실제 Android 빌드에서 리소스·매니페스트·라이브러리 버전 문제가 나올 수 있습니다.

### 릴리스 빌드

1. `app/build.gradle.kts`의 `applicationId`를 본인 것으로 변경.
2. 업로드 키 생성(`keytool -genkeypair ...`) 후 `signingConfigs` 추가(키·비밀번호는 저장소에 넣지 말 것).
3. `./gradlew :app:bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`를 Play Console에 업로드.

## Google Play 정책 준비 (사용자만 할 수 있는 작업)

1. **접근성 API 선언**(Play Console > 앱 콘텐츠 > 접근성 API): `isAccessibilityTool`을 선언하지 않았으므로 선언서 제출이 필요합니다.
   - 핵심 기능: "사용자가 직접 고른 앱이 열릴 때 학습 화면을 띄워 사용을 제한하는 자기 관리 학습 앱"
   - 접근 데이터: 현재 앞에 있는 앱의 패키지 이름(창 상태 변경 이벤트)
   - 사용 방식: 기기 안에서 선택 목록과 비교해 차단 화면 표시. 저장·전송·공유 없음. 화면 내용·입력 읽지 않음. 자동 조작 없음.
   - 동영상: 온보딩의 안내 화면 → 동의 → 접근성 설정 → 앱 선택 → 차단 → 문제 → 해제 → 만료 재차단까지 녹화.
2. **눈에 띄는 고지·동의**: 앱 안 `DisclosureScreen`(온보딩·설정에서 접근성 설정으로 보내기 전에 항상 표시, 동의/거부 버튼).
3. **데이터 보안 양식**: 수집·공유 데이터 없음. (패키지 이름은 기기 밖으로 나가지 않으므로 '수집'에 해당하지 않음 — 제출 전에 최신 정의를 다시 확인하세요.)
4. 개인정보처리방침 URL: `docs/privacy-policy.md`를 웹에 게시해 사용.

정책은 바뀔 수 있습니다. 제출 전에 [Play 접근성 API 정책](https://support.google.com/googleplay/android-developer/answer/10964491)을 다시 확인하세요.

## 알려진 기기별 제약

- 제조사 절전(삼성 '절전 앱', 샤오미 '자동 시작' 등)이 접근성 서비스를 멈출 수 있습니다. 앱은 이 경우 '확인이 필요해요'로 표시하지만, 멈춤 자체를 막지는 못합니다.
- 앱 강제 종료 후에는 사용자가 접근성 설정에서 다시 켜기 전까지 서비스가 동작하지 않을 수 있습니다.
- 사용자는 접근성 끄기·앱 삭제·안전 모드로 언제든 제한을 해제할 수 있습니다. 삭제 방지나 완전한 우회 방지는 구현하지 않았고 약속하지 않습니다.
- 분할 화면·PIP·플로팅 창에서는 창 이벤트가 앱마다 다르게 와 차단 화면이 늦거나 안 뜰 수 있습니다(실기기 확인 필요).
