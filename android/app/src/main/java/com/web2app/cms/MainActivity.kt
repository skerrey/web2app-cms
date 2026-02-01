package com.web2app.cms

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.web2app.cms.model.Block
import com.web2app.cms.model.BlockData
import com.web2app.cms.model.BlockStyles
import com.web2app.cms.model.Content
import com.web2app.cms.model.GridCell
import com.web2app.cms.model.Manifest
import com.web2app.cms.model.Page
import com.web2app.cms.ui.theme.Web2appcmsTheme
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            var uiState by remember { mutableStateOf<UiState>(UiState.Loading) }

            LaunchedEffect(Unit) {
                try {
                    val client = OkHttpClient()
                    val json = Json { ignoreUnknownKeys = true }
                    val fetchText: suspend (String) -> FetchResult = { url ->
                        withContext(Dispatchers.IO) {
                            val request = Request.Builder()
                                .url(url)
                                .cacheControl(CacheControl.FORCE_NETWORK)
                                .build()
                            client.newCall(request).execute().use { response ->
                                FetchResult(response.body?.string(), response.code)
                            }
                        }
                    }
                    val validateManifest = { manifest: Manifest ->
                        when {
                            manifest.schemaVersion.isBlank() -> "Missing schemaVersion in manifest.json"
                            manifest.contentVersion.isBlank() -> "Missing contentVersion in manifest.json"
                            manifest.compatibleAppVersions.min.isBlank() -> "Missing compatibleAppVersions.min in manifest.json"
                            manifest.compatibleAppVersions.max.isBlank() -> "Missing compatibleAppVersions.max in manifest.json"
                            manifest.pagesOrder.isEmpty() -> "Missing pagesOrder entries in manifest.json"
                            manifest.pagesOrder.any { it.isBlank() } -> "pagesOrder contains empty page IDs in manifest.json"
                            else -> null
                        }
                    }
                    val validateContent = { content: Content ->
                        fun validateBlock(block: Block): Boolean {
                            return when (block.type) {
                                "text" -> block.text.isNotBlank()
                                "hero" -> (block.data as? BlockData.Hero)?.title?.isNotBlank() == true
                                "button" -> (block.data as? BlockData.Button)?.label?.isNotBlank() == true
                                "grid" -> {
                                    val grid = block.data as? BlockData.Grid ?: return false
                                    grid.cells.isNotEmpty() && grid.cells.all { cell ->
                                        cell.blocks.all { validateBlock(it) }
                                    }
                                }
                                else -> false
                            }
                        }
                        when {
                            content.pages.isEmpty() -> "Missing pages in content.json"
                            content.pages.any { it.id.isBlank() } -> "A page id is missing in content.json"
                            content.pages.any { it.title.isBlank() } -> "A page title is missing in content.json"
                            content.pages.any { it.blocks.isEmpty() } -> "A page has no blocks in content.json"
                            content.pages.any { page ->
                                page.blocks.any { block -> !validateBlock(block) }
                            } -> "A block is missing required type or data in content.json"
                            else -> null
                        }
                    }
                    val parseManifest = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val compatible = root["compatibleAppVersions"]?.jsonObject ?: JsonObject(emptyMap())
                        val featureFlags = root["featureFlags"]?.jsonObject ?: JsonObject(emptyMap())
                        val pagesOrder = root["pagesOrder"]?.jsonArray
                            ?.mapNotNull { item -> item.jsonPrimitive.contentOrNull }
                            ?: emptyList()
                        Manifest(
                            schemaVersion = root["schemaVersion"]?.jsonPrimitive?.contentOrNull ?: "",
                            contentVersion = root["contentVersion"]?.jsonPrimitive?.contentOrNull ?: "",
                            compatibleAppVersions = com.web2app.cms.model.CompatibleAppVersions(
                                min = compatible["min"]?.jsonPrimitive?.contentOrNull ?: "",
                                max = compatible["max"]?.jsonPrimitive?.contentOrNull ?: ""
                            ),
                            pagesOrder = pagesOrder,
                            featureFlags = com.web2app.cms.model.FeatureFlags(
                                showWelcomeBanner = featureFlags["showWelcomeBanner"]?.jsonPrimitive?.booleanOrNull ?: false,
                                enableHelpLink = featureFlags["enableHelpLink"]?.jsonPrimitive?.booleanOrNull ?: false
                            )
                        )
                    }
                    fun parseBlock(blockElement: kotlinx.serialization.json.JsonElement): Block? {
                        val blockObject = blockElement.jsonObject
                        val type = blockObject["type"]?.jsonPrimitive?.contentOrNull ?: "text"
                        val topLevelText = blockObject["text"]?.jsonPrimitive?.contentOrNull ?: ""
                        val dataObj = blockObject["data"]?.jsonObject

                        val (text, data) = when (type) {
                            "hero" -> {
                                val title = dataObj?.get("title")?.jsonPrimitive?.contentOrNull ?: ""
                                val subtitle = dataObj?.get("subtitle")?.jsonPrimitive?.contentOrNull ?: ""
                                val imageUrl = dataObj?.get("imageUrl")?.jsonPrimitive?.contentOrNull
                                "" to BlockData.Hero(title = title, subtitle = subtitle, imageUrl = imageUrl)
                            }
                            "button" -> {
                                val label = dataObj?.get("label")?.jsonPrimitive?.contentOrNull ?: ""
                                val url = dataObj?.get("url")?.jsonPrimitive?.contentOrNull
                                "" to BlockData.Button(label = label, url = url)
                            }
                            "grid" -> {
                                val columns = (dataObj?.get("columns")?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 2).coerceIn(1, 12)
                                val cellsArray = dataObj?.get("cells")?.jsonArray ?: emptyList()
                                val cells = cellsArray.mapNotNull { cellElement ->
                                    val cellObj = cellElement.jsonObject
                                    val cellId = cellObj["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                                    val nestedBlocks = cellObj["blocks"]?.jsonArray?.mapNotNull { parseBlock(it) } ?: emptyList()
                                    com.web2app.cms.model.GridCell(id = cellId, blocks = nestedBlocks)
                                }
                                "" to BlockData.Grid(columns = columns, cells = cells)
                            }
                            else -> {
                                val textFromData = dataObj?.get("text")?.jsonPrimitive?.contentOrNull
                                val textValue = if (topLevelText.isNotBlank()) topLevelText else (textFromData ?: "")
                                textValue to null
                            }
                        }

                        val stylesObj = blockObject["styles"]?.jsonObject
                        val styles = if (stylesObj != null) {
                            BlockStyles(
                                backgroundColor = stylesObj["backgroundColor"]?.jsonPrimitive?.contentOrNull,
                                color = stylesObj["color"]?.jsonPrimitive?.contentOrNull,
                                textAlign = stylesObj["textAlign"]?.jsonPrimitive?.contentOrNull,
                                contentAlign = stylesObj["contentAlign"]?.jsonPrimitive?.contentOrNull
                            )
                        } else null

                        return Block(type = type, text = text, data = data, styles = styles)
                    }

                    val parseContent = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val pages = root["pages"]?.jsonArray?.mapNotNull { pageElement ->
                            val pageObject = pageElement.jsonObject
                            val blocks = pageObject["blocks"]?.jsonArray?.mapNotNull { parseBlock(it) } ?: emptyList()
                            val id = pageObject["id"]?.jsonPrimitive?.contentOrNull ?: ""
                            val title = pageObject["title"]?.jsonPrimitive?.contentOrNull ?: ""
                            Page(id = id, title = title, blocks = blocks)
                        } ?: emptyList()
                        Content(pages = pages)
                    }
                    val manifestResult = fetchText("${BuildConfig.BASE_URL}/content/manifest.json")

                    if (manifestResult.body == null) {
                        uiState = UiState.Error("Empty manifest response")
                        return@LaunchedEffect
                    }
                    if (manifestResult.statusCode !in 200..299) {
                        uiState = UiState.Error("Manifest request failed (${manifestResult.statusCode})")
                        return@LaunchedEffect
                    }

                    val decodedManifest = runCatching {
                        parseManifest(manifestResult.body)
                    }.getOrElse {
                        val snippet = manifestResult.body
                            .take(120)
                            .replace("\n", " ")
                        uiState = UiState.Error("Manifest parse error: ${it.message}. Body: $snippet")
                        return@LaunchedEffect
                    }

                    val manifestValidationError = validateManifest(decodedManifest)
                    if (manifestValidationError != null) {
                        uiState = UiState.Error(manifestValidationError)
                        return@LaunchedEffect
                    }
                    val contentResult = fetchText("${BuildConfig.BASE_URL}/content/content.json")

                    if (contentResult.body == null) {
                        uiState = UiState.Error("Empty content response")
                        return@LaunchedEffect
                    }
                    if (contentResult.statusCode !in 200..299) {
                        uiState = UiState.Error("Content request failed (${contentResult.statusCode})")
                        return@LaunchedEffect
                    }

                    val content = runCatching {
                        parseContent(contentResult.body)
                    }.getOrElse {
                        val snippet = contentResult.body
                            .take(120)
                            .replace("\n", " ")
                        uiState = UiState.Error("Content parse error: ${it.message}. Body: $snippet")
                        return@LaunchedEffect
                    }
                    val contentValidationError = validateContent(content)
                    if (contentValidationError != null) {
                        uiState = UiState.Error(contentValidationError)
                        return@LaunchedEffect
                    }
                    val firstPageId = decodedManifest.pagesOrder.firstOrNull()
                    if (firstPageId == null) {
                        uiState = UiState.Error("No pagesOrder entries")
                        return@LaunchedEffect
                    }

                    val firstPage = content.pages.firstOrNull { page -> page.id == firstPageId }
                    if (firstPage == null) {
                        uiState = UiState.Error("Page not found: $firstPageId")
                        return@LaunchedEffect
                    }

                    uiState = UiState.Loaded(
                        ScreenState(
                            manifest = decodedManifest,
                            content = content,
                            currentPageId = firstPageId
                        )
                    )
                } catch (e: Exception) {
                    uiState = UiState.Error("Error: ${e::class.simpleName}")
                }
            }

            Web2appcmsTheme {
                var currentPageId by remember { mutableStateOf<String?>(null) }

                Scaffold(modifier = Modifier.fillMaxSize()) { padding ->
                    Column(modifier = Modifier.padding(padding)) {
                        when (val state = uiState) {
                            is UiState.Loading -> {
                                Text(text = "Loading manifest...")
                            }
                            is UiState.Error -> {
                                Text(text = state.message)
                            }
                            is UiState.Loaded -> {
                                val context = LocalContext.current
                                val page = state.data.content.pages.find { it.id == (currentPageId ?: state.data.currentPageId) }
                                    ?: state.data.content.pages.first()
                                val effectivePageId = currentPageId ?: state.data.currentPageId

                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        text = page.title,
                                        style = MaterialTheme.typography.headlineMedium
                                    )
                                    page.blocks.forEach { block ->
                                        BlockContent(
                                            block = block,
                                            onNavigate = { url ->
                                                val pageId = url.trim().removePrefix("/").takeIf { it.isNotBlank() }
                                                val targetPage = state.data.content.pages.find { it.id == pageId }
                                                if (targetPage != null) {
                                                    currentPageId = pageId
                                                } else {
                                                    val fullUrl = if (url.startsWith("http://") || url.startsWith("https://")) url
                                                        else "https://$url"
                                                    try {
                                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl)))
                                                    } catch (_: Exception) {}
                                                }
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Parse CSS-like color (hex #RGB/#RRGGBB/#AARRGGBB or common color names) to Compose Color, or null if invalid. */
private fun parseColor(value: String?): Color? {
    if (value.isNullOrBlank()) return null
    val s = value.trim()
    if (s.startsWith("#")) {
        val hex = s.removePrefix("#")
        val long = when (hex.length) {
            3 -> hex.map { "$it$it" }.joinToString("").let { "FF$it" }.toLongOrNull(16)
            6 -> "FF$hex".toLongOrNull(16)
            8 -> hex.toLongOrNull(16)
            else -> null
        } ?: return null
        return Color(long)
    }
    return CSS_COLOR_NAMES[s.lowercase()]?.let { Color(it) }
}

private val CSS_COLOR_NAMES = mapOf(
    "skyblue" to 0xFF87CEEB,
    "lightblue" to 0xFFADD8E6,
    "blue" to 0xFF0000FF,
    "red" to 0xFFFF0000,
    "green" to 0xFF008000,
    "white" to 0xFFFFFFFF,
    "black" to 0xFF000000,
    "gray" to 0xFF808080,
    "grey" to 0xFF808080,
    "orange" to 0xFFFFA500,
    "yellow" to 0xFFFFFF00,
    "purple" to 0xFF800080,
    "pink" to 0xFFFFC0CB
)

private fun contentAlignToAlignment(contentAlign: String?): Alignment.Horizontal {
    return when (contentAlign) {
        "center" -> Alignment.CenterHorizontally
        "right" -> Alignment.End
        else -> Alignment.Start
    }
}

private fun textAlignToTextAlign(textAlign: String?): TextAlign {
    return when (textAlign) {
        "center" -> TextAlign.Center
        "right" -> TextAlign.End
        else -> TextAlign.Start
    }
}

@Composable
private fun BlockContent(
    block: Block,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val bgColor = parseColor(block.styles?.backgroundColor)
    val contentModifier = if (bgColor != null) modifier.background(bgColor) else modifier
    val contentAlign = contentAlignToAlignment(block.styles?.contentAlign)
    val textAlign = textAlignToTextAlign(block.styles?.textAlign)

    when (block.type) {
        "text" -> Row(
            modifier = contentModifier.fillMaxWidth(),
            horizontalAlignment = contentAlign
        ) {
            Text(
                text = block.text,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = textAlign
            )
        }
        "hero" -> {
            val hero = block.data as? BlockData.Hero ?: return
            Row(
                modifier = contentModifier.fillMaxWidth(),
                horizontalAlignment = contentAlign
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = hero.title,
                        style = MaterialTheme.typography.headlineSmall,
                        textAlign = textAlign
                    )
                    if (hero.subtitle.isNotBlank()) {
                        Text(
                            text = hero.subtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = textAlign
                        )
                    }
                }
            }
        }
        "button" -> {
            val btn = block.data as? BlockData.Button ?: return
            val buttonColors = if (bgColor != null) {
                ButtonDefaults.buttonColors(containerColor = bgColor)
            } else null
            Row(
                modifier = contentModifier.fillMaxWidth(),
                horizontalAlignment = contentAlign
            ) {
                Button(
                    onClick = {
                        val url = btn.url?.takeIf { it.isNotBlank() }
                        if (url != null) onNavigate(url)
                    },
                    enabled = !btn.url.isNullOrBlank(),
                    modifier = modifier,
                    colors = buttonColors ?: ButtonDefaults.buttonColors()
                ) {
                    Text(text = btn.label.ifBlank { "Button" })
                }
            }
        }
        "grid" -> {
            val grid = block.data as? BlockData.Grid ?: return
            Row(
                modifier = contentModifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                grid.cells.take(grid.columns).forEach { cell ->
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        cell.blocks.forEach { nestedBlock ->
                            BlockContent(block = nestedBlock, onNavigate = onNavigate)
                        }
                    }
                }
            }
        }
        else -> Text(
            text = block.text.ifBlank { "Unknown block type: ${block.type}" },
            style = MaterialTheme.typography.bodyMedium,
            modifier = contentModifier
        )
    }
}

data class ScreenState(
    val manifest: Manifest,
    val content: Content,
    val currentPageId: String
)

data class FetchResult(
    val body: String?,
    val statusCode: Int
)

sealed class UiState {
    data object Loading : UiState()
    data class Loaded(val data: ScreenState) : UiState()
    data class Error(val message: String) : UiState()
}