<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));

	$sql="SELECT * from aspectosIndividuales
	where 
    docente='$datos->docente' and
    asignatura='$datos->asignatura' and
    periodo='$datos->periodo' and
    grado='$datos->grado' and
    year='$datos->year'
    
    ";
   // echo json_encode($sql);exit(0);
    echo json_encode($mysqli->query($sql)->fetch_ALL(MYSQLI_ASSOC));
    
	
	$mysqli->close();
