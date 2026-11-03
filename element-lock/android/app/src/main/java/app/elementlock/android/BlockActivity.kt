package app.elementlock.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.elementlock.android.ui.ElementLockTheme
import app.elementlock.android.ui.PrimaryButton
import app.elementlock.android.ui.SecondaryButton
import app.elementlock.android.ui.Tokens

/**
 * Covers a restricted app. It never shows that app's content and never brings it back:
 * Back goes to the home screen. It closes itself as soon as it is no longer visible, so leaving
 * the restricted app also removes the block screen.
 */
class BlockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = goHome()
        })
        val minutes = controller.store.state.value.settings.allowance.minutes
        setContent {
            ElementLockTheme {
                Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(stringResource(R.string.block_title), style = Tokens.title, modifier = Modifier.semantics { heading() })
                    Spacer(Modifier.height(12.dp))
                    Text(stringResource(R.string.block_body, minutes), style = Tokens.body)
                    Spacer(Modifier.height(8.dp))
                    Text(stringResource(R.string.block_phone_note), style = Tokens.caption)
                    Spacer(Modifier.height(24.dp))
                    PrimaryButton(stringResource(R.string.block_solve)) {
                        startActivity(
                            Intent(this@BlockActivity, MainActivity::class.java)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                .putExtra(MainActivity.EXTRA_START_UNLOCK, true),
                        )
                        finish()
                    }
                    Spacer(Modifier.height(12.dp))
                    SecondaryButton(stringResource(R.string.block_home)) { goHome() }
                }
            }
        }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    override fun onStop() {
        super.onStop()
        if (!isChangingConfigurations) finish()
    }

    companion object {
        const val EXTRA_PACKAGE = "package"
    }
}
