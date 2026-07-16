<?php
/**
 * Student model - uses estugrupos table (students with group assignment)
 */
class Student
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * Get students by group filter
     */
    public function getByFilter(string $asignacion, string $nivel, string $numero, string $year = ''): array
    {
        $year = $year ?: date('Y');
        $stmt = $this->db->prepare("
            SELECT e.ind, e.estudiante, e.nombres, e.codigo, e.genero, e.fecnac, e.edad,
                   e.nivel, e.numero, e.grado, e.asignacion, e.activo, e.acudiente,
                   e.telefono1, e.telefono2, e.direccion, e.email_estudiante,
                   e.pass, e.anio
            FROM estugrupos e
            WHERE e.asignacion = ? AND e.nivel = ? AND e.numero = ? AND e.anio = ?
            ORDER BY e.nombres
        ");
        $stmt->execute([$asignacion, $nivel, $numero, $year]);
        return $stmt->fetchAll();
    }

    /**
     * Search students by name or code
     */
    public function search(string $query, int $limit = 50): array
    {
        $search = "%{$query}%";
        $stmt = $this->db->prepare("
            SELECT e.ind, e.estudiante, e.nombres, e.codigo, e.genero, e.nivel, e.numero,
                   e.grado, e.asignacion, e.activo, e.anio
            FROM estugrupos e
            WHERE (e.nombres LIKE ? OR e.estudiante LIKE ? OR e.codigo LIKE ?)
            AND e.anio = YEAR(CURDATE())
            ORDER BY e.nombres
            LIMIT ?
        ");
        $stmt->execute([$search, $search, $search, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Get student by ID
     */
    public function getById(string $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM estugrupos
            WHERE estudiante = ? AND anio = YEAR(CURDATE())
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Create a new student (inserts into estugrupos)
     */
    public function create(array $data): string
    {
        $stmt = $this->db->prepare("
            INSERT INTO estugrupos (estudiante, nombres, codigo, genero, fecnac, edad,
                nivel, numero, grado, asignacion, anio, pass, activo, acudiente,
                telefono1, telefono2, direccion, email_estudiante)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'S', ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['estudiante'],
            $data['nombres'],
            $data['codigo'] ?? 0,
            $data['genero'] ?? '',
            $data['fecnac'] ?? null,
            $data['edad'] ?? 0,
            $data['nivel'] ?? 0,
            $data['numero'] ?? 0,
            $data['grado'] ?? '',
            $data['asignacion'] ?? 0,
            $data['year'] ?? date('Y'),
            $data['pass'] ?? '',
            $data['acudiente'] ?? '',
            $data['telefono1'] ?? '',
            $data['telefono2'] ?? '',
            $data['direccion'] ?? '',
            $data['email_estudiante'] ?? '',
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Update student
     */
    public function update(string $id, array $data): bool
    {
        $sets = [];
        $values = [];
        foreach ($data as $key => $value) {
            if (!in_array($key, ['ind', 'estudiante', 'anio'])) {
                $sets[] = "{$key} = :{$key}";
                $values[$key] = $value;
            }
        }
        $values['id'] = $id;
        $values['anio'] = date('Y');

        $sql = "UPDATE estugrupos SET " . implode(', ', $sets) . " WHERE estudiante = :id AND anio = :anio";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    /**
     * Delete student
     */
    public function delete(string $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM estugrupos WHERE estudiante = ? AND anio = YEAR(CURDATE())");
        return $stmt->execute([$id]);
    }

    /**
     * Update student group assignment
     */
    public function updateGroup(string $id, array $groupData): bool
    {
        $stmt = $this->db->prepare("
            UPDATE estugrupos
            SET nivel = ?, numero = ?, grado = ?
            WHERE estudiante = ? AND anio = ?
        ");
        return $stmt->execute([
            $groupData['nivel'],
            $groupData['numero'],
            $groupData['grado'],
            $id,
            $groupData['year'] ?? date('Y'),
        ]);
    }

    /**
     * Get all students for a year
     */
    public function getAllByYear(string $year): array
    {
        $stmt = $this->db->prepare("
            SELECT ind, estudiante, nombres, codigo, genero, nivel, numero, grado,
                   asignacion, activo, anio
            FROM estugrupos
            WHERE anio = ?
            ORDER BY nivel, numero, nombres
        ");
        $stmt->execute([$year]);
        return $stmt->fetchAll();
    }
}
