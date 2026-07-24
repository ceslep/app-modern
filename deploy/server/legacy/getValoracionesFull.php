<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	/*$sql=sprintf("Select notas.estudiante,nombres as Nombres,valoracion as Val,%s,%s,%s from notas",notas(),aspectos(),porcentajes());
    $sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql.=" where docente='$datos->docente' and estugrupos.nivel='$datos->nivel'"; 
    $sql.=" and estugrupos.numero='$datos->numero' and asignatura='$datos->asignatura'";
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and notas.year=year(curdate())";
    $sql.=" order by nombres";*/
    $sql=sprintf("Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,12-sum(valoracion) as valoracion  from estugrupos\n");
    $sql.=" left join notas on estugrupos.estudiante=notas.estudiante and estugrupos.year=notas.year\n";
    $sql.=" left join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura\n";
    $sql.=" where notas.grado='$datos->nivel-$datos->numero'\n"; 
    $sql.=" and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql.=" and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql.=" and asignacion_asignaturas.numero='$datos->numero'\n";
    $sql.=" and estugrupos.activo='S'\n";
 //   $sql.=" and (notas.periodo='$datos->periodo' or notas.periodo is null)\n";
    $sql.=" and (notas.year=year(curdate()) or notas.year is null)\n";
    $sql.=" and (estugrupos.year=year(curdate())) \n";
    $sql.=" and (asignacion_asignaturas.year=year(curdate()))\n";
    $sql.=" group by notas.estudiante,notas.asignatura";
   // echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos=[];
	while($dato=$result->fetch_assoc())     
        $datos[]=$dato;
    			
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
