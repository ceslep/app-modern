<?php

header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Consolidate character set setting
$mysqli->set_charset('utf8');

// Read input once and decode JSON once
$input_data = file_get_contents("php://input");
$datos = (object)json_decode($input_data);

$nivel = $datos->nivel + 0;
$year = $datos->year ?? date('Y');

// Refactor DELETE queries to use prepared statements
// Assuming these DELETEs are intentional for cleanup.
// If not, they should be removed or moved to a separate script.
$stmt_delete_periodo = $mysqli->prepare("DELETE FROM notas WHERE periodo IS NULL AND year = ?");
$stmt_delete_periodo->bind_param("s", $year);
$stmt_delete_periodo->execute();
$stmt_delete_periodo->close();

$stmt_delete_year = $mysqli->prepare("DELETE FROM notas WHERE year IS NULL AND year = ?");
$stmt_delete_year->bind_param("s", $year);
$stmt_delete_year->execute();
$stmt_delete_year->close();

$sql = "";
$params = [];
$types = "";

if (($datos->periodo !== "CINCO") && ($datos->periodo !== "MINIMAS")) {
    $sql .= "Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,valoracion  from estugrupos\n";
} else if ($datos->periodo === "CINCO") {
    $sql .= "Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,sum(valoracion)/4 as valoracion  from estugrupos\n";
} else if ($datos->periodo === "MINIMAS") {
    $sql .= "Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,12-sum(valoracion) as valoracion,estugrupos.nivel,estugrupos.numero  from estugrupos\n";
}

$sql .= " left join notas on estugrupos.estudiante=notas.estudiante and estugrupos.year=notas.year\n";

if ($nivel < 6) {
    $sql .= " left join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura and asignacion_asignaturas.docente=notas.docente\n";
} else {
    $sql .= " left join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura and notas.year=asignacion_asignaturas.year\n";
}

$sql .= "  inner join orden_asignaturas on asignacion_asignaturas.asignatura=orden_asignaturas.asignatura\n";
$sql .= " where 1=1\n";

$sql .= " and estugrupos.asignacion=?\n";
$params[] = $datos->Asignacion;
$types .= "s";

$sql .= " and asignacion_asignaturas.nivel=?\n";
$params[] = $datos->nivel;
$types .= "s";

$sql .= " and asignacion_asignaturas.numero=?\n";
$params[] = $datos->numero;
$types .= "s";

$sql .= " and estugrupos.nivel=?\n";
$params[] = $datos->nivel;
$types .= "s";

$sql .= " and estugrupos.numero=?\n";
$params[] = $datos->numero;
$types .= "s";

if ($year === date('Y')) {
    if (($datos->activos ?? false)) {
        $sql .= " and activo='S'"; // This 'activo' column is ambiguous, assuming it's from 'notas' or 'estugrupos'
        $sql .= " and estugrupos.activo='S'\n";
    }
}

if (($datos->periodo !== "CINCO") && ($datos->periodo !== "MINIMAS")) {
    $sql .= " and (notas.periodo=? OR notas.periodo IS NULL)\n";
    $params[] = $datos->periodo;
    $types .= "s";
}

if ($datos->periodo === "MINIMAS") {
    $sql .= " and notas.periodo!='CUATRO'\n";
}

$sql .= " and (notas.year=?)\n";
$params[] = $year;
$types .= "s";

$sql .= " and (estugrupos.year=?)\n";
$params[] = $year;
$types .= "s";

$sql .= " and (asignacion_asignaturas.year=?)\n";
$params[] = $year;
$types .= "s";

if (($datos->periodo === "CINCO") || ($datos->periodo === "MINIMAS")) {
    $sql .= " group by estugrupos.estudiante,notas.asignatura\n";
}

$sql .= " order by estugrupos.nombres,orden_asignaturas.orden";

$stmt = $mysqli->prepare($sql);

if ($stmt === false) {
    die("Prepare failed: " . $mysqli->error);
}

// Dynamically bind parameters
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$datos_output = [];
while ($dato = $result->fetch_assoc()) {
    $datos_output[] = $dato;
}

echo json_encode($datos_output);

$result->free();
$stmt->close();
$mysqli->close();

?>