<?php
    require_once("headers.php");
    require_once("datosConexion.php");

    $nivel=$datos->nivel??"";
    $periodo=$datos->periodo??"";
    $numero=$datos->numero??"";
    
    $sql="select notas.asignatura,avg(valoracion) as valoracion from notas";
    $sql.=" inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
    $sql.=" where periodo='$periodo'";
    $sql.=" and grado='$nivel-$numero'";
    $sql.=" and year=year(curdate())";
    $sql.=" group by asignatura";
    $sql.=" order by orden_asignaturas.orden";
   // esql($sql);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
