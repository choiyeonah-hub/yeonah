package app.elementlock.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import app.elementlock.android.ui.ElementLockApp
import app.elementlock.android.ui.ElementLockTheme

class MainActivity : ComponentActivity() {
    /** Set when opened from the block screen's "문제 풀기" button. */
    private val startUnlock = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startUnlock.value = intent.getBooleanExtra(EXTRA_START_UNLOCK, false)
        setContent {
            ElementLockTheme {
                ElementLockApp(controller, startUnlock.value) { startUnlock.value = false }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(EXTRA_START_UNLOCK, false)) startUnlock.value = true
    }

    companion object {
        const val EXTRA_START_UNLOCK = "start_unlock"
    }
}
