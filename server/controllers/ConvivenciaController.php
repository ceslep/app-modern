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
            INSERT INTO convivencia (estudiante, docente, asignatura, tipoFalta, faltas,
                hora, fecha, descripcionSituacion, descargosEstudiante, positivos,
                firma, firmaAcudiente, infoFirmaAcudiente, device, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', ?)
        ");
        $stmt->execute([
            $data->estudiante,
            $docente,
            $data->asignatura ?? '',
            $data->tipoFalta,
            $data->faltas ?? '',
            $data->hora ?? '',
            $data->fecha,
            $data->descripcionSituacion,
            $data->descargosEstudiante ?? '',
            $data->positivos ?? '',
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
}
