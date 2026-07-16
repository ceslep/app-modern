<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $grado=$datos->nivel.'-'.$datos->numero;
    $sql="select notas.asignatura,avg(valoracion) as valoracion from notas";
    $sql.=" inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
    $sql.=" where 1=1";
    $sql.=" and grado='$grado'";
  
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and year=year(curdate())";
    $sql.=" group by notas.asignatura,notas.grado";
    $sql.=" order by orden_asignaturas.orden";
   // esql($sql);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
