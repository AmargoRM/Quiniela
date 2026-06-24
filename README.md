# Quiniela Mundial Oficina

Aplicación web estática para una quiniela de oficina. Incluye registro de jugadores con contraseña, inicio de sesión, guardado versionado de pronósticos, panel administrador, resultados, tabla, exportaciones y auditoría.

## 1. Probar en modo demo

1. Abre `config.js` y confirma:
   ```js
   MODE: "demo"
   ```
2. Sirve el proyecto con cualquier servidor estático. Ejemplo:
   ```bash
   python3 -m http.server 8000
   ```
3. Entra a `http://localhost:8000/index.html`.

El modo demo usa `localStorage`:

- `quinielaUsers`: jugadores registrados.
- `quinielaCurrentUser`: sesión local actual.
- `quinielaSubmissions`: versiones de quiniela guardadas.
- `quinielaMatches`, `quinielaResults`, `quinielaAudit`: datos administrados en demo.

## 2. Registrar jugadores

En `index.html`, abre la pestaña **Registrar jugador** y completa:

- Nombre completo.
- Número de jugador.
- Contraseña.
- Confirmar contraseña.

Reglas:

- El número de jugador es único.
- La contraseña mínima es de 4 caracteres.
- La contraseña no se muestra en pantalla.
- Después del registro, el jugador queda conectado automáticamente.

## 3. Iniciar sesión como jugador

En la pestaña **Iniciar sesión**, escribe:

- Número de jugador.
- Contraseña.

El jugador verá su sesión como `Jugador: [nombre] · #[número]`. Desde ahí puede llenar la quiniela, alternar entre **Vista formulario** y **Vista llave**, guardar, ver historial y cerrar sesión.

## 4. Crear Google Sheet

Para producción:

1. Crea una hoja de cálculo en Google Sheets.
2. Abre **Extensiones → Apps Script**.
3. Pega el contenido de `google-apps-script/Code.gs`.
4. Ejecuta una acción inicial o despliega la web app para que el script cree las hojas.

Hojas esperadas:

- `users`: `createdAt`, `playerNumber`, `playerName`, `passwordHash`, `status`, `lastLogin`.
- `submissions`: `timestamp`, `submissionId`, `playerNumber`, `playerName`, `predictionsJson`, `validBeforeDeadline`, `version`.
- `audit`: `timestamp`, `action`, `playerNumber`, `payloadJson`.
- También se usan `config`, `matches`, `results` y `leaderboard`.

## 5. Instalar Apps Script

1. En Apps Script, pega `google-apps-script/Code.gs`.
2. Guarda el proyecto.
3. Despliega como **Web app**.
4. Permite acceso según tu organización.
5. Copia la URL del despliegue.

## 6. Configurar `ADMIN_PASSWORD_HASH`

El administrador usa una contraseña normal, pero Apps Script guarda solo el hash SHA-256.

1. Genera el SHA-256 de la contraseña elegida.
2. En Apps Script, abre **Project Settings → Script Properties**.
3. Crea la propiedad `ADMIN_PASSWORD_HASH` con ese hash.

Ejemplo local para generar el hash:

```bash
printf 'mi-contraseña-admin' | sha256sum
```

Copia solo la cadena hexadecimal.

## 7. Activar modo producción

En `config.js` configura:

```js
window.QUINIELA_CONFIG = {
  MODE: "production",
  GAS_WEBAPP_URL: "https://script.google.com/macros/s/.../exec",
  DEADLINE: "2026-07-01T18:00:00-06:00",
  TIMEZONE: "America/Costa_Rica"
};
```

## 8. Usar el panel admin

Abre `admin.html` y entra con la **Contraseña de administrador**. El panel muestra pestañas para:

- Jugadores.
- Resultados.
- Clasificados / equipos.
- Tabla.
- Auditoría.
- Exportar.

## 9. Cargar equipos

En **Clasificados / equipos** edita por partido:

- `matchId`.
- Ronda.
- Equipo A.
- Equipo B.

Presiona **Guardar equipos**. Los jugadores verán los equipos actualizados en la vista formulario y en la llave visual.

## 10. Cargar resultados

En **Resultados** completa por partido:

- Goles A.
- Goles B.
- Clasificado.
- Estado: `pendiente` o `terminado`.

Al guardar resultados se recalcula la tabla.

## 11. Exportar tabla

En **Exportar** hay botones para descargar:

- Jugadores CSV.
- Predicciones CSV.
- Tabla CSV.

## 12. Auditar versiones

Cada guardado de quiniela crea una nueva versión en `submissions`; no se sobrescriben versiones anteriores. La versión válida para puntaje es la última antes del cierre. La pestaña **Auditoría** muestra acciones administrativas y envíos relevantes.

## Reglas de puntaje

- 3 puntos si acierta clasificado y marcador exacto.
- 1 punto si acierta clasificado pero no marcador.
- 0 puntos si falla clasificado.
- En penales cuenta el marcador antes de penales y el clasificado real.

## Archivos principales

- `index.html` / `app.js`: experiencia del jugador.
- `admin.html` / `admin.js`: administración real de oficina.
- `config.js`: modo, URL de Apps Script, cierre y zona horaria.
- `google-apps-script/Code.gs`: backend para Google Sheets.
- `assets/bracket.png`: imagen opcional de la llave visual.
