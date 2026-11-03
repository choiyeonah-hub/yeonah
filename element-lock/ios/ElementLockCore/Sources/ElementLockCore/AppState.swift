import Foundation

public struct Settings: Codable, Equatable {
    public var onboardingDone = false
    public var scope: Set<Int> = StudyRanges.basic
    public var allowance: AllowanceMinutes = .fifteen
    public var hapticsEnabled = true
    /// The user's switch. Off = paused; selected apps are not restricted.
    public var lockEnabled = false

    public init() {}
}

/// Learning data written only by the main app. `UnlockState` is stored separately on iOS
/// because the DeviceActivity monitor extension writes it too.
public struct LearningState: Codable, Equatable {
    public var settings = Settings()
    public var records: [Int: ReviewRecord] = [:]
    /// Solved questions per local day ("2026-11-03").
    public var solvedPerDay: [String: Int] = [:]

    public init() {}

    public var masteredCount: Int { records.values.filter { ReviewScheduler.isMastered($0) }.count }

    public func solvedToday(_ today: String) -> Int { solvedPerDay[today] ?? 0 }

    public mutating func record(_ attempt: QuizAttempt, nowMillis: Int64, today: String) {
        guard let outcome = attempt.reviewOutcome else { return }
        let n = attempt.question.target
        records[n] = ReviewScheduler.update(previous: records[n], number: n, outcome: outcome,
                                            purpose: attempt.question.purpose, nowMillis: nowMillis, today: today)
        if attempt.solved { solvedPerDay[today, default: 0] += 1 }
    }
}

public enum StateCodec {
    public static func encode<T: Encodable>(_ value: T) -> Data { (try? JSONEncoder().encode(value)) ?? Data() }

    /// Unreadable data yields nil so the caller can decide (it must not silently wipe records).
    public static func decode<T: Decodable>(_ type: T.Type, from data: Data) -> T? {
        try? JSONDecoder().decode(type, from: data)
    }
}

/// "2026-11-03" in the user's current calendar and time zone.
public func localDayString(_ date: Date, calendar: Calendar = .current) -> String {
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
}

public func millis(_ date: Date) -> Int64 { Int64((date.timeIntervalSince1970 * 1000).rounded()) }
