<?php
require_once("datos_conexion.php");

$tabla=$datos->tabla;

 
$fields="";
$values="";
foreach ($datos as $key=>$value){
    if ($key=='id' || $key=='fechahora' || $key=='tabla')  continue;
   $fields.="$key,";
   $values.="'$value',";
}
//Eliminar ultimo caracter de comas
    $fields=rtrim($fields, ",");
    $values=rtrim($values, ",");

    $sql="REPLACE INTO $tabla ($fields) values ($values)";
//echo $sql;exit(0);

  if($mysqli->query($sql))
    echo json_encode(["msg"=>true]);  
else
    echo json_encode(["msg"=>false]);
$mysqli->close();
