import ElementLockCore
import SwiftUI

/// Overview of the whole table. Small cells are fine here; quizzes use the zoomable view.
struct MyTableView: View {
    @EnvironmentObject private var model: AppModel
    @State private var selected: Element?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    legend
                    ScrollView(.horizontal) {
                        PeriodicGrid(catalog: model.catalog, numbers: model.catalog.elements.map(\.number), cellSize: 36, spacing: 3) { e in
                            Button { selected = e } label: { ElementTile(element: e, style: style(e), size: 36) }
                                .buttonStyle(.plain)
                                .accessibilityLabel(a11yLabel(e))
                        }
                        .padding(8)
                    }
                    reviewList
                }
                .padding(16)
            }
            .background(Theme.navy.ignoresSafeArea())
            .navigationTitle(L("tab.table"))
            .sheet(item: $selected) { e in ElementDetail(element: e).presentationDetents([.medium]) }
        }
    }

    private func style(_ e: Element) -> TileStyle {
        guard model.learning.settings.scope.contains(e.number) else { return .outOfScope }
        let r = model.learning.records[e.number]
        if ReviewScheduler.isMastered(r) { return .mastered }
        if (r?.seenCount ?? 0) > 0 { return .learning }
        return .plain
    }

    private func a11yLabel(_ e: Element) -> String {
        let state: String
        switch style(e) {
        case .mastered: state = L("legend.mastered")
        case .learning: state = L("legend.learning")
        case .outOfScope: state = L("legend.outOfScope")
        default: state = L("legend.new")
        }
        return "\(e.displayNameKo), \(e.symbol), \(state)"
    }

    private var legend: some View {
        HStack(spacing: 14) {
            legendItem(.plain, L("legend.new"))
            legendItem(.learning, L("legend.learning"))
            legendItem(.mastered, L("legend.mastered"))
        }
        .font(.footnote)
        .foregroundStyle(Theme.secondaryText)
    }

    private func legendItem(_ style: TileStyle, _ text: String) -> some View {
        HStack(spacing: 6) {
            ElementTile(element: nil, style: style, size: 22).accessibilityHidden(true)
            Text(text)
        }
    }

    /// Elements due for review now, most urgent first (same order the quiz uses).
    private var reviewList: some View {
        let now = millis(Date())
        let due = model.scopeElements.filter { e in
            guard let r = model.learning.records[e.number] else { return false }
            return r.dueAtMillis <= now && r.lastOutcome != .firstTry
        }
        return VStack(alignment: .leading, spacing: 8) {
            Text(L("review.title")).font(.headline).foregroundStyle(.white)
            if due.isEmpty {
                Text(L("review.none")).foregroundStyle(Theme.secondaryText)
            } else {
                ForEach(due) { e in
                    Text("\(e.symbol)  \(e.displayNameKo)").foregroundStyle(.white)
                }
            }
        }
    }
}

struct ElementDetail: View {
    @EnvironmentObject private var model: AppModel
    let element: Element

    var body: some View {
        let r = model.learning.records[element.number]
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 16) {
                ElementTile(element: element, style: .plain, size: 72)
                VStack(alignment: .leading) {
                    Text(element.displayNameKo).font(.title2.weight(.bold))
                    Text(element.nameEn).foregroundStyle(Theme.secondaryText)
                }
            }
            Text(positionText(element))
            Text(L("category." + element.category)).foregroundStyle(Theme.secondaryText)
            Divider()
            Text(L("detail.firstTryDays", r?.firstTryDays.count ?? 0, ReviewScheduler.masteryDays))
            Text(L("detail.answers", r?.unlockAnswers ?? 0, r?.practiceAnswers ?? 0))
                .foregroundStyle(Theme.secondaryText)
        }
        .foregroundStyle(.white)
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.navy.ignoresSafeArea())
    }
}
