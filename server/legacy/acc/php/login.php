<?php
	  require_once("headers.php");
    require_once("datos_conexion.php");
  

    $dataString = file_get_contents('php://input');
    $data = json_decode($dataString);
	$identificacion=$data->identificacion;
	$pass=$data->pass;
	
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
	$sql="Select * from usuarios";
	$sql.=" where identificacion='$identificacion' and pass='$pass'  ";
	
	//esql($sql);
	$result=$mysqli->query($sql);
	$fila=$result->fetch_assoc();    
	$datos=array();
	if ($result->num_rows==1)
	
		  
		  $datos=array("acceso"=>"ok","usuario"=>$fila);
		
	
		else
		  $datos=array("acceso"=>"denegado","identificacion"=>$identificacion);
	  echo json_encode($datos);
	$result->free_result();
	$mysqli->close();	
?>