<?php
/**
 * Student controller
 */
require_once __DIR__ . '/../models/Student.php';

class StudentController
{
    private Student $model;

    public function __construct()
    {
        $this->model = new Student();
    }

    /**
     * Handle GET /students
     */
    public function index(): void
    {
        $asignacion = getQueryParam('asignacion');
        $nivel = getQueryParam('nivel');
        $numero = getQueryParam('numero');
        $year = getQueryParam('year', date('Y'));

        if ($asignacion && $nivel && $numero) {
            $students = $this->model->getByFilter($asignacion, $nivel, $numero, $year);
        } else {
            $students = $this->model->getAllByYear($year);
        }

        success($students);
    }

    /**
     * Handle GET /students/search?q=...
     */
    public function search(): void
    {
        $query = getQueryParam('q', '');
        if (strlen($query) < 2) {
            error('Ingrese al menos 2 caracteres');
        }

        $students = $this->model->search($query);
        success($students);
    }

    /**
     * Handle GET /students/:id
     */
    public function show(string $id): void
    {
        $student = $this->model->getById($id);
        if (!$student) {
            error('Estudiante no encontrado', 404);
        }
        success($student);
    }

    /**
     * Handle POST /students
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['estudiante', 'nombres']);

        $id = $this->model->create([
            'estudiante' => $data->estudiante,
            'nombres' => sanitizeString($data->nombres),
            'codigo' => $data->codigo ?? 0,
            'genero' => $data->genero ?? null,
            'fecnac' => $data->fecnac ?? null,
            'edad' => $data->edad ?? 0,
            'nivel' => $data->nivel ?? 0,
            'numero' => $data->numero ?? 0,
            'grado' => $data->grado ?? '',
            'asignacion' => $data->asignacion ?? 0,
            'pass' => $data->pass ?? '',
            'acudiente' => $data->acudiente ?? '',
            'telefono1' => $data->telefono1 ?? '',
            'telefono2' => $data->telefono2 ?? '',
            'direccion' => $data->direccion ?? '',
            'email_estudiante' => $data->email_estudiante ?? '',
        ]);

        created(['estudiante' => $id], 'Estudiante creado exitosamente');
    }

    /**
     * Handle PUT /students/:id
     */
    public function update(string $id): void
    {
        $existing = $this->model->getById($id);
        if (!$existing) {
            error('Estudiante no encontrado', 404);
        }

        $data = getJsonInput();
        $updateData = [];
        $allowedFields = [
            'nombres', 'genero', 'fecnac', 'edad', 'email_estudiante',
            'acudiente', 'telefono1', 'telefono2', 'direccion',
            'activo', 'nivel', 'numero', 'grado',
        ];

        foreach ($allowedFields as $field) {
            if (isset($data->$field)) {
                $updateData[$field] = $data->$field;
            }
        }

        if (!empty($updateData)) {
            $this->model->update($id, $updateData);
        }

        success(null, 'Estudiante actualizado exitosamente');
    }

    /**
     * Handle DELETE /students/:id
     */
    public function delete(string $id): void
    {
        $existing = $this->model->getById($id);
        if (!$existing) {
            error('Estudiante no encontrado', 404);
        }

        $this->model->delete($id);
        success(null, 'Estudiante eliminado exitosamente');
    }

    /**
     * Handle PUT /students/:id/group
     */
    public function updateGroup(string $id): void
    {
        $data = getJsonInput();
        validateRequired($data, ['nivel', 'numero', 'grado']);

        $this->model->updateGroup($id, [
            'nivel' => $data->nivel,
            'numero' => $data->numero,
            'grado' => $data->grado,
            'year' => $data->year ?? date('Y'),
        ]);

        success(null, 'Grupo actualizado exitosamente');
    }
}
