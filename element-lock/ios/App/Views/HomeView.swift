import ElementLockCore
import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    @State private var quiz: QuizPurpose?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        StatusCard(status: model.status(at: context.date), now: context.date) { quiz = .unlock }
                    }
                    stats
                    Button(L("home.practice")) { quiz = .practice }.buttonStyle(SecondaryButtonStyle())
                    Text(L("home.practice.note")).font(.footnote).foregroundStyle(Theme.secondaryText)
                }
                .padding(16)
            }
            .background(Theme.navy.ignoresSafeArea())
            .navigationTitle(L("app.name"))
        }
        .fullScreenCover(item: $quiz) { purpose in QuizView(purpose: purpose) }
    }

    private var stats: some View {
        let today = localDayString(Date())
        let scope = model.learning.settings.scope
        let mastered = scope.filter { ReviewScheduler.isMastered(model.learning.records[$0]) }.count
        return HStack(spacing: 12) {
            stat(L("home.stat.today"), "\(model.learning.solvedToday(today))", icon: "checkmark.circle")
            stat(L("home.stat.mastered"), "\(mastered)/\(scope.count)", icon: "star.fill", tint: Theme.gold)
        }
    }

    private func stat(_ title: String, _ value: String, icon: String, tint: Color = Theme.mint) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon).font(.footnote).foregroundStyle(tint)
            Text(value).font(.title.weight(.bold)).foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.navyRaised))
        .accessibilityElement(children: .combine)
    }
}

extension QuizPurpose: Identifiable { public var id: String { rawValue } }

/// Distinguishes every restriction state with an icon and words, not color alone.
struct StatusCard: View {
    @EnvironmentObject private var model: AppModel
    let status: LockStatus
    let now: Date
    let startUnlock: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: icon).font(.headline).foregroundStyle(tint)
            Text(detail).foregroundStyle(Theme.secondaryText).fixedSize(horizontal: false, vertical: true)
            if status == .active || status == .expired {
                Button(L("home.unlock"), action: startUnlock).buttonStyle(PrimaryButtonStyle())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.navyRaised))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(tint.opacity(0.5)))
        .accessibilityElement(children: .contain)
    }

    private var title: String {
        switch status {
        case .permissionMissing: return L("status.permissionMissing")
        case .inactive: return L("status.inactive")
        case .active: return L("status.active")
        case .quizInProgress: return L("status.quiz")
        case .allowing: return L("status.allowing")
        case .expired: return L("status.expired")
        case .error: return L("status.error")
        }
    }

    private var detail: String {
        switch status {
        case .permissionMissing: return L("status.permissionMissing.detail")
        case .inactive: return L(model.hasSelection ? "status.inactive.paused" : "status.inactive.noApps")
        case .active: return L("status.active.detail", model.learning.settings.allowance.rawValue)
        case .quizInProgress: return L("status.quiz.detail")
        case .allowing:
            let minutes = Int((Double(UnlockRules.remainingMillis(model.unlock, nowMillis: millis(now))) / 60_000).rounded(.up))
            return L("status.allowing.detail", minutes)
        case .expired: return L("status.expired.detail")
        case .error:
            if let e = model.lastError { return e }
            return L(model.isAuthorized ? "status.error.generic" : "status.error.revoked")
        }
    }

    private var icon: String {
        switch status {
        case .permissionMissing: return "hand.raised"
        case .inactive: return "pause.circle"
        case .active: return "lock.fill"
        case .quizInProgress: return "pencil.and.outline"
        case .allowing: return "lock.open"
        case .expired: return "hourglass.bottomhalf.filled"
        case .error: return "exclamationmark.triangle.fill"
        }
    }

    private var tint: Color {
        switch status {
        case .allowing, .active: return Theme.mint
        case .error, .permissionMissing: return Theme.warning
        default: return .white
        }
    }
}
