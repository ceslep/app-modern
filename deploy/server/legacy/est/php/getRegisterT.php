<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $periodo=getPeriodoActual($mysqli);
    $estudiante=$datos->estudiante??"";
    $sql="select *,'$periodo' as periodo from estugrupos";
    $sql.=" where estudiante='$estudiante' and year=year(curdate())"; 
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
