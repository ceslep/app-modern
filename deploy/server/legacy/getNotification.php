<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=json_decode(file_get_contents('php://input'));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

	$sql="Select * from notificaciones";
    $sql.=" where fecha=curdate() and hora between (ADDTIME('$datos->hora', '-500')) and (ADDTIME('$datos->hora', '500'))";
	//echo json_encode($sql); exit(0);
    $result=$mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
    
	
    $mysqli->close(); 
