<?php
require_once __DIR__ . '/../config/auth.php';
requireAuth();

$data = getJsonInputAssoc();

$estudiante = $data['estudiante'] ?? '';
$asignacion = $data['asignacion'] ?? '';
$nivel      = $data['nivel'] ?? '';
$numero     = $data['numero'] ?? '';
$gradoInput = $data['grado'] ?? '';
$year       = $data['year'] ?? '';

if (empty($estudiante) || empty($asignacion) || empty($nivel) || empty($numero) || empty($gradoInput)) {
    http_response_code(400);
    echo json_encode(['exito' => false, 'mensaje' => 'Faltan parámetros requeridos.']);
    exit;
}

$yearSql = $year ? "AND year = ?" : "AND year = YEAR(CURDATE())";
$nuevoGradoConcat = "$nivel-$numero";

$mysqli = getDB();
$mysqli->begin_transaction();

try {
    // 1. Actualizar grado/número del estudiante en estugrupos
    $sql1 = "UPDATE estugrupos SET grado = ?, numero = ? WHERE estudiante = ? AND asignacion = ? $yearSql";
    $stmt1 = $mysqli->prepare($sql1);
    if ($year) {
        $stmt1->bind_param('sssss', $gradoInput, $numero, $estudiante, $asignacion, $year);
    } else {
        $stmt1->bind_param('ssss', $gradoInput, $numero, $estudiante, $asignacion);
    }
    $stmt1->execute();
    $stmt1->close();

    // 2. Copiar notas actuales a tabla temporal (session-scoped, auto-drop)
    $sql2 = "CREATE TEMPORARY TABLE notasTemporales SELECT * FROM notas WHERE estudiante = ? $yearSql";
    $stmt2 = $mysqli->prepare($sql2);
    if ($year) {
        $stmt2->bind_param('ss', $estudiante, $year);
    } else {
        $stmt2->bind_param('s', $estudiante);
    }
    $stmt2->execute();
    $stmt2->close();

    // 3. Actualizar grado en temporales
    $sql3 = "UPDATE notasTemporales SET grado = ? WHERE estudiante = ? $yearSql";
    $stmt3 = $mysqli->prepare($sql3);
    if ($year) {
        $stmt3->bind_param('sss', $nuevoGradoConcat, $estudiante, $year);
    } else {
        $stmt3->bind_param('ss', $nuevoGradoConcat, $estudiante);
    }
    $stmt3->execute();
    $stmt3->close();

    // 4. Reasignar docente según nuevo grado
    $yearCond = $year ? "AND nt.year = ? AND aa.year = ?" : "AND nt.year = YEAR(CURDATE()) AND aa.year = YEAR(CURDATE())";
    $sql4 = "
        UPDATE notasTemporales nt
        JOIN asignacion_asignaturas aa ON nt.asignatura = aa.asignatura
            AND nt.grado = CONCAT_WS('-', aa.nivel, aa.numero)
            AND nt.year = aa.year
        SET nt.ind = NULL, nt.docente = aa.docente
        WHERE 1=1 $yearCond
    ";
    $stmt4 = $mysqli->prepare($sql4);
    if ($year) {
        $stmt4->bind_param('ss', $year, $year);
    }
    $stmt4->execute();
    $stmt4->close();

    // 5. Eliminar notas originales
    $sql5 = "DELETE FROM notas WHERE estudiante = ? $yearSql";
    $stmt5 = $mysqli->prepare($sql5);
    if ($year) {
        $stmt5->bind_param('ss', $estudiante, $year);
    } else {
        $stmt5->bind_param('s', $estudiante);
    }
    $stmt5->execute();
    $stmt5->close();

    // 6. Insertar notas actualizadas desde temporales (REPLACE maneja duplicados cuando el estudiante tenía notas en dos grupos distintos antes del cambio)
    $sql6 = "REPLACE INTO notas SELECT * FROM notasTemporales WHERE estudiante = ? $yearSql";
    $stmt6 = $mysqli->prepare($sql6);
    if ($year) {
        $stmt6->bind_param('ss', $estudiante, $year);
    } else {
        $stmt6->bind_param('s', $estudiante);
    }
    $stmt6->execute();
    $stmt6->close();

    // 7. Actualizar número en inasistencias
    $sql7 = "UPDATE inasistencia SET numero = ? WHERE estudiante = ? $yearSql";
    $stmt7 = $mysqli->prepare($sql7);
    if ($year) {
        $stmt7->bind_param('sss', $numero, $estudiante, $year);
    } else {
        $stmt7->bind_param('ss', $numero, $estudiante);
    }
    $stmt7->execute();
    $stmt7->close();

    $mysqli->commit();
    echo json_encode(['exito' => true, 'mensaje' => '']);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(['exito' => false, 'mensaje' => 'Error al cambiar grupo.', 'detalle' => $e->getMessage()]);
}
