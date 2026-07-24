<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $nivel = $datos->nivel + 0;
    $year=$datos->year;

    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	/*$sql=sprintf("Select notas.estudiante,nombres as Nombres,valoracion as Val,%s,%s,%s from notas",notas(),aspectos(),porcentajes());
    $sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql.=" where docente='$datos->docente' and estugrupos.nivel='$datos->nivel'"; 
    $sql.=" and estugrupos.numero='$datos->numero' and asignatura='$datos->asignatura'";
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and notas.year=year(curdate())";
    $sql.=" order by nombres";*/
    $sql="";
    if(($datos->periodo!=="FINAL")&&($datos->periodo!=="MINIMAS"))
    $sql.=sprintf("Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,valoracion  from estugrupos\n");
    else if($datos->periodo=="FINAL")
    $sql.=sprintf("Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,sum(valoracion)/4 as valoracion  from estugrupos\n");
    else if ($datos->periodo=="MINIMAS")
    $sql.=sprintf("Select estugrupos.estudiante,nombres,notas.asignatura,asignacion_asignaturas.materia as asignat,12-sum(valoracion) as valoracion,estugrupos.nivel,estugrupos.numero  from estugrupos\n");
    $sql.=" left join notas on estugrupos.estudiante=notas.estudiante and estugrupos.year=notas.year\n";
    if ($nivel<6)
    $sql.=" left join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura and asignacion_asignaturas.docente=notas.docente\n";
    else
    $sql.=" left join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura\n";
    $sql.=" where notas.grado='$datos->nivel-$datos->numero'\n"; 
    $sql.=" and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql.=" and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql.=" and asignacion_asignaturas.numero='$datos->numero'\n";
    $sql.=" and estugrupos.nivel='$datos->nivel'";
    $sql.=" and estugrupos.numero='$datos->numero'";
    $sql.=" and estugrupos.activo='S'\n";
    if(($datos->periodo!=="FINAL")&&($datos->periodo!=="MINIMAS"))
    $sql.=" and (notas.periodo='$datos->periodo' or notas.periodo is null)\n";
    if ($datos->periodo=="MINIMAS")
    $sql.=" and notas.periodo!='CUATRO'\n";
    $sql.=" and (notas.year=$year) or notas.year is null)\n";
    $sql.=" and (estugrupos.year=$year) \n";
    $sql.=" and (asignacion_asignaturas.year=$year)\n";
    if(($datos->periodo=="FINAL")||($datos->periodo=="MINIMAS"))
    $sql.=" group by estugrupos.estudiante,notas.asignatura\n";
    $sql.=" order by estugrupos.nombres";
    
  echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $/* datos=[];
	while($dato=$result->fetch_assoc())     
        $datos[]=$dato; */
    $datos=$result->fetch_all(MYSQLI_ASSOC);			
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
