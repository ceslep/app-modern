<?php
    

    function translateMonthNames($month){
        $monthNames = array(
            'January' => 'Enero',
            'February' => 'Febrero',
            'March' => 'Marzo',
            'April' => 'Abril',
            'May' => 'Mayo',
            'June' => 'Junio',
            'July' => 'Julio',
            'August' => 'Agosto',
            'September' => 'Septiembre',
            'October' => 'Octubre',
            'November' => 'Noviembre',
            'December' => 'Diciembre'
        );
        return $monthNames[$month];
    
        
    }
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	
    $sql="select DATE_FORMAT(fecha,'%M') as mes,DATE_FORMAT(fecha,'%d') as dia,motivo,motivo_permiso,hora_salida,acudiente,telefono_acudiente,otros as detalle,DATE_FORMAT(DATE_ADD(fechahora,INTERVAL -5 HOUR),'%m/%d-%h:%i') as hora_registro from excusas";
    $sql.=" where estudiante='$datos->estudiante'";
    
    $sql.=" and year=year(curdate())";
    $sql.=" order by fecha desc";

   
    
    //echo json_encode(array("sql"=>$sql));exit(0);
    $datos=[];
	$result = $mysqli->query($sql);
    while($dato=$result->fetch_assoc()){
        $dato["fecha"]=translateMonthNames($dato["mes"]).' '.$dato["dia"];
        $datos[]=$dato;
    }
	
    echo json_encode($datos);
	$result->free();
    $mysqli->close();
