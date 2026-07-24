<?php
    
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $datos=(Object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');

    $nfec=false;
	if(!isset($datos->fecha1)){
        
        $datos->fecha1='curdate()';
        $datos->fecha2='curdate()';
        $sqlt=" and fecha between $datos->fecha1 and $datos->fecha2";
        $nfec=true;
    }
    $sql="select nh.*,docentes.nombres from notas_historico as nh";
    $sql.=" inner join docentes on docentes.identificacion=nh.docente";
    $sql.=" where 1=1";
    if($nfec)
        $sql.=$sqlt;
        else
     $sql.=" and fecha between '$datos->fecha1' and '$datos->fecha2'";
    //$sql.=" and docente='$datos->docente'"; 
   
    
   // echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos=$result->fetch_all(MYSQLI_ASSOC);
	
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
