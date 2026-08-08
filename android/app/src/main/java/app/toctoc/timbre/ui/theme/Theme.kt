package app.toctoc.timbre.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Indigo = Color(0xFF3F51B5)
private val IndigoDark = Color(0xFF303F9F)
private val Accent = Color(0xFF7986CB)

private val LightColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    primaryContainer = Accent,
    secondary = IndigoDark,
    background = Color(0xFFF7F8FC),
    surface = Color.White
)

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.Black,
    primaryContainer = IndigoDark,
    secondary = Accent,
    background = Color(0xFF121318),
    surface = Color(0xFF1C1D24)
)

@Composable
fun TocTocTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content
    )
}
