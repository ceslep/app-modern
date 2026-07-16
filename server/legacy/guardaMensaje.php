<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    
	
	$sql="UPDATE mensajeNotas set mensaje='$datos->mensaje'";
   // echo json_encode(array("sql"=>$sql));exit(0);
   
	
   if( $mysqli->query($sql)) echo json_encode(array("msg"=>"ok"));
   else
    SQIO($mysqli,$sql);
	$mysqli->close();

?>