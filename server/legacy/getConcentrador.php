<?php

header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";

$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$input = json_decode(file_get_contents("php://input"));
$nivel = $input->nivel;
$numero = $input->numero;
$periodo = $input->periodo;
$asignacion = $input->Asignacion;
$YEAR = $input->year;

// Fetch all grades in one go
$all_grades = [];
$stmt_grades = $mysqli->prepare("SELECT estudiante, asignatura, valoracion, periodo FROM notas WHERE year = ? AND estudiante IN (SELECT estudiante FROM estugrupos WHERE nivel = ? AND numero = ? AND asignacion = ? AND year = ?)");
$stmt_grades->bind_param("siiss", $YEAR, $nivel, $numero, $asignacion, $YEAR);
$stmt_grades->execute();
$result_grades = $stmt_grades->get_result();
while ($row = $result_grades->fetch_assoc()) {
    $all_grades[$row['estudiante']][$row['asignatura']][$row['periodo']] = $row['valoracion'];
}
$stmt_grades->close();

// Also fetch average grades
$stmt_avg_grades = $mysqli->prepare("SELECT estudiante, asignatura, AVG(valoracion) as valoracion FROM notas WHERE year = ? AND estudiante IN (SELECT estudiante FROM estugrupos WHERE nivel = ? AND numero = ? AND asignacion = ? AND year = ?) GROUP BY estudiante, asignatura");
$stmt_avg_grades->bind_param("siiss", $YEAR, $nivel, $numero, $asignacion, $YEAR);
$stmt_avg_grades->execute();
$result_avg_grades = $stmt_avg_grades->get_result();
while ($row = $result_avg_grades->fetch_assoc()) {
    $all_grades[$row['estudiante']][$row['asignatura']]['DEF'] = $row['valoracion'];
}
$stmt_avg_grades->close();

// Fetch subjects
$sql1 = "SELECT asignacion_asignaturas.asignatura, asignacion_asignaturas.abreviatura, asignacion_asignaturas.docente, asignacion_asignaturas.materia, IF(parametros_informe.orden IS NULL, 200, parametros_informe.orden) AS ordenar FROM asignacion_asignaturas";
$sql1 .= " LEFT JOIN parametros_informe ON asignacion_asignaturas.asignatura = parametros_informe.codigo_materia";
$sql1 .= " INNER JOIN docentes ON asignacion_asignaturas.docente = docentes.identificacion";
$sql1 .= " WHERE asignacion_asignaturas.nivel = ? AND asignacion_asignaturas.numero = ?";

$current_year = date('Y');

if ($input->year === $current_year) {
    $sql1 .= " AND asignacion_asignaturas.visible = 'S'";
}

$sql1 .= " AND asignacion = ?";
$sql1 .= " AND asignacion_asignaturas.year = ?";
$sql1 .= " AND parametros_informe.year = ?";
$sql1 .= " ORDER BY ordenar";

$stmt_asignaturas = $mysqli->prepare($sql1);
$stmt_asignaturas->bind_param("ssiss", $nivel, $numero, $asignacion, $input->year, $input->year);
$stmt_asignaturas->execute();
$rasignaturas = $stmt_asignaturas->get_result();

$asignaturas = [];
while ($row = $rasignaturas->fetch_assoc()) {
    $asignaturas[] = [
        'asignatura' => $row['asignatura'],
        'abreviatura' => $row['abreviatura'],
        'docente' => $row['docente'],
        'materia' => $row['materia'],
    ];
}
$rasignaturas->free();
$stmt_asignaturas->close();

// Fetch students
$sql2 = "SELECT estudiante, nombres FROM estugrupos";
$sql2 .= " WHERE nivel = ? AND numero = ? AND asignacion = ? AND year = ?";

$types_sql2 = 'ssis';

if (isset($input->activos) && $input->activos) {
    $sql2 .= " AND activo = 'S'";
}

if ($input->year === $current_year) {
    $sql2 .= " AND activo = 'S'";
}

$sql2 .= " ORDER BY nombres";

$stmt_estudiantes = $mysqli->prepare($sql2);
$stmt_estudiantes->bind_param($types_sql2, $nivel, $numero, $asignacion, $input->year);
$stmt_estudiantes->execute();
$restudiantes = $stmt_estudiantes->get_result();

$estudiantes = [];
while ($row = $restudiantes->fetch_assoc()) {
    $student_grades = [];
    foreach ($asignaturas as $a) {
        $asig = $a['asignatura'];
        $grades = [];
        if (isset($all_grades[$row['estudiante']][$asig])) {
            foreach (['UNO', 'DOS', 'TRES', 'CUATRO', 'DEF'] as $p) {
                if (isset($all_grades[$row['estudiante']][$asig][$p])) {
                    $grades[] = [
                        'periodo' => $p,
                        'valoracion' => $all_grades[$row['estudiante']][$asig][$p],
                    ];
                }
            }
        }
        $student_grades[$asig] = $grades;
    }

    $estudiantes[] = [
        'estudiante' => $row['estudiante'],
        'nombres' => $row['nombres'],
        'notas' => $student_grades,
    ];
}
$restudiantes->free();
$stmt_estudiantes->close();
$mysqli->close();

echo json_encode([
    'asignaturas' => $asignaturas,
    'estudiantes' => $estudiantes,
    'periodo' => $periodo,
]);
