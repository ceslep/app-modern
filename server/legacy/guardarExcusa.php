<?php
require "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (Object) json_decode(file_get_contents("php://input"));
$estudiante = $datos->estudianteControl;
$fecha = $datos->fecha;
if(isset($datos->otros))
$causa = $datos->otros;
else $causa="";
$motivo = $datos->motivo_excusa;
$periodo = $datos->periodoControl;
$horas = $datos->horasControl;
$motivo_permiso = $datos->motivo_permiso;
$hora_salida = $datos->hora_salida;
$acudiente = $datos->acudienteControl;
$telefono_acudiente = $datos->telacudienteControl;
$otros = $datos->otros_excusa;
$year = date("Y");
if ($motivo == "NO APLICA") {
    $motivo = $motivo_permiso;
}

$sql = "select estudiante from excusas where estudiante='$estudiante' and fecha='$fecha' and periodo='$periodo' and year=year(curdate())";
$resultado = $mysqli->query($sql);
if ($resultado->num_rows > 0) {
    if ($resultado->fetch_assoc()['estudiante'] === $estudiante) {
        $sql = "update excusas set causa='$causa',motivo='$motivo',motivo_permiso='$motivo_permiso',hora_salida='$hora_salida',acudiente='$acudiente',telefono_acudiente='$telefono_acudiente',otros='$otros' where estudiante='$estudiante' and fecha='$fecha' and periodo='$periodo'";
    }

} else {
    $sql = "insert into excusas (estudiante,fecha,causa,motivo,periodo,horas,motivo_permiso,hora_salida,acudiente,telefono_acudiente,otros,year) values ('$estudiante','$fecha','$causa','$motivo','$periodo','$horas','$motivo_permiso','$hora_salida','$acudiente','$telefono_acudiente','$otros','$year')";
}

//echo json_encode($sql);exit(0);

$mysqli->query($sql);
$sql = "update excusas set fechahora=date_sub(fechahora,interval 6 hour)";
$sql .= " where estudiante='$estudiante' and fecha='$fecha' and periodo='$periodo'";
//echo $sql;
$mysqli->query($sql);
$mysqli->close();
