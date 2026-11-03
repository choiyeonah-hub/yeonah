package app.elementlock.android.ui

import android.os.Build
import android.provider.Settings
import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import app.elementlock.android.AppController
import app.elementlock.android.R
import app.elementlock.core.AnswerResult
import app.elementlock.core.Element
import app.elementlock.core.GrantDecision
import app.elementlock.core.QuestionFactory
import app.elementlock.core.QuizAttempt
import app.elementlock.core.QuizMode
import app.elementlock.core.QuizPurpose
import kotlin.math.roundToInt

private sealed interface Feedback {
    data object None : Feedback
    data object Wrong : Feedback
    data class Correct(val firstTry: Boolean) : Feedback
}

@Composable
fun QuizScreen(c: AppController, purpose: QuizPurpose, onClose: () -> Unit) {
    val context = LocalContext.current
    val view = LocalView.current
    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    val learning by c.store.state.collectAsState()
    var round by remember { mutableIntStateOf(0) }
    val attempt: QuizAttempt? = remember(round) { c.makeAttempt(purpose) }
    var feedback by remember(round) { mutableStateOf<Feedback>(Feedback.None) }
    var wrong by remember(round) { mutableStateOf(setOf<Int>()) }
    var showHint by remember(round) { mutableStateOf(false) }
    var grant by remember(round) { mutableStateOf<GrantDecision?>(null) }
    val pop = remember(round) { Animatable(if (reduceMotion) 1f else 0.6f) }

    DisposableEffect(attempt) { onDispose { attempt?.let(c::abandon) } }

    fun answer(choice: Int) {
        val a = attempt ?: return
        when (val r = c.submit(a, choice)) {
            is AnswerResult.Correct -> {
                feedback = Feedback.Correct(r.firstTry)
                if (c.store.state.value.settings.hapticsEnabled) view.performHapticFeedback(if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY)
                if (purpose == QuizPurpose.UNLOCK) grant = c.redeem(a)
            }
            AnswerResult.Incorrect -> {
                feedback = Feedback.Wrong
                wrong = wrong + choice
                // Deliberately gentle: a single light tick, no long vibration.
                if (c.store.state.value.settings.hapticsEnabled) view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            }
            AnswerResult.Ignored -> Unit
        }
    }

    LaunchedEffect(feedback) {
        if (feedback is Feedback.Correct && !reduceMotion) pop.animateTo(1f, spring(dampingRatio = 0.5f))
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                stringResource(if (purpose == QuizPurpose.UNLOCK) R.string.quiz_title_unlock else R.string.quiz_title_practice),
                style = Tokens.headline, modifier = Modifier.weight(1f).semantics { heading() },
            )
            TextButton(onClick = onClose) { Text(stringResource(R.string.common_close)) }
        }
        if (attempt == null) {
            Text(stringResource(R.string.scope_empty), style = Tokens.body)
            return@Column
        }
        val q = attempt.question
        val target = c.catalog[q.target]
        val scope = learning.settings.scope
        Text(
            when (q.mode) {
                QuizMode.PLACE_ON_TABLE -> stringResource(R.string.quiz_place_prompt, target.nameKo, target.symbol)
                QuizMode.FILL_BLANK -> stringResource(R.string.quiz_fill_prompt)
                QuizMode.SYMBOL_TO_NAME -> stringResource(R.string.quiz_symbol_to_name_prompt, target.symbol)
                QuizMode.NAME_TO_SYMBOL -> stringResource(R.string.quiz_name_to_symbol_prompt, target.nameKo)
            },
            style = Tokens.headline,
        )
        when (q.mode) {
            QuizMode.PLACE_ON_TABLE -> PlaceQuestion(c, q.options, target, scope, attempt.solved, ::answer)
            QuizMode.FILL_BLANK -> {
                val layout = GridLayout(c.catalog, QuestionFactory.regionCells(scope, c.catalog), 30.dp, 3.dp)
                Box(Modifier.horizontalScroll(rememberScrollState())) {
                    PeriodicGrid(layout, c.catalog) { e ->
                        ElementTile(e, if (e.number == q.target) TileStyle.QUESTION else if (e.number in scope) TileStyle.PLAIN else TileStyle.OUT_OF_SCOPE, 30.dp)
                    }
                }
                Text(stringResource(R.string.quiz_fill_position, positionText(target)), style = Tokens.caption)
                Choices(c, q.options, q.target, attempt.solved, wrong, ChoiceLabel.SYMBOL_AND_NAME, ::answer)
            }
            QuizMode.SYMBOL_TO_NAME -> {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { ElementTile(target, TileStyle.PLAIN, 96.dp) }
                Choices(c, q.options, q.target, attempt.solved, wrong, ChoiceLabel.NAME, ::answer)
            }
            QuizMode.NAME_TO_SYMBOL -> Choices(c, q.options, q.target, attempt.solved, wrong, ChoiceLabel.SYMBOL, ::answer)
        }

        Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (val f = feedback) {
                Feedback.None, Feedback.Wrong -> {
                    if (f == Feedback.Wrong) Text(stringResource(R.string.quiz_wrong), style = Tokens.body.copy(color = Tokens.warning))
                    if (showHint) Text("💡 " + hintText(target, q.mode), style = Tokens.body)
                    else TextButton(onClick = { attempt.useHint(); showHint = true }) { Text(stringResource(R.string.quiz_hint_button)) }
                }
                is Feedback.Correct -> {
                    Text(
                        stringResource(if (f.firstTry) R.string.quiz_correct_first_try else R.string.quiz_correct_retry),
                        style = Tokens.headline.copy(color = Tokens.mint), modifier = Modifier.scale(pop.value),
                    )
                    Text(stringResource(R.string.quiz_fact, target.nameKo, target.symbol, positionText(target)), style = Tokens.caption)
                    if (purpose == QuizPurpose.UNLOCK) GrantResult(grant, learning.settings.allowance.minutes, onClose)
                    else PrimaryButton(stringResource(R.string.quiz_next)) { round++ }
                }
            }
        }
    }
}

@Composable
private fun GrantResult(grant: GrantDecision?, minutes: Int, onClose: () -> Unit) {
    when (grant) {
        is GrantDecision.Granted -> {
            Text(stringResource(R.string.unlock_granted, minutes), style = Tokens.headline)
            Text(stringResource(R.string.unlock_reopen_app), style = Tokens.caption)
            PrimaryButton(stringResource(R.string.common_done), onClick = onClose)
        }
        is GrantDecision.Rejected ->
            Text(stringResource(if (grant.reason == GrantDecision.Reason.STILL_ALLOWING) R.string.unlock_already_allowing else R.string.unlock_not_granted), style = Tokens.caption)
        null -> Unit
    }
}

private enum class ChoiceLabel { NAME, SYMBOL, SYMBOL_AND_NAME }

@Composable
private fun Choices(c: AppController, options: List<Int>, target: Int, solved: Boolean, wrong: Set<Int>, label: ChoiceLabel, onAnswer: (Int) -> Unit) {
    val wrongDesc = stringResource(R.string.a11y_wrong_choice)
    val rightDesc = stringResource(R.string.a11y_correct_choice)
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        for (n in options) {
            val e = c.catalog[n]
            val isWrong = n in wrong
            val isAnswer = solved && n == target
            val text = when (label) {
                ChoiceLabel.NAME -> e.nameKo
                ChoiceLabel.SYMBOL -> e.symbol
                ChoiceLabel.SYMBOL_AND_NAME -> "${e.symbol}  ${e.nameKo}"
            }
            Card(
                Modifier.heightIn(min = 52.dp)
                    .clickable(enabled = !solved && !isWrong) { onAnswer(n) }
                    .semantics { if (isWrong) contentDescription = "$text, $wrongDesc" else if (isAnswer) contentDescription = "$text, $rightDesc" },
                border = if (isAnswer) Tokens.mint else Tokens.line,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text, style = Tokens.body.copy(color = if (isWrong) Tokens.secondary else androidx.compose.ui.graphics.Color.White), modifier = Modifier.weight(1f))
                    if (isWrong) Icon(Icons.Filled.Close, null, tint = Tokens.secondary)
                    if (isAnswer) Icon(Icons.Filled.Check, null, tint = Tokens.mint)
                }
            }
        }
    }
}

/** Placement mode: drag the tile onto a cell, or tap a cell. Both call the same [onAnswer]. */
@Composable
private fun PlaceQuestion(c: AppController, cells: List<Int>, target: Element, scope: Set<Int>, locked: Boolean, onAnswer: (Int) -> Unit) {
    val density = LocalDensity.current
    var cellDp by remember { mutableIntStateOf(44) }
    val layout = remember(cells, cellDp) { GridLayout(c.catalog, cells, cellDp.dp, 4.dp) }
    var gridOrigin by remember { mutableStateOf(Offset.Zero) }
    var viewport by remember { mutableStateOf(Rect.Zero) }
    var tileOrigin by remember { mutableStateOf(Offset.Zero) }
    var drag by remember { mutableStateOf(Offset.Zero) }
    var touch by remember { mutableStateOf(Offset.Zero) }
    val placeHint = stringResource(R.string.a11y_place_here)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(
            Modifier.fillMaxWidth().heightIn(max = 340.dp)
                .onGloballyPositioned { viewport = it.boundsInRoot() }
                .horizontalScroll(rememberScrollState())
                .verticalScroll(rememberScrollState())
                .padding(8.dp),
        ) {
            PeriodicGrid(layout, c.catalog, Modifier.onGloballyPositioned { gridOrigin = it.positionInRoot() }) { e ->
                val style = if (locked && e.number == target.number) TileStyle.LEARNING else if (e.number in scope) TileStyle.BLANK else TileStyle.OUT_OF_SCOPE
                val position = positionText(e)
                ElementTile(
                    e, style, layout.cell,
                    Modifier.clickable(enabled = !locked) { onAnswer(e.number) }
                        .semantics { contentDescription = "$position. $placeHint" },
                )
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.quiz_place_instructions), style = Tokens.caption, modifier = Modifier.weight(1f))
            TextButton(onClick = { cellDp = (cellDp - 8).coerceAtLeast(34) }) { Text("−", style = Tokens.headline) }
            TextButton(onClick = { cellDp = (cellDp + 8).coerceAtMost(64) }) { Text("+", style = Tokens.headline) }
        }
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            ElementTile(
                target, TileStyle.PLAIN, 72.dp, showName = true,
                modifier = Modifier
                    .onGloballyPositioned { tileOrigin = it.positionInRoot() }
                    .offset { IntOffset(drag.x.roundToInt(), drag.y.roundToInt()) }
                    .pointerInput(locked) {
                        if (locked) return@pointerInput
                        detectDragGestures(
                            onDragStart = { touch = it },
                            onDrag = { change, amount -> change.consume(); drag += amount },
                            onDragEnd = {
                                val p = tileOrigin + touch + drag
                                if (viewport.contains(p)) {
                                    val local = p - gridOrigin
                                    with(density) { layout.elementAt(local.x.toDp().value, local.y.toDp().value) }?.let(onAnswer)
                                }
                                drag = Offset.Zero
                            },
                            onDragCancel = { drag = Offset.Zero },
                        )
                    }
                    .semantics { contentDescription = "${target.nameKo}, ${target.symbol}" },
            )
        }
        Spacer(Modifier.width(1.dp))
    }
}

@Composable
fun positionText(e: Element): String = when {
    e.group != null -> stringResource(R.string.position_period_group, e.period, e.group!!)
    e.category == "lanthanide" -> stringResource(R.string.position_lanthanide, e.period)
    else -> stringResource(R.string.position_actinide, e.period)
}

@Composable
private fun hintText(e: Element, mode: QuizMode): String = when (mode) {
    QuizMode.PLACE_ON_TABLE, QuizMode.FILL_BLANK -> "${positionText(e)} · ${categoryText(e.category)}"
    QuizMode.SYMBOL_TO_NAME -> stringResource(R.string.quiz_hint_name_starts, e.nameKo.take(1))
    QuizMode.NAME_TO_SYMBOL -> stringResource(R.string.quiz_hint_symbol_starts, e.symbol.take(1))
}

@Composable
fun categoryText(category: String): String = stringResource(
    when (category) {
        "nonmetal" -> R.string.category_nonmetal
        "noble-gas" -> R.string.category_noble_gas
        "alkali-metal" -> R.string.category_alkali_metal
        "alkaline-earth-metal" -> R.string.category_alkaline_earth_metal
        "metalloid" -> R.string.category_metalloid
        "halogen" -> R.string.category_halogen
        "post-transition-metal" -> R.string.category_post_transition_metal
        "transition-metal" -> R.string.category_transition_metal
        "lanthanide" -> R.string.category_lanthanide
        else -> R.string.category_actinide
    },
)
