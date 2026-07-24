<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    
    $sql="select nombre from periodos";
    $sql.=" where curdate() between fechainicial and fechafinal";

    if (!isset($datos->periodo))
    $periodo=$mysqli->query($sql)->fetch_assoc()['nombre'];
        else
    $periodo=$datos->periodo;
	$sql='Select grado,desempenos.asignatura,docente,nombres,periodo,desempeno,descripcion,convert(left(grado,position("-" in grado)-1),UNSIGNED) as nivel,convert(right(grado,position("-" in reverse(grado))-1),UNSIGNED) as numero from  desempenos';
    $sql.=" left join docentes on desempenos.docente=docentes.identificacion";
    $sql.=" left join orden_asignaturas on desempenos.asignatura=orden_asignaturas.asignatura";
    $sql.="   and periodo='$periodo'";
    $sql.="   order by nivel,numero,orden";
	$result = $mysqli->query($sql);
    $datos=[];
	while($dato=$result->fetch_assoc()) $datos[]=$dato;
				
    echo json_encode($datos);
	$result->free();
    $mysqli->close();

?>