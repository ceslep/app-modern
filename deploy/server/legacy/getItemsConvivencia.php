<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);

    $tipo = $_GET['tipo'] ?? null;
    if (!$tipo) {
        $body = json_decode(file_get_contents("php://input"));
        $tipo = $body->tipo ?? null;
    }
    if (!$tipo) {
        echo json_encode([]);
        exit;
    }

    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    $sql = "SELECT * FROM itemsConvivencia WHERE tipo='" . $mysqli->real_escape_string($tipo) . "'";

    if ($result = $mysqli->query($sql)) {
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
        $result->free();
    } else {
        echo json_encode([]);
    }

    $mysqli->close();

