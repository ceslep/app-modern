<?php

function generaPuesto($estudiante,$asignacion,$cst){

    
   

$sql.="create puestos";
$sql.=" select notas.estudiante,nombres,avg(notas.valoracion) as promedio,concat_ws('-',estugrupos.nivel,estugrupos.numero) as grupo,@rank:=@rank+1 AS puesto from notas";
$sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql.=" and activo='S'";
$sql.=" group by notas.estudiante";
$sql.=" order by promedio desc";

$cst->query($sql);


}

require_once("datos_conexion.php");
$mysqli=new mysqli($host,$user,$pass,$database);
generaPuesto($mysqli);