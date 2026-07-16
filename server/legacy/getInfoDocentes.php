<?php
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli=new mysqli($host,$user,$pass,$database);
$mysqli2=new mysqli($host,$user,$pass,$database);
$datos=(Object)json_decode(file_get_contents("php://input"));

// Safely access properties using the null coalescing operator
$periodo_input = $datos->periodo ?? null; // Use a different variable name to avoid conflict
$x_input = $datos->x ?? null; // Use a different variable name

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$sql="select identificacion,nombres,sedes.sede,asignacion from docentes\n";
$sql.=" inner join sedes on docentes.asignacion=sedes.ind\n";
$sql.=" where activo='S' and nombres not like '%COORDI%'\n";
$sql.=" order by asignacion,nombres";
//echo json_encode(array("sql"=>$sql));exit(0);
$docentes = $mysqli->query($sql);

if($periodo_input === "-"){ // Use the new variable
    echo json_encode($docentes->fetch_all(MYSQLI_ASSOC));
    $docentes->free_result();
    $mysqli->close();
    exit(0);
}
$info=[];
$sql="select nombre from periodos";
$sql.=" where curdate() between fechainicial and fechafinal";

if ($periodo_input === "-") // Use the new variable
$periodo=$mysqli->query($sql)->fetch_assoc()['nombre'];
else
$periodo=$periodo_input; // Use the new variable

$x=$x_input; // Use the new variable

//$periodo="TRES";
  //echo json_encode(array("periodo"=>$periodo));exit(0);
function notas(){
    $result="";
    for($i=1;$i<=12;$i++)
    if ($i<12) $result.=sprintf("nota%d,",$i);
    else $result.=sprintf("nota%d",$i);
    return $result;

}

function aspectos(){
  /*  $result="json_object(";
    for($i=1;$i<=12;$i++)
    if ($i<12) $result.=sprintf("'aspecto%d',aspecto%d,",$i,$i);
    else $result.=sprintf("'aspecto%d',aspecto%d",$i,$i);
    $result-=")";
    return $result;*/
    $result="";
    for($i=1;$i<=12;$i++)
    if ($i<12) $result.=sprintf("aspecto%d,",$i);
    else $result.=sprintf("aspecto%d",$i);
    return $result;
}
while($docente=$docentes->fetch_assoc()){
    $identificacionDocente=$docente['identificacion'];
    $nombreDocente=$docente['nombres'];
    $docenteSede=$docente['sede'];
    $docenteAsignacion=$docente['asignacion'];
    $sql=sprintf("Select docente,asignatura,concat_ws('-',nivel,numero) as grado,nivel,numero,%s,%s from  notas",notas(),aspectos());
    $sql.=" left join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql.=" where docente='$identificacionDocente'"; 
    $sql.=" and estugrupos.year=year(curdate())";
    $sql.=" and (notas.year=year(curdate()) or notas.year is null) and (notas.periodo='$periodo' or notas.periodo is null)";
    
  //  echo json_encode(array("sql"=>$sql,"x"=>$x));exit(0);
 
    $datos=[];
    if ($x!=='x'){
        $result = $mysqli2->query($sql);
     //   echo json_encode(array("sql"=>$sql,"x"=>$x));exit(0);
        $datos=$result->fetch_all(MYSQLI_ASSOC);
    }
    $info[]=array('docente'=>$identificacionDocente,'nombres'=>$nombreDocente,'cantidad'=>count($datos),'sede'=>$docenteSede,'asignacion'=>(int)$docenteAsignacion,'periodo'=>$periodo,'datos'=>$datos);
}

            
echo json_encode($info);
if($docentes)
$docentes->free();
$mysqli2->close();
$mysqli->close();
?>