<?php
require_once("datos_conexion.php");

$criterio="";
if(isset($datos->criterio)) 
$criterio=$datos->criterio;
  $sql="SELECT examenes.*,procedimientos.nombre as examen from examenes 
  inner join procedimientos on examenes.codexamen=procedimientos.codigo 
  ";
  if($criterio!=""){
  $sql.=" where 1=1";
  $sql.=" and (";
  $sql.="identificacion = '$criterio'";
    $sql.=")";  
  $sql.="order by fecha desc";  
  }
 // SQIO($mysqli,$sql);
  
  if ($result=$mysqli->query($sql))
  echo json_encode($result->fetch_all(MYSQLI_ASSOC));  
else
    echo json_encode(["msg"=>false,"sql"=>$sql]);
$result->free();
$mysqli->close();
