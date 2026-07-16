<?php

header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
if (isset($datos->asignacion)) 
$asignacion = $datos->asignacion;
else
$asignacion = $datos->Asignacion;
$nivel = $datos->nivel;
$numero = $datos->numero;
$asignatura = $datos->asignatura;
$docente = $datos->docente;
if (isset($datos->PERIODO))
$periodo = $datos->PERIODO;
else
$periodo = $datos->periodo;
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

function gsql($label,$between,$total,$asignatura,$docente,$nivel,$numero,$periodo)
{
    $sql = "select '$label' as intervalo,@val:=if(count(notas.ind) is not null,count(notas.ind),0) as cantidad from notas\n";
    $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
    $sql .= " where asignatura='$asignatura'\n";
    $sql .= " and docente='$docente'\n";
    $sql .= " and nivel='$nivel'\n";
    $sql .= " and numero='$numero'\n";
    $sql .= " and periodo='$periodo'\n";
    $sql .= " and notas.year=year(curdate())\n";
    $sql .= " and estugrupos.year=year(curdate())\n";
    $sql .= $between."\n";
    $sql .= " group by notas.asignatura,notas.docente,nivel,numero\n";
    return $sql;
}

$sql="select notas.estudiante from notas\n";
$sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
$sql.=" where asignatura='$asignatura'\n";
$sql.=" and docente='$docente'\n";
$sql.=" and nivel='$nivel'\n";
$sql.=" and numero='$numero'\n";
$sql.=" and periodo='$periodo'\n";
$sql.=" and notas.year=year(curdate())\n";
$sql.=" and estugrupos.year=year(curdate())\n";
$result=$mysqli->query($sql);
$total = $result->num_rows;
$sql="";
$inc=0.2;
for($i=0;$i<=5;$i+=$inc){
    
    $inicio=$i;
    if ($i>1) $inicio=$i+0.0001;
    $between = " and notas.valoracion between $inicio and ".($i+$inc);
    $sql.= gsql(sprintf("%s y %s",$i,$i+$inc),$between,$total,$asignatura,$docente,$nivel,$numero,$periodo);
    if ($i<=(5-$inc))
    $sql.=" union \n";
}    
   
//echo json_encode(array("sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$datos = [];
while($dato=$result->fetch_assoc()){
    $dato['porcentaje']=round($dato['cantidad']*100/$total,2);
    $datos[] = $dato;

}

echo json_encode($datos);
$result->free();
$mysqli->close();
