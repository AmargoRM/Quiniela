package app.toctoc.timbre

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build

class TocTocApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createChannels()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java)

        // Canal de bajo perfil para el servicio en primer plano
        val service = NotificationChannel(
            CHANNEL_SERVICE,
            getString(R.string.service_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Mantiene el timbre activo en segundo plano"
            setShowBadge(false)
        }

        // Canal de alta prioridad para el timbre (full-screen + sonido)
        val ring = NotificationChannel(
            CHANNEL_RING,
            getString(R.string.ring_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerta cuando alguien toca el timbre"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 500)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            setSound(
                Uri.parse("android.resource://" + packageName + "/" + R.raw.doorbell),
                attrs
            )
        }

        nm.createNotificationChannel(service)
        nm.createNotificationChannel(ring)
    }

    companion object {
        const val CHANNEL_SERVICE = "toctoc_service"
        const val CHANNEL_RING = "toctoc_ring"
    }
}
