import XCTest
@testable import ElementLockCore

/// Deterministic generator so option shuffling and selection are repeatable in tests.
struct SplitMix64: RandomNumberGenerator {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}

let catalog: ElementCatalog = {
    let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("shared-data/elements.json")
    return try! ElementCatalog.load(jsonData: Data(contentsOf: url))
}()

let minute: Int64 = 60_000
let day: Int64 = 24 * 60 * minute
let now: Int64 = 1_800_000_000_000

func question(_ id: String = "q1", target: Int = 11, mode: QuizMode = .placeOnTable,
              purpose: QuizPurpose = .unlock, scope: Set<Int> = StudyRanges.basic, seed: UInt64 = 1) -> Question {
    var rng = SplitMix64(seed: seed)
    return QuestionFactory.make(id: id, mode: mode, target: target, scope: scope, purpose: purpose,
                                catalog: catalog, random: &rng)
}

func solved(_ purpose: QuizPurpose = .unlock, id: String = "q1") -> QuizAttempt {
    let a = QuizAttempt(question: question(id, purpose: purpose))
    _ = a.answer(11)
    return a
}

final class ElementDataTests: XCTestCase {
    func testCatalog() {
        XCTAssertEqual(catalog.elements.map(\.number), Array(1...118))
        XCTAssertEqual(catalog[11].symbol, "Na")
        XCTAssertEqual(catalog[11].displayNameKo, "소듐(나트륨)")
        XCTAssertNil(catalog[57].group)
        XCTAssertEqual(catalog[57].displayRow, 9)
    }
}

final class QuizTests: XCTestCase {
    func testFirstTry() {
        let a = QuizAttempt(question: question())
        XCTAssertEqual(a.answer(11), .correct(firstTry: true, hintUsed: false))
        XCTAssertEqual(a.reviewOutcome, .firstTry)
    }

    func testWrongThenRightThenRepeatTapIgnored() {
        let a = QuizAttempt(question: question())
        XCTAssertEqual(a.answer(3), .incorrect)
        XCTAssertEqual(a.answer(11), .correct(firstTry: false, hintUsed: false))
        XCTAssertEqual(a.answer(11), .ignored)
        XCTAssertEqual(a.reviewOutcome, .assisted)
    }

    func testHint() {
        let a = QuizAttempt(question: question())
        a.useHint()
        XCTAssertEqual(a.answer(11), .correct(firstTry: false, hintUsed: true))
    }

    func testChoicesDistinctAndInScope() {
        for seed in 0..<300 {
            var rng = SplitMix64(seed: UInt64(seed))
            let target = Int.random(in: 1...20, using: &rng)
            for mode in [QuizMode.fillBlank, .symbolToName, .nameToSymbol] {
                let q = QuestionFactory.make(id: "q", mode: mode, target: target, scope: StudyRanges.basic,
                                             purpose: .practice, catalog: catalog, random: &rng)
                XCTAssertEqual(q.options.count, 4)
                XCTAssertEqual(Set(q.options).count, 4)
                XCTAssertEqual(q.options.filter { $0 == target }.count, 1)
                XCTAssertTrue(q.options.allSatisfy { StudyRanges.basic.contains($0) })
                XCTAssertEqual(Set(q.options.map { catalog[$0].displayNameKo }).count, 4)
            }
        }
    }

    func testTinyScopeFallsBack() {
        XCTAssertEqual(question(target: 8, mode: .symbolToName, scope: [8]).mode, .placeOnTable)
    }

    func testRegion() {
        XCTAssertEqual(QuestionFactory.regionCells(scope: StudyRanges.basic, catalog: catalog).sorted(), Array(1...36))
        XCTAssertEqual(QuestionFactory.regionCells(scope: [60], catalog: catalog).sorted(), Array(57...71))
    }
}

final class ReviewTests: XCTestCase {
    func testScopeOnly() {
        var rng = SplitMix64(seed: 3)
        for _ in 0..<200 {
            XCTAssertTrue([3, 11, 19].contains(ReviewScheduler.next(scope: [3, 11, 19], records: [:], nowMillis: now, random: &rng)))
        }
    }

    func testPriority() {
        let records: [Int: ReviewRecord] = [
            1: ReviewRecord(number: 1, seenCount: 1, dueAtMillis: now - 1, lastOutcome: .firstTry),
            2: ReviewRecord(number: 2, seenCount: 1, dueAtMillis: now - 1, lastOutcome: .failed),
            4: ReviewRecord(number: 4, seenCount: 1, dueAtMillis: now + 5 * day, lastOutcome: .firstTry),
            5: ReviewRecord(number: 5, seenCount: 1, dueAtMillis: now + 2 * day, lastOutcome: .firstTry),
        ]
        var rng = SplitMix64(seed: 0)
        XCTAssertEqual(ReviewScheduler.next(scope: [1, 2, 3, 4, 5], records: records, nowMillis: now, random: &rng), 2)
        XCTAssertEqual(ReviewScheduler.next(scope: [1, 3, 4, 5], records: records, nowMillis: now, random: &rng), 3)
        XCTAssertEqual(ReviewScheduler.next(scope: [1, 4, 5], records: records, nowMillis: now, random: &rng), 1)
        XCTAssertEqual(ReviewScheduler.next(scope: [4, 5], records: records, nowMillis: now, random: &rng), 5)
    }

    func testMasteryNeedsThreeDays() {
        var r = ReviewScheduler.update(previous: nil, number: 6, outcome: .firstTry, purpose: .practice, nowMillis: now, today: "d1")
        r = ReviewScheduler.update(previous: r, number: 6, outcome: .firstTry, purpose: .practice, nowMillis: now, today: "d1")
        XCTAssertFalse(ReviewScheduler.isMastered(r))
        r = ReviewScheduler.update(previous: r, number: 6, outcome: .assisted, purpose: .practice, nowMillis: now, today: "d2")
        XCTAssertEqual(r.dueAtMillis, now + 10 * minute)
        XCTAssertFalse(ReviewScheduler.isMastered(r))
        r = ReviewScheduler.update(previous: r, number: 6, outcome: .firstTry, purpose: .unlock, nowMillis: now, today: "d2")
        r = ReviewScheduler.update(previous: r, number: 6, outcome: .firstTry, purpose: .unlock, nowMillis: now, today: "d3")
        XCTAssertTrue(ReviewScheduler.isMastered(r))
        XCTAssertEqual(r.unlockAnswers, 2)
        XCTAssertEqual(r.practiceAnswers, 3)
    }
}

final class UnlockTests: XCTestCase {
    func testGrant15() {
        guard case let .granted(g, s) = UnlockRules.requestGrant(state: UnlockState(), attempt: solved(), nowMillis: now,
                                                                 allowance: .fifteen, newSessionId: "s1") else { return XCTFail() }
        XCTAssertEqual(g.expiresAtMillis, now + 15 * minute)
        XCTAssertTrue(UnlockRules.isAllowing(s, nowMillis: now + 14 * minute))
        XCTAssertFalse(UnlockRules.isAllowing(s, nowMillis: now + 15 * minute))
    }

    func testPracticeAndUnsolvedNeverGrant() {
        XCTAssertEqual(UnlockRules.requestGrant(state: UnlockState(), attempt: solved(.practice), nowMillis: now,
                                                allowance: .fifteen, newSessionId: "s"), .rejected(.practiceDoesNotGrant))
        let wrong = QuizAttempt(question: question())
        _ = wrong.answer(1)
        XCTAssertEqual(UnlockRules.requestGrant(state: UnlockState(), attempt: wrong, nowMillis: now,
                                                allowance: .fifteen, newSessionId: "s"), .rejected(.notSolved))
    }

    func testNoDoubleGrant() {
        let a = solved()
        guard case let .granted(_, s) = UnlockRules.requestGrant(state: UnlockState(), attempt: a, nowMillis: now,
                                                                 allowance: .fifteen, newSessionId: "s1") else { return XCTFail() }
        XCTAssertEqual(UnlockRules.requestGrant(state: s, attempt: solved(id: "q2"), nowMillis: now + minute,
                                                allowance: .fifteen, newSessionId: "s2"), .rejected(.stillAllowing))
        XCTAssertEqual(UnlockRules.requestGrant(state: s, attempt: a, nowMillis: now + 60 * minute,
                                                allowance: .fifteen, newSessionId: "s3"), .rejected(.alreadyRedeemed))
    }

    func testIntervalEnd() {
        guard case let .granted(_, s) = UnlockRules.requestGrant(state: UnlockState(), attempt: solved(), nowMillis: now,
                                                                 allowance: .fifteen, newSessionId: "s1") else { return XCTFail() }
        XCTAssertEqual(UnlockRules.onIntervalEnded(state: s, sessionId: "old", nowMillis: now + 15 * minute), .ignoreStale)
        XCTAssertEqual(UnlockRules.onIntervalEnded(state: s, sessionId: "s1", nowMillis: now + 5 * minute), .ignoreEarly)
        guard case let .reblock(after) = UnlockRules.onIntervalEnded(state: s, sessionId: "s1", nowMillis: now + 15 * minute + 30_000)
        else { return XCTFail() }
        XCTAssertNil(after.activeGrant)
        XCTAssertEqual(UnlockRules.onIntervalEnded(state: after, sessionId: "s1", nowMillis: now + 16 * minute), .ignoreStale)
    }
}

final class StatusTests: XCTestCase {
    func testStates() {
        let base = LockInputs(permissionGranted: true, enforcerRunning: true, enabledByUser: true, hasSelectedApps: true,
                              unlock: UnlockState(), nowMillis: 1_000, quizInProgress: false, lastError: nil)
        let g = Grant(sessionId: "s", questionId: "q", grantedAtMillis: 0, expiresAtMillis: 2_000)
        var i = base
        XCTAssertEqual(deriveStatus(i), .active)
        i.permissionGranted = false; XCTAssertEqual(deriveStatus(i), .error)
        i.enabledByUser = false; XCTAssertEqual(deriveStatus(i), .permissionMissing)
        i = base; i.enabledByUser = false; XCTAssertEqual(deriveStatus(i), .inactive)
        i = base; i.lastError = "x"; XCTAssertEqual(deriveStatus(i), .error)
        i = base; i.quizInProgress = true; XCTAssertEqual(deriveStatus(i), .quizInProgress)
        i = base; i.unlock = UnlockState(activeGrant: g); XCTAssertEqual(deriveStatus(i), .allowing)
        i.nowMillis = 2_000; XCTAssertEqual(deriveStatus(i), .expired)
    }
}

final class PersistenceTests: XCTestCase {
    func testRoundTrip() {
        var state = LearningState()
        state.settings.onboardingDone = true
        state.settings.allowance = .thirty
        state.record(solved(), nowMillis: 5_000, today: "2026-11-03")
        let restored = StateCodec.decode(LearningState.self, from: StateCodec.encode(state))
        XCTAssertEqual(restored, state)
        XCTAssertEqual(restored?.solvedToday("2026-11-03"), 1)
        XCTAssertNil(StateCodec.decode(LearningState.self, from: Data("{bad".utf8)))
        XCTAssertEqual(validateScope([]), .empty)
    }
}
