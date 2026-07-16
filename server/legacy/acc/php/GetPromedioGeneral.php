<?php

    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	
	$data = json_decode($dataString);	
		
    // Safely access properties using the null coalescing operator
    $periodo = $data->periodo ?? '';

	$sql="Select notas.asignatura,if(avg(valoracion) is null,0,avg(valoracion)) as valoracion,if(orden!=NULL,orden,notas.asignatura) as orden from notas";
    $sql.=" left join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
	$sql.=" where periodo='$periodo'";
    $sql.=" and year=year(curdate())";
    $sql.=" group by asignatura";
    $sql.=" order by orden";

   
	
	
	
	
	if($resultado=$mysqli->query($sql))
	$datos=$resultado->fetch_All(MYSQLI_ASSOC);
    
	
	echo json_encode($datos);
	$resultado->free();
	$mysqli->close();
?>