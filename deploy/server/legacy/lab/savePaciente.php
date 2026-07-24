<?php
require_once("datos_conexion.php");

  $sql="REPLACE INTO paciente (identificacion,nombres,apellidos,fecnac,genero,telefono,correo,entidad) VALUES 
  ('$datos->identificacion','$datos->nombres','$datos->apellidos','$datos->fecnac','$datos->genero','$datos->telefono','$datos->correo','$datos->entidad')
  ";
//  SQIO($mysqli,$sql);
  if($mysqli->query($sql))
    echo json_encode(["msg"=>true]);  
else
    echo json_encode(["msg"=>false]);
$mysqli->close();
