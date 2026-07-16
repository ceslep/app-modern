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
	
	
	$sql="Select if(sum(horas) is NULL,0,sum(horas)) as total from inasistencia";
	$sql.=" where estudiante='$estudiante' and periodo='$periodo' and materia='$asignatura'";
	$sql.=" and inasistencia.year=year(curdate())";
	
	$resultado=$mysqli->query($sql);
	$totalInasistencias=$resultado->fetch_assoc()['total'];
	$datos=[];
	if ($totalInasistencias!=0){
	$sql="Select inasistencia.fecha,inasistencia.horas,inasistencia.hora_clase,if(excusas.hora_salida='Permiso por todo el día',concat_ws(' ',excusas.motivo,excusas.motivo_permiso),if(inasistencia.hora_clase=excusas.hora_salida,concat_ws(' ',excusas.motivo,excusas.motivo_permiso),'No')) as excusa from inasistencia";
	$sql.=" left join excusas on inasistencia.estudiante=excusas.estudiante and inasistencia.fecha=excusas.fecha";
	$sql.=" where inasistencia.estudiante='$estudiante' and inasistencia.periodo='$periodo' and materia='$asignatura'";
	$sql.=" and inasistencia.year=year(curdate())";
	
	if($resultadoinas=$mysqli->query($sql))
	while($dato=$resultadoinas->fetch_assoc()) 
		
		$datos[]=$dato;
	
	else {
		$datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
		exit(0);
	}
	}
	
	$datos=array("total"=>$totalInasistencias,"inasistencias"=>$datos);
	echo json_encode($datos);
	$resultadoinas->free();
	$resultado->free();
	$mysqli->close();
?>