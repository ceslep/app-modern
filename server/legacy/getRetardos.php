<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	
    $sql=sprintf("Select estugrupos.estudiante,estugrupos.nombres,asignacion_asignaturas.asignatura as asignat,asignacion_asignaturas.materia as asignatura,count(inasistencia.horas) as cantidadRetardos from estugrupos\n");
    $sql.=" left join inasistencia on estugrupos.estudiante=inasistencia.estudiante and estugrupos.year=inasistencia.year\n";
    $sql.=" left join asignacion_asignaturas on inasistencia.materia=asignacion_asignaturas.asignatura\n";
    $sql.=" where horas='r'\n";
    $sql.=" and estugrupos.nivel='$datos->nivel' and estugrupos.numero='$datos->numero'\n"; 
    $sql.=" and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql.=" and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql.=" and asignacion_asignaturas.numero='$datos->numero'\n";
    if ($datos->periodo!=="TODOS")
    $sql.=" and (inasistencia.periodo='$datos->periodo' or inasistencia.periodo is null)\n";
    $sql.=" and (inasistencia.year=year(curdate()) or inasistencia.year is null)\n";
    $sql.=" and (estugrupos.year=year(curdate())) \n";
    $sql.=" and (asignacion_asignaturas.year=year(curdate()))\n";
    $sql.=" group by estugrupos.estudiante,asignacion_asignaturas.materia\n";
    
   // echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
