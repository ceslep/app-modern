<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="select asignatura,valoracion from notas";
    $sql.=" where estudiante='$datos->estudiante'";
    $sql.=" and periodo='$datos->periodo'";
    $sql.=" and year=year(curdate())";
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
?>