<?php
// Establece la zona horaria local (cambia 'America/New_York' a tu zona horaria deseada)
require_once("datos_conexion.php");
$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);

date_default_timezone_set('America/Bogota');

// Obtén el agente de usuario (navegador) del cliente
$user_agent = $_SERVER['HTTP_USER_AGENT'];

// Obtén la fecha y hora local actual
$fecha_hora_local_actual = date('Y-m-d H:i:s');

// Crear un arreglo con las características del cliente
$cliente_info = array(
    "IP" => $_SERVER['REMOTE_ADDR'],
    "User-Agent" => $user_agent,
    "Server_Name" => $_SERVER['SERVER_NAME'],
    "Request_Method" => $_SERVER['REQUEST_METHOD'],
    "Current_URL" => 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'],
    "Fecha_Hora_Local_Actual" => $fecha_hora_local_actual
);

// Intenta detectar el sistema operativo desde el User-Agent
if (preg_match('/\((.*?)\)/', $user_agent, $matches)) {
    $sistema_operativo = $matches[1];
    $cliente_info["Sistema_Operativo"] = $sistema_operativo;
}

// Convierte el arreglo en formato JSON
$json_cliente_info = json_encode($cliente_info, JSON_PRETTY_PRINT);

$sql="insert into seguridad (docente,asignatura,info) values ('$datos->docente','$datos->asignatura','$json_cliente_info')";

echo json_encode(array("msg"=>"ok"));
$mysqli->query($sql);

$mysqli->close();
