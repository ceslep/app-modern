<?php
require_once("datos_conexion.php");

$mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


$datas = json_decode(file_get_contents("php://input"), true);



$estudiante="";
$year="";

$fields="";
$values="";
$sql="";
$sql2="";
foreach($datas['indices'] as $data){
    foreach($data as $key=>$value){
        $ind=$value;
    }
    $sql.="REPLACE INTO estugrupos Select * from estugrupos2 where ind=$ind;\n";
    $sql.="UPDATE estugrupos2 set activo='N' where ind=$ind;\n";
    $sql2.="REPLACE INTO codigos (codigo,estudiante) values ('".$datas['codigo']."',(select estudiante from estugrupos2 where ind=$ind));\n";
    
}



if ($mysqli->multi_query($sql)) {
    echo json_encode(array("msg" => "Exito"));
} else
    echo json_encode(array("msg" => "Error", "error" => sprintf("Mensaje: %s", $mysqli->error), "sql" => $sql));

$mysqli->multi_query($sql2);
$mysqli->close();
