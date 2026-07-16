<?php
//connect to a mysql database server with mysqli interface with params located in datos_conexion.php   
require_once('datos_conexion.php');
$mysqli = new mysqli($host, $user, $pass, $database);
//check connection

//generate a sql query to get all the records from the table puestos
$sql = "SELECT * FROM puestos";

//get the data in json format
$result = $mysqli->query($sql);
$data = array();
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}
echo json_encode($data);
?>

