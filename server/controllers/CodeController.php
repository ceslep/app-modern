<?php
/**
 * Code controller — codigos table (student code assignment)
 *
 * Modernizes getCodigos.php, getUltimoCodigo.php, asignarCodigo.php
 */
class CodeController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /codes — List all assigned codes with student names
     */
    public function index(): void
    {
        $stmt = $this->db->query("
            SELECT DISTINCT c.codigo, c.estudiante, e.nombres
            FROM codigos c
            INNER JOIN estugrupos e ON c.estudiante = e.estudiante
            ORDER BY c.codigo
        ");
        success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * GET /codes/next — Get next available code (MAX + 1)
     */
    public function nextCode(): void
    {
        $row = $this->db->query("SELECT MAX(codigo) + 1 AS codigo FROM estugrupos")->fetch(PDO::FETCH_ASSOC);
        $codigo = $row['codigo'] ?? 1;
        success(['codigo' => (int)$codigo]);
    }

    /**
     * POST /codes/assign — Assign code to student
     * Body: { estudiante, codigo }
     */
    public function assign(): void
    {
        $data = getJsonInput();
        $estudiante = $data->estudiante ?? '';
        $codigo = $data->codigo ?? '';

        if (empty($estudiante) || $codigo === '') {
            error('Faltan parámetros: estudiante, codigo');
        }

        $this->db->beginTransaction();
        try {
            $stmt1 = $this->db->prepare("UPDATE codigos SET codigo = ? WHERE estudiante = ?");
            $stmt1->execute([$codigo, $estudiante]);

            $stmt2 = $this->db->prepare("UPDATE estugrupos SET codigo = ? WHERE estudiante = ?");
            $stmt2->execute([$codigo, $estudiante]);

            $this->db->commit();
            success(null, 'Código asignado con éxito');
        } catch (\Exception $e) {
            $this->db->rollBack();
            error('Error al asignar código: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /codes/:estudiante — Remove code assignment
     */
    public function delete(string $estudiante): void
    {
        $this->db->beginTransaction();
        try {
            $stmt1 = $this->db->prepare("UPDATE codigos SET codigo = 0 WHERE estudiante = ?");
            $stmt1->execute([$estudiante]);

            $stmt2 = $this->db->prepare("UPDATE estugrupos SET codigo = 0 WHERE estudiante = ?");
            $stmt2->execute([$estudiante]);

            $this->db->commit();
            success(null, 'Código eliminado');
        } catch (\Exception $e) {
            $this->db->rollBack();
            error('Error al eliminar código: ' . $e->getMessage(), 500);
        }
    }
}
