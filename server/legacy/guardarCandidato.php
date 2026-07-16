<?php
require_once("datos_conexion.php");

$mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


$datas = json_decode(file_get_contents("php://input"), true);

//print_r($datas);exit(0);

$fields="";
$values="";
foreach ($datas as $key=>$value){
    if ($key=='ind') continue;
    if ($key=='activo') $value='S';
    if ($key=='anio') $value=$datas['year'];
   $fields.="$key,";
   $values.="'$value',";
}


//Eliminar ultimo caracter de comas
    $fields=rtrim($fields, ",");
    $values=rtrim($values, ",");


    $sql="REPLACE INTO estugrupos2 ($fields) values ($values)";
//echo $sql;exit(0);

  if($mysqli->query($sql)){
    echo json_encode(["msg"=>true]);  
    $sql="update estugrupos2 set activo='S' where estudiante='$datas->estudiante'";
  }  
else
    echo json_encode(["msg"=>false]);
$mysqli->close();
