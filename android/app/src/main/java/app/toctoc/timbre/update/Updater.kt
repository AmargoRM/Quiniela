package app.toctoc.timbre.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import app.toctoc.timbre.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/** Info de la última versión publicada. */
data class UpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val notes: String
) {
    val isNewer: Boolean get() = versionCode > BuildConfig.VERSION_CODE
}

sealed class UpdateState {
    object Idle : UpdateState()
    object Checking : UpdateState()
    object UpToDate : UpdateState()
    data class Available(val info: UpdateInfo) : UpdateState()
    data class Downloading(val progress: Int) : UpdateState()
    data class Error(val message: String) : UpdateState()
    object ReadyToInstall : UpdateState()
}

/**
 * Actualizador sin tienda: lee un manifiesto JSON publicado en GitHub Pages,
 * compara el versionCode y, si hay una versión nueva, descarga el APK y lanza
 * el instalador del sistema. Como todos los APK se firman con la MISMA clave,
 * la actualización se instala encima sin desinstalar.
 */
object Updater {

    suspend fun check(): Result<UpdateInfo> = withContext(Dispatchers.IO) {
        try {
            val text = httpGet(BuildConfig.UPDATE_MANIFEST_URL)
            val json = JSONObject(text)
            val info = UpdateInfo(
                versionCode = json.getInt("versionCode"),
                versionName = json.optString("versionName", "?"),
                apkUrl = json.getString("apkUrl"),
                notes = json.optString("notes", "")
            )
            Result.success(info)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun download(
        context: Context,
        info: UpdateInfo,
        onProgress: (Int) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            // Limpia descargas viejas
            dir.listFiles()?.forEach { it.delete() }
            val outFile = File(dir, "toctoc-${info.versionCode}.apk")

            val conn = (URL(info.apkUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 20_000
                readTimeout = 60_000
                instanceFollowRedirects = true
            }
            conn.connect()
            if (conn.responseCode !in 200..299) {
                return@withContext Result.failure(Exception("HTTP ${conn.responseCode}"))
            }
            val total = conn.contentLength.toLong()
            conn.inputStream.use { input ->
                outFile.outputStream().use { output ->
                    val buf = ByteArray(16 * 1024)
                    var read: Int
                    var done = 0L
                    var lastPct = -1
                    while (input.read(buf).also { read = it } != -1) {
                        output.write(buf, 0, read)
                        done += read
                        if (total > 0) {
                            val pct = ((done * 100) / total).toInt()
                            if (pct != lastPct) { lastPct = pct; onProgress(pct) }
                        }
                    }
                }
            }
            Result.success(outFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Lanza el instalador del sistema para el APK descargado. */
    fun install(context: Context, apk: File) {
        val uri: Uri = FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", apk
        )
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            data = uri
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            putExtra(Intent.EXTRA_RETURN_RESULT, true)
        }
        try {
            context.startActivity(intent)
        } catch (_: Exception) {
            // Fallback a ACTION_VIEW con el mime del paquete
            val view = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(view)
        }
    }

    /** Comprueba si el sistema permite instalar APKs desde esta app. */
    fun canInstall(context: Context): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else true
    }

    private fun httpGet(url: String): String {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 15_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/json")
        }
        conn.connect()
        if (conn.responseCode !in 200..299) throw Exception("HTTP ${conn.responseCode}")
        return conn.inputStream.bufferedReader().use { it.readText() }
    }
}
