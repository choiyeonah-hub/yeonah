import ElementLockCore
import FamilyControls
import SwiftUI
import UserNotifications

/// 1) how it works  2) study range  3) permission + app selection. Every step can be skipped
/// to "자유 학습만" — learning works without Screen Time permission.
struct OnboardingView: View {
    @EnvironmentObject private var model: AppModel
    @State private var page = 0
    @State private var pickerShown = false
    @State private var pickerSelection = FamilyActivitySelection()

    var body: some View {
        VStack {
            TabView(selection: $page) {
                intro.tag(0)
                range.tag(1)
                permission.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
        }
        .background(Theme.navy.ignoresSafeArea())
        .familyActivityPicker(isPresented: $pickerShown, selection: $pickerSelection)
        .onChange(of: pickerSelection) { model.saveSelection($0) }
    }

    private var intro: some View {
        pageLayout(title: L("onboarding.intro.title")) {
            HStack(spacing: 8) {
                ForEach([1, 6, 8, 11], id: \.self) { n in
                    ElementTile(element: model.catalog[n], style: n == 11 ? .learning : .plain, size: 56)
                }
            }
            .accessibilityHidden(true)
            bullet("lock.fill", L("onboarding.intro.1"))
            bullet("atom", L("onboarding.intro.2"))
            bullet("timer", L("onboarding.intro.3", model.learning.settings.allowance.rawValue))
            bullet("arrow.clockwise", L("onboarding.intro.4"))
            Text(L("onboarding.intro.note")).font(.footnote).foregroundStyle(Theme.secondaryText)
            Button(L("common.next")) { withAnimation { page = 1 } }.buttonStyle(PrimaryButtonStyle())
        }
    }

    private var range: some View {
        pageLayout(title: L("onboarding.range.title")) {
            Text(L("onboarding.range.body")).foregroundStyle(Theme.secondaryText)
            ScopePresetPicker()
            Text(L("onboarding.range.later")).font(.footnote).foregroundStyle(Theme.secondaryText)
            Button(L("common.next")) { withAnimation { page = 2 } }.buttonStyle(PrimaryButtonStyle())
        }
    }

    private var permission: some View {
        pageLayout(title: L("onboarding.permission.title")) {
            Text(L("onboarding.permission.body")).foregroundStyle(Theme.secondaryText)
            step(done: model.isAuthorized, L("onboarding.permission.step1")) {
                Button(L("onboarding.permission.request")) { Task { await model.requestAuthorization() } }
                    .buttonStyle(SecondaryButtonStyle())
                    .disabled(model.isAuthorized)
            }
            if model.authorization == .denied {
                Text(L("onboarding.permission.denied")).font(.footnote).foregroundStyle(Theme.warning)
            }
            step(done: model.hasSelection, L("onboarding.permission.step2")) {
                Button(L("onboarding.permission.pick")) {
                    pickerSelection = model.selection
                    pickerShown = true
                }
                .buttonStyle(SecondaryButtonStyle())
                .disabled(!model.isAuthorized)
            }
            if #unavailable(iOS 26.5) {
                Text(L("onboarding.permission.notifications")).font(.footnote).foregroundStyle(Theme.secondaryText)
            }
            Button(L("onboarding.start")) { finish(enableLock: true) }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!(model.isAuthorized && model.hasSelection))
            Button(L("onboarding.learnOnly")) { finish(enableLock: false) }
                .frame(maxWidth: .infinity)
        }
    }

    private func finish(enableLock: Bool) {
        if enableLock {
            if #unavailable(iOS 26.5) {
                // Needed only for the shield's "open 원소잠금" reminder on older iOS. Optional.
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
            }
            model.setLockEnabled(true)
        }
        model.updateSettings { $0.onboardingDone = true }
    }

    private func pageLayout<C: View>(title: String, @ViewBuilder content: () -> C) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(title).font(.largeTitle.weight(.bold)).foregroundStyle(.white)
                content()
            }
            .padding(24)
            .padding(.bottom, 40)
        }
    }

    private func bullet(_ icon: String, _ text: String) -> some View {
        Label { Text(text).fixedSize(horizontal: false, vertical: true) } icon: {
            Image(systemName: icon).foregroundStyle(Theme.mint)
        }
    }

    private func step<C: View>(done: Bool, _ title: String, @ViewBuilder action: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: done ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(done ? Theme.mint : .white)
                .accessibilityValue(L(done ? "a11y.done" : "a11y.notDone"))
            action()
        }
    }
}

/// 1–20 / 1–36 / 1–118 presets. The custom element picker lives in Settings.
struct ScopePresetPicker: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(spacing: 10) {
            preset(L("scope.basic"), StudyRanges.basic)
            preset(L("scope.extended"), StudyRanges.extended)
            preset(L("scope.all"), StudyRanges.all)
        }
    }

    private func preset(_ title: String, _ scope: Set<Int>) -> some View {
        let selected = model.learning.settings.scope == scope
        return Button { model.updateSettings { $0.scope = scope } } label: {
            HStack {
                Text(title)
                Spacer()
                if selected { Image(systemName: "checkmark") }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 50)
            .foregroundStyle(selected ? Theme.navy : .white)
            .background(RoundedRectangle(cornerRadius: 12).fill(selected ? Theme.mint : Theme.navyRaised))
        }
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
