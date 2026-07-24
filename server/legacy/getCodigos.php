<?php
require_once("headers.php");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql = "
    SELECT DISTINCT c.codigo, c.estudiante, e.nombres
    FROM codigos c
    INNER JOIN estugrupos e ON c.estudiante = e.estudiante
    ORDER BY c.codigo
";
$result = $mysqli->query($sql);
$datos = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode($datos);
$result->free();
$mysqli->close();
