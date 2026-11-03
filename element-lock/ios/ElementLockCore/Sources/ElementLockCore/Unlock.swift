import Foundation

/// Allowed-time choices for v1.
public enum AllowanceMinutes: Int, Codable, CaseIterable { case fifteen = 15, thirty = 30 }

/// Time counts from the moment the quiz was solved (wall clock), not actual app usage.
public struct Grant: Codable, Equatable {
    public let sessionId: String
    public let questionId: String
    public let grantedAtMillis: Int64
    public let expiresAtMillis: Int64
}

public struct UnlockState: Codable, Equatable {
    public var activeGrant: Grant?
    /// Most recent redeemed question ids, so a duplicate callback cannot grant twice.
    public var redeemedQuestionIds: [String]

    public init(activeGrant: Grant? = nil, redeemedQuestionIds: [String] = []) {
        self.activeGrant = activeGrant
        self.redeemedQuestionIds = redeemedQuestionIds
    }
}

public enum GrantRejection: Equatable { case practiceDoesNotGrant, notSolved, alreadyRedeemed, stillAllowing }

public enum GrantDecision: Equatable {
    case granted(Grant, UnlockState)
    case rejected(GrantRejection)
}

public enum IntervalEndDecision: Equatable {
    case reblock(UnlockState)
    /// Callback for an older session, or none: must not touch the current one.
    case ignoreStale
    /// Callback came much earlier than the stored expiry: keep the current session.
    case ignoreEarly
}

public enum UnlockRules {
    static let keepRedeemed = 50
    /// OS callbacks are not second-accurate; accept an end callback this much before expiry.
    public static let earlyToleranceMillis: Int64 = 60_000

    public static func requestGrant(state: UnlockState, attempt: QuizAttempt, nowMillis: Int64,
                                    allowance: AllowanceMinutes, newSessionId: String) -> GrantDecision {
        let q = attempt.question
        if q.purpose != .unlock { return .rejected(.practiceDoesNotGrant) }
        if !attempt.solved { return .rejected(.notSolved) }
        if state.redeemedQuestionIds.contains(q.id) { return .rejected(.alreadyRedeemed) }
        if isAllowing(state, nowMillis: nowMillis) { return .rejected(.stillAllowing) }
        let grant = Grant(sessionId: newSessionId, questionId: q.id, grantedAtMillis: nowMillis,
                          expiresAtMillis: nowMillis + Int64(allowance.rawValue) * 60_000)
        let redeemed = Array((state.redeemedQuestionIds + [q.id]).suffix(keepRedeemed))
        return .granted(grant, UnlockState(activeGrant: grant, redeemedQuestionIds: redeemed))
    }

    public static func isAllowing(_ state: UnlockState, nowMillis: Int64) -> Bool {
        guard let g = state.activeGrant else { return false }
        return nowMillis < g.expiresAtMillis
    }

    public static func onIntervalEnded(state: UnlockState, sessionId: String, nowMillis: Int64) -> IntervalEndDecision {
        guard let g = state.activeGrant, g.sessionId == sessionId else { return .ignoreStale }
        if nowMillis < g.expiresAtMillis - earlyToleranceMillis { return .ignoreEarly }
        var s = state
        s.activeGrant = nil
        return .reblock(s)
    }

    /// Fallback when the app itself notices an expired grant (never the only re-block path).
    public static func clearIfExpired(_ state: UnlockState, nowMillis: Int64) -> UnlockState? {
        guard let g = state.activeGrant, nowMillis >= g.expiresAtMillis else { return nil }
        var s = state
        s.activeGrant = nil
        return s
    }

    public static func remainingMillis(_ state: UnlockState, nowMillis: Int64) -> Int64 {
        guard let g = state.activeGrant else { return 0 }
        return max(0, g.expiresAtMillis - nowMillis)
    }
}

public enum LockStatus: Equatable {
    case permissionMissing, inactive, active, quizInProgress, allowing, expired, error
}

public struct LockInputs {
    public var permissionGranted: Bool
    public var enforcerRunning: Bool
    public var enabledByUser: Bool
    public var hasSelectedApps: Bool
    public var unlock: UnlockState
    public var nowMillis: Int64
    public var quizInProgress: Bool
    public var lastError: String?

    public init(permissionGranted: Bool, enforcerRunning: Bool, enabledByUser: Bool, hasSelectedApps: Bool,
                unlock: UnlockState, nowMillis: Int64, quizInProgress: Bool, lastError: String?) {
        self.permissionGranted = permissionGranted
        self.enforcerRunning = enforcerRunning
        self.enabledByUser = enabledByUser
        self.hasSelectedApps = hasSelectedApps
        self.unlock = unlock
        self.nowMillis = nowMillis
        self.quizInProgress = quizInProgress
        self.lastError = lastError
    }
}

public func deriveStatus(_ i: LockInputs) -> LockStatus {
    // Permission revoked after the user turned the lock on is an error, not just "not set up".
    if !i.permissionGranted { return i.enabledByUser ? .error : .permissionMissing }
    if i.lastError != nil { return .error }
    if !i.enabledByUser || !i.hasSelectedApps { return .inactive }
    if !i.enforcerRunning { return .error }
    if i.quizInProgress { return .quizInProgress }
    guard let g = i.unlock.activeGrant else { return .active }
    return i.nowMillis < g.expiresAtMillis ? .allowing : .expired
}
