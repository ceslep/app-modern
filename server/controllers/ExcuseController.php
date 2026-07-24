<?php
/**
 * Excuse controller - excusas table
 */
class ExcuseController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /attendance/excuses?student=XXX — excuses for a student (current year)
     */
    public function index(): void
    {
        $student = getQueryParam('student');
        if (!$student) {
            error('Parámetro student requerido');
        }

        $year = date('Y');
        $stmt = $this->db->prepare("
            SELECT ind, estudiante, fecha, causa, motivo, periodo, horas,
                   motivo_permiso, hora_salida, acudiente, telefono_acudiente,
                   otros, fechahora, year
            FROM excusas
            WHERE estudiante = ? AND year = ?
            ORDER BY fecha DESC
        ");
        $stmt->execute([$student, $year]);
        success($stmt->fetchAll());
    }

    /**
     * POST /attendance/excuses — upsert excuse record
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['estudiante', 'fecha', 'periodo']);

        $estudiante = $data->estudiante;
        $fecha = $data->fecha;
        $periodo = $data->periodo;
        $motivo = $data->motivo_excusa ?? $data->motivo ?? '';
        $motivoPermiso = $data->motivo_permiso ?? '';
        $horaSalida = $data->hora_salida ?? '';
        $acudiente = $data->acudiente ?? $data->acudienteControl ?? '';
        $telefonoAcudiente = $data->telefono_acudiente ?? $data->telacudienteControl ?? '';
        $otros = $data->otros ?? $data->otros_excusa ?? '';
        $causa = $data->causa ?? '';
        $horas = $data->horas ?? $data->horasControl ?? '';
        $year = date('Y');

        if ($motivo === 'NO APLICA' && $motivoPermiso) {
            $motivo = $motivoPermiso;
        }

        // Check existing excuse for same student/fecha/periodo/year
        $check = $this->db->prepare("
            SELECT ind FROM excusas
            WHERE estudiante = ? AND fecha = ? AND periodo = ? AND year = ?
        ");
        $check->execute([$estudiante, $fecha, $periodo, $year]);
        $existing = $check->fetch();

        if ($existing) {
            $stmt = $this->db->prepare("
                UPDATE excusas
                SET causa = ?, motivo = ?, motivo_permiso = ?, hora_salida = ?,
                    acudiente = ?, telefono_acudiente = ?, otros = ?
                WHERE estudiante = ? AND fecha = ? AND periodo = ? AND year = ?
            ");
            $stmt->execute([
                $causa, $motivo, $motivoPermiso, $horaSalida,
                $acudiente, $telefonoAcudiente, $otros,
                $estudiante, $fecha, $periodo, $year,
            ]);
            success(['action' => 'updated', 'ind' => $existing['ind']], 'Excusa actualizada');
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO excusas
                    (estudiante, fecha, causa, motivo, periodo, horas,
                     motivo_permiso, hora_salida, acudiente, telefono_acudiente,
                     otros, year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $estudiante, $fecha, $causa, $motivo, $periodo, $horas,
                $motivoPermiso, $horaSalida, $acudiente, $telefonoAcudiente,
                $otros, $year,
            ]);
            created(['action' => 'created', 'ind' => $this->db->lastInsertId()], 'Excusa registrada');
        }
    }
}
