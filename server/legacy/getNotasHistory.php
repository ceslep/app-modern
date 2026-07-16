<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=json_decode(file_get_contents('php://input'));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

	$sql="SELECT * from notas2
            WHERE 1=1 and
            estudiante='$datos->estudiante' and
            periodo='$datos->periodo' and
            asignatura='$datos->asignatura' and
            periodo='$datos->periodo' 
            and year=year(curdate())
            
    
    ";

	//echo json_encode($sql); exit(0);
    $result=$mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
    
	
    $mysqli->close(); 
