<?php
require_once("datos_conexion.php");
$identificacion='9695141';
if (isset($datos->identificacion))
$identificacion=$datos->identificacion;
  $sql="SELECT * from pacientess
        where identificacion='$identificacion'    
  ";
  $result=$mysqli->query($sql);
  if ($result->num_rows>0)
  echo json_encode(["msg"=>true,"data"=>$result->fetch_all(MYSQLI_ASSOC)[0]]);  
else
    echo json_encode(["msg"=>false]);
$result->free();
$mysqli->close();
