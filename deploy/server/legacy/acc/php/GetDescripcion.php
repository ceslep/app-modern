<?php

    
    
function valoract($v, $n, $cst)
{
    $resultado = "";
    if ($v != "") {
        $v = $v / $n;
        $sql = 'select valoracion from escalas_1290';
        $sql .= " where $v between inicio and fin";
        $sql.=" and year=year(curdate())";
        $valoracion = $cst->query($sql);
     //   echo json_encode(array("sql"=>$sql));exit(0);
        if ($valoracion->num_rows > 0)
            while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
        else $resultado = "";
        $valoracion->free();
    }
    return $resultado;

 
}

function descripcion($HED,$grado,$asignatura,$periodo,$docente,$desempeno,$nivel,$cst)
{
    $resultado = "";
    
        
        if ($HED==="S")
        $sql = 'select descripcionEspecial as descripcion from desempenos';
        else
        $sql = 'select descripcion from desempenos';
        if ($nivel<=5)
        $sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo' and desempeno='$desempeno'";
        else
        $sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo'  and desempeno='$desempeno'";
        $sql.=" and year=year(curdate())  limit 1";
        //echo json_encode(array("sql"=>$sql));exit(0);
        $descripcion = $cst->query($sql);
        if ($descripcion->num_rows > 0)
            while ($desc = $descripcion->fetch_assoc()) $resultado = $desc['descripcion'];
        else $resultado = "";
        $descripcion->free();
        if ($resultado=="") $resultado="DOCENTE NO REPORTA INFORMACION :(";
    
    return trim($resultado);

 
}

function getNivelHED ($mysqli,$estudiante,&$HED,&$nivel,&$grado){
    
    $sql="select nivel,HED,numero from estugrupos";
    $sql.=" where estudiante='$estudiante'";
    $sql.=" and year=year(curdate())";
    $result=$mysqli->query($sql);
    $dato=$result->fetch_assoc();
    $HED=$dato['HED'];
    $nivel=$dato['nivel'];
    $grado=$dato['nivel'].'-'.$dato['numero'];
    
    
}
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $data=json_decode(file_get_contents("php://input"));
    $estudiante = $data->estudiante ?? '';
    $asignatura = $data->asignatura ?? '';
    $docente = $data->docente ?? '';
    $periodo = $data->periodo ?? '';
    $valoracion = ($data->valoracion ?? 0) + 0;
    $HED="";
    $nivel="";
    $grado="";
    $desempeno=valoract($valoracion, 1, $mysqli);
    getNivelHED($mysqli,$estudiante,$HED,$nivel,$grado);
    $descripcion=descripcion($HED,$grado,$asignatura,$periodo,$docente,$desempeno,$nivel,$mysqli);
    $datos[]=array("desempeno"=>$desempeno,"descripcion"=>$descripcion);
    echo json_encode($datos);
    $mysqli->close();
    ?>