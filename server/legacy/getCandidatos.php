<?php
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);

    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    $ind = isset($_GET['ind']) ? (int)$_GET['ind'] : 0;

    if ($ind > 0) {
        $stmt = $mysqli->prepare("SELECT e.*, s.sede FROM estugrupos2 e LEFT JOIN sedes s ON e.asignacion=s.ind WHERE e.ind=? ORDER BY e.year DESC LIMIT 1");
        $stmt->bind_param("i", $ind);
        $stmt->execute();
        $result = $stmt->get_result();
        $dato = $result->fetch_assoc();
        echo json_encode($dato ?: new stdClass());
        $stmt->close();
    } else {
        $sql="Select * from estugrupos2 where activo='S'
        order by asignacion,nivel,numero,nombres";
        $result = $mysqli->query($sql);
        $datos=$result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($datos);
        $result->free();
    }
    $mysqli->close();
