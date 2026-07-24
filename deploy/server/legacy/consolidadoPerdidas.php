<?php
require_once("headers.php");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$periodo = $datos->periodo ?? '';
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$asignacion = $datos->Asignacion ?? '';
$current_year = date('Y');

$dataAsignaturas = [];
$datosJson = [];

if ($periodo !== "CINCO") {
    $sql_main = "
        SELECT 
            n.asignatura, 
            COUNT(n.asignatura) as perdidas 
        FROM notas n
        INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante AND eg.year = n.year
        INNER JOIN orden_asignaturas oa ON n.asignatura = oa.asignatura
        WHERE eg.nivel = ? 
          AND eg.numero = ? 
          AND eg.asignacion = ? 
          AND n.periodo = ? 
          AND n.year = ?
          AND n.valoracion < 3
        GROUP BY n.asignatura
        ORDER BY oa.orden
    ";
    $stmt_main = $mysqli->prepare($sql_main);
    $stmt_main->bind_param("sssss", $nivel, $numero, $asignacion, $periodo, $current_year);
    $stmt_main->execute();
    $dataAsignaturas = $stmt_main->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_main->close();

    $sql_details = "
        SELECT 
            eg.estudiante, 
            eg.nombres, 
            n.valoracion, 
            n.asignatura
        FROM notas n
        INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante
        WHERE eg.nivel = ? 
          AND eg.numero = ? 
          AND eg.asignacion = ? 
          AND n.periodo = ? 
          AND n.year = ?
          AND n.valoracion < 3
        ORDER BY n.asignatura, eg.nombres
    ";
    $stmt_details = $mysqli->prepare($sql_details);
    $stmt_details->bind_param("sssss", $nivel, $numero, $asignacion, $periodo, $current_year);
    $stmt_details->execute();
    $all_failing_students = $stmt_details->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_details->close();

    $grouped_by_asignatura = [];
    foreach ($all_failing_students as $student) {
        $grouped_by_asignatura[$student['asignatura']][] = $student;
    }

    foreach ($dataAsignaturas as $asignatura_summary) {
        $asignatura_key = $asignatura_summary['asignatura'];
        $datosJson[] = [
            "asignatura" => $asignatura_key,
            "data" => $grouped_by_asignatura[$asignatura_key] ?? []
        ];
    }

} else {
    $sql_final = "
        SELECT * 
        FROM perdidasfinales
        WHERE grado = ? 
          AND sede = (SELECT sede FROM sedes WHERE ind = ?)
    ";
    $grado = "$nivel-$numero";
    $stmt_final = $mysqli->prepare($sql_final);
    $stmt_final->bind_param("ss", $grado, $asignacion);
    $stmt_final->execute();
    $dataAsignaturas = $stmt_final->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_final->close();
    $datosJson = ["tipo" => "areas"];
}

echo json_encode(["consolidado" => $dataAsignaturas, "infoConsolidado" => $datosJson]);
$mysqli->close();
?>