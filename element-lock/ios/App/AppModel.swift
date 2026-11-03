import ElementLockCore
import FamilyControls
import Foundation
import UIKit

enum RedeemResult: Equatable {
    case granted(expiresAt: Date)
    case rejected(GrantRejection)
    /// The OS schedule could not be registered: the apps stay restricted and the question can be retried.
    case scheduleFailed(String)
}

@MainActor
final class AppModel: ObservableObject {
    let catalog: ElementCatalog
    private let store = SharedStore()

    @Published private(set) var learning: LearningState
    @Published private(set) var unlock: UnlockState
    @Published private(set) var selection: FamilyActivitySelection
    @Published private(set) var authorization: AuthorizationStatus
    @Published private(set) var lastError: String?
    @Published var quizInProgress = false
    /// Saved learning data could not be read. It is kept untouched (not overwritten) until the user decides.
    @Published private(set) var learningUnreadable: Bool

    private var lastTarget: Int?

    init() {
        let url = Bundle.main.url(forResource: "elements", withExtension: "json")!
        catalog = try! ElementCatalog.load(jsonData: Data(contentsOf: url))
        learningUnreadable = store.learningUnreadable
        learning = store.learning ?? LearningState()
        unlock = store.unlock
        selection = store.selection
        authorization = AuthorizationCenter.shared.authorizationStatus
        if !store.isShared { lastError = L("error.appGroup") }
    }

    // MARK: Status

    var hasSelection: Bool { !selection.isEmptySelection }
    var isAuthorized: Bool { authorization == .approved }

    func status(at date: Date = Date()) -> LockStatus {
        deriveStatus(LockInputs(
            permissionGranted: isAuthorized,
            enforcerRunning: store.isShared,
            enabledByUser: learning.settings.lockEnabled,
            hasSelectedApps: hasSelection,
            unlock: unlock,
            nowMillis: millis(date),
            quizInProgress: quizInProgress,
            lastError: lastError
        ))
    }

    var diagnostics: [String] { store.events }

    /// Called whenever the app becomes active. Picks up changes made by the monitor extension,
    /// permission changes made in Settings, and (as a fallback only) an expired grant the OS did not end.
    func refresh() {
        authorization = AuthorizationCenter.shared.authorizationStatus
        unlock = store.unlock
        if let cleared = UnlockRules.clearIfExpired(unlock, nowMillis: millis(Date())) {
            if learning.settings.lockEnabled && isAuthorized { Shield.apply(selection) }
            setUnlock(cleared)
            store.log("app: expired grant found on foreground, reblocked")
        }
    }

    // MARK: Permission and restriction

    func requestAuthorization() async {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        } catch {
            store.log("app: authorization not granted (\(error.localizedDescription))")
        }
        authorization = AuthorizationCenter.shared.authorizationStatus
    }

    func setLockEnabled(_ on: Bool) {
        updateSettings { $0.lockEnabled = on }
        if on {
            guard isAuthorized else { return }
            if !UnlockRules.isAllowing(unlock, nowMillis: millis(Date())) { Shield.apply(selection) }
        } else {
            // Pause: remove every restriction and any pending re-block schedule.
            Shield.clear()
            GrantScheduler.cancelAll()
            var s = unlock
            s.activeGrant = nil
            setUnlock(s)
            lastError = nil
        }
    }

    func saveSelection(_ newSelection: FamilyActivitySelection) {
        selection = newSelection
        store.selection = newSelection
        // Re-applying replaces the whole shield, so apps removed from the selection are released.
        if learning.settings.lockEnabled, isAuthorized, !UnlockRules.isAllowing(unlock, nowMillis: millis(Date())) {
            Shield.apply(newSelection)
        }
    }

    func updateSettings(_ change: (inout Settings) -> Void) {
        var l = learning
        change(&l.settings)
        setLearning(l)
    }

    func clearError() { lastError = nil }

    // MARK: Quiz

    func makeAttempt(purpose: QuizPurpose) -> QuizAttempt? {
        let scope = learning.settings.scope
        guard validateScope(scope) == nil else { return nil }
        var rng = SystemRandomNumberGenerator()
        let target = ReviewScheduler.next(scope: scope, records: learning.records, nowMillis: millis(Date()),
                                          random: &rng, avoid: lastTarget)
        lastTarget = target
        let mode = QuestionFactory.pickMode(scopeSize: scope.count, random: &rng)
        let q = QuestionFactory.make(id: UUID().uuidString, mode: mode, target: target, scope: scope,
                                     purpose: purpose, catalog: catalog, random: &rng)
        return QuizAttempt(question: q)
    }

    /// Tap and drop both end here. Records learning once, when the question is solved.
    func submit(_ attempt: QuizAttempt, choice: Int) -> AnswerResult {
        let result = attempt.answer(choice)
        if case .correct = result { record(attempt) }
        return result
    }

    /// Leaving a question after a wrong answer still counts for review (as failed).
    func abandon(_ attempt: QuizAttempt) {
        if !attempt.solved, attempt.reviewOutcome == .failed { record(attempt) }
    }

    private func record(_ attempt: QuizAttempt) {
        let now = Date()
        var l = learning
        l.record(attempt, nowMillis: millis(now), today: localDayString(now))
        setLearning(l)
    }

    /// Order matters: register the re-block schedule first, and only then lift the shield.
    /// If registration fails the apps stay restricted and the user can retry without a new question.
    func redeem(_ attempt: QuizAttempt) -> RedeemResult {
        let now = Date()
        let decision = UnlockRules.requestGrant(state: unlock, attempt: attempt, nowMillis: millis(now),
                                                allowance: learning.settings.allowance, newSessionId: UUID().uuidString)
        switch decision {
        case .rejected(let reason):
            return .rejected(reason)
        case .granted(let grant, let newState):
            do {
                try GrantScheduler.schedule(grant)
            } catch {
                let message = GrantScheduler.message(for: error)
                lastError = message
                store.log("app: schedule failed: \(error)")
                return .scheduleFailed(message)
            }
            setUnlock(newState)
            Shield.clear()
            lastError = nil
            store.log("app: granted session \(grant.sessionId.prefix(8)) for \(learning.settings.allowance.rawValue) min")
            return .granted(expiresAt: Date(timeIntervalSince1970: TimeInterval(grant.expiresAtMillis) / 1000))
        }
    }

    func resetUnreadableLearning() {
        learningUnreadable = false
        setLearning(LearningState())
    }

    // MARK: Persistence

    private func setLearning(_ l: LearningState) {
        learning = l
        // Never overwrite data we failed to read until the user explicitly resets it.
        if !learningUnreadable { store.learning = l }
    }

    private func setUnlock(_ u: UnlockState) {
        unlock = u
        store.unlock = u
    }

    // MARK: Helpers

    func haptic(success: Bool) {
        guard learning.settings.hapticsEnabled else { return }
        if success { UINotificationFeedbackGenerator().notificationOccurred(.success) }
        else { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    }

    var scopeElements: [Element] { catalog.elements.filter { learning.settings.scope.contains($0.number) } }
}
