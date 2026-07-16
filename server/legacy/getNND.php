<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));

    // Ensure $datos is an object and its properties are set
    if (!is_object($datos)) {
        error_log("Invalid JSON data received in getNND.php");
        echo json_encode([]);
        exit();
    }

    $docente = isset($datos->docente) ? $datos->docente : '';
    $docente_escaped = $mysqli->real_escape_string($docente);

	$sql="select asignacion_asignaturas.asignatura,nivel,numero from asignacion_asignaturas
            where asignacion_asignaturas.docente='$docente_escaped' and asignacion_asignaturas.year=year(curdate())
             order by nivel,numero";

    
	if ($result=$mysqli->query($sql)){
        if ($result->num_rows>0)
	            echo json_encode(["ok"=>true,"data"=>$result->fetch_all(MYSQLI_ASSOC)]);
    
            else echo json_encode(array("ok"=>false));
        } else {
            error_log("SQL Error in getNND.php: " . $mysqli->error . " Query: " . $sql);
            echo json_encode(array("ok"=>false, "error"=>"Database query failed."));
        }
