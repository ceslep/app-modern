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
        $estudiante = getQueryParam('estudiante');
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
                   c.faltas, c.hora, c.fecha, c.descripcionSituacion,
                   c.descargosEstudiante, c.positivos, c.fechahora,
                   e.nombres
            FROM convivencia c
            INNER JOIN estugrupos e ON c.estudiante = e.estudiante AND e.anio = c.year
            $join
            WHERE $where
            ORDER BY c.fecha DESC, c.fechahora DESC
            LIMIT 100
        ");
        $stmt->execute($params);
        success($stmt->fetchAll());
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
                '' AS sede,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%positivo%' THEN 1 ELSE 0 END) AS POSITIVO,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo i%' OR LOWER(c.tipoFalta) = 'tipo1' THEN 1 ELSE 0 END) AS `TIPO I`,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo ii%' OR LOWER(c.tipoFalta) = 'tipo2' THEN 1 ELSE 0 END) AS `TIPO II`,
                SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo iii%' OR LOWER(c.tipoFalta) = 'tipo3' THEN 1 ELSE 0 END) AS `TIPO III`,
                COUNT(*) AS total
            FROM convivencia c
            INNER JOIN estugrupos g ON c.estudiante = g.estudiante AND g.anio = c.year
            WHERE $where
            GROUP BY c.estudiante
            ORDER BY total DESC, g.nombres ASC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Map sede names
        $sedes = [];
        if ($asignacion) {
            $sedeStmt = $this->db->prepare("SELECT ind, sede FROM sedes WHERE ind = ?");
            $sedeStmt->execute([$asignacion]);
            $sedeRow = $sedeStmt->fetch();
            if ($sedeRow) $sedes[$sedeRow['ind']] = $sedeRow['sede'];
        }

        $data = array_map(function ($r) use ($sedes) {
            return [
                'estudiante' => $r['estudiante'],
                'nombres' => $r['nombres'],
                'grupo' => $r['grupo'],
                'nivel' => $r['nivel'],
                'numero' => $r['numero'],
                'sede' => $sedes[$r['sede']] ?? $r['sede'] ?? '',
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
