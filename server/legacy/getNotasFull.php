<?php
require_once "headers.php";
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql = "SELECT notas.* from notas
      INNER JOIN estugrupos on notas.estudiante=estugrupos.estudiante
        WHERE
        asignacion='$datos->asignacion' and
        asignatura='$datos->asignatura' and
        periodo='$datos->periodo' and
        notas.grado='$datos->grado' and
        notas.year= '$datos->year'
        ";
//echo json_encode(['sql'=>$sql]);exit(0);
if ($result = $mysqli->query($sql)) {
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
} else {
    http_response_code(500);
    echo json_encode(["error" => "Error en la consulta a la base de datos"]);
}
;
