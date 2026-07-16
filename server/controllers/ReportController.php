<?php
/**
 * Report controller - generates consolidated reports
 */
class ReportController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /reports/grades - Consolidated grades report
     */
    public function grades(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $periodo = getQueryParam('periodo');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $year = date('Y');
        $params = [$asignacion, $nivel, $numero, $year];
        $periodoClause = '';
        if ($periodo) {
            $periodoClause = 'AND n.periodo = ?';
            $params[] = $periodo;
        }

        $stmt = $this->db->prepare("
            SELECT e.nombres, e.estudiante, n.asignatura, n.periodo, n.valoracion,
                   n.nota1, n.nota2, n.nota3, n.nota4, n.nota5, n.nota6
            FROM estugrupos e
            INNER JOIN notas n ON e.estudiante = n.estudiante AND n.year = e.anio
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            $periodoClause
            ORDER BY e.nombres, n.asignatura, n.periodo
        ");
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    /**
     * GET /reports/attendance - Attendance summary report
     */
    public function attendance(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = date('Y');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $stmt = $this->db->prepare("
            SELECT e.nombres, e.estudiante, COUNT(i.ind) as total_inasistencias
            FROM estugrupos e
            LEFT JOIN inasistencia i ON e.estudiante = i.estudiante AND i.year = e.anio
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            GROUP BY e.estudiante, e.nombres
            ORDER BY total_inasistencias DESC
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        success($stmt->fetchAll());
    }

    /**
     * GET /reports/convivencia - Convivencia summary
     */
    public function convivencia(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = date('Y');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $stmt = $this->db->prepare("
            SELECT e.nombres, e.estudiante, c.tipoFalta, COUNT(*) as total
            FROM estugrupos e
            INNER JOIN convivencia c ON e.estudiante = c.estudiante AND c.year = e.anio
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            GROUP BY e.estudiante, e.nombres, c.tipoFalta
            ORDER BY e.nombres
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        success($stmt->fetchAll());
    }

    /**
     * GET /reports/students - Student list report
     */
    public function students(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = date('Y');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $stmt = $this->db->prepare("
            SELECT e.ind, e.estudiante, e.nombres, e.codigo, e.genero,
                   e.fecnac, e.edad, e.nivel, e.numero, e.grado,
                   e.acudiente, e.telefono1, e.telefono2, e.direccion,
                   e.email_estudiante, e.eps, e.estado
            FROM estugrupos e
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            ORDER BY e.nombres
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        success($stmt->fetchAll());
    }
}
