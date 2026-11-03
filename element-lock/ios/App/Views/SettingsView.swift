import ElementLockCore
import FamilyControls
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @State private var pickerShown = false
    @State private var pickerSelection = FamilyActivitySelection()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle(L("settings.lock"), isOn: Binding(
                        get: { model.learning.settings.lockEnabled },
                        set: { model.setLockEnabled($0) }
                    ))
                    if !model.isAuthorized {
                        Button(L("onboarding.permission.request")) { Task { await model.requestAuthorization() } }
                    }
                    Button(L("settings.apps")) {
                        pickerSelection = model.selection
                        pickerShown = true
                    }
                    .disabled(!model.isAuthorized)
                    Text(L("settings.apps.count", model.selection.applicationTokens.count,
                           model.selection.categoryTokens.count, model.selection.webDomainTokens.count))
                        .font(.footnote).foregroundStyle(Theme.secondaryText)
                } header: { Text(L("settings.section.lock")) } footer: { Text(L("settings.lock.footer")) }

                Section(L("settings.section.learning")) {
                    Picker(L("settings.allowance"), selection: Binding(
                        get: { model.learning.settings.allowance },
                        set: { v in model.updateSettings { $0.allowance = v } }
                    )) {
                        ForEach(AllowanceMinutes.allCases, id: \.self) { Text(L("settings.minutes", $0.rawValue)).tag($0) }
                    }
                    NavigationLink(L("settings.scope")) { ScopeEditorView() }
                    Toggle(L("settings.haptics"), isOn: Binding(
                        get: { model.learning.settings.hapticsEnabled },
                        set: { v in model.updateSettings { $0.hapticsEnabled = v } }
                    ))
                }

                Section(L("settings.section.help")) {
                    ForEach(1...5, id: \.self) { i in
                        DisclosureGroup(L("help.q\(i)")) { Text(L("help.a\(i)")).font(.callout) }
                    }
                }

                Section {
                    if model.diagnostics.isEmpty {
                        Text(L("settings.diagnostics.empty")).foregroundStyle(Theme.secondaryText)
                    }
                    ForEach(model.diagnostics, id: \.self) { Text($0).font(.caption.monospaced()) }
                } header: { Text(L("settings.section.diagnostics")) } footer: { Text(L("settings.diagnostics.footer")) }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.navy.ignoresSafeArea())
            .navigationTitle(L("tab.settings"))
            .familyActivityPicker(isPresented: $pickerShown, selection: $pickerSelection)
            .onChange(of: pickerSelection) { model.saveSelection($0) }
        }
    }
}

/// Presets plus element-by-element selection. An empty selection cannot be saved.
struct ScopeEditorView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Set<Int> = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Button(L("scope.basic.short")) { draft = StudyRanges.basic }
                    Button(L("scope.extended.short")) { draft = StudyRanges.extended }
                    Button(L("scope.all.short")) { draft = StudyRanges.all }
                    Button(L("scope.clear")) { draft = [] }
                }
                .buttonStyle(.bordered)
                ScrollView(.horizontal) {
                    PeriodicGrid(catalog: model.catalog, numbers: model.catalog.elements.map(\.number), cellSize: 40, spacing: 3) { e in
                        let on = draft.contains(e.number)
                        Button {
                            if on { draft.remove(e.number) } else { draft.insert(e.number) }
                        } label: {
                            ElementTile(element: e, style: on ? .learning : .outOfScope, size: 40)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(e.nameKo), \(e.symbol)")
                        .accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
                Text(L("scope.count", draft.count)).foregroundStyle(Theme.secondaryText)
                if validateScope(draft) == .empty {
                    Label(L("scope.empty"), systemImage: "exclamationmark.circle").foregroundStyle(Theme.warning)
                }
                Button(L("common.save")) {
                    model.updateSettings { $0.scope = draft }
                    dismiss()
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(validateScope(draft) != nil)
            }
            .padding(16)
        }
        .background(Theme.navy.ignoresSafeArea())
        .navigationTitle(L("settings.scope"))
        .onAppear { draft = model.learning.settings.scope }
    }
}
