<?php
/**
 * Candidate controller - matricula table (enrollment candidates)
 */
class CandidateController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /candidates - List pending enrollment candidates
     */
    public function index(): void
    {
        $year = getQueryParam('year', date('Y'));
        $nivel = getQueryParam('nivel');
        $estado = getQueryParam('estado', 'PENDIENTE');

        $conditions = ["m.estado = ?"];
        $params = [$estado];

        if ($nivel) {
            $conditions[] = "m.nivel = ?"; $params[] = $nivel;
        }

        $where = implode(' AND ', $conditions);
        $stmt = $this->db->prepare("
            SELECT m.ind, m.codigo, m.nombres2, m.sexo, m.fecnac, m.edad,
                   m.nivel, m.grado, m.jornada, m.estado,
                   m.acudiente, m.telefono_acudiente, m.email_acudiente
            FROM matricula m
            WHERE $where
            ORDER BY m.nombres2
        ");
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    /**
     * POST /candidates/:id/enroll - Enroll candidate
     */
    public function enroll(string $id): void
    {
        $stmt = $this->db->prepare("UPDATE matricula SET estado = 'MATRICULADO' WHERE ind = ?");
        $stmt->execute([$id]);
        success(null, 'Estudiante matriculado exitosamente');
    }

    /**
     * DELETE /candidates/:id
     */
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM matricula WHERE ind = ?");
        $stmt->execute([$id]);
        success(null, 'Registro eliminado');
    }
}
