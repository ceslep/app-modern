<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=json_decode(file_get_contents('php://input'));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

    $sql="replace into notificacionesLeidas (notifyind,docente) values ('$datos->notifyind','$datos->docente')";
	
	//echo json_encode($sql); exit(0);
    if($result=$mysqli->query($sql))
    echo json_encode(array("mensaje"=>"ok"));
    else
    echo json_encode(array("mensaje"=>"no"));
    
	
    $mysqli->close();
