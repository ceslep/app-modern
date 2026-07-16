<?php
//	header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access properties using the null coalescing operator
	$estudiante = $data->estudiante ?? '';
	$periodo = $data->periodo ?? '';
	$asignatura = $data->asignatura ?? '';
	
	
	$sql="Select fecha,hora,tipoFalta,left(faltas,120) as faltas,descripcionSituacion,if(tipoFalta='POSITIVO',positivos,descargosEstudiante) as descargos,firma from convivencia";
	$sql.=" where estudiante='$estudiante'";
	if ($asignatura!="Todas")
	$sql.="  and asignatura='$asignatura'";
	$sql.=" order by fecha desc";
	
	
	$datos=[];
	if($resultadoinas=$mysqli->query($sql))
	while($dato=$resultadoinas->fetch_assoc()) $datos[]=$dato;
	
	else {
		$datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
		exit(0);
	}
	
	echo json_encode($datos);
	$resultadoinas->free(); // Corrected variable name
	$mysqli->close();
?>