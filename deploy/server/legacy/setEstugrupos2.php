<?php

require("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$update = "";
foreach ($datos as $key => $value)
if ($key=='ind') continue;
else 
    $update .= $key . '=\'' . $value .  '\', ';
$update = rtrim($update, ', ');
$sql = "UPDATE estugrupos2 SET ".$update;
$sql.=" WHERE  ind='$datos->ind'";

try {
    $mysqli->query($sql);
    if ($mysqli->errno) {
        throw new Exception("Error en la consulta: " . $mysqli->error);
    }
} catch (Exception $e) {
    echo json_encode(array("exito"=>false,"mensaje"=>$e->getMessage()));exit(0);
}finally{
    $mysqli->close();
}

echo json_encode(array("exito"=>true,"mensaje"=>""));


