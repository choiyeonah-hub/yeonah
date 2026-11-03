import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Group {
            if model.learning.settings.onboardingDone {
                TabView {
                    HomeView().tabItem { Label(L("tab.home"), systemImage: "house") }
                    MyTableView().tabItem { Label(L("tab.table"), systemImage: "square.grid.3x3") }
                    SettingsView().tabItem { Label(L("tab.settings"), systemImage: "gearshape") }
                }
            } else {
                OnboardingView()
            }
        }
        .background(Theme.navy.ignoresSafeArea())
        .alert(L("error.learningUnreadable.title"), isPresented: .constant(model.learningUnreadable)) {
            Button(L("error.learningUnreadable.reset"), role: .destructive) { model.resetUnreadableLearning() }
        } message: {
            Text(L("error.learningUnreadable.body"))
        }
    }
}
