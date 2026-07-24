<?php
/**
 * Convivencia controller - convivencia table
 */
class ConvivenciaController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /convivencia - List records
     */
    public function index(): void
    {
        $estudiante = getQueryParam('estudiante') ?: getQueryParam('student');
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = getQueryParam('year', date('Y'));

        $conditions = ["c.year = ?"];
        $params = [$year];

        if ($estudiante) {
            $conditions[] = "c.estudiante = ?"; $params[] = $estudiante;
        } elseif ($asignacion && $nivel && $numero) {
            $conditions[] = "g.asignacion = ?"; $params[] = $asignacion;
            $conditions[] = "g.nivel = ?"; $params[] = $nivel;
            $conditions[] = "g.numero = ?"; $params[] = $numero;
        }

        $where = implode(' AND ', $conditions);
        $join = ($estudiante) ? '' : 'INNER JOIN estugrupos g ON c.estudiante = g.estudiante AND g.anio = c.year';

        $stmt = $this->db->prepare("
            SELECT c.ind, c.estudiante, c.docente, c.asignatura, c.tipoFalta,
                   c.categoria, c.impacto, c.esNEE, c.tipoNEE,
                   c.accionesInmediatas, c.planSeguimiento, c.derivacion,
                   c.compromisos, c.contactoEntidades,
                   c.faltas, c.hora, c.fecha, c.descripcionSituacion,
                   c.descargosEstudiante, c.positivos, c.fechahora, c.year,
                   c.firma, c.firmaEstudiante, c.firmaAcudiente,
                   e.nombres,
                   CONCAT_WS('-', e.nivel, e.numero) AS grupo,
                   d.nombres AS docenteNombre
            FROM convivencia c
            INNER JOIN estugrupos e ON c.estudiante = e.estudiante AND e.anio = c.year
            LEFT JOIN docentes d ON c.docente = d.identificacion
            $join
            WHERE $where
            ORDER BY c.fecha DESC, c.fechahora DESC
            LIMIT 100
        ");
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    /**
     * POST /convivencia/student-detail - Full records for one student
     */
    public function studentDetail(): void
    {
        $data = getJsonInput();
        $estudiante = $data->estudiante ?? '';
        $year = $data->year ?? date('Y');
        if (!$estudiante) {
            error('ID de estudiante requerido');
        }

        $stmt = $this->db->prepare("
            SELECT c.ind, c.estudiante, eg.nombres,
                   CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
                   s.sede AS sede,
                   d.nombres AS docente,
                   c.asignatura, c.fecha,
                   IF(c.hora <> '', c.hora, SUBSTRING(c.fechahora, 11, 8)) AS hora,
                   c.tipoFalta, c.categoria, c.impacto, c.esNEE, c.tipoNEE,
                   c.faltas, c.descripcionSituacion, c.descargosEstudiante, c.positivos,
                   c.accionesInmediatas, c.planSeguimiento, c.derivacion,
                   c.compromisos, c.contactoEntidades,
                   c.firma, c.firmaEstudiante, c.firmaAcudiente, c.fechahora, c.year
            FROM convivencia c
            JOIN estugrupos eg ON c.estudiante = eg.estudiante AND eg.year = c.year
            LEFT JOIN sedes s ON eg.asignacion = s.ind
            LEFT JOIN docentes d ON c.docente = d.identificacion
            WHERE c.estudiante = ? AND c.year = ?
            ORDER BY c.fechahora DESC
        ");
        $stmt->execute([$estudiante, $year]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['firmado'] = !empty($row['firma']) ? '1' : '0';
        }
        success($rows);
    }

    /**
     * POST /convivencia - Create record
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['estudiante', 'tipoFalta', 'fecha', 'descripcionSituacion']);

        $docente = getCurrentUserId();
        $year = date('Y');

        $stmt = $this->db->prepare("
            INSERT INTO convivencia (estudiante, docente, asignatura, tipoFalta, categoria,
                impacto, esNEE, tipoNEE, faltas, hora, fecha, descripcionSituacion,
                descargosEstudiante, positivos, accionesInmediatas, planSeguimiento,
                derivacion, compromisos, contactoEntidades,
                firma, firmaEstudiante, firmaAcudiente, infoFirmaAcudiente, device, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?)
        ");
        $stmt->execute([
            $data->estudiante,
            $docente,
            $data->asignatura ?? '',
            $data->tipoFalta,
            $data->categoria ?? '',
            $data->impacto ?? 'bajo',
            $data->esNEE ?? 0,
            $data->tipoNEE ?? 'ninguno',
            $data->faltas ?? '',
            $data->hora ?? '',
            $data->fecha,
            $data->descripcionSituacion,
            $data->descargosEstudiante ?? '',
            $data->positivos ?? '',
            $data->accionesInmediatas ?? '',
            $data->planSeguimiento ?? '',
            $data->derivacion ?? 'ninguna',
            $data->compromisos ?? '',
            $data->contactoEntidades ?? '',
            $data->firma ?? '',
            $data->firmaEstudiante ?? '',
            $data->firmaAcudiente ?? '',
            $year,
        ]);

        created(['id' => $this->db->lastInsertId()], 'Registro de convivencia creado');
    }

    /**
     * GET /convivencia/stats - Statistics
     */
    public function stats(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = date('Y');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $stmt = $this->db->prepare("
            SELECT c.tipoFalta, COUNT(*) as total
            FROM convivencia c
            INNER JOIN estugrupos g ON c.estudiante = g.estudiante AND g.anio = c.year
            WHERE g.asignacion = ? AND g.nivel = ? AND g.numero = ? AND c.year = ?
            GROUP BY c.tipoFalta
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        success($stmt->fetchAll());
    }

    /**
     * GET /convivencia/items - Get fault items
     */
    public function items(): void
    {
        $stmt = $this->db->query("SELECT ind, itemConvivencia, tipo FROM itemsConvivencia ORDER BY ind");
        success($stmt->fetchAll());
    }

    /**
     * GET /convivencia/consolidation - Consolidated view by student
     */
    public function consolidation(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = getQueryParam('year', date('Y'));
        $estudiante = getQueryParam('estudiante');
        $page = max(1, (int) getQueryParam('page', '1'));
        $perPage = max(10, min(200, (int) getQueryParam('per_page', '50')));
        $offset = ($page - 1) * $perPage;

        $conditions = ["c.year = ?"];
        $params = [$year];

        if ($asignacion) {
            $conditions[] = "g.asignacion = ?";
            $params[] = $asignacion;
        }
        if ($nivel) {
            $conditions[] = "g.nivel = ?";
            $params[] = $nivel;
        }
        if ($numero) {
            $conditions[] = "g.numero = ?";
            $params[] = $numero;
        }
        if ($estudiante) {
            $conditions[] = "(c.estudiante LIKE ? OR g.nombres LIKE ?)";
            $likeEst = "%$estudiante%";
            $params[] = $likeEst;
            $params[] = $likeEst;
        }

        $where = implode(' AND ', $conditions);

        // Total count
        $countStmt = $this->db->prepare("
            SELECT COUNT(DISTINCT c.estudiante)
            FROM convivencia c
            INNER JOIN estugrupos g ON c.estudiante = g.estudiante AND g.anio = c.year
            WHERE $where
        ");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Per-student breakdown by tipoFalta
        $stmt = $this->db->prepare("
            SELECT
                c.estudiante,
                MAX(g.nombres) AS nombres,
                CONCAT_WS('-', MAX(g.nivel), MAX(g.numero)) AS grupo,
                MAX(g.nivel) AS nivel,
                MAX(g.numero) AS numero,
                MAX(s.sede) AS sede,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%positivo%' THEN 1 ELSE 0 END) AS POSITIVO,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo i%' OR LOWER(c.tipoFalta) = 'tipo1' THEN 1 ELSE 0 END) AS `TIPO I`,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo ii%' OR LOWER(c.tipoFalta) = 'tipo2' THEN 1 ELSE 0 END) AS `TIPO II`,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo iii%' OR LOWER(c.tipoFalta) = 'tipo3' THEN 1 ELSE 0 END) AS `TIPO III`,
                COUNT(*) AS total
            FROM convivencia c
            INNER JOIN estugrupos g ON c.estudiante = g.estudiante AND g.anio = c.year
            LEFT JOIN sedes s ON g.asignacion = s.ind
            WHERE $where
            GROUP BY c.estudiante
            ORDER BY total DESC, g.nombres ASC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $data = array_map(function ($r) {
            return [
                'estudiante' => $r['estudiante'],
                'nombres' => $r['nombres'],
                'grupo' => $r['grupo'],
                'nivel' => $r['nivel'],
                'numero' => $r['numero'],
                'sede' => $r['sede'] ?? '',
                'positivo' => (int) $r['POSITIVO'],
                'tipo1' => (int) $r['TIPO I'],
                'tipo2' => (int) $r['TIPO II'],
                'tipo3' => (int) $r['TIPO III'],
                'total' => (int) $r['total'],
            ];
        }, $rows);

        paginated($data, $total, $page, $perPage);
    }
}
