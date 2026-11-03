import ElementLockCore
import SwiftUI

enum TileStyle {
    /// Empty cell for the placement quiz: no symbol, no number.
    case blank
    /// The cell asked about in fill-the-blank mode.
    case question
    case plain
    case learning
    case mastered
    /// Outside the study scope (shown dim for orientation).
    case outOfScope
}

/// The app's core visual: one element cell. State is shown by fill AND an icon, never color alone.
struct ElementTile: View {
    let element: Element?
    let style: TileStyle
    var size: CGFloat = 44
    var showName = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            RoundedRectangle(cornerRadius: size * 0.16, style: .continuous)
                .fill(fill)
            RoundedRectangle(cornerRadius: size * 0.16, style: .continuous)
                .strokeBorder(stroke, style: StrokeStyle(lineWidth: style == .question ? 2 : 1, dash: style == .blank ? [3, 3] : []))
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            if style == .mastered {
                Image(systemName: "star.fill").font(.system(size: size * 0.2)).foregroundStyle(Theme.navy).padding(size * 0.06)
            } else if style == .learning {
                Image(systemName: "circle.dashed").font(.system(size: size * 0.2)).foregroundStyle(Theme.navy).padding(size * 0.06)
            }
        }
        .frame(width: size, height: size)
    }

    @ViewBuilder private var content: some View {
        switch style {
        case .blank:
            EmptyView()
        case .question:
            Text("?").font(.system(size: size * 0.45, weight: .bold, design: .rounded)).foregroundStyle(Theme.mint)
        default:
            if let e = element {
                VStack(spacing: 0) {
                    Text("\(e.number)").font(.system(size: size * 0.2, weight: .medium)).opacity(0.8)
                    Text(e.symbol).font(.system(size: size * 0.38, weight: .bold, design: .rounded))
                    if showName {
                        Text(e.nameKo).font(.system(size: size * 0.16)).lineLimit(1).minimumScaleFactor(0.6)
                    }
                }
                .foregroundStyle(textColor)
            }
        }
    }

    private var fill: Color {
        switch style {
        case .learning: return Theme.mint
        case .mastered: return Theme.gold
        case .question: return Theme.mint.opacity(0.15)
        case .outOfScope: return Theme.navyRaised.opacity(0.4)
        default: return Theme.navyRaised
        }
    }

    private var stroke: Color {
        switch style {
        case .question: return Theme.mint
        case .outOfScope: return Theme.navyLine.opacity(0.4)
        default: return Theme.navyLine
        }
    }

    private var textColor: Color {
        switch style {
        case .learning, .mastered: return Theme.navy
        case .outOfScope: return .white.opacity(0.35)
        default: return .white
        }
    }
}

/// Lays out cells in their real periodic-table positions (18 columns; f-block rows below a gap).
struct PeriodicGrid<Cell: View>: View {
    let catalog: ElementCatalog
    let numbers: [Int]
    var cellSize: CGFloat = 44
    var spacing: CGFloat = 4
    @ViewBuilder let cell: (Element) -> Cell

    private var rows: [Int] { Array(Set(numbers.map { catalog[$0].displayRow })).sorted() }
    private var pitch: CGFloat { cellSize + spacing }

    func rowOffset(_ row: Int) -> CGFloat {
        let index = CGFloat(rows.firstIndex(of: row) ?? 0)
        let gap: CGFloat = (row >= 9 && rows.contains(where: { $0 < 9 })) ? cellSize * 0.4 : 0
        return index * pitch + gap
    }

    var size: CGSize {
        let height = rows.last.map { rowOffset($0) + cellSize } ?? 0
        return CGSize(width: 18 * pitch - spacing, height: height)
    }

    /// Hit-test a point in the grid's own coordinates (used for drag-and-drop).
    func element(at point: CGPoint) -> Int? {
        numbers.first { n in
            let e = catalog[n]
            let origin = CGPoint(x: CGFloat(e.displayColumn - 1) * pitch, y: rowOffset(e.displayRow))
            return CGRect(origin: origin, size: CGSize(width: cellSize, height: cellSize)).contains(point)
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            ForEach(numbers, id: \.self) { n in
                let e = catalog[n]
                cell(e)
                    .frame(width: cellSize, height: cellSize)
                    .offset(x: CGFloat(e.displayColumn - 1) * pitch, y: rowOffset(e.displayRow))
            }
        }
        .frame(width: size.width, height: size.height, alignment: .topLeading)
    }
}

/// "3주기 1족" — used for hints and VoiceOver labels of blank cells.
func positionText(_ e: Element) -> String {
    if let g = e.group { return L("position.periodGroup", e.period, g) }
    return L(e.category == "lanthanide" ? "position.lanthanide" : "position.actinide", e.period)
}
