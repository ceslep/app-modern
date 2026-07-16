<?php
/**
 * Teacher controller - docentes table
 */
class TeacherController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /teachers
     */
    public function index(): void
    {
        $stmt = $this->db->query("
            SELECT idn, identificacion, nombres, correo, asignacion, activo, banda, acceso_total
            FROM docentes
            WHERE activo = 'S'
            ORDER BY nombres
        ");
        success($stmt->fetchAll());
    }

    /**
     * GET /teachers/:id
     */
    public function show(string $id): void
    {
        $stmt = $this->db->prepare("
            SELECT idn, identificacion, nombres, correo, asignacion, activo, banda, acceso_total, soloexcusas
            FROM docentes WHERE idn = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        if (!$result) {
            error('Docente no encontrado', 404);
        }
        success($result);
    }

    /**
     * GET /teachers/assignments - Get teacher subject assignments
     */
    public function assignments(): void
    {
        $docente = getQueryParam('docente') ?: getCurrentUserId();
        $year = getQueryParam('year', date('Y'));

        $stmt = $this->db->prepare("
            SELECT ind, docente, sede, asignatura, grados, nivel, numero,
                   abreviatura, materia, codigo, banda, visible, orden
            FROM asignacion_asignaturas
            WHERE docente = ? AND year = ?
            ORDER BY orden
        ");
        $stmt->execute([$docente, $year]);
        success($stmt->fetchAll());
    }
}
