package app.elementlock.android

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import app.elementlock.core.BlockPolicy
import app.elementlock.core.IntervalEndDecision
import app.elementlock.core.UnlockRules
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Detects when a user-selected app comes to the foreground and covers it with [BlockActivity].
 *
 * Data use: only `event.packageName` of window-state-changed events is read. Screen content, typed
 * text and messages are not requested (canRetrieveWindowContent=false), not read and not stored.
 * Nothing leaves the device.
 *
 * No polling: the service reacts to window events, plus one delayed check at the end of a grant
 * (so an app that is already open gets covered when time runs out).
 */
class ElementLockAccessibilityService : AccessibilityService() {
    private val handler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var lastPackage: String? = null
    private var policy: BlockPolicy.Context? = null

    override fun onServiceConnected() {
        running = true
        val c = controller
        policy = c.policyContext()
        scope.launch {
            c.store.state.map { it.unlock.activeGrant }.distinctUntilChanged().collect { grant ->
                handler.removeCallbacksAndMessages(null)
                if (grant != null) {
                    val delay = (grant.expiresAtMillis - System.currentTimeMillis()).coerceAtLeast(0) + 500
                    handler.postDelayed({ onGrantTimer(grant.sessionId) }, delay)
                }
            }
        }
        scope.launch { c.store.state.collect { refreshPolicy() } }
        scope.launch { c.store.blockedPackages.collect { refreshPolicy() } }
    }

    private fun refreshPolicy() {
        policy = controller.policyContext()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        // The notification shade and keyboard are overlays, not the app the user is in.
        if (pkg == "com.android.systemui" || isKeyboard(pkg)) return
        lastPackage = pkg
        evaluate(pkg)
    }

    private fun isKeyboard(pkg: String) =
        getSystemService(android.view.inputmethod.InputMethodManager::class.java)
            ?.enabledInputMethodList?.any { it.packageName == pkg } == true

    private fun onGrantTimer(sessionId: String) {
        val c = controller
        when (val d = UnlockRules.onIntervalEnded(c.store.state.value.unlock, sessionId, System.currentTimeMillis())) {
            is IntervalEndDecision.Reblock -> {
                c.store.update { it.copy(unlock = d.newState) }
                lastPackage?.let(::evaluate)
            }
            IntervalEndDecision.IgnoreEarly -> handler.postDelayed({ onGrantTimer(sessionId) }, 1_000)
            IntervalEndDecision.IgnoreStale -> Unit
        }
    }

    private fun evaluate(pkg: String) {
        // Re-check the clock every time: a delayed timer (Doze) must not leave a restricted app open.
        val base = policy ?: return
        val unlock = controller.store.state.value.unlock
        val p = base.copy(allowing = UnlockRules.isAllowing(unlock, System.currentTimeMillis()))
        if (BlockPolicy.decide(pkg, p) == BlockPolicy.Action.BLOCK) {
            startActivity(
                Intent(this, BlockActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    .putExtra(BlockActivity.EXTRA_PACKAGE, pkg),
            )
        }
    }

    override fun onInterrupt() = Unit

    override fun onUnbind(intent: Intent?): Boolean {
        stop()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        stop()
        super.onDestroy()
    }

    private fun stop() {
        running = false
        handler.removeCallbacksAndMessages(null)
        scope.cancel()
    }

    companion object {
        /** Same process as the UI, so the UI can tell "enabled in Settings" from "actually running". */
        @Volatile
        var running = false
            private set
    }
}
