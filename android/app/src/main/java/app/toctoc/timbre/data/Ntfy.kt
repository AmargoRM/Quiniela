package app.toctoc.timbre.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

object Ntfy {
    /** Publica un mensaje en el topic (equivale a "tocar el timbre"). */
    suspend fun publish(server: String, topic: String, message: String, title: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val conn = (URL(Links.publishUrl(server, topic)).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 15_000
                    readTimeout = 15_000
                    setRequestProperty("Title", title)
                    setRequestProperty("Tags", "bell")
                    setRequestProperty("Priority", "max")
                }
                conn.outputStream.use { it.write(message.toByteArray(Charsets.UTF_8)) }
                val ok = conn.responseCode in 200..299
                conn.disconnect()
                if (ok) Result.success(Unit) else Result.failure(Exception("HTTP ${conn.responseCode}"))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
