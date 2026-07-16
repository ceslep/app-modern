<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));
    $estudiante=$datos->identificacion;

	$sql="Select identificacion,solocitaCodigo from docentes";
	$sql.=" where identificacion='$datos->identificacion' and activo='S'";
	
    
	if ($result=$mysqli->query($sql)){
        if ($result->num_rows>0)
	            echo json_encode(array("permitido"=>true,"solicitaCodigo"=>$result->fetch_assoc()["solocitaCodigo"]));
    
            else echo json_encode(array("permitido"=>false));
}else echo json_encode(array("permitido"=>false));
	$mysqli->close();

