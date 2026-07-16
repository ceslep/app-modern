<?php
header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$datos = json_decode(file_get_contents("php://input"));
foreach ($datos as $clave => $valor) {
    // Filtra y limpia el valor si es una cadena
    if (is_string($valor)) {
        $datos->$clave = filter_var($valor, FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    }
    // Puedes agregar más lógica de sanitización para otros tipos de datos aquí
}

$estudiante = $datos->estudiantecnv;
$docente = $datos->docentecnv;
$asignatura = $datos->asignaturacnv;
$tipoFalta = $datos->tipofalta;
$faltas = $datos->faltas;
$hora = $datos->hora;
$fecha = $datos->fecha;
$descripcionSituacion = $datos->descripcionSituacion;
$descargosEstudiante = $datos->descargosEstudiante;
$positivos = $datos->positivos;
$firma = $datos->firmacnv;
$firmaAcudiente = $datos->firmaAcudientecnv;
$year = $datos->yearcnv;
$faltas = $datos->faltas;
$device='';
if (isset($datos->device))
$device= $datos->device;

date_default_timezone_set('America/Bogota');

// Obtener la fecha y hora del servidor
$fechahora = date("Y-m-d H:i:s");

$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->set_charset("utf8");
$sql = "insert into convivencia (estudiante,docente,asignatura,tipoFalta,faltas,hora,fecha,descripcionSituacion,descargosEstudiante,positivos,firma,firmaAcudiente,year,fechahora,device)";
$sql .= " values ";
$sql .= "('$estudiante','$docente','$asignatura','$tipoFalta','$faltas','$hora','$fecha','$descripcionSituacion','$descargosEstudiante','$positivos','$firma','$firmaAcudiente','$year','$fechahora','$device')";
// SQIO($mysqli,$sql);
$datos = [];
if ($mysqli->query($sql))

    $datos = array("estado" => "ok", "mensaje" => "Almacenado Correctamente");

else
    $datos = array("estado" => "error", "mensaje" => $mysqli->error, "sql" => $sql);

echo json_encode($datos);

$mysqli->close();
