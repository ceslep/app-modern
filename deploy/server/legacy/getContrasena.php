<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $datos=json_decode(file_get_contents("php://input"));
    $mysqli=new mysqli($host,$user,$pass,$database);

    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

	$sql="Select pass from  docentes where identificacion='$datos->docente'";
    $sql.=" and pass='$datos->contrasena'";

	$result = $mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
				
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
