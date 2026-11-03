import ElementLockCore
import SwiftUI

private enum Feedback: Equatable { case none, wrong, correct(firstTry: Bool) }

/// Unlock or practice quiz. Unlock answers can grant time; practice answers never do.
struct QuizView: View {
    let purpose: QuizPurpose
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var attempt: QuizAttempt?
    @State private var feedback: Feedback = .none
    @State private var wrongChoices: Set<Int> = []
    @State private var showHint = false
    @State private var redeemResult: RedeemResult?
    @State private var celebrate = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.navy.ignoresSafeArea()
                if let attempt {
                    content(attempt)
                } else {
                    emptyScope
                }
            }
            .navigationTitle(L(purpose == .unlock ? "quiz.title.unlock" : "quiz.title.practice"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L("common.close")) { dismiss() }
                }
            }
        }
        .onAppear {
            if attempt == nil { next() }
            model.quizInProgress = purpose == .unlock
        }
        .onDisappear {
            if let attempt { model.abandon(attempt) }
            model.quizInProgress = false
        }
    }

    private var emptyScope: some View {
        VStack(spacing: 12) {
            Image(systemName: "square.dashed").font(.largeTitle)
            Text(L("scope.empty")).multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.secondaryText)
        .padding()
    }

    @ViewBuilder
    private func content(_ attempt: QuizAttempt) -> some View {
        let q = attempt.question
        let target = model.catalog[q.target]
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(prompt(q, target))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)

                switch q.mode {
                case .placeOnTable:
                    PlaceQuestionView(question: q, catalog: model.catalog, scope: model.learning.settings.scope,
                                      locked: attempt.solved, onAnswer: answer)
                case .fillBlank:
                    PeriodicGrid(catalog: model.catalog, numbers: QuestionFactory.regionCells(scope: model.learning.settings.scope, catalog: model.catalog), cellSize: 30, spacing: 3) { e in
                        ElementTile(element: e, style: e.number == q.target ? .question : (model.learning.settings.scope.contains(e.number) ? .plain : .outOfScope), size: 30)
                    }
                    .accessibilityHidden(true)
                    .frame(maxWidth: .infinity)
                    .fitOrScroll()
                    Text(L("quiz.fill.position", positionText(target))).font(.subheadline).foregroundStyle(Theme.secondaryText)
                    choices(q, attempt, labelBy: .symbolAndName)
                case .symbolToName:
                    HStack { Spacer(); ElementTile(element: target, style: .plain, size: 96); Spacer() }
                        .accessibilityLabel(L("a11y.symbol", target.symbol))
                    choices(q, attempt, labelBy: .name)
                case .nameToSymbol:
                    choices(q, attempt, labelBy: .symbol)
                }

                feedbackArea(attempt, target: target)
            }
            .padding(16)
        }
    }

    private func prompt(_ q: Question, _ e: Element) -> String {
        switch q.mode {
        case .placeOnTable: return L("quiz.place.prompt", e.displayNameKo, e.symbol)
        case .fillBlank: return L("quiz.fill.prompt")
        case .symbolToName: return L("quiz.symbolToName.prompt", e.symbol)
        case .nameToSymbol: return L("quiz.nameToSymbol.prompt", e.displayNameKo)
        }
    }

    private enum ChoiceLabel { case name, symbol, symbolAndName }

    private func choices(_ q: Question, _ attempt: QuizAttempt, labelBy: ChoiceLabel) -> some View {
        VStack(spacing: 10) {
            ForEach(q.options, id: \.self) { n in
                let e = model.catalog[n]
                let wrong = wrongChoices.contains(n)
                let isAnswer = attempt.solved && n == q.target
                Button { answer(n) } label: {
                    HStack {
                        switch labelBy {
                        case .name: Text(e.displayNameKo)
                        case .symbol: Text(e.symbol).font(.title2.weight(.bold))
                        case .symbolAndName: Text("\(e.symbol)  \(e.displayNameKo)")
                        }
                        Spacer()
                        if wrong { Image(systemName: "xmark").accessibilityLabel(L("a11y.wrongChoice")) }
                        if isAnswer { Image(systemName: "checkmark").accessibilityLabel(L("a11y.correctChoice")) }
                    }
                    .font(.body.weight(.medium))
                    .padding(.horizontal, 16)
                    .frame(minHeight: 52)
                    .foregroundStyle(isAnswer ? Theme.navy : .white.opacity(wrong ? 0.5 : 1))
                    .background(RoundedRectangle(cornerRadius: 12).fill(isAnswer ? Theme.mint : Theme.navyRaised))
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.navyLine))
                }
                .disabled(attempt.solved || wrong)
            }
        }
    }

    @ViewBuilder
    private func feedbackArea(_ attempt: QuizAttempt, target: Element) -> some View {
        switch feedback {
        case .none:
            Button(L("quiz.hint.button")) { attempt.useHint(); showHint = true }
                .font(.subheadline)
                .disabled(showHint)
            if showHint { hint(target, mode: attempt.question.mode) }
        case .wrong:
            VStack(alignment: .leading, spacing: 8) {
                Label(L("quiz.wrong"), systemImage: "arrow.uturn.backward.circle")
                    .foregroundStyle(Theme.warning)
                if showHint {
                    hint(target, mode: attempt.question.mode)
                } else {
                    Button(L("quiz.hint.button")) { attempt.useHint(); showHint = true }
                }
            }
            .accessibilityElement(children: .combine)
        case .correct(let firstTry):
            VStack(alignment: .leading, spacing: 12) {
                Label(L(firstTry ? "quiz.correct.firstTry" : "quiz.correct.retry"), systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .foregroundStyle(Theme.mint)
                    .scaleEffect(celebrate || reduceMotion ? 1 : 0.6)
                    .opacity(celebrate || reduceMotion ? 1 : 0)
                Text(L("quiz.fact", target.displayNameKo, target.symbol, positionText(target)))
                    .foregroundStyle(Theme.secondaryText)
                if purpose == .unlock {
                    redeemView(attempt)
                } else {
                    Button(L("quiz.next")) { next() }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    private func hint(_ e: Element, mode: QuizMode) -> some View {
        let text: String
        switch mode {
        case .placeOnTable, .fillBlank: text = L("quiz.hint.position", positionText(e), L("category." + e.category))
        case .symbolToName: text = L("quiz.hint.nameStarts", String(e.nameKo.prefix(1)))
        case .nameToSymbol: text = L("quiz.hint.symbolStarts", String(e.symbol.prefix(1)))
        }
        return Label(text, systemImage: "lightbulb").foregroundStyle(Theme.secondaryText)
    }

    @ViewBuilder
    private func redeemView(_ attempt: QuizAttempt) -> some View {
        switch redeemResult {
        case .granted(let expiresAt)?:
            VStack(alignment: .leading, spacing: 8) {
                Text(L("unlock.granted", model.learning.settings.allowance.rawValue)).font(.headline)
                Text(L("unlock.granted.until", expiresAt.formatted(date: .omitted, time: .shortened)))
                Text(L("unlock.reopenApp")).foregroundStyle(Theme.secondaryText)
                Button(L("common.done")) { dismiss() }.buttonStyle(PrimaryButtonStyle())
            }
        case .scheduleFailed(let message)?:
            VStack(alignment: .leading, spacing: 8) {
                Label(L("unlock.failed"), systemImage: "exclamationmark.triangle").foregroundStyle(Theme.warning)
                Text(message).foregroundStyle(Theme.secondaryText)
                Button(L("common.retry")) { redeemResult = model.redeem(attempt) }.buttonStyle(PrimaryButtonStyle())
            }
        case .rejected(.stillAllowing)?:
            Text(L("unlock.alreadyAllowing")).foregroundStyle(Theme.secondaryText)
        case .rejected?:
            Text(L("unlock.notGranted")).foregroundStyle(Theme.secondaryText)
        case nil:
            ProgressView()
        }
    }

    private func answer(_ choice: Int) {
        guard let attempt else { return }
        switch model.submit(attempt, choice: choice) {
        case .correct(let firstTry, _):
            feedback = .correct(firstTry: firstTry)
            model.haptic(success: true)
            if reduceMotion { celebrate = true } else {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.6)) { celebrate = true }
            }
            if purpose == .unlock { redeemResult = model.redeem(attempt) }
            UIAccessibility.post(notification: .announcement, argument: L(firstTry ? "quiz.correct.firstTry" : "quiz.correct.retry"))
        case .incorrect:
            feedback = .wrong
            wrongChoices.insert(choice)
            model.haptic(success: false)
            UIAccessibility.post(notification: .announcement, argument: L("quiz.wrong"))
        case .ignored:
            break
        }
    }

    private func next() {
        if let attempt { model.abandon(attempt) }
        attempt = model.makeAttempt(purpose: purpose)
        feedback = .none
        wrongChoices = []
        showHint = false
        redeemResult = nil
        celebrate = false
    }
}

/// Placement mode: drag the tile onto a cell, or tap a cell. Both call the same `onAnswer`.
struct PlaceQuestionView: View {
    let question: Question
    let catalog: ElementCatalog
    let scope: Set<Int>
    let locked: Bool
    let onAnswer: (Int) -> Void

    @State private var cellSize: CGFloat = 44
    @State private var drag: CGSize = .zero
    @State private var gridFrame: CGRect = .zero
    @State private var viewportFrame: CGRect = .zero

    var body: some View {
        let grid = PeriodicGrid(catalog: catalog, numbers: question.options, cellSize: cellSize, spacing: 4) { e in
            Button { onAnswer(e.number) } label: {
                ElementTile(element: e, style: locked && e.number == question.target ? .learning : (scope.contains(e.number) ? .blank : .outOfScope), size: cellSize)
            }
            .buttonStyle(.plain)
            .disabled(locked)
            .accessibilityLabel(positionText(e))
            .accessibilityHint(L("a11y.placeHere"))
        }
        VStack(alignment: .leading, spacing: 12) {
            ScrollView([.horizontal, .vertical]) {
                grid
                    .padding(8)
                    .background(GeometryReader { g in
                        Color.clear.preference(key: FrameKey.self, value: g.frame(in: .global).insetBy(dx: 8, dy: 8))
                    })
            }
            .frame(height: min(grid.size.height + 16, 340))
            .background(RoundedRectangle(cornerRadius: 12).fill(Theme.navy.opacity(0.6)))
            .background(GeometryReader { g in Color.clear.preference(key: ViewportKey.self, value: g.frame(in: .global)) })
            .onPreferenceChange(FrameKey.self) { gridFrame = $0 }
            .onPreferenceChange(ViewportKey.self) { viewportFrame = $0 }

            HStack {
                Text(L("quiz.place.instructions")).font(.footnote).foregroundStyle(Theme.secondaryText)
                Spacer()
                Button { cellSize = max(34, cellSize - 8) } label: { Image(systemName: "minus.magnifyingglass") }
                    .accessibilityLabel(L("a11y.zoomOut"))
                Button { cellSize = min(64, cellSize + 8) } label: { Image(systemName: "plus.magnifyingglass") }
                    .accessibilityLabel(L("a11y.zoomIn"))
            }

            HStack {
                Spacer()
                ElementTile(element: catalog[question.target], style: .plain, size: 72, showName: true)
                    .shadow(color: .black.opacity(drag == .zero ? 0 : 0.4), radius: 8)
                    .offset(drag)
                    .gesture(
                        DragGesture(coordinateSpace: .global)
                            .onChanged { if !locked { drag = $0.translation } }
                            .onEnded { value in
                                defer { withAnimation(.easeOut(duration: 0.2)) { drag = .zero } }
                                guard !locked, viewportFrame.contains(value.location) else { return }
                                let p = CGPoint(x: value.location.x - gridFrame.minX, y: value.location.y - gridFrame.minY)
                                if let n = grid.element(at: p) { onAnswer(n) }
                            }
                    )
                    .accessibilityLabel(L("a11y.dragTile", catalog[question.target].displayNameKo, catalog[question.target].symbol))
                Spacer()
            }
        }
    }
}

private struct FrameKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) { value = nextValue() }
}

private struct ViewportKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) { value = nextValue() }
}

private extension View {
    /// Shows a fixed-size grid as is when it fits, otherwise lets it scroll horizontally instead of clipping.
    func fitOrScroll() -> some View {
        ViewThatFits(in: .horizontal) {
            self
            ScrollView(.horizontal) { self }
        }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(Theme.navy)
            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.mint.opacity(configuration.isPressed ? 0.7 : 1)))
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(.white)
            .background(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.navyLine, lineWidth: 1.5))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
