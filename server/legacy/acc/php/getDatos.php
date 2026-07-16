<?php
//	header("Access-Control-Allow-Origin: *");
	//header("Content-Type: application/json");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	
	$data = json_decode($dataString);	
		
    // Safely access property using the null coalescing operator
    $estudiante = $data->estudiante ?? '';

	$sql="Select fecha,codigo,nombre1,nombre2,apellido1,apellido2,nombres2,sexo,hemoclasificacion,fecnac,(to_days(curdate())-to_days(fecnac))/365.212459 as edad,municipios.nombre as lugarnacimiento,tdei,identificacion,zona,barrios.nombre as barrio,vereda,direccion,telefono,nivel,aula from matricula";
	$sql.=" inner join municipios on matricula.lugarnacimiento=municipios.codigo";
	$sql.=" inner join barrios on matricula.barrio=barrios.codigo";
	$sql.=" where identificacion='$estudiante'";

	
	
	$datos=[]; 
	
	if($resultado=$mysqli->query($sql))
	while($dato=$resultado->fetch_assoc()) $datos[]=$dato;
	
	else {
		$datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
		exit(0);
	}
	
	echo json_encode($datos);
	$resultado->free();
	$mysqli->close();
?>