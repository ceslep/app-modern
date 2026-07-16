<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    if(!isset($datos->year)) $year=Date("Y"); else $year=$datos->year;
    $periodo=getPeriodoActual($mysqli);
    $sql="select *,'$periodo' as periodo from estugrupos";
    $sql.=" where  year='$year'";
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
