<?php
require_once("datos_conexion_uca.php");

$criterio="";
if(isset($datos->criterio)) 
$criterio=$datos->criterio;
  $sql="SELECT * from dataUsuarios";
  if($criterio!=""){
  $sql.=" where 1=1";
  $sql.=" and (";
  $sql.="ownerId like '%$criterio%'  or ";
  $sql.="ownerName like '%$criterio%'  or ";
  $sql.="ownerTelephone like '%$criterio%'  or ";
  $sql.="farmName like '%$criterio%'  or ";
  $sql.="ownerTelephone like '%$criterio%'  ";
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
