<?php

header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$nivel = $datos->nivel + 0;



$datos = (object)json_decode(file_get_contents("php://input"));
/*$sql=sprintf("Select notas.estudiante,nombres as Nombres,valoracion as Val,%s,%s,%s from notas",notas(),aspectos(),porcentajes());
    $sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql.=" where docente='$datos->docente' and estugrupos.nivel='$datos->nivel'"; 
    $sql.=" and estugrupos.numero='$datos->numero' and asignatura='$datos->asignatura'";
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and notas.year='$datos->year'";
    $sql.=" order by nombres";*/
$sql = "";
$asignacion = $datos->Asignacion === "5" ? "_5" : "";
if ($datos->periodo == "CINCO") {
    $sql = "DROP TABLE IF EXISTS areasCINCO";
    $mysqli->query($sql);
    $sql = " CREATE TABLE areasCINCO\n";
    $sql .= sprintf(" Select estugrupos.estudiante,estugrupos.nombres,porcentajes_area_colegio$asignacion.area,porcentajes_area_colegio$asignacion.abreviatura as asignat,(sum(valoracion)/4*porcentajes_area_colegio$asignacion.porcentaje/100) as valoracion  from estugrupos\n");
    $sql .= " inner join notas on estugrupos.estudiante=notas.estudiante and estugrupos.year=notas.year\n";
    $sql .= " inner join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura\n";
    $sql .= " inner join porcentajes_area_colegio$asignacion on asignacion_asignaturas.asignatura=porcentajes_area_colegio$asignacion.asignatura and asignacion_asignaturas.year=porcentajes_area_colegio$asignacion.year\n";
    $sql .= "  inner join docentes on asignacion_asignaturas.docente=docentes.identificacion";
    $sql .= " where 1=1\n";
    if ($datos->year === date('Y'))
    $sql .= " and docentes.activo='S'";
    //$sql.=" where notas.grado='$datos->nivel-$datos->numero'\n"; 
    $sql .= " and docentes.asignacion='$datos->Asignacion'\n";
    $sql .= " and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql .= " and porcentajes_area_colegio$asignacion.nivel='$datos->nivel'";
    $sql .= " and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql .= " and asignacion_asignaturas.numero='$datos->numero'\n";
    $sql .= " and estugrupos.nivel='$datos->nivel'\n";
    $sql .= " and estugrupos.numero='$datos->numero'\n";
    if ($datos->year === date('Y'))
        $sql .= " and estugrupos.activo='S'\n";
    $sql .= " and (notas.year='$datos->year')\n";
    $sql .= " and porcentajes_area_colegio$asignacion.year='$datos->year'\n";
    $sql .= " and (estugrupos.year='$datos->year') \n";
    $sql .= " and (asignacion_asignaturas.year='$datos->year')\n";
    $sql .= " group by estugrupos.estudiante,porcentajes_area_colegio$asignacion.area,notas.asignatura\n";
    $sql .= " order by estugrupos.nombres,area";
    /* //echo json_encode(array("sql"=>$sql)); exit(0); 
    //  $mysqli->query($sql); */
} else {
    $sql = "DROP TABLE IF EXISTS areasCINCO";
    $mysqli->query($sql);
    $sql = " CREATE TABLE areasCINCO\n";
    $sql .= sprintf(" Select estugrupos.estudiante,estugrupos.nombres,porcentajes_area_colegio$asignacion.area,porcentajes_area_colegio$asignacion.abreviatura as asignat,(avg(valoracion)*porcentajes_area_colegio$asignacion.porcentaje/100) as valoracion  from estugrupos\n");
    $sql .= " inner join notas on estugrupos.estudiante=notas.estudiante and estugrupos.year=notas.year\n";
    $sql .= " inner join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura\n";
    $sql .= " inner join porcentajes_area_colegio$asignacion on asignacion_asignaturas.asignatura=porcentajes_area_colegio$asignacion.asignatura and asignacion_asignaturas.year=porcentajes_area_colegio$asignacion.year\n";
    $sql .= "  inner join docentes on asignacion_asignaturas.docente=docentes.identificacion";
    $sql .= " where 1=1\n";
    //$sql.=" where notas.grado='$datos->nivel-$datos->numero'\n"; 
    $sql .= " and docentes.asignacion='$datos->Asignacion'\n";
    if ($datos->year === date('Y'))
    $sql .= " and docentes.activo='S'";
    $sql .= " and estugrupos.asignacion='$datos->Asignacion'\n";
    $sql .= " and porcentajes_area_colegio$asignacion.nivel='$datos->nivel'";
    $sql .= " and asignacion_asignaturas.nivel='$datos->nivel'\n";
    $sql .= " and asignacion_asignaturas.numero='$datos->numero'\n";
    $sql .= " and estugrupos.nivel='$datos->nivel'\n";
    $sql .= " and estugrupos.numero='$datos->numero'\n";
    if ($datos->year === date('Y'))
        $sql .= " and estugrupos.activo='S'\n";
    $sql .= " and (notas.year='$datos->year')\n";
    $sql .= " and porcentajes_area_colegio$asignacion.year='$datos->year'\n";
    $sql .= " and (estugrupos.year='$datos->year') \n";
    $sql .= " and (asignacion_asignaturas.year='$datos->year')\n";
    $sql .= " group by estugrupos.estudiante,porcentajes_area_colegio$asignacion.area,notas.asignatura\n";
    $sql .= " order by estugrupos.nombres,area";

   /*   echo json_encode(array("sql" => $sql));
    exit(0); */

    //  echo json_encode(array("sql"=>$sql)); exit(0); 
}
$mysqli->query($sql);
/* 
echo json_encode(array("sql" => $sql));
exit(0);
 */
$sql = "select estudiante,nombres,area,asignat,sum(valoracion) as valoracion from areasCINCO";
$sql .= " group by estudiante,asignat";

/* echo json_encode(array("sql" => $sql));
exit(0); */

$result = $mysqli->query($sql);
/* $datos=[];
	while($dato=$result->fetch_assoc())     
        $datos[]=$dato; */
$datos = $result->fetch_all(MYSQLI_ASSOC);

function redondearValoracion($dato)
{
    $dato['valoracion'] = round($dato['valoracion'], 3);
    return $dato;
}

$datosRedondeados = array_map('redondearValoracion', $datos);

echo json_encode($datosRedondeados);
$result->free();
$mysqli->close();
