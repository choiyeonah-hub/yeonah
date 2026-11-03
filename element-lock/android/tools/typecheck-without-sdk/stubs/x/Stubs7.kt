@file:Suppress("unused", "UNUSED_PARAMETER")
package androidx.lifecycle.compose
import androidx.compose.runtime.Composable
class LifecyclePauseOrDisposeEffectResult
class LifecycleResumePauseEffectScope { fun onPauseOrDispose(block: () -> Unit) = LifecyclePauseOrDisposeEffectResult() }
@Composable fun LifecycleResumeEffect(key1: Any?, effects: LifecycleResumePauseEffectScope.() -> LifecyclePauseOrDisposeEffectResult) {}
