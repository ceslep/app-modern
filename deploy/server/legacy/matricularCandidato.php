<?php
require_once("datos_conexion.php");

$mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


$datas = json_decode(file_get_contents("php://input"), true);



$estudiante="";
$codigo="";
$year="";

$fields="";
$values="";
foreach ($datas as $key=>$value){
    $estudiante=$datas['estudiante'];
    $codigo=$datas['codigo'];
    $year=$datas['year'];
    if ($key=='ind') continue;
    if ($key=='activo') $value='S';
    if ($key=='anio') $value=$datas['year'];
   $fields.="$key,";
   $values.="'$value',";
}


//Eliminar ultimo caracter de comas
    $fields=rtrim($fields, ",");
    $values=rtrim($values, ",");


    $sql="REPLACE INTO estugrupos ($fields) values ($values)";
//echo $sql;exit(0);

  if($mysqli->query($sql)){
      $sql="update estugrupos2 set activo='N' where estudiante='$estudiante' and year='$year'";
     // echo $sql;exit(0);
      $mysqli->query($sql);
      $sql="REPLACE INTO codigos (codigo,estudiante) values ('$codigo','$estudiante')";
      $mysqli->query($sql);
      echo json_encode(["msg"=>true]);  
  }  
else
    echo json_encode(["msg"=>false]);
$mysqli->close();
