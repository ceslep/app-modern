<?php
/**
 * Attendance controller - inasistencia table
 */
class AttendanceController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /attendance - List attendance records
     */
    public function index(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $periodo = getQueryParam('periodo');
        $fecha = getQueryParam('fecha');

        $year = date('Y');
        $conditions = ["i.year = ?"];
        $params = [$year];

        if ($asignacion && $nivel && $numero) {
            $conditions[] = "i.asignacion = ?"; $params[] = $asignacion;
            $conditions[] = "i.nivel = ?"; $params[] = $nivel;
            $conditions[] = "i.numero = ?"; $params[] = $numero;
        }
        if ($periodo) {
            $conditions[] = "i.periodo = ?"; $params[] = $periodo;
        }
        if ($fecha) {
            $conditions[] = "i.fecha = ?"; $params[] = $fecha;
        }

        $where = implode(' AND ', $conditions);
        $stmt = $this->db->prepare("
            SELECT i.ind, i.estudiante, i.nivel, i.numero, i.asignacion,
                   i.materia, i.periodo, i.fecha, i.horas, i.excusa,
                   i.docente, i.hora_clase, i.detalle, i.fechahora,
                   e.nombres
            FROM inasistencia i
            INNER JOIN estugrupos e ON i.estudiante = e.estudiante AND e.anio = i.year
            WHERE $where
            ORDER BY i.fecha DESC, e.nombres
            LIMIT 200
        ");
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    /**
     * POST /attendance - Create attendance record
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['estudiante', 'materia', 'periodo', 'fecha']);

        $docente = getCurrentUserId();
        $year = date('Y');

        $stmt = $this->db->prepare("
            INSERT INTO inasistencia (estudiante, nivel, numero, asignacion, materia, periodo,
                fecha, horas, excusa, docente, hora_clase, convivencia, detalle, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
        ");
        $stmt->execute([
            $data->estudiante,
            $data->nivel ?? 0,
            $data->numero ?? 0,
            $data->asignacion ?? 0,
            $data->materia,
            $data->periodo,
            $data->fecha,
            $data->horas ?? '1',
            $data->excusa ?? '',
            $docente,
            $data->hora_clase ?? '',
            $data->detalle ?? '',
            $year,
        ]);

        created(['id' => $this->db->lastInsertId()], 'Inasistencia registrada');
    }

    /**
     * POST /attendance/batch - Multiple attendance records
     */
    public function batch(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['fecha', 'materias']);

        $docente = $data->docente_id ?? getCurrentUserId();
        $year = date('Y');

        // Detect current period
        $periodo = '1';
        $stmtPer = $this->db->prepare(
            "SELECT nombre FROM periodos
             WHERE CURDATE() BETWEEN fechainicial AND fechafinal
             ORDER BY ind LIMIT 1"
        );
        $stmtPer->execute();
        $row = $stmtPer->fetch();
        if ($row) {
            $periodo = $row['nombre'];
        } else {
            // Fallback: use first period of current year
            $stmtPer = $this->db->prepare(
                "SELECT nombre FROM periodos
                 WHERE YEAR(fechainicial) = ? OR YEAR(fechafinal) = ?
                 ORDER BY ind LIMIT 1"
            );
            $stmtPer->execute([$year, $year]);
            $row = $stmtPer->fetch();
            if ($row) $periodo = $row['nombre'];
        }

        $materias = $data->materias;
        if (!is_array($materias) || count($materias) === 0) {
            error('Debe enviar al menos una materia con registros');
        }

        $this->db->beginTransaction();
        $inserted = 0;

        try {
            $stmt = $this->db->prepare("
                INSERT INTO inasistencia
                    (estudiante, nivel, numero, asignacion, materia, periodo,
                     fecha, horas, excusa, docente, hora_clase, convivencia, detalle, year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?)
            ");

            foreach ($materias as $m) {
                if (empty($m->registros) || !is_array($m->registros)) continue;

                $nivel = $m->nivel ?? 0;
                $numero = $m->numero ?? 0;
                $asignacion = $m->asignacion ?? 0;
                $materia = $m->materia ?? '';
                $horasDefault = $m->horas ?? '1';

                foreach ($m->registros as $r) {
                    $horas = $r->horas ?? $horasDefault;
                    $stmt->execute([
                        $r->estudiante_id,
                        $nivel,
                        $numero,
                        $asignacion,
                        $materia,
                        $periodo,
                        $data->fecha,
                        $horas,
                        $r->motivo ?? '',
                        $docente,
                        $r->observaciones ?? '',
                        $year,
                    ]);
                    $inserted++;
                }
            }

            $this->db->commit();
            success(['count' => $inserted], "$inserted inasistencia(s) registrada(s)");

        } catch (Exception $e) {
            $this->db->rollBack();
            error('Error al registrar inasistencias: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /attendance/:id
     */
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM inasistencia WHERE ind = ?");
        $stmt->execute([$id]);
        success(null, 'Inasistencia eliminada');
    }
}
