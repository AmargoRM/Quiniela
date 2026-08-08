package app.toctoc.timbre.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.os.Build

/** Resultado de intentar grabar una etiqueta. */
sealed class WriteResult {
    object Success : WriteResult()
    data class Error(val reason: String) : WriteResult()
}

object NfcHelper {

    fun getAdapter(activity: Activity): NfcAdapter? =
        NfcAdapter.getDefaultAdapter(activity)

    /** Habilita la captura de etiquetas mientras la app está en primer plano. */
    fun enableForegroundDispatch(activity: Activity) {
        val adapter = getAdapter(activity) ?: return
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_MUTABLE else 0
        val pending = PendingIntent.getActivity(
            activity, 0,
            Intent(activity, activity.javaClass)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            flags
        )
        val filters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
            IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
            IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED)
        )
        try {
            adapter.enableForegroundDispatch(activity, pending, filters, null)
        } catch (_: Exception) {}
    }

    fun disableForegroundDispatch(activity: Activity) {
        try { getAdapter(activity)?.disableForegroundDispatch(activity) } catch (_: Exception) {}
    }

    fun extractTag(intent: Intent): Tag? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        }
    }

    /** Graba una URL en la etiqueta como registro NDEF de tipo URI. */
    fun writeUrl(tag: Tag, url: String): WriteResult {
        val message = NdefMessage(arrayOf(NdefRecord.createUri(url)))
        val ndef = Ndef.get(tag)
        if (ndef != null) {
            return try {
                ndef.connect()
                if (!ndef.isWritable) return WriteResult.Error("La etiqueta es de solo lectura.")
                if (ndef.maxSize < message.toByteArray().size)
                    return WriteResult.Error("La etiqueta no tiene capacidad suficiente.")
                ndef.writeNdefMessage(message)
                WriteResult.Success
            } catch (e: Exception) {
                WriteResult.Error(e.message ?: "No se pudo grabar la etiqueta.")
            } finally {
                try { ndef.close() } catch (_: Exception) {}
            }
        }
        val formatable = NdefFormatable.get(tag)
        if (formatable != null) {
            return try {
                formatable.connect()
                formatable.format(message)
                WriteResult.Success
            } catch (e: Exception) {
                WriteResult.Error(e.message ?: "No se pudo formatear la etiqueta.")
            } finally {
                try { formatable.close() } catch (_: Exception) {}
            }
        }
        return WriteResult.Error("Etiqueta NFC no compatible (no soporta NDEF).")
    }
}
