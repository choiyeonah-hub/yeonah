import Foundation

public struct ReviewRecord: Codable, Equatable {
    public let number: Int
    public var seenCount = 0
    public var intervalDays = 0
    public var dueAtMillis: Int64 = 0
    public var lastOutcome: ReviewOutcome?
    /// Local calendar days ("2026-11-03") with a first-try correct answer.
    public var firstTryDays: Set<String> = []
    public var unlockAnswers = 0
    public var practiceAnswers = 0

    public init(number: Int, seenCount: Int = 0, intervalDays: Int = 0, dueAtMillis: Int64 = 0,
                lastOutcome: ReviewOutcome? = nil, firstTryDays: Set<String> = []) {
        self.number = number
        self.seenCount = seenCount
        self.intervalDays = intervalDays
        self.dueAtMillis = dueAtMillis
        self.lastOutcome = lastOutcome
        self.firstTryDays = firstTryDays
    }
}

/// Same rules as the Android core (ReviewScheduler.kt):
/// 1. due elements answered wrong/with help, 2. never-seen, 3. other due, 4. soonest due.
/// First-try correct doubles the interval (1, 2, 4 ... days, max 60); mistakes return in 10 minutes.
/// Mastered = first-try correct on `masteryDays` different days.
public enum ReviewScheduler {
    public static let masteryDays = 3
    public static let maxIntervalDays = 60
    public static let retryDelayMillis: Int64 = 10 * 60 * 1000
    static let dayMillis: Int64 = 24 * 60 * 60 * 1000

    public static func next<R: RandomNumberGenerator>(
        scope: Set<Int>, records: [Int: ReviewRecord], nowMillis: Int64, random: inout R, avoid: Int? = nil
    ) -> Int {
        precondition(!scope.isEmpty, "empty study scope")
        var candidates = scope
        if scope.count > 1, let avoid { candidates.remove(avoid) }
        func bucket(_ n: Int) -> Int {
            guard let r = records[n], r.seenCount > 0 else { return 1 }
            let due = r.dueAtMillis <= nowMillis
            if due && r.lastOutcome != .firstTry { return 0 }
            return due ? 2 : 3
        }
        let grouped = Dictionary(grouping: candidates.sorted(), by: bucket)
        let best = grouped.keys.min()!
        var pool = grouped[best]!
        if best == 3 {
            let soonest = pool.map { records[$0]!.dueAtMillis }.min()!
            pool = pool.filter { records[$0]!.dueAtMillis == soonest }
        }
        return pool.randomElement(using: &random)!
    }

    public static func update(previous: ReviewRecord?, number: Int, outcome: ReviewOutcome,
                              purpose: QuizPurpose, nowMillis: Int64, today: String) -> ReviewRecord {
        var r = previous ?? ReviewRecord(number: number)
        let oldInterval = r.intervalDays
        r.seenCount += 1
        r.lastOutcome = outcome
        if purpose == .unlock { r.unlockAnswers += 1 } else { r.practiceAnswers += 1 }
        switch outcome {
        case .firstTry:
            r.intervalDays = oldInterval == 0 ? 1 : min(oldInterval * 2, maxIntervalDays)
            r.dueAtMillis = nowMillis + Int64(r.intervalDays) * dayMillis
            r.firstTryDays.insert(today)
        case .assisted, .failed:
            r.intervalDays = 0
            r.dueAtMillis = nowMillis + retryDelayMillis
        }
        return r
    }

    public static func isMastered(_ record: ReviewRecord?) -> Bool {
        (record?.firstTryDays.count ?? 0) >= masteryDays
    }
}
