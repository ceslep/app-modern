<?php
header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";

$mysqli = new mysqli($host, $user, $pass, $database);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));

$estudiante = $datos->estudiante ?? '';
$asignacion = $datos->asignacion ?? '';
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$grado_from_input = $datos->grado ?? '';

if (empty($estudiante) || empty($asignacion) || empty($nivel) || empty($numero) || empty($grado_from_input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters.']);
    exit();
}

$nuevo_grado_concat = "$nivel-$numero";

$mysqli->begin_transaction();

try {
    $stmt1 = $mysqli->prepare("UPDATE estugrupos SET grado = ?, numero = ? WHERE estudiante = ? AND asignacion = ? AND year = YEAR(CURDATE())");
    $stmt1->bind_param("ssss", $grado_from_input, $numero, $estudiante, $asignacion);
    $stmt1->execute();
    $stmt1->close();

    $mysqli->query("DROP TABLE IF EXISTS notasTemporales");
    $stmt2 = $mysqli->prepare("CREATE TABLE notasTemporales SELECT * FROM notas WHERE estudiante = ? AND year = YEAR(CURDATE())");
    $stmt2->bind_param("s", $estudiante);
    $stmt2->execute();
    $stmt2->close();

    $stmt3 = $mysqli->prepare("UPDATE notasTemporales SET grado = ? WHERE estudiante = ? AND year = YEAR(CURDATE())");
    $stmt3->bind_param("ss", $nuevo_grado_concat, $estudiante);
    $stmt3->execute();
    $stmt3->close();

    $mysqli->query("
        UPDATE notasTemporales nt
        JOIN asignacion_asignaturas aa ON nt.asignatura = aa.asignatura 
            AND nt.grado = CONCAT_WS('-', aa.nivel, aa.numero)
            AND nt.year = aa.year
        SET nt.ind = NULL, nt.docente = aa.docente
        WHERE nt.year = YEAR(CURDATE()) AND aa.year = YEAR(CURDATE())
    ");

    $stmt5 = $mysqli->prepare("DELETE FROM notas WHERE estudiante = ? AND year = YEAR(CURDATE())");
    $stmt5->bind_param("s", $estudiante);
    $stmt5->execute();
    $stmt5->close();

    $stmt6 = $mysqli->prepare("INSERT INTO notas SELECT * FROM notasTemporales WHERE estudiante = ? AND year = YEAR(CURDATE())");
    $stmt6->bind_param("s", $estudiante);
    $stmt6->execute();
    $stmt6->close();
    
    $mysqli->query("DROP TABLE IF EXISTS notasTemporales");

    $stmt8 = $mysqli->prepare("UPDATE inasistencia SET numero = ? WHERE estudiante = ? AND year = YEAR(CURDATE())");
    $stmt8->bind_param("ss", $numero, $estudiante);
    $stmt8->execute();
    $stmt8->close();

    $mysqli->commit();
    echo json_encode(["msg" => "exito"]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(["error" => "An error occurred during the process.", "details" => $e->getMessage()]);
}

$mysqli->close();
?>