# Quiniela Mundial Oficina

Aplicación web estática para administrar una quiniela interna de oficina durante la fase eliminatoria del Mundial. Funciona con HTML, CSS y JavaScript puro, sin dependencias de ejecución, y está lista para GitHub Pages.

## Características

- Tabla de posiciones generada desde archivos versionados.
- Predicciones append-only en `data/submissions.jsonl`: nunca se sobrescriben envíos anteriores.
- Puntuación automática:
  - 3 puntos si se acierta clasificado y marcador exacto.
  - 1 punto si se acierta solo el clasificado.
  - 0 puntos si no se acierta el clasificado.
- Soporte para empates con penales: el marcador es antes de penales y `winner` es el equipo clasificado.
- Panel `admin.html` de solo lectura para revisar resultados cargados.
- Workflows para registrar predicciones desde GitHub Issues y recalcular la tabla.

## Estructura

```text
.
├── index.html
├── admin.html
├── app.js
├── admin.js
├── styles.css
├── data/
│   ├── config.json
│   ├── matches.json
│   ├── results.json
│   ├── submissions.jsonl
│   └── leaderboard.json
├── scripts/
│   ├── lib.js
│   ├── score.js
│   ├── register-issue-submission.js
│   └── validate-submissions.js
└── .github/
    ├── ISSUE_TEMPLATE/prediccion.yml
    └── workflows/
```

## Activar GitHub Pages

1. Sube este repositorio a GitHub.
2. Entra en **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama principal y la carpeta `/root`.
5. Guarda. La web publicará `index.html` y `admin.html`.

## Configurar fecha límite

Edita `data/config.json`:

```json
{
  "deadline": "2026-06-30T18:00:00-06:00",
  "timezone": "America/Costa_Rica",
  "title": "Quiniela Mundial Oficina",
  "tournamentStage": "Fase eliminatoria"
}
```

La tabla oficial usa la última predicción válida de cada jugador cuyo `timestamp` sea menor o igual a `deadline`.

## Cargar partidos

Edita `data/matches.json`. La estructura es flexible:

```json
{
  "id": "P73",
  "round": "16avos",
  "date": "2026-07-01T12:00:00-06:00",
  "teamA": "Costa Norte",
  "teamB": "Valle Sur",
  "nextMatch": "P81",
  "bracketSide": "A"
}
```

Puedes agregar partidos de 16avos, 8vos, cuartos, semifinales, tercer lugar y final sin cambiar la lógica de puntuación.

## Registrar predicciones

### Recomendado: GitHub Issues

1. Activa Issues en el repositorio.
2. Abre un issue con la plantilla **Predicción de quiniela**.
3. Completa número, nombre y predicciones en JSON.
4. El workflow `.github/workflows/register-prediction.yml` copia el contenido a `data/submissions.jsonl`, comenta “Predicción registrada”, cierra el issue y hace commit.

Aunque alguien edite el issue después, la predicción oficial será la línea ya copiada a `data/submissions.jsonl`.

### Manual

Agrega una línea JSON nueva en `data/submissions.jsonl`. No edites ni borres líneas anteriores:

```json
{"timestamp":"2026-06-20T15:30:00-06:00","playerNumber":"01","playerName":"Ana","predictions":[{"matchId":"P73","teamA":"Costa Norte","teamB":"Valle Sur","goalsA":1,"goalsB":1,"winner":"Costa Norte"}],"source":"manual","commitHash":"opcional"}
```

## Cargar resultados reales

Edita `data/results.json`:

```json
{
  "matchId": "P73",
  "goalsA": 1,
  "goalsB": 1,
  "winner": "Costa Norte",
  "status": "finished"
}
```

Para partidos pendientes usa `status: "pending"` y valores `null` en marcador y ganador.

## Recalcular la tabla

Localmente:

```bash
node scripts/validate-submissions.js
node scripts/score.js
```

Esto genera `data/leaderboard.json`. El workflow `.github/workflows/scoreboard.yml` también lo ejecuta cuando cambian archivos en `data/` o `scripts/`.

## Auditar trampas

- `data/submissions.jsonl` es append-only: cada corrección debe ser una nueva línea.
- Revisa el historial con `git log -- data/submissions.jsonl`.
- Revisa cambios puntuales con `git show <commit> -- data/submissions.jsonl`.
- La tabla ignora envíos posteriores a `deadline` y usa solo la última predicción válida antes del cierre.
- Los issues cerrados dejan evidencia del momento de apertura y del commit automático.

## Datos de ejemplo

El repositorio incluye partidos ficticios, tres participantes, resultados terminados y una tabla generada para probar la experiencia completa antes de usar datos reales.
