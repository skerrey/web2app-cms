package com.web2app.cms

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.web2app.cms.model.Block
import com.web2app.cms.model.BlockData
import com.web2app.cms.model.BlockStyles
import com.web2app.cms.model.Content
import com.web2app.cms.model.GridCell
import com.web2app.cms.model.Manifest
import com.web2app.cms.model.Page
import com.web2app.cms.ui.theme.Web2appcmsTheme
import androidx.compose.runtime.*
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            var uiState by remember { mutableStateOf<UiState>(UiState.Loading) }
            var isRefreshing by remember { mutableStateOf(false) }
            val scope = rememberCoroutineScope()

            suspend fun load(): LoadResult {
                return try {
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
                                "image" -> (block.data as? BlockData.Image)?.imageUrl?.isNotBlank() == true
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
                    fun parseBlock(blockElement: kotlinx.serialization.json.JsonElement): Block {
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
                            "image" -> {
                                val imageUrl = dataObj?.get("imageUrl")?.jsonPrimitive?.contentOrNull
                                val alt = dataObj?.get("alt")?.jsonPrimitive?.contentOrNull
                                "" to BlockData.Image(imageUrl = imageUrl, alt = alt)
                            }
                            "grid" -> {
                                val columns = (dataObj?.get("columns")?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 2).coerceIn(1, 12)
                                val cellsArray = dataObj?.get("cells")?.jsonArray ?: emptyList()
                                val cells = cellsArray.mapNotNull { cellElement ->
                                    val cellObj = cellElement.jsonObject
                                    val cellId = cellObj["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                                    val nestedBlocks = cellObj["blocks"]?.jsonArray?.map { parseBlock(it) } ?: emptyList()
                                    GridCell(id = cellId, blocks = nestedBlocks)
                                }
                                "" to BlockData.Grid(columns = columns, cells = cells)
                            }
                            else -> {
                                val textFromData = dataObj?.get("text")?.jsonPrimitive?.contentOrNull
                                val textValue = topLevelText.ifBlank { textFromData ?: "" }
                                textValue to null
                            }
                        }

                        val stylesObj = blockObject["styles"]?.jsonObject
                        val styles = if (stylesObj != null) {
                            BlockStyles(
                                backgroundColor = stylesObj["backgroundColor"]?.jsonPrimitive?.contentOrNull,
                                color = stylesObj["color"]?.jsonPrimitive?.contentOrNull,
                                textAlign = stylesObj["textAlign"]?.jsonPrimitive?.contentOrNull,
                                contentAlign = stylesObj["contentAlign"]?.jsonPrimitive?.contentOrNull,
                                width = stylesObj["width"]?.jsonPrimitive?.contentOrNull,
                                height = stylesObj["height"]?.jsonPrimitive?.contentOrNull,
                                borderRadius = stylesObj["borderRadius"]?.jsonPrimitive?.contentOrNull,
                                objectFit = stylesObj["objectFit"]?.jsonPrimitive?.contentOrNull,
                                padding = stylesObj["padding"]?.jsonPrimitive?.contentOrNull,
                                paddingTop = stylesObj["paddingTop"]?.jsonPrimitive?.contentOrNull,
                                paddingRight = stylesObj["paddingRight"]?.jsonPrimitive?.contentOrNull,
                                paddingBottom = stylesObj["paddingBottom"]?.jsonPrimitive?.contentOrNull,
                                paddingLeft = stylesObj["paddingLeft"]?.jsonPrimitive?.contentOrNull,
                                margin = stylesObj["margin"]?.jsonPrimitive?.contentOrNull,
                                marginTop = stylesObj["marginTop"]?.jsonPrimitive?.contentOrNull,
                                marginRight = stylesObj["marginRight"]?.jsonPrimitive?.contentOrNull,
                                marginBottom = stylesObj["marginBottom"]?.jsonPrimitive?.contentOrNull,
                                marginLeft = stylesObj["marginLeft"]?.jsonPrimitive?.contentOrNull
                            )
                        } else null

                        return Block(type = type, text = text, data = data, styles = styles)
                    }

                    val parseContent = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val pages = root["pages"]?.jsonArray?.mapNotNull { pageElement ->
                            val pageObject = pageElement.jsonObject
                            val blocks = pageObject["blocks"]?.jsonArray?.map { parseBlock(it) } ?: emptyList()
                            val id = pageObject["id"]?.jsonPrimitive?.contentOrNull ?: ""
                            val title = pageObject["title"]?.jsonPrimitive?.contentOrNull ?: ""
                            val titleStyle = pageObject["titleStyle"]?.jsonPrimitive?.contentOrNull
                            Page(id = id, title = title, titleStyle = titleStyle, blocks = blocks)
                        } ?: emptyList()
                        Content(pages = pages)
                    }
                    val manifestResult = fetchText("${BuildConfig.BASE_URL}/content/manifest.json")
                    if (manifestResult.statusCode !in 200..299) return LoadResult.Error("Manifest request failed (${manifestResult.statusCode})")
                    val manifestBody = manifestResult.body ?: return LoadResult.Error("Empty manifest response")
                    val manifestParse = runCatching { parseManifest(manifestBody) }
                    if (manifestParse.isFailure) return LoadResult.Error("Manifest parse error: ${manifestParse.exceptionOrNull()?.message}")
                    val decodedManifest = manifestParse.getOrThrow()
                    validateManifest(decodedManifest)?.let { return LoadResult.Error(it) }
                    val contentResult = fetchText("${BuildConfig.BASE_URL}/content/content.json")
                    if (contentResult.statusCode !in 200..299) return LoadResult.Error("Content request failed (${contentResult.statusCode})")
                    val contentBody = contentResult.body ?: return LoadResult.Error("Empty content response")
                    val contentParse = runCatching { parseContent(contentBody) }
                    if (contentParse.isFailure) return LoadResult.Error("Content parse error: ${contentParse.exceptionOrNull()?.message}")
                    val content = contentParse.getOrThrow()
                    validateContent(content)?.let { return LoadResult.Error(it) }
                    val firstPageId = decodedManifest.pagesOrder.firstOrNull()
                    if (firstPageId == null) return LoadResult.Error("No pagesOrder entries")
                    if (content.pages.none { it.id == firstPageId }) return LoadResult.Error("Page not found: $firstPageId")
                    LoadResult.Success(
                        ScreenState(manifest = decodedManifest, content = content, currentPageId = firstPageId)
                    )
                } catch (e: Exception) {
                    LoadResult.Error("Error: ${e::class.simpleName}")
                }
            }

            val loadScreenState: suspend () -> LoadResult = { load() }

            LaunchedEffect(Unit) {
                when (val r = loadScreenState()) {
                    is LoadResult.Success -> uiState = UiState.Loaded(r.state)
                    is LoadResult.Error -> uiState = UiState.Error(r.message)
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
                                PullToRefreshLoadedContent(
                                    state = state,
                                    currentPageId = currentPageId,
                                    onCurrentPageIdChange = { currentPageId = it },
                                    isRefreshing = isRefreshing,
                                    onRefreshingChange = { isRefreshing = it },
                                    loadScreenState = loadScreenState,
                                    onUiStateChange = { uiState = it },
                                    scope = scope
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PullToRefreshLoadedContent(
    state: UiState.Loaded,
    currentPageId: String?,
    onCurrentPageIdChange: (String?) -> Unit,
    isRefreshing: Boolean,
    onRefreshingChange: (Boolean) -> Unit,
    loadScreenState: suspend () -> LoadResult,
    onUiStateChange: (UiState) -> Unit,
    scope: CoroutineScope
) {
    val context = LocalContext.current
    val page = state.data.content.pages.find { it.id == (currentPageId ?: state.data.currentPageId) }
        ?: state.data.content.pages.first()
    val pullRefreshState = rememberPullToRefreshState()
    val onRefresh: () -> Unit = {
        onRefreshingChange(true)
        scope.launch {
            when (val r = loadScreenState()) {
                is LoadResult.Success -> {
                    val previousPageId = currentPageId ?: state.data.currentPageId
                    val keptPageId = if (r.state.content.pages.any { it.id == previousPageId }) previousPageId else r.state.currentPageId
                    onUiStateChange(UiState.Loaded(r.state.copy(currentPageId = keptPageId)))
                }
                is LoadResult.Error -> onUiStateChange(UiState.Error(r.message))
            }
            onRefreshingChange(false)
        }
    }
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
        state = pullRefreshState,
        indicator = {
            PullToRefreshDefaults.Indicator(
                state = pullRefreshState,
                isRefreshing = isRefreshing,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            page.blocks.forEach { block ->
                BlockContent(
                    block = block,
                    onNavigate = { url ->
                        val pageId = url.trim().removePrefix("/").takeIf { it.isNotBlank() }
                        val targetPage = state.data.content.pages.find { it.id == pageId }
                        if (targetPage != null) {
                            onCurrentPageIdChange(pageId)
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

/** Decode data URL (data:image/...;base64,...) to ByteArray for Coil; return null if not a data URL or decode fails. */
private fun decodeDataUrlToBytes(dataUrl: String?): ByteArray? {
    if (dataUrl.isNullOrBlank() || !dataUrl.startsWith("data:")) return null
    val base64Part = dataUrl.substringAfter("base64,", "").replace("\\s".toRegex(), "")
    if (base64Part.isEmpty()) return null
    return try {
        Base64.decode(base64Part, Base64.DEFAULT)
    } catch (_: Exception) {
        null
    }
}

/** Parse "16px" or "8" to Dp, or null. */
private fun parseDp(value: String?): Dp? {
    if (value.isNullOrBlank()) return null
    val num = value.trim().replace(Regex("[^0-9.]"), "").toFloatOrNull() ?: return null
    return num.dp
}

/** Build PaddingValues from block styles (padding or margin). All-side value used when per-side not set. */
private fun paddingValuesFromStyles(styles: BlockStyles?, isMargin: Boolean): PaddingValues? {
    if (styles == null) return null
    val all = if (isMargin) styles.margin else styles.padding
    val top = parseDp(if (isMargin) styles.marginTop else styles.paddingTop) ?: parseDp(all) ?: 0.dp
    val right = parseDp(if (isMargin) styles.marginRight else styles.paddingRight) ?: parseDp(all) ?: 0.dp
    val bottom = parseDp(if (isMargin) styles.marginBottom else styles.paddingBottom) ?: parseDp(all) ?: 0.dp
    val left = parseDp(if (isMargin) styles.marginLeft else styles.paddingLeft) ?: parseDp(all) ?: 0.dp
    if (top == 0.dp && right == 0.dp && bottom == 0.dp && left == 0.dp) return null
    return PaddingValues(start = left, top = top, end = right, bottom = bottom)
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

private fun contentAlignToArrangement(contentAlign: String?): Arrangement.Horizontal {
    return when (contentAlign) {
        "center" -> Arrangement.Center
        "right" -> Arrangement.End
        else -> Arrangement.Start
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
    val styles = block.styles
    val bgColor = parseColor(styles?.backgroundColor)
    val marginPv = paddingValuesFromStyles(styles, isMargin = true)
    val paddingPv = paddingValuesFromStyles(styles, isMargin = false)
    var contentModifier = modifier
    if (marginPv != null) contentModifier = contentModifier.padding(marginPv)
    if (bgColor != null) contentModifier = contentModifier.background(bgColor)
    if (paddingPv != null) contentModifier = contentModifier.padding(paddingPv)
    val contentArrangement = contentAlignToArrangement(styles?.contentAlign)
    val textAlign = textAlignToTextAlign(styles?.textAlign)

    when (block.type) {
        "text" -> Row(
            modifier = contentModifier.fillMaxWidth(),
            horizontalArrangement = contentArrangement
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
                horizontalArrangement = contentArrangement
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
                horizontalArrangement = contentArrangement
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
        "image" -> {
            val img = block.data as? BlockData.Image ?: return
            val imageUrl = img.imageUrl?.takeIf { it.isNotBlank() } ?: return
            val imageData: Any = decodeDataUrlToBytes(imageUrl) ?: imageUrl
            val width = parseDp(styles?.width)
            val height = parseDp(styles?.height)
            val borderRadius = parseDp(styles?.borderRadius) ?: 0.dp
            val contentScale = when (styles?.objectFit) {
                "contain" -> ContentScale.Fit
                "fill" -> ContentScale.FillBounds
                "none" -> ContentScale.None
                "scale-down" -> ContentScale.Inside
                else -> ContentScale.Crop
            }
            Row(
                modifier = contentModifier.fillMaxWidth(),
                horizontalArrangement = contentArrangement
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(imageData)
                        .crossfade(true)
                        .build(),
                    contentDescription = img.alt ?: "",
                    modifier = Modifier
                        .then(if (width != null) Modifier.width(width) else Modifier)
                        .then(if (height != null) Modifier.height(height) else Modifier)
                        .clip(RoundedCornerShape(borderRadius)),
                    contentScale = contentScale
                )
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

private sealed class LoadResult {
    data class Success(val state: ScreenState) : LoadResult()
    data class Error(val message: String) : LoadResult()
}