# Plan: Fix + Modernize `guardar_notas.php` y `guardar_notas2.php`

## Decisión confirmada
- **Opción:** B (modernizar legacy)
- **Alcance:** Ambos archivos (`guardar_notas.php` + `guardar_notas2.php`)
- **Urgencia:** No bloqueante, ir directo a B

---

## Fase 0 — Diagnóstico DB (prerrequisito, 2 min)

Antes de tocar código, ejecutar y compartir resultados. Necesito confirmar:

```sql
-- 1. Estructura de estugrupos (saber qué columnas existen)
SHOW COLUMNS FROM estugrupos;

-- 2. Estructura de notas2 y aspectosIndividuales
SHOW COLUMNS FROM notas2;
SHOW COLUMNS FROM aspectosIndividuales;

-- 3. Verificar si el estudiante del payload existe y en qué formato
SELECT * FROM estugrupos WHERE estudiante = '1058079911' AND (anio = 2026 OR year = 2026) LIMIT 5;
```

Con esos datos:
- Confirmo si `estugrupos` tiene `nivel`/`numero` separados o un `grado` compuesto
- Confirmo si la columna year es `year` o `anio`
- Confirmo qué columnas tiene `notas2` (¿es lo mismo que `notas` o tiene estructura distinta?)
- Confirmo qué columnas tiene `aspectosIndividuales` (necesito saber PK para los `REPLACE`)

**Si no podemos ejecutar esto, trabajo con assumptions documentadas** y dejo TODOs marcados.

---

## Fase 1 — `guardar_notas.php` modernizado

### Estructura del nuevo archivo

```
┌─────────────────────────────────────────────┐
│ Headers + conexión mysqli (igual)           │
├─────────────────────────────────────────────┤
│ 1. Decodificar payload                      │
│ 2. Validar estructura mínima                │
│ 3. Verificar estado de plataforma           │
│    (select estado from estadoNotas)         │
├─────────────────────────────────────────────┤
│ 4. BEGIN TRANSACTION                        │
│ 5. Loop sobre $notas:                       │
│    a. Validar estudiante                     │
│       (parsing '7-2' → nivel, numero)       │
│    b. Verificar enrollment                  │
│    c. Detectar columnas nota_X dinámicas     │
│    d. INSERT/UPDATE con prepared stmt       │
│ 6. COMMIT (o ROLLBACK en error)             │
├─────────────────────────────────────────────┤
│ 7. Respuesta JSON:                          │
│    {success, msg, saved_count, errors[]}     │
└─────────────────────────────────────────────┘
```

### Cambios clave

| Línea actual | Problema | Reemplazo |
|---|---|---|
| 25 | `json_decode` sin try-catch | Try-catch → `error` con 400 |
| 27-39 | Query estado sin try-catch robusto | Try-catch que NO detiene si la tabla no existe |
| 56-69 | Loop 1-12 hardcoded con warnings | Loop sobre las keys reales del payload (`notaN` donde N ∈ payload) |
| 88-133 | Concatenación de strings | Prepared statement con `INSERT ... ON DUPLICATE KEY UPDATE` |
| 94 | `WHERE grado='7-2'` (columna inexistente probable) | Parsear a `nivel`/`numero`, usar la columna correcta |
| 134 | `sprintf($sql, ...)` código muerto | **Eliminar** |
| 137 | `multi_query($sql)` sin guard | `if (!empty($sql))` antes |
| 138-140 | Echo con `mysqli->error` y SQL al cliente | Solo loggear SQL al server, retornar JSON genérico al cliente |
| General | Sin transacciones | `BEGIN/COMMIT/ROLLBACK` |
| General | No usa `real_escape_string` en valores numéricos | Validación con `is_numeric`/`ctype_digit` antes de bind |

### Detección dinámica de columnas nota_N

En lugar del loop `for ($j = 1; $j <= 12; $j++)`:

```php
$notaKeys = [];
foreach ($notas[0] ?? [] as $key => $_) {
    if (preg_match('/^nota(\d+)$/', $key, $m)) {
        $notaKeys[] = (int) $m[1];
    }
}
sort($notaKeys);
```

Luego iterar sobre `$notaKeys` para la validación de aspectos. Sin warnings de keys inexistentes.

### Validación de enrollment

```php
// Parsear "7-2" en nivel + numero
if (strpos($grado, '-') !== false) {
    [$nivel, $numero] = explode('-', $grado, 2) + [null, null];
} else {
    $nivel = $grado;
    $numero = '';
}

// Asumiendo estructura moderna: nivel, numero, year|anio
// (ajustar según resultado de Fase 0)
$stmt = $mysqli->prepare("
    SELECT COUNT(*) FROM estugrupos
    WHERE estudiante = ?
      AND nivel = ?
      AND numero = ?
      AND (anio = ? OR year = ?)
");
$stmt->bind_param('sssii', $estudiante_id, $nivel, $numero, $nota_year, $nota_year);
```

### SQL con prepared statements

En lugar de construir SQL dinámico con concatenación:

```php
// Detectar todas las columnas del payload
$columns = array_keys($nota[0]);
$placeholders = implode(',', array_fill(0, count($columns), '?'));

// Construir UPDATE clause
$updateClauses = array_map(
    fn($c) => "$c = VALUES($c)",
    $columns
);

// Primary key para ON DUPLICATE KEY
// (asumiendo: estudiante + asignatura + periodo + year, ajustar según Fase 0)
$pkCols = ['estudiante', 'asignatura', 'periodo', 'year'];

$sql = "INSERT INTO notas (" . implode(',', $columns) . ") 
        VALUES ($placeholders)
        ON DUPLICATE KEY UPDATE " . implode(',', $updateClauses);

$stmt = $mysqli->prepare($sql);
```

### Respuesta JSON consistente

```json
// Éxito
{ "success": true, "msg": "Notas guardadas", "saved": 5, "skipped": 0, "errors": [] }

// Con errores parciales
{ "success": false, "msg": "Algunas notas no se guardaron", "saved": 3, "skipped": 2, "errors": [...] }

// Aspecto faltante
{ "success": false, "msg": "error_de_aspecto", "info_aspecto": "...", "estudiante": "..." }
```

`notas.js:1432` ya verifica `result.msg === 'error_de_aspecto'`, mantengo ese contrato.

---

## Fase 2 — `guardar_notas2.php` modernizado

Mismo enfoque que Fase 1, con cambios específicos:

### Diferencias vs guardar_notas.php

1. **Tabla destino:** `notas2` (en lugar de `notas`)
2. **Efecto secundario:** También hace INSERT/UPDATE en `aspectosIndividuales` (líneas 142-172)
3. **No retorna JSON al cliente** (notas.js:1418 fire-and-forget) — pero debería retornar por consistencia

### SQL injection crítico actual (líneas 154, 166, 170)

```php
// ACTUAL (línea 154) - vulnerable
$subquery="('$docente','$grado','$periodo','$asignatura','$aspectotxt','$porcentaje','$fecha','$nota','$eyear')";

// ACTUAL (líneas 166, 170) - vulnerable
$query="UPDATE aspectosIndividuales set porcentaje=NULL where porcentaje=0.00 and docente='$docente' and asignatura='$asignatura' and periodo='$periodo' and year=$year";
```

**Fix:** prepared statements para todo. Bind de tipos:
- `docente`, `grado`, `periodo`, `asignatura`, `aspectotxt` → string
- `porcentaje`, `nota`, `eyear` → int/decimal
- `fecha` → string (YYYY-MM-DD) o NULL

### Lógica de Aspectos

El loop actual (líneas 80-115) construye `$Aspectos[]` iterando sobre keys. Bugs:
- `$idx` no se incrementa consistentemente
- `$aspectoi` se reusa fuera del if
- `nota` se calcula como `$idx - 1` después del incremento (desfase de 1)

**Fix:** usar `$notaKeys` (mismo de Fase 1) + map directo a campos `aspectoN`, `porcentajeN`, `fechaaN`.

---

## Fase 3 — Verificación

Después de aplicar los cambios:

1. **Restart Apache** (o nada si PHP recarga solo)
2. **Hard reload** en navegador (Ctrl+Shift+R)
3. **Probar guardar notas** desde la UI con un estudiante real
4. **Verificar en DB:**
   ```sql
   SELECT * FROM notas WHERE estudiante = '1058079911' AND year = 2026;
   SELECT * FROM notas2 WHERE estudiante = '1058079911' AND year = 2026;
   SELECT * FROM aspectosIndividuales WHERE docente = '75081186' AND year = 2026 LIMIT 5;
   ```
5. **Verificar consola del navegador:** sin warnings, sin 500
6. **Verificar log de Apache:** sin `PHP Warning`, sin `Fatal error`

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Asumir estructura de `estugrupos` y estar mal | Fase 0 confirma antes de tocar |
| Columna `ind` (PK) de `notas2`/`aspectosIndividuales` desconocida | Fase 0 + ON DUPLICATE KEY funciona si hay UNIQUE constraint |
| Rollback deja notas a medias | Transacciones previenen esto; pero si COMMIT falla a mitad del loop, las anteriores ya están — usar SAVEPOINT o savepoint por fila |
| `notas.js` espera un shape específico | Mantengo `result.msg === 'error_de_aspecto'` y `result.msg === 'Prohibido'` |
| Trigger en `notas`/`notas2` no contemplado | Verificar triggers antes con `SHOW TRIGGERS` en Fase 0 |

---

## Orden de ejecución

1. **Fase 0** — Ejecutar SQLs de diagnóstico, pegar resultados en chat
2. **Fase 1** — Escribir `guardar_notas.php` nuevo
3. **Backup** — Crear `guardar_notas.php.bak` y `guardar_notas2.php.bak` por si hay que rollback
4. **Test** — Probar guardar UNA nota
5. **Fase 2** — Escribir `guardar_notas2.php` nuevo
6. **Test** — Probar guardar una nota completa (ambas escrituras)
7. **Cleanup** — Eliminar `.bak` si todo funciona

---

## Salida esperada del fix

**Consola del navegador:**
- Sin warnings de `nota12` ni `$campos`
- Sin 500
- Mensaje "Guardado — N estudiante(s) guardado(s)" en el alert

**DB después de un guardado:**
- `notas`: nueva fila (o update) con `estudiante=1058079911, asignatura=MATEMATI, periodo=TRES, year=2026, nota1=5, ...`
- `notas2`: misma info
- `aspectosIndividuales`: filas para cada `aspectoN` no vacío

**Log de Apache:**
- Sin warnings ni fatals de `guardar_notas.php` o `guardar_notas2.php`

---

**Listo para implementar cuando me digas "adelante" (o cuando salgamos de plan mode).**


### Error 1 — Línea 62: `Warning: Undefined array key "nota12"`

**Causa:** El loop `for ($j = 1; $j <= 12; $j++)` está hardcoded a 12 notas. El payload enviado tiene solo `nota1`..`nota11` (11 notas). En la iteración j=12, `$nota['nota12']` no existe → warning PHP 8+.

**Severidad:** Warning, no detiene ejecución. Pero indica diseño rígido.

### Error 2 — Línea 134: `Warning: Undefined variable $campos`

**Causa raíz probable:** La variable `$campos` solo se asigna dentro de:
```php
if ($verification_result && $verification_result->fetch_row()[0] > 0) {
    $k = 0;
    $campos = "";
    // ...
}
```

Si la verificación falla (estudiante NO está en `estugrupos` con `grado='7-2'` y `year='2026'`), `$campos` nunca se asigna. Hay 3 posibles razones para que la verificación falle con el payload actual:

1. **El estudiante `1058079911` no existe en `estugrupos`** (o no para 2026).
2. **El formato `grado='7-2'` no coincide con la columna** — `estugrupos` probablemente tiene columnas separadas `nivel` + `numero`, no un `grado` compuesto.
3. **El nombre de la columna year** — puede ser `year` o `anio` según la versión de la tabla.

**Severidad:** Warning que enmascara un fallo silencioso: la nota NO se está guardando y el usuario no se entera (solo `error_log`).

### Error 3 — Línea 137: `Fatal: Query was empty`

**Causa:** Por consecuencia del error 2, `$sql` queda vacío. `multi_query('')` lanza fatal error.

### Bug 4 — Línea 134 (código muerto malicioso)

```php
$sql = sprintf($sql, $campos, $values);
```

Esto re-aplica `sprintf` al string `$sql` ya ensamblado. La intención original era usar `$sqli` (el template). Es un leftover que debería eliminarse.

### Resumen de flujo del error

```
notas.js:1425
  └→ guardar_notas.php
       ├─ j=1..12 loop: nota12 undefined → Warning (línea 62)
       ├─ foreach $notas: verificación FALLA → $campos nunca se asigna
       └─ línea 134: sprintf($sql, $campos, $values)
            └─ $campos undefined → Warning
                 └─ línea 137: multi_query('') → Fatal
```

---

## 2. Diagnóstico de la causa raíz de la verificación

**No puedo ejecutar el diag directo** (estoy en plan mode, no puedo crear/leer archivos de DB), pero por la estructura del código y los modelos modernos:

- `Grade::getByGroup` (moderno, `server/models/Grade.php:42-60`) hace:
  ```php
  INNER JOIN estugrupos e ON n.estudiante = e.estudiante AND e.anio = n.year
  WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ?
  ```
  → usa `nivel` y `numero` separados, no un `grado` compuesto.

- `guardar_notas.php:94` (legacy):
  ```php
  SELECT COUNT(*) FROM estugrupos WHERE estudiante = ? AND grado = ? AND year = ?
  ```
  → usa una sola columna `grado` con valor "7-2".

**Esto sugiere que la verificación legacy busca una columna `grado` que no existe tal cual** — debería ser `nivel='7' AND numero='2'`. La verificación falla → `$campos` undefined → bug en cascada.

> **Acción recomendada** antes de aplicar cualquier fix: ejecutar este SQL de diagnóstico (cuando salgamos de plan mode):
> ```sql
> SELECT * FROM estugrupos WHERE estudiante = '1058079911' AND (anio = 2026 OR year = 2026) LIMIT 5;
> ```
> Confirmará si el problema es de mapeo `grado` vs `nivel/numero`.

---

## 3. Opciones de solución (de menor a mayor alcance)

### Opción A — Parche mínimo (15 min, bajo riesgo)

**Cambios solo en `guardar_notas.php`:**

1. **Línea 134:** Reemplazar `$sql = sprintf($sql, $campos, $values);` por `;` (eliminar línea muerta) o eliminarla.
2. **Línea 48 / Línea 99:** Inicializar `$campos = ""; $valores = "";` antes del foreach.
3. **Línea 62:** Cambiar el loop a `for ($j = 1; $j <= 12; $j++) { if (!isset($nota['nota'.$j])) continue; ... }` para no leer keys inexistentes.
4. **Línea 137:** Envolver `multi_query` en `if (!empty($sql))`.
5. **NO toca la verificación** — sigue fallando silenciosamente. La nota NO se guardará si la verificación falla, igual que ahora.

**Pros:** Cambio aislado, no rompe nada más.
**Contras:** No arregla el problema real (verificación con columna incorrecta). SQL injection sigue presente. Sigue sin transacciones.

### Opción B — Modernizar el archivo legacy (1-2 horas, riesgo medio) ⭐ Recomendado

**Todo lo de Opción A, más:**

1. **Reescribir la verificación** con la estructura real de `estugrupos`:
   ```php
   // Parsear "7-2" en nivel y numero
   [$nivel, $numero] = explode('-', $grado_nota, 2) + [null, null];
   $stmt = $mysqli->prepare("SELECT COUNT(*) FROM estugrupos WHERE estudiante=? AND nivel=? AND numero=? AND (year=? OR anio=?)");
   $stmt->bind_param('sssii', $estudiante_id, $nivel, $numero, $nota_year, $nota_year);
   ```
2. **Prepared statements** para todos los INSERTs (no concatenación de strings).
3. **Transacciones:** BEGIN antes del loop, COMMIT al final, ROLLBACK en error.
4. **Detección dinámica de notas** en lugar de hardcoded 1..12.
5. **Respuesta JSON consistente** (`{success, msg, data?}`) en vez de `{msg}`.
6. **Mismo interface** — `notas.js` no necesita cambios.

**Bonus:** Aplicar el mismo tratamiento a `guardar_notas2.php` (mismos bugs + SQL injection en líneas 154, 166-172).

**Pros:** Mantiene contrato con el frontend. Elimina SQL injection, agrega atomicidad, fix real de la verificación. Migration path fácil.
**Contras:** No aprovecha el `GradeController` moderno. Sigue siendo procedural.

### Opción C — Migración completa a la API moderna (3-4 horas, riesgo medio-alto)

**Todo lo de Opción B, más:**

1. **Agregar `POST /grades/batch`** en `server/routes/api.php` que enrute a un nuevo método `GradeController::createBatch()`.
2. **Extender `Grade::saveBatch($rows)`** para hacer un INSERT/UPDATE bulk con prepared statements + transacción.
3. **Refactorizar `notas.js:1418-1429`:** Reemplazar las dos llamadas legacy por una sola a `api.post('grades/batch', { rows: changedRows })`.
4. **Mantener shim legacy como fallback** durante la transición (feature flag).
5. **Migrar también el guardado de `aspectosIndividuales`** que hace `guardar_notas2.php` (a un nuevo endpoint o dentro del batch).

**Pros:** Es el "终点" correcto. Una sola fuente de verdad. Mejor observabilidad.
**Contras:** Más archivos tocados. Requiere testing de regresión. La conversión del payload legacy (90+ campos) al formato moderno es trabajo extra.

---

## 4. Recomendación

**Opción B (modernizar legacy)** + dejar Opción C como ticket futuro.

Razones:
- Resuelve los 3 errores reales (no solo los warnings)
- Arregla la verificación (la causa raíz probable)
- Mantiene el contrato con `notas.js` (no requiere tocar frontend)
- No requiere coordinación de releases con el frontend
- Es la mitad del trabajo de Opción C, con 80% del beneficio
- Después se puede migrar a Opción C cuando haya tiempo

Si querés el arreglo YA para no bloquear a los docentes que están guardando notas, hago Opción A primero y Opción B después. Si tenés una hora libre, voy directo a B.

---

## 5. Preguntas antes de implementar

1. **¿Hay datos existentes en `notas2` o `aspectosIndividuales` que se estén consultando desde otros lados?** Si solo `guardar_notas2.php` escribe ahí y nadie lee, podemos dejar de llamarlo y solo guardar en `notas`. Si se consultan desde informes/dashboards, hay que conservarlos.

2. **¿La verificación con `grado='7-2'` falla por el formato o por otro motivo?** Necesito ejecutar el SQL de diagnóstico de la sección 2 para confirmar antes de tocar la query. ¿Puedo salir de plan mode y ejecutarlo?

3. **¿Cuál es la urgencia?** Si los docentes están bloqueados guardando notas, voy con Opción A inmediatamente. Si no hay urgencia, Opción B completa.

4. **¿`USE_LEGACY_ENDPOINTS = true` se va a quedar así por mucho tiempo?** Si la migración a la API moderna está en el roadmap cercano, Opción C tiene más sentido desde el día 1. Si va a quedarse en legacy por meses, Opción B.

---

## 6. Archivos a tocar (estimación)

| Opción | Archivos backend | Archivos frontend | Líneas modificadas |
|---|---|---|---|
| A | 1 (`guardar_notas.php`) | 0 | ~10 |
| B | 2 (`guardar_notas.php`, `guardar_notas2.php`) | 0 | ~200-300 (rewrite de ambos) |
| C | 4 (`GradeController.php`, `Grade.php`, `routes/api.php`, `notas.js`) + shim legacy | 1 | ~400-500 |

---

**Esperando tu decisión antes de tocar nada.**
