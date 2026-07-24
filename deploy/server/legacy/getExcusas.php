<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	
    $sql=sprintf("Select estugrupos.estudiante,estugrupos.nombres,count(excusas.estudiante) as cantidadExcusas from estugrupos\n");
    $sql.=" left join excusas on estugrupos.estudiante=excusas.estudiante\n";
    
    $sql.=" where 1=1\n";
    $sql.=" and estugrupos.nivel='$datos->nivel' and estugrupos.numero='$datos->numero'\n"; 
    $sql.=" and estugrupos.asignacion='$datos->Asignacion'\n";
    
    $sql.=" and (excusas.year=year(curdate()))\n";
    $sql.=" and (estugrupos.year=year(curdate())) \n";
    $sql.=" group by excusas.estudiante\n";
    
   // echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
