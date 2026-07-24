<?php
require_once("datos_conexion.php");
$identificacion='9695141';
$fecha='2012-08-23';
if (isset($datos->identificacion))
$identificacion=$datos->identificacion;
if (isset($datos->fecha))
$fecha=$datos->fecha;
  $sql="SELECT * from parcialOrina
        where identificacion='$identificacion' and fecha='$fecha'    
  ";
  $result=$mysqli->query($sql);
  if ($result->num_rows>0)
  echo json_encode(["msg"=>true,"data"=>$result->fetch_all(MYSQLI_ASSOC)[0]]);  
else
    echo json_encode(["msg"=>false]);
$result->free();
$mysqli->close();
