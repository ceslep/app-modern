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
     * DELETE /attendance/:id
     */
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM inasistencia WHERE ind = ?");
        $stmt->execute([$id]);
        success(null, 'Inasistencia eliminada');
    }
}
