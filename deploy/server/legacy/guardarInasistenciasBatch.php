<?php
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $data = getJsonInput();

    if (!$data || empty($data->fecha) || empty($data->materias)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Faltan campos requeridos: fecha, materias']);
        exit;
    }

    $docente = (int)($data->docente_id ?? 0);
    $fecha = $data->fecha;
    $year = date('Y');

    // Detect current period
    $db = getDB();
    $periodo = '1';
    $r = $db->query("SELECT nombre FROM periodos WHERE CURDATE() BETWEEN fechainicial AND fechafinal ORDER BY ind LIMIT 1");
    if ($r && $row = $r->fetch_assoc()) {
        $periodo = $row['nombre'];
    } else {
        $r = $db->query("SELECT nombre FROM periodos WHERE YEAR(fechainicial) = $year OR YEAR(fechafinal) = $year ORDER BY ind LIMIT 1");
        if ($r && $row = $r->fetch_assoc()) {
            $periodo = $row['nombre'];
        }
    }

    $materias = $data->materias;
    if (!is_array($materias) || count($materias) === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Debe enviar al menos una materia con registros']);
        exit;
    }

    $db->begin_transaction();
    $inserted = 0;

    try {
        $sql = "REPLACE INTO inasistencia
                    (estudiante, nivel, numero, asignacion, materia, periodo, fecha, horas, excusa, docente, hora_clase, convivencia, detalle, device, year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, '', ?)";

        $stmt = $db->prepare($sql);

        foreach ($materias as $m) {
            if (empty($m->registros) || !is_array($m->registros)) continue;

            $nivel = (int)($m->nivel ?? 0);
            $numero = (int)($m->numero ?? 0);
            $materia = $m->materia ?? '';
            $horasDefault = $m->horas ?? '1';

            $resolveStmt = $db->prepare("SELECT nivel, numero, asignacion FROM estugrupos WHERE estudiante = ? AND anio = ? LIMIT 1");

            foreach ($m->registros as $r) {
                $horas = (isset($r->horas) && $r->horas !== '') ? $r->horas : $horasDefault;
                $motivo = $r->motivo ?? '';
                $observaciones = $r->observaciones ?? '';

                $estudianteId = (int)($r->estudiante_id ?? 0);
                $estNivel = $nivel;
                $estNumero = $numero;
                $estAsignacion = 0;
                if ($estudianteId > 0) {
                    $resolveStmt->bind_param('ii', $estudianteId, $year);
                    $resolveStmt->execute();
                    $qr = $resolveStmt->get_result();
                    if ($row = $qr->fetch_assoc()) {
                        $estNivel = (int)$row['nivel'];
                        $estNumero = (int)$row['numero'];
                        $estAsignacion = (int)$row['asignacion'];
                    }
                    $qr->free();
                }

                $stmt->bind_param(
                    'siiisssssisi',
                    $estudianteId,
                    $estNivel,
                    $estNumero,
                    $estAsignacion,
                    $materia,
                    $periodo,
                    $fecha,
                    $horas,
                    $motivo,
                    $docente,
                    $observaciones,
                    $year
                );
                $stmt->execute();
                $inserted++;
            }
        }

        $db->commit();
        echo json_encode([
            'success' => true,
            'data' => ['count' => $inserted],
            'message' => "$inserted inasistencia(s) registrada(s)"
        ]);
    } catch (Exception $e) {
        $db->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al registrar inasistencias: ' . $e->getMessage()]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
