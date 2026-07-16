<?php
    
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    $sql="delete from notas where valoracion is null and year=year(curdate())";
    $mysqli->query($sql);
	
    $sql=sprintf("select '' as estudiante,asignatura,docente,grado,periodo,''  as valoracion,to_seconds(CURRENT_TIMESTAMP)-to_seconds(fechahora) as hace,fechahora from ultimasNotas limit 500");
   
    
   // echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
