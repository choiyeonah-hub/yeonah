package app.elementlock.android

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.telecom.TelecomManager
import android.view.inputmethod.InputMethodManager
import app.elementlock.core.AnswerResult
import app.elementlock.core.BlockPolicy
import app.elementlock.core.ElementCatalog
import app.elementlock.core.GrantDecision
import app.elementlock.core.LockInputs
import app.elementlock.core.LockStatus
import app.elementlock.core.QuestionFactory
import app.elementlock.core.QuizAttempt
import app.elementlock.core.QuizPurpose
import app.elementlock.core.ReviewOutcome
import app.elementlock.core.ReviewScheduler
import app.elementlock.core.Settings as LearningSettings
import app.elementlock.core.UnlockRules
import app.elementlock.core.deriveStatus
import app.elementlock.core.validateScope
import java.time.LocalDate
import java.util.UUID
import kotlin.random.Random

/** App-wide logic shared by the UI and the accessibility service. Mirrors iOS AppModel. */
class AppController(private val context: Context) {
    val catalog: ElementCatalog = ElementCatalog.fromJson(context.assets.open("elements.json").use { it.readBytes().decodeToString() })
    val store = Store(context)
    private var lastTarget: Int? = null

    // Status

    fun isServiceEnabled(): Boolean {
        val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(context, ElementLockAccessibilityService::class.java)
        return enabled.split(':').any { ComponentName.unflattenFromString(it) == me }
    }

    fun status(quizInProgress: Boolean, now: Long = System.currentTimeMillis()): LockStatus {
        val s = store.state.value
        return deriveStatus(
            LockInputs(
                permissionGranted = isServiceEnabled(),
                // Same process: if the service is enabled but not bound (force-stopped, crashed, killed
                // by the vendor's battery manager) this is false and we show an error, not "active".
                enforcerRunning = ElementLockAccessibilityService.running,
                enabledByUser = s.settings.lockEnabled,
                hasSelectedApps = store.blockedPackages.value.isNotEmpty(),
                unlock = s.unlock,
                nowMillis = now,
                quizInProgress = quizInProgress,
                lastError = null,
            ),
        )
    }

    fun openAccessibilitySettings() {
        context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // Packages

    /** Default dialer, launcher(s) and keyboard on this device. These are never blocked or offered. */
    fun deviceAllowedPackages(): Set<String> {
        val pm = context.packageManager
        val result = mutableSetOf<String>()
        context.getSystemService(TelecomManager::class.java)?.defaultDialerPackage?.let(result::add)
        pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)
            .mapTo(result) { it.activityInfo.packageName }
        context.getSystemService(InputMethodManager::class.java)?.enabledInputMethodList?.mapTo(result) { it.packageName }
        return result
    }

    fun policyContext(): BlockPolicy.Context {
        val s = store.state.value
        return BlockPolicy.Context(
            ownPackage = context.packageName,
            deviceAllowed = deviceAllowedPackages(),
            blockedPackages = store.blockedPackages.value,
            lockEnabled = s.settings.lockEnabled,
            allowing = UnlockRules.isAllowing(s.unlock, System.currentTimeMillis()),
        )
    }

    fun saveBlockedPackages(packages: Set<String>) = store.setBlocked(BlockPolicy.sanitize(packages, policyContext()))

    // Settings

    fun updateSettings(change: (LearningSettings) -> LearningSettings) {
        store.update { it.copy(settings = change(it.settings)) }
    }

    fun setLockEnabled(on: Boolean) {
        store.update { s ->
            // Pausing also ends any running allowance, so turning it back on starts from "restricted".
            s.copy(settings = s.settings.copy(lockEnabled = on), unlock = if (on) s.unlock else s.unlock.copy(activeGrant = null))
        }
    }

    // Quiz

    fun makeAttempt(purpose: QuizPurpose): QuizAttempt? {
        val s = store.state.value
        val scope = s.settings.scope
        if (validateScope(scope) != null) return null
        val random = Random.Default
        val target = ReviewScheduler.next(scope, s.records, System.currentTimeMillis(), random, avoid = lastTarget)
        lastTarget = target
        val mode = QuestionFactory.pickMode(scope.size, random)
        return QuizAttempt(QuestionFactory.make(UUID.randomUUID().toString(), mode, target, scope, purpose, catalog, random))
    }

    /** Tap and drop both end here. Learning is recorded once, when the question is solved. */
    fun submit(attempt: QuizAttempt, choice: Int): AnswerResult {
        val result = attempt.answer(choice)
        if (result is AnswerResult.Correct) record(attempt)
        return result
    }

    fun abandon(attempt: QuizAttempt) {
        if (!attempt.solved && attempt.reviewOutcome == ReviewOutcome.FAILED) record(attempt)
    }

    private fun record(attempt: QuizAttempt) {
        val now = System.currentTimeMillis()
        store.update { it.record(attempt, now, LocalDate.now().toString()) }
    }

    /** The service observes the stored grant and schedules the re-block check itself. */
    fun redeem(attempt: QuizAttempt): GrantDecision {
        var decision: GrantDecision? = null
        store.update { s ->
            val d = UnlockRules.requestGrant(s.unlock, attempt, System.currentTimeMillis(), s.settings.allowance, UUID.randomUUID().toString())
            decision = d
            if (d is GrantDecision.Granted) s.copy(unlock = d.newState) else s
        }
        return decision!!
    }

    fun today(): String = LocalDate.now().toString()
}
