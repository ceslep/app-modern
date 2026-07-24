<?php
require_once("datos_conexion.php");

$mysqli=new mysqli($host,$user,$pass,$database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$datas = json_decode(file_get_contents("php://input"), true);

if (isset($datas['ind']) && !isset($datas['estudiante'])) {
    $ind = (int)$datas['ind'];
    $result = $mysqli->query("SELECT * FROM estugrupos2 WHERE ind=$ind LIMIT 1");
    if ($row = $result->fetch_assoc()) {
        $datas = $row;
        $result->free();
    } else {
        echo json_encode(["msg" => false, "error" => "Candidato no encontrado"]);
        $mysqli->close();
        exit;
    }
}

$estudiante = $datas['estudiante'] ?? '';
$year = $datas['year'] ?? '';

$fields = "";
$values = "";
foreach ($datas as $key => $value) {
    if ($key == 'ind') continue;
    if ($key == 'activo') $value = 'S';
    if ($key == 'anio') $value = $year;
    $fields .= "$key,";
    $values .= "'$value',";
}

$fields = rtrim($fields, ",");
$values = rtrim($values, ",");

$sql = "REPLACE INTO estugrupos ($fields) values ($values)";

if ($mysqli->query($sql)) {
    $sql = "UPDATE estugrupos2 SET activo='N' WHERE estudiante='$estudiante' AND year='$year'";
    $mysqli->query($sql);
    $sql = "REPLACE INTO codigos (codigo,estudiante) VALUES ('".$datas['codigo']."','$estudiante')";
    $mysqli->query($sql);
    echo json_encode(["msg" => true]);
} else {
    echo json_encode(["msg" => false]);
}
$mysqli->close();
