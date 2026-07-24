<?php
require_once("datos_conexion.php");

$criterio="";
if(isset($datos->criterio)) 
$criterio=$datos->criterio;
  $sql="SELECT * from pacientess";
  if($criterio!=""){
  $sql.=" where 1=1";
  $sql.=" and (";
  $sql.="identificacion like '%$criterio%'  or ";
  $sql.="nombres like '%$criterio%'  or ";
  $sql.="apellidos like '%$criterio%'  or ";
  $sql.="fecnac like '%$criterio%'  or ";
  $sql.="telefono like '%$criterio%'  ";
    $sql.=")";  
  }
  $sql.=" limit 200";
 // SQIO($mysqli,$sql);
  
  if ($result=$mysqli->query($sql))
  echo json_encode($result->fetch_all(MYSQLI_ASSOC));  
else
    echo json_encode(["msg"=>false,"sql"=>$sql]);
$result->free();
$mysqli->close();
