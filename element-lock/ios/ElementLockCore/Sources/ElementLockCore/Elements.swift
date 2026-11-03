import Foundation

public struct Element: Codable, Hashable, Identifiable {
    public let number: Int
    public let symbol: String
    public let nameKo: String
    public let aliasesKo: [String]
    public let nameEn: String
    public let period: Int
    /// nil for the lanthanide/actinide series (shown in separate rows).
    public let group: Int?
    public let displayRow: Int
    public let displayColumn: Int
    public let category: String

    public var id: Int { number }

    /// Search by atomic number, symbol, Korean name, other Korean names (e.g. 소듐 → 나트륨) or the start of the English name.
    /// Case and surrounding spaces are ignored. Quizzes always show `nameKo` only.
    public func matches(_ query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return false }
        if let n = Int(q) { return n == number }
        return symbol.lowercased() == q
            || nameKo.contains(q)
            || aliasesKo.contains { $0.contains(q) }
            || nameEn.lowercased().hasPrefix(q)
    }
}

public struct ElementCatalog {
    public let elements: [Element]
    private let byNumber: [Int: Element]

    public init(elements: [Element]) {
        self.elements = elements
        self.byNumber = Dictionary(uniqueKeysWithValues: elements.map { ($0.number, $0) })
    }

    public subscript(number: Int) -> Element { byNumber[number]! }

    private struct File: Decodable { let schemaVersion: Int; let elements: [Element] }

    public static func load(jsonData: Data) throws -> ElementCatalog {
        ElementCatalog(elements: try JSONDecoder().decode(File.self, from: jsonData).elements)
    }
}

public enum StudyRanges {
    public static let basic = Set(1...20)
    public static let extended = Set(1...36)
    public static let all = Set(1...118)
}

public enum ScopeError: Equatable { case empty, outOfRange }

public func validateScope(_ scope: Set<Int>) -> ScopeError? {
    if scope.isEmpty { return .empty }
    if scope.contains(where: { !(1...118).contains($0) }) { return .outOfRange }
    return nil
}
