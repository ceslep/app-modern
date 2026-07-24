<?php
require_once("headers.php");
require_once("datosConexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$preguntas = json_decode(file_get_contents("php://input"));


$sqli = "REPLACE INTO preguntas \n (%s) VALUES \n %s";
$values = "";
$cantidad = 0;
$i = 0;
$sql = "";
foreach ($preguntas as $key => $value)
    $cantidad++;
$campos = "";
$valores = ""; 
foreach ($preguntas as $key => $value) {
    if ($k < $cantidad - 1) {
        $campos .= sprintf("%s,\n", $key);
        $valores .= sprintf("'%s',\n", $value);
    } else {
        $campos .= sprintf("%s\n", $key);
        $valores .= sprintf("'%s'\n", $value);
    }
    $values = sprintf("(%s)", $valores);
    $k++;
}
//ESQL($campos);
$cons = sprintf($sqli, $campos, $values);
$sql .= sprintf("%s\n", $cons);
//ESQL($sql);
if ($mysqli->query($sql))
    echo json_encode(array("msg" => "Exito"));
else
    echo json_encode(array("msg" => "Error", "error" => sprintf("Mensaje: %s", $mysqli->error), "sql" => $sql));
$mysqli->close();