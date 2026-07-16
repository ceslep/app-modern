<?php
require_once "headers.php";
require_once "datos_conexion.php";

function translateMonthNames($month)
{
    $monthNames = [
        'January' => 'Enero',
        'February' => 'Febrero',
        'March' => 'Marzo',
        'April' => 'Abril',
        'May' => 'Mayo',
        'June' => 'Junio',
        'July' => 'Julio',
        'August' => 'Agosto',
        'September' => 'Septiembre',
        'October' => 'Octubre',
        'November' => 'Noviembre',
        'December' => 'Diciembre',
    ];
    if ($month != "") {
        return $monthNames[$month];
    } else {
        return "";
    }

}

$mysqli = new mysqli($host, $user, $pass, $database);
$datos = json_decode(file_get_contents("php://input"));

// Ensure $datos is an object and its properties are set
if (!is_object($datos)) {
    // Log the error or handle it appropriately
    error_log("Invalid JSON data received in getNotasDetallado.php");
    echo json_encode([]);
    exit();
}

// Provide default values for expected properties
$asignatura = isset($datos->asignatura) ? $datos->asignatura : '';
$nivel = isset($datos->nivel) ? $datos->nivel : '';
$numero = isset($datos->numero) ? $datos->numero : '';
$asignacion = isset($datos->asignacion) ? $datos->asignacion : '';
$year = isset($datos->year) ? $datos->year : '';
$estudiante = isset($datos->estudiante) ? $datos->estudiante : '';
$periodo = isset($datos->periodo) ? $datos->periodo : '';

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

error_log("getNotasDetallado.php - Input: asignatura=$asignatura, nivel=$nivel, numero=$numero, asignacion=$asignacion, year=$year, estudiante=$estudiante, periodo=$periodo");

$sql_docente = "SELECT identificacion, nombres FROM docentes
                WHERE identificacion = (
                    SELECT docente FROM asignacion_asignaturas
                    INNER JOIN docentes ON asignacion_asignaturas.docente = docentes.identificacion
                    WHERE asignatura = '$asignatura' AND nivel = '$nivel' AND numero = '$numero'
                    AND docentes.asignacion = '$asignacion' AND asignacion_asignaturas.year = '$year'
                )";
error_log("getNotasDetallado.php - Docente Info Query: $sql_docente");
$docente_info = $mysqli->query($sql_docente)->fetch_assoc();
$nombres = $docente_info['nombres'] ?? '';
$idDocente = $docente_info['identificacion'] ?? '';
error_log("getNotasDetallado.php - Docente Info Result: nombres=$nombres, idDocente=$idDocente");

$select_columns = [];
for ($i = 1; $i <= 12; $i++) {
    $select_columns[] = "nota{$i} AS Nota{$i}";
    $select_columns[] = "aspecto{$i} AS Aspecto{$i}";
    $select_columns[] = "DATE_FORMAT(fechaa{$i},'%M') AS mesA{$i}";
    $select_columns[] = "DATE_FORMAT(fechaa{$i},'%d') AS diaA{$i}";
    $select_columns[] = "DATE_FORMAT(fecha{$i},'%M') AS mes{$i}";
    $select_columns[] = "DATE_FORMAT(fecha{$i},'%d') AS dia{$i}";
    $select_columns[] = "porcentaje{$i} AS Porcentaje{$i}";
}

$sql = "SELECT valoracion, periodo, fechahora, " . implode(', ', $select_columns) . "
        FROM notas
        WHERE estudiante = '$estudiante'
          AND asignatura = '$asignatura'
          AND year = '$year'";

if (($periodo != "MINIMAS") && ($periodo != "FINAL")) {
    $sql .= " AND periodo = '$periodo'";
}
$sql .= " ORDER BY fechahora DESC";

error_log("getNotasDetallado.php - Final Notes Query: $sql");
//echo json_encode(array("sql"=>$sql));exit(0);
$result = $mysqli->query($sql);
$datos = [];
while ($dato = $result->fetch_assoc()) {
    for ($i = 1; $i <= 12; $i++) {
        $nota_val = $dato["Nota{$i}"] ?? "0.00";
        if ($nota_val != "0.00") {
            $datos[] = array("Valoracion" => $dato["valoracion"],
                             "Nota" => $nota_val,
                             "Aspecto" => $dato["Aspecto{$i}"] ?? '',
                             "FechaAspecto" => translateMonthNames($dato["mesA{$i}"] ?? '') . ' ' . ($dato["diaA{$i}"] ?? ''),
                             "FechaNota" => translateMonthNames($dato["mes{$i}"] ?? '') . ' ' . ($dato["dia{$i}"] ?? ''),
                             "Porcentaje" => $dato["porcentaje{$i}"] ?? '',
                             "Docente" => $nombres,
                             "fechaHora" => $dato["fechahora"],
                             "periodo" => $dato["periodo"],
                             "elDocente" => $idDocente,
                             "nnota" => $i);
        }
    }
}



echo json_encode($datos);
$result->free();
$mysqli->close();
