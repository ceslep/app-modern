<?php
    require("datos_conexion.php");
    $mysqli = new mysqli($host,$user,$pass,$database);
    $datos=(Object)(json_decode(file_get_contents("php://input") ?: '{}') ?: new stdClass());
    $asignacion = $datos->asignacion ?? $_GET['asignacion'] ?? null;
    if (empty($asignacion)) {
        echo json_encode([]);
        $mysqli->close();
        exit;
    }
    $asignacion = $mysqli->real_escape_string((string) $asignacion);
    $year = $datos->year ?? $_GET['year'] ?? null;
    $sql="select distinct nivel from estugrupos where asignacion='$asignacion'";
    if (empty($year) || $year==="")
    $sql.=" and year=year(curdate())";
    else
    $sql.=" and year='".$mysqli->real_escape_string((string) $year)."'";
    $sql.=" order by nivel";
   // echo json_encode($sql);exit(0);
    $result=$mysqli->query($sql);
    $resultados=$result->fetch_all(MYSQLI_ASSOC);
    echo json_encode($resultados);

    $mysqli->close();