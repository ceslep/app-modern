<?php
/**
 * Grade model - matches notas table with nota1..nota12 columns
 */
class Grade
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * Get grades for a student in a period
     */
    public function getByStudent(string $studentId, string $periodo): array
    {
        $stmt = $this->db->prepare("
            SELECT ind, estudiante, grado, asignatura, docente, periodo, valoracion,
                   nota1, nota2, nota3, nota4, nota5, nota6,
                   nota7, nota8, nota9, nota10, nota11, nota12,
                   porcentaje1, porcentaje2, porcentaje3, porcentaje4, porcentaje5, porcentaje6,
                   porcentaje7, porcentaje8, porcentaje9, porcentaje10, porcentaje11, porcentaje12,
                   aspecto1, aspecto2, aspecto3, aspecto4, aspecto5, aspecto6,
                   aspecto7, aspecto8, aspecto9, aspecto10, aspecto11, aspecto12
            FROM notas
            WHERE estudiante = ? AND periodo = ?
            ORDER BY asignatura
        ");
        $stmt->execute([$studentId, $periodo]);
        return $stmt->fetchAll();
    }

    /**
     * Get grades for a group
     */
    public function getByGroup(string $asignacion, string $nivel, string $numero, string $asignatura, string $periodo): array
    {
        $year = date('Y');
        $stmt = $this->db->prepare("
            SELECT n.ind, n.estudiante, n.grado, n.asignatura, n.periodo, n.valoracion,
                   n.nota1, n.nota2, n.nota3, n.nota4, n.nota5, n.nota6,
                   n.nota7, n.nota8, n.nota9, n.nota10, n.nota11, n.nota12,
                   n.porcentaje1, n.porcentaje2, n.porcentaje3, n.porcentaje4,
                   n.porcentaje5, n.porcentaje6, n.porcentaje7, n.porcentaje8,
                   n.porcentaje9, n.porcentaje10, n.porcentaje11, n.porcentaje12,
                   n.aspecto1, n.aspecto2, n.aspecto3, n.aspecto4, n.aspecto5,
                   n.aspecto6, n.aspecto7, n.aspecto8, n.aspecto9, n.aspecto10,
                   n.aspecto11, n.aspecto12,
                   e.nombres
            FROM notas n
            INNER JOIN estugrupos e ON n.estudiante = e.estudiante AND e.anio = n.year
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ?
            AND n.asignatura = ? AND n.periodo = ? AND n.year = ?
            ORDER BY e.nombres
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $asignatura, $periodo, $year]);
        return $stmt->fetchAll();
    }

    /**
     * Get existing grade row for a student+subject+period
     */
    public function getExisting(string $estudiante, string $asignatura, string $periodo, string $year): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM notas
            WHERE estudiante = ? AND asignatura = ? AND periodo = ? AND year = ?
            LIMIT 1
        ");
        $stmt->execute([$estudiante, $asignatura, $periodo, $year]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Save a grade (update existing nota column or create new)
     */
    public function save(array $data): string
    {
        $year = $data['year'] ?? date('Y');
        $notaNum = $data['notaNum'] ?? 1;
        $notaVal = $data['nota'] ?? null;
        $porcentaje = $data['porcentaje'] ?? null;
        $aspecto = $data['aspecto'] ?? null;

        // Try to find existing row
        $existing = $this->getExisting($data['estudiante'], $data['asignatura'], $data['periodo'], $year);

        if ($existing) {
            // Update the specific nota column
            $col = "nota{$notaNum}";
            $pcol = "porcentaje{$notaNum}";
            $acol = "aspecto{$notaNum}";
            $fcol = "fecha{$notaNum}";

            $sets = ["{$col} = ?"];
            $params = [$notaVal];

            if ($porcentaje !== null) {
                $sets[] = "{$pcol} = ?";
                $params[] = $porcentaje;
            }
            if ($aspecto !== null) {
                $sets[] = "{$acol} = ?";
                $params[] = $aspecto;
            }
            $sets[] = "{$fcol} = CURDATE()";
            $sets[] = "fechahora = CURRENT_TIMESTAMP";
            $sets[] = "docente = ?"; $params[] = $data['docente'] ?? $existing['docente'];
            $params[] = $existing['ind'];

            $stmt = $this->db->prepare("UPDATE notas SET " . implode(', ', $sets) . " WHERE ind = ?");
            $stmt->execute($params);
            return $existing['ind'];
        } else {
            // Create new row
            $stmt = $this->db->prepare("
                INSERT INTO notas (estudiante, grado, asignatura, docente, periodo, year, nota{$notaNum}, fecha{$notaNum})
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
            ");
            $stmt->execute([
                $data['estudiante'],
                $data['grado'] ?? '',
                $data['asignatura'],
                $data['docente'] ?? 0,
                $data['periodo'],
                $year,
                $notaVal,
            ]);
            return $this->db->lastInsertId();
        }
    }

    /**
     * Delete a grade
     */
    public function delete(string $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM notas WHERE ind = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Get grade history
     */
    public function getHistory(string $studentId): array
    {
        $stmt = $this->db->prepare("
            SELECT ind, estudiante, grado, asignatura, docente, periodo, valoracion, year,
                   nota1, nota2, nota3, nota4, nota5, nota6,
                   nota7, nota8, nota9, nota10, nota11, nota12
            FROM notas
            WHERE estudiante = ?
            ORDER BY year DESC, periodo, asignatura
        ");
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    /**
     * Get final grades (valoracion) for a group
     */
    public function getFinals(string $asignacion, string $nivel, string $numero): array
    {
        $year = date('Y');
        $stmt = $this->db->prepare("
            SELECT e.nombres, e.estudiante, e.codigo,
                   ROUND(AVG(n.valoracion), 2) as definitiva
            FROM estugrupos e
            LEFT JOIN notas n ON e.estudiante = n.estudiante AND n.year = e.anio
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            GROUP BY e.estudiante, e.nombres, e.codigo
            ORDER BY definitiva DESC
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        return $stmt->fetchAll();
    }

    /**
     * Get quantities per student
     */
    public function getQuantities(string $asignacion, string $nivel, string $numero): array
    {
        $year = date('Y');
        $stmt = $this->db->prepare("
            SELECT e.nombres, e.estudiante,
                   COUNT(n.ind) as total_notas,
                   SUM(CASE WHEN n.valoracion < 3.0 THEN 1 ELSE 0 END) as notas_bajas
            FROM estugrupos e
            LEFT JOIN notas n ON e.estudiante = n.estudiante AND n.year = e.anio
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            GROUP BY e.estudiante, e.nombres
            ORDER BY e.nombres
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        return $stmt->fetchAll();
    }
}
