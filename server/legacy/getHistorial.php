<?php



header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');


$sql = "Select estudiante,codigo,nombres,nivel,numero,year,asignacion,grado,sede,institucion_externa from estugrupos 
        inner join sedes on estugrupos.asignacion=sedes.ind
         where estudiante='$datos->estudiante'
         order by year desc";

$result = $mysqli->query($sql);
//echo json_encode($result->fetch_all(MYSQLI_ASSOC));exit(0);
$data = [];
while ($dato = $result->fetch_assoc()) {
    $estudiante=$dato['estudiante'];
    $nivel=$dato['nivel'];
    $numero=$dato['numero'];
    $asignacion=$dato['asignacion'];
    $year=$dato['year'];
    $grado=$dato['grado'];
    $sql="select nombres from docentes where identificacion=(select distinct docente from notas where (grado='$nivel-$numero' or grado='$grado') and year='$year' and asignatura LIKE '%COMP.SOC%' and estudiante='$estudiante' LIMIT 1) ";
    $resultado=$mysqli->query($sql);
   // echo json_encode(array("sql"=>$sql));exit(0);
   if ($resultado->num_rows>0)
    $dato['director']=$resultado->fetch_assoc()['nombres'];
else
$dato['director']="";
    $data[] = $dato;
}

echo json_encode($data);

$mysqli->close();
