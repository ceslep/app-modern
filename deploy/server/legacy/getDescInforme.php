<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $datos=(Object)json_decode(file_get_contents("php://input"));
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    
    $sql="select desempenos.asignatura,desempeno,desempenos.descripcion,desempenos.descripcionEspecial from desempenos";
    $sql.="    inner join orden_asignaturas on desempenos.asignatura=orden_asignaturas.asignatura";
    $sql.="    inner join docentes on desempenos.docente=docentes.identificacion";
    $sql.="    where grado='$datos->grado' and docentes.asignacion='$datos->asignacion' and periodo='$datos->periodo'";
    $sql.="     and year='$datos->year'";
    $sql.="    group by asignatura,desempenos.desempeno";
    $sql.="    ORDER BY orden,asignatura,FIELD(desempeno,'BAJO','BASICO','ALTO','SUPERIOR')";
	$result = $mysqli->query($sql);
    $datos=[];
	while($dato=$result->fetch_assoc()) $datos[]=$dato;
				
    echo json_encode($datos);
	$result->free();
    $mysqli->close();

?>