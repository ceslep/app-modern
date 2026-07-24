<?php
/**
 * Filter controller - populates cascading form selects
 * (sedes, grupos, niveles, asignaturas) used across modules.
 */
class FilterController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * Current logged-in docente row (by session idn hash).
     */
    private function currentDocente(): ?array
    {
        $id = getCurrentUserId();
        if (!$id) {
            return null;
        }
        $stmt = $this->db->prepare(
            "SELECT identificacion, asignacion, acceso_total, maestra
             FROM docentes WHERE idn = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * True when the user may see every sede (coordinator / master).
     */
    private function hasFullAccess(?array $doc): bool
    {
        if (!$doc) {
            return false;
        }
        return ($doc['acceso_total'] ?? '') === 'S'
            || !empty($doc['maestra']);
    }

    /**
     * GET /sedes - campuses the user may work with.
     */
    public function sedes(): void
    {
        $doc = $this->currentDocente();

        if ($this->hasFullAccess($doc)) {
            $rows = $this->db->query("SELECT ind, sede FROM sedes ORDER BY ind")->fetchAll();
        } else {
            $stmt = $this->db->prepare(
                "SELECT ind, sede FROM sedes WHERE ind = ? ORDER BY ind"
            );
            $stmt->execute([$doc['asignacion'] ?? 0]);
            $rows = $stmt->fetchAll();
        }

        // Normalize label whitespace (some rows have trailing newlines)
        $rows = array_map(fn($r) => [
            'value' => (string) $r['ind'],
            'label' => trim($r['sede']),
        ], $rows);

        success($rows);
    }

    /**
     * GET /grupos?sede=&year= - distinct nivel/numero taught at a sede.
     */
    public function grupos(): void
    {
        $sede = getQueryParam('sede');
        $year = getQueryParam('year', date('Y'));

        if (!$sede) {
            error('Sede requerida');
        }

        $stmt = $this->db->prepare("
            SELECT DISTINCT a.nivel, a.numero,
                   CONCAT_WS('-', a.nivel, a.numero) AS grado
            FROM asignacion_asignaturas a
            INNER JOIN docentes d ON a.docente = d.identificacion
            WHERE d.asignacion = ? AND a.year = ?
            ORDER BY a.nivel, a.numero
        ");
        $stmt->execute([$sede, $year]);
        success($stmt->fetchAll());
    }

    /**
     * GET /niveles?asignacion=&year= - distinct grade levels present in a sede.
     */
    public function niveles(): void
    {
        $asignacion = getQueryParam('asignacion');
        $year = getQueryParam('year', date('Y'));

        if (!$asignacion) {
            error('Sede requerida');
        }

        $stmt = $this->db->prepare("
            SELECT DISTINCT nivel FROM estugrupos
            WHERE asignacion = ? AND year = ?
            ORDER BY nivel
        ");
        $stmt->execute([$asignacion, $year]);
        success($stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * GET /niveles/nombres - map of nivel => full grade name.
     */
    public function nombresNiveles(): void
    {
        $rows = $this->db->query(
            "SELECT nivel, nombre FROM nombresNiveles ORDER BY nivel"
        )->fetchAll();
        success($rows);
    }

    /**
     * GET /asignaturas?sede=&nivel=&numero=[&docente=] - subjects for a group.
     */
    public function asignaturas(): void
    {
        $sede = getQueryParam('sede');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $docente = getQueryParam('docente');
        $year = getQueryParam('year', date('Y'));

        if (!$sede || $nivel === null || $numero === null) {
            error('Parámetros incompletos (sede, nivel, numero)');
        }

        $sql = "
            SELECT DISTINCT a.docente, a.asignatura, a.materia, a.abreviatura,
                   d.nombres
            FROM asignacion_asignaturas a
            INNER JOIN orden_asignaturas o ON a.asignatura = o.asignatura
            INNER JOIN docentes d ON a.docente = d.identificacion
            WHERE d.asignacion = ? AND a.nivel = ? AND a.numero = ?
              AND d.activo = 'S' AND a.year = ?
        ";
        $params = [$sede, $nivel, $numero, $year];

        if ($docente) {
            $sql .= " AND d.identificacion = ?";
            $params[] = $docente;
        }

        $sql .= " ORDER BY o.orden";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        success($stmt->fetchAll());
    }
}
