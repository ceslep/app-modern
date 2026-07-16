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

$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->set_charset("utf8");
$sql="INSERT INTO registroIngresos (%s) values (%s)";
$fields="";
$values="";
foreach($datos as $key=>$value){
   
        $fields.="$key,";
        $values.="'$value',";
   
}

//Elimina la última coma
$fields=substr($fields, 0, -1);
$values=substr($values, 0, -1);
$sql=sprintf($sql,$fields,$values);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

if($mysqli->query($sql)){
    echo json_encode(["msg"=>"exito"]);
}
else
echo json_encode(["msg"=>"fallo"]);

$mysqli->close();
