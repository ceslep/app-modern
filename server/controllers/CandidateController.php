<?php
/**
 * Candidate controller — estugrupos2 table (enrollment candidates)
 *
 * Modern legacy getCandidatos.php, getEstugrupos2.php,
 * detectarCandidato.php, matricularCandidato.php,
 * matricularCandidatos.php, borrarCandidato.php
 */
class CandidateController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /candidates — List active candidates from estugrupos2
     */
    public function index(): void
    {
        $stmt = $this->db->query("
            SELECT *
            FROM estugrupos2
            WHERE activo = 'S'
            ORDER BY asignacion, nivel, numero, nombres
        ");
        success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * GET /candidates/:id — Get candidate detail with sede name
     */
    public function show(string $id): void
    {
        $stmt = $this->db->prepare("
            SELECT e.*, s.sede
            FROM estugrupos2 e
            LEFT JOIN sedes s ON e.asignacion = s.ind
            WHERE e.ind = ?
            ORDER BY e.year DESC
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            error('Candidato no encontrado', 404);
        }
        success($row);
    }

    /**
     * POST /candidates/check — Check if student already enrolled for year
     * Body: { estudiante, year }
     */
    public function checkEnrolled(): void
    {
        $data = getJsonInput();
        $estudiante = $data->estudiante ?? '';
        $year = $data->year ?? '';

        if (empty($estudiante) || empty($year)) {
            error('Faltan parámetros: estudiante, year');
        }

        $stmt = $this->db->prepare("
            SELECT estudiante
            FROM estugrupos
            WHERE estudiante = ? AND year = ?
            LIMIT 1
        ");
        $stmt->execute([$estudiante, $year]);
        success(['exists' => $stmt->fetchColumn() !== false]);
    }

    /**
     * PUT /candidates/:id/enroll — Enroll single candidate
     * Copies estugrupos2 → estugrupos, deactivates in estugrupos2,
     * inserts into codigos
     */
    public function enroll(string $id): void
    {
        $this->db->beginTransaction();
        try {
            $this->db->exec("
                REPLACE INTO estugrupos
                SELECT * FROM estugrupos2 WHERE ind = " . (int)$id
            );

            $stmt = $this->db->prepare("UPDATE estugrupos2 SET activo = 'N' WHERE ind = ?");
            $stmt->execute([$id]);

            $cod = $this->db->query("
                SELECT codigo, estudiante FROM estugrupos2 WHERE ind = " . (int)$id
            )->fetch(PDO::FETCH_ASSOC);
            if ($cod && !empty($cod['codigo'])) {
                $ins = $this->db->prepare("
                    REPLACE INTO codigos (codigo, estudiante) VALUES (?, ?)
                ");
                $ins->execute([$cod['codigo'], $cod['estudiante']]);
            }

            $this->db->commit();
            success(null, 'Estudiante matriculado exitosamente');
        } catch (\Exception $e) {
            $this->db->rollBack();
            error('Error al matricular: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /candidates/enroll-bulk — Enroll multiple candidates
     * Body: { indices: [{ ind }, ...] }
     */
    public function enrollBulk(): void
    {
        $data = getJsonInput();
        $indices = $data->indices ?? [];

        if (empty($indices)) {
            error('No se seleccionaron candidatos');
        }

        $this->db->beginTransaction();
        try {
            foreach ($indices as $item) {
                $ind = (int)($item->ind ?? $item);
                if ($ind <= 0) continue;

                $this->db->exec("
                    REPLACE INTO estugrupos
                    SELECT * FROM estugrupos2 WHERE ind = $ind
                ");

                $stmt = $this->db->prepare("UPDATE estugrupos2 SET activo = 'N' WHERE ind = ?");
                $stmt->execute([$ind]);

                $cod = $this->db->query("
                    SELECT codigo, estudiante FROM estugrupos2 WHERE ind = $ind
                ")->fetch(PDO::FETCH_ASSOC);
                if ($cod && !empty($cod['codigo'])) {
                    $ins = $this->db->prepare("
                        REPLACE INTO codigos (codigo, estudiante) VALUES (?, ?)
                    ");
                    $ins->execute([$cod['codigo'], $cod['estudiante']]);
                }
            }

            $this->db->commit();
            success(null, count($indices) . ' candidato(s) matriculado(s) exitosamente');
        } catch (\Exception $e) {
            $this->db->rollBack();
            error('Error al matricular: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /candidates/:id — Delete candidate from estugrupos2
     */
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM estugrupos2 WHERE ind = ?");
        $stmt->execute([$id]);
        success(null, 'Registro eliminado');
    }
}
