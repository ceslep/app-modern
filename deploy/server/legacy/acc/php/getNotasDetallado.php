<?php
	require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access properties using the null coalescing operator
	$estudiante = $data->estudiante ?? '';
	$periodo = $data->periodo ?? '';
	$asignatura = $data->asignatura ?? '';
	
	$campos="";
	for($i=1;$i<=12;$i++){
		if ($i<12){
		$campos.="nota$i,";
		$campos.="fecha$i,";
		$campos.="porcentaje$i,";
		$campos.="aspecto$i,";
		$campos.="anotacion$i,";
		}else{
			$campos.="nota$i,";
			$campos.="fecha$i,";
			$campos.="porcentaje$i,";
			$campos.="aspecto$i,";
			$campos.="anotacion$i";
		}
	}	
	$sql="Select $campos,docentes.nombres from notas";
	$sql.=" inner join docentes on notas.docente=docentes.identificacion";
	$sql.=" where estudiante='$estudiante' and periodo='$periodo' and asignatura='$asignatura'";
	$sql.=" and notas.year=year(curdate())";
	//echo $sql;
	//exit(0);
	$datos=array();
	if($resultado=$mysqli->query($sql))
	while($dato=$resultado->fetch_assoc()) $datos[]=$dato;
	else $datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
	echo json_encode($datos);
	$resultado->free();
	$mysqli->close();
?>