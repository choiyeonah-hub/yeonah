package app.elementlock.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.elementlock.core.Element
import app.elementlock.core.ElementCatalog

object Tokens {
    val navy = Color(0xFF0B1730)
    val raised = Color(0xFF142645)
    val line = Color(0xFF33476B)
    val mint = Color(0xFF3EE6C1)
    val gold = Color(0xFFD4B05C)
    val secondary = Color.White.copy(alpha = 0.72f)
    val warning = Color(0xFFFFB873)

    val title = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
    val headline = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
    val body = TextStyle(fontSize = 16.sp, color = Color.White, lineHeight = 22.sp)
    val caption = TextStyle(fontSize = 13.sp, color = secondary, lineHeight = 18.sp)
}

@Composable
fun ElementLockTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Tokens.mint, onPrimary = Tokens.navy, background = Tokens.navy, surface = Tokens.raised,
            onBackground = Color.White, onSurface = Color.White, secondary = Tokens.gold,
        ),
    ) {
        Box(Modifier.background(Tokens.navy)) { content() }
    }
}

@Composable
fun PrimaryButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick, enabled = enabled,
        modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Tokens.mint, contentColor = Tokens.navy),
    ) { Text(text, fontWeight = FontWeight.SemiBold, fontSize = 17.sp) }
}

@Composable
fun SecondaryButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick, enabled = enabled,
        modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.5.dp, Tokens.line),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
    ) { Text(text, fontWeight = FontWeight.SemiBold, fontSize = 17.sp) }
}

@Composable
fun Card(modifier: Modifier = Modifier, border: Color = Tokens.line, content: @Composable () -> Unit) {
    Column(
        modifier.fillMaxWidth()
            .background(Tokens.raised, RoundedCornerShape(16.dp))
            .border(1.dp, border, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) { content() }
}

enum class TileStyle { BLANK, QUESTION, PLAIN, LEARNING, MASTERED, OUT_OF_SCOPE }

/** One element cell. State is shown by fill AND an icon/marker, never color alone. */
@Composable
fun ElementTile(element: Element?, style: TileStyle, size: Dp, modifier: Modifier = Modifier, showName: Boolean = false) {
    val shape = RoundedCornerShape(size * 0.16f)
    val fill = when (style) {
        TileStyle.LEARNING -> Tokens.mint
        TileStyle.MASTERED -> Tokens.gold
        TileStyle.QUESTION -> Tokens.mint.copy(alpha = 0.15f)
        TileStyle.OUT_OF_SCOPE -> Tokens.raised.copy(alpha = 0.4f)
        else -> Tokens.raised
    }
    val textColor = when (style) {
        TileStyle.LEARNING, TileStyle.MASTERED -> Tokens.navy
        TileStyle.OUT_OF_SCOPE -> Color.White.copy(alpha = 0.35f)
        else -> Color.White
    }
    val stroke = if (style == TileStyle.QUESTION) Tokens.mint else Tokens.line
    Box(
        modifier.size(size).background(fill, shape).then(
            if (style == TileStyle.BLANK) Modifier.drawBehind {
                drawRoundRect(stroke, cornerRadius = CornerRadius(this.size.minDimension * 0.16f),
                    style = Stroke(width = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))))
            } else Modifier.border(if (style == TileStyle.QUESTION) 2.dp else 1.dp, stroke, shape),
        ),
        contentAlignment = Alignment.Center,
    ) {
        val unit = size.value
        when {
            style == TileStyle.BLANK -> Unit
            style == TileStyle.QUESTION -> Text("?", color = Tokens.mint, fontSize = (unit * 0.45f).sp, fontWeight = FontWeight.Bold)
            element != null -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${element.number}", color = textColor.copy(alpha = 0.8f), fontSize = (unit * 0.2f).sp, lineHeight = (unit * 0.22f).sp)
                Text(element.symbol, color = textColor, fontSize = (unit * 0.36f).sp, fontWeight = FontWeight.Bold, lineHeight = (unit * 0.4f).sp)
                if (showName) Text(element.nameKo, color = textColor, fontSize = (unit * 0.15f).sp, maxLines = 1)
            }
        }
        if (style == TileStyle.MASTERED) {
            Icon(Icons.Filled.Star, null, tint = Tokens.navy, modifier = Modifier.align(Alignment.TopEnd).padding(2.dp).size(size * 0.22f))
        } else if (style == TileStyle.LEARNING) {
            Icon(Icons.Filled.Refresh, null, tint = Tokens.navy, modifier = Modifier.align(Alignment.TopEnd).padding(2.dp).size(size * 0.2f))
        }
    }
}

/** Real periodic-table positions: 18 columns, f-block rows below a small gap. Units are dp. */
class GridLayout(private val catalog: ElementCatalog, val numbers: List<Int>, val cell: Dp, val spacing: Dp) {
    private val rows = numbers.map { catalog[it].displayRow }.toSortedSet().toList()
    private val pitch: Dp get() = cell + spacing

    fun x(e: Element): Dp = pitch * (e.displayColumn - 1)
    fun y(e: Element): Dp {
        val gap = if (e.displayRow >= 9 && rows.any { it < 9 }) cell * 0.4f else 0.dp
        return pitch * rows.indexOf(e.displayRow) + gap
    }
    val width: Dp get() = pitch * 18 - spacing
    val height: Dp get() = rows.lastOrNull()?.let { r -> y(catalog.elements.first { it.displayRow == r }) + cell } ?: 0.dp

    /** Hit test in dp, relative to the grid's top-left (drag and drop). */
    fun elementAt(xDp: Float, yDp: Float): Int? = numbers.firstOrNull { n ->
        val e = catalog[n]
        xDp in x(e).value..(x(e) + cell).value && yDp in y(e).value..(y(e) + cell).value
    }
}

@Composable
fun PeriodicGrid(layout: GridLayout, catalog: ElementCatalog, modifier: Modifier = Modifier, cell: @Composable (Element) -> Unit) {
    Box(modifier.size(layout.width, layout.height)) {
        for (n in layout.numbers) {
            val e = catalog[n]
            Box(Modifier.offset(layout.x(e), layout.y(e)).size(layout.cell)) { cell(e) }
        }
    }
}
