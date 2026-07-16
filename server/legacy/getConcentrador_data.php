<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

require_once "datos_conexion.php";

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}
$mysqli->set_charset('utf8');

$input = json_decode(file_get_contents("php://input"));

// Validar entrada
$nivel = $input->nivel ?? null;
$numero = $input->numero ?? null;
$asignacion = $input->Asignacion ?? null;
$year = $input->year ?? null;

if (!$nivel || !$numero || !$asignacion || !$year) {
    http_response_code(400);
    echo json_encode(['error' => 'Parámetros incompletos.']);
    exit();
}

$response = [
    'asignaturas' => [],
    'estudiantes' => [],
    'notas' => []
];

// 1. Obtener Asignaturas
$sql_asignaturas = "SELECT a.asignatura, a.abreviatura, a.docente, a.materia, IF(p.orden IS NULL, 200, p.orden) AS ordenar 
                    FROM asignacion_asignaturas a
                    LEFT JOIN parametros_informe p ON a.asignatura = p.codigo_materia AND a.year = p.year
                    INNER JOIN docentes d ON a.docente = d.identificacion
                    WHERE a.nivel = ? AND a.numero = ? AND a.asignacion = ? AND a.year = ? AND a.visible = 'S'
                    ORDER BY ordenar";

$stmt = $mysqli->prepare($sql_asignaturas);
$stmt->bind_param("ssis", $nivel, $numero, $asignacion, $year);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $response['asignaturas'][] = $row;
}
$stmt->close();

// 2. Obtener Estudiantes y todas sus Notas de una vez
$sql_estudiantes_notas = "SELECT 
                                e.estudiante, 
                                e.nombres, 
                                n.asignatura, 
                                n.periodo, 
                                n.valoracion 
                            FROM estugrupos e
                            LEFT JOIN notas n ON e.estudiante = n.estudiante AND e.year = n.year
                            WHERE e.nivel = ? AND e.numero = ? AND e.asignacion = ? AND e.year = ? AND e.activo = 'S'
                            ORDER BY e.nombres, n.asignatura, n.periodo";

$stmt = $mysqli->prepare($sql_estudiantes_notas);
$stmt->bind_param("ssis", $nivel, $numero, $asignacion, $year);
$stmt->execute();
$result = $stmt->get_result();

$estudiantes_map = [];

while ($row = $result->fetch_assoc()) {
    $estudiante_id = $row['estudiante'];
    // Añadir estudiante a la lista solo una vez
    if (!isset($estudiantes_map[$estudiante_id])) {
        $estudiantes_map[$estudiante_id] = [
            'estudiante' => $estudiante_id,
            'nombres' => $row['nombres']
        ];
    }

    // Añadir nota si existe
    if ($row['asignatura'] !== null) {
        $response['notas'][] = [
            'estudiante' => $row['estudiante'],
            'asignatura' => $row['asignatura'],
            'periodo' => $row['periodo'],
            'valoracion' => $row['valoracion']
        ];
    }
}
$stmt->close();

// Convertir el mapa de estudiantes a un array simple
$response['estudiantes'] = array_values($estudiantes_map);

// 3. Obtener promedios finales (DEF)
$sql_promedios = "SELECT estudiante, asignatura, AVG(valoracion) as promedio_final 
                  FROM notas 
                  WHERE year = ? AND nivel = ? AND numero = ? AND asignacion = ?
                  GROUP BY estudiante, asignatura";

$stmt = $mysqli->prepare($sql_promedios);
$stmt->bind_param('isis', $year, $nivel, $numero, $asignacion);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $response['notas'][] = [
        'estudiante' => $row['estudiante'],
        'asignatura' => $row['asignatura'],
        'periodo' => 'DEF', // Usamos 'DEF' para el promedio
        'valoracion' => $row['promedio_final']
    ];
}
$stmt->close();


$mysqli->close();

echo json_encode($response);

?>