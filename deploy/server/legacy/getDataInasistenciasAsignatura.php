<?php
function translateDayNames($month){
    $monthNames = array(
        'Mon' => 'Lunes',
        'Tue' => 'Martes',
        'Wed' => 'Miércoles',
        'Thu' => 'Jueves',
        'Fri' => 'Viernes',
        'Sat' => 'Sábado',
        'Sun' => 'Domingo'
    );
    return $monthNames[$month];
   
    
}
header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
if (isset($datos->asignacion)) 
$asignacion = $datos->asignacion;
else
$asignacion = $datos->Asignacion;
$nivel = $datos->nivel;
$numero = $datos->numero;
$asignatura = $datos->asignatura;
$docente = $datos->docente;
if (isset($datos->PERIODO))
$periodo = $datos->PERIODO;
else
$periodo = $datos->periodo;
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql="select date_format(inasistencia.fecha,'%a') as dia,count(estudiante) as cantidad from inasistencia\n";
$sql.="where date_format(inasistencia.fecha,'%a')!='SUN'\n";
$sql.="and year=year(curdate())\n";
$sql.=" and materia='$asignatura'\n";
$sql.=" and nivel='$nivel'\n";
$sql.=" and numero='$numero'\n";
$sql.=" and asignacion='$asignacion'\n";
$sql.="group by dia\n";
$sql.="order by FIELD(dia,'Mon','Tue','Wed','Thu','Fri')\n";
//echo json_encode(array("sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$datos=[];
while($dato = $result->fetch_assoc()){
    $dato['dia']=translateDayNames($dato['dia']);
    $datos[]=$dato;
}

echo json_encode($datos);
$result->free();
$mysqli->close();
