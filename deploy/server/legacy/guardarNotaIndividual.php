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

$fechahora = date("Y-m-d H:i:s");

$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->set_charset("utf8");
$sql2="INSERT INTO notas2 (%s) values (%s)";
$sql="REPLACE INTO notas (%s) values (%s)";
$fields="";
$values="";
foreach($datos as $key=>$value){
    if($key!="ind" && $key!="fechahora"){
        $fields.="$key,";
        $values.="'$value',";
    }
}
//Elimina la última coma
$fields=substr($fields, 0, -1);
$values=substr($values, 0, -1);
$sql2=sprintf($sql2,$fields,$values);
$sql=sprintf($sql,$fields,$values);

if($mysqli->query($sql)){
    $mysqli->query($sql2);
    echo json_encode(["msg"=>"exito"]);
}
else
echo json_encode(["msg"=>"fallo"]);

$mysqli->close();
