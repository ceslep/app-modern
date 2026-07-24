<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    $sql = "SELECT MAX(codigo)+1 as codigo FROM estugrupos";
    $result = $mysqli->query($sql);
    $codigo = (int)$result->fetch_assoc()['codigo'];
    $result->free();
    $mysqli->close();

    echo json_encode(["codigo" => $codigo]);
