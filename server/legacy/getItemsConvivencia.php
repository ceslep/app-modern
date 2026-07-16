<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos = json_decode(file_get_contents("php://input"));
	
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    
	$sql="Select * from itemsConvivencia where tipo='$datos->tipo'";
	
	//echo json_encode(["sql"=>$sql]);exit(0);
	if ($result = $mysqli->query($sql)) {

			$datos=$result;
			$datos=[];
			echo json_encode($result->fetch_all(MYSQLI_ASSOC));
				
			
			$result->free();
			
	}
	
	$mysqli->close();

