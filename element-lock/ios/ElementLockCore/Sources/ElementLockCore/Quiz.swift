import Foundation

public enum QuizMode: String, Codable, CaseIterable { case placeOnTable, fillBlank, symbolToName, nameToSymbol }

public enum QuizPurpose: String, Codable { case unlock, practice }

/// `options` are element numbers.
/// - placeOnTable: every cell of the shown table region (the answer is a cell).
/// - other modes: the multiple-choice options, already shuffled.
public struct Question: Equatable {
    public let id: String
    public let mode: QuizMode
    public let target: Int
    public let options: [Int]
    public let purpose: QuizPurpose
}

public enum QuestionFactory {
    public static let choiceCount = 4

    /// Choice modes need at least two distinct elements; otherwise we fall back to placing.
    public static func make<R: RandomNumberGenerator>(
        id: String, mode: QuizMode, target: Int, scope: Set<Int>, purpose: QuizPurpose,
        catalog: ElementCatalog, random: inout R
    ) -> Question {
        precondition(scope.contains(target), "target outside study scope")
        let effective: QuizMode = (mode != .placeOnTable && scope.count < 2) ? .placeOnTable : mode
        let options: [Int]
        if effective == .placeOnTable {
            options = regionCells(scope: scope, catalog: catalog)
        } else {
            // Sort before shuffling so a seeded generator gives repeatable results.
            let distractors = Array(scope.subtracting([target]).sorted().shuffled(using: &random).prefix(choiceCount - 1))
            options = (distractors + [target]).shuffled(using: &random)
        }
        return Question(id: id, mode: effective, target: target, options: options, purpose: purpose)
    }

    /// All real cells in the display rows that contain the scope, so positions keep their true relations.
    public static func regionCells(scope: Set<Int>, catalog: ElementCatalog) -> [Int] {
        let rows = Set(scope.map { catalog[$0].displayRow })
        return catalog.elements.filter { rows.contains($0.displayRow) }.map(\.number)
    }

    public static func pickMode<R: RandomNumberGenerator>(scopeSize: Int, random: inout R) -> QuizMode {
        if scopeSize < 2 { return .placeOnTable }
        // The table-placement mode is the core mode, so it is drawn more often.
        switch Int.random(in: 0..<10, using: &random) {
        case 0..<4: return .placeOnTable
        case 4..<6: return .fillBlank
        case 6..<8: return .symbolToName
        default: return .nameToSymbol
        }
    }
}

public enum AnswerResult: Equatable {
    case correct(firstTry: Bool, hintUsed: Bool)
    case incorrect
    /// Answer arrived after the question was already solved (double tap, duplicate callback).
    case ignored
}

public enum ReviewOutcome: String, Codable { case firstTry, assisted, failed }

/// One question being answered. Drag and tap both call `answer`, so they share one judgement.
public final class QuizAttempt {
    public let question: Question
    public private(set) var wrongCount = 0
    public private(set) var hintUsed = false
    public private(set) var solved = false

    public init(question: Question) { self.question = question }

    public func answer(_ choice: Int) -> AnswerResult {
        if solved { return .ignored }
        guard question.options.contains(choice), choice == question.target else {
            wrongCount += 1
            return .incorrect
        }
        solved = true
        return .correct(firstTry: wrongCount == 0 && !hintUsed, hintUsed: hintUsed)
    }

    public func useHint() { if !solved { hintUsed = true } }

    /// What to record for spaced review. Abandoned after a wrong answer counts as failed.
    public var reviewOutcome: ReviewOutcome? {
        if solved { return (wrongCount == 0 && !hintUsed) ? .firstTry : .assisted }
        return (wrongCount > 0 || hintUsed) ? .failed : nil
    }
}
