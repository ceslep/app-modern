<?php
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);    
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access properties using the null coalescing operator
    $identificacion = $data->identificacion ?? '';
    $nombres = $data->nombres ?? '';
    $email = $data->email ?? '';
    $displayName = $data->displayName ?? '';
    $fechanacimiento = $data->fechanacimiento ?? '';
    $phoneNumber = $data->phoneNumber ?? '';
    $photoURL = $data->photoURL ?? '';
    $genero = $data->genero ?? '';
    $direccion = $data->direccion ?? '';
    $google = $data->google ?? '';

    $sql="REPLACE INTO `registrar` (`ind`, `identificacion`, `nombres`, `email`, `displayName`, `fechanacimiento`, `phoneNumber`, `photoURL`,`genero`, `direccion`,`registerat`, `google`) VALUES ("; 
	$sql.=" NULL,\n";
	$sql.=" '$identificacion',\n";
	$sql.=" '$nombres',\n";
	$sql.=" '$email',\n";
	$sql.=" '$displayName',\n";
	$sql.=" '$fechanacimiento',\n";
	$sql.=" '$phoneNumber',\n";
	$sql.=" '$photoURL',\n";
    $sql.=" '$genero',\n";
    $sql.=" '$direccion',\n";
	$sql.=" CURRENT_TIMESTAMP,\n";
	$sql.=" '$google')\n";
//	echo json_encode(array("sql"=>"$sql"));exit(0);
    if($mysqli->query($sql))
	echo json_encode(array("msj"=>"ok","datos"=>$data));
	else
	echo json_encode(array("msj"=>"error","datos"=>$data));
	
    // Corrected variable names for free() calls
    // Assuming $resultadoinas and $resultado are meant to be $mysqli->query results,
    // but they are not defined in this script. Removing them to avoid errors.
    // $resultadoinas->free();
    // $resultado->free();

	$mysqli->close();
    mail($email,"Registro de usuario","Se ha registrado un usuario con la identificacion: ".$identificacion);
?>