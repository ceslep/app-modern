<?php

function valoract($v, $n, $cst,$year)
{
    $resultado = "";
    if ($v != "") {
        $v = $v / $n;
        $sql = 'select valoracion from escalas_1290';
        $sql .= " where $v between inicio and fin";
        $sql.=" and year='$year'";
        $valoracion = $cst->query($sql);
     //   echo json_encode(array("sql"=>$sql));exit(0);
        if ($valoracion->num_rows > 0)
            while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
        else $resultado = "";
        $valoracion->free();
    }
    return $resultado;

 
}
require_once('datos_conexion.php');
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$sql='Select nombre from periodos';
$sql.=" where curdate()>=fechainicial and curdate()<=fechafinal";
if (!isset($datos->periodo)||($datos->periodo===""))
$periodo=$mysqli->query($sql)->fetch_assoc()['nombre'];
else $periodo=$datos->periodo;
$year = date('Y');

if ($periodo != "CINCO")
    $sql = 'select notas.asignatura,replace(round(valoracion,3),",",".") as valoracion,"" as desempeno from notas';
else
    $sql = 'select notas.asignatura,replace(round(avg(valoracion),3),",",".") as valoracion,"" as desempeno from notas';
    $sql.=" inner join asignacion_asignaturas on notas.asignatura=asignacion_asignaturas.asignatura";
    $sql.=" inner join orden_asignaturas on asignacion_asignaturas.orden=orden_asignaturas.orden";
    $sql .= " where notas.estudiante='$datos->estudiante' ";
 
    $sql .=" and asignacion_asignaturas.visible='S'";
    $sql .=" and notas.periodo<>'CINCO'";
    $sql .=" and notas.docente is not null";
    $sql.=" and notas.valoracion<>0";
    $sql.=" and notas.year='$year'";
    $sql.=" and asignacion_asignaturas.year='$year'";
    if ($periodo != "CINCO")    
    $sql .= " and periodo='$periodo'";
    else
    $sql .= " and periodo is not NULL";
    
    $sql .= " group by notas.asignatura";
    $sql.=" order by orden_asignaturas.orden";
   // echo json_encode(array("sql"=>$sql));exit(0);
    //get the results in json format
    $result = $mysqli->query($sql);
    $data = array();
    while ($row = $result->fetch_assoc()) {
        $row['desempeno']=valoract($row['valoracion'], 1, $mysqli,$year);
        $data[] = $row;
    }
    echo json_encode($data);
    $result->free();
    $mysqli->close();
?>
    
    