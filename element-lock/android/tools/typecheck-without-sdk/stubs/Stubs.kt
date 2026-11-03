// Minimal stand-ins for Android-only libraries, used ONLY to type-check app sources on a machine
// without the Android SDK. Signatures mirror the real APIs that the app calls.
@file:Suppress("unused", "UNUSED_PARAMETER")
package androidx.activity

open class ComponentActivity : android.app.Activity() {
    val onBackPressedDispatcher = OnBackPressedDispatcher()
}
class OnBackPressedDispatcher { fun addCallback(owner: Any, cb: OnBackPressedCallback) {} }
abstract class OnBackPressedCallback(enabled: Boolean) { abstract fun handleOnBackPressed() }
