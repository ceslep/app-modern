<?php
    
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    
    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
    $nivel = $datos->nivel + 0;
    $docente="";
    if ($datos->nivel+0<6){
        $sql="select distinct docente from asignacion_asignaturas";
        $sql.=" inner join docentes on asignacion_asignaturas.docente=docentes.identificacion";
        $sql.=" where asignacion='$datos->Asignacion' and nivel='$datos->nivel' and numero='$datos->numero'"; 
       // echo json_encode($sql);exit(0);
        $docente=$mysqli->query($sql)->fetch_assoc()['docente'];
    }
	
    $sql=sprintf("Select estugrupos.estudiante,estugrupos.nombres,asignacion_asignaturas.asignatura as asignat,asignacion_asignaturas.materia as asignatura,sum(if(inasistencia.horas='t',6,inasistencia.horas)) as cantidadInasistencias from estugrupos\n");
    $sql.=" left join inasistencia on estugrupos.estudiante=inasistencia.estudiante and estugrupos.year=inasistencia.year\n";
    if ($nivel<6)
    $sql.=" left join asignacion_asignaturas on inasistencia.materia=asignacion_asignaturas.asignatura and asignacion_asignaturas.docente=inasistencia.docente";
    else
    $sql.=" left join asignacion_asignaturas on inasistencia.materia=asignacion_asignaturas.asignatura\n";
    $sql.=" where estugrupos.nivel='$datos->nivel' and estugrupos.numero='$datos->numero'\n"; 
    $sql.=" and inasistencia.horas<>'r'";
    $sql.=" and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql.=" and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql.=" and asignacion_asignaturas.numero='$datos->numero'\n";
  //  if ($datos->nivel+0<6)
  //    $sql.=" and asignacion_asignaturas.docente='$docente'\n";
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
