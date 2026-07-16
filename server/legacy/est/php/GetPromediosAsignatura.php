<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $grado=$datos->nivel.'-'.$datos->numero;
    $sql="select valoracion from notas";
    $sql.=" where notas.asignatura='$datos->asignatura'";
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and grado='$grado'";
    $sql.=" and year=year(curdate())";
 
  //  esql($sql);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
