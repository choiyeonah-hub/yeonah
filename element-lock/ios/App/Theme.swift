import SwiftUI

enum Theme {
    static let navy = Color(red: 0.04, green: 0.09, blue: 0.19)
    static let navyRaised = Color(red: 0.08, green: 0.15, blue: 0.28)
    static let navyLine = Color(red: 0.20, green: 0.28, blue: 0.42)
    static let mint = Color(red: 0.24, green: 0.90, blue: 0.76)
    static let gold = Color(red: 0.83, green: 0.69, blue: 0.36)
    static let secondaryText = Color.white.opacity(0.72)
    static let warning = Color(red: 1.0, green: 0.72, blue: 0.45)
}

func L(_ key: String) -> String { NSLocalizedString(key, comment: "") }

func L(_ key: String, _ args: CVarArg...) -> String {
    String(format: NSLocalizedString(key, comment: ""), arguments: args)
}
