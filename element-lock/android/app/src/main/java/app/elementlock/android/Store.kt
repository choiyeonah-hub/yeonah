package app.elementlock.android

import android.content.Context
import app.elementlock.core.LearningState
import app.elementlock.core.StateCodec
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Local persistence (SharedPreferences, app-private, no backup, no network).
 * The app UI and the accessibility service run in the same process and share this one instance.
 */
class Store(context: Context) {
    private val prefs = context.getSharedPreferences("element_lock", Context.MODE_PRIVATE)

    /** true when saved learning data could not be read; the raw text was kept under [KEY_BACKUP]. */
    val recoveredFromCorruption: Boolean

    private val _state: MutableStateFlow<LearningState>
    val state: StateFlow<LearningState> get() = _state

    private val _blocked = MutableStateFlow(prefs.getStringSet(KEY_BLOCKED, emptySet())!!.toSet())
    val blockedPackages: StateFlow<Set<String>> get() = _blocked

    init {
        val raw = prefs.getString(KEY_STATE, null)
        val decoded = raw?.let(StateCodec::decode)
        recoveredFromCorruption = raw != null && decoded == null
        if (recoveredFromCorruption) prefs.edit().putString(KEY_BACKUP, raw).apply()
        _state = MutableStateFlow(decoded ?: LearningState())
    }

    @Synchronized
    fun update(transform: (LearningState) -> LearningState): LearningState {
        val next = transform(_state.value)
        // commit(): the state must be on disk before we act on it (e.g. before lifting a block).
        prefs.edit().putString(KEY_STATE, StateCodec.encode(next)).commit()
        _state.value = next
        return next
    }

    @Synchronized
    fun setBlocked(packages: Set<String>) {
        prefs.edit().putStringSet(KEY_BLOCKED, packages).commit()
        _blocked.value = packages
    }

    private companion object {
        const val KEY_STATE = "learning.v1"
        const val KEY_BACKUP = "learning.v1.unreadable-backup"
        const val KEY_BLOCKED = "blocked-packages.v1"
    }
}
