package app.elementlock.android.ui

import android.content.Intent
import android.graphics.drawable.Drawable
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.compose.LifecycleResumeEffect
import app.elementlock.android.AppController
import app.elementlock.android.R
import app.elementlock.core.AllowanceMinutes
import app.elementlock.core.LockStatus
import app.elementlock.core.QuizPurpose
import app.elementlock.core.ReviewOutcome
import app.elementlock.core.ReviewScheduler
import app.elementlock.core.StudyRanges
import app.elementlock.core.UnlockRules
import app.elementlock.core.validateScope
import kotlinx.coroutines.delay

private enum class Tab { HOME, TABLE, SETTINGS }

private sealed interface Overlay {
    data class Quiz(val purpose: QuizPurpose) : Overlay
    data object Disclosure : Overlay
    data object AppPicker : Overlay
    data object Scope : Overlay
}

@Composable
fun ElementLockApp(c: AppController, startUnlock: Boolean, onStartUnlockHandled: () -> Unit) {
    val state by c.store.state.collectAsState()
    val blocked by c.store.blockedPackages.collectAsState()
    var tab by remember { mutableStateOf(Tab.HOME) }
    var overlay by remember { mutableStateOf<Overlay?>(null) }
    // Re-read permission/service state whenever the user returns (e.g. from Accessibility settings).
    var resumes by remember { mutableIntStateOf(0) }
    LifecycleResumeEffect(Unit) { resumes++; onPauseOrDispose { } }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1_000) } } // display only

    val status = remember(state, blocked, resumes, now, overlay) { c.status(overlay is Overlay.Quiz && (overlay as Overlay.Quiz).purpose == QuizPurpose.UNLOCK, now) }

    LaunchedEffect(startUnlock, status) {
        if (startUnlock && state.settings.onboardingDone) {
            if (status == LockStatus.ACTIVE || status == LockStatus.EXPIRED) overlay = Overlay.Quiz(QuizPurpose.UNLOCK)
            onStartUnlockHandled()
        }
    }

    overlay?.let { o ->
        BackHandler { overlay = null }
        when (o) {
            is Overlay.Quiz -> QuizScreen(c, o.purpose) { overlay = null }
            Overlay.Disclosure -> DisclosureScreen(
                onAgree = { overlay = null; c.openAccessibilitySettings() },
                onDecline = { overlay = null },
            )
            Overlay.AppPicker -> AppPickerScreen(c) { overlay = null }
            Overlay.Scope -> ScopeScreen(c) { overlay = null }
        }
        return
    }

    if (!state.settings.onboardingDone) {
        OnboardingScreen(c, status, onDisclosure = { overlay = Overlay.Disclosure }, onPickApps = { overlay = Overlay.AppPicker })
        return
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f)) {
            when (tab) {
                Tab.HOME -> HomeScreen(c, status, now, onQuiz = { overlay = Overlay.Quiz(it) }, onFix = { overlay = Overlay.Disclosure })
                Tab.TABLE -> TableScreen(c)
                Tab.SETTINGS -> SettingsScreen(c, status, onDisclosure = { overlay = Overlay.Disclosure },
                    onPickApps = { overlay = Overlay.AppPicker }, onScope = { overlay = Overlay.Scope })
            }
        }
        NavigationBar(containerColor = Tokens.raised) {
            val colors = NavigationBarItemDefaults.colors(selectedIconColor = Tokens.navy, indicatorColor = Tokens.mint, unselectedIconColor = Tokens.secondary, selectedTextColor = Tokens.mint, unselectedTextColor = Tokens.secondary)
            NavigationBarItem(tab == Tab.HOME, { tab = Tab.HOME }, { Icon(Icons.Filled.Home, null) }, label = { Text(stringResource(R.string.tab_home)) }, colors = colors)
            NavigationBarItem(tab == Tab.TABLE, { tab = Tab.TABLE }, { Icon(Icons.Filled.Star, null) }, label = { Text(stringResource(R.string.tab_table)) }, colors = colors)
            NavigationBarItem(tab == Tab.SETTINGS, { tab = Tab.SETTINGS }, { Icon(Icons.Filled.Settings, null) }, label = { Text(stringResource(R.string.tab_settings)) }, colors = colors)
        }
    }
}

@Composable
private fun Page(title: String, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(title, style = Tokens.title, modifier = Modifier.semantics { heading() })
        content()
    }
}

// Status

@Composable
fun StatusCard(c: AppController, status: LockStatus, now: Long, onUnlock: () -> Unit, onFix: () -> Unit) {
    val s = c.store.state.value
    val minutes = s.settings.allowance.minutes
    val (title, detail) = when (status) {
        LockStatus.PERMISSION_MISSING -> stringResource(R.string.status_permission_missing) to stringResource(R.string.status_permission_missing_detail)
        LockStatus.INACTIVE -> stringResource(R.string.status_inactive) to stringResource(
            if (c.store.blockedPackages.value.isEmpty()) R.string.status_inactive_no_apps else R.string.status_inactive_paused)
        LockStatus.ACTIVE -> stringResource(R.string.status_active) to stringResource(R.string.status_active_detail, minutes)
        LockStatus.QUIZ_IN_PROGRESS -> stringResource(R.string.status_quiz) to stringResource(R.string.status_quiz_detail)
        LockStatus.ALLOWING -> {
            val left = ((UnlockRules.remainingMillis(s.unlock, now) + 59_999) / 60_000).toInt()
            stringResource(R.string.status_allowing) to stringResource(R.string.status_allowing_detail, left)
        }
        LockStatus.EXPIRED -> stringResource(R.string.status_expired) to stringResource(R.string.status_expired_detail)
        LockStatus.ERROR -> stringResource(R.string.status_error) to stringResource(
            if (!c.isServiceEnabled()) R.string.status_error_revoked else R.string.status_error_not_running)
    }
    val marker = when (status) {
        LockStatus.ACTIVE -> "🔒"; LockStatus.ALLOWING -> "🔓"; LockStatus.ERROR -> "⚠️"
        LockStatus.PERMISSION_MISSING -> "✋"; LockStatus.INACTIVE -> "⏸"; LockStatus.EXPIRED -> "⌛"; LockStatus.QUIZ_IN_PROGRESS -> "✏️"
    }
    Card(border = if (status == LockStatus.ERROR || status == LockStatus.PERMISSION_MISSING) Tokens.warning else Tokens.mint.copy(alpha = 0.5f)) {
        Text("$marker  $title", style = Tokens.headline)
        Spacer(Modifier.size(6.dp))
        Text(detail, style = Tokens.caption)
        if (status == LockStatus.ACTIVE || status == LockStatus.EXPIRED) {
            Spacer(Modifier.size(12.dp)); PrimaryButton(stringResource(R.string.home_unlock), onClick = onUnlock)
        }
        if (status == LockStatus.ERROR || status == LockStatus.PERMISSION_MISSING) {
            Spacer(Modifier.size(12.dp)); SecondaryButton(stringResource(R.string.settings_open_a11y), onClick = onFix)
        }
    }
}

@Composable
private fun HomeScreen(c: AppController, status: LockStatus, now: Long, onQuiz: (QuizPurpose) -> Unit, onFix: () -> Unit) {
    val state by c.store.state.collectAsState()
    val scope = state.settings.scope
    val mastered = scope.count { ReviewScheduler.isMastered(state.records[it]) }
    Page(stringResource(R.string.app_name)) {
        StatusCard(c, status, now, onUnlock = { onQuiz(QuizPurpose.UNLOCK) }, onFix = onFix)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Card(Modifier.weight(1f)) {
                Text("✓ " + stringResource(R.string.home_stat_today), style = Tokens.caption)
                Text("${state.solvedToday(c.today())}", style = Tokens.title)
            }
            Card(Modifier.weight(1f)) {
                Text("★ " + stringResource(R.string.home_stat_mastered), style = Tokens.caption.copy(color = Tokens.gold))
                Text("$mastered/${scope.size}", style = Tokens.title)
            }
        }
        SecondaryButton(stringResource(R.string.home_practice)) { onQuiz(QuizPurpose.PRACTICE) }
        Text(stringResource(R.string.home_practice_note), style = Tokens.caption)
    }
}

// My table

@Composable
private fun TableScreen(c: AppController) {
    val state by c.store.state.collectAsState()
    val now = System.currentTimeMillis()
    val all = c.catalog.elements.map { it.number }
    val layout = remember { GridLayout(c.catalog, all, 36.dp, 3.dp) }
    var detail by remember { mutableStateOf<Int?>(null) }
    val labels = mapOf(
        TileStyle.PLAIN to stringResource(R.string.legend_new), TileStyle.LEARNING to stringResource(R.string.legend_learning),
        TileStyle.MASTERED to stringResource(R.string.legend_mastered), TileStyle.OUT_OF_SCOPE to stringResource(R.string.legend_out_of_scope),
    )
    fun style(n: Int): TileStyle {
        if (n !in state.settings.scope) return TileStyle.OUT_OF_SCOPE
        val r = state.records[n]
        return when { ReviewScheduler.isMastered(r) -> TileStyle.MASTERED; (r?.seenCount ?: 0) > 0 -> TileStyle.LEARNING; else -> TileStyle.PLAIN }
    }
    Page(stringResource(R.string.tab_table)) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            for (st in listOf(TileStyle.PLAIN, TileStyle.LEARNING, TileStyle.MASTERED)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ElementTile(null, st, 22.dp); Spacer(Modifier.width(6.dp)); Text(labels.getValue(st), style = Tokens.caption)
                }
            }
        }
        Box(Modifier.horizontalScroll(rememberScrollState())) {
            PeriodicGrid(layout, c.catalog) { e ->
                val st = style(e.number)
                ElementTile(e, st, 36.dp, Modifier.clickable { detail = e.number }.semantics {
                    contentDescription = "${e.displayNameKo}, ${e.symbol}, ${labels.getValue(st)}"
                })
            }
        }
        detail?.let { n ->
            val e = c.catalog[n]
            val r = state.records[n]
            Card {
                Text("${e.symbol}  ${e.displayNameKo}  (${e.nameEn})", style = Tokens.headline)
                Text("${positionText(e)} · ${categoryText(e.category)}", style = Tokens.caption)
                Text(stringResource(R.string.detail_first_try_days, r?.firstTryDays?.size ?: 0, ReviewScheduler.MASTERY_DAYS), style = Tokens.body)
                Text(stringResource(R.string.detail_answers, r?.unlockAnswers ?: 0, r?.practiceAnswers ?: 0), style = Tokens.caption)
            }
        }
        Text(stringResource(R.string.review_title), style = Tokens.headline)
        val due = state.settings.scope.sorted().filter { n ->
            val r = state.records[n] ?: return@filter false
            r.dueAtMillis <= now && r.lastOutcome != ReviewOutcome.FIRST_TRY
        }
        if (due.isEmpty()) Text(stringResource(R.string.review_none), style = Tokens.caption)
        for (n in due) Text("${c.catalog[n].symbol}  ${c.catalog[n].displayNameKo}", style = Tokens.body)
    }
}

// Settings

@Composable
private fun SettingsScreen(c: AppController, status: LockStatus, onDisclosure: () -> Unit, onPickApps: () -> Unit, onScope: () -> Unit) {
    val state by c.store.state.collectAsState()
    val blocked by c.store.blockedPackages.collectAsState()
    val enabled = c.isServiceEnabled()
    Page(stringResource(R.string.tab_settings)) {
        Text(stringResource(R.string.settings_section_lock), style = Tokens.headline)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.settings_lock), style = Tokens.body, modifier = Modifier.weight(1f))
            Switch(checked = state.settings.lockEnabled, onCheckedChange = { c.setLockEnabled(it) })
        }
        Text(stringResource(R.string.settings_lock_footer), style = Tokens.caption)
        Text(stringResource(if (enabled) R.string.settings_a11y_on else R.string.settings_a11y_off), style = Tokens.body)
        SecondaryButton(stringResource(R.string.settings_open_a11y)) { if (enabled) c.openAccessibilitySettings() else onDisclosure() }
        SecondaryButton(stringResource(R.string.settings_apps)) { onPickApps() }
        Text(stringResource(R.string.settings_apps_count, blocked.size), style = Tokens.caption)

        Text(stringResource(R.string.settings_section_learning), style = Tokens.headline)
        Text(stringResource(R.string.settings_allowance), style = Tokens.body)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            for (a in AllowanceMinutes.entries) {
                val sel = state.settings.allowance == a
                Box(Modifier.weight(1f)) {
                    if (sel) PrimaryButton("✓ " + stringResource(R.string.settings_minutes, a.minutes)) {}
                    else SecondaryButton(stringResource(R.string.settings_minutes, a.minutes)) { c.updateSettings { it.copy(allowance = a) } }
                }
            }
        }
        SecondaryButton(stringResource(R.string.settings_scope_with_count, state.settings.scope.size)) { onScope() }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.settings_haptics), style = Tokens.body, modifier = Modifier.weight(1f))
            Switch(checked = state.settings.hapticsEnabled, onCheckedChange = { v -> c.updateSettings { it.copy(hapticsEnabled = v) } })
        }

        Text(stringResource(R.string.settings_section_help), style = Tokens.headline)
        for ((q, a) in listOf(R.string.help_q1 to R.string.help_a1, R.string.help_q2 to R.string.help_a2, R.string.help_q3 to R.string.help_a3, R.string.help_q4 to R.string.help_a4, R.string.help_q5 to R.string.help_a5)) {
            var open by remember { mutableStateOf(false) }
            Text((if (open) "▾ " else "▸ ") + stringResource(q), style = Tokens.body, modifier = Modifier.fillMaxWidth().clickable { open = !open }.padding(vertical = 6.dp))
            if (open) Text(stringResource(a), style = Tokens.caption)
        }
        if (c.store.recoveredFromCorruption) Text(stringResource(R.string.error_learning_recovered), style = Tokens.caption.copy(color = Tokens.warning))
    }
}

// Onboarding

@Composable
private fun OnboardingScreen(c: AppController, status: LockStatus, onDisclosure: () -> Unit, onPickApps: () -> Unit) {
    var step by remember { mutableIntStateOf(0) }
    val state by c.store.state.collectAsState()
    val blocked by c.store.blockedPackages.collectAsState()
    when (step) {
        0 -> Page(stringResource(R.string.onboarding_intro_title)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (n in listOf(1, 6, 8, 11)) ElementTile(c.catalog[n], if (n == 11) TileStyle.LEARNING else TileStyle.PLAIN, 56.dp)
            }
            for (t in listOf(R.string.onboarding_intro_1, R.string.onboarding_intro_2, R.string.onboarding_intro_4)) Text("• " + stringResource(t), style = Tokens.body)
            Text("• " + stringResource(R.string.onboarding_intro_3, state.settings.allowance.minutes), style = Tokens.body)
            Text(stringResource(R.string.onboarding_intro_note), style = Tokens.caption)
            PrimaryButton(stringResource(R.string.common_next)) { step = 1 }
        }
        1 -> Page(stringResource(R.string.onboarding_range_title)) {
            Text(stringResource(R.string.onboarding_range_body), style = Tokens.body)
            for ((label, set) in listOf(R.string.scope_basic to StudyRanges.BASIC, R.string.scope_extended to StudyRanges.EXTENDED, R.string.scope_all to StudyRanges.ALL)) {
                val sel = state.settings.scope == set
                if (sel) PrimaryButton("✓ " + stringResource(label)) {} else SecondaryButton(stringResource(label)) { c.updateSettings { it.copy(scope = set) } }
            }
            Text(stringResource(R.string.onboarding_range_later), style = Tokens.caption)
            PrimaryButton(stringResource(R.string.common_next)) { step = 2 }
        }
        else -> Page(stringResource(R.string.onboarding_permission_title)) {
            val enabled = c.isServiceEnabled()
            Text(stringResource(R.string.onboarding_permission_body), style = Tokens.body)
            Text((if (enabled) "✓ " else "○ ") + stringResource(R.string.onboarding_permission_step1), style = Tokens.headline)
            SecondaryButton(stringResource(R.string.onboarding_permission_request), enabled = !enabled) { onDisclosure() }
            Text((if (blocked.isNotEmpty()) "✓ " else "○ ") + stringResource(R.string.onboarding_permission_step2), style = Tokens.headline)
            SecondaryButton(stringResource(R.string.onboarding_permission_pick)) { onPickApps() }
            Text(stringResource(R.string.onboarding_battery_note), style = Tokens.caption)
            PrimaryButton(stringResource(R.string.onboarding_start), enabled = enabled && blocked.isNotEmpty()) {
                c.setLockEnabled(true); c.updateSettings { it.copy(onboardingDone = true) }
            }
            TextButton(onClick = { c.updateSettings { it.copy(onboardingDone = true) } }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.onboarding_learn_only))
            }
        }
    }
}

/** Prominent disclosure required by Google Play before sending the user to enable the AccessibilityService. */
@Composable
private fun DisclosureScreen(onAgree: () -> Unit, onDecline: () -> Unit) {
    Page(stringResource(R.string.disclosure_title)) {
        for (id in listOf(R.string.disclosure_what, R.string.disclosure_use, R.string.disclosure_not, R.string.disclosure_share, R.string.disclosure_off)) {
            Text("• " + stringResource(id), style = Tokens.body)
        }
        PrimaryButton(stringResource(R.string.disclosure_agree), onClick = onAgree)
        SecondaryButton(stringResource(R.string.disclosure_decline), onClick = onDecline)
    }
}

private data class LaunchableApp(val pkg: String, val label: String, val icon: Drawable)

@Composable
private fun AppPickerScreen(c: AppController, onDone: () -> Unit) {
    val context = LocalContext.current
    val apps = remember {
        val pm = context.packageManager
        val ctx = c.policyContext()
        pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { LaunchableApp(it.activityInfo.packageName, it.loadLabel(pm).toString(), it.loadIcon(pm)) }
            .distinctBy { it.pkg }
            .filterNot { ctx.neverBlock(it.pkg) }
            .sortedBy { it.label }
    }
    var selected by remember { mutableStateOf(c.store.blockedPackages.value) }
    var query by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(stringResource(R.string.settings_apps), style = Tokens.title)
        Text(stringResource(R.string.picker_note), style = Tokens.caption)
        OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), placeholder = { Text(stringResource(R.string.picker_search)) }, singleLine = true)
        LazyColumn(Modifier.weight(1f)) {
            items(apps.filter { query.isBlank() || it.label.contains(query, ignoreCase = true) }, key = { it.pkg }) { app ->
                val on = app.pkg in selected
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable { selected = if (on) selected - app.pkg else selected + app.pkg }
                        .semantics { this.selected = on },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Image(app.icon.toBitmap(96, 96).asImageBitmap(), null, Modifier.size(36.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(app.label, style = Tokens.body, modifier = Modifier.weight(1f))
                    Checkbox(on, null)
                }
            }
        }
        PrimaryButton(stringResource(R.string.picker_save, selected.size)) { c.saveBlockedPackages(selected); onDone() }
    }
}

@Composable
private fun ScopeScreen(c: AppController, onDone: () -> Unit) {
    var draft by remember { mutableStateOf(c.store.state.value.settings.scope) }
    val layout = remember { GridLayout(c.catalog, c.catalog.elements.map { it.number }, 40.dp, 3.dp) }
    val selectedLabel = stringResource(R.string.a11y_selected)
    val notSelectedLabel = stringResource(R.string.a11y_not_selected)
    Page(stringResource(R.string.settings_scope)) {
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton({ draft = StudyRanges.BASIC }) { Text(stringResource(R.string.scope_basic_short)) }
            TextButton({ draft = StudyRanges.EXTENDED }) { Text(stringResource(R.string.scope_extended_short)) }
            TextButton({ draft = StudyRanges.ALL }) { Text(stringResource(R.string.scope_all_short)) }
            TextButton({ draft = emptySet() }) { Text(stringResource(R.string.scope_clear)) }
        }
        Box(Modifier.horizontalScroll(rememberScrollState()).background(Tokens.navy)) {
            PeriodicGrid(layout, c.catalog) { e ->
                val on = e.number in draft
                ElementTile(e, if (on) TileStyle.LEARNING else TileStyle.OUT_OF_SCOPE, 40.dp,
                    Modifier.clickable { draft = if (on) draft - e.number else draft + e.number }.semantics {
                        contentDescription = "${e.displayNameKo}, ${e.symbol}"
                        stateDescription = if (on) selectedLabel else notSelectedLabel
                    })
            }
        }
        Text(stringResource(R.string.scope_count, draft.size), style = Tokens.caption)
        if (validateScope(draft) != null) Text("⚠️ " + stringResource(R.string.scope_empty), style = Tokens.body.copy(color = Tokens.warning))
        PrimaryButton(stringResource(R.string.common_save), enabled = validateScope(draft) == null) {
            c.updateSettings { it.copy(scope = draft) }; onDone()
        }
        SecondaryButton(stringResource(R.string.common_close), onClick = onDone)
    }
}
