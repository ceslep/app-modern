<?php
/**
 * Grade controller
 */
require_once __DIR__ . '/../models/Grade.php';

class GradeController
{
    private Grade $model;

    public function __construct()
    {
        $this->model = new Grade();
    }

    /**
     * Handle GET /grades
     */
    public function index(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $asignatura = getQueryParam('asignatura');
        $periodo = getQueryParam('periodo');

        if ($asignacion && $nivel && $numero && $asignatura && $periodo) {
            $grades = $this->model->getByGroup($asignacion, $nivel, $numero, $asignatura, $periodo);
        } else {
            error('Parámetros incompletos');
        }

        success($grades);
    }

    /**
     * Handle GET /grades/student
     */
    public function getByStudent(): void
    {
        $student = getQueryParam('student');
        $periodo = getQueryParam('periodo');

        if (!$student) {
            error('Identificación de estudiante requerida');
        }

        $grades = $this->model->getByStudent($student, $periodo ?? '1');
        success($grades);
    }

    /**
     * Handle POST /grades
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['estudiante', 'asignatura', 'periodo', 'nota']);

        $id = $this->model->save([
            'estudiante' => $data->estudiante,
            'asignatura' => $data->asignatura,
            'periodo' => $data->periodo,
            'nota' => $data->nota,
            'notaNum' => $data->notaNum ?? 1,
            'porcentaje' => $data->porcentaje ?? null,
            'aspecto' => $data->aspecto ?? null,
            'grado' => $data->grado ?? '',
            'year' => $data->year ?? date('Y'),
            'docente' => $data->docente ?? null,
        ]);

        created(['id' => $id], 'Nota guardada exitosamente');
    }

    /**
     * Handle DELETE /grades/:id
     */
    public function delete(string $id): void
    {
        $this->model->delete($id);
        success(null, 'Nota eliminada exitosamente');
    }

    /**
     * Handle GET /grades/history
     */
    public function history(): void
    {
        $student = getQueryParam('student');
        if (!$student) {
            error('Identificación de estudiante requerida');
        }

        $history = $this->model->getHistory($student);
        success($history);
    }

    /**
     * Handle GET /grades/finals
     */
    public function finals(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $finals = $this->model->getFinals($asignacion, $nivel, $numero);
        success($finals);
    }

    /**
     * Handle GET /grades/quantities
     */
    public function quantities(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');

        if (!$asignacion || !$nivel || !$numero) {
            error('Parámetros incompletos');
        }

        $quantities = $this->model->getQuantities($asignacion, $nivel, $numero);
        success($quantities);
    }

    /**
     * Handle POST /grades/close-editing
     */
    public function closeEditing(): void
    {
        requireRole('admin', 'administrador');
        success(null, 'Edición de notas cerrada');
    }

    /**
     * Handle POST /grades/open-editing
     */
    public function openEditing(): void
    {
        requireRole('admin', 'administrador');
        success(null, 'Edición de notas activada');
    }
}
