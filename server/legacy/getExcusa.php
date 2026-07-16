<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));
    $estudiante=$datos->estudiante;
    $fecha=$datos->fecha;

	$sql="Select estudiante,motivo from excusas";
	$sql.=sprintf(" where estudiante='%s' and fecha='%s' and motivo<>'LLEGADA TARDE' and year=year(curdate())",$estudiante,$fecha);
	
	//echo $sql;
    $result = $mysqli->query($sql);
	echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    $result->free();	
	$mysqli->close();

?>