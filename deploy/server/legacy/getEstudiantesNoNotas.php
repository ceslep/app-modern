<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	$sql="Select estudiante,nombres,nivel,numero,asignacion,'$datos->sede' as establecimiento,'$datos->periodo' as periodo from  estugrupos";
    $sql.=" where asignacion='$datos->asignacion' and nivel='$datos->nivel' and numero='$datos->numero'";
    $sql.=" and activo='S'";
    $sql.=" and year='$datos->year'";
    $sql.=" order by nombres";
	$result = $mysqli->query($sql);
    $datos=[];
	while($dato=$result->fetch_assoc())     
        $datos[]=$dato;
    			
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
