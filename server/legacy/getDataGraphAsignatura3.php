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

function superior($total,$asignatura,$docente,$nivel,$numero,$periodo)
{
    $sql = "select 'Superior' as intervalo,@val:=if(count(notas.ind) is not null,count(notas.ind),0) as cantidad from notas\n";
    $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
    $sql .= " where asignatura='$asignatura'\n";
    $sql .= " and docente='$docente'\n";
    $sql .= " and nivel='$nivel'\n";
    $sql .= " and numero='$numero'\n";
    $sql .= " and periodo='$periodo'\n";
    $sql .= " and notas.year=year(curdate())\n";
    $sql .= " and estugrupos.year=year(curdate())\n";
    $sql .= "and notas.valoracion between 4.6 and 5 \n";
    $sql .= " group by notas.asignatura,notas.docente,nivel,numero\n";
    return $sql;
}

function alto($total,$asignatura,$docente,$nivel,$numero,$periodo)
{
    $sql = "select 'Alto' as intervalo,@val:=if(count(notas.ind) is not null,count(notas.ind),0) as cantidad from notas\n";
    $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
    $sql .= " where asignatura='$asignatura'\n";
    $sql .= " and docente='$docente'\n";
    $sql .= " and nivel='$nivel'\n";
    $sql .= " and numero='$numero'\n";
    $sql .= " and periodo='$periodo'\n";
    $sql .= " and notas.year=year(curdate())\n";
    $sql .= " and estugrupos.year=year(curdate())\n";
    $sql .= "and notas.valoracion between 4 and 4.59999 \n";
    $sql .= " group by notas.asignatura,notas.docente,nivel,numero\n";
    return $sql;
}

function basico($total,$asignatura,$docente,$nivel,$numero,$periodo)
{
    $sql = "select 'Básico' as intervalo,@val:=if(count(notas.ind) is not null,count(notas.ind),0) as cantidad from notas\n";
    $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
    $sql .= " where asignatura='$asignatura'\n";
    $sql .= " and docente='$docente'\n";
    $sql .= " and nivel='$nivel'\n";
    $sql .= " and numero='$numero'\n";
    $sql .= " and periodo='$periodo'\n";
    $sql .= " and notas.year=year(curdate())\n";
    $sql .= " and estugrupos.year=year(curdate())\n";
    $sql .= "and notas.valoracion between 3 and 3.99999 \n";
    $sql .= " group by notas.asignatura,notas.docente,nivel,numero\n";
    return $sql;
}

function bajo($total,$asignatura,$docente,$nivel,$numero,$periodo)
{
    $sql = "select 'Bajo' as intervalo,@val:=if(count(notas.ind) is not null,count(notas.ind),0) as cantidad from notas\n";
    $sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante\n";
    $sql .= " where asignatura='$asignatura'\n";
    $sql .= " and docente='$docente'\n";
    $sql .= " and nivel='$nivel'\n";
    $sql .= " and numero='$numero'\n";
    $sql .= " and periodo='$periodo'\n";
    $sql .= " and notas.year=year(curdate())\n";
    $sql .= " and estugrupos.year=year(curdate())\n";
    $sql .= "and notas.valoracion between 0 and 2.99999 \n";
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
$sql.=superior($total,$asignatura,$docente,$nivel,$numero,$periodo);
$sql.=" UNION ";
$sql.=alto($total,$asignatura,$docente,$nivel,$numero,$periodo);
$sql.=" UNION ";
$sql.=basico($total,$asignatura,$docente,$nivel,$numero,$periodo);
$sql.=" UNION ";
$sql.=bajo($total,$asignatura,$docente,$nivel,$numero,$periodo);
   
//echo json_encode(array("sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$datos = [];
while($dato=$result->fetch_assoc()){
    $dato['porcentaje']=round($dato['cantidad']*100/$total,2);
    $dato['intervalo']=$dato['intervalo'].' - '.round($dato['cantidad']*100/$total,2);
    $datos[] = $dato;

}

echo json_encode($datos);
$result->free();
$mysqli->close();
