<?php
   function valoract($v, $n, $cst)
   {
       $resultado = "";
       if ($v != "") {
           $v = $v / $n;
           $sql = 'select valoracion from escalas_1290';
           $sql .= " where $v between inicio and fin";
           $sql.=" and year=year(curdate())";
           $valoracion = $cst->query($sql);
        //   echo json_encode(array("sql"=>$sql));exit(0);
           if ($valoracion->num_rows > 0)
               while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
           else $resultado = "";
           $valoracion->free();
       }
       return $resultado;
   
    
   }
   
	require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access properties using the null coalescing operator
	$estudiante = $data->estudiante ?? '';
	$periodo = $data->periodo ?? '';

	if ($periodo!="CINCO"){
	$sql="select 'REPORTE CONVIVENCIA' as asignatura,'' as valoracion,0 as orden,'' as docente from notas";
	$sql.=" UNION";
	$sql.=" Select notas.asignatura,valoracion,if(orden is null,200,orden) as orden,docente from notas";
	$sql.=" left join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
	$sql.=" where estudiante='$estudiante' and periodo='$periodo'";
	$sql.=" and notas.year=year(curdate())";
	$sql.=" order by orden";
	}else{
		$sql="select 'REPORTE CONVIVENCIA' as asignatura,'' as valoracion,0 as orden,'' as docente from notas";
		$sql.=" UNION";
		$sql.=" Select notas.asignatura,round(sum(valoracion*0.25),2) as valoracion,if(orden is null,200,orden) as orden,docente from notas";
		$sql.=" left join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
		$sql.=" where estudiante='$estudiante'";
		$sql.=" and notas.year=year(curdate())";
		$sql.=" group by notas.estudiante,notas.asignatura";
		$sql.=" order by orden";
	}	
	
	$datos=[];
	if($resultado=$mysqli->query($sql))
	//$datos=$resultado->fetch_all(MYSQLI_ASSOC);
    while($dato=$resultado->fetch_assoc()){
            $dato['desempeno']=valoract($dato['valoracion'],1,$mysqli);
            $datos[]=$dato;

    }
	else $datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
	echo json_encode($datos);
	$resultado->free();
	$mysqli->close();
?>