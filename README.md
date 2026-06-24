# Quiniela Mundial Oficina

Web estática para una quiniela interna de oficina sobre la fase eliminatoria del Mundial. No usa GitHub Issues para usuarios, no requiere JSON manual y no procesa dinero ni apuestas en línea.

## Archivos principales

- `index.html`: formulario público para participantes.
- `admin.html`: panel para clasificados, resultados, CSV y calibración visual.
- `config.js`: `DEADLINE`, `TIMEZONE`, `GAS_WEBAPP_URL` y `MODE`.
- `data/bracket-slots.json`: coordenadas porcentuales de campos sobre la imagen.
- `data/matches.json` y `data/sample-state.json`: estructura inicial y demo local.
- `google-apps-script/Code.gs`: API para Google Sheets.

## 1. Subir `assets/bracket.png`

La llave visual debe guardarse como `assets/bracket.png`. Este repositorio no versiona binarios; si el archivo no existe, la página muestra un placeholder HTML/CSS claro para que puedas probar y calibrar. Sube tu imagen real de la llave eliminatoria con ese nombre exacto. No uses logos oficiales ni marcas registradas si no tienes permiso.

Los campos se ubican por porcentaje, no por pixeles, para mantener el diseño responsive. Ajusta la alineación desde `admin.html` con **Modo calibración** y copia el JSON resultante a `data/bracket-slots.json`.

## 2. Activar GitHub Pages

1. Sube el repositorio a GitHub.
2. Entra a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona la rama principal y la carpeta raíz `/`.
5. Guarda y espera la URL pública.

## 3. Crear Google Sheet

Crea una hoja de Google vacía. El Apps Script creará estas pestañas si no existen:

- `config`: `key`, `value`
- `matches`: `matchId`, `round`, `date`, `teamA`, `teamB`, `sourceLabelA`, `sourceLabelB`, `nextMatch`, `status`
- `submissions`: `timestamp`, `submissionId`, `playerNumber`, `playerName`, `predictionsJson`, `validBeforeDeadline`, `userAgentHash`, `version`
- `results`: `matchId`, `goalsA`, `goalsB`, `winner`, `status`
- `leaderboard`: `position`, `playerNumber`, `playerName`, `totalPoints`, `exactHits`, `winnerHits`, `lastValidSubmission`
- `audit`: `timestamp`, `action`, `payloadJson`

En `config`, agrega al menos:

| key | value |
| --- | --- |
| DEADLINE | 2026-07-01T18:00:00-06:00 |
| TIMEZONE | America/Costa_Rica |

## 4. Pegar `Code.gs` en Apps Script

1. En la hoja, abre **Extensions → Apps Script**.
2. Borra el contenido inicial.
3. Copia `google-apps-script/Code.gs`.
4. En **Project Settings → Script Properties**, crea `ADMIN_TOKEN` con un valor secreto.
5. Guarda.

## 5. Desplegar Apps Script como Web App

1. Click en **Deploy → New deployment**.
2. Tipo: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Copia la URL del Web App.

## 6. Copiar URL en `config.js`

Edita:

```js
window.QUINIELA_CONFIG = {
  DEADLINE: "2026-07-01T18:00:00-06:00",
  TIMEZONE: "America/Costa_Rica",
  GAS_WEBAPP_URL: "https://script.google.com/macros/s/.../exec",
  MODE: "production"
};
```

## 7. Usar modo demo

Deja `MODE: "demo"`. La web usa `data/sample-state.json` y guarda envíos en `localStorage`. En demo sí aparecen nombres de ejemplo marcados como demo.

## 8. Usar modo producción

Configura `GAS_WEBAPP_URL`, cambia `MODE` a `production` y publica en GitHub Pages. En producción no hay equipos ficticios por defecto: los equipos reales se cargan desde el panel admin o desde la pestaña `matches`.

## 9. Cargar clasificados

Abre `admin.html`, ingresa `ADMIN_TOKEN`, presiona **Cargar estado**, edita Equipo A / Equipo B por partido y usa **Guardar equipos**. Los nombres aparecen automáticamente en la llave pública.

## 10. Cargar resultados

En `admin.html`, completa goles, ganador/clasificado y estado `terminado`. En empates con penales, escribe el marcador previo a penales y en ganador el equipo que clasificó. Luego presiona **Guardar resultados** o **Recalcular tabla**.

## 11. Auditar registros

La pestaña `submissions` es append-only: cada guardado crea una fila nueva con `submissionId`, fecha, versión y marca `validBeforeDeadline`. La pestaña `audit` registra acciones como envíos, cambios de resultados y recálculos.

## 12. Evitar trampas

- El usuario no edita Google Sheets directamente.
- Cada pronóstico se agrega como fila nueva; no se borra ni sobrescribe.
- El cálculo usa la última predicción válida antes del cierre por número de jugador.
- Los registros tardíos se conservan como evidencia, pero no cuentan.
- El panel admin requiere `ADMIN_TOKEN` validado en Apps Script Properties.

## Reglas de puntaje

- 3 puntos: ganador/clasificado correcto y marcador exacto.
- 1 punto: ganador/clasificado correcto con marcador distinto.
- 0 puntos: ganador/clasificado incorrecto.

## Calibración visual

En `admin.html`, activa **Modo calibración**. Selecciona un campo sobre la llave:

- Flechas: mover.
- `Shift` + flechas: cambiar ancho/alto.
- `Alt` + flechas: ajuste fino.
- **Copiar coordenadas JSON**: copia el contenido para reemplazar `data/bracket-slots.json`.
