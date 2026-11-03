# 내 iPhone에 TestFlight로 설치하기 (Mac 없이 GitHub Actions 사용)

이 문서는 **아직 수행되지 않은 절차**입니다. 계정·권한·비밀값은 사용자만 만들 수 있습니다.
비밀번호, 인증서, `.p8` 키를 채팅이나 저장소 파일에 넣지 마세요. 아래에 적힌 GitHub Secrets 화면에만 넣습니다.

## 0. 비용과 기간
- Apple Developer Program: 연 회비가 있습니다(가입 화면에서 현재 금액 확인). 가입은 사용자가 직접 결정하세요.
- GitHub Actions: 이 저장소는 공개(public)라 표준 실행기 사용이 무료입니다. 비공개 저장소로 옮기면 macOS 실행 시간이 무료 한도를 빠르게 소모합니다.
- Family Controls 배포 권한 승인은 Apple이 시기를 공개하지 않습니다. 개발자 포럼에는 2주~수개월 대기 사례가 있습니다.

## 1. Apple Developer Program 가입
1. https://developer.apple.com/programs/enroll/ 에서 Apple ID로 가입(개인 또는 조직).
2. 승인 후 https://developer.apple.com/account 에서 **Team ID**(10자리)를 확인합니다. Team ID는 비밀값이 아닙니다.

## 2. 번들 ID 4개와 App Group 만들기
Certificates, Identifiers & Profiles > Identifiers 에서:
1. App Group: `group.<본인도메인>.elementlock` (예: `group.kr.yeonah.elementlock`).
2. App ID 4개 — 모두 **Family Controls**와 **App Groups**(위 그룹) 체크:
   - `<본인도메인>.elementlock`
   - `<본인도메인>.elementlock.ShieldConfiguration`
   - `<본인도메인>.elementlock.ShieldAction`
   - `<본인도메인>.elementlock.DeviceActivityMonitor`
3. 저장소에서 바꿀 값(제가 대신 바꿀 수 있으니 값만 알려 주세요. 비밀값 아님):
   `ios/project.yml`의 `DEVELOPMENT_TEAM`, `EL_BUNDLE_ID`, `EL_APP_GROUP`과 `ios/Shared/SharedStore.swift`의 `AppGroup.identifier`.

## 3. Family Controls 배포 권한 신청 (TestFlight에 필수)
- 신청서: https://developer.apple.com/contact/request/family-controls-distribution (개발자 계정 로그인 필요)
- **번들 ID 4개 각각** 제출합니다(앱 1 + 확장 3). 같은 App Apple ID에 번들 ID만 바꿔 제출.
  App Apple ID는 5단계에서 App Store Connect 앱을 만든 뒤 생깁니다. 따라서 5단계를 먼저 해도 됩니다.
- 설명 예시는 `docs/ios.md`의 "Family Controls 배포 권한" 절을 쓰세요.
- 승인 전에는 배포용 프로비저닝 프로파일에 Family Controls가 들어가지 않아 TestFlight 업로드용 서명이 실패합니다.
  승인 여부는 Identifiers > 각 App ID > Capabilities에서 "Family Controls (Distribution)"으로 확인합니다.

## 4. App Store Connect API 키 만들기 (CI 서명용)
1. https://appstoreconnect.apple.com > 사용자 및 액세스 > 통합(Integrations) > App Store Connect API > 팀 키 생성.
   역할은 **App Manager**. 생성 직후 `.p8` 파일을 **한 번만** 내려받을 수 있습니다.
2. 기록할 값: Issuer ID, Key ID (비밀값 아님), `.p8` 파일 (**비밀값**).

## 5. App Store Connect에 앱 만들기
나의 앱 > + > 새로운 앱: 플랫폼 iOS, 이름 "원소잠금", 번들 ID `<본인도메인>.elementlock`, SKU 임의값.
가격은 TestFlight와 무관합니다. 4,400원 설정은 출시 때(`docs/store-and-pricing.md`).

## 6. 비밀값을 GitHub에 안전하게 넣기
GitHub 저장소 > **Settings > Secrets and variables > Actions > New repository secret**:

| 이름 | 값 |
|---|---|
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | `.p8` 파일을 base64로 바꾼 값 (Mac/Linux: `base64 -i AuthKey_XXXX.p8`, Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8"))`) |
| `APPLE_TEAM_ID` | Team ID |

Secrets 값은 저장 후 다시 볼 수 없고, 워크플로 로그에서도 가려집니다. 공개 저장소라도 포크에서 온 PR에는 전달되지 않습니다.

## 7. 서명 빌드와 TestFlight 업로드 (다음 단계 — 아직 워크플로에 없음)
3~6단계가 끝나면 알려 주세요. 그때 `workflow_dispatch`로만 실행되는 별도 작업을 추가합니다:
`xcodebuild archive` → `-exportArchive`(자동 서명, `-allowProvisioningUpdates -authenticationKeyPath/-ID/-IssuerID`) → App Store Connect 업로드.
비밀값이 없으면 그 작업은 실행하지 않도록 만들 예정입니다.

## 8. iPhone에 설치
1. App Store Connect > 앱 > TestFlight > 내부 테스트 그룹에 본인 Apple ID 추가(내부 테스트는 베타 심사 불필요).
2. iPhone에 TestFlight 앱 설치 → 초대 수락 → 원소잠금 설치.
3. `docs/test-plan.md` iOS 항목(I1~I16) 실행. 이것이 **실제 휴대폰 잠금 테스트**이며, 그 전까지는 미검증입니다.
