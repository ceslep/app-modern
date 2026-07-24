<?php
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

if (isset($datos->asignacion))
        $asignacion = $datos->asignacion;

function criterios($datos)
{
    if (isset($datos->asignacion))
        $asignacion = $datos->asignacion;
    if (isset($datos->nivel))
        $nivel = $datos->nivel;
    if (isset($datos->numero))
        $numero = $datos->numero;
    if (isset($datos->asignatura))
        $asignatura = $datos->asignatura;
    $sql = " 1=1 ";
    if (isset($asignatura))
        $sql .= " and asignatura='$asignatura'";
    if (isset($asignacion))
        if ($asignacion != "")
            $sql .= " and asignacion='$asignacion'";
    if (isset($nivel))
        if ($nivel != "")
            $sql .= " and nivel='$nivel'";
    if (isset($numero))
        if ($numero != "")
            $sql .= " and numero='$numero'";
    return $sql;
}

$crt = criterios($datos);
$sql = "select count(notas.ind) as cantidad,asignatura,periodo,avg(valoracion) as valoracion,'SUPERIOR' as desempeno,'1' as orden,to_days(fechahora) as ordenperiodo from notas";
if (isset($asignacion))
    if ($asignacion != "")
        $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql .= " where periodo in ('UNO','DOS','TRES','CUATRO') and asignatura not like 'x' and";
$sql .= $crt;
$sql .= " and valoracion between 4.6 and 5";
$sql .= " and notas.year=year(curdate())";
$sql.=" and estugrupos.year=year(curdate())";
$sql.=" and activo='S'";
$sql .= " group by asignatura,periodo";
$sql .= " union";
$sql .= " select count(notas.ind) as cantidad,asignatura,periodo,avg(valoracion) as valoracion,'ALTO','2',to_days(fechahora) from notas";
if (isset($asignacion))
    if ($asignacion != "")
        $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql .= " where periodo in ('UNO','DOS','TRES','CUATRO') and asignatura not like 'x' and";
$sql .= $crt;
$sql .= " and valoracion between 4 and 4.599";
$sql .= " and notas.year=year(curdate())";
$sql.=" and estugrupos.year=year(curdate())";
$sql.=" and activo='S'";
$sql .= " group by asignatura,periodo";
$sql .= " union";
$sql .= " select count(notas.ind) as cantidad,asignatura,periodo,avg(valoracion) as valoracion,'BASICO','3',to_days(fechahora) from notas";
if (isset($asignacion))
    if ($asignacion != "")
        $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql .= " where periodo in ('UNO','DOS','TRES','CUATRO') and asignatura not like 'x' and";
$sql .= $crt;
$sql .= " and valoracion between 3 and 3.999";
$sql .= " and notas.year=year(curdate())";
$sql.=" and estugrupos.year=year(curdate())";
$sql.=" and activo='S'";
$sql .= " group by asignatura,periodo";
$sql .= " union";
$sql .= " select count(notas.ind) as cantidad,asignatura,periodo,avg(valoracion) as valoracion,'BAJO','4',to_days(fechahora) from notas";
if (isset($asignacion))
    if ($asignacion != "")
        $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql .= " where periodo in ('UNO','DOS','TRES','CUATRO') and asignatura not like 'x' and";
$sql .= $crt;
$sql .= " and valoracion between 1 and 2.999";
$sql .= " and notas.year=year(curdate())";
$sql.=" and estugrupos.year=year(curdate())";
$sql.=" and activo='S'";
$sql .= " group by asignatura,periodo";
$sql .= " order by orden,periodo,orden";
//echo json_encode(array("sql"=>$sql));exit(0);
$result = $mysqli->query($sql);
$datos = [];
while ($dato = $result->fetch_assoc()) $datos[] = $dato;

echo json_encode($datos);
$result->free();
$mysqli->close();
