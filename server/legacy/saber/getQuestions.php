<?php
  require_once("headers.php");
  require_once("datosConexion.php");


 
  $sql=sprintf("select * from preguntas");
  $sql.=" where Nivel='$datos->Nivel' and periodo='$datos->periodo'";
  
  //esql($sql);
  $result=$mysqli->query($sql);
  echo json_encode($result->fetch_ALL(MYSQLI_ASSOC));
  $result->free();
  $mysqli->close();
?>