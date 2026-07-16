<?php
    
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $grado=$datos->nivel."-".$datos->numero;
    $sql="SELECT ind,desempeno,descripcion,descripcionEspecial,periodo,updatedat,year from desempenos";
    $sql.=" WHERE asignatura='$datos->asignatura'";
    $sql.=" AND grado='$grado'";
    $sql.=" AND docente='$datos->docente'";
    $sql.=" order by year desc,FIELD(desempeno,'SUPERIOR','ALTO','BASICO','BAJO'),FIELD(periodo,'UNO','DOS','TRES','CUATRO','CINCO'),updatedat desc";
    //echo json_encode($sql);exit(0);
    $result=$mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
    echo json_encode($datos);
    $result->free();
    $mysqli->close();
?>

