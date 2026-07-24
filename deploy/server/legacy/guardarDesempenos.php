<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));
	$grado=$datos->nivel."-".$datos->numero;
	$docente=$datos->docente;
	$asignatura=$datos->asignatura;
	$desempeno=$datos->desempeno;
	$descripcion=$datos->descripcion;
    $descripcionEspecial=$datos->descripcionEspecial;
	$periodo=$datos->PERIODO;
	if($periodo=="FINAL") $periodo="CINCO";
    $year=date("Y");
	
	$sql="replace into desempenos (grado,docente,asignatura,desempeno,descripcion,descripcionEspecial,periodo,year) values ('$grado','$docente','$asignatura','$desempeno','$descripcion','$descripcionEspecial','$periodo','$year')";
	
	if($mysqli->query($sql)) echo json_encode(array("msj"=>"ok","mensaje"=>"Registro guardado"));
    else echo json_encode(array("msj"=>"error","mensaje"=>"Error al guardar el registro"));
	
	
	$mysqli->query($sql);
	$mysqli->close();

?>